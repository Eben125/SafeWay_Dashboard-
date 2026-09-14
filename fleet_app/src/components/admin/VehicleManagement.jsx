import React, { useState } from 'react';
import { 
  Truck, 
  User, 
  MapPin, 
  Activity, 
  Trash2, 
  Eye, 
  EyeOff, 
  Compass, 
  Radio, 
  AlertOctagon, 
  ShieldCheck, 
  AlertTriangle,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { deleteVehicle } from '../../services/fleetApi';

export default function VehicleManagement({
  vehicles = [],
  onSelectVehicle = () => {},
  onOpenTelemetry = () => {},
  onVehicleDeleted = () => {}
}) {
  const [showPasswordFor, setShowPasswordFor] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const togglePasswordVisibility = (vid) => {
    setShowPasswordFor(prev => ({
      ...prev,
      [vid]: !prev[vid]
    }));
  };

  const handleDelete = async (vid) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove vehicle ${vid}?`)) return;
    try {
      setDeletingId(vid);
      await deleteVehicle(vid);
      onVehicleDeleted(vid);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === "alert") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          ALERT (&lt;20m)
        </span>
      );
    }
    if (status === "caution") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          CAUTION (20-50m)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <ShieldCheck className="w-3 h-3 text-emerald-600" />
        SAFE (&gt;50m)
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Active Fleet Units</h3>
          <p className="text-[11px] text-slate-500">Live operational status, coordinates, and credential management</p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">
          {vehicles.length} Assigned Units
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <th className="py-2.5 px-4">Vehicle / Type</th>
              <th className="py-2.5 px-4">Driver</th>
              <th className="py-2.5 px-4">Safety Status</th>
              <th className="py-2.5 px-4">Clearance / Speed</th>
              <th className="py-2.5 px-4">Driver Portal Key</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v) => {
              const lat = (v.latitude || v.location?.latitude || 0).toFixed(4);
              const lng = (v.longitude || v.location?.longitude || 0).toFixed(4);
              const speed = (v.speed_kmh || 0).toFixed(1);
              const clearance = v.closest_proximity_m != null ? `${v.closest_proximity_m.toFixed(1)}m` : "--";
              const isLead = v.vehicle_id === "HV-TRUCK-101";

              return (
                <tr 
                  key={v.vehicle_id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Vehicle / Type */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLead 
                          ? "bg-sky-100 text-sky-700 border border-sky-200" 
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{v.vehicle_id}</span>
                          {isLead && (
                            <span className="text-[9px] px-1 bg-sky-100 text-sky-700 rounded font-sans font-semibold">
                              LEAD
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {v.vehicle_type}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Driver */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{v.driver_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{v.driver_phone || "Radio Ch. 4"}</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {renderStatusBadge(v.safety_status)}
                  </td>

                  {/* Clearance / Speed */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-800">
                      {clearance}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {speed} km/h • {lat},{lng}
                    </div>
                  </td>

                  {/* Driver Credentials */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <span className="text-slate-500 mr-1">User:</span>
                        <span className="font-bold text-slate-800">{v.username}</span>
                        <span className="text-slate-300 mx-1">|</span>
                        <span className="text-slate-500 mr-1">Pass:</span>
                        <span className="font-bold text-slate-800">
                          {showPasswordFor[v.vehicle_id] ? v.password : "••••••••"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(v.vehicle_id)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Toggle password reveal"
                      >
                        {showPasswordFor[v.vehicle_id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Locate on Map */}
                      <button
                        type="button"
                        onClick={() => onSelectVehicle(v)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition"
                        title="Locate on MapTiler"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </button>

                      {/* Live Telemetry Drawer */}
                      <button
                        type="button"
                        onClick={() => onOpenTelemetry(v)}
                        className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition text-[11px] font-semibold flex items-center gap-1"
                        title="View Live Sensor Telemetry"
                      >
                        <Activity className="w-3 h-3" />
                        <span>Telemetry</span>
                      </button>

                      {/* Delete */}
                      {!isLead && (
                        <button
                          type="button"
                          disabled={deletingId === v.vehicle_id}
                          onClick={() => handleDelete(v.vehicle_id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
                          title="Deactivate vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
