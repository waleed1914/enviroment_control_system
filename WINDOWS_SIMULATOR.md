# Climate Box Windows Simulator

The Windows simulator runs the complete interface with simulated temperature,
humidity, relays, atomizer, light, and fan behavior. It does not access real
GPIO hardware.

## Easy start

1. Install Python 3 from <https://www.python.org/> if it is not already
   installed. Enable **Add Python to PATH** during installation.
2. Download or clone this repository.
3. Double-click `start_simulator_windows.bat`.
4. The simulator opens at <http://localhost:8080/?sim=1>.

Keep the command window open. Press `Ctrl+C` in it to stop the server.

## Start from PowerShell

```powershell
cd C:\path\to\enviroment_control_system
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/?sim=1
```

The `?sim=1` parameter is required for simulator mode. Without it, the
interface expects the Raspberry Pi hardware API.
