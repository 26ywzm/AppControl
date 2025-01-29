chcp 65001
@echo off
cd /d "%~dp0"
title Application Control Server
echo Starting Application Control Server...

:: Check if Node.js is installed
node --version > nul 2>&1
if errorlevel 1 (
    echo [Error] Node.js not found. Please install Node.js first
    echo Please visit https://nodejs.org/ to download and install Node.js
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [Error] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
set IP=%IP:~1%

:: Display access URLs
cls
echo ================================
echo Application Control Server
echo ================================
echo.
echo Server is starting...
echo.
echo Please access using these URLs:
echo Local: http://localhost:3001
echo Network: http://%IP%:3001
echo.
echo ================================
echo.
echo Tip: Press Ctrl+C to stop the server
echo.

:: Start the server
node app.js

pause
