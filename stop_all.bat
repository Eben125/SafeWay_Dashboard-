@echo off
echo =====================================================================
echo   SafeWay Complete Ecosystem — Stopping All Services
echo   Terminating Ports: 8000, 5173, 8001, 5174
echo =====================================================================
echo.

echo Stopping Simulation Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Sensor Dashboard (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Sensor Bridge Middleware (Port 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Fleet Management App (Port 5174)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All SafeWay processes (8000, 5173, 8001, 5174) stopped successfully!
echo =====================================================================
pause
