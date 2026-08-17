/* DEVICES — direct hardware control, one card per output.
   This screen ignores the scene engine: it is the panel you use when
   you are testing the wiring or overriding a cycle by hand. */

import { el, $, options, fmtInterval, confirmDialog } from '../ui.js';
import { ATOMIZER_INTERVALS, ATOMIZER_PULSE_SEC, FAN_MIN_DUTY, PINOUT } from '../config.js';
import { actions } from '../store.js';

const FAN_STEPS = [0, 25, 40, 50, 75, 100];

export function mount(root) {
  const node = el(`
    <div class="screen">
      <div class="row-between" style="padding:0 .3rem">
        <div class="card-title" style="margin:0">DEVICE CONTROL</div>
        <button class="btn btn-danger btn-accent" id="d-alloff"><i data-icon="power"></i>ALL OFF</button>
      </div>

      <div class="grid-4" style="flex:1;min-height:0">

        <!-- FAN -->
        <section class="card accent-blue">
          <div class="row" style="gap:.6rem">
            <i data-icon="fan" style="width:1.7rem;height:1.7rem;color:var(--accent)"></i>
            <div class="card-title" style="margin:0;color:var(--ink)">FAN</div>
            <span class="spacer"></span>
            <b class="mono" id="d-fan-state" style="color:var(--accent)">OFF</b>
          </div>
          <div class="tile-value" id="d-fan-val" style="font-size:2.6rem;margin:.6rem 0 .2rem">0<small>%</small></div>
          <input class="slider" id="d-fan" type="range" min="0" max="100" step="5" value="0" aria-label="Fan speed">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin-top:.4rem">
            ${FAN_STEPS.map((v) => `<button class="btn" data-fan="${v}" style="min-height:2.4rem;font-size:.8rem;padding-inline:.4rem">${v}%</button>`).join('')}
          </div>
          <div class="kv" style="margin-top:.8rem"><span>Duty</span><b id="d-fan-duty">0%</b></div>
          <div class="kv"><span>Running for</span><b id="d-fan-time">0:00</b></div>
          <p class="muted" style="font-size:.7rem;margin-top:auto;line-height:1.4">
            Zero-cross dimmer on GPIO ${PINOUT.dimmerPwm.pin} / Z-C ${PINOUT.dimmerZc.pin}.
            Below ${FAN_MIN_DUTY}% the motor is switched off instead of stalled.
          </p>
        </section>

        <!-- HEATER -->
        <section class="card accent-red">
          <div class="row" style="gap:.6rem">
            <i data-icon="heat" style="width:1.7rem;height:1.7rem;color:var(--accent)"></i>
            <div class="card-title" style="margin:0;color:var(--ink)">HEATING PAD</div>
          </div>
          <div class="state-text off" id="d-heat-text" style="font-size:2.6rem;margin:.6rem 0">OFF</div>
          <button class="toggle toggle-lg" id="d-heat" role="switch" aria-checked="false"></button>
          <div class="kv" style="margin-top:1rem"><span>Relay</span><b>CH1 · GPIO ${PINOUT.relayHeater.pin}</b></div>
          <div class="kv"><span>On for</span><b id="d-heat-time">0:00</b></div>
          <p class="muted" style="font-size:.7rem;margin-top:auto;line-height:1.4">
            Cuts out automatically above the temperature limit set in Settings.
          </p>
        </section>

        <!-- ATOMIZER -->
        <section class="card accent-cyan">
          <div class="row" style="gap:.6rem">
            <i data-icon="mist" style="width:1.7rem;height:1.7rem;color:var(--accent)"></i>
            <div class="card-title" style="margin:0;color:var(--ink)">ATOMIZER</div>
            <span class="spacer"></span>
            <b class="mono" id="d-mist-state" style="color:var(--accent)">IDLE</b>
          </div>
          <div class="select-wrap">
            <select class="select" id="d-mist">${options(ATOMIZER_INTERVALS, 5, fmtInterval)}</select>
            <i data-icon="chevron"></i>
          </div>
          <button class="btn btn-accent btn-lg" id="d-mist-now" style="margin-top:.6rem">
            <i data-icon="droplet"></i>MIST NOW
          </button>
          <div class="kv" style="margin-top:1rem"><span>Pulse length</span><b>${ATOMIZER_PULSE_SEC} s</b></div>
          <div class="kv"><span>Next pulse</span><b id="d-mist-next">—</b></div>
          <div class="kv"><span>Pulses this session</span><b id="d-mist-count">0</b></div>
          <div class="kv"><span>Relay</span><b>CH2 · GPIO ${PINOUT.relayAtomizer.pin}</b></div>
        </section>

        <!-- LED -->
        <section class="card accent-amber">
          <div class="row" style="gap:.6rem">
            <i data-icon="bulb" style="width:1.7rem;height:1.7rem;color:var(--accent)"></i>
            <div class="card-title" style="margin:0;color:var(--ink)">LED LIGHT</div>
          </div>
          <div class="state-text off" id="d-led-text" style="font-size:2.6rem;margin:.6rem 0">OFF</div>
          <button class="toggle toggle-lg" id="d-led" role="switch" aria-checked="false"></button>
          <div class="kv" style="margin-top:1rem"><span>Relay</span><b>CH3 · GPIO ${PINOUT.relayLed.pin}</b></div>
          <div class="kv"><span>On for</span><b id="d-led-time">0:00</b></div>
          <p class="muted" style="font-size:.7rem;margin-top:auto;line-height:1.4">
            The light is independent of the scenes — it stays as you leave it when a cycle ends.
          </p>
        </section>

      </div>
    </div>`);

  const r = {
    fan: $('#d-fan', node), fanVal: $('#d-fan-val', node), fanState: $('#d-fan-state', node),
    heat: $('#d-heat', node), heatText: $('#d-heat-text', node), heatTime: $('#d-heat-time', node),
    mist: $('#d-mist', node), mistState: $('#d-mist-state', node), mistNext: $('#d-mist-next', node),
    led: $('#d-led', node), ledText: $('#d-led-text', node),
  };

  let dragging = false;
  r.fan.addEventListener('pointerdown', () => { dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  r.fan.addEventListener('input', () => actions.setFan(+r.fan.value));

  node.addEventListener('click', (e) => {
    const step = e.target.closest('[data-fan]');
    if (step) actions.setFan(+step.dataset.fan);
  });

  r.heat.addEventListener('click', () => actions.setHeater(r.heat.getAttribute('aria-checked') !== 'true'));
  r.led.addEventListener('click', () => actions.setLed(r.led.getAttribute('aria-checked') !== 'true'));
  r.mist.addEventListener('change', () => actions.setAtomizerInterval(+r.mist.value));
  $('#d-mist-now', node).addEventListener('click', () => actions.pulseAtomizer());
  $('#d-alloff', node).addEventListener('click', () =>
    confirmDialog('Stop the cycle and switch every output off?', () => {
      actions.stopScene();
      actions.allOff();
    }));

  root.appendChild(node);

  /* On-times and the pulse tally are view concerns — no need to keep them
     in the store, they reset when you leave the screen. */
  const since = { fan: null, heater: null, led: null };
  let pulses = 0, wasMisting = false;

  const hhmm = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const onFor = (key, live) => {
    if (live && since[key] === null) since[key] = Date.now();
    if (!live) since[key] = null;
    return since[key] ? (Date.now() - since[key]) / 1000 : 0;
  };

  function update(s) {
    const d = s.devices;

    if (!dragging && +r.fan.value !== d.fan) r.fan.value = d.fan;
    r.fan.style.setProperty('--pct', d.fan + '%');
    r.fanVal.innerHTML = `${d.fan}<small>%</small>`;
    r.fanState.textContent = d.fan > 0 ? 'RUNNING' : 'OFF';
    node.querySelectorAll('[data-fan]').forEach((b) =>
      b.classList.toggle('btn-accent', +b.dataset.fan === d.fan));

    $('#d-fan-duty', node).textContent = `${d.fan}%`;
    $('#d-fan-time', node).textContent = hhmm(onFor('fan', d.fan > 0));

    r.heat.setAttribute('aria-checked', String(d.heater));
    r.heatText.textContent = d.heater ? 'ON' : 'OFF';
    r.heatText.className = `state-text ${d.heater ? 'on' : 'off'}`;
    r.heatTime.textContent = hhmm(onFor('heater', d.heater));

    if (+r.mist.value !== d.atomizerInterval) r.mist.value = d.atomizerInterval;
    r.mistState.textContent = d.atomizerOn ? 'MISTING' : d.atomizerInterval ? 'ARMED' : 'OFF';
    r.mistNext.textContent = d.atomizerInterval && s.run.running
      ? `${Math.floor(d.atomizerNext / 60)}:${String(Math.max(0, d.atomizerNext % 60)).padStart(2, '0')}`
      : '—';

    if (d.atomizerOn && !wasMisting) pulses++;
    wasMisting = d.atomizerOn;
    $('#d-mist-count', node).textContent = pulses;

    r.led.setAttribute('aria-checked', String(d.led));
    r.ledText.textContent = d.led ? 'ON' : 'OFF';
    r.ledText.className = `state-text ${d.led ? 'on' : 'off'}`;
    $('#d-led-time', node).textContent = hhmm(onFor('led', d.led));
  }

  return { update };
}
