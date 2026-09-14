@echo off
echo ===================================================
echo     SafeWay Fleet Management - Firebase Deployment
echo ===================================================
echo.

echo [1/4] Installing Firebase CLI (if not installed)...
call npm install -g firebase-tools

echo.
echo [2/4] Building the Fleet Management React App...
cd fleet_app
call npm install
call npm run build
cd ..

echo.
echo [3/4] Authenticating with Google...
echo *************************************************************
echo  A secure browser window will open. Please log in with 
echo  kdharanesh6@gmail.com. Do NOT type your password here.
echo *************************************************************
call firebase login

echo.
echo [4/4] Deploying to Firebase Hosting...
call firebase deploy --only hosting

echo.
echo ===================================================
echo Deployment Complete! Check the URL above.
echo ===================================================
pause
