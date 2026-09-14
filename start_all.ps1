# SafeWay Complete Ecosystem PowerShell Launcher (SIH26007)
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  SafeWay Complete Ecosystem Launcher (SIH26007)" -ForegroundColor White
Write-Host "  1. Sensor Simulation Backend (Port 8000)" -ForegroundColor Gray
Write-Host "  2. Sensor Dashboard Frontend (Port 5173)" -ForegroundColor Gray
Write-Host "  3. Sensor Bridge Middleware  (Port 8001)" -ForegroundColor Gray
Write-Host "  4. Fleet Management Web App  (Port 5174)" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor Cyan

$env:PATH = "C:\Users\ELCOT\.local\node_inst;C:\Users\ELCOT\.local\bin;" + $env:PATH

Write-Host "`n[1/4] Starting Sensor Simulation Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Projects\SIH26007\backend; d:\Projects\SIH26007\backend\.venv\Scripts\python.exe run.py"

Start-Sleep -Seconds 2

Write-Host "[2/4] Starting Sensor Dashboard Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Projects\SIH26007\frontend; npm run dev"

Start-Sleep -Seconds 2

Write-Host "[3/4] Starting Sensor Bridge Middleware on port 8001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Projects\SIH26007\bridge; d:\Projects\SIH26007\backend\.venv\Scripts\python.exe sensor_bridge.py"

Start-Sleep -Seconds 2

Write-Host "[4/4] Starting Fleet Management App on port 5174..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Projects\SIH26007\fleet_app; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nAll 4 services launched! Opening Fleet Management System..." -ForegroundColor Green
Start-Process "http://localhost:5174"
