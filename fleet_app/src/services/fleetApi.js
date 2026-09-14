// Professional Cloud Setup: Read the public Bridge URL from environment variables
// Fallback to local testing URLs if no env var is provided
const BRIDGE_BASE = import.meta.env.VITE_BRIDGE_URL || (window.location.origin.includes("5174")
  ? "http://127.0.0.1:8001"
  : window.location.origin);

// WebSocket URL automatically derives from the Bridge Base
const WS_BASE = import.meta.env.VITE_BRIDGE_URL 
  ? import.meta.env.VITE_BRIDGE_URL.replace("http", "ws") + "/ws/fleet-live"
  : (window.location.origin.includes("5174")
      ? "ws://127.0.0.1:8001/ws/fleet-live"
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/fleet-live`);

export async function fetchBridgeHealth() {
  try {
    const res = await fetch(`${BRIDGE_BASE}/api/bridge/health`);
    return await res.json();
  } catch (e) {
    return { status: "connecting", active_fleet_count: 5 };
  }
}

export async function fetchVehicles() {
  try {
    const res = await fetch(`${BRIDGE_BASE}/api/bridge/vehicles`);
    return await res.json();
  } catch (e) {
    return { vehicles: [] };
  }
}

export async function registerVehicle(data) {
  const res = await fetch(`${BRIDGE_BASE}/api/bridge/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function deleteVehicle(vehicleId) {
  const res = await fetch(`${BRIDGE_BASE}/api/bridge/vehicles/${vehicleId}`, {
    method: "DELETE"
  });
  return await res.json();
}

export async function triggerSuddenStop(durationSec = 12) {
  const res = await fetch(`${BRIDGE_BASE}/api/bridge/simulate-sudden-stop?duration_sec=${durationSec}`, {
    method: "POST"
  });
  return await res.json();
}

export async function fetchVehicleTelemetry(vehicleId) {
  try {
    const res = await fetch(`${BRIDGE_BASE}/api/bridge/sensor-readings/${vehicleId}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function fetchAlerts() {
  try {
    const res = await fetch(`${BRIDGE_BASE}/api/bridge/alerts`);
    return await res.json();
  } catch (e) {
    return { alerts: [] };
  }
}

/**
 * Real-time WebSocket connection to the Sensor Bridge
 */
export function connectFleetStream(onMessage, onStatusChange) {
  let ws = null;
  let shouldReconnect = true;
  let retryTimer = null;

  function connect() {
    try {
      ws = new WebSocket(WS_BASE);
      ws.onopen = () => onStatusChange?.({ isConnected: true });
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          onMessage(payload);
        } catch (err) {
          console.error("WS Parse error:", err);
        }
      };
      ws.onclose = () => {
        onStatusChange?.({ isConnected: false });
        if (shouldReconnect) retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    } catch (e) {
      onStatusChange?.({ isConnected: false });
      if (shouldReconnect) retryTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return {
    disconnect: () => {
      shouldReconnect = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) ws.close();
    }
  };
}
