#!/usr/bin/env python3
"""Climate Box web server and Raspberry Pi GPIO API."""

import atexit
import json
import signal
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import adafruit_dht
import board
import RPi.GPIO as GPIO


HOST = "0.0.0.0"
PORT = 8080
ROOT = Path(__file__).resolve().parent

# Physical 40-pin header numbering.
HEATER_PIN = 40
LIGHT_PIN = 38
ATOMIZER_PIN = 37

# The relay test uses LOW for ON. The atomizer test returns LOW when stopping,
# so it is treated as active-high.
RELAY_ON = GPIO.LOW
RELAY_OFF = GPIO.HIGH
ATOMIZER_ON = GPIO.HIGH
ATOMIZER_OFF = GPIO.LOW

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)
GPIO.setup(HEATER_PIN, GPIO.OUT, initial=RELAY_OFF)
GPIO.setup(LIGHT_PIN, GPIO.OUT, initial=RELAY_OFF)
GPIO.setup(ATOMIZER_PIN, GPIO.OUT, initial=ATOMIZER_OFF)

dht = adafruit_dht.DHT11(board.D4, use_pulseio=False)
lock = threading.Lock()
state = {
    "sensors": {"temp": None, "humidity": None},
    "devices": {"fan": 0, "heater": False, "atomizer": False, "led": False},
}


class SafetyError(Exception):
    pass


def set_output(device, on):
    on = bool(on)
    if device == "heater":
        if on:
            read_dht()
            temperature = state["sensors"]["temp"]
            if temperature is None:
                raise SafetyError("heater blocked: no valid temperature reading")
            if temperature >= 45:
                raise SafetyError("heater blocked: temperature limit reached")
        GPIO.output(HEATER_PIN, RELAY_ON if on else RELAY_OFF)
    elif device == "atomizer":
        if on:
            read_dht()
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
    try:
        temperature = dht.temperature
        humidity = dht.humidity
        if temperature is not None and humidity is not None:
            state["sensors"] = {"temp": temperature, "humidity": humidity}
    except RuntimeError:
        # Transient checksum failures are normal for DHT sensors. Retain the
        # last valid reading and let the next UI poll retry.
        pass


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
                read_dht()
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
        dht.exit()
    finally:
        GPIO.cleanup()


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)

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
