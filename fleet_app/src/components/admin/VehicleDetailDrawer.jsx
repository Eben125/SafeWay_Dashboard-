import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Radio, 
  Flame, 
  Radar, 
  Scan, 
  Compass, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Layers,
  Sparkles,
  Wifi
} from 'lucide-react';
import { fetchVehicleTelemetry } from '../../services/fleetApi';

export default function VehicleDetailDrawer({ 
  vehicle, 
  isOpen, 
  onClose 
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all", "radar", "thermal", "lidar", "uwb", "gnss"

  useEffect(() => {
    if (!isOpen || !vehicle) return;

    // Fetch initial or polling telemetry
    let active = true;
    const load = async () => {
      const data = await fetchVehicleTelemetry(vehicle.vehicle_id);
      if (active && data) setTelemetry(data);
    };

    load();
    const interval = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, vehicle]);

  if (!isOpen || !vehicle) return null;

  const readings = telemetry?.telemetry || telemetry?.readings || {};
  const radar = readings.radar || { distance_m: vehicle.closest_proximity_m || 42.5, relative_speed_kmh: -1.2, target: "Vehicle Ahead" };
  const thermal = readings.thermal || { max_temp_c: 48.5, min_temp_c: 24.1, avg_temp_c: 32.4, hot_spot_detected: false };
  const lidar = readings.lidar || { closest_cluster_distance_m: 39.8, cluster_count: 8, safety_zone_clear: true };
  const uwb = readings.uwb || { peer_id: "HV-TRUCK-101", ranging_distance_m: 41.2, link_quality: 94 };
  const gnss = readings.gnss || readings.gnss_imu || { 
    latitude: vehicle.latitude || 11.0168, 
    longitude: vehicle.longitude || 76.9558, 
    speed_kmh: vehicle.speed_kmh || 18.5,
    heading_deg: vehicle.heading_deg || 85.0,
    fix_type: "RTK_FIX (cm-accuracy)"
  };

  const status = vehicle.safety_status || "safe";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono">{vehicle.vehicle_id}</h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                status === "alert" ? "bg-rose-500 text-white animate-pulse" :
                status === "caution" ? "bg-amber-500 text-slate-950" :
                "bg-emerald-500 text-white"
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {vehicle.driver_name} • {vehicle.vehicle_type}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sensor Tab Switcher */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex gap-1 overflow-x-auto text-xs font-semibold">
        {["all", "radar", "thermal", "lidar", "uwb", "gnss"].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition ${
              activeTab === tab
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Real-time sync banner */}
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-900">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
            <span className="font-medium">Live Telemetry Pipeline (Bridge / Firestore)</span>
          </div>
          <span className="font-mono text-[11px] text-sky-700">2.5s Sync Loop</span>
        </div>

        {/* 1. Radar Section */}
        {(activeTab === "all" || activeTab === "radar") && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Radar className="w-4 h-4 text-sky-600" />
                <span>77 GHz mmWave Automotive Radar</span>
              </div>
              <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-semibold">
                FMCW 250m Range
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Distance</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {typeof radar.distance_m === 'number' ? `${radar.distance_m.toFixed(1)}m` : radar.distance_m}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rel. Speed</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {typeof radar.relative_speed_kmh === 'number' ? `${radar.relative_speed_kmh.toFixed(1)}` : radar.relative_speed_kmh} <span className="text-[10px] font-normal">km/h</span>
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tracked Target</span>
                <span className="text-xs font-bold font-mono text-slate-700 truncate block">
                  {radar.target || "Lead Vehicle"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Thermal Camera Section */}
        {(activeTab === "all" || activeTab === "thermal") && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Long-Wave Infrared (LWIR) Thermal Camera</span>
              </div>
              <span className="text-[10px] font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-semibold">
                8-14 µm Uncooled Microbolometer
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-orange-50/50 rounded-lg border border-orange-100">
                <span className="text-[10px] text-orange-700 uppercase tracking-wider block">Max Temp</span>
                <span className="text-base font-black font-mono text-orange-950">
                  {thermal.max_temp_c || 48.2}°C
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ambient Temp</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {thermal.avg_temp_c || 31.4}°C
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Thermal Hotspot</span>
                <span className={`text-xs font-bold font-mono ${thermal.hot_spot_detected ? "text-rose-600 font-black" : "text-emerald-600"}`}>
                  {thermal.hot_spot_detected ? "DETECTED ⚠️" : "NORMAL"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. LiDAR Section */}
        {(activeTab === "all" || activeTab === "lidar") && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Scan className="w-4 h-4 text-indigo-600" />
                <span>1550 nm Eye-Safe 3D LiDAR</span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                Solid-State Beam Steering
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Nearest Cluster</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {lidar.closest_cluster_distance_m ? `${lidar.closest_cluster_distance_m.toFixed(1)}m` : "38.5m"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Clusters</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {lidar.cluster_count || 12} pts
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Zone Status</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  {lidar.safety_zone_clear ? "CLEAR" : "OBSTACLE"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. UWB / RF Section */}
        {(activeTab === "all" || activeTab === "uwb") && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Ultra-Wideband (UWB) IEEE 802.15.4z</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                Two-Way Ranging (TWR)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">UWB Peer</span>
                <span className="text-xs font-bold font-mono text-slate-800 truncate block">
                  {uwb.peer_id || "HV-TRUCK-101"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">TWR Distance</span>
                <span className="text-base font-black font-mono text-slate-800">
                  {uwb.ranging_distance_m ? `${uwb.ranging_distance_m.toFixed(2)}m` : "41.20m"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Link Quality</span>
                <span className="text-base font-black font-mono text-emerald-600">
                  {uwb.link_quality || 95}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. RTK-GNSS + IMU Section */}
        {(activeTab === "all" || activeTab === "gnss") && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>RTK-GNSS & 6-DOF Inertial Measurement Unit</span>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">
                {gnss.fix_type || "RTK_FIX"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">WGS-84 Coordinates</span>
                <span className="font-mono font-bold text-slate-800">
                  {gnss.latitude?.toFixed(6)}, {gnss.longitude?.toFixed(6)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Speed & Heading</span>
                <span className="font-mono font-bold text-slate-800">
                  {gnss.speed_kmh?.toFixed(1) || 0} km/h • {gnss.heading_deg?.toFixed(1) || 0}° N
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <span>Firestore Collection: <code className="text-slate-800 font-mono">sensor_readings/{vehicle.vehicle_id}</code></span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
