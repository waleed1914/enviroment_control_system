/* SCENES — edit the four presets. Values persist to localStorage today,
   to the Pi's config file once the backend lands. */

import { el, $, $$, options, fmtInterval, fmtMinutes } from '../ui.js';
import { hydrateIcons } from '../icons.js';
import { ATOMIZER_INTERVALS, WORK_TIMES } from '../config.js';
import { actions, allScenes, getScene } from '../store.js';

export function mount(root) {
  const node = el(`
    <div class="screen">
      <div class="row-between" style="padding:0 .3rem">
        <div class="card-title" style="margin:0">SCENE PRESETS — TAP A VALUE TO EDIT</div>
        <div class="muted" style="font-size:.78rem">Changes apply to a running scene immediately</div>
      </div>
      <div class="scene-editor" id="sc-list"></div>
    </div>`);

  const list = $('#sc-list', node);

  list.innerHTML = allScenes().map((s) => `
    <section class="card scene-card accent-${s.accent}" data-card="${s.id}">
      <div class="sc-head">
        <span class="preset-icon"><i data-icon="${s.icon}"></i></span>
        <div style="min-width:0">
          <div class="preset-no">SCENE ${s.id}</div>
          <div class="preset-name">${s.name}</div>
        </div>
      </div>
      <p class="sc-blurb">${s.blurb}</p>

      <div class="sc-field">
        <div class="sc-field-label">WORKING TIME</div>
        <div class="select-wrap" style="margin-top:.35rem">
          <select class="select" data-f="duration">${options(WORK_TIMES, s.duration / 60, fmtMinutes)}</select>
          <i data-icon="chevron"></i>
        </div>
      </div>

      <div class="sc-field">
        <div class="row-between">
          <span class="sc-field-label">FAN SPEED</span>
          <b class="mono" data-o="fan" style="color:var(--accent)">${s.fan}%</b>
        </div>
        <input class="slider" type="range" min="0" max="100" step="5" value="${s.fan}" data-f="fan">
      </div>

      <div class="sc-field">
        <div class="row-between">
          <span class="sc-field-label">HEATING PAD</span>
          <button class="toggle toggle-sm" data-f="heater"
                  role="switch" aria-checked="${s.heater}"></button>
        </div>
      </div>

      <div class="sc-field">
        <div class="sc-field-label">ATOMIZER</div>
        <div class="select-wrap" style="margin-top:.35rem">
          <select class="select" data-f="atomizer">${options(ATOMIZER_INTERVALS, s.atomizer, fmtInterval)}</select>
          <i data-icon="chevron"></i>
        </div>
      </div>

      <div class="sc-actions">
        <button class="btn btn-accent" data-run="${s.id}"><i data-icon="play"></i>RUN</button>
        <button class="btn btn-ghost" data-reset="${s.id}" title="Restore defaults"><i data-icon="reset"></i></button>
      </div>
    </section>`).join('');

  hydrateIcons(list);   // markup built with innerHTML, so hydrate it by hand

  list.addEventListener('click', (e) => {
    const run = e.target.closest('[data-run]');
    if (run) { actions.startScene(+run.dataset.run); return; }

    const reset = e.target.closest('[data-reset]');
    if (reset) { actions.resetScene(+reset.dataset.reset); refresh(+reset.dataset.reset); return; }

    const tog = e.target.closest('[data-f="heater"]');
    if (tog) {
      const id = +tog.closest('[data-card]').dataset.card;
      const on = tog.getAttribute('aria-checked') !== 'true';
      tog.setAttribute('aria-checked', String(on));
      actions.saveScene(id, { heater: on });
    }
  });

  list.addEventListener('input', (e) => {
    const f = e.target.dataset.f;
    if (f !== 'fan') return;
    const card = e.target.closest('[data-card]');
    const v = +e.target.value;
    e.target.style.setProperty('--pct', v + '%');
    $('[data-o="fan"]', card).textContent = v + '%';
    actions.saveScene(+card.dataset.card, { fan: v });
  });

  list.addEventListener('change', (e) => {
    const f = e.target.dataset.f;
    const card = e.target.closest('[data-card]');
    if (f === 'duration') actions.saveScene(+card.dataset.card, { duration: +e.target.value * 60 });
    if (f === 'atomizer') actions.saveScene(+card.dataset.card, { atomizer: +e.target.value });
  });

  function refresh(id) {
    const s = getScene(id);
    const card = $(`[data-card="${id}"]`, list);
    $('[data-f="duration"]', card).value = s.duration / 60;
    $('[data-f="fan"]', card).value = s.fan;
    $('[data-f="fan"]', card).style.setProperty('--pct', s.fan + '%');
    $('[data-o="fan"]', card).textContent = s.fan + '%';
    $('[data-f="heater"]', card).setAttribute('aria-checked', String(s.heater));
    $('[data-f="atomizer"]', card).value = s.atomizer;
  }

  root.appendChild(node);

  // initial slider fills
  allScenes().forEach((s) => refresh(s.id));

  function update(state) {
    $$('[data-card]', list).forEach((c) => {
      const active = +c.dataset.card === state.run.sceneId && state.run.running;
      c.classList.toggle('is-running', active);
    });
  }

  return { update };
}
