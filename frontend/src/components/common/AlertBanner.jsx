import React from 'react';
import { AlertTriangle, Info, BellRing, X } from 'lucide-react';

export default function AlertBanner({ alerts = [], onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  const latest = alerts[0];
  const isCritical = latest.severity === "critical";

  return (
    <div className={`border rounded-xl p-3.5 shadow-sm transition-all duration-300 ${
      isCritical 
        ? 'bg-rose-50/90 border-rose-200 text-rose-900' 
        : 'bg-amber-50/90 border-amber-200 text-amber-900'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg mt-0.5 ${
            isCritical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
          }`}>
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCritical ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
              }`}>
                {latest.severity} Safety Event
              </span>
              <span className="text-xs font-mono opacity-70">
                {new Date(latest.timestamp).toLocaleTimeString()}
              </span>
              {latest.trigger_sensor && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/70 border border-slate-200 text-slate-700">
                  Trigger: {latest.trigger_sensor}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-sm mt-1">{latest.title}</h4>
            <p className="text-xs opacity-90 mt-0.5">{latest.description}</p>
            {latest.action_required && (
              <div className="text-xs font-medium mt-1.5 flex items-center gap-1">
                <span className="underline">Required Action:</span> {latest.action_required}
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button 
            onClick={() => onDismiss(latest.alert_id)} 
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
