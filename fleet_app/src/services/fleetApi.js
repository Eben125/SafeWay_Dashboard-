
import { simulator } from './simulationEngine';

export async function fetchBridgeHealth() {
  return { status: "online", active_fleet_count: simulator.vehicles.length };
}

export async function fetchVehicles() {
  return { vehicles: simulator.vehicles };
}

export async function registerVehicle(data) {
  const newV = {
    vehicle_id: data.vehicle_id || ("HV-TRUCK-" + Math.floor(Math.random() * 800 + 100)),
    driver_name: data.driver_name || "New Driver",
    vehicle_type: data.vehicle_type || "Haul Dump Truck (60T)",
    username: "driver_" + (data.vehicle_id || "new").toLowerCase().replace(/[^a-z0-9]/g, ""),
    password: "Safe#" + Math.floor(Math.random() * 900 + 100),
    assigned_mine_zone: data.zone || "Pit Sector A",
    status: "active",
    safety_status: "safe",
    front_distance_m: 65.0,
    closest_proximity_m: 62.0,
    speed_kmh: 42.0,
    heading_deg: 85.0,
    latitude: 11.0165 + (Math.random() - 0.5) * 0.003,
    longitude: 76.9555 + (Math.random() - 0.5) * 0.003
  };
  simulator.vehicles.push(newV);
  return { vehicle: newV };
}

export async function deleteVehicle(vehicleId) {
  simulator.vehicles = simulator.vehicles.filter(v => v.vehicle_id !== vehicleId);
  return { success: true };
}

export async function triggerSuddenStop(durationSec = 12) {
  simulator.triggerSuddenStop(durationSec);
  return { status: "triggered", duration_sec: durationSec };
}

export async function fetchVehicleTelemetry(vehicleId) {
  const v = simulator.vehicles.find(item => item.vehicle_id === vehicleId) || simulator.vehicles[0];
  return {
    vehicle_id: v.vehicle_id,
    telemetry: {
      radar: {
        distance_m: v.closest_proximity_m || 42.0,
        relative_speed_kmh: -1.2,
        target: "Forward Vehicle"
      },
      thermal: {
        max_temp_c: 48.5,
        min_temp_c: 24.1,
        avg_temp_c: 32.4,
        hot_spot_detected: false
      },
      lidar: {
        closest_cluster_distance_m: 39.8,
        cluster_count: 8,
        safety_zone_clear: v.safety_status !== "alert"
      },
      uwb: {
        peer_id: "HV-TRUCK-101",
        ranging_distance_m: v.closest_proximity_m || 42.0,
        link_quality: 95
      },
      gnss: {
        latitude: v.latitude,
        longitude: v.longitude,
        speed_kmh: v.speed_kmh,
        heading_deg: v.heading_deg,
        fix_type: "RTK_FIX (cm-accuracy)"
      }
    }
  };
}

export async function fetchAlerts() {
  return { alerts: simulator.generateSnapshot().alerts };
}

export function connectFleetStream(onMessage, onStatusChange) {
  onStatusChange?.({ isConnected: true });
  const unsub = simulator.subscribeFleet(onMessage);
  return {
    disconnect: () => unsub()
  };
}
