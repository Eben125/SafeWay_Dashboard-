import React from 'react';
import { ShieldCheck, CloudRain, Crosshair, AlertCircle } from 'lucide-react';

export default function SensorSpecBadge({
  range,
  immunity,
  keyValue,
  limitation
}) {
  const isSuperior = immunity?.includes("Superior") || immunity?.includes("Immune");
  const isModerate = immunity?.includes("Moderate");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
        <div className="flex items-center gap-1 text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">
          <Crosshair className="w-3 h-3 text-sky-600" />
          Effective Range
        </div>
        <div className="font-semibold text-slate-800 text-sm">{range}</div>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
        <div className="flex items-center gap-1 text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">
          <CloudRain className="w-3 h-3 text-indigo-500" />
          Weather Immunity
        </div>
        <div className={`font-semibold flex items-center gap-1 ${
          isSuperior ? 'text-emerald-700' : isModerate ? 'text-amber-700' : 'text-sky-700'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5 inline" />
          {immunity}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
        <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">
          Primary Value
        </div>
        <div className="font-medium text-slate-700 truncate" title={keyValue}>
          {keyValue}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
        <div className="flex items-center gap-1 text-slate-400 font-medium text-[10px] uppercase tracking-wider mb-0.5">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          Hardware Boundary
        </div>
        <div className="font-medium text-slate-600 truncate" title={limitation}>
          {limitation}
        </div>
      </div>
    </div>
  );
}
