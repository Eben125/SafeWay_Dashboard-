import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Map, 
  Table, 
  RefreshCw, 
  ShieldCheck, 
  AlertOctagon,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import MapTilerView from '../map/MapTilerView';
import FleetOverview from './FleetOverview';
import VehicleSearch from './VehicleSearch';
import VehicleManagement from './VehicleManagement';
import VehicleRegistration from './VehicleRegistration';
import VehicleDetailDrawer from './VehicleDetailDrawer';

export default function AdminDashboard({
  vehicles = [],
  alerts = [],
  isWsConnected = true,
  onRefresh = () => {},
  onVehicleAdded = () => {},
  onVehicleDeleted = () => {}
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedVehicle, setFocusedVehicle] = useState(null);
  const [telemetryVehicle, setTelemetryVehicle] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Filter vehicles
  const displayedVehicles = vehicles.filter(v => {
    // Status filter
    if (filterStatus !== "all" && v.safety_status !== filterStatus) {
      return false;
    }
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchId = v.vehicle_id.toLowerCase().includes(q);
      const matchDriver = v.driver_name && v.driver_name.toLowerCase().includes(q);
      const matchType = v.vehicle_type && v.vehicle_type.toLowerCase().includes(q);
      if (!matchId && !matchDriver && !matchType) return false;
    }
    return true;
  });

  const handleSelectVehicle = (vehicle) => {
    setFocusedVehicle(vehicle);
  };

  const handleOpenTelemetry = (vehicle) => {
    setTelemetryVehicle(vehicle);
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <VehicleSearch
            vehicles={vehicles}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectVehicle={handleSelectVehicle}
          />
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-slate-50 transition"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Vehicle</span>
          </button>
        </div>
      </div>

      {/* KPI Overview and V2V Emergency Sudden Stop Button */}
      <FleetOverview
        vehicles={vehicles}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        isWsConnected={isWsConnected}
      />

      {/* Map Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></div>
            <h3 className="text-sm font-bold text-slate-900">MapTiler Live Mining Pit Fleet Spatial View</h3>
            <span className="text-[11px] font-mono text-slate-400">Coimbatore Limestone Pit (11.0168°N, 76.9558°E)</span>
          </div>
          {focusedVehicle && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono">Tracking: <strong className="text-slate-800">{focusedVehicle.vehicle_id}</strong></span>
              <button
                type="button"
                onClick={() => setFocusedVehicle(null)}
                className="text-[11px] text-sky-600 hover:underline"
              >
                Clear Focus
              </button>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="h-[420px] w-full rounded-xl overflow-hidden">
          <MapTilerView
            vehicles={vehicles}
            focusedVehicle={focusedVehicle}
            onSelectVehicle={(v) => {
              setFocusedVehicle(v);
              setTelemetryVehicle(v);
            }}
          />
        </div>
      </div>

      {/* Vehicle Management Table */}
      <VehicleManagement
        vehicles={displayedVehicles}
        onSelectVehicle={handleSelectVehicle}
        onOpenTelemetry={handleOpenTelemetry}
        onVehicleDeleted={onVehicleDeleted}
      />

      {/* Vehicle Registration Modal */}
      <VehicleRegistration
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onVehicleAdded={(newV) => {
          onVehicleAdded(newV);
          setFocusedVehicle(newV);
        }}
      />

      {/* Real-time Telemetry Drawer */}
      <VehicleDetailDrawer
        vehicle={telemetryVehicle}
        isOpen={Boolean(telemetryVehicle)}
        onClose={() => setTelemetryVehicle(null)}
      />
    </div>
  );
}
