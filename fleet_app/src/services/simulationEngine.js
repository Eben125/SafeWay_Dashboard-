
class SimulationEngine {
  constructor() {
    this.vehicles = [
      {
        vehicle_id: "HV-TRUCK-101",
        driver_name: "Ramesh Kumar",
        vehicle_type: "Haul Dump Truck (60T)",
        username: "driver_truck101",
        password: "Safe#101R",
        assigned_mine_zone: "Pit-A West Wall",
        status: "active",
        safety_status: "safe",
        front_distance_m: 54.2,
        closest_proximity_m: 51.0,
        speed_kmh: 48.0,
        heading_deg: 85.0,
        latitude: 11.0168,
        longitude: 76.9558
      },
      {
        vehicle_id: "HV-TRUCK-102",
        driver_name: "Murugan S",
        vehicle_type: "Haul Dump Truck (60T)",
        username: "driver_truck102",
        password: "Safe#102M",
        assigned_mine_zone: "Pit-A West Wall",
        status: "active",
        safety_status: "caution",
        front_distance_m: 38.0,
        closest_proximity_m: 36.5,
        speed_kmh: 46.0,
        heading_deg: 85.0,
        latitude: 11.01645,
        longitude: 76.95548
      },
      {
        vehicle_id: "HV-TRUCK-103",
        driver_name: "Karthik V",
        vehicle_type: "Haul Dump Truck (60T)",
        username: "driver_truck103",
        password: "Safe#103K",
        assigned_mine_zone: "Crusher Loading Bay",
        status: "active",
        safety_status: "safe",
        front_distance_m: 76.0,
        closest_proximity_m: 73.8,
        speed_kmh: 44.5,
        heading_deg: 85.0,
        latitude: 11.0161,
        longitude: 76.95519
      },
      {
        vehicle_id: "HV-LOADER-201",
        driver_name: "Suresh M",
        vehicle_type: "Hydraulic Shovel (CAT 6060)",
        username: "driver_loader201",
        password: "Safe#201S",
        assigned_mine_zone: "Berm Bench 4",
        status: "active",
        safety_status: "safe",
        front_distance_m: 110.0,
        closest_proximity_m: 95.0,
        speed_kmh: 12.0,
        heading_deg: 210.0,
        latitude: 11.0175,
        longitude: 76.9565
      },
      {
        vehicle_id: "HV-WATER-301",
        driver_name: "Anbu K",
        vehicle_type: "Water Sprinkler Tanker",
        username: "driver_water301",
        password: "Safe#301A",
        assigned_mine_zone: "Pit Ramp Haul Road",
        status: "active",
        safety_status: "safe",
        front_distance_m: 85.0,
        closest_proximity_m: 82.0,
        speed_kmh: 32.0,
        heading_deg: 45.0,
        latitude: 11.0155,
        longitude: 76.9542
      }
    ];

    this.volumes = {
      thermal_camera: 35,
      mmwave_radar: 45,
      lidar_3d: 50,
      uwb_rf: 25,
      rtk_gnss_imu: 30
    };

    this.activePreset = "balanced";
    this.isRecording = false;
    this.totalPersisted = 1428;
    this.timeCounter = 0;
    this.subscribers = new Set();
    this.fleetSubscribers = new Set();
    this.isSuddenStopActive = false;

    // Pre-generate LiDAR point cloud in memory
    this.lidarPoints = [];
    for (let i = 0; i < 900; i++) {
      const angle = (Math.random() - 0.5) * 1.5;
      const dist = 5 + Math.random() * 60;
      const x = Math.sin(angle) * dist + (Math.random() - 0.5) * 2;
      const z = Math.cos(angle) * dist;
      const y = -1.2 + (Math.sin(dist * 0.1) * 0.4) + (Math.random() * 0.2);
      this.lidarPoints.push(x, y, z);
    }

    if (typeof window !== 'undefined') {
      this.interval = setInterval(() => this.tick(), 100);
    }
  }

  getThroughputHz() {
    let sum = 0;
    for (const k in this.volumes) {
      sum += 1.0 + (this.volumes[k] - 1) * 0.394;
    }
    return parseFloat(sum.toFixed(1));
  }

  setVolume(sensorId, val) {
    this.volumes[sensorId] = Math.max(1, Math.min(100, parseInt(val, 10)));
  }

  setPreset(preset) {
    this.activePreset = preset.toLowerCase();
    const map = {
      low: 15,
      balanced: 35,
      high: 70,
      burst: 100
    };
    const target = map[this.activePreset] || 35;
    for (const k in this.volumes) {
      this.volumes[k] = target;
    }
  }

  startRecording() {
    this.isRecording = true;
  }

  stopRecording() {
    this.isRecording = false;
  }

  triggerSuddenStop(durationSec = 12) {
    this.isSuddenStopActive = true;
    const v1 = this.vehicles.find(v => v.vehicle_id === "HV-TRUCK-101");
    if (v1) {
      v1.speed_kmh = 0;
      v1.safety_status = "alert";
    }
    const v2 = this.vehicles.find(v => v.vehicle_id === "HV-TRUCK-102");
    if (v2) {
      v2.front_distance_m = 16.5;
      v2.closest_proximity_m = 16.5;
      v2.safety_status = "alert";
    }

    setTimeout(() => {
      this.isSuddenStopActive = false;
      if (v1) {
        v1.speed_kmh = 48.0;
        v1.safety_status = "safe";
      }
      if (v2) {
        v2.front_distance_m = 38.0;
        v2.closest_proximity_m = 36.5;
        v2.safety_status = "caution";
      }
    }, durationSec * 1000);
  }

  tick() {
    this.timeCounter += 0.1;

    if (this.isRecording) {
      const rate = this.getThroughputHz();
      this.totalPersisted += Math.round(rate * 0.1);
    }

    const v1 = this.vehicles[0];
    const v2 = this.vehicles[1];

    if (!this.isSuddenStopActive) {
      const dist = 36 + Math.sin(this.timeCounter * 0.8) * 8;
      v2.front_distance_m = parseFloat(dist.toFixed(1));
      v2.closest_proximity_m = parseFloat((dist - 1.5).toFixed(1));
      v2.safety_status = dist < 20 ? "alert" : dist < 50 ? "caution" : "safe";
    }

    const payload = this.generateSnapshot();
    for (const cb of this.subscribers) cb(payload);
    for (const cb of this.fleetSubscribers) cb({ type: "fleet_snapshot", vehicles: this.vehicles, alerts: payload.alerts });
  }

  generateSnapshot() {
    const v1 = this.vehicles[0];
    const v2 = this.vehicles[1];
    const radarDist = v2.front_distance_m;

    let thermalDataUrl = "";
    if (typeof document !== 'undefined') {
      try {
        const c = document.createElement('canvas');
        c.width = 480;
        c.height = 320;
        const ctx = c.getContext('2d');
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 0, 320);
          grad.addColorStop(0, '#100424');
          grad.addColorStop(0.4, '#38006b');
          grad.addColorStop(0.7, '#8b0069');
          grad.addColorStop(1, '#d84315');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 480, 320);

          ctx.fillStyle = '#4a148c';
          ctx.beginPath();
          ctx.moveTo(0, 160);
          ctx.lineTo(480, 160);
          ctx.lineTo(480, 320);
          ctx.lineTo(0, 320);
          ctx.fill();

          const truckX = 200 + Math.sin(this.timeCounter * 0.5) * 20;
          const truckY = 120;
          const radGrad = ctx.createRadialGradient(truckX + 40, truckY + 50, 5, truckX + 40, truckY + 50, 70);
          radGrad.addColorStop(0, '#ffff8d');
          radGrad.addColorStop(0.4, '#ffab00');
          radGrad.addColorStop(0.8, '#dd2c00');
          radGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(truckX + 40, truckY + 50, 70, 0, Math.PI * 2);
          ctx.fill();

          const pedX = 80 + Math.sin(this.timeCounter * 0.3) * 10;
          const pedGrad = ctx.createRadialGradient(pedX + 15, 180, 2, pedX + 15, 180, 30);
          pedGrad.addColorStop(0, '#ffffcc');
          pedGrad.addColorStop(0.5, '#ff5722');
          pedGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pedGrad;
          ctx.beginPath();
          ctx.arc(pedX + 15, 180, 30, 0, Math.PI * 2);
          ctx.fill();

          thermalDataUrl = c.toDataURL('image/jpeg', 0.7);
        }
      } catch (e) {}
    }

    const alerts = [];
    if (v2.safety_status === "alert") {
      alerts.push({
        id: "ALT-001",
        severity: "critical",
        type: "collision_proximity",
        title: "CRITICAL V2V PROXIMITY ALERT (< 20m)",
        message: "Truck HV-TRUCK-102 clearance collapsed to " + radarDist + "m from lead haul truck. Initiate brake assist.",
        timestamp: new Date().toLocaleTimeString()
      });
    } else if (v2.safety_status === "caution") {
      alerts.push({
        id: "ALT-002",
        severity: "warning",
        type: "caution_distance",
        title: "CAUTION ZONE DISTANCE (20m - 50m)",
        message: "Maintaining " + radarDist + "m gap to forward vehicle in Pit-A extraction lane.",
        timestamp: new Date().toLocaleTimeString()
      });
    }

    return {
      type: "sensor_snapshot",
      isRecording: this.isRecording,
      totalPersisted: this.totalPersisted,
      throughputHz: this.getThroughputHz(),
      activePreset: this.activePreset,
      volumes: { ...this.volumes },
      alerts,
      readings: {
        thermal_camera: {
          fps: 14.2,
          ambient_temp_c: 19.4,
          max_detected_temp_c: 86.8,
          image_base64: thermalDataUrl,
          detections: [
            {
              bbox: [180 + Math.round(Math.sin(this.timeCounter * 0.5) * 20), 100, 140, 100],
              label: "Haul Dump Truck (HV-TRUCK-101) - 86.8°C",
              confidence: 0.96
            },
            {
              bbox: [70 + Math.round(Math.sin(this.timeCounter * 0.3) * 10), 150, 40, 75],
              label: "Pit Ground Personnel - 36.8°C",
              confidence: 0.92
            }
          ]
        },
        mmwave_radar: {
          closest_distance_m: radarDist,
          fastest_speed_kmh: 48.0,
          targets: [
            { id: "T1", distance_m: radarDist, azimuth_deg: 2.5, relative_speed_kmh: -1.8, rcs_dbsm: 24.5, type: "Haul Truck" },
            { id: "T2", distance_m: radarDist + 38.0, azimuth_deg: -14.2, relative_speed_kmh: 0.2, rcs_dbsm: 28.0, type: "Excavator" },
            { id: "T3", distance_m: 112.5, azimuth_deg: 24.0, relative_speed_kmh: 5.4, rcs_dbsm: 18.2, type: "Water Sprinkler" }
          ]
        },
        lidar_3d: {
          point_count: 18450,
          cloudburst_attenuation_pct: 7.8,
          full_points: this.lidarPoints,
          road_edge_detected: true,
          berm_locked: true
        },
        uwb_rf: {
          active_tags_count: 3,
          nlos_collision_risk: radarDist < 25,
          tags: [
            { tag_id: "HV-TRUCK-101", x: 4.2, y: radarDist, range_m: radarDist, channel_rssi: -68, nlos: false },
            { tag_id: "HV-LOADER-201", x: 38.5, y: 54.0, range_m: 66.3, channel_rssi: -84, nlos: true },
            { tag_id: "BASE-BEACON-04", x: -22.0, y: 35.0, range_m: 41.3, channel_rssi: -72, nlos: false }
          ]
        },
        rtk_gnss_imu: {
          latitude: v2.latitude,
          longitude: v2.longitude,
          heading_deg: v2.heading_deg,
          speed_kmh: v2.speed_kmh,
          rtk_status: "FIXED",
          satellites_count: 28,
          hdop: 0.64,
          lane_guidance_offset_m: 0.08,
          imu: {
            pitch_deg: parseFloat((0.4 + Math.sin(this.timeCounter * 0.4) * 0.3).toFixed(2)),
            roll_deg: parseFloat((-0.8 + Math.cos(this.timeCounter * 0.3) * 0.4).toFixed(2)),
            accel_x_g: 0.02,
            accel_y_g: 0.04,
            accel_z_g: 1.00
          }
        }
      }
    };
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    cb(this.generateSnapshot());
    return () => this.subscribers.delete(cb);
  }

  subscribeFleet(cb) {
    this.fleetSubscribers.add(cb);
    cb({ type: "fleet_snapshot", vehicles: this.vehicles, alerts: [] });
    return () => this.fleetSubscribers.delete(cb);
  }
}

export const simulator = new SimulationEngine();
