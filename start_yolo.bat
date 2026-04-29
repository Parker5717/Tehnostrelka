@echo off
title CASPER AR Assistant - YOLOv8

echo.
echo  ========================================
echo   CASPER AR Assistant
echo   Mode: YOLOv8 + ArUco
echo  ========================================
echo.

cd /d "C:\Users\demas\PycharmProjects\Tehnostrelka\backend"

echo [*] Checking ultralytics...
.venv\Scripts\python.exe -c "import ultralytics" 2>nul
if errorlevel 1 (
    echo [!] Installing ultralytics...
    .venv\Scripts\pip.exe install -r requirements-yolo.txt
)

echo [*] Starting server with YOLOv8...
echo [*] Open: http://localhost:8000
echo [*] Look for badge: YOLOv8 ACTIVE
echo.

set CASPER_YOLO=1
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
