/* ─────────────────────────────────────────────────────────────
   config.js — everything you are likely to tune lives here.
   Scene values come straight from the project sticky notes.
   ───────────────────────────────────────────────────────────── */

/** Accent keys map to CSS custom properties in css/style.css */
export const SCENES = [
  {
    id: 1, key: 'dry', name: 'DRY', accent: 'green', icon: 'leaf',
    blurb: 'Strong airflow + heat, light misting',
    duration: 15 * 60,   // seconds
    fan: 100,            // % (dimmer)
    heater: true,        // relay
    atomizer: 5,         // pulse once every N minutes (0 = off)
  },
  {
    id: 2, key: 'heat', name: 'HEAT', accent: 'red', icon: 'flame',
    blurb: 'Low airflow, heat held, minimal misting',
    duration: 15 * 60,
    fan: 40,
    heater: true,
    atomizer: 15,
  },
  {
    id: 3, key: 'refresh', name: 'REFRESH', accent: 'blue', icon: 'wind',
    blurb: 'Cool airflow with frequent misting',
    duration: 15 * 60,
    fan: 75,
    heater: false,
    atomizer: 3,
  },
  {
    id: 4, key: 'daily', name: 'DAILY', accent: 'purple', icon: 'sun',
    blurb: 'Long, gentle maintenance cycle',
    duration: 30 * 60,
    fan: 50,
    heater: false,
    atomizer: 10,
  },
];

/** Dropdown choices — keep in minutes. 0 == OFF. */
export const ATOMIZER_INTERVALS = [0, 1, 3, 5, 10, 15, 30];
export const WORK_TIMES         = [5, 10, 15, 20, 30, 45, 60];

/** How long the atomizer relay stays closed on each pulse (seconds). */
export const ATOMIZER_PULSE_SEC = 8;

/**
 * The backend maps UI percentages to the customer's calibrated 0-10 dimmer
 * steps. A non-zero UI value therefore selects at least step 1.
 */
export const FAN_MIN_DUTY = 1;

/** Sensor polling. DHT11 must not be read faster than once per second. */
export const SENSOR_POLL_MS = 2000;

/** Rolling history kept in memory, per range (seconds of data). */
export const HISTORY_RANGES = [
  { key: '5m',  label: '5 MIN',  seconds: 5 * 60 },
  { key: '15m', label: '15 MIN', seconds: 15 * 60 },
  { key: '1h',  label: '1 HOUR', seconds: 60 * 60 },
];
export const HISTORY_MAX_POINTS = 2000;

/** Safety envelope — the scene engine trips out if these are crossed. */
export const LIMITS = {
  tempMax: 45,      // °C — cut the heater above this
  tempMin: 0,
  humidityMax: 95,  // %RH — stop misting above this
};

/**
 * GPIO map (BCM numbering) — documented here so the UI and the future Python
 * service agree on one source of truth. Nothing in the UI drives these pins
 * directly; they are shown on the Settings screen for wiring reference.
 */
export const PINOUT = {
  dht11:        { pin: 4,  note: 'DHT11 data (1-wire, 4k7 pull-up)' },
  relayHeater:  { pin: 21, note: 'Physical pin 40 — heating pad relay' },
  relayAtomizer:{ pin: 26, note: 'Physical pin 37 — atomizer relay' },
  relayLed:     { pin: 20, note: 'Physical pin 38 — light relay' },
  dimmerPwm:    { pin: 18, note: 'Physical pin 12 — fan dimmer gate' },
  dimmerZc:     { pin: 17, note: 'Physical pin 11 — fan zero-cross input' },
};

export const APP = {
  name: 'Climate Box',
  version: '0.3.0-test',
  display: '720 × 1280 portrait · Touch Display 2',
};
