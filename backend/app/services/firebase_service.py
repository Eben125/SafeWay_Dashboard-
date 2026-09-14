import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from ..config import settings

logger = logging.getLogger("safeway.firebase")
logger.setLevel(logging.INFO)

class FirebaseService:
    """
    Handles Firestore and Firebase Storage integration for SafeWay Sensor Dashboard.
    Persists sensor readings into designated Firestore collections:
      - sensor_settings
      - devices
      - thermal_camera_readings
      - mmwave_radar_readings
      - lidar_readings
      - uwb_rf_readings
      - gnss_imu_readings
      - alerts
      - system_metrics
    """
    def __init__(self):
        self.project_id = settings.FIREBASE.project_id
        self.api_key = settings.FIREBASE.api_key
        self.base_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents"
        self.storage_bucket = settings.FIREBASE.storage_bucket
        self.client: Optional[httpx.AsyncClient] = None
        
        # In-memory metrics & buffer
        self.total_persisted: int = 0
        self.total_attempts: int = 0
        self.last_write_times: Dict[str, str] = {}
        self.is_connected: bool = True
        self.recent_alerts: List[Dict[str, Any]] = []

    async def init(self):
        """Initializes the HTTP client connection."""
        if self.client is None or self.client.is_closed:
            self.client = httpx.AsyncClient(timeout=6.0)
        # Register default device calibration metadata in Firestore
        await self._seed_device_registry()

    async def close(self):
        if self.client and not self.client.is_closed:
            await self.client.aclose()

    def _py_to_firestore(self, value: Any) -> Dict[str, Any]:
        """Converts native Python objects into Firestore REST API typed values."""
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
        elif isinstance(value, datetime):
            return {"timestampValue": value.isoformat()}
        elif isinstance(value, list):
            return {"arrayValue": {"values": [self._py_to_firestore(v) for v in value]}}
        elif isinstance(value, dict):
            fields = {k: self._py_to_firestore(v) for k, v in value.items()}
            return {"mapValue": {"fields": fields}}
        else:
            return {"stringValue": str(value)}

    async def persist_reading(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Persists a sensor reading document into Firestore."""
        self.total_attempts += 1
        now_str = datetime.now(timezone.utc).isoformat()
        data["stored_at"] = now_str
        self.last_write_times[collection_name] = now_str
        
        # Fire-and-forget or background HTTP call to prevent blocking simulation
        asyncio.create_task(self._send_firestore_doc(collection_name, doc_id, data))
        self.total_persisted += 1
        return True

    async def _send_firestore_doc(self, collection_name: str, doc_id: str, data: Dict[str, Any]):
        """Executes the Firestore REST API call."""
        if self.client is None:
            await self.init()
            
        url = f"{self.base_url}/{collection_name}?documentId={doc_id}&key={self.api_key}"
        fields = {k: self._py_to_firestore(v) for k, v in data.items() if k != "image_base64"} # keep doc compact
        payload = {"fields": fields}
        
        try:
            resp = await self.client.post(url, json=payload)
            if resp.status_code in [200, 201]:
                self.is_connected = True
            elif resp.status_code == 409:
                # Document already exists; update via PATCH
                patch_url = f"{self.base_url}/{collection_name}/{doc_id}?key={self.api_key}"
                await self.client.patch(patch_url, json=payload)
            else:
                # If project rules reject public unauthenticated writes or offline, log warning
                logger.debug(f"Firestore status {resp.status_code} for {collection_name}: {resp.text[:100]}")
        except Exception as e:
            logger.debug(f"Firebase write transient notice: {e}")

    async def update_sensor_volume(self, sensor_id: str, volume: int, rate_hz: float):
        """Persists updated input volume level to Firestore sensor_settings and devices."""
        doc_data = {
            "sensor_id": sensor_id,
            "input_volume": volume,
            "sampling_rate_hz": rate_hz,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        }
        await self.persist_reading(settings.COLL_SETTINGS, sensor_id, doc_data)

    async def log_alert(self, alert_data: Dict[str, Any]):
        """Persists safety alert to Firestore and keeps local buffer."""
        self.recent_alerts.insert(0, alert_data)
        if len(self.recent_alerts) > 20:
            self.recent_alerts.pop()
        await self.persist_reading(settings.COLL_ALERTS, alert_data.get("alert_id", "alert"), alert_data)

    async def _seed_device_registry(self):
        """Initializes device specifications in the devices collection."""
        devices = [
            {
                "device_id": "LWIR-CAM-01",
                "sensor_id": "thermal_camera",
                "sensor_type": "Thermal Infrared (LWIR) Camera",
                "model": "FLIR Boson 640 LWIR Long-Wave",
                "fov_horizontal_deg": 50.0,
                "effective_range_m": "30-50 m",
                "weather_immunity": "High (Penetrates darkness, light dust & mist)",
                "spatial_resolution": "640x512 Uncooled VOx Microbolometer",
                "status": "nominal"
            },
            {
                "device_id": "RADAR-77G-01",
                "sensor_id": "mmwave_radar",
                "sensor_type": "77 GHz mmWave Radar",
                "model": "Texas Instruments AWR2243 Cascade",
                "fov_horizontal_deg": 120.0,
                "effective_range_m": "100-200 m",
                "weather_immunity": "Superior (Immune to dense fog, rain, mud)",
                "spatial_resolution": "Low (Point targets & Doppler velocity vectors)",
                "status": "nominal"
            },
            {
                "device_id": "LIDAR-1550-01",
                "sensor_id": "lidar_3d",
                "sensor_type": "1550 nm 3D LiDAR",
                "model": "Luminar Iris Eye-Safe 1550nm Laser",
                "fov_horizontal_deg": 120.0,
                "effective_range_m": "50-100 m",
                "weather_immunity": "Moderate (Requires multi-echo; cloudburst attenuation)",
                "spatial_resolution": "Ultra-High (Millions of 3D points/sec for road edge & berm)",
                "status": "nominal"
            },
            {
                "device_id": "UWB-V2V-01",
                "sensor_id": "uwb_rf",
                "sensor_type": "UWB / RF Transceiver",
                "model": "Decawave DW3000 UWB 802.15.4z",
                "fov_horizontal_deg": 360.0,
                "effective_range_m": "50-100 m",
                "weather_immunity": "Superior (Immune to atmospheric conditions)",
                "spatial_resolution": "High Ranging Accuracy (+/- 10 cm, NLOS V2V Alerts)",
                "status": "nominal"
            },
            {
                "device_id": "GNSS-RTK-01",
                "sensor_id": "rtk_gnss_imu",
                "sensor_type": "RTK-GNSS + 6-DOF IMU",
                "model": "u-blox ZED-F9P Multi-Band GNSS + Bosch BMI088 IMU",
                "fov_horizontal_deg": 360.0,
                "effective_range_m": "Global",
                "weather_immunity": "Superior (Immune; requires base station / prior site map)",
                "spatial_resolution": "Centimeter-level lane guidance with IMU dead reckoning",
                "status": "nominal"
            }
        ]
        for dev in devices:
            asyncio.create_task(self.persist_reading(settings.COLL_DEVICES, dev["device_id"], dev))

firebase_service = FirebaseService()
