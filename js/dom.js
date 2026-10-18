// dom.js — små hjælpere til at bygge elementer. Al tekst sættes som tekstnoder (aldrig innerHTML).

const SVG_NS = 'http://www.w3.org/2000/svg';

// el('button', { class: 'knap', type: 'button', onclick: fn, tekst: 'Start' }, barn, …)
export function el(tag, attrs = {}, ...born) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'tekst') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const b of born.flat()) {
    if (b == null || b === false) continue;
    e.append(typeof b === 'string' ? document.createTextNode(b) : b);
  }
  return e;
}

// Faste streg-ikoner (24 × 24). Stierne står her i koden og kommer aldrig fra data.
const IKONER = {
  hjem: ['M3.5 11.5 12 4.5l8.5 7', 'M6 10v9.5h12V10', 'M10 19.5v-5h4v5'],
  tilbage: ['M19 12H5.5', 'M11 5.5 4.5 12l6.5 6.5'],
  naeste: ['M5 12h13.5', 'M13 5.5l6.5 6.5-6.5 6.5'],
  hoejttaler: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9.2a4 4 0 0 1 0 5.6', 'M18.2 6.6a7.6 7.6 0 0 1 0 10.8'],
  ur: ['M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M12 9.5v4l2.5 2', 'M9.5 2.8h5'],
  kniv: ['M20 4c-2.5.5-8.5 6.5-10.8 9l2.4 2.4c2.6-2.5 8.4-8.6 8.4-11.4z', 'M9.2 13 3.8 18.4a1.7 1.7 0 0 0 2.4 2.4l5.4-5.4'],
  flamme: ['M12 21c-3.6 0-6.2-2.5-6.2-5.8 0-3.1 2-4.8 3.3-7.2.5 1.9 1.5 2.9 2.5 3.3.3-3 .8-5.8 2.7-7.8.6 3.4 3.9 6 3.9 10.8 0 3.9-2.6 6.7-6.2 6.7z'],
  print: ['M7 9V3.5h10V9', 'M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-2', 'M7 13.5h10v7H7z'],
  stop: ['M7.5 7.5h9v9h-9z'],
  tjek: ['M5 12.5l4.5 4.5L19 7.5'],
  igen: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v4h4'],
};

export function ikon(navn, klasse = 'ikon') {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', klasse);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  for (const d of IKONER[navn] || []) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    s.append(p);
  }
  return s;
}

export function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}
