import React, { useState } from 'react';
import { Shield, Truck, Key, User, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRole } from './RoleContext';

export default function LoginModal({ isOpen, onClose }) {
  const { loginAdmin, loginDriver, registeredVehicles } = useRole();
  const [tab, setTab] = useState("admin"); // "admin" or "driver"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (tab === "admin") {
      const res = loginAdmin(username, password);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    } else {
      const res = loginDriver(username, password);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    }
  };

  const quickFillAdmin = () => {
    setTab("admin");
    setUsername("admin");
    setPassword("admin123");
    setError("");
  };

  const quickFillDriver = (vehicle) => {
    setTab("driver");
    setUsername(vehicle.username);
    setPassword(vehicle.password);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">SafeWay Fleet Access</h2>
              <p className="text-xs text-slate-400">Coimbatore Mining Safety Command</p>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-2 mt-5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              onClick={() => { setTab("admin"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === "admin" 
                  ? 'bg-sky-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Supervisor</span>
            </button>
            <button
              onClick={() => { setTab("driver"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                tab === "driver" 
                  ? 'bg-sky-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Vehicle Driver</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tab === "admin" ? "Supervisor Username" : "Vehicle Assigned Username"}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={tab === "admin" ? "e.g. admin" : "e.g. driver_truck101"}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Security Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2"
          >
            <span>Authenticate & Enter Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick-Fill Helper for Evaluation */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Test Credentials:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={quickFillAdmin}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition"
              >
                Admin (admin / admin123)
              </button>
              {registeredVehicles.slice(0, 3).map(v => (
                <button
                  key={v.vehicle_id}
                  type="button"
                  onClick={() => quickFillDriver(v)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-mono transition"
                >
                  {v.vehicle_id} ({v.driver_name.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
