#!/usr/bin/env python3
"""Perform one isolated DHT11 read and print it as JSON."""

import json
import time

import adafruit_dht
import board


dht = adafruit_dht.DHT11(board.D4)
try:
    # Let the sensor and PulseIn settle after process initialization.
    time.sleep(1)
    print(json.dumps({"temp": dht.temperature, "humidity": dht.humidity}))
finally:
    dht.exit()
