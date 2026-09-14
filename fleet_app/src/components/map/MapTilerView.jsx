import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MAPTILER_CONFIG } from '../../config/maptiler';
import { Layers, Maximize2, Compass, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function MapTilerView({
  vehicles = [],
  focusedVehicle = null,
  onSelectVehicle = null,
  isDriverView = false,
  driverVehicleId = null,
  className = "h-full w-full"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const proximityCirclesRef = useRef([]);
  const tileLayerRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState("streets"); // "streets", "satellite", "topo"

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAPTILER_CONFIG.defaultCenter,
      zoom: MAPTILER_CONFIG.defaultZoom,
      minZoom: MAPTILER_CONFIG.minZoom,
      maxZoom: MAPTILER_CONFIG.maxZoom,
      zoomControl: false
    });

    // Custom top-right zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer (Streets)
    const layerCfg = MAPTILER_CONFIG.layers[activeLayer] || MAPTILER_CONFIG.layers.streets;
    const tileLayer = L.tileLayer(layerCfg.url, {
      attribution: layerCfg.attribution,
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Base Map Layer Change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerCfg = MAPTILER_CONFIG.layers[activeLayer] || MAPTILER_CONFIG.layers.streets;
    tileLayerRef.current = L.tileLayer(layerCfg.url, {
      attribution: layerCfg.attribution,
      maxZoom: 20
    }).addTo(map);
  }, [activeLayer]);

  // Helper to create custom Vehicle DivIcon
  const createVehicleIcon = (vehicle, isCurrentDriver = false) => {
    const status = vehicle.safety_status || "safe";
    const heading = vehicle.heading_deg || vehicle.heading || 0;
    
    // Status colors
    let bgClass = "bg-emerald-500 border-emerald-300 text-emerald-950";
    let pulseHtml = "";

    if (status === "alert") {
      bgClass = "bg-rose-600 border-rose-300 text-white shadow-rose-500/50 shadow-lg";
      pulseHtml = `<div class="absolute -inset-2 rounded-full border-2 border-rose-500 animate-ping opacity-75"></div>`;
    } else if (status === "caution") {
      bgClass = "bg-amber-500 border-amber-300 text-amber-950";
      pulseHtml = `<div class="absolute -inset-1 rounded-full border border-amber-400 animate-pulse opacity-80"></div>`;
    }

    const driverRing = isCurrentDriver 
      ? `<div class="absolute -inset-3 rounded-full border-2 border-sky-400 border-dashed animate-spin" style="animation-duration: 10s;"></div>` 
      : "";

    const html = `
      <div class="relative flex flex-col items-center justify-center cursor-pointer group">
        ${pulseHtml}
        ${driverRing}
        <!-- Marker Body -->
        <div class="relative w-8 h-8 rounded-xl ${bgClass} border-2 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
          <!-- Heading direction indicator arrow -->
          <div class="absolute -top-2 w-0 h-0 border-x-4 border-x-transparent border-b-[8px] border-b-slate-900 transition-transform"
               style="transform: rotate(${heading}deg); transform-origin: center 20px;">
          </div>
          <!-- Vehicle Icon / Number -->
          <span class="text-[10px] font-mono font-black tracking-tight">
            ${vehicle.vehicle_id ? vehicle.vehicle_id.replace("HV-", "").slice(-3) : "V"}
          </span>
        </div>
        <!-- Tag Label -->
        <div class="mt-1 px-1.5 py-0.5 bg-slate-900/85 text-white text-[9px] font-mono font-medium rounded shadow-sm whitespace-nowrap backdrop-blur-sm pointer-events-none">
          ${vehicle.vehicle_id} ${isCurrentDriver ? "★ (YOU)" : ""}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'safeway-vehicle-marker',
      iconSize: [42, 54],
      iconAnchor: [21, 27]
    });
  };

  // Sync Vehicle Markers & Proximity Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set();

    vehicles.forEach(vehicle => {
      const vid = vehicle.vehicle_id;
      currentMarkerIds.add(vid);

      const lat = vehicle.latitude || vehicle.location?.latitude || MAPTILER_CONFIG.defaultCenter[0];
      const lng = vehicle.longitude || vehicle.location?.longitude || MAPTILER_CONFIG.defaultCenter[1];
      const isCurrentDriver = isDriverView && (vid === driverVehicleId);

      const icon = createVehicleIcon(vehicle, isCurrentDriver);

      if (markersRef.current[vid]) {
        // Update marker position & icon
        const marker = markersRef.current[vid];
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
      } else {
        // Create marker
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.on('click', () => {
          if (onSelectVehicle) onSelectVehicle(vehicle);
        });
        markersRef.current[vid] = marker;
      }
    });

    // Remove obsolete markers
    Object.keys(markersRef.current).forEach(vid => {
      if (!currentMarkerIds.has(vid)) {
        map.removeLayer(markersRef.current[vid]);
        delete markersRef.current[vid];
      }
    });

    // If Driver View: Draw 20m Alert circle and 50m Caution circle around driver's vehicle
    proximityCirclesRef.current.forEach(c => map.removeLayer(c));
    proximityCirclesRef.current = [];

    if (isDriverView && driverVehicleId) {
      const driverVehicle = vehicles.find(v => v.vehicle_id === driverVehicleId);
      if (driverVehicle) {
        const dLat = driverVehicle.latitude || driverVehicle.location?.latitude;
        const dLng = driverVehicle.longitude || driverVehicle.location?.longitude;

        if (dLat && dLng) {
          // 20m Critical Red Circle
          const dangerCircle = L.circle([dLat, dLng], {
            radius: 20,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '4, 4'
          }).addTo(map);

          // 50m Caution Amber Circle
          const cautionCircle = L.circle([dLat, dLng], {
            radius: 50,
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: '6, 6'
          }).addTo(map);

          proximityCirclesRef.current.push(dangerCircle, cautionCircle);
        }
      }
    }
  }, [vehicles, isDriverView, driverVehicleId]);

  // Pan / FlyTo on focused vehicle change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedVehicle) return;

    const lat = focusedVehicle.latitude || focusedVehicle.location?.latitude;
    const lng = focusedVehicle.longitude || focusedVehicle.location?.longitude;

    if (lat && lng) {
      map.flyTo([lat, lng], 17, {
        animate: true,
        duration: 1.0
      });
    }
  }, [focusedVehicle]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-100 ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Map Header Overlay Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {/* Layer Selector */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveLayer("streets")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              activeLayer === "streets"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("satellite")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              activeLayer === "satellite"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("topo")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              activeLayer === "topo"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Topo Quarry
          </button>
        </div>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(MAPTILER_CONFIG.defaultCenter, MAPTILER_CONFIG.defaultZoom, { duration: 0.8 });
            }
          }}
          title="Reset to Coimbatore Mining Pit Center"
          className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-md border border-slate-200/80 text-slate-600 hover:text-sky-600 hover:bg-slate-50 transition"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Legend Badge Overlay */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs flex items-center gap-3">
        <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">V2V Proximity:</span>
        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Safe (&gt;50m)</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Caution (20-50m)</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-700 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
          <span>Alert (&lt;20m)</span>
        </div>
      </div>
    </div>
  );
}
