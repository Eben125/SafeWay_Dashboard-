
import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import NavigationTabs from './components/layout/NavigationTabs';
import TopSummaryView from './components/layout/TopSummaryView';
import DriverDashboard from './components/driver/DriverDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import ThermalCameraPanel from './components/sensors/ThermalCameraPanel';
import MmWaveRadarPanel from './components/sensors/MmWaveRadarPanel';
import Lidar3DPanel from './components/sensors/Lidar3DPanel';
import UwbTransceiverPanel from './components/sensors/UwbTransceiverPanel';
import GnssImuPanel from './components/sensors/GnssImuPanel';
import LoginModal from './components/auth/LoginModal';
import { RoleProvider, useRole } from './components/auth/RoleContext';
import { connectLiveStream, updateSensorVolume, startRecording, stopRecording } from './services/api';
import { fetchVehicles, fetchAlerts } from './services/fleetApi';

function SafeWayApp() {
  const { currentUser, isAdmin, isDriver } = useRole();

  useEffect(() => {
    if (isDriver && activeTab === 'fleet_admin') {
      setActiveTab('driver_cockpit');
    }
  }, [isDriver, activeTab]);
  const [activeTab, setActiveTab] = useState('driver_cockpit');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchVehicles().then(res => {
      if (res?.vehicles) setVehicles(res.vehicles);
    });

    const stream = connectLiveStream(
      (data) => {
        setSnapshot(data);
        if (data.alerts) setAlerts(data.alerts);
      },
      (status) => {}
    );

    return () => stream.disconnect();
  }, []);

  const handleVolumeChange = async (sensorId, newVol) => {
    await updateSensorVolume(sensorId, newVol);
  };

  const handleStartRec = async () => {
    await startRecording();
  };

  const handleStopRec = async () => {
    await stopRecording();
  };

  const isRec = snapshot?.isRecording ?? false;
  const totalPersisted = snapshot?.totalPersisted ?? 1420;
  const throughputHz = snapshot?.throughputHz ?? 62.5;
  const activePreset = snapshot?.activePreset ?? 'balanced';
  const volumes = snapshot?.volumes ?? {
    thermal_camera: 35,
    mmwave_radar: 45,
    lidar_3d: 50,
    uwb_rf: 25,
    rtk_gnss_imu: 30
  };
  const readings = snapshot?.readings ?? {};

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-900">
      {/* Unified Header */}
      <Header
        isConnected={true}
        totalPersisted={totalPersisted}
        throughputHz={throughputHz}
        activePreset={activePreset}
        onPresetChange={(preset) => {}}
        isRecording={isRec}
        onStartRecording={handleStartRec}
        onStopRecording={handleStopRec}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
        volumes={volumes}
        isDriver={isDriver || currentUser?.role === 'driver'}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'driver_cockpit' && (
          <DriverDashboard
            currentUser={currentUser}
            vehicles={vehicles}
            alerts={alerts}
            isWsConnected={true}
          />
        )}

        {activeTab === 'fleet_admin' && (
          <AdminDashboard
            vehicles={vehicles}
            alerts={alerts}
            isWsConnected={true}
            onRefresh={() => fetchVehicles().then(r => r?.vehicles && setVehicles(r.vehicles))}
            onVehicleAdded={(newV) => setVehicles(prev => [...prev.filter(v => v.vehicle_id !== newV.vehicle_id), newV])}
            onVehicleDeleted={(vid) => setVehicles(prev => prev.filter(v => v.vehicle_id !== vid))}
          />
        )}

        {activeTab === 'overview' && (
          <TopSummaryView
            volumes={volumes}
            latestReadings={readings}
            totalPersisted={totalPersisted}
            throughputHz={throughputHz}
            alerts={alerts}
            onSelectSensor={(sensorId) => setActiveTab(sensorId)}
            onVolumeChange={handleVolumeChange}
            isRecording={isRec}
            onStartRecording={handleStartRec}
            onStopRecording={handleStopRec}
          />
        )}

        {activeTab === 'thermal_camera' && (
          <ThermalCameraPanel
            reading={readings.thermal_camera}
            volume={volumes.thermal_camera}
            onVolumeChange={(val) => handleVolumeChange('thermal_camera', val)}
          />
        )}

        {activeTab === 'mmwave_radar' && (
          <MmWaveRadarPanel
            reading={readings.mmwave_radar}
            volume={volumes.mmwave_radar}
            onVolumeChange={(val) => handleVolumeChange('mmwave_radar', val)}
          />
        )}

        {activeTab === 'lidar_3d' && (
          <Lidar3DPanel
            reading={readings.lidar_3d}
            volume={volumes.lidar_3d}
            onVolumeChange={(val) => handleVolumeChange('lidar_3d', val)}
          />
        )}

        {activeTab === 'uwb_rf' && (
          <UwbTransceiverPanel
            reading={readings.uwb_rf}
            volume={volumes.uwb_rf}
            onVolumeChange={(val) => handleVolumeChange('uwb_rf', val)}
          />
        )}

        {activeTab === 'rtk_gnss_imu' && (
          <GnssImuPanel
            reading={readings.rtk_gnss_imu}
            volume={volumes.rtk_gnss_imu}
            onVolumeChange={(val) => handleVolumeChange('rtk_gnss_imu', val)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-400">
        <p>
          SafeWay Fleet Management System • Smart India Hackathon SIH26007 • Firebase Firestore & MapTiler Integration
        </p>
      </footer>

      {/* Login / Role Switching Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <SafeWayApp />
    </RoleProvider>
  );
}
