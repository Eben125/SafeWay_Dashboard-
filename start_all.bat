@echo off
echo =====================================================================
echo   SafeWay Complete Ecosystem Launcher (SIH26007)
echo   1. Sensor Simulation Backend (Port 8000)
echo   2. Sensor Dashboard Frontend (Port 5173)
echo   3. Sensor Bridge Middleware  (Port 8001)
echo   4. Fleet Management Web App  (Port 5174)
echo =====================================================================
echo.

set PATH=C:\Users\ELCOT\.local\node_inst;C:\Users\ELCOT\.local\bin;%PATH%

echo [1/4] Starting Sensor Simulation Backend on http://127.0.0.1:8000 ...
start "SafeWay Simulation Backend (8000)" cmd /k "cd /d d:\Projects\SIH26007\backend && d:\Projects\SIH26007\backend\.venv\Scripts\python.exe run.py"

timeout /t 2 /nobreak >nul

echo [2/4] Starting Sensor Dashboard Frontend on http://localhost:5173 ...
start "SafeWay Sensor Visualizer (5173)" cmd /k "cd /d d:\Projects\SIH26007\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/4] Starting Sensor Bridge Middleware on http://127.0.0.1:8001 ...
start "SafeWay Sensor Bridge (8001)" cmd /k "cd /d d:\Projects\SIH26007\bridge && d:\Projects\SIH26007\backend\.venv\Scripts\python.exe sensor_bridge.py"

timeout /t 2 /nobreak >nul

echo [4/4] Starting Fleet Management System on http://localhost:5174 ...
start "SafeWay Fleet App (5174)" cmd /k "cd /d d:\Projects\SIH26007\fleet_app && npm run dev"

echo.
echo All 4 services launched successfully!
echo Opening Fleet Management System (http://localhost:5174)...
start http://localhost:5174
echo.
echo =====================================================================
echo Press any key to exit this launcher window (services remain running).
pause >nul
