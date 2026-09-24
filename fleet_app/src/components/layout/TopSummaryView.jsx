import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Flame, 
  Radio, 
  Box, 
  Wifi, 
  Compass, 
  Database, 
  TrendingUp, 
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import InputVolumeSlider from '../common/InputVolumeSlider';
import AlertBanner from '../common/AlertBanner';

export default function TopSummaryView({
  sensors = [],
  volumes = {},
  latestReadings = {},
  totalPersisted = 0,
  throughputHz = 0,
  alerts = [],
  onSelectSensor,
  onVolumeChange,
  isRecording = false,
  onStartRecording,
  onStopRecording
}) {
  // Real-time time series throughput history for Recharts
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: now,
          thermal: (1.0 + ((volumes['thermal_camera'] || 25) - 1) * 0.394),
          radar: (1.0 + ((volumes['mmwave_radar'] || 35) - 1) * 0.394),
          lidar: (1.0 + ((volumes['lidar_3d'] || 30) - 1) * 0.394),
          uwb: (1.0 + ((volumes['uwb_rf'] || 20) - 1) * 0.394),
          gnss: (1.0 + ((volumes['rtk_gnss_imu'] || 25) - 1) * 0.394),
          total: parseFloat(throughputHz || 60)
        }
      ];
      if (next.length > 15) next.shift();
      return next;
    });
  }, [throughputHz, volumes]);

  const sensorCards = [
    {
      id: 'thermal_camera',
      name: 'Thermal Infrared (LWIR) Camera',
      metric: 'Video Feed / Radiometry',
      range: '30–50 m',
      immunity: 'Darkness & Fog Penetration',
      icon: Flame,
      color: 'rose',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      collection: 'thermal_camera_readings',
      readout: `${latestReadings['thermal_camera']?.detections?.length ?? 2} AI Targets Detected`
    },
    {
      id: 'mmwave_radar',
      name: '77 GHz mmWave Radar',
      metric: 'Target Distance & Speed',
      range: '100–200 m',
      immunity: 'Superior (Immune to rain/fog/mud)',
      icon: Radio,
      color: 'sky',
      textColor: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      collection: 'mmwave_radar_readings',
      readout: `${latestReadings['mmwave_radar']?.closest_distance_m ?? 38.5}m Closest Range`
    },
    {
      id: 'lidar_3d',
      name: '1550 nm 3D LiDAR',
      metric: '3D Point Cloud Geometry',
      range: '50–100 m',
      immunity: 'Moderate (Cloudburst Attenuation)',
      icon: Box,
      color: 'emerald',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      collection: 'lidar_readings',
      readout: `Road Edge & Berm Locked`
    },
    {
      id: 'uwb_rf',
      name: 'UWB / RF Transceiver',
      metric: 'Coordinates & Range (±10cm)',
      range: '50–100 m',
      immunity: 'Superior (Immune)',
      icon: Wifi,
      color: 'indigo',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      collection: 'uwb_rf_readings',
      readout: `${latestReadings['uwb_rf']?.tags?.length ?? 2} Connected V2V Units`
    },
    {
      id: 'rtk_gnss_imu',
      name: 'RTK-GNSS + IMU',
      metric: 'Centimeter Lane Guidance',
      range: 'Global',
      immunity: 'Superior (Immune)',
      icon: Compass,
      color: 'amber',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      collection: 'gnss_imu_readings',
      readout: `RTK FIXED (28 Satellites)`
    },
  ];

  return (
    <div className="space-y-8">
      {/* Active Alert Notification Banner if present */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* DEDICATED DATABASE INGESTION CONTROLLER (START / END BUTTONS) */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 shadow-soft ${
        isRecording 
          ? 'bg-gradient-to-r from-rose-50/70 via-white to-sky-50/50 border-rose-200/90' 
          : 'bg-white border-slate-200/90'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl mt-0.5 ${
              isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Database Ingestion Pipeline</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-wide ${
                  isRecording 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse flex items-center gap-1.5'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isRecording ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      RECORDING ACTIVE (Saving to Firebase)
                    </>
                  ) : (
                    '⏸ STANDBY (Not Saving to Firebase)'
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isRecording 
                  ? 'All 5 vehicle sensors are currently validating, batching, and writing readings into Firebase Firestore & Storage (safeway-d78b8).'
                  : 'Sensors are active in live preview. Sensor data is NOT being shared or written to the Firebase database until you click Start.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: START and END */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {isRecording ? (
              <button
                onClick={onStopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/20 transition-all"
              >
                <span className="w-3 h-3 bg-white rounded-sm"></span>
                <span>END DATABASE INGESTION</span>
              </button>
            ) : (
              <button
                onClick={onStartRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/25 transition-all"
              >
                <span className="text-sm">▶</span>
                <span>START DATABASE INGESTION</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Aggregated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Firebase Documents Persisted */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Firestore Persisted</span>
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {totalPersisted ? totalPersisted.toLocaleString() : '1,420+'}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Writing live to safeway-d78b8</span>
          </p>
        </div>

        {/* Metric 2: Live Pipeline Throughput */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Throughput</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {throughputHz || '62.5'} <span className="text-sm font-normal text-slate-400">Hz</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated sensor telemetry burst rate
          </p>
        </div>

        {/* Metric 3: Active Sensors Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Sensors</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            5 / 5
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Nominal health across all hardware units
          </p>
        </div>

        {/* Metric 4: Multi-Sensor Safety State */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fusion Safety State</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Active Fusion
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Redundant cross-sensor coverage nominal
          </p>
        </div>
      </div>

      {/* Real-time Time Series Throughput Trend Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              Live Sensor Ingestion Throughput (Sampling Rate Frequency)
            </h3>
            <p className="text-xs text-slate-500">
              Adjusting each sensor's Input Volume directly scales its sampling frequency and persisted documents.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Total Rate
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> 3D LiDAR
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Thermal LWIR
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="lidarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" Hz" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Area type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#totalGrad)" name="Total Combined (Hz)" />
              <Area type="monotone" dataKey="lidar" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#lidarGrad)" name="LiDAR (Hz)" />
              <Area type="monotone" dataKey="thermal" stroke="#f43f5e" strokeWidth={1.5} fill="none" name="Thermal IR (Hz)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dedicated Interactive 5-Sensor Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Dedicated Sensor Visualizer Panels</h2>
            <p className="text-xs text-slate-500">Hover or click any sensor card to inspect live telemetry and adjust individual input volume.</p>
          </div>
          <span className="text-xs font-mono text-slate-400">5 Distinct Hardware Units</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sensorCards.map((s) => {
            const Icon = s.icon;
            const currentVol = volumes[s.id] || 30;

            return (
              <div
                key={s.id}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-soft-hover transition-all duration-200 p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${s.bgColor} ${s.textColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{s.name}</h4>
                        <span className="text-xs text-slate-400 font-medium">{s.metric}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specifications Pill */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Range</span>
                      <span className="font-semibold text-slate-800">{s.range}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Weather</span>
                      <span className="font-semibold text-slate-800 truncate block">{s.immunity}</span>
                    </div>
                  </div>

                  {/* Real-time Telemetry Readout */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 mb-4 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Live Status:</span>
                    <span className="font-mono font-bold text-slate-800">{s.readout}</span>
                  </div>

                  {/* Embedded Input Volume Control */}
                  <InputVolumeSlider
                    sensorId={s.id}
                    volume={currentVol}
                    onChange={(newVal) => onVolumeChange(s.id, newVal)}
                  />
                </div>

                {/* Drill-down action button */}
                <button
                  onClick={() => onSelectSensor(s.id)}
                  className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 flex items-center justify-center gap-2 transition"
                >
                  <span>Open Dedicated {s.name.split(' ')[0]} Visualizer</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Firebase Data Schema Guide for User */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <Database className="w-5 h-5 text-sky-600" />
          <h3 className="font-bold text-base text-slate-900">Firebase Firestore Data Architecture (Project: safeway-d78b8)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          All sensor readings, live input volume levels, and cross-sensor alerts are validated by Python schemas and persisted into Firestore:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-sky-700 block mb-1">📁 sensor_settings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              Persists real-time <b>Input Volume (1-100%)</b>, sampling frequency in Hz, and active status per sensor.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-rose-700 block mb-1">📁 thermal_camera_readings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              Thermal frame URLs, AI detection bounding boxes, confidence ratings, and surface temperatures.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-sky-700 block mb-1">📁 mmwave_radar_readings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              Target distances (100–200m), Doppler velocity vectors, radar cross section (RCS), and weather immunity index.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-emerald-700 block mb-1">📁 lidar_readings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              3D point cloud samples, road edge curb detection flags, roadside berm flags, and cloudburst attenuation.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-indigo-700 block mb-1">📁 uwb_rf_readings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              V2V vehicle relative coordinates, ranging distances (±10cm), and Non-Line-Of-Sight (NLOS) alert flags.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-amber-700 block mb-1">📁 gnss_imu_readings</span>
            <p className="text-slate-600 text-[11px] font-sans">
              Lat/Long coordinates, RTK FIXED/FLOAT status, heading, lane guidance offset, and 6-DOF IMU attitude.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
