#!/usr/bin/env python3
"""Climate Box web server and Raspberry Pi GPIO API."""

import atexit
import json
import signal
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import RPi.GPIO as GPIO


HOST = "0.0.0.0"
PORT = 8080
ROOT = Path(__file__).resolve().parent

# Physical 40-pin header numbering.
HEATER_PIN = 40
LIGHT_PIN = 38
ATOMIZER_PIN = 37

# All three installed relay channels are active-low.
RELAY_ON = GPIO.LOW
RELAY_OFF = GPIO.HIGH
ATOMIZER_ON = GPIO.LOW
ATOMIZER_OFF = GPIO.HIGH

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
GPIO.setup(HEATER_PIN, GPIO.OUT, initial=RELAY_OFF)
GPIO.setup(LIGHT_PIN, GPIO.OUT, initial=RELAY_OFF)
GPIO.setup(ATOMIZER_PIN, GPIO.OUT, initial=ATOMIZER_OFF)

lock = threading.Lock()
state = {
    "sensors": {"temp": None, "humidity": None, "ok": False, "error": "waiting for first reading"},
    "devices": {"fan": 0, "heater": False, "atomizer": False, "led": False},
}
last_dht_error = None


class SafetyError(Exception):
    pass


def set_output(device, on):
    on = bool(on)
    if device == "heater":
        if on:
            temperature = state["sensors"]["temp"]
            if temperature is None:
                raise SafetyError("heater blocked: no valid temperature reading")
            if temperature >= 45:
                raise SafetyError("heater blocked: temperature limit reached")
        GPIO.output(HEATER_PIN, RELAY_ON if on else RELAY_OFF)
    elif device == "atomizer":
        if on:
            humidity = state["sensors"]["humidity"]
            if humidity is not None and humidity >= 95:
                raise SafetyError("atomizer blocked: humidity limit reached")
        GPIO.output(ATOMIZER_PIN, ATOMIZER_ON if on else ATOMIZER_OFF)
    elif device == "led":
        GPIO.output(LIGHT_PIN, RELAY_ON if on else RELAY_OFF)
    else:
        raise ValueError("unknown output")
    state["devices"][device] = on


def read_dht():
    global last_dht_error
    try:
        result = subprocess.run(
            [sys.executable, str(ROOT / "read_dht.py")],
            capture_output=True,
            text=True,
            timeout=6,
            check=True,
        )
        reading = json.loads(result.stdout.strip())
        temperature = reading["temp"]
        humidity = reading["humidity"]
        if temperature is not None and humidity is not None:
            with lock:
                state["sensors"] = {
                    "temp": temperature,
                    "humidity": humidity,
                    "ok": True,
                    "error": None,
                }
            last_dht_error = None
            return
        raise RuntimeError("sensor returned no data")
    except Exception as error:
        # Checksum failures are common with DHT sensors. Keep the last valid
        # values, but report the failure through the API and terminal.
        detail = getattr(error, "stderr", "") or str(error)
        message = f"{type(error).__name__}: {detail.strip()}"
        with lock:
            state["sensors"]["ok"] = False
            state["sensors"]["error"] = message
        if message != last_dht_error:
            print(f"DHT11 read error: {message}", flush=True)
            last_dht_error = message


def sensor_worker():
    while True:
        read_dht()
        time.sleep(2)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/state":
            with lock:
                self.send_json(state)
            return
        super().do_GET()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
            with lock:
                if self.path == "/api/heater":
                    set_output("heater", data.get("on", False))
                elif self.path == "/api/atomizer":
                    set_output("atomizer", data.get("on", False))
                elif self.path == "/api/led":
                    set_output("led", data.get("on", False))
                elif self.path == "/api/fan":
                    # Fan hardware is not connected yet; retain the requested
                    # value so the UI remains usable until it is installed.
                    state["devices"]["fan"] = max(0, min(100, int(data.get("value", 0))))
                else:
                    self.send_json({"error": "not found"}, 404)
                    return
                self.send_json({"ok": True, "devices": state["devices"]})
        except SafetyError as error:
            self.send_json({"error": str(error)}, 409)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, 400)


def cleanup():
    try:
        GPIO.output(HEATER_PIN, RELAY_OFF)
        GPIO.output(LIGHT_PIN, RELAY_OFF)
        GPIO.output(ATOMIZER_PIN, ATOMIZER_OFF)
    finally:
        GPIO.cleanup()


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    threading.Thread(target=sensor_worker, daemon=True).start()

    def stop(_signum, _frame):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    print(f"Climate Box running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    finally:
        server.server_close()


atexit.register(cleanup)

if __name__ == "__main__":
    main()
