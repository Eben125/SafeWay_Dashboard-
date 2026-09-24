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
  Volume2, 
  VolumeX,
  LifeBuoy,
  Layers,
  BatteryCharging,
  Navigation,
  Clock,
  Weight,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  CloudFog,
  Wind,
  Maximize2,
  Minimize2,
  Mic,
  Activity
} from 'lucide-react';
import Lidar3DDriverMap from './Lidar3DDriverMap';
import { fetchVehicleTelemetry, triggerSuddenStop } from '../../services/fleetApi';

export default function DriverDashboard({
  currentUser,
  vehicles = [],
  alerts = [],
  isWsConnected = true
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(currentUser?.vehicleId || "HV-TRUCK-102");
  const [isSimulatingBrake, setIsSimulatingBrake] = useState(false);

  // Ergonomic Driving Mode Toggles
  const [visualMode, setVisualMode] = useState('fog'); // 'fog', 'daylight', 'night'
  const [cameraView, setCameraView] = useState('chase'); // 'cockpit', 'chase', 'topdown'
  const [fogPenetration, setFogPenetration] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (currentUser?.vehicleId) {
      setSelectedVehicleId(currentUser.vehicleId);
    }
  }, [currentUser]);

  const vehicleId = selectedVehicleId;

  // Active Haul Truck State
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.vehicle_id === vehicleId) || {
      vehicle_id: vehicleId,
      driver_name: currentUser?.name || "Murugan S",
      vehicle_type: "Mining Haul Truck (60T)",
      safety_status: "safe",
      speed_kmh: 46.0,
      closest_proximity_m: 38.0,
      heading_deg: 85
    };
  }, [vehicles, vehicleId, currentUser]);

  // Active Collisions & Hazards
  const activeVehicleAlert = useMemo(() => {
    return alerts.find(a => a.target_vehicle_id === vehicleId || a.vehicle_id === vehicleId || a.type === 'collision_proximity');
  }, [alerts, vehicleId]);

  // Periodic Telemetry Polling
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

  // Synthesized Audio Warning Cues (Bypasses constant visual distraction)
  useEffect(() => {
    if (audioEnabled && (status === 'alert' || activeVehicleAlert)) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.28);
      } catch (e) {}
    }
  }, [status, activeVehicleAlert, audioEnabled]);

  const handleSimulateSuddenStop = async () => {
    setIsSimulatingBrake(true);
    await triggerSuddenStop(10);
    setTimeout(() => setIsSimulatingBrake(false), 10000);
  };

  return (
    <div className={`relative w-full overflow-hidden transition-all duration-300 select-none ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-[#070c18] h-screen w-screen p-0 m-0' 
        : 'h-[calc(100vh-140px)] min-h-[680px] max-h-[920px] rounded-3xl border border-slate-700/60 shadow-2xl bg-[#070c18]'
    }`}>

      {/* ========================================================================= */}
      {/* 1. DOMINANT FULL-SCREEN 3D MAP CANVAS (OCCUPIES 85%+ SCREEN REAL ESTATE) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Lidar3DDriverMap
          currentVehicle={currentVehicle}
          radarDistance={typeof radar.distance_m === 'number' ? radar.distance_m : 38.0}
          relativeSpeed={radar.relative_speed_kmh}
          safetyStatus={status}
          headingDeg={gnss.heading_deg}
          speedKmh={gnss.speed_kmh}
          visualMode={visualMode}
          cameraView={cameraView}
          onCameraViewChange={setCameraView}
          fogPenetration={fogPenetration}
          onToggleFogPenetration={() => setFogPenetration(!fogPenetration)}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING TOP HUD: Mission Status, Next Waypoint, Battery, Contrast Mode */}
      {/* ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left: Active Truck & Shift Performance */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 text-white shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm tracking-tight text-white">
                {currentVehicle.vehicle_id}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{currentVehicle.driver_name}</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-300 font-mono font-semibold">Shift: 7 / 10 Loads (420T)</span>
            </div>
          </div>
        </div>

        {/* Center: Mission Itinerary & Next Waypoint Indicator */}
        <div className="pointer-events-auto hidden md:flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 text-white shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Current Haul Mission</span>
              <span className="text-xs font-bold text-white tracking-wide">
                Pit-A West Wall → Crusher Hopper #2
              </span>
            </div>
          </div>
          <div className="w-[1px] h-7 bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Next Waypoint</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                3m 24s <span className="text-slate-400 font-normal">(1.1 km)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Fuel/Battery, Visual Mode, SOS */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Powertrain / Battery State */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 text-white shadow-2xl text-xs">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <span className="font-mono font-bold text-white block leading-tight">84%</span>
              <span className="text-[10px] text-slate-400 font-mono">5.8h rem</span>
            </div>
          </div>

          {/* High-Contrast Visibility Switcher (Fog / Daylight / Night) */}
          <div className="flex items-center p-1 bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl text-xs">
            <button
              type="button"
              onClick={() => setVisualMode('fog')}
              className={`p-2 rounded-xl transition ${
                visualMode === 'fog' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Dense Fog LiDAR Vision Mode"
            >
              <CloudFog className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('daylight')}
              className={`p-2 rounded-xl transition ${
                visualMode === 'daylight' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="High-Contrast Daylight Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('night')}
              className={`p-2 rounded-xl transition ${
                visualMode === 'night' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Nighttime Anti-Glare Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Map Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-900 transition shadow-2xl"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Cockpit Map"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Emergency SOS Signal */}
          <button
            type="button"
            onClick={() => setSosActive(!sosActive)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xl ${
              sosActive
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300'
            }`}
            title="Pit Emergency Beacon"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>{sosActive ? "SOS ON" : "SOS"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLOATING LEFT WIDGET: 77GHz + LiDAR Forward Proximity & Collision Arc */}
      {/* ========================================================================= */}
      <div className="absolute top-24 left-4 z-20 pointer-events-none">
        <div className="pointer-events-auto w-72 bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 shadow-2xl text-white space-y-3">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-sky-400" />
              Forward Proximity
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
              status === 'alert' 
                ? 'bg-rose-500/25 border-rose-500/50 text-rose-300 animate-pulse' 
                : status === 'caution'
                ? 'bg-amber-500/25 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
            }`}>
              {status === 'alert' ? 'CRITICAL <20m' : status === 'caution' ? 'CAUTION 20-50m' : 'CLEAR >50m'}
            </span>
          </div>

          {/* Large Target Distance Readout */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-4xl font-black font-mono tracking-tight text-white">
                {distance}
              </span>
              <span className="text-base font-bold text-slate-400 ml-1">m</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Relative Speed</span>
              <span className="text-sm font-bold font-mono text-slate-200">
                {radar.relative_speed_kmh != null ? `${radar.relative_speed_kmh} km/h` : '--'}
              </span>
            </div>
          </div>

          {/* Dynamic 3-Zone Progressive Brake Distance Bar */}
          <div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex">
              <div 
                className={`h-full transition-all duration-300 ${
                  status === 'alert' ? 'bg-rose-500 shadow-md shadow-rose-500/50' :
                  status === 'caution' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(6, (radar.distance_m / 100) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1 text-slate-400">
              <span className="text-rose-400 font-bold">0m (Impact)</span>
              <span className="text-amber-400 font-bold">20m (Brake)</span>
              <span className="text-emerald-400 font-bold">50m+ (Safe)</span>
            </div>
          </div>

          {/* Sudden Deceleration Simulation Trigger */}
          <button
            type="button"
            onClick={handleSimulateSuddenStop}
            disabled={isSimulatingBrake}
            className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              isSimulatingBrake
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>{isSimulatingBrake ? "Testing Emergency Stop..." : "Simulate Sudden Lead Stop"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FLOATING RIGHT WIDGET: Speedometer, Gear, Compass Flight Instruments   */}
      {/* ========================================================================= */}
      <div className="absolute top-24 right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 shadow-2xl text-white space-y-3 w-56">
          
          {/* Ground Speed & Gear */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Ground Speed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono text-white">
                  {typeof gnss.speed_kmh === 'number' ? gnss.speed_kmh.toFixed(1) : gnss.speed_kmh}
                </span>
                <span className="text-xs font-bold text-slate-400">km/h</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 uppercase block font-mono">Gear</span>
              <span className="text-base font-black font-mono text-emerald-400">D4</span>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-800"></div>

          {/* Heading Compass & Speed Limit */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Heading</span>
                <span className="font-mono font-bold text-sky-300">
                  {typeof gnss.heading_deg === 'number' ? gnss.heading_deg.toFixed(0) : gnss.heading_deg}° ENE
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase block">Pit Limit</span>
              <span className="font-mono font-bold text-amber-300">50 km/h</span>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-800"></div>

          {/* Camera POV & Radar Mode Switchers */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Cockpit Perspectives</span>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setCameraView('cockpit')}
                className={`py-1 rounded-lg border text-center transition ${
                  cameraView === 'cockpit' ? 'bg-sky-600 text-white border-sky-500 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                POV
              </button>
              <button
                type="button"
                onClick={() => setCameraView('chase')}
                className={`py-1 rounded-lg border text-center transition ${
                  cameraView === 'chase' ? 'bg-sky-600 text-white border-sky-500 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Orbit
              </button>
              <button
                type="button"
                onClick={() => setCameraView('topdown')}
                className={`py-1 rounded-lg border text-center transition ${
                  cameraView === 'topdown' ? 'bg-sky-600 text-white border-sky-500 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Top
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FLOATING BOTTOM BAR & SWIPEABLE/EXPANDABLE ITINERARY DRAWER            */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto max-w-4xl mx-auto space-y-2">
          
          {/* Expanded Drawer Manifest & Telemetry (Visible when opened) */}
          {isDrawerOpen && (
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-5 shadow-2xl text-white animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Hauler Diagnostic & Multi-Spectral Status ({currentVehicle.vehicle_id})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payload Weight</span>
                  <span className="text-lg font-bold font-mono text-white">54.2 Tons</span>
                  <span className="text-[10px] text-slate-500 block">Limestone Ore Grade-A</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">LWIR Radiometry</span>
                  <span className="text-lg font-bold font-mono text-rose-400">{thermal.max_temp_c || 48.5}°C</span>
                  <span className="text-[10px] text-slate-500 block">Exhaust Manifold Normal</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">LiDAR Point Cloud</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">18,450 pts/s</span>
                  <span className="text-[10px] text-slate-500 block">Road Berm Lock Intact</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">RTK Satellites</span>
                  <span className="text-lg font-bold font-mono text-sky-400">28 Locked</span>
                  <span className="text-[10px] text-slate-500 block">0.08m Lane Deviation</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Dock Control Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 text-white shadow-2xl">
            
            {/* Quick Haul Truck Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-400 font-semibold uppercase px-2">Hauler:</span>
              {vehicles.map(v => (
                <button
                  key={v.vehicle_id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.vehicle_id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition border ${
                    vehicleId === v.vehicle_id
                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  {v.vehicle_id.replace('HV-', '')}
                </button>
              ))}
            </div>

            {/* Center: Tap to Expand Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              {isDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{isDrawerOpen ? "Hide Manifest & Diagnostics" : "Trip Manifest & Telemetry"}</span>
            </button>

            {/* Right: Map Type Toggle (3D vs 2D) & Audio Alarm Toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-[11px] tracking-wide">1550nm LiDAR SYNTHETIC HUD</span>
              </div>

              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-1.5 rounded-xl border transition ${
                  audioEnabled 
                    ? 'bg-slate-900 border-slate-800 text-amber-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
                title={audioEnabled ? "Audio Warning Active" : "Muted"}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
