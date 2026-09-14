# SafeWay Sensor Dashboard — PowerShell Process Stopper
Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  SafeWay Sensor Dashboard — Stopping Services" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow

# Kill processes listening on ports 8000 and 5173
$ports = @(8000, 5173)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pidToKill = $c.OwningProcess
            if ($pidToKill -gt 0) {
                Write-Host "Stopping process on port $port (PID: $pidToKill)..." -ForegroundColor Red
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "No active process found on port $port." -ForegroundColor Gray
    }
}

Write-Host "All SafeWay processes have been stopped!" -ForegroundColor Green
