import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, CloudRain, RotateCcw, ZoomIn, ZoomOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import InputVolumeSlider from '../common/InputVolumeSlider';
import SensorSpecBadge from '../common/SensorSpecBadge';

export default function Lidar3DPanel({ 
  reading, 
  volume, 
  onVolumeChange 
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const pointsMeshRef = useRef(null);
  const rendererRef = useRef(null);
  const [cloudburstActive, setCloudburstActive] = useState(false);

  const fullPoints = reading?.full_points || reading?.points_sample || [];
  const attenuation = cloudburstActive ? 26.5 : (reading?.cloudburst_attenuation_pct ?? 8.5);
  const signalQuality = Math.round(100 - attenuation);
  const pointCount = reading?.point_count ?? 18400;

  // Initialize Three.js 3D Point Cloud Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 canvas
    sceneRef.current = scene;

    // Camera (Perspetive)
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 8, -14);
    camera.lookAt(0, -0.5, 25);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid Floor
    const gridHelper = new THREE.GridHelper(80, 40, 0x334155, 0x1e293b);
    gridHelper.position.set(0, -1.3, 30);
    scene.add(gridHelper);

    // Host Vehicle Representation
    const carGeo = new THREE.BoxGeometry(2.0, 1.2, 4.0);
    const carMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true });
    const carMesh = new THREE.Mesh(carGeo, carMat);
    carMesh.position.set(0, -0.5, 0);
    scene.add(carMesh);

    // Points Geometry placeholder
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });
    const pointsMesh = new THREE.Points(geometry, material);
    scene.add(pointsMesh);
    pointsMeshRef.current = pointsMesh;

    // Orbit Interaction via Mouse Drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let cameraAngle = { theta: 0, phi: 0.35, radius: 22 };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      cameraAngle.theta -= dx * 0.008;
      cameraAngle.phi = Math.max(0.05, Math.min(Math.PI / 2.2, cameraAngle.phi + dy * 0.008));

      camera.position.x = Math.sin(cameraAngle.theta) * cameraAngle.radius;
      camera.position.z = Math.cos(cameraAngle.theta) * cameraAngle.radius;
      camera.position.y = Math.sin(cameraAngle.phi) * cameraAngle.radius;
      camera.lookAt(0, -0.5, 25);
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      cameraAngle.radius = Math.max(8, Math.min(60, cameraAngle.radius + e.deltaY * 0.03));
      camera.position.x = Math.sin(cameraAngle.theta) * cameraAngle.radius;
      camera.position.z = Math.cos(cameraAngle.theta) * cameraAngle.radius;
      camera.position.y = Math.sin(cameraAngle.phi) * cameraAngle.radius;
      camera.lookAt(0, -0.5, 25);
      e.preventDefault();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (mountRef.current && dom) {
        mountRef.current.removeChild(dom);
      }
    };
  }, []);

  // Update Point Cloud vertices & colors whenever new reading arrives
  useEffect(() => {
    if (!pointsMeshRef.current || fullPoints.length === 0) return;

    const positions = [];
    const colors = [];

    fullPoints.forEach((pt) => {
      // Apply cloudburst attenuation noise if active
      const attScale = cloudburstActive ? (0.7 + Math.random() * 0.3) : 1.0;
      positions.push(pt.x, pt.y, pt.z);

      // Color coding based on classification
      if (pt.classification === "edge") {
        // Road Edge Curbstone -> Bright Emerald Green
        colors.push(0.1, 0.95 * attScale, 0.4);
      } else if (pt.classification === "berm") {
        // Roadside Berm -> Amber Warning
        colors.push(0.98 * attScale, 0.75 * attScale, 0.15);
      } else if (pt.classification === "obstacle") {
        // Vehicle/Obstacle -> Vibrant Coral
        colors.push(0.95 * attScale, 0.25, 0.25);
      } else {
        // Road Surface -> Soft Sky Cyan
        colors.push(0.2 * attScale, 0.65 * attScale, 0.95 * attScale);
      }
    });

    const geometry = pointsMeshRef.current.geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [fullPoints, cloudburstActive]);

  return (
    <div className="space-y-6">
      <SensorSpecBadge
        range="50–100 m"
        immunity="Moderate (Requires multi-echo)"
        keyValue="Accurate road edge & roadside berm detection"
        limitation="Signal attenuates in extreme cloudbursts"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 3D Point Cloud Viewport */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <Box className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="font-semibold text-sm text-slate-800">1550 nm Eye-Safe 3D LiDAR Point Cloud</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                {pointCount.toLocaleString()} pts
              </span>
            </div>

            {/* Cloudburst Attenuation Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCloudburstActive(!cloudburstActive)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition border ${
                  cloudburstActive
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>{cloudburstActive ? 'Cloudburst: Attenuated' : 'Simulate Cloudburst'}</span>
              </button>
            </div>
          </div>

          {/* Three.js Canvas Container */}
          <div 
            ref={mountRef} 
            className="relative aspect-[16/11] bg-slate-900 cursor-grab active:cursor-grabbing select-none"
          >
            {/* Control Hints HUD */}
            <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white pointer-events-none">
              <div className="text-sky-400 font-semibold text-[11px] mb-1">3D CONTROLS</div>
              <div className="text-slate-300">Drag: Rotate 3D View</div>
              <div className="text-slate-300">Scroll: Zoom Depth</div>
            </div>

            {/* Legend Classification Badges */}
            <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-sm p-2.5 rounded-xl border border-slate-800 text-xs text-white flex flex-wrap gap-2.5 pointer-events-none">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                Road Edge Curb
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                Roadside Berm
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                Road Surface
              </span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                Obstacles
              </span>
            </div>

            {/* Signal Quality HUD Badge */}
            <div className="absolute top-4 right-4 bg-slate-900/85 backdrop-blur-sm p-3 rounded-xl border border-slate-800 text-xs font-mono text-white pointer-events-none">
              <div className="text-slate-400 text-[10px] uppercase">Optical Signal Return</div>
              <div className={`text-lg font-bold ${signalQuality > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {signalQuality}% Quality
              </div>
              <div className="text-[10px] text-slate-400">
                {attenuation > 15 ? 'Multi-echo filtering active' : 'Clear atmospheric path'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Road Edge & Berm Detection Status + Volume */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-5">
            <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Perimeter Geometry
            </h3>

            {/* Road Edge Detection Status Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Road Edge Detection</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  LOCKED
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Pinpoint curbstone boundaries traced up to 75m ahead.
              </p>
            </div>

            {/* Roadside Berm Detection Status Card */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900">Roadside Berm Detection</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Shoulder embankment elevated profile detected at lateral ±7.8m.
              </p>
            </div>

            {/* Attenuation Warning Note */}
            <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                1550nm laser is eye-safe at higher power, but heavy water droplets scatter optical pulses.
              </p>
            </div>
          </div>

          <InputVolumeSlider
            sensorId="lidar_3d"
            volume={volume}
            onChange={onVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
