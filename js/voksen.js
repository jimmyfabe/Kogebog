// voksen.js — det, der viser, at en voksen skal hjælpe: en gul advarselstrekant med kniven eller flammen, og «Næste»,
// som den voksne holder inde i 2 s. Intet her læser op. Før sagde hvert voksen-trin og hvert kort tryk på «Næste»
// «Hent en voksen», og det blev man træt af at høre på (Jimmy 21-10-2026). Nu siges det én gang, når retten åbnes
// (R.voksenStart i js/replikker.js), og et kort tryk vipper trekanten (hold.js giver selv knappen en ring og et ryst).
import { el, ikon, svgEl } from './dom.js';
import { holdKnap } from './hold.js';

const VIP_MS = 1500; // som ringen på hold-knappen (hold.js)

// En trekant med runde hjørner (stroke-linejoin i app.css) og ikonet i den brede, nederste del.
// label: navnet til skærmlæseren (role="img"); uden label er trekanten pynt ved siden af en tekst, der siger det samme
export function trekant(slags, { label, klasse = '' } = {}) {
  const form = svgEl('svg', { viewBox: '0 0 100 90', class: 'trekant-form', 'aria-hidden': 'true', focusable: 'false' });
  form.append(svgEl('path', { d: 'M50 8 93 82H7z' }));
  return el('span', { class: ('trekant ' + klasse).trim(), role: label ? 'img' : null, 'aria-label': label },
    form, ikon(slags === 'kniv' ? 'kniv' : 'flamme', 'ikon trekant-ikon'));
}

// Trekanten vipper kort (app.css: kun uden «mindre bevægelse»; ellers lyser den op). Et nyt tryk starter forfra
export function vip(e) {
  if (!e) return;
  clearTimeout(e.vipTid);
  e.classList.remove('vipper');
  void e.offsetWidth;
  e.classList.add('vipper');
  e.vipTid = setTimeout(() => e.classList.remove('vipper'), VIP_MS);
}

// «Næste» (eller «Færdig») på et voksen-trin: holdes inde i 2 s. Et kort tryk siger ingenting, men vipper trekanten
export function voksenNaeste({ tekst, trekant: tr, naarFaerdig }) {
  return holdKnap({
    klasse: 'primaer naeste voksen-hold',
    label: tekst + '. Den voksne holder knappen inde i 2 sekunder.',
    indhold: [el('span', { class: 'hold-tekst' }, el('span', { tekst }), el('small', { tekst: 'Voksen: hold' })), ikon('naeste')],
    naarFaerdig,
    naarKort: () => vip(tr),
  });
}
