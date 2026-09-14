@echo off
echo ===================================================
echo   SafeWay Sensor Dashboard — Stopping Services
echo ===================================================
echo.

echo Stopping Python Backend on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Frontend on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All SafeWay processes stopped successfully!
echo ===================================================
pause
