/* ─────────────────────────────────────────────────────────────
   api.js — the ONLY file that talks to hardware.

   Right now it is a simulator so the whole UI can be developed and
   demoed on a laptop. When the Python service exists on the Pi,
   swap `SimHardware` for `HttpHardware` at the bottom of this file
   (or set  window.CB_BACKEND = 'http'  before the app boots).

   The contract the backend has to satisfy:
     GET  /api/state                 -> { sensors, devices }
     POST /api/fan       {value}     -> 0-100  (zero-cross dimmer duty)
     POST /api/heater    {on}        -> relay
     POST /api/atomizer  {on}        -> relay  (pulses are driven by the UI)
     POST /api/led       {on}        -> relay
   ───────────────────────────────────────────────────────────── */

import { FAN_MIN_DUTY } from './config.js';

/* ── Simulated box ──────────────────────────────────────────── */

class SimHardware {
  constructor() {
    this.temp = 22.4;
    this.hum = 44;
    this.out = { fan: 0, heater: false, atomizer: false, led: true };
    this.online = true;
    setInterval(() => this.#tick(), 1000);
  }

  /* A crude but believable thermal model: the heating pad pushes the
     temperature up, the fan drags it back toward ambient, the atomizer
     dumps humidity in and airflow + heat dry it out again. */
  #tick() {
    const ambient = 21.5;
    const fan = this.out.fan / 100;

    let dT = (ambient - this.temp) * (0.006 + fan * 0.035);
    if (this.out.heater) dT += 0.11 - fan * 0.03;
    this.temp += dT + (Math.random() - 0.5) * 0.04;

    let dH = (38 - this.hum) * 0.004;
    if (this.out.atomizer) dH += 2.4;
    if (this.out.heater) dH -= 0.10;
    dH -= fan * 0.16;
    this.hum += dH + (Math.random() - 0.5) * 0.15;

    this.temp = clamp(this.temp, -5, 70);
    this.hum = clamp(this.hum, 5, 99);
  }

  async read() {
    // DHT11 resolution is 1 %RH / 1 °C — round the way the real part reports.
    return {
      temp: Math.round(this.temp * 10) / 10,
      humidity: Math.round(this.hum),
      ok: this.online,
    };
  }

  async setFan(v)       { this.out.fan = v < FAN_MIN_DUTY ? 0 : v; }
  async setHeater(on)   { this.out.heater = !!on; }
  async setAtomizer(on) { this.out.atomizer = !!on; }
  async setLed(on)      { this.out.led = !!on; }
}

/* ── Real Pi backend ────────────────────────────────────────── */

class HttpHardware {
  constructor(base = '') { this.base = base; }

  async #post(path, body) {
    const r = await fetch(this.base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${path} -> ${r.status}`);
    return r.json();
  }

  async read() {
    try {
      const r = await fetch(this.base + '/api/state');
      if (!r.ok) throw new Error(r.status);
      const s = await r.json();
      return { temp: s.sensors.temp, humidity: s.sensors.humidity, ok: true };
    } catch {
      return { temp: null, humidity: null, ok: false };
    }
  }

  setFan(v)       { return this.#post('/api/fan', { value: v }); }
  setHeater(on)   { return this.#post('/api/heater', { on }); }
  setAtomizer(on) { return this.#post('/api/atomizer', { on }); }
  setLed(on)      { return this.#post('/api/led', { on }); }
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const hardware =
  (typeof window !== 'undefined' && window.CB_BACKEND === 'http')
    ? new HttpHardware()
    : new SimHardware();

export const isSimulated = hardware instanceof SimHardware;
