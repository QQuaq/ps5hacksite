@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js bulunamadi. Once https://nodejs.org adresinden kur.
  pause
  exit /b 1
)

net session >nul 2>&1
if errorlevel 1 (
  echo Port 80 ve 53 icin yonetici izni isteniyor.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

node server.js
echo.
echo Sunucu kapandi.
pause
