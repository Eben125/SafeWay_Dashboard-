
import { simulator } from './simulationEngine';

export async function fetchHealth() {
  return { status: "online", service: "SafeWay", total_persisted_readings: simulator.totalPersisted };
}

export async function fetchSensors() {
  return {
    sensors: [
      { id: "thermal_camera", name: "Thermal Camera (LWIR)", range: "30-50m" },
      { id: "mmwave_radar", name: "77 GHz mmWave Radar", range: "100-200m" },
      { id: "lidar_3d", name: "1550 nm 3D LiDAR", range: "50-100m" },
      { id: "uwb_rf", name: "UWB / RF Transceiver", range: "50-100m" },
      { id: "rtk_gnss_imu", name: "RTK-GNSS + IMU", range: "Global" }
    ]
  };
}

export async function fetchMetrics() {
  return {
    total_persisted_readings: simulator.totalPersisted,
    total_throughput_hz: simulator.getThroughputHz(),
    volumes: { ...simulator.volumes }
  };
}

export async function fetchAlerts() {
  return { alerts: simulator.generateSnapshot().alerts };
}

export async function fetchRecordingStatus() {
  return { is_recording: simulator.isRecording };
}

export async function startRecording() {
  simulator.startRecording();
  return { is_recording: true };
}

export async function stopRecording() {
  simulator.stopRecording();
  return { is_recording: false };
}

export async function toggleRecording() {
  if (simulator.isRecording) simulator.stopRecording();
  else simulator.startRecording();
  return { is_recording: simulator.isRecording };
}

export async function updateSensorVolume(sensorId, volume) {
  simulator.setVolume(sensorId, volume);
}

export async function applyVolumePreset(preset) {
  simulator.setPreset(preset);
  return { success: true, preset };
}

export function connectLiveStream(onMessage, onStatusChange) {
  onStatusChange?.({ isConnected: true, connecting: false });
  const unsub = simulator.subscribe(onMessage);
  return {
    sendVolume: (sensorId, volume) => simulator.setVolume(sensorId, volume),
    disconnect: () => unsub()
  };
}
