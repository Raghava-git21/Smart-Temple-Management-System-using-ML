@echo off
setlocal
cd /d %~dp0

echo ==========================================
echo    TEMPLE PARKING AI SYSTEM LAUNCHER
echo ==========================================

:: 1. Start Backend
echo [1/3] 🚀 Starting AI Backend...
cd backend
if exist venv\Scripts\python.exe (
    start "AI Backend" cmd /k "venv\Scripts\python.exe main.py"
) else (
    start "AI Backend" cmd /k "python main.py"
)

:: 2. Start Frontend
echo [2/3] 🌐 Starting Frontend Server...
cd ../frontend
:: We use /B to run it hidden, output will be in this window
start "Frontend Server" /B python -m http.server 8000

:: 3. Open Browser
echo [3/3] ⏳ Waiting 5 seconds for systems to initialize...
timeout /t 5 /nobreak > nul
echo 🖥️ Opening Somnath Dashboard...
start http://localhost:8000/index.html?tid=somnath

echo.
echo ✅ System is running!
echo You can close this window. The backend window will stay open for logs.
timeout /t 10
exit
