
import React from 'react';
import { Shield, Database, Radio, LogIn, LogOut } from 'lucide-react';
import { applyVolumePreset } from '../../services/api';
import { useRole } from '../auth/RoleContext';

export default function Header({ 
  isConnected = true, 
  totalPersisted = 1420, 
  throughputHz = 62.5,
  activePreset = "balanced",
  onPresetChange,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  onOpenLoginModal
}) {
  const { currentUser, logout, isAdmin } = useRole();

  const handlePreset = async (preset) => {
    onPresetChange?.(preset);
    await applyVolumePreset(preset);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">SafeWay Fleet & Sensor Pipeline</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-sky-100 text-sky-800 border border-sky-200">
                SIH26007
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Coimbatore Mining Pit • V2V Safety</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-medium text-slate-600">
                  Simulation Streaming Live
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Right: Ingestion Controller, Firestore docs, Throughput, Presets, and Auth */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* PRIMARY START / END DATABASE INGESTION CONTROLLER */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl border bg-slate-50">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100/90 rounded-lg animate-pulse border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  STORING IN FIREBASE
                </span>
                <button
                  onClick={onStopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg shadow-sm transition"
                  title="Stop persisting sensor data to Firebase"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-sm"></span>
                  <span>END / STOP</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-200/70 rounded-lg">
                  ⏸ STANDBY (No DB writes)
                </span>
                <button
                  onClick={onStartRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm shadow-emerald-600/20 transition"
                  title="Start persisting sensor data into Firebase Firestore"
                >
                  <span className="text-[11px]">▶</span>
                  <span>START INGESTION</span>
                </button>
              </div>
            )}
          </div>

          {/* Firestore Link Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-tight">Firebase Firestore</span>
              <span className="font-mono font-semibold text-slate-700">
                {totalPersisted ? totalPersisted.toLocaleString() : '1,420'} docs saved
              </span>
            </div>
          </div>

          {/* Combined Throughput */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Radio className="w-3.5 h-3.5 text-indigo-500" />
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-tight">Active Throughput</span>
              <span className="font-mono font-semibold text-slate-700">{throughputHz || '62.5'} Hz</span>
            </div>
          </div>

          {/* Global Input Volume Presets */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
            <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Volume:</span>
            {['Low', 'Balanced', 'High', 'Burst'].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePreset(preset.toLowerCase())}
                className={`px-2 py-0.5 rounded text-xs transition ${
                  activePreset === preset.toLowerCase()
                    ? 'bg-white text-sky-700 shadow-sm font-semibold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Role Pill & Switcher */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-left transition flex items-center gap-2"
                  title="Click to Switch Role"
                >
                  <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-sky-500' : 'bg-indigo-500'}`}></div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {isAdmin ? "Admin Supervisor" : `Driver (${currentUser.vehicleId || 'TRK-102'})`}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
