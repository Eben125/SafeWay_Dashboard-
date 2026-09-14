# SafeWay Sensor Dashboard — PowerShell Launcher
$env:PATH = "C:\Users\ELCOT\.local\node_inst;C:\Users\ELCOT\.local\bin;$env:PATH"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SafeWay Sensor Dashboard — SIH26007 Launcher" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Start Backend
Write-Host "Starting Python FastAPI Backend..." -ForegroundColor Green
Start-Process -FilePath "d:\Projects\SIH26007\backend\.venv\Scripts\python.exe" -ArgumentList "run.py" -WorkingDirectory "d:\Projects\SIH26007\backend"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Vite React Frontend..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "d:\Projects\SIH26007\frontend"

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
Write-Host "Dashboard running at http://localhost:5173" -ForegroundColor Cyan
