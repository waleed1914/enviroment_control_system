# Climate Box — touch UI

Front-end for the Raspberry Pi 5 climate box: DHT11 temperature/humidity,
relay-driven heating pad / atomizer / LED, and a 220 V zero-crossing dimmer
for the fan. Includes a responsive **720 × 1280 portrait** layout for the
customer's Raspberry Pi display, with touch-first controls and no scrolling on
the main screen.

No build step, no framework, no CDN — plain ES modules, so it runs on the Pi
exactly as it sits in this folder.

## Run it

```bash
cd enviroment_control_system
python3 server.py
```

Then open <http://localhost:8080>. (ES modules need `http://`; opening
`index.html` from the file system will not work.)

Useful while developing: `?tab=sensors` opens straight to a screen.

Kiosk on the Pi:

```bash
chromium-browser --kiosk --incognito --noerrdialogs \
  --disable-pinch --overscroll-history-navigation=0 \
  http://localhost:8080
```

## Screens

| Tab | What it does |
|---|---|
| **Home** | The main dashboard — live sensors, running scene + countdown, manual controls, device states, four scene presets |
| **Scenes** | Edit each preset: working time, fan %, heating pad, atomizer interval. Saved changes apply to a running scene straight away |
| **Devices** | Direct control of each output, with the GPIO it lives on and how long it has been running. Use it for wiring tests |
| **Sensors** | DHT11 history over 5 min / 15 min / 1 h, min-max-now, drag across a chart to read a point |
| **Settings** | Brightness, °C/°F, screen blank, safety limits, GPIO reference, reset |

## Scene presets

Straight from the project notes ([js/config.js](js/config.js)):

| # | Scene | Time | Fan | Heating pad | Atomizer |
|---|---|---|---|---|---|
| 1 | Dry | 15 min | 100 % | on | every 5 min |
| 2 | Heat | 15 min | 40 % | on | every 15 min |
| 3 | Refresh | 15 min | 75 % | off | every 3 min |
| 4 | Daily | 30 min | 50 % | off | every 10 min |

The LED light is deliberately **not** part of a scene — the notes never tie it
to one, so it stays where you leave it when a cycle ends.

## Layout of the code

```
index.html            shell: top bar, view host, bottom nav
css/style.css         every style; sizes are rem, root font-size scales to the viewport
js/config.js          scenes, dropdown choices, safety limits, GPIO map  ← tune here first
js/api.js             the only file that talks to hardware
js/store.js           state + scene engine (countdown, atomizer pulses, safety trips)
js/ui.js              DOM and formatting helpers
js/icons.js           inline SVG icon set
js/views/*.js         one file per tab: mount(root) -> { update(state) }
js/app.js             boot, routing, clock, toasts
```

Views never touch state directly. They call `actions.*` and redraw from the
snapshot handed to them in `update(state)`.

## Wiring the real hardware in

`server.py` serves the UI, reads the DHT11, and controls the connected outputs.
`index.html` enables the HTTP backend by default. Its API is:

```
GET  /api/state                -> { sensors: { temp, humidity } }
POST /api/fan       {value}    -> 0-100, zero-cross dimmer duty
POST /api/heater    {on}       -> relay
POST /api/atomizer  {on}       -> relay
POST /api/led       {on}       -> relay
```

Two things to keep in step between this UI and the Python side:

- **GPIO numbers** live in `PINOUT` in [js/config.js](js/config.js) (BCM numbering).
- **`FAN_MIN_DUTY`** — below 25 % the dimmer is switched off rather than left
  humming, because most AC fans will not start down there. Enforce the same
  floor in firmware.

Current connected wiring (physical 40-pin header numbering):

- DHT11 data: physical pin 7 (BCM GPIO4)
- Atomizer relay: physical pin 37 (BCM GPIO26)
- Light relay: physical pin 38 (BCM GPIO20)
- Heating pad relay: physical pin 40 (BCM GPIO21)

The heating pad, light, and atomizer relay channels are active-low.

## Safety behaviour already built in

- Heating pad is cut, and blocked from being switched on, above the temperature
  limit (default 45 °C).
- Misting is skipped and retried above the humidity limit (default 95 %RH).
- Ending or stopping a cycle switches the fan, heater and atomizer off.
- Touching a manual control during a cycle flags it **MANUAL OVERRIDE** rather
  than silently drifting from the preset.

These are UI-level guards. A browser tab is not a safety interlock; use
independent thermal protection and correctly rated switching hardware.

## Not done yet

- Fan GPIO control (the API retains its requested value until the fan hardware
  is connected).
- Scene changes persist to `localStorage`, not to a file on the Pi.
- Screen brightness is applied as a CSS dim; on the Pi it should write to
  `/sys/class/backlight/…/brightness` through the backend.
