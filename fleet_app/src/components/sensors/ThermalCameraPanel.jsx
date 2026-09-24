import React, { useState } from 'react';
import { Flame, Eye, EyeOff, Thermometer, ShieldAlert, Cpu, Maximize2 } from 'lucide-react';
import InputVolumeSlider from '../common/InputVolumeSlider';
import SensorSpecBadge from '../common/SensorSpecBadge';

export default function ThermalCameraPanel({ 
  reading, 
  volume, 
  onVolumeChange 
}) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showTempCrosshair, setShowTempCrosshair] = useState(true);

  const detections = reading?.detections || [];
  const ambientTemp = reading?.ambient_temp_c ?? 18.4;
  const maxTemp = reading?.max_detected_temp_c ?? 86.5;
  const imageBase64 = reading?.image_base64;
  const fps = reading?.fps ?? 12.0;

  return (
    <div className="space-y-6">
      {/* Sensor Specification Callout */}
      <SensorSpecBadge
        range="30–50 m"
        immunity="High (Darkness & Fog Penetration)"
        keyValue="Intuitive visual display for driver in zero-light"
        limitation="Lacks direct target distance measurement"
      />

      {/* Main Thermal Visualization Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Thermal Live Viewport */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          {/* Viewport Top Bar */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="font-semibold text-sm text-slate-800">LWIR Thermal Video Stream</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                {fps} FPS
              </span>
            </div>

            {/* Display Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBoxes(!showBoxes)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                  showBoxes 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>AI Detections</span>
              </button>

              <button
                onClick={() => setShowTempCrosshair(!showTempCrosshair)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                  showTempCrosshair 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Crosshairs</span>
              </button>
            </div>
          </div>

          {/* Thermal Video Feed Container */}
          <div className="relative aspect-[16/10] bg-slate-950 flex items-center justify-center overflow-hidden">
            {imageBase64 ? (
              <img
                src={imageBase64}
                alt="Live LWIR Thermal Stream"
                className="w-full h-full object-cover select-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                <Flame className="w-10 h-10 text-rose-500 animate-pulse" />
                <span className="text-xs font-mono">Initializing LWIR Microbolometer Array...</span>
              </div>
            )}

            {/* SVG AI Detection Bounding Boxes Overlay */}
            {showBoxes && imageBase64 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 320">
                {detections.map((det, idx) => {
                  const [x, y, w, h] = det.bbox;
                  const isPed = det.label.toLowerCase().includes('pedestrian');
                  const strokeColor = isPed ? '#fbbf24' : '#38bdf8';
                  const bgColor = isPed ? 'rgba(251, 191, 36, 0.15)' : 'rgba(56, 189, 248, 0.15)';

                  return (
                    <g key={idx} className="transition-all duration-150">
                      {/* Bounding Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={bgColor}
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        rx="4"
                      />
                      {/* Corner Accents */}
                      <path d={`M ${x} ${y+10} L ${x} ${y} L ${x+10} ${y}`} stroke={strokeColor} strokeWidth="3" fill="none" />
                      <path d={`M ${x+w-10} ${y} L ${x+w} ${y} L ${x+w} ${y+10}`} stroke={strokeColor} strokeWidth="3" fill="none" />
                      <path d={`M ${x} ${y+h-10} L ${x} ${y+h} L ${x+10} ${y+h}`} stroke={strokeColor} strokeWidth="3" fill="none" />
                      <path d={`M ${x+w-10} ${y+h} L ${x+w} ${y+h} L ${x+w} ${y+h-10}`} stroke={strokeColor} strokeWidth="3" fill="none" />

                      {/* Label Badge */}
                      <rect
                        x={x}
                        y={Math.max(0, y - 20)}
                        width={w + 20}
                        height="18"
                        fill="rgba(15, 23, 42, 0.85)"
                        rx="3"
                      />
                      <text
                        x={x + 4}
                        y={Math.max(12, y - 7)}
                        fill="#ffffff"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {det.label} {Math.round(det.confidence * 100)}% ({det.temperature_c}°C)
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Temperature Crosshair Overlay */}
            {showTempCrosshair && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-8 h-8 flex items-center justify-center opacity-60">
                  <div className="absolute w-full h-[1px] bg-white"></div>
                  <div className="absolute h-full w-[1px] bg-white"></div>
                  <div className="w-2.5 h-2.5 border border-white rounded-full"></div>
                </div>
                <div className="absolute bottom-3 left-4 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono text-white flex items-center gap-2">
                  <span className="text-sky-400">AMB: {ambientTemp}°C</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-rose-400">MAX: {maxTemp}°C</span>
                </div>
              </div>
            )}

            {/* Thermography Ironbow Legend Scale Bar */}
            <div className="absolute bottom-3 right-4 bg-slate-900/85 backdrop-blur-sm p-2 rounded-lg text-[10px] text-white flex flex-col gap-1 items-end">
              <span className="font-mono text-slate-300">Ironbow Palette (°C)</span>
              <div className="w-32 h-2.5 rounded bg-gradient-to-r from-[#0a0519] via-[#8c146e] via-[#e65514] via-[#ffc31e] to-[#ffffff] border border-white/20"></div>
              <div className="w-32 flex justify-between text-[9px] font-mono text-slate-400">
                <span>0°C</span>
                <span>37°C</span>
                <span>90°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Target Telemetry & Detection Table */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-5">
            <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              Thermal Object Analytics
            </h3>

            {detections.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active thermal signatures detected in the 30–50 m field.
              </div>
            ) : (
              <div className="space-y-2.5">
                {detections.map((det, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          det.label.includes("Pedestrian") ? 'bg-amber-500' : 'bg-sky-500'
                        }`}></span>
                        {det.label}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {Math.round(det.confidence * 100)}% Conf
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Estimated Heat</span>
                        <span className="font-mono font-semibold text-slate-700">{det.temperature_c}°C</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sensor Range</span>
                        <span className="font-mono font-medium text-slate-600">30–50 m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                LWIR operates at 8–14 µm. Superior for detecting pedestrians in fog/night, but lacks radar-style distance echo ranging.
              </p>
            </div>
          </div>

          {/* Dedicated Input Volume Controller */}
          <InputVolumeSlider
            sensorId="thermal_camera"
            volume={volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
