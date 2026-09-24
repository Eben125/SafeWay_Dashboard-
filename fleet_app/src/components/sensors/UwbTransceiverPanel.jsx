import React from 'react';
import { Wifi, ShieldAlert, Car, AlertOctagon, Radio, Navigation } from 'lucide-react';
import InputVolumeSlider from '../common/InputVolumeSlider';
import SensorSpecBadge from '../common/SensorSpecBadge';

export default function UwbTransceiverPanel({ 
  reading, 
  volume, 
  onVolumeChange 
}) {
  const tags = reading?.tags || [];
  const hasNlosRisk = reading?.nlos_collision_risk ?? false;
  const activeCount = reading?.active_tags_count ?? tags.length;

  return (
    <div className="space-y-6">
      <SensorSpecBadge
        range="50–100 m"
        immunity="Superior (Immune)"
        keyValue="Non-line-of-sight (NLOS) V2V alerts through obstacles"
        limitation="Detects only tag-equipped vehicles & beacons"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 2D Relative V2V Radar Plot */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="font-semibold text-sm text-slate-800">Ultra-Wideband (UWB) V2V Transceiver Hub</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                IEEE 802.15.4z
              </span>
            </div>

            {hasNlosRisk && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>NLOS Hazard Alert</span>
              </div>
            )}
          </div>

          {/* 2D V2V Bird's-Eye Grid Display Container */}
          <div className="relative aspect-[16/11] bg-[#0d1527] flex items-center justify-center overflow-hidden">
            {/* SVG Relative Coordinates Grid */}
            <svg className="w-full h-full p-4" viewBox="-60 -10 120 100">
              {/* Distance Concentric Arcs: 25m, 50m, 75m, 100m */}
              {[25, 50, 75, 100].map((dist) => (
                <g key={dist}>
                  <path
                    d={`M ${-dist} 0 A ${dist} ${dist} 0 0 1 ${dist} 0`}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={dist - 4}
                    y="-2"
                    fill="#64748b"
                    fontSize="3.5"
                    fontFamily="monospace"
                  >
                    {dist}m
                  </text>
                </g>
              ))}

              {/* Angle Guideline Rays */}
              {[-60, -30, 0, 30, 60].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return (
                  <line
                    key={deg}
                    x1="0"
                    y1="0"
                    x2={80 * Math.cos(rad)}
                    y2={80 * Math.sin(rad)}
                    stroke="#1e293b"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Blind Intersection Building (Obstacle obscuring Line of Sight) */}
              <rect
                x="15"
                y="15"
                width="35"
                height="35"
                fill="#1e293b"
                fillOpacity="0.85"
                stroke="#334155"
                strokeWidth="1"
                rx="2"
              />
              <text x="32" y="34" fill="#94a3b8" fontSize="3" textAnchor="middle" fontFamily="monospace">
                [BLIND CORNER BUILDING]
              </text>

              {/* Host Vehicle Origin at (0, 0) */}
              <circle cx="0" cy="0" r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
              <polygon points="0,-4 -2,-1 2,-1" fill="#38bdf8" />
              <text x="0" y="5" fill="#e2e8f0" fontSize="3.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                HOST (0, 0)
              </text>

              {/* Render UWB V2V Tags */}
              {tags.map((tag) => {
                // Plot X and Y (Y is distance forward, X is lateral offset)
                const isNlos = tag.nlos_status;
                const isHazard = tag.v2v_alert;

                return (
                  <g key={tag.tag_id} className="transition-all duration-300">
                    {/* RF Ranging Wave */}
                    <circle
                      cx={tag.rel_x_m}
                      y={tag.rel_y_m}
                      r="4"
                      fill={isHazard ? '#f43f5e' : isNlos ? '#fbbf24' : '#818cf8'}
                      fillOpacity="0.2"
                      className="animate-pulse"
                    />
                    <circle
                      cx={tag.rel_x_m}
                      y={tag.rel_y_m}
                      r="2"
                      fill={isHazard ? '#f43f5e' : isNlos ? '#fbbf24' : '#818cf8'}
                    />

                    {/* RF line to host */}
                    <line
                      x1="0"
                      y1="0"
                      x2={tag.rel_x_m}
                      y2={tag.rel_y_m}
                      stroke={isNlos ? '#fbbf24' : '#6366f1'}
                      strokeWidth="0.6"
                      strokeDasharray={isNlos ? "2 2" : "none"}
                    />

                    {/* Tag Data Box */}
                    <rect
                      x={tag.rel_x_m + 3}
                      y={tag.rel_y_m - 8}
                      width="36"
                      height="12"
                      fill="#0f172a"
                      fillOpacity="0.9"
                      rx="1"
                      stroke={isHazard ? '#f43f5e' : '#334155'}
                      strokeWidth="0.5"
                    />
                    <text
                      x={tag.rel_x_m + 5}
                      y={tag.rel_y_m - 3}
                      fill="#ffffff"
                      fontSize="2.8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {tag.tag_id}
                    </text>
                    <text
                      x={tag.rel_x_m + 5}
                      y={tag.rel_y_m + 1.5}
                      fill={isNlos ? '#fbbf24' : '#94a3b8'}
                      fontSize="2.4"
                      fontFamily="monospace"
                    >
                      {tag.distance_m}m | {isNlos ? 'NLOS WARNING' : 'LOS CLEAR'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Precision Banner */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white">
              <div className="text-indigo-400 font-semibold text-[11px]">RANGING ACCURACY</div>
              <div className="text-slate-200 text-base font-bold">±10 cm</div>
              <div className="text-[10px] text-slate-400">Time-of-Flight (ToF)</div>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white">
              <div className="text-sky-400 font-semibold text-[11px]">ACTIVE V2V PEERS</div>
              <div className="text-slate-200 text-base font-bold">{activeCount} Vehicles</div>
            </div>
          </div>
        </div>

        {/* Right Col: V2V Tags Telemetry & NLOS Alerts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-5">
            <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-600" />
              Connected V2V Peers
            </h3>

            <div className="space-y-3">
              {tags.map((tag) => (
                <div
                  key={tag.tag_id}
                  className={`p-3.5 rounded-xl border transition ${
                    tag.v2v_alert 
                      ? 'bg-rose-50 border-rose-300' 
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-indigo-600" />
                      {tag.tag_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tag.nlos_status 
                        ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {tag.nlos_status ? 'NON-LINE-OF-SIGHT' : 'LINE-OF-SIGHT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Relative Coordinates</span>
                      <span className="font-mono font-semibold text-slate-700">
                        ({tag.rel_x_m}m, {tag.rel_y_m}m)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">True Distance</span>
                      <span className="font-mono font-bold text-indigo-600">{tag.distance_m} m</span>
                    </div>
                  </div>

                  {tag.v2v_alert && (
                    <div className="mt-2 text-[11px] font-medium text-rose-700 flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Approaching blind corner intersection!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/70 text-indigo-950 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                UWB RF pulses penetrate walls and buildings to provide advance warning before vehicles become visually visible.
              </p>
            </div>
          </div>

          <InputVolumeSlider
            sensorId="uwb_rf"
            volume={volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
