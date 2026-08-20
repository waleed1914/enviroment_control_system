@echo off
setlocal
cd /d "%~dp0"

echo Climate Box Windows Simulator
echo Open http://localhost:8080/?sim=1 after the server starts.
echo Press Ctrl+C to stop the server.
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  start "Climate Box Server" cmd /k python -m http.server 8080
  timeout /t 2 /nobreak >nul
  start "" "http://localhost:8080/?sim=1"
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "Climate Box Server" cmd /k py -3 -m http.server 8080
  timeout /t 2 /nobreak >nul
  start "" "http://localhost:8080/?sim=1"
  goto :eof
)

echo Python 3 was not found. Install Python from https://www.python.org/
echo and enable "Add Python to PATH", then run this file again.
pause
