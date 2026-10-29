@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Tessera needs Node.js 20 or newer.
  echo Install it from https://nodejs.org/ and double-click play.cmd again.
  pause
  exit /b 1
)
node scripts\serve.mjs --open
if errorlevel 1 pause
