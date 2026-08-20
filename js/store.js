/* ─────────────────────────────────────────────────────────────
   store.js — single source of truth + the scene engine.
   Views never mutate state directly; they call the actions below
   and re-render from the snapshot they get in subscribe().
   ───────────────────────────────────────────────────────────── */

import {
  SCENES, ATOMIZER_PULSE_SEC, SENSOR_POLL_MS,
  HISTORY_MAX_POINTS, LIMITS, FAN_MIN_DUTY,
} from './config.js';
import { hardware } from './api.js';

/* ── State ──────────────────────────────────────────────────── */

const state = {
  sensors: { temp: null, humidity: null, ok: false, updated: 0 },

  devices: {
    fan: 0,               // 0-100 %
    heater: false,
    led: false,
    atomizerInterval: 5,  // minutes, 0 = off
    atomizerOn: false,    // relay state during a pulse
    atomizerNext: 0,      // seconds until next pulse
  },

  run: {
    sceneId: 1,           // the scene shown / selected
    running: false,
    paused: false,
    override: false,      // a manual control was touched mid-run
    total: SCENES[0].duration,
    remaining: SCENES[0].duration,
    workTime: SCENES[0].duration / 60,  // minutes, user-adjustable
  },

  history: [],            // { t, temp, hum }
  alerts: [],             // { id, level, text }

  settings: {
    unit: 'C',
    brightness: 100,
    screensaverMin: 0,
    sound: false,
    limits: { ...LIMITS },
  },
};

/** Per-scene overrides the user saved on the Scenes screen. */
const sceneOverrides = loadOverrides();

export function getScene(id) {
  const base = SCENES.find((s) => s.id === id) || SCENES[0];
  return { ...base, ...(sceneOverrides[id] || {}) };
}
export function allScenes() { return SCENES.map((s) => getScene(s.id)); }

/* ── Subscriptions ──────────────────────────────────────────── */

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(state)); }
export function getState() { return state; }

/* ── Device actions ─────────────────────────────────────────── */

export const actions = {
  setFan(v, { manual = true } = {}) {
    v = Math.round(clamp(v, 0, 100));
    state.devices.fan = v;
    hardware.setFan(v);
    if (manual && state.run.running) state.run.override = true;
    emit();
  },

  setHeater(on, { manual = true } = {}) {
    if (on && state.sensors.temp !== null && state.sensors.temp >= state.settings.limits.tempMax) {
      pushAlert('critical', `Heater blocked — ${state.sensors.temp.toFixed(1)} °C is over the limit`);
      return;
    }
    state.devices.heater = !!on;
    hardware.setHeater(!!on);
    if (manual && state.run.running) state.run.override = true;
    emit();
  },

  setLed(on) { state.devices.led = !!on; hardware.setLed(!!on); emit(); },

  setAtomizerInterval(min, { manual = true } = {}) {
    state.devices.atomizerInterval = min;
    state.devices.atomizerNext = min > 0 ? min * 60 : 0;
    if (min === 0) pulseOff();
    if (manual && state.run.running) state.run.override = true;
    emit();
  },

  /** Fire the atomizer once, right now. */
  pulseAtomizer() {
    if (state.sensors.humidity !== null && state.sensors.humidity >= state.settings.limits.humidityMax) {
      pushAlert('warning', 'Misting skipped — humidity at limit');
      return;
    }
    pulseOn();
    emit();
  },

  stopAtomizer() {
    pulseOff();
    emit();
  },

  setWorkTime(min) {
    state.run.workTime = min;
    if (!state.run.running) {
      state.run.total = min * 60;
      state.run.remaining = min * 60;
    }
    emit();
  },

  /* ── Scene control ───────────────────────────────────────── */

  selectScene(id) {
    state.run.sceneId = id;
    const sc = getScene(id);
    if (!state.run.running) {
      state.run.workTime = sc.duration / 60;
      state.run.total = sc.duration;
      state.run.remaining = sc.duration;
    }
    emit();
  },

  startScene(id = state.run.sceneId) {
    const sc = getScene(id);
    state.run.sceneId = id;
    state.run.running = true;
    state.run.paused = false;
    state.run.override = false;
    state.run.total = state.run.workTime * 60;
    state.run.remaining = state.run.total;
    applyScene(sc);
    pushAlert('good', `Scene ${sc.id}: ${sc.name} started`);
    emit();
  },

  pauseScene() {
    if (!state.run.running) return;
    state.run.paused = !state.run.paused;
    if (state.run.paused) allOff({ keepLed: true }); else applyScene(getScene(state.run.sceneId));
    emit();
  },

  stopScene(reason = '') {
    state.run.running = false;
    state.run.paused = false;
    state.run.override = false;
    state.run.remaining = state.run.total;
    allOff({ keepLed: true });
    if (reason) pushAlert('warning', reason);
    emit();
  },

  /* ── Scene editing (Scenes tab) ──────────────────────────── */

  saveScene(id, patch) {
    sceneOverrides[id] = { ...(sceneOverrides[id] || {}), ...patch };
    persistOverrides();
    if (state.run.running && state.run.sceneId === id) applyScene(getScene(id));
    emit();
  },

  resetScene(id) {
    delete sceneOverrides[id];
    persistOverrides();
    if (!state.run.running && state.run.sceneId === id) actions.selectScene(id);
    emit();
  },

  /* ── Misc ────────────────────────────────────────────────── */

  setSetting(path, value) {
    const keys = path.split('.');
    let o = state.settings;
    while (keys.length > 1) o = o[keys.shift()];
    o[keys[0]] = value;
    persistSettings();
    emit();
  },

  dismissAlert(id) {
    state.alerts = state.alerts.filter((a) => a.id !== id);
    emit();
  },

  allOff() { allOff({ keepLed: false }); emit(); },
};

/* ── Internals ──────────────────────────────────────────────── */

function applyScene(sc) {
  actions.setFan(sc.fan, { manual: false });
  actions.setHeater(sc.heater, { manual: false });
  actions.setAtomizerInterval(sc.atomizer, { manual: false });
  if (sc.atomizer > 0) pulseOn();   // one mist right at the start
}

function allOff({ keepLed = true } = {}) {
  actions.setFan(0, { manual: false });
  actions.setHeater(false, { manual: false });
  pulseOff();
  state.devices.atomizerNext = 0;
  if (!keepLed) actions.setLed(false);
}

let pulseTimer = null;
function pulseOn() {
  clearTimeout(pulseTimer);
  state.devices.atomizerOn = true;
  hardware.setAtomizer(true);
  pulseTimer = setTimeout(() => { pulseOff(); emit(); }, ATOMIZER_PULSE_SEC * 1000);
  const iv = state.devices.atomizerInterval;
  state.devices.atomizerNext = iv > 0 ? iv * 60 : 0;
}
function pulseOff() {
  clearTimeout(pulseTimer);
  state.devices.atomizerOn = false;
  hardware.setAtomizer(false);
}

let alertSeq = 0;
export function pushAlert(level, text) {
  const a = { id: ++alertSeq, level, text, t: Date.now() };
  state.alerts = [a, ...state.alerts].slice(0, 6);
  window.dispatchEvent(new CustomEvent('cb:toast', { detail: a }));
  return a;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* ── Clocks ─────────────────────────────────────────────────── */

/** 1 Hz — scene countdown, atomizer scheduling, safety trips. */
function tick() {
  const d = state.devices;

  if (state.run.running && !state.run.paused) {
    state.run.remaining -= 1;

    if (d.atomizerInterval > 0) {
      d.atomizerNext -= 1;
      if (d.atomizerNext <= 0) {
        if (state.sensors.humidity !== null &&
            state.sensors.humidity >= state.settings.limits.humidityMax) {
          d.atomizerNext = 30;   // retry shortly instead of hammering the relay
        } else {
          pulseOn();
        }
      }
    }

    if (state.run.remaining <= 0) {
      state.run.remaining = 0;
      actions.stopScene();
      pushAlert('good', 'Cycle complete');
      return;
    }
  }

  // Safety trip runs whether or not a scene is driving the box.
  const t = state.sensors.temp;
  if (t !== null && d.heater && t >= state.settings.limits.tempMax) {
    actions.setHeater(false, { manual: false });
    pushAlert('critical', `Over-temperature ${t.toFixed(1)} °C — heater cut`);
  }

  emit();
}

let seeded = false;

/** Sensor poll — DHT11 is slow, don't push it under 1 s. */
async function poll() {
  const r = await hardware.read();
  if (!seeded && r.ok && r.temp !== null) { seedHistory(r.temp, r.humidity); seeded = true; }
  state.sensors.temp = r.temp;
  state.sensors.humidity = r.humidity;
  state.sensors.ok = r.ok;
  state.sensors.updated = Date.now();

  if (r.ok && r.temp !== null) {
    state.history.push({ t: Date.now(), temp: r.temp, hum: r.humidity });
    if (state.history.length > HISTORY_MAX_POINTS) state.history.shift();
  }
  emit();
}

/**
 * Give the graphs something to draw on first paint. The curve is shifted so
 * its final point lands on the reading we just took — otherwise the seed and
 * the live data meet in a step that looks like a sensor fault.
 */
function seedHistory(temp, hum) {
  const pts = [];
  const now = Date.now();
  for (let i = 60 * 60; i > 0; i -= 10) {
    const x = (60 * 60 - i) / 60;
    pts.push({
      t: now - i * 1000,
      temp: 22 + Math.sin(x / 7) * 2.4 + Math.sin(x / 2.3) * 0.5 + Math.random() * 0.2,
      hum: 45 + Math.cos(x / 9) * 8 + Math.sin(x / 3.1) * 2 + Math.random() * 0.8,
    });
  }
  const last = pts[pts.length - 1];
  const dT = temp - last.temp, dH = hum - last.hum;
  pts.forEach((p) => { p.temp += dT; p.hum += dH; });
  state.history.unshift(...pts);
}

export function boot() {
  loadSettings();
  actions.selectScene(state.run.sceneId);
  hardware.setLed(state.devices.led);
  poll();
  setInterval(poll, SENSOR_POLL_MS);
  setInterval(tick, 1000);
}

/* ── Persistence (localStorage; swap for the Pi's config file later) ── */

const LS_SCENES = 'cb.scenes';
const LS_SETTINGS = 'cb.settings';

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_SCENES)) || {}; } catch { return {}; }
}
function persistOverrides() {
  try { localStorage.setItem(LS_SCENES, JSON.stringify(sceneOverrides)); } catch {}
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS));
    if (s) Object.assign(state.settings, s, { limits: { ...LIMITS, ...(s.limits || {}) } });
  } catch {}
}
function persistSettings() {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings)); } catch {}
}

export { FAN_MIN_DUTY };
