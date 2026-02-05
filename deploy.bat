@echo off
SETLOCAL EnableDelayedExpansion

echo ======================================================
echo    SRI CHAITANYA MESS ATTENDANCE - DEPLOYMENT TOOL
echo ======================================================
echo.

:: 1. Sync Code to GitHub
echo [1/4] Syncing code to GitHub...
git add .
git commit -m "Auto-deploy: Update from one-click tool"
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to push code to GitHub.
    pause
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Code pushed to GitHub.
echo.

:: 2. Trigger Render Backend Deploy
echo [2/4] Triggering Render.com Backend deployment...
powershell -Command "Invoke-RestMethod -Uri 'https://api.render.com/deploy/srv-d6260iig5rbc73ev5l10?key=VnwRdSQp_QU' -Method Post"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to trigger Render deployment.
    pause
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Backend deployment started.
echo.

:: 3. Build Frontend
echo [3/4] Building Frontend for production...
cd client
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Fix code errors first.
    pause
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Build completed.
echo.

:: 4. Deploy to Firebase
echo [4/4] Deploying to Firebase Hosting...
call npx firebase-tools deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase deployment failed. Check if you are logged in.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================
echo    DEPLOYMENT COMPLETE! 🚀
echo    Website: https://mess-attendance-sri-chaitanya.web.app
echo ======================================================
pause
