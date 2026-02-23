@echo off
REM Stock Recommendations Website - Startup Script for Windows

echo ======================================
echo Stock Recommendations Website
echo ======================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server
echo Starting server...
echo.
call npm start
