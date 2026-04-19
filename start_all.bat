@echo off
TITLE Smart Temple Management - One Click Start

echo ==========================================
echo    STARTING SMART TEMPLE AI SYSTEMS
echo ==========================================

:: 1. Start Temple Counter Backend (Port 8010)
echo Starting Temple Counter Backend...
start "Temple Counter" /d "c:\Users\raghu\Videos\TempleCounter" cmd /c "python server.py --temple annavaram --port 8010"

:: 2. Start Temple Parking Backend
echo Starting Temple Parking AI...
start "Parking AI" /d "c:\Users\raghu\Videos\Temple parking using cctv\backend" cmd /c "python main.py --temple annavaram"

:: 3. Start Devotees Dashboard (Port 8001)
echo Starting Devotees Dashboard...
start "Dashboard" /d "c:\Users\raghu\Videos\Devotees" cmd /c "python -m http.server 8001"

:: 4. Start Parking Map View (Port 8002)
echo Starting Parking Map...
start "Parking Map" /d "c:\Users\raghu\Videos\Temple parking using cctv\frontend" cmd /c "python -m http.server 8002"

:: 5. Start Camera Manager (Port 8004)
echo Starting Camera Manager...
start "Camera Manager" /d "c:\Users\raghu\Videos\CameraManager" cmd /c "python -m http.server 8004"

:: 6. Start Unified Admin Console (Port 8005)
echo Starting Unified Admin Console...
start "Admin Console" /d "c:\Users\raghu\Videos\AdminConsole" cmd /c "python -m http.server 8005"

echo.
echo ==========================================
echo    SYSTEMS LAUNCHED SUCCESSFULLY
echo ==========================================
echo URLS:
echo - Counter/Stats:    http://localhost:8010
echo - Main Dashboard:    http://localhost:8001
echo - Parking Map:       http://localhost:8002
echo - Camera Manager:    http://localhost:8004
echo - Admin Console:     http://localhost:8005
echo ==========================================
pause
