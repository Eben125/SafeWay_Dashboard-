# SafeWay Stop All Services PowerShell Script
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Stopping All SafeWay Services (Ports 8000, 5173, 8001, 5174)" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan

$ports = @(8000, 5173, 8001, 5174)

foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -gt 0) {
                    Write-Host "Stopping process PID $pidToKill listening on port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

Write-Host "`nAll SafeWay services terminated." -ForegroundColor Green
