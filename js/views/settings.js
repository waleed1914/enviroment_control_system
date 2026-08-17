/* SETTINGS — display, units, safety envelope, wiring reference. */

import { el, $, $$, confirmDialog } from '../ui.js';
import { APP, PINOUT, ATOMIZER_PULSE_SEC, SENSOR_POLL_MS, FAN_MIN_DUTY } from '../config.js';
import { actions, pushAlert } from '../store.js';
import { isSimulated } from '../api.js';

export function mount(root) {
  const node = el(`
    <div class="screen">
      <div class="grid-4" style="flex:1;min-height:0">

        <!-- DISPLAY -->
        <section class="card accent-blue">
          <div class="card-title">DISPLAY</div>

          <div class="tile" style="margin-bottom:.6rem">
            <div class="row-between">
              <span class="tile-label">BRIGHTNESS</span>
              <b class="mono" id="st-bright-v" style="color:var(--accent)">80%</b>
            </div>
            <input class="slider" id="st-bright" type="range" min="10" max="100" step="5" value="80">
          </div>

          <div class="tile" style="margin-bottom:.6rem">
            <div class="tile-label" style="margin-bottom:.5rem">TEMPERATURE UNIT</div>
            <div class="seg" id="st-unit" style="width:100%">
              <button data-unit="C" style="flex:1">°C</button>
              <button data-unit="F" style="flex:1">°F</button>
            </div>
          </div>

          <div class="tile">
            <div class="row-between">
              <span class="tile-label">SCREEN BLANK</span>
              <b class="mono" id="st-saver-v" style="color:var(--accent)">Never</b>
            </div>
            <input class="slider" id="st-saver" type="range" min="0" max="60" step="5" value="0">
          </div>
        </section>

        <!-- SAFETY -->
        <section class="card accent-red">
          <div class="card-title" style="color:var(--red)">SAFETY LIMITS</div>

          <div class="tile" style="margin-bottom:.6rem">
            <div class="row-between">
              <span class="tile-label">MAX TEMPERATURE</span>
              <b class="mono" id="st-tmax-v" style="color:var(--accent)">45 °C</b>
            </div>
            <input class="slider" id="st-tmax" type="range" min="25" max="70" step="1" value="45">
          </div>

          <div class="tile" style="margin-bottom:.6rem">
            <div class="row-between">
              <span class="tile-label">MAX HUMIDITY</span>
              <b class="mono" id="st-hmax-v" style="color:var(--accent)">95 %</b>
            </div>
            <input class="slider" id="st-hmax" type="range" min="50" max="99" step="1" value="95">
          </div>

          <p class="muted" style="font-size:.72rem;line-height:1.45">
            The heating pad is cut and misting is held whenever a limit is crossed,
            whether a scene is running or you switched the output on by hand.
          </p>

          <button class="btn btn-accent btn-danger" id="st-alloff" style="margin-top:auto">
            <i data-icon="power"></i>EMERGENCY ALL OFF
          </button>
        </section>

        <!-- HARDWARE -->
        <section class="card accent-cyan">
          <div class="card-title">HARDWARE · GPIO (BCM)</div>
          <div class="screen-scroll" style="flex:1">
            ${Object.entries(PINOUT).map(([k, v]) => `
              <div class="kv"><span>${label(k)}</span><b>GPIO ${v.pin}</b></div>`).join('')}
            <div class="kv"><span>Sensor poll</span><b>${SENSOR_POLL_MS / 1000} s</b></div>
            <div class="kv"><span>Mist pulse</span><b>${ATOMIZER_PULSE_SEC} s</b></div>
            <div class="kv"><span>Fan cut-off</span><b>&lt; ${FAN_MIN_DUTY}%</b></div>
          </div>
          <p class="muted" style="font-size:.7rem;line-height:1.4;margin-top:.5rem">
            Pins are declared in <b>js/config.js</b> — keep them in step with the
            Python service so both ends agree.
          </p>
        </section>

        <!-- SYSTEM -->
        <section class="card accent-purple">
          <div class="card-title">SYSTEM</div>
          <div class="kv"><span>Application</span><b>${APP.name} ${APP.version}</b></div>
          <div class="kv"><span>Display</span><b>${APP.display}</b></div>
          <div class="kv"><span>Backend</span><b id="st-backend">—</b></div>
          <div class="kv"><span>Screen</span><b id="st-res">—</b></div>
          <div class="kv"><span>Uptime</span><b id="st-uptime">0:00</b></div>

          <div class="row" style="gap:.5rem;margin-top:auto">
            <button class="btn" id="st-reset" style="flex:1"><i data-icon="reset"></i>RESET</button>
            <button class="btn" id="st-reload"><i data-icon="power"></i>RELOAD</button>
          </div>
        </section>

      </div>
    </div>`);

  const started = Date.now();

  /* display */
  bindSlider(node, '#st-bright', '#st-bright-v', (v) => `${v}%`, (v) => actions.setSetting('brightness', v));
  bindSlider(node, '#st-saver', '#st-saver-v', (v) => (v ? `${v} min` : 'Never'), (v) => actions.setSetting('screensaverMin', v));
  bindSlider(node, '#st-tmax', '#st-tmax-v', (v) => `${v} °C`, (v) => actions.setSetting('limits.tempMax', v));
  bindSlider(node, '#st-hmax', '#st-hmax-v', (v) => `${v} %`, (v) => actions.setSetting('limits.humidityMax', v));

  $('#st-unit', node).addEventListener('click', (e) => {
    const b = e.target.closest('[data-unit]');
    if (b) actions.setSetting('unit', b.dataset.unit);
  });

  $('#st-alloff', node).addEventListener('click', () =>
    confirmDialog('Switch every output off now?', () => { actions.stopScene(); actions.allOff(); }));

  $('#st-reset', node).addEventListener('click', () =>
    confirmDialog('Restore all four scenes to their default values?', () => {
      [1, 2, 3, 4].forEach((id) => actions.resetScene(id));
      pushAlert('good', 'Scene presets restored');
    }));

  $('#st-reload', node).addEventListener('click', () =>
    confirmDialog('Reload the interface?', () => location.reload()));

  $('#st-backend', node).textContent = isSimulated ? 'Simulated (no GPIO)' : 'Pi service';
  $('#st-res', node).textContent = `${window.innerWidth} × ${window.innerHeight}`;

  root.appendChild(node);

  function update(s) {
    $$('#st-unit [data-unit]', node).forEach((b) =>
      b.classList.toggle('is-active', b.dataset.unit === s.settings.unit));

    setSlider(node, '#st-bright', '#st-bright-v', s.settings.brightness, (v) => `${v}%`);
    setSlider(node, '#st-saver', '#st-saver-v', s.settings.screensaverMin, (v) => (v ? `${v} min` : 'Never'));
    setSlider(node, '#st-tmax', '#st-tmax-v', s.settings.limits.tempMax, (v) => `${v} °C`);
    setSlider(node, '#st-hmax', '#st-hmax-v', s.settings.limits.humidityMax, (v) => `${v} %`);

    const up = Math.floor((Date.now() - started) / 1000);
    $('#st-uptime', node).textContent =
      `${Math.floor(up / 3600)}:${String(Math.floor(up / 60) % 60).padStart(2, '0')}:${String(up % 60).padStart(2, '0')}`;
  }

  return { update };
}

function bindSlider(root, sel, out, fmt, onChange) {
  const s = $(sel, root);
  s.addEventListener('input', () => {
    $(out, root).textContent = fmt(+s.value);
    s.style.setProperty('--pct', pct(s) + '%');
    onChange(+s.value);
  });
}

function setSlider(root, sel, out, value, fmt) {
  const s = $(sel, root);
  if (document.activeElement !== s && +s.value !== value) s.value = value;
  s.style.setProperty('--pct', pct(s) + '%');
  $(out, root).textContent = fmt(+s.value);
}

const pct = (s) => ((+s.value - +s.min) / (+s.max - +s.min)) * 100;

const label = (k) => ({
  dht11: 'DHT11 data',
  relayHeater: 'Relay — heater',
  relayAtomizer: 'Relay — atomizer',
  relayLed: 'Relay — LED',
  dimmerPwm: 'Dimmer — gate',
  dimmerZc: 'Dimmer — zero-cross',
}[k] || k);
