// tekst.js — rene tekstfunktioner (ingen DOM), testes i node.

// ISO 8601-varighed (PT1H45M) → minutter. Ugyldig → null.
export function isoTilMinutter(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ''));
  if (!m || iso === 'P' || iso === 'PT') return null;
  const [, d, t, min, s] = m.map((x) => (x === undefined ? 0 : Number(x)));
  return d * 1440 + t * 60 + min + Math.round(s / 60);
}

// 105 → «1 t 45 min», 30 → «30 min»
export function minutterTekst(min) {
  if (min == null) return '';
  const t = Math.floor(min / 60);
  const r = min % 60;
  if (!t) return r + ' min';
  return r ? t + ' t ' + r + ' min' : t + ' t';
}

// Enheder skrevet ud, så stemmen siger «2,5 deciliter» og ikke «2,5 d l»
const ENHEDER = [
  [/\bdl\b/g, 'deciliter'],
  [/(\d+(?:,\d+)?)\s*spsk\b/g, (_, n) => n + (n === '1' ? ' spiseskefuld' : ' spiseskefulde')],
  [/(\d+(?:,\d+)?)\s*tsk\b/g, (_, n) => n + (n === '1' ? ' teskefuld' : ' teskefulde')],
  [/\bspsk\b/g, 'spiseskefulde'],
  [/\btsk\b/g, 'teskefulde'],
  [/\bkg\b/g, 'kilo'],
  [/\bstk\.?(?=\s|$)/g, 'stykker'],
  [/(\d)\s*g\b/g, '$1 gram'],
  [/(\d)\s*l\b/g, '$1 liter'],
  [/°C/g, 'grader'],
  [/(\d)\s*%/g, '$1 procent'],
];
export function tilTale(tekst) {
  let t = String(tekst);
  for (const [re, ud] of ENHEDER) t = t.replace(re, ud);
  return t.replace(/\s+/g, ' ').trim();
}

// Antal ord i en sætning (tegnsætning tæller ikke)
export function antalOrd(tekst) {
  return String(tekst).split(/\s+/).filter((o) => /[\p{L}\p{N}]/u.test(o)).length;
}

// «2,5 dl hvedemel» + mængden «2,5 dl» → { maengde: '2,5 dl', navn: 'hvedemel' }
export function delIngrediens(tekst, maengde) {
  const m = String(maengde || '');
  if (m && tekst.startsWith(m)) return { maengde: m, navn: tekst.slice(m.length).trim() };
  return { maengde: '', navn: tekst };
}
