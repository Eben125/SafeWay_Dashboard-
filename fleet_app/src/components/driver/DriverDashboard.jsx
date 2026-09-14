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
  LifeBuoy
} from 'lucide-react';
import MapTilerView from '../map/MapTilerView';
import { fetchVehicleTelemetry } from '../../services/fleetApi';

export default function DriverDashboard({
  currentUser,
  vehicles = [],
  alerts = [],
  isWsConnected = true
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const vehicleId = currentUser?.vehicleId || "HV-TRUCK-102";

  // Current vehicle object
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.vehicle_id === vehicleId) || {
      vehicle_id: vehicleId,
      driver_name: currentUser?.name || "Driver",
      vehicle_type: "Mining Haul Truck",
      safety_status: "safe",
      speed_kmh: 22.4,
      closest_proximity_m: 38.0,
      heading_deg: 90
    };
  }, [vehicles, vehicleId, currentUser]);

  // Check if there are active V2V alerts specifically targeting this vehicle
  const activeVehicleAlert = useMemo(() => {
    return alerts.find(a => a.target_vehicle_id === vehicleId || a.vehicle_id === vehicleId);
  }, [alerts, vehicleId]);

  // Fetch detailed telemetry for this vehicle
  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchVehicleTelemetry(vehicleId);
      if (active && data) setTelemetry(data);
    };

    load();
    const interval = setInterval(load, 2000);
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
    speed_kmh: currentVehicle.speed_kmh || 22.0, 
    heading_deg: currentVehicle.heading_deg || 90.0,
    latitude: currentVehicle.latitude || 11.0168,
    longitude: currentVehicle.longitude || 76.9558
  };

  const status = currentVehicle.safety_status || (activeVehicleAlert?.severity === 'CRITICAL' ? 'alert' : 'safe');
  const distance = typeof radar.distance_m === 'number' ? radar.distance_m.toFixed(1) : radar.distance_m;

  // Sound alert beep (Web Audio API synthetic beep) if audio enabled and status is alert
  useEffect(() => {
    if (audioEnabled && (status === 'alert' || activeVehicleAlert)) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch warning
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // audio context ignored
      }
    }
  }, [status, activeVehicleAlert, audioEnabled]);

  return (
    <div className="space-y-4">
      {/* ⚠️ HIGH PRIORITY CASCADING V2V SAFETY ALERT BANNER ⚠️ */}
      {activeVehicleAlert && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl shadow-rose-600/30 border-2 border-rose-400 animate-bounce">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                  {activeVehicleAlert.cascade_type || "V2V COLLISION WARNING"}
                </span>
                <h2 className="text-base sm:text-lg font-black mt-0.5 tracking-tight">
                  {activeVehicleAlert.message}
                </h2>
                <p className="text-xs text-rose-100 font-medium mt-0.5">
                  Proximity Clearance: <span className="font-mono font-bold underline">{distance}m</span> • Immediate Driver Action Required
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4" />}
              <span>{audioEnabled ? "Mute Tone" : "Audible Horn"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Driver Cockpit Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Truck className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black font-mono text-slate-900">{currentVehicle.vehicle_id}</h1>
              <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                Cockpit Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Driver: <strong className="text-slate-700">{currentVehicle.driver_name}</strong> • {currentVehicle.vehicle_type}
            </p>
          </div>
        </div>

        {/* Safety Status Hero Badge */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className={`px-5 py-2.5 rounded-xl border-2 font-black text-sm flex items-center gap-2 shadow-sm ${
            status === 'alert' 
              ? 'bg-rose-50 border-rose-500 text-rose-700 animate-pulse'
              : status === 'caution'
              ? 'bg-amber-50 border-amber-500 text-amber-800'
              : 'bg-emerald-50 border-emerald-500 text-emerald-800'
          }`}>
            {status === 'alert' ? <AlertOctagon className="w-5 h-5 text-rose-600" /> :
             status === 'caution' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
             <ShieldCheck className="w-5 h-5 text-emerald-600" />}
            <div className="leading-tight">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                V2V Safety Zone
              </div>
              <div className="text-sm uppercase tracking-wide">
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
            className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              sosActive
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Driver Emergency SOS Signal"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>{sosActive ? "SOS ACTIVE" : "SOS"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Map on Left, Live Telemetry Dials on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map View with Proximity Rings */}
        <div className="lg:col-span-7 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
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

          <div className="h-[380px] w-full rounded-xl overflow-hidden">
            <MapTilerView
              vehicles={vehicles}
              focusedVehicle={currentVehicle}
              isDriverView={true}
              driverVehicleId={currentVehicle.vehicle_id}
            />
          </div>
        </div>

        {/* Telemetry Flight Instruments */}
        <div className="lg:col-span-5 space-y-3">
          {/* Clearance Distance Card */}
          <div className={`p-4 rounded-2xl border transition shadow-sm ${
            status === 'alert' 
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/30' 
              : status === 'caution'
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Radar className="w-4 h-4 text-sky-600" />
                Forward Target Proximity
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Radar 77 GHz
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-4xl font-black font-mono tracking-tight text-slate-900">
                  {distance}
                </span>
                <span className="text-base font-bold text-slate-500 ml-1">meters</span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block uppercase">Relative Velocity</span>
                <span className="text-base font-bold font-mono text-slate-800">
                  {radar.relative_speed_kmh != null ? `${radar.relative_speed_kmh} km/h` : "--"}
                </span>
              </div>
            </div>

            {/* Visual Distance Progress Bar */}
            <div className="mt-3">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-500 ${
                    status === 'alert' ? 'bg-rose-600' :
                    status === 'caution' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (radar.distance_m / 100) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span className="text-rose-600 font-bold">0m (Impact)</span>
                <span className="text-amber-600 font-bold">20m (Brake)</span>
                <span className="text-emerald-600 font-bold">50m+ (Safe)</span>
              </div>
            </div>
          </div>

          {/* Speed & Heading Instrument */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">Ground Speed</span>
                <Gauge className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {gnss.speed_kmh != null ? gnss.speed_kmh.toFixed(1) : "0.0"}
                </span>
                <span className="text-xs font-semibold text-slate-500">km/h</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">Heading</span>
                <Compass className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {gnss.heading_deg != null ? `${gnss.heading_deg.toFixed(0)}°` : "0°"}
                </span>
                <span className="text-xs font-semibold text-slate-500">Bearing</span>
              </div>
            </div>
          </div>

          {/* Environmental Sensors Summary */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Multi-Spectral Perception Status
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Thermal Max</span>
                <span className="font-mono font-bold text-slate-800">{thermal.max_temp_c || 42}°C</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">LiDAR Hazard</span>
                <span className={`font-mono font-bold ${lidar.safety_zone_clear ? "text-emerald-600" : "text-rose-600"}`}>
                  {lidar.safety_zone_clear ? "CLEAR" : "OBJECT"}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">UWB Peer</span>
                <span className="font-mono font-bold text-sky-700">LINKED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
