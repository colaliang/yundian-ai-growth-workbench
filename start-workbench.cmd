@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.18 or later first.
  pause
  exit /b 1
)
node "%~dp0scripts\launch.mjs" %*
if errorlevel 1 pause
