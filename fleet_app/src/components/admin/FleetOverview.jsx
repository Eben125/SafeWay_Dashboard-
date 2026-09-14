import React, { useState } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Zap, 
  Radio, 
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { triggerSuddenStop } from '../../services/fleetApi';

export default function FleetOverview({
  vehicles = [],
  filterStatus = "all",
  onFilterChange = () => {},
  isWsConnected = true,
  onVehicleRegistered = () => {}
}) {
  const [isSimulatingStop, setIsSimulatingStop] = useState(false);
  const [stopNotice, setStopNotice] = useState(null);

  const totalCount = vehicles.length;
  const safeCount = vehicles.filter(v => v.safety_status === "safe").length;
  const cautionCount = vehicles.filter(v => v.safety_status === "caution").length;
  const alertCount = vehicles.filter(v => v.safety_status === "alert").length;

  const handleSimulateSuddenStop = async () => {
    try {
      setIsSimulatingStop(true);
      setStopNotice("Simulating Sudden Stop on Lead HV-TRUCK-101! Cascading alerts to trailing trucks...");
      await triggerSuddenStop(12);
      setTimeout(() => {
        setIsSimulatingStop(false);
        setStopNotice(null);
      }, 12000);
    } catch (e) {
      console.error(e);
      setIsSimulatingStop(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Banner if Sudden Stop simulation active */}
      {stopNotice && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="font-semibold">{stopNotice}</span>
          </div>
          <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-mono font-bold animate-pulse">
            EMERGENCY SIMULATION ACTIVE
          </span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Active */}
        <div 
          onClick={() => onFilterChange("all")}
          className={`cursor-pointer p-3.5 rounded-xl border transition ${
            filterStatus === "all"
              ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Fleet</span>
            <Truck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">units active</span>
          </div>
        </div>

        {/* Safe */}
        <div 
          onClick={() => onFilterChange("safe")}
          className={`cursor-pointer p-3.5 rounded-xl border transition ${
            filterStatus === "safe"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Safe (&gt;50m)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">{safeCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">optimal clearance</span>
          </div>
        </div>

        {/* Caution */}
        <div 
          onClick={() => onFilterChange("caution")}
          className={`cursor-pointer p-3.5 rounded-xl border transition ${
            filterStatus === "caution"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Caution (20-50m)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 font-mono">{cautionCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">reducing gap</span>
          </div>
        </div>

        {/* Alert */}
        <div 
          onClick={() => onFilterChange("alert")}
          className={`cursor-pointer p-3.5 rounded-xl border transition ${
            filterStatus === "alert"
              ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Alert (&lt;20m)</span>
            <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 font-mono">{alertCount}</span>
            <span className="text-[11px] text-rose-600 font-medium">proximity risk</span>
          </div>
        </div>

        {/* Action / Trigger Sudden Stop */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3.5 rounded-xl text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              V2V Safety Test
            </span>
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? "bg-emerald-400" : "bg-amber-400"}`} title={isWsConnected ? "Bridge WS Connected" : "Connecting"}></span>
          </div>
          <button
            type="button"
            disabled={isSimulatingStop}
            onClick={handleSimulateSuddenStop}
            className={`mt-2 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isSimulatingStop
                ? "bg-rose-600/80 text-white cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95"
            }`}
          >
            {isSimulatingStop ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Brake...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Sudden Stop</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
