/* Small DOM + formatting helpers shared by every view. */

import { hydrateIcons } from './icons.js';

/** Build a detached element tree from an HTML string and hydrate its icons. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const node = t.content.firstElementChild;
  hydrateIcons(node);
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** seconds -> "12:34" (or "1:02:30" past an hour) */
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** minutes -> "15 min" / "1 h 30" */
export function fmtMinutes(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export const fmtInterval = (min) => (min > 0 ? `Every ${min} min` : 'Off');

export function fmtTemp(c, unit = 'C') {
  if (c === null || c === undefined) return '--.-';
  return unit === 'F' ? (c * 9 / 5 + 32).toFixed(1) : c.toFixed(1);
}

/** Fire-and-forget confirmation dialog styled for touch. */
export function confirmDialog(text, onYes) {
  const node = el(`
    <div class="dlg-back">
      <div class="dlg">
        <p class="dlg-text">${text}</p>
        <div class="dlg-actions">
          <button class="btn btn-ghost" data-no>CANCEL</button>
          <button class="btn btn-accent btn-danger" data-yes>CONFIRM</button>
        </div>
      </div>
    </div>`);
  node.addEventListener('click', (e) => {
    if (e.target.closest('[data-yes]')) { onYes(); node.remove(); }
    else if (e.target.closest('[data-no]') || e.target === node) node.remove();
  });
  document.body.appendChild(node);
}

/** Options markup for a <select>. */
export const options = (values, selected, label = (v) => v) =>
  values.map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${label(v)}</option>`).join('');
