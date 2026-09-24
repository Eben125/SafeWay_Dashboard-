// Firebase client configuration for safeway-d78b8
export const firebaseConfig = {
  projectId: "safeway-d78b8",
  authDomain: "safeway-d78b8.firebaseapp.com",
  storageBucket: "safeway-d78b8.firebasestorage.app"
};

export const COLLECTIONS = {
  VEHICLES: "vehicles",
  ALERTS: "alerts",
  SENSOR_SETTINGS: "sensor_settings",
  THERMAL_READINGS: "thermal_camera_readings",
  MMWAVE_READINGS: "mmwave_radar_readings",
  LIDAR_READINGS: "lidar_readings",
  UWB_READINGS: "uwb_rf_readings",
  GNSS_READINGS: "gnss_imu_readings"
};

export const db = {};
export const doc = () => ({});
export const setDoc = async () => {};
export const collection = () => ({});
export const addDoc = async () => {};
export const serverTimestamp = () => new Date();
