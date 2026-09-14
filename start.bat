@echo off
echo ===================================================
echo   SafeWay Sensor Dashboard — SIH26007 Launcher
echo ===================================================
echo.

set PATH=C:\Users\ELCOT\.local\node_inst;C:\Users\ELCOT\.local\bin;%PATH%

echo Starting Python FastAPI Backend on http://127.0.0.1:8000 ...
start "SafeWay Backend" cmd /k "cd /d d:\Projects\SIH26007\backend && d:\Projects\SIH26007\backend\.venv\Scripts\python.exe run.py"

timeout /t 2 /nobreak >nul

echo Starting React Frontend on http://localhost:5173 ...
start "SafeWay Frontend" cmd /k "cd /d d:\Projects\SIH26007\frontend && npm run dev"

echo.
echo Application started! Opening browser...
start http://localhost:5173
echo ===================================================
pause
