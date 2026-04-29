@echo off
title CASPER AR Assistant

echo.
echo  ========================================
echo   CASPER AR Assistant
echo   Mode: ArUco markers
echo  ========================================
echo.

cd /d "C:\Users\demas\PycharmProjects\Tehnostrelka\backend"

echo [*] Starting server...
echo [*] Open: http://localhost:8000
echo.

.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
pause
