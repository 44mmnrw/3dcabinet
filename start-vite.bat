@echo off
chcp 65001 >nul
title 3DCabinet - Vite Dev Server

echo.
echo ========================================
echo   3DCabinet - Vite Dev Server
echo ========================================
echo.

cd /d "%~dp0"

REM Проверка, запущен ли Vite
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ✅ Vite уже запущен на порту 5174
    echo.
    echo 📍 Local:   http://localhost:5174/
    echo 📍 APP URL: http://3dcabinet.test/configurator
    echo.
    pause
    exit /b 0
)

echo 🚀 Запуск Vite...
echo.

npm run dev

pause
