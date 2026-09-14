import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

/**
 * SafeWay Sensor Dashboard — Firebase Configuration (Project: safeway-d78b8)
 * Configured in a single centralized module for clear governance and easy updates.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCPnErU9gGcoLkUL-JL-XEDN5XoiwRJEsU",
  authDomain: "safeway-d78b8.firebaseapp.com",
  projectId: "safeway-d78b8",
  storageBucket: "safeway-d78b8.firebasestorage.app",
  messagingSenderId: "927967385963",
  appId: "1:927967385963:web:410667e7e7f4378baa542e",
  measurementId: "G-SHQC5G722R"
};

// Initialize Firebase App instance safely (singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Analytics if supported in this environment
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics is optional, silently fallback
  });
}

// Firestore Collection Names constants
export const COLLECTIONS = {
  SENSOR_SETTINGS: "sensor_settings",
  DEVICES: "devices",
  THERMAL_CAMERA: "thermal_camera_readings",
  MMWAVE_RADAR: "mmwave_radar_readings",
  LIDAR: "lidar_readings",
  UWB_RF: "uwb_rf_readings",
  GNSS_IMU: "gnss_imu_readings",
  ALERTS: "alerts",
  SYSTEM_METRICS: "system_metrics"
};
