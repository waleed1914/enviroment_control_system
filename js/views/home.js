/* HOME — the screen from the mockup: sensors, running scene,
   manual controls, live device states, scene presets. */

import { el, $, fmtClock, fmtInterval, fmtMinutes, fmtTemp, options } from '../ui.js';
import { icon } from '../icons.js';
import { ATOMIZER_INTERVALS, WORK_TIMES } from '../config.js';
import { actions, getScene, allScenes } from '../store.js';

export function mount(root) {
  const scenes = allScenes();

  const node = el(`
  <div class="home">

    <!-- SENSORS -->
    <section class="card a-sensors">
      <div class="card-title">SENSORS</div>
      <div class="sensor-grid">
        <div class="tile accent-red">
          <div class="tile-label"><i data-icon="thermometer"></i>TEMPERATURE</div>
          <div class="tile-value v-ink" id="h-temp">--.-<small id="h-temp-u">°C</small></div>
        </div>
        <div class="tile accent-blue">
          <div class="tile-label"><i data-icon="droplet"></i>HUMIDITY</div>
          <div class="tile-value v-ink" id="h-hum">--<small>%RH</small></div>
        </div>
      </div>
    </section>

    <!-- CURRENT SCENE -->
    <section class="card a-scene" id="h-scene-card">
      <div class="card-title t-green">CURRENT SCENE</div>
      <div class="scene-now">
        <div class="scene-now-left">
          <div class="scene-badge" id="h-badge"><i data-icon="leaf"></i></div>
          <div style="min-width:0">
            <div class="scene-name" id="h-scene-name">SCENE 1: DRY</div>
            <span class="pill is-idle" id="h-pill"><i data-icon="stop"></i><span>IDLE</span></span>
          </div>
        </div>
        <div class="scene-now-right">
          <div style="flex:1;min-width:0">
            <div class="timer-label">TIME REMAINING</div>
            <div class="timer-value" id="h-remaining">15:00</div>
            <div class="timer-total" id="h-total">of 15:00</div>
          </div>
          <div class="ring">
            <svg viewBox="0 0 44 44">
              <circle class="ring-track" cx="22" cy="22" r="19" fill="none" stroke-width="4"/>
              <circle class="ring-fill" id="h-ring" cx="22" cy="22" r="19" fill="none"
                      stroke-width="4" stroke-linecap="round"
                      stroke-dasharray="0 120"/>
            </svg>
            <div class="ring-text" id="h-pct">0%</div>
          </div>
        </div>
      </div>
      <div class="row" style="margin-top:.7rem;gap:.5rem">
        <button class="btn btn-accent" id="h-start" style="flex:1"><i data-icon="play"></i><span id="h-start-t">START</span></button>
        <button class="btn" id="h-pause"><i data-icon="pause"></i>PAUSE</button>
        <button class="btn btn-danger" id="h-stop"><i data-icon="stop"></i>STOP</button>
      </div>
    </section>

    <!-- DEVICES -->
    <section class="card a-devices">
      <div class="card-title">DEVICES</div>
      <div class="device-list">
        <div class="device-row accent-blue" id="h-dev-fan">
          <i data-icon="fan"></i><span class="d-name">Fan</span><span class="d-val">0%</span>
        </div>
        <div class="device-row accent-red" id="h-dev-heat">
          <i data-icon="heat"></i><span class="d-name">Heating Pad</span><span class="d-val">OFF</span>
        </div>
        <div class="device-row accent-cyan" id="h-dev-mist">
          <i data-icon="mist"></i><span class="d-name">Atomizer</span><span class="d-val">Off</span>
        </div>
        <div class="device-row accent-amber" id="h-dev-led">
          <i data-icon="bulb"></i><span class="d-name">LED Light</span><span class="d-val">OFF</span>
        </div>
      </div>
    </section>

    <!-- MANUAL CONTROLS -->
    <section class="card a-manual">
      <div class="card-title">MANUAL CONTROLS</div>
      <div class="manual-grid">

        <div class="tile accent-blue">
          <div class="tile-label"><i data-icon="fan"></i>FAN SPEED</div>
          <div class="tile-value" id="h-fan-val">0<small>%</small></div>
          <input class="slider" id="h-fan" type="range" min="0" max="100" step="5" value="0"
                 aria-label="Fan speed">
        </div>

        <div class="tile accent-red">
          <div class="tile-label"><i data-icon="heat"></i>HEATING PAD</div>
          <div class="state-text off" id="h-heat-text">OFF</div>
          <button class="toggle" id="h-heat" role="switch" aria-checked="false" aria-label="Heating pad"></button>
        </div>

        <div class="tile accent-cyan">
          <div class="tile-label"><i data-icon="mist"></i>ATOMIZER INTERVAL</div>
          <div class="select-wrap">
            <select class="select" id="h-mist">${options(ATOMIZER_INTERVALS, 5, fmtInterval)}</select>
            <i data-icon="chevron"></i>
          </div>
          <div class="row" style="margin-top:.4rem;gap:.35rem">
            <button class="btn btn-ghost" id="h-mist-now" style="flex:1;min-height:2.2rem;font-size:.72rem">MIST NOW</button>
            <button class="btn btn-danger" id="h-mist-stop" style="flex:1;min-height:2.2rem;font-size:.72rem">STOP MIST</button>
          </div>
        </div>

        <div class="tile accent-purple">
          <div class="tile-label"><i data-icon="clock"></i>WORKING TIME</div>
          <div class="select-wrap">
            <select class="select" id="h-time">${options(WORK_TIMES, 15, fmtMinutes)}</select>
            <i data-icon="chevron"></i>
          </div>
        </div>

      </div>
    </section>

    <!-- PRESETS -->
    <section class="card a-presets">
      <div class="card-title">SCENE PRESETS</div>
      <div class="preset-grid" id="h-presets">
        ${scenes.map((s) => `
          <button class="preset accent-${s.accent}" data-scene="${s.id}">
            <span class="preset-icon"><i data-icon="${s.icon}"></i></span>
            <span style="min-width:0">
              <div class="preset-name">${s.name}</div>
              <span class="preset-meta"><i data-icon="clock"></i>${s.duration / 60} min</span>
            </span>
          </button>`).join('')}
      </div>
    </section>

  </div>`);

  /* ── refs ─────────────────────────────────────────────── */
  const r = {
    temp: $('#h-temp', node), tempU: $('#h-temp-u', node), hum: $('#h-hum', node),
    sceneCard: $('#h-scene-card', node), badge: $('#h-badge', node),
    name: $('#h-scene-name', node), pill: $('#h-pill', node),
    remaining: $('#h-remaining', node), total: $('#h-total', node),
    ring: $('#h-ring', node), pct: $('#h-pct', node),
    start: $('#h-start', node), startT: $('#h-start-t', node),
    pause: $('#h-pause', node), stop: $('#h-stop', node),
    devFan: $('#h-dev-fan', node), devHeat: $('#h-dev-heat', node),
    devMist: $('#h-dev-mist', node), devLed: $('#h-dev-led', node),
    fan: $('#h-fan', node), fanVal: $('#h-fan-val', node),
    heat: $('#h-heat', node), heatText: $('#h-heat-text', node),
    mist: $('#h-mist', node), time: $('#h-time', node),
    mistStop: $('#h-mist-stop', node),
    presets: $('#h-presets', node),
  };

  /* ── input wiring ─────────────────────────────────────── */
  let dragging = false;
  r.fan.addEventListener('pointerdown', () => { dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  r.fan.addEventListener('input', () => {
    const v = +r.fan.value;
    r.fan.style.setProperty('--pct', v + '%');
    r.fanVal.innerHTML = `${v}<small>%</small>`;
    actions.setFan(v);
  });

  r.heat.addEventListener('click', () => actions.setHeater(r.heat.getAttribute('aria-checked') !== 'true'));
  r.mist.addEventListener('change', () => actions.setAtomizerInterval(+r.mist.value));
  $('#h-mist-now', node).addEventListener('click', () => actions.pulseAtomizer());
  r.mistStop.addEventListener('click', () => actions.stopAtomizer());
  r.time.addEventListener('change', () => actions.setWorkTime(+r.time.value));
  r.devLed.addEventListener('click', () => actions.setLed(!r.devLed.classList.contains('is-live')));

  r.start.addEventListener('click', () => actions.startScene());
  r.pause.addEventListener('click', () => actions.pauseScene());
  r.stop.addEventListener('click', () => actions.stopScene());

  r.presets.addEventListener('click', (e) => {
    const b = e.target.closest('[data-scene]');
    if (!b) return;
    const id = +b.dataset.scene;
    // Tapping the scene you're already running restarts it; otherwise start it.
    actions.startScene(id);
  });

  root.appendChild(node);

  /* ── render ───────────────────────────────────────────── */
  function update(s) {
    const { sensors, devices, run, settings } = s;
    const sc = getScene(run.sceneId);

    r.temp.innerHTML = `${fmtTemp(sensors.temp, settings.unit)}<small>°${settings.unit}</small>`;
    r.hum.innerHTML = `${sensors.humidity ?? '--'}<small>%RH</small>`;

    /* current scene */
    r.sceneCard.className = `card a-scene accent-${sc.accent}`;
    setIcon(r.badge, sc.icon);
    r.badge.classList.toggle('is-live', run.running && !run.paused);
    r.name.textContent = `SCENE ${sc.id}: ${sc.name}`;

    const status = !run.running ? ['is-idle', 'stop', 'IDLE']
      : run.paused ? ['is-paused', 'pause', 'PAUSED']
      : run.override ? ['is-override', 'alert', 'MANUAL OVERRIDE']
      : ['', 'play', 'RUNNING'];
    r.pill.className = `pill ${status[0]}`;
    setIcon(r.pill, status[1]);
    r.pill.querySelector('span').textContent = status[2];

    r.remaining.textContent = fmtClock(run.remaining);
    r.total.textContent = `of ${fmtClock(run.total)}`;
    const frac = run.total ? 1 - run.remaining / run.total : 0;
    const C = 2 * Math.PI * 19;
    r.ring.setAttribute('stroke-dasharray', `${(frac * C).toFixed(1)} ${C.toFixed(1)}`);
    // a round cap would still paint a dot at 0 %
    r.ring.setAttribute('stroke-linecap', frac > 0.01 ? 'round' : 'butt');
    r.pct.textContent = `${Math.round(frac * 100)}%`;

    r.startT.textContent = run.running ? 'RESTART' : 'START';
    r.pause.disabled = !run.running;
    r.stop.disabled = !run.running;

    /* devices panel */
    setDevice(r.devFan, devices.fan > 0, devices.fan > 0 ? `${devices.fan}%` : 'OFF');
    setDevice(r.devHeat, devices.heater, devices.heater ? 'ON' : 'OFF');
    setDevice(r.devMist, devices.atomizerInterval > 0,
      devices.atomizerOn ? 'MISTING' : fmtInterval(devices.atomizerInterval));
    setDevice(r.devLed, devices.led, devices.led ? 'ON' : 'OFF');

    /* manual controls */
    if (!dragging && +r.fan.value !== devices.fan) r.fan.value = devices.fan;
    r.fan.style.setProperty('--pct', devices.fan + '%');
    r.fanVal.innerHTML = `${devices.fan}<small>%</small>`;

    r.heat.setAttribute('aria-checked', String(devices.heater));
    r.heatText.textContent = devices.heater ? 'ON' : 'OFF';
    r.heatText.className = `state-text ${devices.heater ? 'on' : 'off'}`;

    if (+r.mist.value !== devices.atomizerInterval) r.mist.value = devices.atomizerInterval;
    r.mistStop.disabled = !devices.atomizerOn;
    if (+r.time.value !== run.workTime) r.time.value = run.workTime;

    /* presets */
    r.presets.querySelectorAll('[data-scene]').forEach((b) => {
      b.classList.toggle('is-active', +b.dataset.scene === run.sceneId);
    });
  }

  return { update };
}

function setDevice(row, live, text) {
  row.classList.toggle('is-live', !!live);
  row.classList.toggle('is-off', !live);
  row.querySelector('.d-val').textContent = text;
}

function setIcon(host, name) {
  const i = host.querySelector('i');
  if (i && i.dataset.icon !== name) {
    i.dataset.icon = name;
    i.innerHTML = icon(name);
  }
}
