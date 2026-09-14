import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .services.firebase_service import firebase_service
from .services.sensor_simulator import sensor_simulator
from .models.schemas import VolumeUpdateRequest

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Firebase and start sensor simulators
    await firebase_service.init()
    await sensor_simulator.start()
    yield
    # Shutdown: Stop simulator loops and close connections
    await sensor_simulator.stop()
    await firebase_service.close()

app = FastAPI(
    title="SafeWay Sensor Dashboard API",
    version=settings.VERSION,
    description="High-performance backend simulating, validating, and persisting 5 vehicle-safety sensors to Firebase.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "firebase_project": settings.FIREBASE.project_id,
        "total_persisted_readings": firebase_service.total_persisted,
        "is_simulating": sensor_simulator.is_running,
        "is_recording": sensor_simulator.is_recording
    }

@app.get("/api/recording/status")
async def get_recording_status():
    return {
        "is_recording": sensor_simulator.is_recording,
        "total_persisted_readings": firebase_service.total_persisted
    }

@app.post("/api/recording/start")
async def start_recording():
    await sensor_simulator.start_recording()
    return {
        "is_recording": True,
        "status": "started",
        "message": "Now persisting sensor telemetry into Firebase Firestore"
    }

@app.post("/api/recording/stop")
async def stop_recording():
    await sensor_simulator.stop_recording()
    return {
        "is_recording": False,
        "status": "stopped",
        "message": "Data persistence to Firebase Firestore is ended/paused"
    }

@app.post("/api/recording/toggle")
async def toggle_recording():
    new_state = await sensor_simulator.toggle_recording()
    return {
        "is_recording": new_state,
        "status": "started" if new_state else "stopped",
        "message": "Persisting to Firebase" if new_state else "Persistence paused"
    }

@app.get("/api/sensors")
async def list_sensors():
    sensor_list = [
        {
            "sensor_id": "thermal_camera",
            "name": "Thermal Infrared (LWIR) Camera",
            "metric": "Video Feed / Infrared Radiometry",
            "effective_range": "30–50 m",
            "weather_immunity": "High (Darkness & Fog Penetration)",
            "key_value": "Intuitive visual display for driver",
            "limitation": "Lacks direct target distance measurement",
            "input_volume": sensor_simulator.volumes["thermal_camera"],
            "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz("thermal_camera"),
            "firestore_collection": settings.COLL_THERMAL
        },
        {
            "sensor_id": "mmwave_radar",
            "name": "77 GHz mmWave Radar",
            "metric": "Object Distance & Doppler Speed",
            "effective_range": "100–200 m",
            "weather_immunity": "Superior (Immune to fog, rain, mud)",
            "key_value": "Penetrates dense fog, rain, and mud",
            "limitation": "Low spatial resolution (cannot render shape)",
            "input_volume": sensor_simulator.volumes["mmwave_radar"],
            "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz("mmwave_radar"),
            "firestore_collection": settings.COLL_RADAR
        },
        {
            "sensor_id": "lidar_3d",
            "name": "1550 nm 3D LiDAR",
            "metric": "3D Point Cloud",
            "effective_range": "50–100 m",
            "weather_immunity": "Moderate (Cloudburst attenuation)",
            "key_value": "Accurate road edge & berm detection",
            "limitation": "Signal attenuates in extreme cloudbursts",
            "input_volume": sensor_simulator.volumes["lidar_3d"],
            "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz("lidar_3d"),
            "firestore_collection": settings.COLL_LIDAR
        },
        {
            "sensor_id": "uwb_rf",
            "name": "UWB / RF Transceiver",
            "metric": "Coordinates & Range (+/- 10 cm)",
            "effective_range": "50–100 m",
            "weather_immunity": "Superior (Immune)",
            "key_value": "Non-line-of-sight (NLOS) V2V alerts",
            "limitation": "Detects only tag-equipped vehicles",
            "input_volume": sensor_simulator.volumes["uwb_rf"],
            "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz("uwb_rf"),
            "firestore_collection": settings.COLL_UWB
        },
        {
            "sensor_id": "rtk_gnss_imu",
            "name": "RTK-GNSS + IMU",
            "metric": "Geo-coordinates & Heading (6-DOF)",
            "effective_range": "Global",
            "weather_immunity": "Superior (Immune)",
            "key_value": "Overlay lane guidance on digital map",
            "limitation": "Requires prior site mapping & base station",
            "input_volume": sensor_simulator.volumes["rtk_gnss_imu"],
            "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz("rtk_gnss_imu"),
            "firestore_collection": settings.COLL_GNSS
        }
    ]
    return {"sensors": sensor_list}

@app.get("/api/sensors/{sensor_id}")
async def get_sensor_status(sensor_id: str):
    if sensor_id not in sensor_simulator.volumes:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    return {
        "sensor_id": sensor_id,
        "input_volume": sensor_simulator.volumes[sensor_id],
        "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz(sensor_id),
        "latest_reading": sensor_simulator.latest_readings.get(sensor_id)
    }

@app.post("/api/sensors/{sensor_id}/volume")
async def update_sensor_volume(sensor_id: str, req: VolumeUpdateRequest):
    if sensor_id not in sensor_simulator.volumes:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    await sensor_simulator.set_input_volume(sensor_id, req.input_volume)
    return {
        "sensor_id": sensor_id,
        "input_volume": req.input_volume,
        "sampling_rate_hz": sensor_simulator.get_sampling_rate_hz(sensor_id),
        "firestore_status": "synced",
        "persisted_to": f"{settings.COLL_SETTINGS}/{sensor_id}"
    }

@app.post("/api/sensors/volume/preset/{preset_name}")
async def apply_volume_preset(preset_name: str):
    presets = {
        "low": 15,
        "balanced": 35,
        "high": 65,
        "burst": 95
    }
    vol = presets.get(preset_name.lower(), 35)
    for sid in sensor_simulator.volumes.keys():
        await sensor_simulator.set_input_volume(sid, vol)
    
    return {
        "preset": preset_name,
        "applied_volume": vol,
        "volumes": sensor_simulator.volumes
    }

@app.get("/api/thermal/latest-frame")
async def get_thermal_frame():
    reading = sensor_simulator.latest_readings.get("thermal_camera", {})
    return {
        "frame_id": reading.get("frame_id"),
        "image_base64": reading.get("image_base64"),
        "image_url": reading.get("image_url"),
        "detections": reading.get("detections", []),
        "ambient_temp_c": reading.get("ambient_temp_c"),
        "max_detected_temp_c": reading.get("max_detected_temp_c")
    }

@app.get("/api/alerts")
async def get_alerts():
    return {"alerts": firebase_service.recent_alerts}

@app.get("/api/metrics")
async def get_system_metrics():
    active_hz_sum = sum(sensor_simulator.get_sampling_rate_hz(sid) for sid in sensor_simulator.volumes)
    return {
        "total_persisted_readings": firebase_service.total_persisted,
        "total_throughput_hz": round(active_hz_sum, 1),
        "volumes": sensor_simulator.volumes,
        "firebase_connected": firebase_service.is_connected,
        "is_recording": sensor_simulator.is_recording,
        "last_writes": firebase_service.last_write_times,
        "vehicle_speed_kmh": round(sensor_simulator.vehicle_speed_kmh, 1),
        "active_alerts_count": len([a for a in firebase_service.recent_alerts if a.get("severity") == "critical"])
    }

@app.websocket("/ws/live-stream")
async def live_stream_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue = sensor_simulator.subscribe()
    
    # Send initial state dump
    await websocket.send_json({
        "type": "initial_state",
        "volumes": sensor_simulator.volumes,
        "is_recording": sensor_simulator.is_recording,
        "latest_readings": sensor_simulator.latest_readings,
        "recent_alerts": firebase_service.recent_alerts
    })

    async def client_listener():
        """Handles incoming messages from client (e.g. volume updates or recording start/stop via WS)."""
        try:
            while True:
                msg = await websocket.receive_text()
                payload = json.loads(msg)
                action = payload.get("action")
                if action == "set_volume":
                    sensor_id = payload.get("sensor_id")
                    vol = int(payload.get("volume", 30))
                    await sensor_simulator.set_input_volume(sensor_id, vol)
                    await websocket.send_json({
                        "type": "volume_ack",
                        "sensor_id": sensor_id,
                        "volume": vol,
                        "rate_hz": sensor_simulator.get_sampling_rate_hz(sensor_id)
                    })
                elif action == "start_recording":
                    await sensor_simulator.start_recording()
                elif action == "stop_recording":
                    await sensor_simulator.stop_recording()
                elif action == "toggle_recording":
                    await sensor_simulator.toggle_recording()
        except Exception:
            pass

    listener_task = asyncio.create_task(client_listener())

    try:
        while True:
            # Drain queue and send to client
            data = await queue.get()
            await websocket.send_json(data)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        listener_task.cancel()
        sensor_simulator.unsubscribe(queue)
