/* app.js — boot, routing, chrome that is shared by every screen. */

import { hydrateIcons, icon } from './icons.js';
import { $, $$, el, fmtTemp } from './ui.js';
import { boot, subscribe, getState } from './store.js';

import * as home from './views/home.js';
import * as scenes from './views/scenes.js';
import * as devices from './views/devices.js';
import * as sensors from './views/sensors.js';
import * as settings from './views/settings.js';

const ROUTES = { home, scenes, devices, sensors, settings };

const viewHost = $('#view');
let current = null;      // { name, api }

/* ── routing ────────────────────────────────────────────────── */

function go(name) {
  if (current && current.name === name) return;
  viewHost.innerHTML = '';
  current = { name, api: ROUTES[name].mount(viewHost) };
  $$('#navbar .nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.route === name));
  current.api.update(getState());
  try { localStorage.setItem('cb.route', name); } catch {}
}

$('#navbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-route]');
  if (b) go(b.dataset.route);
});

/* ── shared chrome ──────────────────────────────────────────── */

function paintTopbar(s) {
  $('#top-temp').textContent = `${fmtTemp(s.sensors.temp, s.settings.unit)} °${s.settings.unit}`;
  $('#top-hum').textContent = `${s.sensors.humidity ?? '--'} %`;

  const link = $('#stat-link');
  const off = !s.sensors.ok;
  if (link.dataset.off !== String(off)) {
    link.dataset.off = String(off);
    link.innerHTML = icon(off ? 'wifiOff' : 'wifi');
    link.classList.toggle('is-off', off);
  }

  const b = s.settings.brightness;
  document.documentElement.style.filter = b >= 100 ? '' : `brightness(${(0.45 + (b / 100) * 0.55).toFixed(2)})`;
}

function paintClock() {
  const d = new Date();
  $('#clock-time').textContent =
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#clock-date').textContent = d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ── toasts ─────────────────────────────────────────────────── */

window.addEventListener('cb:toast', (e) => {
  const a = e.detail;
  const t = el(`<div class="toast ${a.level}">
      <i data-icon="${a.level === 'good' ? 'check' : 'alert'}"></i><span>${a.text}</span>
    </div>`);
  $('#toast-host').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2600);
});

/* ── screen blanking ────────────────────────────────────────── */

let idleSince = Date.now();
['pointerdown', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, () => {
    idleSince = Date.now();
    document.body.classList.remove('is-blank');
  }, true));

setInterval(() => {
  const m = getState().settings.screensaverMin;
  if (m > 0 && Date.now() - idleSince > m * 60000) document.body.classList.add('is-blank');
}, 5000);

/* ── go ─────────────────────────────────────────────────────── */

hydrateIcons(document);
$('#brand-mark').innerHTML = icon('leaf');

boot();
paintClock();
setInterval(paintClock, 1000);

subscribe((s) => {
  paintTopbar(s);
  if (current) current.api.update(s);
});

// ?tab=sensors is handy when you are working on one screen in a browser
let start = new URLSearchParams(location.search).get('tab') || 'home';
try { start = new URLSearchParams(location.search).get('tab') || localStorage.getItem('cb.route') || 'home'; } catch {}
go(ROUTES[start] ? start : 'home');

/* Kiosk hygiene: no context menu, no pinch-zoom, no accidental drag-select. */
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
