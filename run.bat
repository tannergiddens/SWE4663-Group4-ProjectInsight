@echo off
setlocal
title Project Insight - Software Effort Monitoring System
cd /d "%~dp0"

echo ========================================================
echo   Launching Project Insight (SWE 4663 - Group 4)
echo ========================================================
echo.

if not exist "dist\index.html" (
  echo Building frontend client...
  call npm run build
)

if not exist "api-services\dist\server.js" (
  echo Compiling backend server...
  call npm --prefix api-services run build
)

echo.
echo Starting Project Insight on http://localhost:3001
echo Opening application in your default browser...
echo (Press Ctrl+C to stop the server when finished)
echo.

node api-services/dist/server.js
if %errorlevel% neq 0 (
  echo.
  echo Server exited with code %errorlevel%.
  pause
)
