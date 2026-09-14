import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCPnErU9gGcoLkUL-JL-XEDN5XoiwRJEsU",
  authDomain: "safeway-d78b8.firebaseapp.com",
  projectId: "safeway-d78b8",
  storageBucket: "safeway-d78b8.firebasestorage.app",
  messagingSenderId: "927967385963",
  appId: "1:927967385963:web:410667e7e7f4378baa542e",
  measurementId: "G-SHQC5G722R"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);

// The 5 Firestore Collections required for SafeWay Fleet Management
export const COLLECTIONS = {
  VEHICLES: "vehicles",
  SENSOR_READINGS: "sensor_readings",
  THERMAL_FRAMES: "thermalFrames",
  AI_DETECTIONS: "aiDetections",
  USER_SETTINGS: "userSettings"
};
