/* SENSORS — DHT11 history.
   Temperature and humidity are different measures on different scales, so
   they get two stacked charts sharing one time axis — never a second y-axis
   on one plot. Each chart carries a single series, so the title names it
   and no legend box is needed. */

import { el, $, $$, fmtTemp } from '../ui.js';
import { HISTORY_RANGES, SENSOR_POLL_MS } from '../config.js';

const TEMP_COLOR = '#f05252';   // validated against #0e0e11 (dark surface)
const HUM_COLOR  = '#4b91f1';

export function mount(root) {
  const node = el(`
    <div class="screen">

      <div class="row-between" style="padding:0 .3rem">
        <div class="card-title" style="margin:0">SENSOR HISTORY — DHT11</div>
        <div class="row" style="gap:.75rem">
          <span class="muted" style="font-size:.78rem" id="s-status">—</span>
          <div class="seg" id="s-range">
            ${HISTORY_RANGES.map((r, i) =>
              `<button data-range="${r.key}" class="${i === 1 ? 'is-active' : ''}">${r.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="stat-strip" id="s-stats">
        ${statTile('temp-now', 'TEMP NOW', 'accent-red', 'thermometer')}
        ${statTile('temp-min', 'TEMP MIN', 'accent-red')}
        ${statTile('temp-max', 'TEMP MAX', 'accent-red')}
        ${statTile('hum-now', 'HUM NOW', 'accent-blue', 'droplet')}
        ${statTile('hum-min', 'HUM MIN', 'accent-blue')}
        ${statTile('hum-max', 'HUM MAX', 'accent-blue')}
      </div>

      <section class="card chart-card">
        <div class="chart-head">
          <span class="chart-title">TEMPERATURE · °C</span>
          <span class="chart-now accent-red" id="s-t-now" style="color:${TEMP_COLOR}">--.-</span>
        </div>
        <div class="chart-box" data-chart="temp">
          <svg preserveAspectRatio="none"></svg>
          <div class="chart-tip"></div>
        </div>
      </section>

      <section class="card chart-card">
        <div class="chart-head">
          <span class="chart-title">HUMIDITY · %RH</span>
          <span class="chart-now" id="s-h-now" style="color:${HUM_COLOR}">--</span>
        </div>
        <div class="chart-box" data-chart="hum">
          <svg preserveAspectRatio="none"></svg>
          <div class="chart-tip"></div>
        </div>
      </section>

    </div>`);

  let range = HISTORY_RANGES[1];
  let lastWindow = [];

  $('#s-range', node).addEventListener('click', (e) => {
    const b = e.target.closest('[data-range]');
    if (!b) return;
    range = HISTORY_RANGES.find((r) => r.key === b.dataset.range);
    $$('#s-range button', node).forEach((x) => x.classList.toggle('is-active', x === b));
  });

  /* Crosshair: works with mouse and finger alike (pointer events). */
  $$('[data-chart]', node).forEach((box) => {
    const tip = $('.chart-tip', box);
    const move = (e) => {
      if (!lastWindow.length) return;
      const rect = box.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const i = Math.round((x / rect.width) * (lastWindow.length - 1));
      const p = lastWindow[i];
      if (!p) return;
      const isTemp = box.dataset.chart === 'temp';
      tip.textContent = isTemp
        ? `${p.temp.toFixed(1)} °C · ${timeOf(p.t)}`
        : `${Math.round(p.hum)} %RH · ${timeOf(p.t)}`;
      tip.style.left = `${(i / (lastWindow.length - 1)) * rect.width}px`;
      tip.style.top = `${rect.height * 0.5}px`;
      tip.classList.add('is-on');
      box.querySelector('svg').style.setProperty('--cursor-x', `${(i / (lastWindow.length - 1)) * 100}%`);
      drawCursor(box, i / (lastWindow.length - 1));
    };
    box.addEventListener('pointerdown', move);
    box.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') move(e); });
    const clear = () => { tip.classList.remove('is-on'); drawCursor(box, null); };
    box.addEventListener('pointerup', clear);
    box.addEventListener('pointerleave', clear);
  });

  root.appendChild(node);

  const boxes = {
    temp: $('[data-chart="temp"]', node),
    hum: $('[data-chart="hum"]', node),
  };

  let lastDraw = 0;

  function update(s) {
    const now = Date.now();
    const win = s.history.filter((p) => now - p.t <= range.seconds * 1000);
    lastWindow = win;

    const temps = win.map((p) => p.temp);
    const hums = win.map((p) => p.hum);
    const unit = s.settings.unit;

    setStat(node, 'temp-now', fmtTemp(s.sensors.temp, unit), `°${unit}`);
    setStat(node, 'temp-min', fmtTemp(min(temps), unit), `°${unit}`);
    setStat(node, 'temp-max', fmtTemp(max(temps), unit), `°${unit}`);
    setStat(node, 'hum-now', s.sensors.humidity ?? '--', '%');
    setStat(node, 'hum-min', round(min(hums)), '%');
    setStat(node, 'hum-max', round(max(hums)), '%');

    $('#s-t-now', node).textContent = `${fmtTemp(s.sensors.temp, unit)} °${unit}`;
    $('#s-h-now', node).textContent = `${s.sensors.humidity ?? '--'} %RH`;
    $('#s-status', node).textContent = s.sensors.ok
      ? `${win.length} samples · every ${SENSOR_POLL_MS / 1000}s`
      : 'SENSOR OFFLINE';
    $('#s-status', node).style.color = s.sensors.ok ? '' : 'var(--red)';

    // Redraw at most 2×/s — the store emits far more often than that.
    if (now - lastDraw < 500) return;
    lastDraw = now;
    drawChart(boxes.temp, win, (p) => p.temp, TEMP_COLOR, (v) => v.toFixed(1));
    drawChart(boxes.hum, win, (p) => p.hum, HUM_COLOR, (v) => Math.round(v) + '');
  }

  return { update };
}

/* ── chart drawing ──────────────────────────────────────────── */

function drawChart(box, data, get, color, fmt) {
  const svg = box.querySelector('svg');
  const w = box.clientWidth || 600;
  const h = box.clientHeight || 140;
  if (!data.length || w < 10) { svg.innerHTML = ''; return; }

  const padL = 34, padR = 46, padT = 8, padB = 16;
  const iw = w - padL - padR, ih = h - padT - padB;

  const vals = data.map(get);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  lo -= span * 0.18; hi += span * 0.18;

  const x = (i) => padL + (i / Math.max(1, data.length - 1)) * iw;
  const y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih;

  const ticks = niceTicks(lo, hi, 3);
  const grid = ticks.map((t) => `
      <line class="chart-grid" x1="${padL}" y1="${y(t).toFixed(1)}" x2="${padL + iw}" y2="${y(t).toFixed(1)}"/>
      <text class="chart-axis" x="${padL - 6}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${fmt(t)}</text>`).join('');

  const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(get(p)).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${padT + ih} L${padL} ${padT + ih} Z`;

  const lastV = get(data[data.length - 1]);
  const lx = x(data.length - 1), ly = y(lastV);

  const t0 = timeOf(data[0].t);
  const t1 = timeOf(data[data.length - 1].t);

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="g-${box.dataset.chart}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path class="chart-area" d="${area}" fill="url(#g-${box.dataset.chart})"/>
    <path class="chart-line" d="${line}" stroke="${color}"/>
    <circle class="chart-dot" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${color}"/>
    <text class="chart-axis" x="${lx + 9}" y="${(ly + 4).toFixed(1)}" fill="${color}"
          style="font-weight:800;font-size:.78rem">${fmt(lastV)}</text>
    <text class="chart-axis" x="${padL}" y="${h - 3}">${t0}</text>
    <text class="chart-axis" x="${padL + iw}" y="${h - 3}" text-anchor="end">${t1}</text>
    <line class="chart-cursor" data-cursor style="display:none" y1="${padT}" y2="${padT + ih}"/>`;
  svg.dataset.padL = padL; svg.dataset.iw = iw;
}

function drawCursor(box, frac) {
  const svg = box.querySelector('svg');
  const c = svg && svg.querySelector('[data-cursor]');
  if (!c) return;
  if (frac === null) { c.style.display = 'none'; return; }
  const x = +svg.dataset.padL + frac * +svg.dataset.iw;
  c.setAttribute('x1', x); c.setAttribute('x2', x);
  c.style.display = '';
}

/* ── helpers ────────────────────────────────────────────────── */

const statTile = (id, label, accent, ico) => `
  <div class="tile ${accent}" data-stat="${id}">
    <div class="tile-label">${ico ? `<i data-icon="${ico}"></i>` : ''}${label}</div>
    <div class="tile-value">--<small></small></div>
  </div>`;

function setStat(root, id, value, unit) {
  const t = root.querySelector(`[data-stat="${id}"] .tile-value`);
  if (t) t.innerHTML = `${value}<small>${unit}</small>`;
}

const min = (a) => (a.length ? Math.min(...a) : null);
const max = (a) => (a.length ? Math.max(...a) : null);
const round = (v) => (v === null ? '--' : Math.round(v));

function timeOf(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 3-ish round numbers covering [lo, hi]. */
function niceTicks(lo, hi, count) {
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(4));
  return out;
}
