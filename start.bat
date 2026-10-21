@echo off
setlocal
title sabrina-listens — Modern Music Downloader
echo ========================================================
echo        sabrina-listens (Soundbound-Inspired)
echo ========================================================
echo.

cd /d "%~dp0backend"
if not exist "venv\Scripts\python.exe" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    echo [INFO] Installing requirements...
    venv\Scripts\pip.exe install -r requirements.txt
)

echo [INFO] Starting backend server at http://127.0.0.1:8000 ...
echo [INFO] Press Ctrl+C to stop.
echo.

start http://127.0.0.1:8000
venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
