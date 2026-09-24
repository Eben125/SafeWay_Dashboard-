import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Compass, MapPin, Satellite, Navigation, AlertCircle, Activity } from 'lucide-react';
import InputVolumeSlider from '../common/InputVolumeSlider';
import SensorSpecBadge from '../common/SensorSpecBadge';

export default function GnssImuPanel({ 
  reading, 
  volume, 
  onVolumeChange 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const pathPolylineRef = useRef(null);
  const pathCoordsRef = useRef([]);

  const lat = reading?.latitude ?? 12.971600;
  const lon = reading?.longitude ?? 77.594600;
  const heading = reading?.heading_deg ?? 85.0;
  const speed = reading?.speed_kmh ?? 48.0;
  const rtkStatus = reading?.rtk_status ?? "FIXED";
  const satellites = reading?.satellites_count ?? 28;
  const hdop = reading?.hdop ?? 0.68;
  const laneOffset = reading?.lane_guidance_offset_m ?? 0.08;
  const imu = reading?.imu || { pitch_deg: 0.5, roll_deg: 1.2, accel_x_g: 0.02, accel_y_g: 0.04, accel_z_g: 1.0 };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Clean, modern light CartoDB Positron tile layer
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 17,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Custom Vehicle Heading Marker Icon
    const customIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="transform: rotate(${heading}deg); transform-origin: center center;" class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 bg-sky-500/20 rounded-full animate-ping"></div>
          <div class="w-6 h-6 bg-sky-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    vehicleMarkerRef.current = marker;

    const polyline = L.polyline([[lat, lon]], {
      color: '#0284c7',
      weight: 4,
      opacity: 0.7,
      dashArray: '2, 6'
    }).addTo(map);
    pathPolylineRef.current = polyline;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position and heading smoothly
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleMarkerRef.current) return;

    const newPos = [lat, lon];
    vehicleMarkerRef.current.setLatLng(newPos);

    // Update icon orientation
    const customIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div style="transform: rotate(${heading}deg); transform-origin: center center;" class="relative w-8 h-8 flex items-center justify-center">
          <div class="w-6 h-6 bg-sky-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    vehicleMarkerRef.current.setIcon(customIcon);

    // Update breadcrumb trajectory
    pathCoordsRef.current.push(newPos);
    if (pathCoordsRef.current.length > 80) pathCoordsRef.current.shift();
    pathPolylineRef.current.setLatLngs(pathCoordsRef.current);

    // Pan map subtly if vehicle moves towards edge
    mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.5 });
  }, [lat, lon, heading]);

  return (
    <div className="space-y-6">
      <SensorSpecBadge
        range="Global"
        immunity="Superior (Immune)"
        keyValue="Centimeter-accurate lane guidance overlay on digital map"
        limitation="Requires prior site mapping & base station connection"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map & Lane Corridor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '10s' }} />
              <span className="font-semibold text-sm text-slate-800">RTK-GNSS Live Digital Lane Guidance</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Satellite className="w-3 h-3" /> RTK {rtkStatus}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-500">
              HDOP: <span className="font-bold text-slate-800">{hdop}</span> ({satellites} Sats)
            </div>
          </div>

          {/* Leaflet Map Viewport */}
          <div className="relative aspect-[16/11] bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Lane Guidance Corridor HUD */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1 font-mono">
              <div className="text-sky-700 font-bold text-[11px] flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-sky-600" />
                LANE CORRIDOR GUIDANCE
              </div>
              <div className="text-slate-600">
                Lateral Offset: <span className="font-bold text-slate-900">{laneOffset > 0 ? `+${laneOffset}` : laneOffset} m</span>
              </div>
              <div className="text-slate-600">
                Vehicle Heading: <span className="font-bold text-slate-900">{heading}°</span>
              </div>
              <div className="text-slate-600">
                Ground Speed: <span className="font-bold text-slate-900">{speed} km/h</span>
              </div>
            </div>

            {/* Base Station Status Card */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-mono text-slate-700 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>NTRIP RTCM 3.2 Stream: Connected (0.2s latency)</span>
            </div>
          </div>
        </div>

        {/* Right Col: 6-DOF IMU Attitude & Accelerometer + Volume */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-5">
            <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              6-DOF Inertial Telemetry (IMU)
            </h3>

            {/* Artificial Horizon Pitch & Roll Meter */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 text-center">
              <div className="text-slate-400 text-[10px] uppercase font-semibold mb-2">Attitude / Pitch & Roll</div>
              <div className="relative w-32 h-32 mx-auto rounded-full border-4 border-slate-300 bg-sky-200 overflow-hidden shadow-inner flex items-center justify-center">
                {/* Horizon ground half */}
                <div 
                  className="absolute w-full h-full bg-amber-700/60 transition-transform duration-200"
                  style={{ 
                    transform: `rotate(${imu.roll_deg}deg) translateY(${50 - imu.pitch_deg * 3}%)`,
                    transformOrigin: 'center center'
                  }}
                ></div>
                {/* Center crosshair */}
                <div className="absolute w-8 h-[2px] bg-slate-900 z-10"></div>
                <div className="absolute h-8 w-[2px] bg-slate-900 z-10"></div>
                <div className="w-3 h-3 rounded-full border-2 border-slate-900 z-10"></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                <div className="p-1.5 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">PITCH</span>
                  <span className="font-bold text-slate-800">{imu.pitch_deg}°</span>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">ROLL</span>
                  <span className="font-bold text-slate-800">{imu.roll_deg}°</span>
                </div>
              </div>
            </div>

            {/* 3-Axis Accelerations */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-600">
                <span>Accel X (Longitudinal):</span>
                <span className="font-bold">{imu.accel_x_g} g</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Accel Y (Lateral):</span>
                <span className="font-bold">{imu.accel_y_g} g</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Accel Z (Vertical):</span>
                <span className="font-bold">{imu.accel_z_g} g</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                GNSS positioning is immune to rain, but depends on unobstructed sky visibility and differential base station corrections.
              </p>
            </div>
          </div>

          <InputVolumeSlider
            sensorId="rtk_gnss_imu"
            volume={volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
