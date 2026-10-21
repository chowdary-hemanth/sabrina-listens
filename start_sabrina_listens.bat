@echo off
title SABRINA LISTENS
echo ===================================================
echo   SABRINA LISTENS - Starting Local Desktop App
echo ===================================================
echo.
cd /d "%~dp0backend"
call .\venv\Scripts\python.exe desktop_launcher.py
pause
