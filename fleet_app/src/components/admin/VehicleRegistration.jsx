import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  ShieldCheck, 
  Copy, 
  Check, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  Lock,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { registerVehicle } from '../../services/fleetApi';

export default function VehicleRegistration({ isOpen, onClose, onVehicleAdded }) {
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleType, setVehicleType] = useState("Dump Truck (CAT 777)");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("Sector A - Pit Extraction");
  const [loading, setLoading] = useState(false);
  const [createdVehicle, setCreatedVehicle] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await registerVehicle({
        vehicle_id: vehicleId.trim().toUpperCase(),
        driver_name: driverName.trim(),
        vehicle_type: vehicleType,
        driver_phone: phone.trim() || "+91 98401 00000",
        zone: sector
      });

      if (res && res.vehicle) {
        setCreatedVehicle(res.vehicle);
        onVehicleAdded?.(res.vehicle);
      } else {
        setError(res.error || "Failed to register vehicle.");
      }
    } catch (err) {
      setError(err.message || "Failed to connect to bridge.");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdVehicle) return;
    const text = `SafeWay Fleet Driver Credentials:\nVehicle ID: ${createdVehicle.vehicle_id}\nDriver: ${createdVehicle.driver_name}\nUsername: ${createdVehicle.username}\nPassword: ${createdVehicle.password}\nPortal: http://localhost:5174`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleReset = () => {
    setCreatedVehicle(null);
    setVehicleId("");
    setDriverName("");
    setPhone("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Register Mining Fleet Vehicle</h3>
              <p className="text-[11px] text-slate-400">Add heavy equipment & generate driver portal credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {createdVehicle ? (
          /* Success Screen with Credentials */
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Vehicle Registered Successfully!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Saved into Firestore <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">vehicles</code> collection and activated in the sensor middleware.
                </p>
              </div>
            </div>

            {/* Credential Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Driver Access Credentials
                </span>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy Details"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Vehicle ID</span>
                  <span className="font-mono font-bold text-slate-900">{createdVehicle.vehicle_id}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Driver</span>
                  <span className="font-medium text-slate-900">{createdVehicle.driver_name}</span>
                </div>
                <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200">
                  <span className="text-sky-700 text-[10px] block font-semibold">Generated Username</span>
                  <span className="font-mono font-bold text-sky-900">{createdVehicle.username}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-700 text-[10px] block font-semibold">Generated Password</span>
                  <span className="font-mono font-bold text-amber-900">{createdVehicle.password}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition"
            >
              Done & Return to Fleet List
            </button>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle ID / Call-Sign</label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. HV-TRUCK-104"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                >
                  <option value="Dump Truck (CAT 777)">Dump Truck (CAT 777)</option>
                  <option value="Hydraulic Excavator (Komatsu PC1250)">Hydraulic Excavator (Komatsu PC1250)</option>
                  <option value="Wheel Loader (CAT 988K)">Wheel Loader (CAT 988K)</option>
                  <option value="Bulldozer (CAT D8T)">Bulldozer (CAT D8T)</option>
                  <option value="Water Sprinkler Truck">Water Sprinkler Truck</option>
                  <option value="Light Utility Vehicle">Light Utility Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mining Sector</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+91 98401 23456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                <span>Automated Credential Generation</span>
              </div>
              <p>
                The system will automatically compute a unique username and secure 8-character driver PIN for this vehicle.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 transition disabled:opacity-50"
              >
                {loading ? "Registering in Firestore..." : "Register & Generate Credentials"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
