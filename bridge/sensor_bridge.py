import os
import sys
import time
import math
import uuid
import random
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("safeway.bridge")

# --- Configuration ---
SIMULATION_API_URL = os.getenv("SIMULATION_API_URL", "http://127.0.0.1:8000")
POLL_INTERVAL_SEC = float(os.getenv("POLL_INTERVAL_SEC", 2.5)) # Configurable interval: 2-5s
FIREBASE_PROJECT_ID = "safeway-d78b8"
FIREBASE_API_KEY = "AIzaSyCPnErU9gGcoLkUL-JL-XEDN5XoiwRJEsU"
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"

# Mining Center in Coimbatore (Madukkarai / Walayar Limestone Quarry Sector)
COIMBATORE_MINE_LAT = 11.0168
COIMBATORE_MINE_LON = 76.9558

# --- 5 Firestore Collection Names as requested ---
COLL_VEHICLES = "vehicles"
COLL_SENSOR_READINGS = "sensor_readings"
COLL_THERMAL_FRAMES = "thermalFrames"
COLL_AI_DETECTIONS = "aiDetections"
COLL_USER_SETTINGS = "userSettings"

# --- Models ---
class VehicleRegistrationRequest(BaseModel):
    vehicle_id: str
    driver_name: str
    vehicle_type: str = "Haul Dump Truck (60T)"
    assigned_mine_zone: str = "Pit-A West Wall"

class VehicleModel(BaseModel):
    vehicle_id: str
    driver_name: str
    vehicle_type: str
    username: str
    password: str
    assigned_mine_zone: str
    status: str = "active"
    current_location: Dict[str, Any]
    safety_status: str = "Safe" # Safe, Caution, Alert
    front_distance_m: float = 65.0
    speed_kmh: float = 42.0
    heading_deg: float = 85.0
    created_at: str
    last_updated: str

# In-memory fleet registry & state
DEFAULT_FLEET = [
    {
        "vehicle_id": "HV-TRUCK-101",
        "driver_name": "Ramesh Kumar",
        "vehicle_type": "Haul Dump Truck (60T)",
        "username": "driver_truck101",
        "password": "Safe#101R",
        "assigned_mine_zone": "Pit-A West Wall",
        "status": "active",
        "offset_distance": 0.0, # Lead vehicle (driven by simulation)
        "safety_status": "Safe"
    },
    {
        "vehicle_id": "HV-TRUCK-102",
        "driver_name": "Murugan S",
        "vehicle_type": "Haul Dump Truck (60T)",
        "username": "driver_truck102",
        "password": "Safe#102M",
        "assigned_mine_zone": "Pit-A West Wall",
        "status": "active",
        "offset_distance": 38.0, # Trailing 38m behind lead
        "safety_status": "Caution"
    },
    {
        "vehicle_id": "HV-TRUCK-103",
        "driver_name": "Karthik V",
        "vehicle_type": "Haul Dump Truck (60T)",
        "username": "driver_truck103",
        "password": "Safe#103K",
        "assigned_mine_zone": "Crusher Loading Bay",
        "status": "active",
        "offset_distance": 76.0, # Trailing 76m behind lead
        "safety_status": "Safe"
    },
    {
        "vehicle_id": "HV-LOADER-201",
        "driver_name": "Selvan R",
        "vehicle_type": "CAT 992K Wheel Loader",
        "username": "driver_loader201",
        "password": "Safe#201S",
        "assigned_mine_zone": "Loading Station Bay 3",
        "status": "active",
        "offset_distance": 180.0,
        "safety_status": "Safe"
    },
    {
        "vehicle_id": "HV-EXCAV-301",
        "driver_name": "Anbarasan M",
        "vehicle_type": "Komatsu PC2000 Excavator",
        "username": "driver_excav301",
        "password": "Safe#301A",
        "assigned_mine_zone": "Bench Level-4 Mining Face",
        "status": "active",
        "offset_distance": 290.0,
        "safety_status": "Safe"
    }
]

class SensorBridge:
    def __init__(self):
        self.vehicles: Dict[str, Dict[str, Any]] = {}
        self.is_running = False
        self.http_client: Optional[httpx.AsyncClient] = None
        self.subscribers: List[asyncio.Queue] = []
        self.total_readings_pushed = 0
        self.recent_alerts: List[Dict[str, Any]] = []
        self.recent_readings: Dict[str, Any] = {}
        self.simulated_sudden_stop_active = False
        self.sudden_stop_timer = 0
        
        # Initialize default fleet
        now_str = datetime.now(timezone.utc).isoformat()
        for v in DEFAULT_FLEET:
            vid = v["vehicle_id"]
            self.vehicles[vid] = {
                **v,
                "current_location": {
                    "latitude": COIMBATORE_MINE_LAT,
                    "longitude": COIMBATORE_MINE_LON,
                    "altitude": 340.0,
                    "heading": 85.0,
                    "speed_kmh": 42.0,
                    "updated_at": now_str
                },
                "front_distance_m": 65.0 if v["offset_distance"] == 0.0 else v["offset_distance"],
                "speed_kmh": 42.0,
                "heading_deg": 85.0,
                "created_at": now_str,
                "last_updated": now_str
            }

    async def init(self):
        self.http_client = httpx.AsyncClient(timeout=4.0)
        # Seed initial vehicles to Firestore
        for vid, vdata in self.vehicles.items():
            asyncio.create_task(self._push_firestore_doc(COLL_VEHICLES, vid, vdata))

    async def close(self):
        if self.http_client and not self.http_client.is_closed:
            await self.http_client.aclose()

    def _py_to_firestore(self, value: Any) -> Dict[str, Any]:
        """Converts Python value to Firestore REST API typed format."""
        if value is None:
            return {"nullValue": None}
        elif isinstance(value, bool):
            return {"booleanValue": value}
        elif isinstance(value, int):
            return {"integerValue": str(value)}
        elif isinstance(value, float):
            return {"doubleValue": value}
        elif isinstance(value, str):
            return {"stringValue": value}
        elif isinstance(value, list):
            return {"arrayValue": {"values": [self._py_to_firestore(v) for v in value]}}
        elif isinstance(value, dict):
            fields = {k: self._py_to_firestore(v) for k, v in value.items() if not k.startswith("_")}
            return {"mapValue": {"fields": fields}}
        else:
            return {"stringValue": str(value)}

    async def _push_firestore_doc(self, collection_name: str, doc_id: str, data: Dict[str, Any]):
        """Pushes document to Firestore REST API with retry / patch."""
        if not self.http_client:
            return
        url = f"{FIRESTORE_BASE_URL}/{collection_name}?documentId={doc_id}&key={FIREBASE_API_KEY}"
        fields = {k: self._py_to_firestore(v) for k, v in data.items() if k != "image_base64"}
        payload = {"fields": fields}
        try:
            resp = await self.http_client.post(url, json=payload)
            if resp.status_code == 409:
                patch_url = f"{FIRESTORE_BASE_URL}/{collection_name}/{doc_id}?key={FIREBASE_API_KEY}"
                await self.http_client.patch(patch_url, json=payload)
            self.total_readings_pushed += 1
        except Exception as e:
            logger.debug(f"Firestore write note ({collection_name}): {e}")

    async def run_bridge_loop(self):
        """Main polling & bridging loop: pulls from simulation, computes V2V cascades, and updates Firebase."""
        self.is_running = True
        logger.info(f"Sensor Bridge started. Polling simulation at {SIMULATION_API_URL} every {POLL_INTERVAL_SEC}s")

        while self.is_running:
            try:
                # 1. Fetch live telemetry from the untouched simulation
                sim_data = await self._fetch_simulation_data()
                
                # 2. Update fleet vehicle positions along the Coimbatore haul-road circuit
                await self._update_fleet_physics(sim_data)
                
                # 3. Compute fused safety status and cascading V2V alerts
                await self._evaluate_v2v_safety_cascade()
                
                # 4. Push updated data to Firebase Firestore (5 collections)
                await self._push_to_firebase()
                
                # 5. Broadcast to connected WebSocket clients
                await self._broadcast({
                    "type": "fleet_update",
                    "vehicles": list(self.vehicles.values()),
                    "alerts": self.recent_alerts[:10],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

            except Exception as e:
                logger.warning(f"Bridge loop iteration notice: {e}")

            await asyncio.sleep(POLL_INTERVAL_SEC)

    async def _fetch_simulation_data(self) -> Dict[str, Any]:
        """Queries the live SafeWay Sensor Dashboard API without modifying it."""
        sim_data = {}
        if not self.http_client:
            return sim_data

        try:
            # Query all 5 sensors in parallel for speed
            r_radar, r_thermal, r_lidar, r_uwb, r_gnss = await asyncio.gather(
                self.http_client.get(f"{SIMULATION_API_URL}/api/sensors/mmwave_radar"),
                self.http_client.get(f"{SIMULATION_API_URL}/api/sensors/thermal_camera"),
                self.http_client.get(f"{SIMULATION_API_URL}/api/sensors/lidar_3d"),
                self.http_client.get(f"{SIMULATION_API_URL}/api/sensors/uwb_rf"),
                self.http_client.get(f"{SIMULATION_API_URL}/api/sensors/rtk_gnss_imu"),
                return_exceptions=True
            )

            if isinstance(r_radar, httpx.Response) and r_radar.status_code == 200:
                sim_data["radar"] = r_radar.json().get("latest_reading") or {}
            if isinstance(r_thermal, httpx.Response) and r_thermal.status_code == 200:
                sim_data["thermal"] = r_thermal.json().get("latest_reading") or {}
            if isinstance(r_lidar, httpx.Response) and r_lidar.status_code == 200:
                sim_data["lidar"] = r_lidar.json().get("latest_reading") or {}
            if isinstance(r_uwb, httpx.Response) and r_uwb.status_code == 200:
                sim_data["uwb"] = r_uwb.json().get("latest_reading") or {}
            if isinstance(r_gnss, httpx.Response) and r_gnss.status_code == 200:
                sim_data["gnss"] = r_gnss.json().get("latest_reading") or {}

        except Exception as err:
            logger.debug(f"Simulation fetch fallback: {err}")

        return sim_data

    async def _update_fleet_physics(self, sim_data: Dict[str, Any]):
        """Moves fleet vehicles along the Coimbatore limestone quarry haul road."""
        now_str = datetime.now(timezone.utc).isoformat()
        
        # Lead vehicle telemetry (HV-TRUCK-101) directly mirrors GNSS & Radar
        gnss = sim_data.get("gnss") or {}
        radar = sim_data.get("radar") or {}
        thermal = sim_data.get("thermal") or {}
        
        # Project simulation movement delta onto Coimbatore limestone mine coordinates
        sim_lat = gnss.get("latitude")
        sim_lon = gnss.get("longitude")
        if sim_lat is not None and sim_lon is not None:
            delta_lat = sim_lat - 12.971600
            delta_lon = sim_lon - 77.594600
            lead_lat = round(COIMBATORE_MINE_LAT + delta_lat, 6)
            lead_lon = round(COIMBATORE_MINE_LON + delta_lon, 6)
        else:
            lead_lat = COIMBATORE_MINE_LAT
            lead_lon = COIMBATORE_MINE_LON
        lead_speed = gnss.get("speed_kmh") or 42.0
        lead_heading = gnss.get("heading_deg") or 85.0
        
        # Check sudden stop simulation trigger
        if self.simulated_sudden_stop_active:
            lead_speed = 0.0
            radar_front_dist = 14.5 # Sudden close obstacle!
            self.sudden_stop_timer -= 1
            if self.sudden_stop_timer <= 0:
                self.simulated_sudden_stop_active = False
        else:
            radar_front_dist = radar.get("closest_distance_m") or 48.0

        # Update Lead Vehicle
        if "HV-TRUCK-101" in self.vehicles:
            lead = self.vehicles["HV-TRUCK-101"]
            lead["speed_kmh"] = lead_speed
            lead["heading_deg"] = lead_heading
            lead["front_distance_m"] = round(radar_front_dist, 1)
            lead["closest_proximity_m"] = round(radar_front_dist, 1)
            lead["latitude"] = lead_lat
            lead["longitude"] = lead_lon
            lead["current_location"] = {
                "latitude": lead_lat,
                "longitude": lead_lon,
                "altitude": 342.5,
                "heading": lead_heading,
                "speed_kmh": lead_speed,
                "updated_at": now_str
            }
            lead["last_updated"] = now_str

        # Update Following Vehicles in convoy along heading direction
        rad = math.radians((lead_heading + 180) % 360) # direction behind lead
        
        # HV-TRUCK-102 (directly behind)
        if "HV-TRUCK-102" in self.vehicles:
            v2 = self.vehicles["HV-TRUCK-102"]
            dist_behind_m = 36.0 if not self.simulated_sudden_stop_active else 18.0
            # Lat/Lon offset approx 1m = 1/111111 degrees
            v2_lat = lead_lat + (dist_behind_m * math.cos(rad)) / 111111.0
            v2_lon = lead_lon + (dist_behind_m * math.sin(rad)) / (111111.0 * math.cos(math.radians(lead_lat)))
            v2_speed = max(0.0, lead_speed - 2.0)
            v2["speed_kmh"] = round(v2_speed, 1)
            v2["heading_deg"] = lead_heading
            v2["front_distance_m"] = round(dist_behind_m, 1)
            v2["closest_proximity_m"] = round(dist_behind_m, 1)
            v2["latitude"] = round(v2_lat, 6)
            v2["longitude"] = round(v2_lon, 6)
            v2["current_location"] = {
                "latitude": round(v2_lat, 6),
                "longitude": round(v2_lon, 6),
                "altitude": 341.0,
                "heading": lead_heading,
                "speed_kmh": round(v2_speed, 1),
                "updated_at": now_str
            }
            v2["last_updated"] = now_str

        # HV-TRUCK-103 (two vehicles behind)
        if "HV-TRUCK-103" in self.vehicles:
            v3 = self.vehicles["HV-TRUCK-103"]
            dist_behind_m = 74.0 if not self.simulated_sudden_stop_active else 42.0
            v3_lat = lead_lat + (dist_behind_m * math.cos(rad)) / 111111.0
            v3_lon = lead_lon + (dist_behind_m * math.sin(rad)) / (111111.0 * math.cos(math.radians(lead_lat)))
            v3_speed = max(0.0, lead_speed - 1.0)
            v3["speed_kmh"] = round(v3_speed, 1)
            v3["heading_deg"] = lead_heading
            v3["front_distance_m"] = round(dist_behind_m - 36.0, 1)
            v3["closest_proximity_m"] = round(dist_behind_m - 36.0, 1)
            v3["latitude"] = round(v3_lat, 6)
            v3["longitude"] = round(v3_lon, 6)
            v3["current_location"] = {
                "latitude": round(v3_lat, 6),
                "longitude": round(v3_lon, 6),
                "altitude": 340.5,
                "heading": lead_heading,
                "speed_kmh": round(v3_speed, 1),
                "updated_at": now_str
            }
            v3["last_updated"] = now_str

        # Ensure all other vehicles have top-level coordinates
        for vid, v in self.vehicles.items():
            if vid not in ("HV-TRUCK-101", "HV-TRUCK-102", "HV-TRUCK-103"):
                loc = v.get("current_location", {})
                v["latitude"] = loc.get("latitude", COIMBATORE_MINE_LAT)
                v["longitude"] = loc.get("longitude", COIMBATORE_MINE_LON)
                v["closest_proximity_m"] = v.get("front_distance_m", 150.0)

        # Store latest simulation sensor readings cache
        self.recent_readings["HV-TRUCK-101"] = {
            "radar": radar,
            "thermal": thermal,
            "lidar": sim_data.get("lidar") or {},
            "uwb": sim_data.get("uwb") or {},
            "gnss": gnss
        }

    async def _evaluate_v2v_safety_cascade(self):
        now_str = datetime.now(timezone.utc).isoformat()
        lead = self.vehicles.get("HV-TRUCK-101")
        v2 = self.vehicles.get("HV-TRUCK-102")
        v3 = self.vehicles.get("HV-TRUCK-103")

        is_lead_sudden_stop = False
        if lead:
            dist = lead["front_distance_m"]
            speed = lead["speed_kmh"]
            
            if dist < 20.0 or speed < 5.0 or self.simulated_sudden_stop_active:
                lead["safety_status"] = "alert"
                is_lead_sudden_stop = True
            elif 20.0 <= dist <= 50.0:
                lead["safety_status"] = "caution"
            else:
                lead["safety_status"] = "safe"

        # Cascade to Vehicle 2 (immediate follower)
        if v2:
            if is_lead_sudden_stop:
                v2["safety_status"] = "alert"
                alert_obj = {
                    "alert_id": f"V2V_ALERT_{int(time.time()*1000)}",
                    "timestamp": now_str,
                    "severity": "CRITICAL",
                    "cascade_type": "V2V CHAIN-REACTION BRAKE ALERT",
                    "target_vehicle_id": "HV-TRUCK-102",
                    "source_vehicle_id": "HV-TRUCK-101",
                    "title": "🚨 V2V CASCADE: Lead Vehicle Stopped Ahead!",
                    "message": "Lead Hauler HV-TRUCK-101 emergency braking detected at 18m! Apply retarder brakes immediately!",
                    "action": "Immediate Brake Application"
                }
                self.recent_alerts.insert(0, alert_obj)
            elif v2["front_distance_m"] <= 50.0:
                v2["safety_status"] = "caution"
            else:
                v2["safety_status"] = "safe"

        # Cascade to Vehicle 3 (two vehicles behind)
        if v3:
            if is_lead_sudden_stop:
                v3["safety_status"] = "caution"
                alert_obj = {
                    "alert_id": f"V2V_WARN_{int(time.time()*1000)}",
                    "timestamp": now_str,
                    "severity": "WARNING",
                    "cascade_type": "V2V SECONDARY ADVISORY",
                    "target_vehicle_id": "HV-TRUCK-103",
                    "source_vehicle_id": "HV-TRUCK-101",
                    "title": "⚠️ V2V CHAIN-REACTION: Convoy Deceleration Ahead",
                    "message": "Heavy hauler 2 vehicles ahead (HV-TRUCK-101) stopped in low visibility dust. Reduce speed to 20 km/h.",
                    "action": "Controlled Deceleration"
                }
                self.recent_alerts.insert(0, alert_obj)
            else:
                v3["safety_status"] = "safe"

        # Keep alerts list bounded
        if len(self.recent_alerts) > 25:
            self.recent_alerts = self.recent_alerts[:25]

    async def _push_to_firebase(self):
        """Pushes structured data into the 5 Firestore collections."""
        now_str = datetime.now(timezone.utc).isoformat()
        
        # 1. Update `vehicles` collection
        for vid, vdata in self.vehicles.items():
            doc_data = {
                "vehicle_id": vid,
                "driver_name": vdata["driver_name"],
                "vehicle_type": vdata["vehicle_type"],
                "username": vdata["username"],
                "password": vdata["password"],
                "assigned_mine_zone": vdata["assigned_mine_zone"],
                "status": vdata["status"],
                "safety_status": vdata["safety_status"],
                "front_distance_m": vdata["front_distance_m"],
                "speed_kmh": vdata["speed_kmh"],
                "heading_deg": vdata["heading_deg"],
                "current_location": vdata["current_location"],
                "last_updated": now_str
            }
            asyncio.create_task(self._push_firestore_doc(COLL_VEHICLES, vid, doc_data))

        # 2. Add time-series document to `sensor_readings` for lead vehicle
        lead = self.vehicles.get("HV-TRUCK-101")
        if lead:
            reading_id = f"SR_{int(time.time()*1000)}"
            sensor_data = {
                "reading_id": reading_id,
                "vehicle_id": "HV-TRUCK-101",
                "timestamp": now_str,
                "front_distance_m": lead["front_distance_m"],
                "speed_kmh": lead["speed_kmh"],
                "engine_temp_c": round(84.5 + random.uniform(-1.5, 2.0), 1),
                "weather_immunity_rating": "Superior (Immune to dust, fog & rain)",
                "lidar_road_edge": True,
                "berm_detected": True,
                "uwb_nearby_tags": ["HV-TRUCK-102", "HV-LOADER-201"],
                "gnss_rtk_status": "FIXED (Centimeter accuracy)",
                "latitude": lead["current_location"]["latitude"],
                "longitude": lead["current_location"]["longitude"]
            }
            asyncio.create_task(self._push_firestore_doc(COLL_SENSOR_READINGS, reading_id, sensor_data))

        # 3. Push to `thermalFrames`
        cached_thermal = self.recent_readings.get("HV-TRUCK-101", {}).get("thermal", {})
        if cached_thermal:
            frame_id = f"TF_{int(time.time()*1000)}"
            frame_doc = {
                "frame_id": frame_id,
                "vehicle_id": "HV-TRUCK-101",
                "timestamp": now_str,
                "image_url": cached_thermal.get("image_url") or f"https://storage.googleapis.com/{FIREBASE_PROJECT_ID}.firebasestorage.app/thermal_frames/{frame_id}.jpg",
                "ambient_temp_c": cached_thermal.get("ambient_temp_c", 18.5),
                "max_temp_c": cached_thermal.get("max_detected_temp_c", 86.0),
                "target_count": len(cached_thermal.get("detections", []))
            }
            asyncio.create_task(self._push_firestore_doc(COLL_THERMAL_FRAMES, frame_id, frame_doc))

        # 4. Push to `aiDetections`
        detections = cached_thermal.get("detections") or []
        for det in detections:
            det_id = f"DET_{int(time.time()*1000)}_{random.randint(100, 999)}"
            det_doc = {
                "detection_id": det_id,
                "vehicle_id": "HV-TRUCK-101",
                "timestamp": now_str,
                "label": det.get("label", "Object"),
                "confidence": det.get("confidence", 0.95),
                "temperature_c": det.get("temperature_c", 36.8),
                "hazard_level": "High" if det.get("label") == "Pedestrian" else "Standard"
            }
            asyncio.create_task(self._push_firestore_doc(COLL_AI_DETECTIONS, det_id, det_doc))

    def trigger_sudden_stop(self, duration_sec: int = 12):
        """Simulates a sudden emergency stop of the lead vehicle to demonstrate cascading V2V alerts."""
        self.simulated_sudden_stop_active = True
        self.sudden_stop_timer = int(duration_sec / POLL_INTERVAL_SEC)
        logger.info(f"Triggered Sudden Stop simulation for {duration_sec}s")

    def register_vehicle(self, req: VehicleRegistrationRequest) -> Dict[str, Any]:
        """Registers a new vehicle with auto-generated username & password."""
        vid = req.vehicle_id.strip().upper()
        now_str = datetime.now(timezone.utc).isoformat()
        
        # Auto-generate credentials
        clean_num = ''.join(c for c in vid if c.isdigit()) or str(random.randint(100, 999))
        username = f"driver_{clean_num.lower()}"
        password = f"Safe#{clean_num}{random.choice(['A','B','X','Z'])}"
        
        # Slight jitter around Coimbatore mine
        jitter_lat = COIMBATORE_MINE_LAT + random.uniform(-0.003, 0.003)
        jitter_lon = COIMBATORE_MINE_LON + random.uniform(-0.003, 0.003)

        new_vehicle = {
            "vehicle_id": vid,
            "driver_name": req.driver_name.strip(),
            "vehicle_type": req.vehicle_type,
            "username": username,
            "password": password,
            "assigned_mine_zone": req.assigned_mine_zone,
            "status": "active",
            "safety_status": "Safe",
            "front_distance_m": round(random.uniform(55.0, 90.0), 1),
            "speed_kmh": round(random.uniform(25.0, 45.0), 1),
            "heading_deg": round(random.uniform(0.0, 360.0), 1),
            "current_location": {
                "latitude": round(jitter_lat, 6),
                "longitude": round(jitter_lon, 6),
                "altitude": 340.0,
                "heading": 85.0,
                "speed_kmh": 35.0,
                "updated_at": now_str
            },
            "created_at": now_str,
            "last_updated": now_str
        }
        self.vehicles[vid] = new_vehicle
        asyncio.create_task(self._push_firestore_doc(COLL_VEHICLES, vid, new_vehicle))
        return new_vehicle

    def delete_vehicle(self, vehicle_id: str) -> bool:
        if vehicle_id in self.vehicles:
            del self.vehicles[vehicle_id]
            return True
        return False

    async def _broadcast(self, msg: Dict[str, Any]):
        for q in list(self.subscribers):
            try:
                if q.qsize() < 20:
                    q.put_nowait(msg)
            except Exception:
                pass

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

bridge = SensorBridge()

# --- FastAPI Bridge Server (Port 8001) ---
app = FastAPI(
    title="SafeWay Sensor Bridge Middleware",
    version="1.0.0",
    description="Middleware consuming SafeWay Sensor Simulation and persisting to Firebase for Fleet Management."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await bridge.init()
    asyncio.create_task(bridge.run_bridge_loop())

@app.on_event("shutdown")
async def on_shutdown():
    bridge.is_running = False
    await bridge.close()

@app.get("/api/bridge/health")
async def bridge_health():
    return {
        "status": "healthy",
        "simulation_source": SIMULATION_API_URL,
        "poll_interval_sec": POLL_INTERVAL_SEC,
        "active_fleet_count": len(bridge.vehicles),
        "total_readings_pushed": bridge.total_readings_pushed,
        "sudden_stop_simulated": bridge.simulated_sudden_stop_active
    }

@app.get("/api/bridge/vehicles")
async def get_all_vehicles():
    return {"vehicles": list(bridge.vehicles.values())}

@app.get("/api/bridge/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    vid = vehicle_id.strip().upper()
    v = bridge.vehicles.get(vid)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found in fleet")
    return {"vehicle": v}

@app.post("/api/bridge/vehicles")
async def add_vehicle(req: VehicleRegistrationRequest):
    created = bridge.register_vehicle(req)
    return {
        "status": "success",
        "message": f"Vehicle {created['vehicle_id']} registered successfully",
        "vehicle": created
    }

@app.delete("/api/bridge/vehicles/{vehicle_id}")
async def remove_vehicle(vehicle_id: str):
    vid = vehicle_id.strip().upper()
    ok = bridge.delete_vehicle(vid)
    if not ok:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"status": "success", "message": f"Vehicle {vid} removed"}

@app.post("/api/bridge/simulate-sudden-stop")
async def trigger_stop_test(duration_sec: int = 12):
    bridge.trigger_sudden_stop(duration_sec)
    return {
        "status": "triggered",
        "message": f"Lead vehicle emergency stop triggered for {duration_sec}s. Cascading V2V warnings dispatched to followers."
    }

@app.get("/api/bridge/sensor-readings/{vehicle_id}")
async def get_vehicle_sensor_readings(vehicle_id: str):
    vid = vehicle_id.strip().upper()
    v = bridge.vehicles.get(vid)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    # Return live cached sensor telemetry
    cached = bridge.recent_readings.get("HV-TRUCK-101", {})
    return {
        "vehicle_id": vid,
        "driver_name": v["driver_name"],
        "safety_status": v["safety_status"],
        "front_distance_m": v["front_distance_m"],
        "speed_kmh": v["speed_kmh"],
        "heading_deg": v["heading_deg"],
        "telemetry": cached,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/bridge/alerts")
async def get_bridge_alerts():
    return {"alerts": bridge.recent_alerts}

@app.websocket("/ws/fleet-live")
async def fleet_ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    q = bridge.subscribe()
    # Send initial state
    await websocket.send_json({
        "type": "initial_fleet_state",
        "vehicles": list(bridge.vehicles.values()),
        "alerts": bridge.recent_alerts[:10]
    })
    try:
        while True:
            msg = await q.get()
            await websocket.send_json(msg)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        bridge.unsubscribe(q)

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("BRIDGE_PORT", 8001)))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"[SafeWay Bridge] Starting on http://{host}:{port}")
    uvicorn.run("sensor_bridge:app", host=host, port=port, reload=False)
