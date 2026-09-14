import os
from pydantic import BaseModel

class FirebaseConfig(BaseModel):
    project_id: str = "safeway-d78b8"
    api_key: str = "AIzaSyCPnErU9gGcoLkUL-JL-XEDN5XoiwRJEsU"
    auth_domain: str = "safeway-d78b8.firebaseapp.com"
    storage_bucket: str = "safeway-d78b8.firebasestorage.app"
    messaging_sender_id: str = "927967385963"
    app_id: str = "1:927967385963:web:410667e7e7f4378baa542e"
    measurement_id: str = "G-SHQC5G722R"

class Settings:
    PROJECT_NAME: str = "SafeWay Sensor Dashboard Backend"
    VERSION: str = "1.0.0"
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))
    
    FIREBASE: FirebaseConfig = FirebaseConfig()
    
    # Firestore Collection Names as requested
    COLL_SETTINGS: str = "sensor_settings"
    COLL_DEVICES: str = "devices"
    COLL_THERMAL: str = "thermal_camera_readings"
    COLL_RADAR: str = "mmwave_radar_readings"
    COLL_LIDAR: str = "lidar_readings"
    COLL_UWB: str = "uwb_rf_readings"
    COLL_GNSS: str = "gnss_imu_readings"
    COLL_ALERTS: str = "alerts"
    COLL_METRICS: str = "system_metrics"
    
    # Default input volume settings (percentage 1 to 100)
    DEFAULT_VOLUMES: dict[str, int] = {
        "thermal_camera": 25,
        "mmwave_radar": 35,
        "lidar_3d": 30,
        "uwb_rf": 20,
        "rtk_gnss_imu": 25
    }

settings = Settings()
