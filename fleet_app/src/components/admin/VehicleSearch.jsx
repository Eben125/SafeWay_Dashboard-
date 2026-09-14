import React, { useState } from 'react';
import { Search, X, MapPin, Truck, ChevronRight } from 'lucide-react';

export default function VehicleSearch({ 
  vehicles = [], 
  onSelectVehicle = () => {},
  searchTerm = "",
  setSearchTerm = () => {}
}) {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = vehicles.filter(v => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return false;
    return (
      v.vehicle_id.toLowerCase().includes(q) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.vehicle_type && v.vehicle_type.toLowerCase().includes(q))
    );
  });

  const handleSelect = (vehicle) => {
    onSelectVehicle(vehicle);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Vehicle ID, Driver..."
          className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => { setSearchTerm(""); setIsOpen(false); }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && searchTerm && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto py-1">
          {filtered.map(v => (
            <div
              key={v.vehicle_id}
              onClick={() => handleSelect(v)}
              className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{v.vehicle_id}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      v.safety_status === 'alert' ? 'bg-rose-500' :
                      v.safety_status === 'caution' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  </div>
                  <div className="text-[10px] text-slate-500">{v.driver_name} • {v.vehicle_type}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-sky-600 font-medium">
                <span>Zoom Map</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
