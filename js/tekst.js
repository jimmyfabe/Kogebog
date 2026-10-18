// tekst.js — rene tekstfunktioner (ingen DOM), testes i node.

// ISO 8601-varighed (PT1H45M) → minutter. Ugyldig → null.
export function isoTilMinutter(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ''));
  if (!m || iso === 'P' || iso === 'PT') return null;
  const [, d, t, min, s] = m.map((x) => (x === undefined ? 0 : Number(x)));
  return d * 1440 + t * 60 + min + Math.round(s / 60);
}

// 105 → «1 t 45 min», 30 → «30 min». Hårde mellemrum (U+00A0), så tiden aldrig brydes over to linjer
const H = '\u00a0';
export function minutterTekst(min) {
  if (min == null) return '';
  const t = Math.floor(min / 60);
  const r = min % 60;
  if (!t) return r + H + 'min';
  return r ? t + H + 't' + H + r + H + 'min' : t + H + 't';
}

// Enheder skrevet ud, så stemmen siger «2,5 deciliter» og ikke «2,5 d l».
// Grænserne er Unicode (\p{L}), ikke \b: \b kender kun a-z, så «l» i «1 løg» og «g» i «2 gås» lignede en enhed.
const ENHEDER = [
  [/(?<!\p{L})dl(?![\p{L}\p{N}])/gu, 'deciliter'],
  [/(\d+(?:,\d+)?)\s*spsk(?![\p{L}\p{N}])/gu, (_, n) => n + (n === '1' ? ' spiseskefuld' : ' spiseskefulde')],
  [/(\d+(?:,\d+)?)\s*tsk(?![\p{L}\p{N}])/gu, (_, n) => n + (n === '1' ? ' teskefuld' : ' teskefulde')],
  [/(?<!\p{L})spsk(?![\p{L}\p{N}])/gu, 'spiseskefulde'],
  [/(?<!\p{L})tsk(?![\p{L}\p{N}])/gu, 'teskefulde'],
  [/(?<!\p{L})kg(?![\p{L}\p{N}])/gu, 'kilo'],
  [/(?<!\p{L})stk\.?(?=\s|$)/gu, 'stykker'],
  [/(\d)\s*g(?![\p{L}\p{N}])/gu, '$1 gram'],
  [/(\d)\s*l(?![\p{L}\p{N}])/gu, '$1 liter'],
  [/°C/g, 'grader'],
  [/(\d)\s*%/g, '$1 procent'],
];
// Den bløde bindestreg (U+00AD) i et navn som «Havregryns­kugler» viser, hvor ordet må deles på et smalt kort.
// Den er kun til skærmen og fjernes, før teksten læses op.
export function tilTale(tekst) {
  let t = String(tekst).replace(/­/g, '');
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
