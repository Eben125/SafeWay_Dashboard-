import asyncio
import math
import time
import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from ..config import settings
from .thermal_renderer import thermal_renderer
from .firebase_service import firebase_service
from ..models.schemas import (
    ThermalReading, DetectionBox,
    RadarReading, RadarTarget,
    LidarReading, LidarPoint,
    UwbReading, UwbTag,
    GnssImuReading, ImuData,
    SafetyAlert
)

class SensorSimulator:
    """
    Simulates real-time telemetry from 5 distinct vehicle-safety sensors:
    1. Thermal Infrared (LWIR) Camera (30-50m)
    2. 77 GHz mmWave Radar (100-200m)
    3. 1550 nm 3D LiDAR (50-100m)
    4. UWB / RF Transceiver (50-100m)
    5. RTK-GNSS + IMU (Global)
    Dynamically scales sampling frequency and data generation based on Input Volume (1-100%).
    """
    def __init__(self):
        # Input Volume per sensor (1-100%)
        self.volumes: Dict[str, int] = dict(settings.DEFAULT_VOLUMES)
        self.is_running: bool = False
        self.frame_counter: int = 0
        self.sim_time: float = 0.0
        
        # Vehicle physics state
        self.vehicle_speed_kmh: float = 48.0
        self.current_lat: float = 12.971600  # Urban test circuit
        self.current_lon: float = 77.594600
        self.current_heading: float = 85.0
        
        # Latest cached readings for fast REST/WS push
        self.latest_readings: Dict[str, Any] = {}
        self.subscribers: List[asyncio.Queue] = []
        self._background_tasks: List[asyncio.Task] = []
        
        # Ingestion Recording State (Controlled via Start / End buttons)
        self.is_recording: bool = False

    async def start_recording(self):
        """Starts persisting sensor telemetry to Firebase Firestore."""
        self.is_recording = True
        await self._broadcast({"type": "recording_state", "is_recording": True})

    async def stop_recording(self):
        """Ends / stops persisting sensor telemetry to Firebase."""
        self.is_recording = False
        await self._broadcast({"type": "recording_state", "is_recording": False})

    async def toggle_recording(self) -> bool:
        """Toggles ingestion recording state."""
        self.is_recording = not self.is_recording
        await self._broadcast({"type": "recording_state", "is_recording": self.is_recording})
        return self.is_recording

    def get_sampling_rate_hz(self, sensor_id: str) -> float:
        """Calculates sampling rate (Hz) from the active Input Volume (1-100%)."""
        vol = self.volumes.get(sensor_id, 25)
        # 1% -> 1.0 Hz, 50% -> 15.0 Hz, 100% -> 40.0 Hz
        return round(1.0 + (vol - 1) * 0.394, 1)

    async def set_input_volume(self, sensor_id: str, volume: int):
        """Updates Input Volume dynamically and persists to Firebase."""
        if sensor_id in self.volumes:
            volume = max(1, min(100, volume))
            self.volumes[sensor_id] = volume
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            await firebase_service.update_sensor_volume(sensor_id, volume, rate_hz)

    async def start(self):
        """Starts individual async loops for all sensors."""
        self.is_running = True
        self._background_tasks = [
            asyncio.create_task(self._run_thermal_camera_loop()),
            asyncio.create_task(self._run_radar_loop()),
            asyncio.create_task(self._run_lidar_loop()),
            asyncio.create_task(self._run_uwb_loop()),
            asyncio.create_task(self._run_gnss_imu_loop()),
            asyncio.create_task(self._run_alert_fuser_loop()),
        ]

    async def stop(self):
        self.is_running = False
        for task in self._background_tasks:
            task.cancel()

    # --- 1. Thermal Infrared (LWIR) Camera Loop ---
    async def _run_thermal_camera_loop(self):
        sensor_id = "thermal_camera"
        while self.is_running:
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            # Render authentic thermal frame
            self.frame_counter += 1
            img_b64, det_list, amb_temp, max_temp = thermal_renderer.render_frame(self.frame_counter)
            
            reading_id = f"LWIR_{int(time.time()*1000)}"
            reading = ThermalReading(
                reading_id=reading_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                sensor_id=sensor_id,
                image_base64=img_b64,
                image_url=f"https://storage.googleapis.com/safeway-d78b8.firebasestorage.app/thermal_frames/{reading_id}.jpg",
                frame_id=self.frame_counter,
                ambient_temp_c=amb_temp,
                max_detected_temp_c=max_temp,
                detections=[DetectionBox(**d) for d in det_list],
                target_count=len(det_list),
                input_volume=self.volumes[sensor_id],
                fps=rate_hz
            )
            data_dict = reading.model_dump()
            data_dict["is_recording"] = self.is_recording
            self.latest_readings[sensor_id] = data_dict
            
            # Persist to Firestore only when Recording is Started by user
            if self.is_recording:
                await firebase_service.persist_reading(settings.COLL_THERMAL, reading_id, data_dict)
            await self._broadcast({"type": "sensor_update", "sensor_id": sensor_id, "data": data_dict, "is_recording": self.is_recording})
            
            await asyncio.sleep(1.0 / max(1.0, rate_hz))

    # --- 2. 77 GHz mmWave Radar Loop ---
    async def _run_radar_loop(self):
        sensor_id = "mmwave_radar"
        while self.is_running:
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            t = self.sim_time
            
            # Target 1: Preceding vehicle (Lead vehicle at 35m - 42m, speed matching ~48 km/h)
            dist1 = 38.5 + 4.5 * math.sin(t * 0.4)
            speed1 = 46.0 + 3.0 * math.cos(t * 0.5)
            azimuth1 = 2.0 + 3.0 * math.sin(t * 0.8)
            
            # Target 2: Oncoming or lane-adjacent truck (Distance 85m - 120m, closing speed)
            dist2 = 95.0 + 15.0 * math.cos(t * 0.2)
            speed2 = 62.0 + 4.0 * math.sin(t * 0.3)
            azimuth2 = -12.5 + 2.0 * math.sin(t * 0.5)

            # Target 3: Distant road sign or roadside barrier (145m)
            dist3 = 142.0 + 12.0 * math.sin(t * 0.15)
            
            targets = [
                RadarTarget(
                    target_id=1,
                    distance_m=round(dist1, 1),
                    speed_kmh=round(speed1, 1),
                    azimuth_deg=round(azimuth1, 1),
                    rcs_dbm=18.5,
                    range_rate_mps=round((speed1 - self.vehicle_speed_kmh) / 3.6, 2),
                    approach_warning=(dist1 < 30.0)
                ),
                RadarTarget(
                    target_id=2,
                    distance_m=round(dist2, 1),
                    speed_kmh=round(speed2, 1),
                    azimuth_deg=round(azimuth2, 1),
                    rcs_dbm=24.0,
                    range_rate_mps=round((-speed2 - self.vehicle_speed_kmh) / 3.6, 2),
                    approach_warning=False
                ),
                RadarTarget(
                    target_id=3,
                    distance_m=round(dist3, 1),
                    speed_kmh=0.0,
                    azimuth_deg=18.0,
                    rcs_dbm=12.0,
                    range_rate_mps=round(-self.vehicle_speed_kmh / 3.6, 2),
                    approach_warning=False
                )
            ]
            
            reading_id = f"RADAR_{int(time.time()*1000)}"
            reading = RadarReading(
                reading_id=reading_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                sensor_id=sensor_id,
                targets=targets,
                closest_distance_m=min(t.distance_m for t in targets),
                fastest_speed_kmh=max(t.speed_kmh for t in targets),
                input_volume=self.volumes[sensor_id]
            )
            data_dict = reading.model_dump()
            data_dict["is_recording"] = self.is_recording
            self.latest_readings[sensor_id] = data_dict
            
            # Persist to Firestore only when Recording is Started by user
            if self.is_recording:
                await firebase_service.persist_reading(settings.COLL_RADAR, reading_id, data_dict)
            await self._broadcast({"type": "sensor_update", "sensor_id": sensor_id, "data": data_dict, "is_recording": self.is_recording})
            
            await asyncio.sleep(1.0 / max(1.0, rate_hz))

    # --- 3. 1550 nm 3D LiDAR Loop ---
    async def _run_lidar_loop(self):
        sensor_id = "lidar_3d"
        while self.is_running:
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            t = self.sim_time
            
            # Generate sample 3D point cloud (representing road edges, berms, ground, obstacles)
            points: List[LidarPoint] = []
            
            # Road surface and road edge points (-50m to +50m along X/Z)
            curve = math.sin(t * 0.2) * 4.0
            for z in range(5, 75, 4):
                # Center road points
                for x_offset in [-4.0, -2.0, 0.0, 2.0, 4.0]:
                    points.append(LidarPoint(
                        x=round(x_offset + curve * (z/50.0)**2, 2),
                        y=round(-1.2 + random.uniform(-0.03, 0.03), 2),
                        z=round(float(z), 2),
                        intensity=round(0.45 + random.uniform(-0.05, 0.05), 2),
                        classification="road"
                    ))
                # Road Edge / Curbstone points (bright emerald highlight)
                points.append(LidarPoint(
                    x=round(-5.5 + curve * (z/50.0)**2, 2),
                    y=-1.0,
                    z=round(float(z), 2),
                    intensity=0.92,
                    classification="edge"
                ))
                points.append(LidarPoint(
                    x=round(5.5 + curve * (z/50.0)**2, 2),
                    y=-1.0,
                    z=round(float(z), 2),
                    intensity=0.92,
                    classification="edge"
                ))
                # Roadside Berm / Embankment points (amber warning highlight)
                points.append(LidarPoint(
                    x=round(-7.8 + curve * (z/50.0)**2, 2),
                    y=round(0.2 + (z/40.0)*0.5, 2),
                    z=round(float(z), 2),
                    intensity=0.78,
                    classification="berm"
                ))
                points.append(LidarPoint(
                    x=round(7.8 + curve * (z/50.0)**2, 2),
                    y=round(0.2 + (z/40.0)*0.5, 2),
                    z=round(float(z), 2),
                    intensity=0.78,
                    classification="berm"
                ))
            
            # Add vehicle obstacle points at ~38m
            for ox in [-1.2, 0.0, 1.2]:
                for oy in [-0.8, -0.2, 0.4]:
                    points.append(LidarPoint(
                        x=round(ox + curve * (38.0/50.0)**2, 2),
                        y=round(oy, 2),
                        z=38.0,
                        intensity=0.88,
                        classification="obstacle"
                    ))

            # Simulate cloudburst attenuation metric
            attenuation = round(8.5 + 4.0 * math.sin(t * 0.1), 1)
            quality_str = "Nominal (91.5%)" if attenuation < 15.0 else f"Cloudburst Attenuation ({round(100 - attenuation, 1)}%)"

            reading_id = f"LIDAR_{int(time.time()*1000)}"
            reading = LidarReading(
                reading_id=reading_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                sensor_id=sensor_id,
                point_count=len(points) * 120,  # Scaled representative count
                road_edge_detected=True,
                berm_detected=True,
                cloudburst_attenuation_pct=attenuation,
                signal_quality_rating=quality_str,
                points_sample=points[:45],  # Compact sample for Firestore storage
                input_volume=self.volumes[sensor_id]
            )
            data_dict = reading.model_dump()
            data_dict["full_points"] = [p.model_dump() for p in points] # for 3D Three.js renderer
            data_dict["is_recording"] = self.is_recording
            self.latest_readings[sensor_id] = data_dict

            # Persist to Firestore only when Recording is Started by user
            if self.is_recording:
                await firebase_service.persist_reading(settings.COLL_LIDAR, reading_id, data_dict)
            await self._broadcast({"type": "sensor_update", "sensor_id": sensor_id, "data": data_dict, "is_recording": self.is_recording})
            
            await asyncio.sleep(1.0 / max(1.0, rate_hz))

    # --- 4. UWB / RF Transceiver Loop ---
    async def _run_uwb_loop(self):
        sensor_id = "uwb_rf"
        while self.is_running:
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            t = self.sim_time
            
            # Tag 1: Connected car ahead (Line of Sight, distance 28m)
            x1 = 3.5 * math.sin(t * 0.3)
            y1 = 28.0 + 4.0 * math.cos(t * 0.4)
            dist1 = math.sqrt(x1**2 + y1**2)

            # Tag 2: Emergency Vehicle / Ambulance approaching from intersecting side-street (Non-Line-Of-Sight)
            # Hidden behind corner building!
            x2 = 42.0 - (t * 2.5) % 80
            y2 = 25.0
            dist2 = math.sqrt(x2**2 + y2**2)
            is_nlos = abs(x2) > 15.0  # Obscured by blind intersection building
            
            tags = [
                UwbTag(
                    tag_id="TAG-SEDAN-882",
                    vehicle_type="Passenger Sedan",
                    rel_x_m=round(x1, 1),
                    rel_y_m=round(y1, 1),
                    distance_m=round(dist1, 1),
                    nlos_status=False,
                    v2v_alert=False,
                    rssi_dbm=-62.4
                ),
                UwbTag(
                    tag_id="TAG-EMERGENCY-01",
                    vehicle_type="Emergency Ambulance",
                    rel_x_m=round(x2, 1),
                    rel_y_m=round(y2, 1),
                    distance_m=round(dist2, 1),
                    nlos_status=is_nlos,
                    v2v_alert=(dist2 < 45.0 and is_nlos),
                    rssi_dbm=-74.8 if is_nlos else -58.2
                )
            ]
            
            has_nlos_risk = any(tag.v2v_alert for tag in tags)
            
            reading_id = f"UWB_{int(time.time()*1000)}"
            reading = UwbReading(
                reading_id=reading_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                sensor_id=sensor_id,
                tags=tags,
                nlos_collision_risk=has_nlos_risk,
                active_tags_count=len(tags),
                input_volume=self.volumes[sensor_id]
            )
            data_dict = reading.model_dump()
            data_dict["is_recording"] = self.is_recording
            self.latest_readings[sensor_id] = data_dict

            # Persist to Firestore only when Recording is Started by user
            if self.is_recording:
                await firebase_service.persist_reading(settings.COLL_UWB, reading_id, data_dict)
            await self._broadcast({"type": "sensor_update", "sensor_id": sensor_id, "data": data_dict, "is_recording": self.is_recording})
            
            await asyncio.sleep(1.0 / max(1.0, rate_hz))

    # --- 5. RTK-GNSS + IMU Loop ---
    async def _run_gnss_imu_loop(self):
        sensor_id = "rtk_gnss_imu"
        while self.is_running:
            rate_hz = self.get_sampling_rate_hz(sensor_id)
            self.sim_time += (1.0 / max(1.0, rate_hz))
            t = self.sim_time
            
            # Smooth trajectory progression along a realistic path
            speed_mps = self.vehicle_speed_kmh / 3.6
            dt = 1.0 / max(1.0, rate_hz)
            dist_step = speed_mps * dt
            
            # Slight curving road
            heading_change = 0.8 * math.sin(t * 0.1)
            self.current_heading = (self.current_heading + heading_change) % 360.0
            
            # Advance coordinates (approx 111,111m per degree lat)
            rad = math.radians(self.current_heading)
            self.current_lat += (dist_step * math.cos(rad)) / 111111.0
            self.current_lon += (dist_step * math.sin(rad)) / (111111.0 * math.cos(math.radians(self.current_lat)))
            
            # IMU Attitude & Accelerations
            pitch = round(1.2 * math.sin(t * 0.2), 2)  # mild grade
            roll = round(2.5 * math.sin(t * 0.15), 2)  # road camber / steering tilt
            yaw = round(self.current_heading, 1)
            accel_x = round(0.04 * math.sin(t * 0.5), 2)
            accel_y = round(0.08 * math.cos(t * 0.4), 2)
            accel_z = round(1.0 + 0.02 * math.sin(t * 2.0), 2)
            
            lane_offset = round(0.08 * math.sin(t * 0.3), 2)  # lateral lane positioning

            reading_id = f"GNSS_{int(time.time()*1000)}"
            reading = GnssImuReading(
                reading_id=reading_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                sensor_id=sensor_id,
                latitude=round(self.current_lat, 6),
                longitude=round(self.current_lon, 6),
                altitude_m=round(920.5 + math.sin(t*0.05)*12.0, 1),
                heading_deg=round(self.current_heading, 1),
                speed_kmh=round(self.vehicle_speed_kmh + 2.0 * math.sin(t*0.2), 1),
                rtk_status="FIXED",
                satellites_count=28,
                hdop=0.68,
                lane_guidance_offset_m=lane_offset,
                imu=ImuData(
                    pitch_deg=pitch,
                    roll_deg=roll,
                    yaw_deg=yaw,
                    accel_x_g=accel_x,
                    accel_y_g=accel_y,
                    accel_z_g=accel_z
                ),
                input_volume=self.volumes[sensor_id]
            )
            data_dict = reading.model_dump()
            data_dict["is_recording"] = self.is_recording
            self.latest_readings[sensor_id] = data_dict

            # Persist to Firestore only when Recording is Started by user
            if self.is_recording:
                await firebase_service.persist_reading(settings.COLL_GNSS, reading_id, data_dict)
            await self._broadcast({"type": "sensor_update", "sensor_id": sensor_id, "data": data_dict, "is_recording": self.is_recording})
            
            await asyncio.sleep(1.0 / max(1.0, rate_hz))

    # --- Cross-Sensor Safety Event Fuser Loop ---
    async def _run_alert_fuser_loop(self):
        """Monitors sensor states and generates cross-sensor safety alerts."""
        while self.is_running:
            await asyncio.sleep(6.0)
            uwb = self.latest_readings.get("uwb_rf", {})
            lidar = self.latest_readings.get("lidar_3d", {})
            thermal = self.latest_readings.get("thermal_camera", {})

            if uwb.get("nlos_collision_risk"):
                alert = SafetyAlert(
                    alert_id=f"ALT_{int(time.time()*1000)}",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    severity="critical",
                    title="V2V Non-Line-Of-Sight Hazard",
                    description="Emergency Ambulance approaching blind intersection (42m) obscured by building structure.",
                    trigger_sensor="UWB / RF Transceiver",
                    corroborating_sensor="77 GHz mmWave Radar",
                    action_required="Prepare to yield / decelerate"
                )
                if self.is_recording:
                    await firebase_service.log_alert(alert.model_dump())
                await self._broadcast({"type": "alert", "data": alert.model_dump()})
            
            elif lidar.get("cloudburst_attenuation_pct", 0) > 11.0:
                alert = SafetyAlert(
                    alert_id=f"ALT_{int(time.time()*1000)}",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    severity="warning",
                    title="LiDAR Weather Attenuation Warning",
                    description="1550nm LiDAR optical attenuation detected due to precipitation. 77GHz mmWave Radar engaged as primary rangefinder.",
                    trigger_sensor="1550 nm 3D LiDAR",
                    corroborating_sensor="77 GHz mmWave Radar",
                    action_required="Sensor fusion fallback active"
                )
                if self.is_recording:
                    await firebase_service.log_alert(alert.model_dump())
                await self._broadcast({"type": "alert", "data": alert.model_dump()})

    async def _broadcast(self, message: Dict[str, Any]):
        """Dispatches real-time update to connected WebSocket clients."""
        for queue in list(self.subscribers):
            try:
                if queue.qsize() < 50:  # avoid lagging queues
                    queue.put_nowait(message)
            except Exception:
                pass

    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)

sensor_simulator = SensorSimulator()
