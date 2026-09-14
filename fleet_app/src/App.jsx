import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Truck, 
  Radio, 
  LogOut, 
  LogIn, 
  UserCheck, 
  Layers, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useRole } from './components/auth/RoleContext';
import LoginModal from './components/auth/LoginModal';
import AdminDashboard from './components/admin/AdminDashboard';
import DriverDashboard from './components/driver/DriverDashboard';
import { connectFleetStream, fetchVehicles, fetchAlerts, fetchBridgeHealth } from './services/fleetApi';

export default function App() {
  const { currentUser, logout, isAdmin, isDriver, registeredVehicles, setRegisteredVehicles } = useRole();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [bridgeStatus, setBridgeStatus] = useState({ isConnected: false });
  const [wsConnected, setWsConnected] = useState(false);

  // Initial load of vehicles
  const loadData = async () => {
    try {
      const vRes = await fetchVehicles();
      if (vRes?.vehicles) {
        setVehicles(vRes.vehicles);
        setRegisteredVehicles(vRes.vehicles);
      }
      const aRes = await fetchAlerts();
      if (aRes?.alerts) setAlerts(aRes.alerts);

      const health = await fetchBridgeHealth();
      setBridgeStatus(health);
    } catch (e) {
      console.warn("Bridge loading fallback:", e);
    }
  };

  useEffect(() => {
    loadData();

    // WebSocket real-time subscription
    const stream = connectFleetStream(
      (data) => {
        if (data.type === "fleet_snapshot") {
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.alerts) setAlerts(data.alerts);
        }
      },
      (status) => {
        setWsConnected(status.isConnected);
      }
    );

    const interval = setInterval(loadData, 5000);

    return () => {
      stream.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleVehicleAdded = (newV) => {
    setVehicles(prev => {
      const filtered = prev.filter(v => v.vehicle_id !== newV.vehicle_id);
      return [...filtered, newV];
    });
    setRegisteredVehicles(prev => [...prev.filter(v => v.vehicle_id !== newV.vehicle_id), newV]);
  };

  const handleVehicleDeleted = (vid) => {
    setVehicles(prev => prev.filter(v => v.vehicle_id !== vid));
    setRegisteredVehicles(prev => prev.filter(v => v.vehicle_id !== vid));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  SafeWay <span className="text-sky-600 font-black">Fleet</span>
                </span>
                <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-mono font-bold rounded border border-sky-200">
                  SIH26007
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Coimbatore Mining Pit • V2V Safety & Telemetry System
              </p>
            </div>
          </div>

          {/* Center: Live Status Indicators */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-600 font-medium">
                Bridge Middleware {wsConnected ? "Online (Port 8001)" : "Reconnecting"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 font-mono text-[11px]">
              <span className="text-slate-400">Simulation:</span>
              <span className="text-emerald-600 font-bold">Port 8000</span>
            </div>
          </div>

          {/* Right: Auth / Role Control */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-slate-100 rounded-xl flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-sky-500' : 'bg-indigo-500'}`}></div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span>{currentUser.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {isAdmin ? "Admin Supervisor" : `Driver (${currentUser.vehicleId})`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
                  title="Switch User / Role"
                >
                  Switch Role
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In (Admin / Driver)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {isAdmin ? (
          <AdminDashboard
            vehicles={vehicles}
            alerts={alerts}
            isWsConnected={wsConnected}
            onRefresh={loadData}
            onVehicleAdded={handleVehicleAdded}
            onVehicleDeleted={handleVehicleDeleted}
          />
        ) : (
          <DriverDashboard
            currentUser={currentUser}
            vehicles={vehicles}
            alerts={alerts}
            isWsConnected={wsConnected}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-400">
        <p>
          SafeWay Fleet Management System • Smart India Hackathon SIH26007 • Powered by MapTiler & Firebase Firestore
        </p>
      </footer>

      {/* Login / Role Switching Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
