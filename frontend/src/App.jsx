import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/layout/Header';
import NavigationTabs from './components/layout/NavigationTabs';
import TopSummaryView from './components/layout/TopSummaryView';
import ThermalCameraPanel from './components/sensors/ThermalCameraPanel';
import MmWaveRadarPanel from './components/sensors/MmWaveRadarPanel';
import Lidar3DPanel from './components/sensors/Lidar3DPanel';
import UwbTransceiverPanel from './components/sensors/UwbTransceiverPanel';
import GnssImuPanel from './components/sensors/GnssImuPanel';

import { 
  connectLiveStream, 
  fetchSensors, 
  fetchHealth, 
  fetchMetrics, 
  fetchAlerts,
  fetchRecordingStatus,
  startRecording,
  stopRecording,
  updateSensorVolume 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [volumes, setVolumes] = useState({
    thermal_camera: 25,
    mmwave_radar: 35,
    lidar_3d: 30,
    uwb_rf: 20,
    rtk_gnss_imu: 25
  });
  const [latestReadings, setLatestReadings] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [totalPersisted, setTotalPersisted] = useState(0);
  const [throughputHz, setThroughputHz] = useState(62.5);
  const [activePreset, setActivePreset] = useState('balanced');

  // Initial load from REST endpoints
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [sensorData, healthData, metricsData, alertData, recData] = await Promise.all([
          fetchSensors(),
          fetchHealth(),
          fetchMetrics(),
          fetchAlerts(),
          fetchRecordingStatus()
        ]);

        if (sensorData?.sensors?.length > 0) {
          setSensors(sensorData.sensors);
          const initialVols = {};
          sensorData.sensors.forEach(s => {
            initialVols[s.sensor_id] = s.input_volume;
          });
          setVolumes(prev => ({ ...prev, ...initialVols }));
        }

        if (healthData?.total_persisted_readings !== undefined) {
          setTotalPersisted(healthData.total_persisted_readings);
        }

        if (recData?.is_recording !== undefined) {
          setIsRecording(recData.is_recording);
        } else if (healthData?.is_recording !== undefined) {
          setIsRecording(healthData.is_recording);
        }

        if (metricsData?.total_throughput_hz) {
          setThroughputHz(metricsData.total_throughput_hz);
        }

        if (alertData?.alerts) {
          setAlerts(alertData.alerts);
        }
      } catch (err) {
        console.warn("Initial data load error:", err);
      }
    }
    loadInitialData();
  }, []);

  // Connect to live WebSocket stream
  useEffect(() => {
    const stream = connectLiveStream(
      (message) => {
        if (message.type === 'initial_state') {
          if (message.volumes) setVolumes(message.volumes);
          if (message.is_recording !== undefined) setIsRecording(message.is_recording);
          if (message.latest_readings) setLatestReadings(message.latest_readings);
          if (message.recent_alerts) setAlerts(message.recent_alerts);
        } else if (message.type === 'recording_state') {
          setIsRecording(message.is_recording);
        } else if (message.type === 'sensor_update') {
          setLatestReadings(prev => ({
            ...prev,
            [message.sensor_id]: message.data
          }));
          if (message.is_recording) {
            setTotalPersisted(prev => prev + 1);
          }
        } else if (message.type === 'alert') {
          setAlerts(prev => [message.data, ...prev.slice(0, 15)]);
        }
      },
      (status) => {
        setIsConnected(status.isConnected);
      }
    );

    return () => stream.disconnect();
  }, []);

  const handleStartRecording = async () => {
    setIsRecording(true);
    await startRecording();
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    await stopRecording();
  };

  // Handle Input Volume changes from any slider
  const handleVolumeChange = useCallback(async (sensorId, newVol) => {
    setVolumes(prev => {
      const updated = { ...prev, [sensorId]: newVol };
      // Recalculate combined throughput
      const sumHz = Object.values(updated).reduce((acc, v) => acc + (1.0 + (v - 1) * 0.394), 0);
      setThroughputHz(parseFloat(sumHz.toFixed(1)));
      return updated;
    });

    await updateSensorVolume(sensorId, newVol);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      {/* Top Application Header */}
      <Header
        isConnected={isConnected}
        totalPersisted={totalPersisted}
        throughputHz={throughputHz}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />

      {/* Sticky Sensor Navigation Bar */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        volumes={volumes}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <TopSummaryView
            sensors={sensors}
            volumes={volumes}
            latestReadings={latestReadings}
            totalPersisted={totalPersisted}
            throughputHz={throughputHz}
            alerts={alerts}
            onSelectSensor={setActiveTab}
            onVolumeChange={handleVolumeChange}
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        {activeTab === 'thermal_camera' && (
          <ThermalCameraPanel
            reading={latestReadings['thermal_camera']}
            volume={volumes['thermal_camera']}
            onVolumeChange={(val) => handleVolumeChange('thermal_camera', val)}
          />
        )}

        {activeTab === 'mmwave_radar' && (
          <MmWaveRadarPanel
            reading={latestReadings['mmwave_radar']}
            volume={volumes['mmwave_radar']}
            onVolumeChange={(val) => handleVolumeChange('mmwave_radar', val)}
          />
        )}

        {activeTab === 'lidar_3d' && (
          <Lidar3DPanel
            reading={latestReadings['lidar_3d']}
            volume={volumes['lidar_3d']}
            onVolumeChange={(val) => handleVolumeChange('lidar_3d', val)}
          />
        )}

        {activeTab === 'uwb_rf' && (
          <UwbTransceiverPanel
            reading={latestReadings['uwb_rf']}
            volume={volumes['uwb_rf']}
            onVolumeChange={(val) => handleVolumeChange('uwb_rf', val)}
          />
        )}

        {activeTab === 'rtk_gnss_imu' && (
          <GnssImuPanel
            reading={latestReadings['rtk_gnss_imu']}
            volume={volumes['rtk_gnss_imu']}
            onVolumeChange={(val) => handleVolumeChange('rtk_gnss_imu', val)}
          />
        )}
      </main>

      {/* Clean Light-Themed Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-6 px-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">SafeWay Sensor Dashboard</span>
            <span>•</span>
            <span>SIH26007 Vehicle Safety Systems</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">Firebase: safeway-d78b8</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Python Engine</span>
            <span>•</span>
            <span>Three.js WebGL Point Cloud</span>
            <span>•</span>
            <span>Leaflet RTK Map</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
