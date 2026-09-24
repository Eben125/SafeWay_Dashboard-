import React from 'react';
import { 
  Truck, 
  Map, 
  LayoutDashboard, 
  Flame, 
  Radio, 
  Box, 
  Wifi, 
  Compass 
} from 'lucide-react';

export const NAVIGATION_TABS = [
  { id: 'driver_cockpit', name: 'Driver Fog Cockpit', icon: Truck, tag: 'Fog Assist HUD' },
  { id: 'fleet_admin', name: 'Fleet Supervisor Map', icon: Map, tag: 'Pit Overview', adminOnly: true },
  { id: 'overview', name: 'Executive Overview', icon: LayoutDashboard, tag: 'Fusion Hub' },
  { id: 'thermal_camera', name: 'Thermal Camera (LWIR)', icon: Flame, tag: '30–50 m' },
  { id: 'mmwave_radar', name: '77 GHz mmWave Radar', icon: Radio, tag: '100–200 m' },
  { id: 'lidar_3d', name: '1550 nm 3D LiDAR', icon: Box, tag: '50–100 m' },
  { id: 'uwb_rf', name: 'UWB / RF Transceiver', icon: Wifi, tag: 'V2V NLOS' },
  { id: 'rtk_gnss_imu', name: 'RTK-GNSS + IMU', icon: Compass, tag: 'Centimeter' },
];

export default function NavigationTabs({ activeTab, onTabChange, volumes = {}, isDriver = false }) {
  const visibleTabs = NAVIGATION_TABS.filter(tab => !tab.adminOnly || !isDriver);

  return (
    <div className="border-b border-slate-200 bg-white/70 backdrop-blur-sm sticky top-[68px] z-30 px-4 lg:px-8 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const vol = volumes[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
              {vol !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-sky-50 text-sky-700 font-bold' : 'bg-slate-100 text-slate-500'
                }`}>
                  {vol}%
                </span>
              )}
              {tab.id === 'overview' && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  5 Sensors
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
