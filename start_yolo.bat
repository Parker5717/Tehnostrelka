@echo off
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║     CASPER AR Assistant               ║
echo  ║     Режим: YOLOv8 + ArUco            ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0backend"
call .venv\Scripts\activate.bat

echo [*] Проверяем ultralytics...
python -c "import ultralytics" 2>nul
if errorlevel 1 (
    echo [!] ultralytics не установлен. Устанавливаем...
    pip install -r requirements-yolo.txt
)

echo [*] Запуск сервера с YOLOv8...
echo [*] Открой: http://localhost:8000
echo [*] В HUD появится значок: YOLOv8 ACTIVE
echo.

set CASPER_YOLO=1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
