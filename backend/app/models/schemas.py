from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class VolumeUpdateRequest(BaseModel):
    sensor_id: str
    input_volume: int = Field(..., ge=1, le=100, description="Input Volume sampling level (1-100%)")

class SensorSetting(BaseModel):
    sensor_id: str
    name: str
    input_volume: int
    sampling_rate_hz: float
    is_active: bool = True
    last_updated: str

class DeviceMetadata(BaseModel):
    device_id: str
    sensor_type: str
    model: str
    fov_horizontal_deg: float
    effective_range_m: str
    weather_immunity: str
    spatial_resolution: str
    status: str = "nominal"
    firmware: str = "v2.4.1"

# --- 1. Thermal Camera (LWIR) Models ---
class DetectionBox(BaseModel):
    label: str
    confidence: float
    bbox: List[int]  # [x, y, width, height]
    temperature_c: float

class ThermalReading(BaseModel):
    reading_id: str
    timestamp: str
    sensor_id: str = "thermal_camera"
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    frame_id: int
    effective_range_m: str = "30-50 m"
    ambient_temp_c: float
    max_detected_temp_c: float
    detections: List[DetectionBox] = []
    target_count: int
    input_volume: int
    fps: float
    notes: str = "Intuitive visual display for driver; lacks direct distance measurement"

# --- 2. mmWave Radar (77 GHz) Models ---
class RadarTarget(BaseModel):
    target_id: int
    distance_m: float
    speed_kmh: float
    azimuth_deg: float
    rcs_dbm: float
    range_rate_mps: float
    approach_warning: bool

class RadarReading(BaseModel):
    reading_id: str
    timestamp: str
    sensor_id: str = "mmwave_radar"
    frequency_ghz: float = 77.0
    effective_range_m: str = "100-200 m"
    weather_immunity_rating: str = "Superior (Immune)"
    penetrates_fog_rain_mud: bool = True
    spatial_resolution_note: str = "Low spatial resolution (cannot render shape)"
    targets: List[RadarTarget] = []
    closest_distance_m: Optional[float] = None
    fastest_speed_kmh: Optional[float] = None
    input_volume: int

# --- 3. 3D LiDAR (1550 nm) Models ---
class LidarPoint(BaseModel):
    x: float
    y: float
    z: float
    intensity: float
    classification: str  # "road", "edge", "berm", "obstacle"

class LidarReading(BaseModel):
    reading_id: str
    timestamp: str
    sensor_id: str = "lidar_3d"
    wavelength_nm: int = 1550
    effective_range_m: str = "50-100 m"
    point_count: int
    road_edge_detected: bool = True
    berm_detected: bool = True
    cloudburst_attenuation_pct: float
    signal_quality_rating: str  # "Nominal (95%)", "Moderate Rain (72%)", etc.
    points_sample: List[LidarPoint] = []
    input_volume: int

# --- 4. UWB / RF Transceiver Models ---
class UwbTag(BaseModel):
    tag_id: str
    vehicle_type: str
    rel_x_m: float
    rel_y_m: float
    distance_m: float
    nlos_status: bool  # True if Non-Line-Of-Sight (behind obstacle)
    v2v_alert: bool
    rssi_dbm: float

class UwbReading(BaseModel):
    reading_id: str
    timestamp: str
    sensor_id: str = "uwb_rf"
    effective_range_m: str = "50-100 m"
    ranging_precision_cm: float = 10.0
    weather_immunity: str = "Superior (Immune)"
    v2v_protocol: str = "IEEE 802.15.4z"
    tags: List[UwbTag] = []
    nlos_collision_risk: bool
    active_tags_count: int
    input_volume: int

# --- 5. RTK-GNSS + IMU Models ---
class ImuData(BaseModel):
    pitch_deg: float
    roll_deg: float
    yaw_deg: float
    accel_x_g: float
    accel_y_g: float
    accel_z_g: float

class GnssImuReading(BaseModel):
    reading_id: str
    timestamp: str
    sensor_id: str = "rtk_gnss_imu"
    latitude: float
    longitude: float
    altitude_m: float
    heading_deg: float
    speed_kmh: float
    rtk_status: str  # "FIXED", "FLOAT", "SINGLE"
    satellites_count: int
    hdop: float
    lane_guidance_offset_m: float
    imu: ImuData
    site_mapping_status: str = "Base Station Linked"
    input_volume: int

# --- Fused Cross-Sensor Alert ---
class SafetyAlert(BaseModel):
    alert_id: str
    timestamp: str
    severity: str  # "critical", "warning", "info"
    title: str
    description: str
    trigger_sensor: str
    corroborating_sensor: Optional[str] = None
    action_required: str
