// dom.js — små hjælpere til at bygge elementer. Al tekst sættes som tekstnoder (aldrig innerHTML).

import { utenBloede } from './tekst.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// el('button', { class: 'knap', type: 'button', onclick: fn, tekst: 'Start' }, barn, …)
export function el(tag, attrs = {}, ...born) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'tekst') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else attr(e, k, v);
  }
  for (const b of born.flat()) {
    if (b == null || b === false) continue;
    e.append(typeof b === 'string' ? document.createTextNode(b) : b);
  }
  return e;
}

// Én attribut, som el() sætter den. Skærmlæseren siger den bløde bindestreg (U+00AD i fx retternes navne), så den fjernes
// fra elementets navn (aria-label) og billedets (alt). Kun denne fil sætter de to og fanens titel (test-indkoeb.js)
const NAVNE = new Set(['aria-label', 'alt']);
export function attr(e, k, v) {
  const s = v === true ? '' : String(v);
  e.setAttribute(k, NAVNE.has(k) ? utenBloede(s) : s);
}

// Fanens titel, som skærmlæseren siger, når siden åbnes (printet: retten eller ugeplanen)
export function sideTitel(tekst) {
  document.title = utenBloede(tekst);
}

// En linje med led adskilt af « · » (personer · tid). Brydes linjen mellem to led, skal prikken ikke stå alene for enden
// af linjen («1 t · ca. 98 kr. ·»). Hvor linjen brydes, kan CSS ikke vide: det måles efter layoutet og igen, når bredden
// ændrer sig. textContent er den samme, uanset hvor linjen brydes. skille: teksten mellem leddene
export function ledLinje(tag, attrs, leder, skille = ' · ') {
  const vist = leder.filter(Boolean);
  const e = el(tag, attrs, vist.map((led, i) => [
    i ? el('span', { class: 'led-skille', tekst: skille }) : null,
    el('span', { class: 'led' }, led),
  ]).flat());
  if (vist.length > 1) foelgBrud(e);
  return e;
}

// Brudene sættes i næste billede, ikke i observerens eget kald: en skjult prik kan ændre linjens højde, og en ændring
// inde i kaldet giver «ResizeObserver loop completed with undelivered notifications» (e2e 05-11-2026).
// Sidens bredde følges også. En brudt linje i en beholder, der krymper til indholdet (.meta i .ret-hoved, .vare-maengde
// i .vare-tekst), er kun så bred som sin bredeste del, og den ændrer ikke størrelse,
// når der bliver mere plads: blev skærmen bredere (en iPad, der drejes, Split View), stod linjen stadig i to (code review
// 05-11-2026)
let brudVagt = null;
let sideBredde = null;
let planlagt = false;
const venter = new Set();
// Alle linjer, observeren følger. En linje i en skjult beholder er 0 × 0 og får intet kald, når den fjernes (størrelsen
// ændrer sig ikke), så hver måling afmelder de linjer, der ikke er på siden (code review 05-11-2026). Derfor skal en linje
// sættes på siden i samme opgave, som den bygges i, som skærmene gør
const fulgte = new Set();
function foelgBrud(e) {
  if (typeof ResizeObserver !== 'function') return; // ældre browsere beholder prikken
  if (!brudVagt) {
    brudVagt = new ResizeObserver((poster) => {
      for (const p of poster) {
        if (p.target !== document.documentElement) venter.add(p.target);
        else if (p.contentRect.width !== sideBredde) {
          sideBredde = p.contentRect.width;
          for (const s of document.querySelectorAll('.led-skille')) venter.add(s.parentElement);
        }
      }
      if (!planlagt) { planlagt = true; requestAnimationFrame(maalBrud); }
    });
    brudVagt.observe(document.documentElement);
  }
  fulgte.add(e);
  brudVagt.observe(e);
}

// Først vises alle prikker, så måles alle linjer, og til sidst skjules de brudte: én opstilling for alle linjer, ikke én
// pr. linje («Vælg ret» har en linje pr. ret, code review 05-11-2026). En skjult prik bryder linjen samme sted
// (.led-skille.brudt i app.css), så teksten ikke flytter sig, og det samme mål giver det samme hver gang
function maalBrud() {
  planlagt = false;
  for (const e of fulgte) if (!e.isConnected) { brudVagt.unobserve(e); fulgte.delete(e); }
  const linjer = [...venter].filter((e) => e.isConnected);
  venter.clear();
  const skillere = linjer.flatMap((e) => [...e.querySelectorAll(':scope > .led-skille')]);
  for (const s of skillere) s.classList.remove('brudt');
  const brudte = skillere.filter(brydes);
  for (const s of brudte) s.classList.add('brudt');
}

// Står leddet efter prikken på en ny linje?
function brydes(s) {
  const foer = s.previousElementSibling.getClientRects();
  const efter = s.nextElementSibling.getClientRects();
  if (!foer.length || !efter.length) return false;
  const sidst = foer[foer.length - 1];
  return efter[0].top > (sidst.top + sidst.bottom) / 2;
}

// Faste streg-ikoner (24 × 24). Stierne står her i koden og kommer aldrig fra data.
const IKONER = {
  hjem: ['M3.5 11.5 12 4.5l8.5 7', 'M6 10v9.5h12V10', 'M10 19.5v-5h4v5'],
  lup: ['M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M15.6 15.6l4.9 4.9'],
  tilbage: ['M19 12H5.5', 'M11 5.5 4.5 12l6.5 6.5'],
  naeste: ['M5 12h13.5', 'M13 5.5l6.5 6.5-6.5 6.5'],
  hoejttaler: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9.2a4 4 0 0 1 0 5.6', 'M18.2 6.6a7.6 7.6 0 0 1 0 10.8'],
  ur: ['M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z', 'M12 9.5v4l2.5 2', 'M9.5 2.8h5'],
  // En kokkekniv på skrå: bred klinge og et skaft for sig (den gamle smalle kniv lignede en blyant i trekanten, UI-review 21-10)
  kniv: ['M8.6 11.5L17.7 2.3C19.9 7.2 18.4 12.9 14.2 17.1z', 'M8.9 14L5.7 17.1C4 18.9 6.8 21.7 8.6 20L11.7 16.8z'],
  flamme: ['M12 21c-3.6 0-6.2-2.5-6.2-5.8 0-3.1 2-4.8 3.3-7.2.5 1.9 1.5 2.9 2.5 3.3.3-3 .8-5.8 2.7-7.8.6 3.4 3.9 6 3.9 10.8 0 3.9-2.6 6.7-6.2 6.7z'],
  print: ['M7 9V3.5h10V9', 'M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-2', 'M7 13.5h10v7H7z'],
  stop: ['M7.5 7.5h9v9h-9z'],
  tjek: ['M5 12.5l4.5 4.5L19 7.5'],
  igen: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v4h4'],
  // Ugeplanen og indkøbslisten (js/ugeplan.js)
  kurv: ['M3.5 10h17l-2.2 9.5H5.7z', 'M8 10l3.2-5.5', 'M16 10l-3.2-5.5', 'M9.5 13.5v3', 'M14.5 13.5v3'],
  kalender: ['M4.5 6h15v14h-15z', 'M4.5 10.5h15', 'M8.5 3.5v4', 'M15.5 3.5v4'],
  telefon: ['M8.5 3h7A1.5 1.5 0 0 1 17 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5v-15A1.5 1.5 0 0 1 8.5 3z', 'M11 17.5h2'],
  liste: ['M9.5 6.5h10', 'M9.5 12h10', 'M9.5 17.5h10', 'M4.5 6.5h1.5', 'M4.5 12h1.5', 'M4.5 17.5h1.5'],
  mere: ['M6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z', 'M13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z', 'M20.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  kryds: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  // Børnenes sidepile er vinkler som i en billedbog: med pilen fra «Tilbage» stod to ens pile over hinanden (UI-review 2, 23-10)
  forrige: ['M14.5 5l-7 7 7 7'],
  frem: ['M9.5 5l7 7-7 7'],
  // Lynet på tallerkenen ved en lynhurtig ret (lynMaerke i app.js). En lukket form, der fyldes (.lyn-ikon i app.css)
  lyn: ['M13.4 2.5L5 13.6h6l-.9 7.9 8.9-11.4h-6.1z'],
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

// «Print» som et link, der ligner en knap (print.html åbner i samme fane). tabindex: Safari springer et link uden tabindex
// over med Tab (review F2). label er navnet til skærmlæseren og begynder med den tekst, man ser (review L4). Bruges af
// voksendelen og ugeplanen, så en rettelse rammer begge (review R5, 15-11)
export function printLink(tekst, href, label, { klasse = '', kunIkonSmal = false } = {}) {
  return el('a', { class: 'knap print-link' + (klasse ? ' ' + klasse : ''), href, tabindex: '0', 'aria-label': label },
    ikon('print'), el('span', { class: kunIkonSmal ? 'kun-bred' : null, tekst }));
}
