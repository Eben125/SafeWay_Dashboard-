# SafeWay Fleet Management & Sensor Telemetry Ecosystem (SIH26007)

An enterprise-grade, two-tier mining fleet safety system featuring an **Admin Fleet Command Dashboard** and a **Driver Cockpit Safety Dashboard**, connected in real time via a **Sensor Bridge Middleware** that ingests multi-spectral live telemetry from the **SafeWay Sensor Dashboard** simulation without modifying the original simulation in any way.

Built for the **Smart India Hackathon (SIH26007)** centered on open-cast limestone quarry operations in **Coimbatore, Tamil Nadu (`11.0168°N, 76.9558°E`)**.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │  SafeWay Sensor Dashboard (SIH26007)     │
                               │  - Backend: FastAPI (Port 8000)         │
                               │  - Frontend: React / Three.js (Port 5173│
                               │  - 5 Sensors (Thermal, Radar, LiDAR...) │
                               └────────────────────┬────────────────────┘
                                                    │
                                         REST / Streaming Output
                                         (Untouched, Isolated Source)
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │     Sensor Bridge Middleware            │
                               │  - Python Middleware (Port 8001)        │
                               │  - Reads live simulation outputs        │
                               │  - Evaluates 3-Tier V2V Safety Cascades │
                               │  - Projects physics onto Coimbatore mine│
                               │  - Pushes to 5 Firestore collections    │
                               └────────────────────┬────────────────────┘
                                                    │
                                         WebSocket & REST API
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │    SafeWay Fleet Management App         │
                               │    (Port 5174 - React + Vite + Leaflet) │
                               ├────────────────────┬────────────────────┤
                               │  Admin Dashboard   │  Driver Dashboard  │
                               │  - Active Counts   │  - Single Vehicle  │
                               │  - MapTiler Mine   │  - Proximity Rings │
                               │  - Reg / Password  │  - V2V Alert Flash │
                               │  - Sensor Drawer   │  - Speed & Cockpit │
                               └────────────────────┴────────────────────┘
```

---

## ⚡ Quick Start: One-Click Launch

To launch all 4 components of the ecosystem simultaneously:

### Windows Batch Launcher:
Double-click `start_all.bat` or run:
```cmd
start_all.bat
```

### PowerShell Launcher:
```powershell
.\start_all.ps1
```

### Stopping All Services:
Double-click `stop_all.bat` or run `.\stop_all.ps1` to cleanly terminate all processes on ports 8000, 5173, 8001, and 5174.

---

## 🌐 Ecosystem Port Allocation

| Component | Port | Description | URL |
|---|---|---|---|
| **Fleet Management Web App** | `5174` | Admin & Driver two-tier dashboards with MapTiler integration | `http://localhost:5174` |
| **Sensor Bridge Middleware** | `8001` | Middleware consuming simulation & pushing to Firestore | `http://127.0.0.1:8001` (`/docs`) |
| **Sensor Simulation Frontend**| `5173` | Original 5-sensor visualizer with Start/End recording buttons | `http://localhost:5173` |
| **Sensor Simulation Backend** | `8000` | Untouched Python FastAPI sensor engine | `http://127.0.0.1:8000` (`/docs`) |

---

## 🔐 Authentication & Roles

Click **"Switch Role"** in the top navigation bar of `http://localhost:5174` to switch between Admin and Driver accounts:

### 1. Admin Supervisor
- **Username**: `admin`
- **Password**: `admin123`
- **Capabilities**:
  - Full Coimbatore mining pit overview on **MapTiler** (Streets, Satellite Quarry, Topo layers).
  - Register new haul trucks/excavators with auto-generated username & password.
  - Search vehicles by ID or driver name with smooth map zoom.
  - Slide-out live sensor drawer (77 GHz mmWave Radar, LWIR Thermal, 1550nm LiDAR, UWB, RTK-GNSS).
  - **V2V Emergency Test**: Button to simulate lead vehicle sudden braking and observe cascading warnings.

### 2. Vehicle Drivers
| Vehicle ID | Role / Equipment | Driver Name | Generated Username | Password |
|---|---|---|---|---|
| `HV-TRUCK-101` | Lead Haul Dump Truck (60T) | Ramesh Kumar | `driver_truck101` | `Safe#101R` |
| `HV-TRUCK-102` | Trailing Truck (38m gap) | Murugan S | `driver_truck102` | `Safe#102M` |
| `HV-TRUCK-103` | Trailing Truck (76m gap) | Karthik V | `driver_truck103` | `Safe#103K` |
| `HV-LOADER-201` | CAT 992K Wheel Loader | Selvan R | `driver_loader201` | `Safe#201S` |
| `HV-EXCAV-301` | Komatsu PC2000 Excavator | Anbarasan M | `driver_excav301` | `Safe#301A` |

---

## 🚨 Cascading V2V Safety Alert Engine

The system implements early-warning chain reaction prevention for heavy mining convoys:
1. **Safe Zone (Green)**: Front vehicle clearance > 50 meters.
2. **Caution Zone (Amber)**: Front clearance 20 – 50 meters.
3. **Critical Alert Zone (Red)**: Front clearance < 20 meters.

### Testing the Chain-Reaction Cascading Alert:
1. Open the **Admin Dashboard** (`http://localhost:5174`).
2. Click **"Trigger Sudden Stop"** in the top metric bar.
3. Lead vehicle `HV-TRUCK-101` instantly brakes to 0 km/h.
4. **Immediate Cascade**:
   - `HV-TRUCK-101`: Status turns **ALERT** (Emergency braking engaged).
   - `HV-TRUCK-102` (directly behind at 38m): Receives high-priority **CRITICAL ALERT** banner: *"🚨 V2V CASCADE: Lead Vehicle Stopped Ahead! Apply retarder brakes immediately!"*.
   - `HV-TRUCK-103` (two vehicles behind at 76m): Receives **WARNING** advisory: *"⚠️ V2V CHAIN-REACTION: Convoy Deceleration Ahead! Reduce speed to 20 km/h."*.
5. Switch to Driver login for `HV-TRUCK-102` or `HV-TRUCK-103` to view the cockpit audio-visual warning in action.

---

## 🗄️ Firebase Firestore Structure (5 Collections)

The Sensor Bridge persists data into Google Firebase project `safeway-d78b8` across the 5 collections:

1. `vehicles`: Vehicle ID, driver name, vehicle type, location coordinates, generated username & password, safety status.
2. `sensor_readings`: Real-time readings per vehicle (Radar distance/speed, LiDAR clusters, UWB distance, GNSS lat/lon).
3. `thermalFrames`: Metadata and frame storage for LWIR thermal camera.
4. `aiDetections`: Fused safety detections and bounding alerts.
5. `userSettings`: Driver/Admin portal preferences, alert thresholds, and audio toggle states.

---

## 🗺️ MapTiler Integration

- **API Key**: `RPFni858bOvPcXMm66cg`
- **Center**: Madukkarai / Walayar Limestone Quarry Sector, Coimbatore (`11.0168°N, 76.9558°E`).
- **Layers**:
  - Light Streets (`streets-v2`)
  - Satellite Quarry Hybrid (`hybrid`)
  - Mining Topography (`topo-v2`)
- **Spatial Markers**: Custom HTML DivIcon markers with heading direction needles and dynamic safety halos (Safe Green, Caution Amber, Alert Blinking Red).
- **Proximity Safety Rings**: In driver view, 20m Danger Zone (red dashed) and 50m Caution Zone (amber dashed) circles are drawn dynamically around the driver's vehicle.
