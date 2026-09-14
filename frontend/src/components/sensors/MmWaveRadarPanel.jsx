import React, { useState, useEffect } from 'react';
import { Radio, ShieldCheck, Gauge, ArrowUpRight, ArrowDownRight, Wind, AlertCircle } from 'lucide-react';
import InputVolumeSlider from '../common/InputVolumeSlider';
import SensorSpecBadge from '../common/SensorSpecBadge';

export default function MmWaveRadarPanel({ 
  reading, 
  volume, 
  onVolumeChange 
}) {
  const [simulateAdverseWeather, setSimulateAdverseWeather] = useState(false);

  const targets = reading?.targets || [];
  const closestDistance = reading?.closest_distance_m ?? 38.5;
  const fastestSpeed = reading?.fastest_speed_kmh ?? 48.0;

  return (
    <div className="space-y-6">
      <SensorSpecBadge
        range="100–200 m"
        immunity="Superior (Immune)"
        keyValue="Penetrates dense fog, heavy rain, and caked mud"
        limitation="Low spatial resolution (cannot render shape)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Polar Sweep Radar Screen */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
              <span className="font-semibold text-sm text-slate-800">77 GHz FMCW Polar Sweep Radar</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                Immunity Active
              </span>
            </div>

            {/* Weather Immunity Demo Toggle */}
            <button
              onClick={() => setSimulateAdverseWeather(!simulateAdverseWeather)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition border ${
                simulateAdverseWeather
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>{simulateAdverseWeather ? 'Rain & Mud Mode: Immune' : 'Simulate Heavy Rain / Fog'}</span>
            </button>
          </div>

          {/* Radar PPI Radial Display Container */}
          <div className="relative aspect-[16/11] bg-[#0c1322] flex items-center justify-center overflow-hidden">
            {/* Weather Overlay if simulated */}
            {simulateAdverseWeather && (
              <div className="absolute inset-0 bg-sky-950/30 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
                <div className="bg-slate-900/90 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 shadow-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>77GHz mmWave: 0.0dB Rain Attenuation (Signal Fully Intact)</span>
                </div>
              </div>
            )}

            {/* SVG Polar Radar Grid */}
            <svg className="w-full h-full p-4" viewBox="0 0 500 500">
              <defs>
                {/* Sweep radial gradient */}
                <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Range Circles (50m, 100m, 150m, 200m) */}
              {[60, 120, 180, 230].map((radius, i) => (
                <g key={i}>
                  <circle
                    cx="250"
                    cy="440"
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="254"
                    y={440 - radius + 12}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {((i + 1) * 50)} m
                  </text>
                </g>
              ))}

              {/* Azimuth Ray Lines (-45°, -30°, 0°, +30°, +45°) */}
              {[-45, -30, -15, 0, 15, 30, 45].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                const x2 = 250 + 230 * Math.cos(rad);
                const y2 = 440 + 230 * Math.sin(rad);
                return (
                  <line
                    key={deg}
                    x1="250"
                    y1="440"
                    x2={x2}
                    y2={y2}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Rotating Sweep Beam */}
              <g className="animate-sweep" style={{ transformOrigin: "250px 440px" }}>
                <path
                  d="M 250 440 L 110 240 A 230 230 0 0 1 250 210 Z"
                  fill="url(#sweepGrad)"
                />
                <line
                  x1="250"
                  y1="440"
                  x2="250"
                  y2="210"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* Host Vehicle Center Marker at (250, 440) */}
              <circle cx="250" cy="440" r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="250" y="465" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                HOST VEHICLE
              </text>

              {/* Render Radar Point Targets */}
              {targets.map((tgt) => {
                // Map distance and azimuth to SVG coords
                // dist max 200m -> radius max 230px
                const r = (tgt.distance_m / 200.0) * 230;
                const angleRad = ((tgt.azimuth_deg - 90) * Math.PI) / 180;
                const tx = 250 + r * Math.cos(angleRad);
                const ty = 440 + r * Math.sin(angleRad);

                const isWarning = tgt.approach_warning || tgt.distance_m < 35.0;
                const color = isWarning ? '#f43f5e' : tgt.speed_kmh > 50 ? '#38bdf8' : '#34d399';

                return (
                  <g key={tgt.target_id} className="transition-all duration-300">
                    {/* Blip Glow */}
                    <circle cx={tx} cy={ty} r="8" fill={color} fillOpacity="0.25" />
                    <circle cx={tx} cy={ty} r="4" fill={color} />

                    {/* Doppler Velocity Vector Line */}
                    <line
                      x1={tx}
                      y1={ty}
                      x2={tx}
                      y2={ty - (tgt.speed_kmh * 0.3)}
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Target Data Tag */}
                    <rect
                      x={tx + 8}
                      y={ty - 16}
                      width="68"
                      height="22"
                      fill="#0f172a"
                      fillOpacity="0.9"
                      rx="3"
                      stroke="#334155"
                    />
                    <text x={tx + 12} y={ty - 6} fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      T{tgt.target_id}: {tgt.distance_m}m
                    </text>
                    <text x={tx + 12} y={ty + 3} fill="#94a3b8" fontSize="7" fontFamily="monospace">
                      {tgt.speed_kmh} km/h
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Radar Scope Telemetry HUD Overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white space-y-1">
              <div className="text-sky-400 font-semibold text-[11px]">RADAR TELEMETRY</div>
              <div>RANGE: <span className="text-slate-200">200m MAX</span></div>
              <div>FOV: <span className="text-slate-200">120° AZIMUTH</span></div>
              <div>FREQ: <span className="text-slate-200">77.0 GHz FMCW</span></div>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white">
              <div className="text-emerald-400 font-semibold text-[11px]">IMMUNITY INDEX</div>
              <div className="text-slate-200 text-lg font-bold">100%</div>
              <div className="text-[10px] text-slate-400">Zero Cloud/Fog Decay</div>
            </div>
          </div>
        </div>

        {/* Right Col: Distance & Velocity Digital Gauges + Volume */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-5">
            <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-sky-600" />
              Doppler Kinematics
            </h3>

            {/* Closest Object Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-3">
              <span className="text-slate-500 text-xs font-medium block mb-1">Closest Object Range</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-900">{closestDistance}</span>
                <span className="text-sm font-semibold text-slate-500">meters</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-sky-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (closestDistance / 200) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Target Doppler Speed */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 text-xs font-medium block mb-1">Lead Target Velocity</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-900">{fastestSpeed}</span>
                <span className="text-sm font-semibold text-slate-500">km/h</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Relative Speed: Matching Host Velocity</span>
              </div>
            </div>

            {/* Limitation Callout */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                77GHz mmWave provides point radar cross-section (RCS). It does not produce point-clouds or contours like LiDAR.
              </p>
            </div>
          </div>

          <InputVolumeSlider
            sensorId="mmwave_radar"
            volume={volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
