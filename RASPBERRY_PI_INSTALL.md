# Climate Box — Easy Raspberry Pi Installation

This guide installs the Climate Box software on a new Raspberry Pi and starts
it automatically whenever the Pi boots.

## 1. Hardware pins

Use physical header pin numbers when wiring:

| Device | Physical pin | BCM GPIO | Logic |
|---|---:|---:|---|
| DHT11 data | 7 | GPIO4 | sensor input |
| Fan zero-cross | 11 | GPIO17 | input |
| Fan dimmer gate | 12 | GPIO18 | output |
| Atomizer relay | 37 | GPIO26 | active-low |
| Light relay | 38 | GPIO20 | active-high |
| Heating-pad relay | 40 | GPIO21 | active-high |

Keep mains power disconnected while installing or changing wiring. Use
properly isolated, correctly rated relay and triac hardware.

## 2. Prepare Raspberry Pi OS

Open Terminal and update the Pi:

```bash
sudo apt update
sudo apt upgrade -y
```

Install the required packages:

```bash
sudo apt install -y git chromium python3-pip python3-rpi-lgpio python3-lgpio libgpiod2
```

Install the DHT11 library:

```bash
sudo python3 -m pip install --break-system-packages adafruit-circuitpython-dht
```

If an old `RPi.GPIO` package was installed with pip, remove it so it does not
override `rpi-lgpio`:

```bash
python3 -m pip uninstall --break-system-packages -y RPi.GPIO
sudo python3 -m pip uninstall --break-system-packages -y RPi.GPIO
```

## 3. Download Climate Box

```bash
cd ~
git clone https://github.com/waleed1914/enviroment_control_system.git
cd ~/enviroment_control_system
```

Check the Python files:

```bash
python3 -m py_compile server.py read_dht.py
```

## 4. Test the DHT11

Only one program may use the DHT11 at a time. Before starting the full app,
run:

```bash
cd ~/enviroment_control_system
timeout 20 sudo python3 read_dht.py
```

Expected output:

```json
{"temp": 25.0, "humidity": 55}
```

If GPIO4 is busy, close Thonny and other Python programs, then reboot and test
again.

## 5. Test the complete application

Start the backend:

```bash
cd ~/enviroment_control_system
sudo python3 server.py
```

It should display:

```text
Climate Box running at http://localhost:8080
```

Keep that terminal open. Open another terminal and test the API:

```bash
curl --max-time 5 http://localhost:8080/api/state
```

Open the interface:

```bash
chromium --kiosk --app=http://localhost:8080 --password-store=basic
```

Exit kiosk mode with `Alt+F4`. Stop the backend with `Ctrl+C`.

## 6. Start the backend automatically

Find your username:

```bash
whoami
```

The examples below use `maxbeuse`. If your username is different, replace
`maxbeuse` in both paths.

Create the service:

```bash
sudo nano /etc/systemd/system/climate-box.service
```

Paste:

```ini
[Unit]
Description=Climate Box GPIO Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/maxbeuse/enviroment_control_system
ExecStart=/usr/bin/python3 /home/maxbeuse/enviroment_control_system/server.py
Restart=on-failure
RestartSec=3
KillMode=control-group
TimeoutStopSec=20
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Save with `Ctrl+O`, Enter, then exit with `Ctrl+X`.

Enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now climate-box.service
```

Check it:

```bash
sudo systemctl status climate-box.service
curl --max-time 5 http://localhost:8080/api/state
```

## 7. Open Chromium automatically

Create the autostart file:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/climate-box-kiosk.desktop
```

Paste:

```ini
[Desktop Entry]
Type=Application
Name=Climate Box Kiosk
Exec=sh -c "sleep 8; chromium --kiosk --app=http://localhost:8080 --no-first-run --disable-session-crashed-bubble --password-store=basic"
Terminal=false
X-GNOME-Autostart-enabled=true
```

Save with `Ctrl+O`, Enter, then exit with `Ctrl+X`.

Enable Raspberry Pi desktop autologin:

```bash
sudo raspi-config nonint do_boot_behaviour B4
```

Reboot:

```bash
sudo reboot
```

The backend and kiosk should now start automatically. All outputs start OFF;
select and start a mode manually.

## 8. Install updates later

Stop the backend, download updates, and start it again:

```bash
sudo systemctl stop climate-box.service
cd ~/enviroment_control_system
git pull
sudo systemctl start climate-box.service
```

Refresh Chromium with `Ctrl+Shift+R` after an interface update.

## 9. Useful troubleshooting commands

Backend status:

```bash
sudo systemctl status climate-box.service
```

Recent backend logs:

```bash
sudo journalctl -u climate-box.service -n 100 --no-pager
```

Restart the backend:

```bash
sudo systemctl restart climate-box.service
```

Check the API:

```bash
curl --max-time 5 http://localhost:8080/api/state
```

Disable automatic startup:

```bash
sudo systemctl disable --now climate-box.service
rm ~/.config/autostart/climate-box-kiosk.desktop
```

