import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Maximize2, 
  Minimize2, 
  Wind, 
  Radio, 
  Sun, 
  Moon, 
  CloudFog,
  Eye,
  Camera
} from 'lucide-react';

/**
 * Lidar3DDriverMap
 * Immersive Full-Screen 3D LiDAR Synthetic Vision Cockpit Map.
 * Renders real-time 1550 nm point cloud, road edges, haul trucks,
 * and 20m/50m safety laser rings directly in 3D space with Day/Night/Fog modes.
 */
export default function Lidar3DDriverMap({
  currentVehicle,
  radarDistance = 38.0,
  relativeSpeed = -1.5,
  safetyStatus = 'safe',
  headingDeg = 85,
  speedKmh = 48,
  visualMode = 'fog', // 'fog', 'daylight', 'night'
  cameraView = 'chase', // 'cockpit', 'chase', 'topdown'
  onCameraViewChange,
  fogPenetration = true,
  onToggleFogPenetration
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const leadTruckGroupRef = useRef(null);
  const laserRingsGroupRef = useRef(null);
  const pointsMeshRef = useRef(null);
  const fogRef = useRef(null);
  const ambientLightRef = useRef(null);
  const dirLightRef = useRef(null);

  // Initialize Three.js 3D LiDAR Engine
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);
    const sceneFog = new THREE.FogExp2(0x070c18, 0.018);
    scene.fog = sceneFog;
    fogRef.current = sceneFog;
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.2, 1000);
    cameraRef.current = camera;
    setCameraPosition(camera, cameraView);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0x334155, 1.8);
    ambientLightRef.current = ambient;
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    dirLight.position.set(40, 90, 50);
    dirLightRef.current = dirLight;
    scene.add(dirLight);

    // Cyan forward LiDAR illuminator beam
    const lidarSpot = new THREE.SpotLight(0x38bdf8, 3.8, 110, Math.PI / 3.2, 0.35, 1.1);
    lidarSpot.position.set(0, 3.6, 2);
    lidarSpot.target.position.set(0, 0, 48);
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
    const pointCount = 3200;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    const cyan = new THREE.Color(0x38bdf8);
    const amber = new THREE.Color(0xf59e0b);
    const rose = new THREE.Color(0xf43f5e);
    const emerald = new THREE.Color(0x10b981);

    for (let i = 0; i < pointCount; i++) {
      const idx = i * 3;
      const angle = (Math.random() - 0.5) * 1.6;
      const dist = 3 + Math.random() * 90;
      const x = Math.sin(angle) * dist + (Math.random() - 0.5) * 1.5;
      const z = Math.cos(angle) * dist;
      
      const isBerm = Math.abs(x) > 6.5;
      const y = isBerm 
        ? -0.5 + Math.random() * 2.6 
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
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
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
    let spherical = { radius: 25, theta: 0, phi: 0.32 };

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
      spherical.radius = Math.max(6, Math.min(95, spherical.radius + e.deltaY * 0.04));
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
          const s = 1 + Math.sin(elapsed * 4.5) * 0.025;
          ring20.scale.set(s, s, 1);
        }
      }

      // Point cloud animation (subtle scanline shift)
      if (pointsMeshRef.current) {
        pointsMeshRef.current.rotation.y = Math.sin(elapsed * 0.35) * 0.015;
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

  // Sync Camera Mode
  useEffect(() => {
    if (!cameraRef.current) return;
    setCameraPosition(cameraRef.current, cameraView);
  }, [cameraView]);

  // Sync Visual Modes (Daylight, Night, Fog)
  useEffect(() => {
    if (!sceneRef.current || !fogRef.current) return;
    const scene = sceneRef.current;
    const fog = fogRef.current;

    if (visualMode === 'daylight') {
      scene.background.setHex(0x64748b);
      fog.color.setHex(0x64748b);
      fog.density = 0.005;
      if (ambientLightRef.current) ambientLightRef.current.intensity = 2.4;
      if (dirLightRef.current) dirLightRef.current.intensity = 2.2;
    } else if (visualMode === 'night') {
      scene.background.setHex(0x020617);
      fog.color.setHex(0x020617);
      fog.density = 0.009;
      if (ambientLightRef.current) ambientLightRef.current.intensity = 1.0;
      if (dirLightRef.current) dirLightRef.current.intensity = 0.8;
    } else {
      // Default: Dense Pit Fog with Synthetic LiDAR Cut
      scene.background.setHex(0x0a0f1d);
      fog.color.setHex(0x0a0f1d);
      fog.density = fogPenetration ? 0.008 : 0.032;
      if (ambientLightRef.current) ambientLightRef.current.intensity = 1.8;
      if (dirLightRef.current) dirLightRef.current.intensity = 1.5;
    }
  }, [visualMode, fogPenetration]);

  const setCameraPosition = (cam, view) => {
    if (view === 'cockpit') {
      cam.position.set(0, 3.2, 1.4);
      cam.lookAt(0, 1.8, 48);
    } else if (view === 'topdown') {
      cam.position.set(0, 56, 26);
      cam.lookAt(0, 0, 26);
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
    <div className="relative w-full h-full bg-[#070c18] overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
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
