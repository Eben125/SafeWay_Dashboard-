import React, { useState, useEffect } from 'react';
import { Sliders, Activity, Database, Check } from 'lucide-react';
import { updateSensorVolume } from '../../services/api';

/**
 * Reusable Input Volume Slider & Stepper Component.
 * Enables the user to increase/decrease sampling frequency and data volume in real time.
 * Persists the volume change to Firebase Firestore and scales backend data generation.
 */
export default function InputVolumeSlider({ 
  sensorId, 
  volume, 
  onChange,
  accentColor = "sky" 
}) {
  const [localVol, setLocalVol] = useState(volume || 30);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (volume !== undefined && volume !== localVol) {
      setLocalVol(volume);
    }
  }, [volume]);

  // Calculate sampling rate in Hz based on volume level
  const rateHz = (1.0 + (localVol - 1) * 0.394).toFixed(1);

  const handleSliderChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    setLocalVol(newVol);
    onChange?.(newVol);
  };

  const commitVolume = async (valToSave) => {
    setIsSaving(true);
    try {
      await updateSensorVolume(sensorId, valToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 1800);
    } catch (err) {
      console.error("Volume save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSliderRelease = () => {
    commitVolume(localVol);
  };

  const adjustStep = (delta) => {
    const nextVal = Math.max(1, Math.min(100, localVol + delta));
    setLocalVol(nextVal);
    onChange?.(nextVal);
    commitVolume(nextVal);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
            <Sliders className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input Volume</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-slate-800">{localVol}%</span>
              <span className="text-xs text-slate-400 font-mono">({rateHz} Hz)</span>
            </div>
          </div>
        </div>

        {/* Persistence Status Badge */}
        <div className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <Database className="w-3 h-3 text-sky-600" />
          {savedSuccess ? (
            <span className="text-emerald-600 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Saved to Firebase
            </span>
          ) : isSaving ? (
            <span className="text-sky-600 animate-pulse">Syncing...</span>
          ) : (
            <span>Firestore Linked</span>
          )}
        </div>
      </div>

      {/* Slider Range Input */}
      <div className="space-y-2">
        <input
          type="range"
          min="1"
          max="100"
          value={localVol}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />

        {/* Quick Stepper Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <button
              onClick={() => adjustStep(-10)}
              className="px-2 py-0.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
              title="Decrease by 10%"
            >
              -10%
            </button>
            <button
              onClick={() => adjustStep(-1)}
              className="px-2 py-0.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
              title="Decrease by 1%"
            >
              -1%
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Scale: 1 Hz – 40 Hz
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => adjustStep(1)}
              className="px-2 py-0.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
              title="Increase by 1%"
            >
              +1%
            </button>
            <button
              onClick={() => adjustStep(10)}
              className="px-2 py-0.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition"
              title="Increase by 10%"
            >
              +10%
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
