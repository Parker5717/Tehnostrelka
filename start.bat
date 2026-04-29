@echo off
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║     CASPER AR Assistant               ║
echo  ║     Режим: ArUco маркеры              ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0backend"
call .venv\Scripts\activate.bat

echo [*] Запуск сервера...
echo [*] Открой: http://localhost:8000
echo [*] Для телефонов запусти ngrok.bat отдельно
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
