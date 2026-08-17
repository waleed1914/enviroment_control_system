/* Inline SVG icon set — no network, no icon font. currentColor everywhere. */

const S = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
        stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

export const ICONS = {
  leaf: S('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'),
  flame: S('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>'),
  wind: S('<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>'),
  sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),

  thermometer: S('<path d="M14 4.5a2.5 2.5 0 0 0-5 0v9.26a4.5 4.5 0 1 0 5 0Z"/><path d="M11.5 9v6.5"/>'),
  droplet: S('<path d="M12 2.7 6.9 8.1a7.2 7.2 0 1 0 10.2 0Z"/>'),
  fan: S('<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c0-3.3.6-5.8 2.5-5.8 1.4 0 2.3 1.2 2.3 2.6 0 2.3-2.2 3.2-4.8 3.2"/><path d="M14.2 12c3.3 0 5.8.6 5.8 2.5 0 1.4-1.2 2.3-2.6 2.3-2.3 0-3.2-2.2-3.2-4.8"/><path d="M9.8 12c-3.3 0-5.8-.6-5.8-2.5C4 8.1 5.2 7.2 6.6 7.2c2.3 0 3.2 2.2 3.2 4.8"/><path d="M12 14.2c0 3.3-.6 5.8-2.5 5.8-1.4 0-2.3-1.2-2.3-2.6 0-2.3 2.2-3.2 4.8-3.2"/>'),
  heat: S('<path d="M6 16v3M10 16v3M14 16v3M18 16v3"/><path d="M6 5c0 1.5 1.5 1.5 1.5 3S6 11 6 12.5"/><path d="M11 5c0 1.5 1.5 1.5 1.5 3S11 11 11 12.5"/><path d="M16 5c0 1.5 1.5 1.5 1.5 3S16 11 16 12.5"/>'),
  mist: S('<path d="M12 2.7 6.9 8.1a7.2 7.2 0 1 0 10.2 0Z"/><path d="M9.5 12.5a2.5 2.5 0 0 0 5 0"/>'),
  bulb: S('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6h5.2c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>'),

  home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.8 20v-5.4h4.4V20"/>'),
  grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'),
  cube: S('<path d="m12 2.8 8 4.4v9.6l-8 4.4-8-4.4V7.2Z"/><path d="m4 7.2 8 4.4 8-4.4M12 11.6V21"/>'),
  activity: S('<path d="M3 12h3.5l2.5 7 4.5-15 2.5 8H21"/>'),
  gear: S('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),

  play: S('<path d="M7 4.8 19 12 7 19.2Z" fill="currentColor" stroke-width="1.2"/>'),
  pause: S('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
  stop: S('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
  reset: S('<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/>'),
  chevron: S('<path d="m6 9 6 6 6-6"/>'),
  check: S('<path d="m4.5 12.5 5 5 10-11"/>'),
  alert: S('<path d="M12 3.5 1.8 20.5h20.4Z"/><path d="M12 10v4.2M12 17.4v.2"/>'),
  power: S('<path d="M12 3v9"/><path d="M6.5 6.8a8 8 0 1 0 11 0"/>'),

  wifi: S('<path d="M2.5 9.2a15 15 0 0 1 19 0"/><path d="M5.8 12.9a10 10 0 0 1 12.4 0"/><path d="M9.2 16.6a5 5 0 0 1 5.6 0"/><path d="M12 20.2v.1"/>'),
  wifiOff: S('<path d="M2.5 9.2a15 15 0 0 1 6-3.4M15.6 6a15 15 0 0 1 5.9 3.2"/><path d="M5.8 12.9a10 10 0 0 1 3.3-2.1M18.2 12.9a10 10 0 0 0-2-1.5"/><path d="M9.2 16.6a5 5 0 0 1 5.6 0"/><path d="M12 20.2v.1M3 3l18 18"/>'),
};

/** Replace every <i data-icon="x"> inside root with its SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach((el) => {
    const svg = ICONS[el.dataset.icon];
    if (svg && !el.firstChild) el.innerHTML = svg;
  });
}

export const icon = (name) => ICONS[name] || '';
