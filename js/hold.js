// hold.js — en knap, der skal holdes inde i 2 sekunder (voksen-trin og print), så et barn ikke kommer forbi alene.
// Mus/finger: hold. Tastatur: hold mellemrum eller Enter. Et kort tryk kalder naarKort (fx «Hent en voksen»).
import { el } from './dom.js';

let blokerTilSlip = false;

// Et hold, der lykkes, skifter skærm, mens fingeren stadig er nede. Klikket ved slip må ikke ramme den nye skærm.
document.addEventListener('pointerup', () => { if (blokerTilSlip) setTimeout(() => { blokerTilSlip = false; }, 0); }, true);
document.addEventListener('pointercancel', () => { blokerTilSlip = false; }, true);
document.addEventListener('click', (e) => {
  if (!blokerTilSlip) return;
  e.stopPropagation();
  e.preventDefault();
}, true);

export function holdKnap({ klasse = '', indhold = [], label, ms = 2000, naarFaerdig, naarKort }) {
  const fyld = el('span', { class: 'hold-fyld', 'aria-hidden': 'true' });
  const b = el('button', { type: 'button', class: 'knap hold ' + klasse, 'aria-label': label }, fyld, el('span', { class: 'hold-indhold' }, indhold));
  let t0 = 0;
  let raf = 0;
  let holder = false;
  let viaPointer = false;

  function tegn() {
    const andel = Math.min(1, (performance.now() - t0) / ms);
    b.style.setProperty('--fyld', String(andel));
    if (andel >= 1) { slut(true); return; }
    raf = requestAnimationFrame(tegn);
  }
  function start(pointer) {
    if (holder) return;
    holder = true;
    viaPointer = pointer;
    t0 = performance.now();
    b.classList.add('holder');
    raf = requestAnimationFrame(tegn);
  }
  function slut(lykkedes) {
    if (!holder) return;
    cancelAnimationFrame(raf);
    holder = false;
    b.classList.remove('holder');
    b.style.setProperty('--fyld', '0');
    if (!lykkedes) return;
    if (viaPointer) blokerTilSlip = true;
    naarFaerdig();
  }
  // Kort tryk: under 2 sekunder og ikke et hold, der lige er lykkedes.
  // Det skal også kunne SES (talen alene er ikke nok, og den kan være slået fra): knappen får en ring og ryster i 1,5 s.
  let mindTid = 0;
  function kort() {
    b.classList.remove('mind');
    void b.offsetWidth; // start rystet forfra ved et nyt kort tryk
    b.classList.add('mind');
    clearTimeout(mindTid);
    mindTid = setTimeout(() => b.classList.remove('mind'), 1500);
    if (naarKort) naarKort(b);
  }

  b.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start(true);
  });
  b.addEventListener('pointerup', () => { if (holder) { slut(false); kort(); } });
  b.addEventListener('pointerleave', () => slut(false));
  b.addEventListener('pointercancel', () => slut(false));
  b.addEventListener('contextmenu', (e) => e.preventDefault()); // langt tryk på iPad åbner ellers en menu
  b.addEventListener('click', (e) => e.preventDefault());
  b.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) start(false);
  });
  b.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (holder) { slut(false); kort(); }
  });
  b.addEventListener('blur', () => slut(false));
  return b;
}
