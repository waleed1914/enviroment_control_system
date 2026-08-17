#!/usr/bin/env python3
"""Perform one isolated DHT11 read and print it as JSON."""

import json
import time

import adafruit_dht
import board


dht = adafruit_dht.DHT11(board.D4)
try:
    # The verified hardware test waits about six seconds before its first
    # sample. Match that warm-up so PulseIn and the DHT11 are fully settled.
    time.sleep(7)
    print(json.dumps({"temp": dht.temperature, "humidity": dht.humidity}))
finally:
    dht.exit()
