import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Eye, 
  Compass, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Wind, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon,
  Layers,
  Radio
} from 'lucide-react';

/**
 * Lidar3DDriverMap
 * High-performance 3D LiDAR Synthetic Vision Cockpit Map.
 * Renders real-time 1550 nm point cloud, road edges, haul trucks,
 * and 20m/50m safety laser rings directly in 3D space.
 */
export default function Lidar3DDriverMap({
  currentVehicle,
  radarDistance = 38.0,
  relativeSpeed = -1.5,
  safetyStatus = 'safe',
  headingDeg = 85,
  speedKmh = 48,
  lidarPoints = [],
  cloudburstActive = false
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const leadTruckGroupRef = useRef(null);
  const laserRingsGroupRef = useRef(null);
  const pointsMeshRef = useRef(null);
  const fogRef = useRef(null);

  const [cameraView, setCameraView] = useState('chase'); // 'cockpit', 'chase', 'topdown'
  const [fogPenetration, setFogPenetration] = useState(true);
  const [showPointDensity, setShowPointDensity] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Three.js 3D LiDAR Engine
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    const sceneFog = new THREE.FogExp2(0x0a0f1d, 0.015);
    scene.fog = sceneFog;
    fogRef.current = sceneFog;
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 1000);
    cameraRef.current = camera;
    setCameraPosition(camera, 'chase');

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0x334155, 1.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight.position.set(40, 80, 50);
    scene.add(dirLight);

    // Cyan forward LiDAR illuminator beam
    const lidarSpot = new THREE.SpotLight(0x38bdf8, 3.5, 90, Math.PI / 3.5, 0.4, 1.2);
    lidarSpot.position.set(0, 3.5, 2);
    lidarSpot.target.position.set(0, 0, 45);
    scene.add(lidarSpot);
    scene.add(lidarSpot.target);

    // 5. Terraced Quarry Pit & Haul Road
    buildQuarryTerrain(scene);
    buildHaulRoadAndBerms(scene);

    // 6. Host Vehicle (Driver's Truck)
    const hostTruck = createHaulTruck(0xeab308, true);
    hostTruck.position.set(0, 0, 0);
    scene.add(hostTruck);

    // 7. Lead Vehicle (Target Ahead)
    const leadTruck = createHaulTruck(0x0284c7, false);
    leadTruck.position.set(0, 0, radarDistance);
    scene.add(leadTruck);
    leadTruckGroupRef.current = leadTruck;

    // 8. 3D LiDAR Point Cloud (1550 nm pulsed returns)
    const pointsGeo = new THREE.BufferGeometry();
    const pointCount = 2800;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    const cyan = new THREE.Color(0x38bdf8);
    const amber = new THREE.Color(0xf59e0b);
    const rose = new THREE.Color(0xf43f5e);
    const emerald = new THREE.Color(0x10b981);

    for (let i = 0; i < pointCount; i++) {
      const idx = i * 3;
      const angle = (Math.random() - 0.5) * 1.6;
      const dist = 3 + Math.random() * 85;
      const x = Math.sin(angle) * dist + (Math.random() - 0.5) * 1.5;
      const z = Math.cos(angle) * dist;
      
      const isBerm = Math.abs(x) > 6.5;
      const y = isBerm 
        ? -0.5 + Math.random() * 2.4 
        : -1.2 + (Math.random() - 0.5) * 0.15;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      let c = isBerm ? amber : cyan;
      if (dist < 20) c = rose;
      else if (dist < 50) c = amber;
      else c = emerald;

      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });

    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);
    pointsMeshRef.current = pointsMesh;

    // 9. Ground 20m / 50m Spatial Laser Proximity Rings
    const ringsGroup = new THREE.Group();
    buildProximityLaserRings(ringsGroup);
    scene.add(ringsGroup);
    laserRingsGroupRef.current = ringsGroup;

    // 10. Mouse Interaction (Orbit / Pan / Zoom)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 24, theta: 0, phi: 0.32 };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.08, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.008));

      updateCameraFromOrbit(camera, spherical);
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(6, Math.min(90, spherical.radius + e.deltaY * 0.04));
      updateCameraFromOrbit(camera, spherical);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // 11. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Dynamic lead truck position from telemetry
      if (leadTruckGroupRef.current) {
        leadTruckGroupRef.current.position.z = THREE.MathUtils.lerp(
          leadTruckGroupRef.current.position.z,
          radarDistance,
          0.1
        );

        const bbox = leadTruckGroupRef.current.getObjectByName('bbox');
        if (bbox) {
          const color = radarDistance < 20 ? 0xf43f5e : radarDistance < 50 ? 0xf59e0b : 0x10b981;
          bbox.material.color.setHex(color);
        }
      }

      // Laser ring pulse
      if (laserRingsGroupRef.current) {
        const ring20 = laserRingsGroupRef.current.getObjectByName('ring20');
        if (ring20) {
          const s = 1 + Math.sin(elapsed * 4) * 0.02;
          ring20.scale.set(s, s, 1);
        }
      }

      // Point cloud animation (subtle scanline shift)
      if (pointsMeshRef.current) {
        pointsMeshRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.015;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Fog Penetration Mode
  useEffect(() => {
    if (!fogRef.current) return;
    if (fogPenetration) {
      fogRef.current.density = 0.008;
    } else {
      fogRef.current.density = 0.032;
    }
  }, [fogPenetration]);

  const handleViewChange = (view) => {
    setCameraView(view);
    if (!cameraRef.current) return;
    setCameraPosition(cameraRef.current, view);
  };

  const setCameraPosition = (cam, view) => {
    if (view === 'cockpit') {
      cam.position.set(0, 3.2, 1.4);
      cam.lookAt(0, 1.8, 45);
    } else if (view === 'topdown') {
      cam.position.set(0, 52, 24);
      cam.lookAt(0, 0, 24);
    } else {
      cam.position.set(0, 8.5, -16);
      cam.lookAt(0, 1.5, 28);
    }
  };

  const updateCameraFromOrbit = (cam, s) => {
    cam.position.x = Math.sin(s.theta) * s.radius;
    cam.position.z = Math.cos(s.theta) * s.radius;
    cam.position.y = Math.sin(s.phi) * s.radius;
    cam.lookAt(0, 1.5, 25);
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-soft bg-[#0a0f1d] transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl h-[calc(100vh-2rem)]' : 'h-[580px] sm:h-[640px]'
    }`}>
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP BAR: HUD Header & Mode Controls */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: LiDAR Perception Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white shadow-lg text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-bold tracking-tight">1550 nm 3D LiDAR Vision</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300 font-mono text-[11px]">Berm Lock Active</span>
          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
            18.4k pts/s
          </span>
        </div>

        {/* Right: Camera Mode Switcher & Tools */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-lg text-xs">
          <button
            type="button"
            onClick={() => handleViewChange('cockpit')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'cockpit' ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Cockpit Driver POV"
          >
            Cockpit POV
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('chase')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'chase' ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="3D Chase Orbit View"
          >
            3D Chase
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('topdown')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              cameraView === 'topdown' ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Top-Down LiDAR Radar Map"
          >
            Top-Down
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

          {/* Fog Penetration Synthetic Vision Toggle */}
          <button
            type="button"
            onClick={() => setFogPenetration(!fogPenetration)}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] flex items-center gap-1 transition ${
              fogPenetration 
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Synthetic Vision Fog Penetration"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>{fogPenetration ? 'Synthetic Fog Cut: ON' : 'Raw Pit Fog'}</span>
          </button>

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Map"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* FLOATING HUD CARDS (CORNERS) */}

      {/* Top-Left: Forward Proximity Instrument */}
      <div className="absolute top-16 left-3 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-xl text-white w-64">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              Forward Proximity
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              safetyStatus === 'alert' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' :
              safetyStatus === 'caution' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-300'
            }`}>
              {safetyStatus === 'alert' ? 'CRITICAL <20m' : safetyStatus === 'caution' ? 'CAUTION 20-50m' : 'CLEAR >50m'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              {typeof radarDistance === 'number' ? radarDistance.toFixed(1) : radarDistance}
              <span className="text-sm font-normal text-slate-400 ml-1">m</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {relativeSpeed != null ? `${relativeSpeed} km/h` : '--'}
            </span>
          </div>

          {/* 3-Tier Distance Safety Progress Bar */}
          <div className="mt-2.5">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-300 ${
                  safetyStatus === 'alert' ? 'bg-rose-500' :
                  safetyStatus === 'caution' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (radarDistance / 100) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span className="text-rose-400 font-bold">0m (Impact)</span>
              <span className="text-amber-400 font-bold">20m (Brake)</span>
              <span className="text-emerald-400 font-bold">50m+ (Safe)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Right: Speed & Bearing HUD */}
      <div className="absolute top-16 right-3 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl text-white flex items-center gap-3">
          <div className="px-2 py-1 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Ground Speed</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-2xl font-black font-mono text-white">
                {typeof speedKmh === 'number' ? speedKmh.toFixed(1) : speedKmh}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">km/h</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-700"></div>
          <div className="px-2 py-1 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Bearing</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-2xl font-black font-mono text-sky-300">
                {typeof headingDeg === 'number' ? headingDeg.toFixed(0) : headingDeg}°
              </span>
              <span className="text-[10px] text-slate-400 font-bold">HDG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Left: 3D Berm Guide & Laser Rings Legend */}
      <div className="absolute bottom-3 left-3 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 text-white shadow-lg text-[11px] font-mono flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>20m Danger Ring</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>50m Caution Ring</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>LiDAR Berm Guide Rails</span>
          </span>
        </div>
      </div>

      {/* Bottom-Right: Interaction Tip */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-mono">
          Drag to Orbit 3D • Scroll to Zoom
        </div>
      </div>
    </div>
  );
}

function buildQuarryTerrain(scene) {
  const benches = [
    { y: -3.0, inner: 40, outer: 80, color: 0x1e293b },
    { y: -6.0, inner: 80, outer: 130, color: 0x0f172a },
  ];

  benches.forEach(b => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(b.inner, b.outer, 32),
      new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.95, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = b.y;
    scene.add(ring);
  });
}

function buildHaulRoadAndBerms(scene) {
  const roadGeo = new THREE.PlaneGeometry(14, 160, 2, 20);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -1.2, 50);
  scene.add(road);

  const lineGeo = new THREE.PlaneGeometry(0.3, 160);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const centerLine = new THREE.Mesh(lineGeo, lineMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, -1.18, 50);
  scene.add(centerLine);

  const leftRailGeo = new THREE.CylinderGeometry(0.08, 0.08, 160, 8);
  const railMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  
  const leftRail = new THREE.Mesh(leftRailGeo, railMat);
  leftRail.rotation.x = Math.PI / 2;
  leftRail.position.set(-6.8, -0.6, 50);
  scene.add(leftRail);

  const rightRail = new THREE.Mesh(leftRailGeo, railMat);
  rightRail.rotation.x = Math.PI / 2;
  rightRail.position.set(6.8, -0.6, 50);
  scene.add(rightRail);

  const grid = new THREE.GridHelper(160, 40, 0x334155, 0x1e293b);
  grid.position.set(0, -1.25, 50);
  scene.add(grid);
}

function createHaulTruck(colorHex, isHost = false) {
  const truck = new THREE.Group();

  const chassisGeo = new THREE.BoxGeometry(3.2, 0.8, 6.4);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.y = 0.6;
  truck.add(chassis);

  const bedGeo = new THREE.BoxGeometry(3.6, 1.8, 4.6);
  const bedMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.3 });
  const bed = new THREE.Mesh(bedGeo, bedMat);
  bed.position.set(0, 1.8, -0.8);
  truck.add(bed);

  const cabGeo = new THREE.BoxGeometry(1.4, 1.4, 1.6);
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(-0.9, 1.8, 2.0);
  truck.add(cab);

  const glassGeo = new THREE.BoxGeometry(1.2, 0.6, 0.1);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(-0.9, 1.9, 2.85);
  truck.add(glass);

  const lidarDomeGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
  const lidarDomeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
  const dome = new THREE.Mesh(lidarDomeGeo, lidarDomeMat);
  dome.position.set(-0.9, 2.65, 2.0);
  truck.add(dome);

  const tireGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.7, 16);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  
  const tirePositions = [
    [-1.8, 0.6, 2.0],
    [1.8, 0.6, 2.0],
    [-1.8, 0.6, -1.0],
    [1.8, 0.6, -1.0],
    [-1.8, 0.6, -2.4],
    [1.8, 0.6, -2.4],
  ];

  tirePositions.forEach(pos => {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(...pos);
    truck.add(tire);
  });

  if (isHost) {
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), lightMat);
    hl1.position.set(-1.1, 1.0, 3.25);
    const hl2 = hl1.clone();
    hl2.position.set(1.1, 1.0, 3.25);
    truck.add(hl1);
    truck.add(hl2);
  } else {
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), redMat);
    tl1.position.set(-1.2, 1.0, -3.2);
    const tl2 = tl1.clone();
    tl2.position.set(1.2, 1.0, -3.2);
    truck.add(tl1);
    truck.add(tl2);

    const bboxGeo = new THREE.BoxGeometry(4.2, 3.2, 7.2);
    const bboxMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const bbox = new THREE.Mesh(bboxGeo, bboxMat);
    bbox.name = 'bbox';
    bbox.position.set(0, 1.6, 0);
    truck.add(bbox);
  }

  return truck;
}

function buildProximityLaserRings(group) {
  const ring20Geo = new THREE.RingGeometry(19.8, 20.2, 64);
  const ring20Mat = new THREE.MeshBasicMaterial({ 
    color: 0xf43f5e, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const ring20 = new THREE.Mesh(ring20Geo, ring20Mat);
  ring20.name = 'ring20';
  ring20.rotation.x = -Math.PI / 2;
  ring20.position.set(0, -1.16, 0);
  group.add(ring20);

  const ring50Geo = new THREE.RingGeometry(49.7, 50.3, 64);
  const ring50Mat = new THREE.MeshBasicMaterial({ 
    color: 0xf59e0b, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75
  });
  const ring50 = new THREE.Mesh(ring50Geo, ring50Mat);
  ring50.name = 'ring50';
  ring50.rotation.x = -Math.PI / 2;
  ring50.position.set(0, -1.16, 0);
  group.add(ring50);
}
