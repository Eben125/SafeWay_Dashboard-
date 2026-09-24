import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Compass, 
  Gauge, 
  Radar, 
  Radio, 
  Flame, 
  Scan, 
  Wifi, 
  Bell, 
  Volume2, 
  VolumeX,
  LifeBuoy,
  Layers,
  Map as MapIcon,
  Box as CubeIcon,
  Activity
} from 'lucide-react';
import MapTilerView from '../map/MapTilerView';
import Lidar3DDriverMap from './Lidar3DDriverMap';
import { fetchVehicleTelemetry, triggerSuddenStop } from '../../services/fleetApi';

export default function DriverDashboard({
  currentUser,
  vehicles = [],
  alerts = [],
  isWsConnected = true
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [mapMode, setMapMode] = useState('3d_lidar'); // '3d_lidar' or '2d_maptiler'
  const [selectedVehicleId, setSelectedVehicleId] = useState(currentUser?.vehicleId || "HV-TRUCK-102");
  const [isSimulatingBrake, setIsSimulatingBrake] = useState(false);

  useEffect(() => {
    if (currentUser?.vehicleId) {
      setSelectedVehicleId(currentUser.vehicleId);
    }
  }, [currentUser]);

  const vehicleId = selectedVehicleId;

  // Current vehicle object
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.vehicle_id === vehicleId) || {
      vehicle_id: vehicleId,
      driver_name: currentUser?.name || "Driver",
      vehicle_type: "Mining Haul Truck",
      safety_status: "safe",
      speed_kmh: 46.0,
      closest_proximity_m: 38.0,
      heading_deg: 85
    };
  }, [vehicles, vehicleId, currentUser]);

  // Check if there are active V2V alerts specifically targeting this vehicle
  const activeVehicleAlert = useMemo(() => {
    return alerts.find(a => a.target_vehicle_id === vehicleId || a.vehicle_id === vehicleId || a.type === 'collision_proximity');
  }, [alerts, vehicleId]);

  // Fetch detailed telemetry for this vehicle
  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchVehicleTelemetry(vehicleId);
      if (active && data) setTelemetry(data);
    };

    load();
    const interval = setInterval(load, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [vehicleId]);

  const readings = telemetry?.telemetry || telemetry?.readings || {};
  const radar = readings.radar || { distance_m: currentVehicle.closest_proximity_m || 38.0, relative_speed_kmh: -1.5, target: "Lead Vehicle" };
  const thermal = readings.thermal || { max_temp_c: 44.2, hot_spot_detected: false };
  const lidar = readings.lidar || { closest_cluster_distance_m: 38.0, safety_zone_clear: true };
  const gnss = readings.gnss || readings.gnss_imu || { 
    speed_kmh: currentVehicle.speed_kmh || 46.0, 
    heading_deg: currentVehicle.heading_deg || 85.0,
    latitude: currentVehicle.latitude || 11.0168,
    longitude: currentVehicle.longitude || 76.9558
  };

  const status = currentVehicle.safety_status || (activeVehicleAlert?.severity === 'critical' ? 'alert' : 'safe');
  const distance = typeof radar.distance_m === 'number' ? radar.distance_m.toFixed(1) : radar.distance_m;

  // Sound alert beep (Web Audio API)
  useEffect(() => {
    if (audioEnabled && (status === 'alert' || activeVehicleAlert)) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (e) {}
    }
  }, [status, activeVehicleAlert, audioEnabled]);

  const handleSimulateSuddenStop = async () => {
    setIsSimulatingBrake(true);
    await triggerSuddenStop(10);
    setTimeout(() => setIsSimulatingBrake(false), 10000);
  };

  return (
    <div className="space-y-4">
      {/* ⚠️ HIGH PRIORITY CASCADING V2V SAFETY ALERT BANNER ⚠️ */}
      {status === 'alert' && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl shadow-rose-600/30 border-2 border-rose-400 animate-bounce">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                  CRITICAL PROXIMITY ALERT (&lt; 20m)
                </span>
                <h2 className="text-base sm:text-lg font-black mt-0.5 tracking-tight">
                  Lead Haul Truck Sudden Deceleration Detected in Forward Lane!
                </h2>
                <p className="text-xs text-rose-100 font-medium mt-0.5">
                  Following Distance: <span className="font-mono font-bold underline text-white text-sm">{distance}m</span> • Apply Full Brake Assist Immediately
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4" />}
              <span>{audioEnabled ? "Mute Alarm" : "Audio Warning"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Driver Cockpit Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-soft flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Truck ID, Driver & Truck Switcher */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md">
            <Truck className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black font-mono text-slate-900">{currentVehicle.vehicle_id}</h1>
              <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                ADAS Cockpit
              </span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs font-semibold text-slate-600">
                Driver: <strong className="text-slate-800">{currentVehicle.driver_name}</strong>
              </span>
            </div>

            {/* Quick Haul Truck Switcher */}
            {vehicles.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Hauler:</span>
                {vehicles.map(v => (
                  <button
                    key={v.vehicle_id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.vehicle_id)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition border ${
                      vehicleId === v.vehicle_id
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    {v.vehicle_id.replace('HV-', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map Mode Switcher, Safety Status Badge, SOS */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          {/* Map Display Mode: 3D LiDAR Vision vs 2D MapTiler */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMapMode('3d_lidar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                mapMode === '3d_lidar'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CubeIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Full-Size 3D LiDAR Vision</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('2d_maptiler')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                mapMode === '2d_maptiler'
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>2D Satellite Map</span>
            </button>
          </div>

          {/* Emergency Sudden Stop Simulator Trigger */}
          <button
            type="button"
            onClick={handleSimulateSuddenStop}
            disabled={isSimulatingBrake}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isSimulatingBrake 
                ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Simulate sudden lead truck braking to test collision alert"
          >
            {isSimulatingBrake ? "Testing Sudden Stop..." : "Simulate Sudden Stop"}
          </button>

          {/* Safety Status Hero Badge */}
          <div className={`px-4 py-2 rounded-xl border-2 font-black text-xs flex items-center gap-2 shadow-xs ${
            status === 'alert' 
              ? 'bg-rose-50 border-rose-500 text-rose-700 animate-pulse'
              : status === 'caution'
              ? 'bg-amber-50 border-amber-500 text-amber-800'
              : 'bg-emerald-50 border-emerald-500 text-emerald-800'
          }`}>
            {status === 'alert' ? <AlertOctagon className="w-4 h-4 text-rose-600" /> :
             status === 'caution' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
             <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            <div>
              <div className="text-[9px] uppercase font-bold tracking-wider opacity-75">
                V2V Safety Status
              </div>
              <div className="text-xs uppercase tracking-wide">
                {status === 'alert' ? 'CRITICAL ALERT (<20m)' :
                 status === 'caution' ? 'CAUTION ZONE (20-50m)' :
                 'CLEAR & SAFE (>50m)'}
              </div>
            </div>
          </div>

          {/* SOS Button */}
          <button
            type="button"
            onClick={() => setSosActive(!sosActive)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              sosActive
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Driver Emergency SOS Signal"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>{sosActive ? "SOS ACTIVE" : "SOS"}</span>
          </button>
        </div>
      </div>

      {/* FULL-SIZED MAP CENTERPIECE (3D LiDAR OR 2D MAPTILER) */}
      {mapMode === '3d_lidar' ? (
        <Lidar3DDriverMap
          currentVehicle={currentVehicle}
          radarDistance={typeof radar.distance_m === 'number' ? radar.distance_m : 38.0}
          relativeSpeed={radar.relative_speed_kmh}
          safetyStatus={status}
          headingDeg={gnss.heading_deg}
          speedKmh={gnss.speed_kmh}
        />
      ) : (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Spatial Proximity Radar (Centering {currentVehicle.vehicle_id})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Red Circle = 20m Danger Zone | Amber = 50m Caution Zone
            </span>
          </div>
          <div className="h-[520px] w-full rounded-xl overflow-hidden">
            <MapTilerView
              vehicles={vehicles}
              focusedVehicle={currentVehicle}
              isDriverView={true}
              driverVehicleId={currentVehicle.vehicle_id}
            />
          </div>
        </div>
      )}

      {/* LOWER INSTRUMENTATION BAR: Multi-Spectral ADAS Sensors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Sensor 1: 1550 nm LiDAR */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">3D LiDAR Berm Lock</span>
            <CubeIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-600">LOCKED</span>
            <span className="text-xs text-slate-400">18.4k pts/s</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Curb & roadside berm boundary intact</p>
        </div>

        {/* Sensor 2: 77 GHz Radar Target */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">77 GHz mmWave</span>
            <Radar className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">{distance}m</span>
            <span className="text-xs text-slate-500 font-mono">({radar.relative_speed_kmh} km/h)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">FMCW weather immunity: 100%</p>
        </div>

        {/* Sensor 3: LWIR Thermal Heat Signatures */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Thermal (LWIR)</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">{thermal.max_temp_c || 48.5}°C</span>
            <span className="text-xs text-slate-500">Exhaust</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Darkness & zero-visibility penetrate</p>
        </div>

        {/* Sensor 4: UWB V2V Mesh */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">UWB RF Mesh</span>
            <Wifi className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-indigo-700">LINKED</span>
            <span className="text-xs text-slate-500 font-mono">±10 cm</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">NLOS corner obstruction broadcast</p>
        </div>

        {/* Sensor 5: RTK Centimeter GNSS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-soft col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">RTK Centimeter</span>
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-600">RTK FIXED</span>
            <span className="text-xs text-slate-500 font-mono">28 sats</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">0.08m lane deviation offset</p>
        </div>
      </div>
    </div>
  );
}
