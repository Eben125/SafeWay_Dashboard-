import { db, COLLECTIONS } from "../config/firebase";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

const API_BASE = window.location.origin.includes("5173") 
  ? "http://127.0.0.1:8000" 
  : window.location.origin;

const WS_BASE = window.location.origin.includes("5173")
  ? "ws://127.0.0.1:8000/ws/live-stream"
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/live-stream`;

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return await res.json();
  } catch (err) {
    console.warn("Backend health check fallback:", err);
    return { status: "offline", service: "SafeWay", total_persisted_readings: 0 };
  }
}

export async function fetchSensors() {
  try {
    const res = await fetch(`${API_BASE}/api/sensors`);
    return await res.json();
  } catch (err) {
    console.warn("Backend fetchSensors fallback:", err);
    return { sensors: [] };
  }
}

export async function fetchMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/metrics`);
    return await res.json();
  } catch (err) {
    return { total_persisted_readings: 0, total_throughput_hz: 0, volumes: {} };
  }
}

export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    return await res.json();
  } catch (err) {
    return { alerts: [] };
  }
}

export async function fetchRecordingStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/recording/status`);
    return await res.json();
  } catch (err) {
    return { is_recording: false };
  }
}

export async function startRecording() {
  try {
    const res = await fetch(`${API_BASE}/api/recording/start`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.warn("Start recording failed:", err);
    return { is_recording: true };
  }
}

export async function stopRecording() {
  try {
    const res = await fetch(`${API_BASE}/api/recording/stop`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.warn("Stop recording failed:", err);
    return { is_recording: false };
  }
}

export async function toggleRecording() {
  try {
    const res = await fetch(`${API_BASE}/api/recording/toggle`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.warn("Toggle recording failed:", err);
    return null;
  }
}

export async function updateSensorVolume(sensorId, volume) {
  // 1. Update Python backend
  try {
    await fetch(`${API_BASE}/api/sensors/${sensorId}/volume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensor_id: sensorId, input_volume: parseInt(volume, 10) })
    });
  } catch (err) {
    console.warn("Backend volume update failed:", err);
  }

  // 2. Direct Firestore persistence via Firebase Web SDK
  try {
    const settingRef = doc(db, COLLECTIONS.SENSOR_SETTINGS, sensorId);
    await setDoc(settingRef, {
      sensor_id: sensorId,
      input_volume: parseInt(volume, 10),
      sampling_rate_hz: parseFloat((1.0 + (volume - 1) * 0.394).toFixed(1)),
      updated_at: new Date().toISOString(),
      firestore_timestamp: serverTimestamp()
    }, { merge: true });
  } catch (firestoreErr) {
    // Graceful fallback if Firestore rules restrict direct client writes
    console.debug("Client-side direct Firestore write notice:", firestoreErr.message);
  }
}

export async function applyVolumePreset(preset) {
  try {
    const res = await fetch(`${API_BASE}/api/sensors/volume/preset/${preset}`, {
      method: "POST"
    });
    return await res.json();
  } catch (err) {
    console.warn("Apply preset failed:", err);
  }
}

/**
 * Connects to live WebSocket stream from FastAPI backend.
 * Provides onMessage callback with sensor readings and alerts.
 */
export function connectLiveStream(onMessage, onStatusChange) {
  let ws = null;
  let shouldReconnect = true;
  let reconnectTimeout = null;

  function connect() {
    try {
      ws = new WebSocket(WS_BASE);
      
      ws.onopen = () => {
        onStatusChange?.({ isConnected: true, connecting: false });
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          onMessage(payload);
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        onStatusChange?.({ isConnected: false, connecting: true });
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      onStatusChange?.({ isConnected: false, connecting: true });
      if (shouldReconnect) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return {
    sendVolume: (sensorId, volume) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "set_volume", sensor_id: sensorId, volume: parseInt(volume, 10) }));
      }
    },
    disconnect: () => {
      shouldReconnect = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    }
  };
}
