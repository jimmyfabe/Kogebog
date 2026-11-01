// skaler.js — skalerer opskriftens mængder til husstandens portioner (docs/foraeldredel.md, afsnit 4). Ren logik: ingen
// DOM, og fra js/lager.js kommer kun konstanterne. Indkøbslisten skalerer selv sine varer (saml i js/indkoeb.js); her er
// det mængderne, som de står på opskriften («300 g», «½ tsk», «2 dåser»). Tal skrives som i opskrifterne: ½ alene, ellers
// med decimalkomma (2,5 dl).

import { BARN_ANDEL, MAKS_PORTIONER } from './lager.js';
import { boejNavn } from './tekst.js';

// Et barn spiser som 0,7 voksen, og højst 12 portioner (samme grænse som n i ugeplanen og i linket): står i js/lager.js
export { BARN_ANDEL, MAKS_PORTIONER };

const erPortioner = (n) => Number.isInteger(n) && n >= 1 && n <= MAKS_PORTIONER;
const erAntal = (x) => x === null || (Number.isInteger(x) && x >= 0);

// Kommatal fra regningen (0,7 × 10 = 7,000000000000001) giver ikke en portion eller et trin mere
const ren = (x) => Math.round(x * 1e6) / 1e6;
const rund = (x, trin) => Math.round(ren(x / trin)) * trin;
const rundOp = (x, trin) => Math.ceil(ren(x / trin)) * trin;
// Mindst ét trin, men aldrig mere end mængden før skaleringen: «¼ tsk» halveret er stadig ¼ tsk, ikke ½
const mindst = (r, trin, x0) => Math.max(r, Math.min(trin, x0));

// Husstanden som hele portioner: voksne + barnAndel × børn, rundet op (rester er bedre end for lidt) og holdt inden for
// 1-12. null, når hverken voksne eller børn er sat (så opfører appen sig som før). Kun antal, aldrig hvem (regel 6)
export function portionerFraHusstand(voksne, boern, barnAndel = BARN_ANDEL) {
  if (!erAntal(voksne) || !erAntal(boern)) {
    throw new RangeError('portionerFraHusstand: voksne og børn skal være null eller et helt tal fra 0, ikke ' + voksne + ' og ' + boern);
  }
  if (typeof barnAndel !== 'number' || !(barnAndel > 0 && barnAndel <= 1)) {
    throw new RangeError('portionerFraHusstand: barnAndel skal være et tal over 0 og højst 1, ikke ' + barnAndel);
  }
  if (voksne === null && boern === null) return null;
  const n = Math.ceil(ren((voksne || 0) + barnAndel * (boern || 0)));
  return Math.min(MAKS_PORTIONER, Math.max(1, n));
}

// Faktoren fra rettens portioner til n. null, når retten ikke har talportioner (bage- og søde retter har et udbytte som
// «16 boller» og ingen tumbi.portioner), eller når n ikke er et helt tal fra 1 til 12
export function faktorFor(model, n) {
  const portioner = model && model.uge ? model.uge.portioner : null;
  if (!erPortioner(portioner) || !erPortioner(n)) return null;
  return n / portioner;
}

const BROEK = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
const BROEK_TEKST = new Map([[0.25, '¼'], [0.5, '½'], [0.75, '¾']]);
// «ca. » (beholdes), tallet (2, 2,5, 2½ eller ½) og eventuelt ord efter et mellemrum: enheden
const MAENGDE_RE = /^(ca\. )?(\d+(?:,\d+)?|\d*[½¼¾])(?: (.+))?$/;

// «2,5» → 2.5, «2½» → 2.5, «½» → 0.5
function tilTal(t) {
  const b = BROEK[t.slice(-1)];
  if (b) return Number(t.slice(0, -1) || 0) + b;
  return Number(t.replace(',', '.'));
}

// 0.5 → «½», 2.5 → «2,5», 1.25 → «1,25»
function talTekst(x) {
  const r = Math.round(x * 100) / 100;
  return BROEK_TEKST.get(r) || String(r).replace('.', ',');
}

// Ental efter højst 1 og efter 1,5, som stemmen siger det («halvanden dåse», js/tekst.js), ellers flertal
const flertal = (x) => x > 1 && x !== 1.5;

// g og kg i gram: under 50 g til nærmeste 5 g, ellers 10 g. Fra 1 kg i kg med én decimal
function vaegt(g, g0) {
  const r = mindst(rund(g, g < 50 ? 5 : 10), 5, g0);
  return r < 1000 ? talTekst(r) + ' g' : talTekst(rund(g, 100) / 1000) + ' kg';
}

// dl og l i dl: til nærmeste ½ dl. Under 1 l i dl, ellers i l
function rumfang(dl, dl0) {
  const r = mindst(rund(dl, 0.5), 0.5, dl0);
  return r < 10 ? talTekst(r) + ' dl' : talTekst(r / 10) + ' l';
}

// Antallet rundet efter enhedens regel: x er mængden efter skaleringen, x0 før
const TAL_REGLER = {
  halve: (x, x0) => mindst(rund(x, 0.5), 0.5, x0),
  hele: (x, x0) => mindst(rund(x, 1), 1, x0),
  form: (x) => Math.max(1, rundOp(x, 1)), // dej i rulle eller plade kan ikke deles: hele, rundet op
  stk: (x, x0) => mindst(x <= 3 ? rund(x, 0.5) : rund(x, 1), 0.5, x0),
  aeg: (x) => Math.max(1, rundOp(x, 1)), // et halvt æg kan ikke måles: altid hele, rundet op
};

// Enhederne efter tallet: [ental, flertal, regel, antal i grundenheden (g eller dl) for vægt og rumfang]
const ENHED = new Map([
  ['g', 'g', 'vaegt', 1], ['kg', 'kg', 'vaegt', 1000],
  ['dl', 'dl', 'rumfang', 1], ['l', 'l', 'rumfang', 10],
  ['tsk', 'tsk', 'halve'], ['spsk', 'spsk', 'halve'],
  ['knivspids', 'knivspidser', 'uaendret'],
  ['fed', 'fed', 'hele'], ['skive', 'skiver', 'hele'], ['blad', 'blade', 'hele'],
  ['dåse', 'dåser', 'halve'], ['lille dåse', 'små dåser', 'halve'], ['pose', 'poser', 'halve'], ['glas', 'glas', 'halve'],
  ['pakke', 'pakker', 'halve'],
  ['rulle', 'ruller', 'form'], ['plade', 'plader', 'form'],
].flatMap(([ental, flertal, regel, gange]) => {
  const e = { ental, flertal, regel, gange };
  return [[ental, e], [flertal, e]];
}));

// Mængden ganget med faktoren og rundet efter enheden: { tekst, advarsel }. advarsel er null, 'form' (dej i rulle eller
// plade, rundet op til hele: formen passer ikke) eller 'ukendt' (tom mængde, et interval eller en ukendt enhed som
// «1 stort»: teksten står uændret, for der gættes aldrig). Faktor 1 giver altid den oprindelige tekst og null.
// vare er varens id i tumbi.ingredienser ('aeg' giver hele æg)
export function skalerMaengde(maengde, faktor, { vare } = {}) {
  if (typeof maengde !== 'string') throw new TypeError('skalerMaengde: mængden skal være en tekst, ikke ' + maengde);
  if (typeof faktor !== 'number' || !Number.isFinite(faktor) || faktor <= 0) {
    throw new RangeError('skalerMaengde: faktoren skal være et positivt tal, ikke ' + faktor);
  }
  if (faktor === 1) return { tekst: maengde, advarsel: null };
  const ukendt = { tekst: maengde, advarsel: 'ukendt' };
  const m = MAENGDE_RE.exec(maengde);
  if (!m) return ukendt;
  const [, ca = '', talDel, ord] = m;
  const x0 = tilTal(talDel);
  if (!(x0 > 0)) return ukendt;
  const x = x0 * faktor;
  if (ord === undefined) return { tekst: ca + talTekst(TAL_REGLER[vare === 'aeg' ? 'aeg' : 'stk'](x, x0)), advarsel: null };
  const e = ENHED.get(ord);
  if (!e) return ukendt;
  if (e.regel === 'uaendret') return { tekst: maengde, advarsel: null };
  if (e.regel === 'vaegt') return { tekst: ca + vaegt(x * e.gange, x0 * e.gange), advarsel: null };
  if (e.regel === 'rumfang') return { tekst: ca + rumfang(x * e.gange, x0 * e.gange), advarsel: null };
  const r = TAL_REGLER[e.regel](x, x0);
  return { tekst: ca + talTekst(r) + ' ' + (flertal(r) ? e.flertal : e.ental), advarsel: e.regel === 'form' ? 'form' : null };
}

// ---------- Retten og printet ved n portioner (retSkaerm i app.js og js/print.js) ----------

export const portionerTekst = (n) => n + (n === 1 ? ' portion' : ' portioner');

// Navnet efter den nye mængde: efter et antal uden enhed bøjet i ental eller flertal som enhederne («1 gulerod»,
// «2 gulerødder», «3 store løg»; boejNavn og NAVNEORD i js/tekst.js), ellers som før. Et navneord, der ikke står i
// NAVNEORD, står som i opskriften: test-skaler.js går alle retter igennem og fejler på det
function navnEfter(maengde, navn) {
  const m = MAENGDE_RE.exec(maengde);
  if (!m || m[3] !== undefined) return navn;
  const b = boejNavn(navn, flertal(tilTal(m[2])));
  return b === null ? navn : b;
}

// Ingrediens nr. i i retten (en model fra lavModel med talportioner) ganget med faktoren: { maengde, navn, tekst,
// skaleret, advarsel }. Varen fra tumbi.ingredienser gør æg hele. En mængde, der ikke ændres (tom, et interval, en
// knivspids), står uændret med opskriftens navn og er ikke markeret som skaleret; advarslen er skalerMaengdes. Skærmen
// (retSkaerm i app.js) viser maengde og navn, printet (js/print.js) tekst: de kommer begge herfra
export function skaleretIngrediens(m, i, faktor) {
  const x = m.ingredienser[i];
  const ekstra = (m.uge.tumbi.ingredienser || [])[i];
  const s = skalerMaengde(x.maengde, faktor, { vare: ekstra ? ekstra.vare : undefined });
  if (s.tekst === x.maengde) return { maengde: x.maengde, navn: x.navn, tekst: x.tekst, skaleret: false, advarsel: s.advarsel };
  const navn = navnEfter(s.tekst, x.navn);
  // Opskriftens tekst er mængden, mellemrum og navnet (delIngrediens i js/tekst.js): kun mængden og navnet skiftes ud
  const efter = x.tekst.slice(x.maengde.length);
  const mellem = efter.slice(0, efter.length - efter.trimStart().length);
  const hale = efter.trimStart().slice(x.navn.length);
  return { maengde: s.tekst, navn, tekst: s.tekst + mellem + navn + hale, skaleret: true, advarsel: s.advarsel };
}

// Til den voksne, når mængderne er regnet om: trinene læses op og nævner stadig opskriftens mængder, ved mange eller få
// portioner passer fadet og tiden måske ikke, og advarslerne fra linjerne (skaleretIngrediens for hver ingrediens): en
// mængde, der ikke kunne regnes om, og dej, der er rundet op til hele. Faktor 1 giver ingen linjer
const FADE_OVER = 1.5;
const FADE_UNDER = 0.5;
export function voksenNoter(m, faktor, linjer) {
  if (faktor === 1) return [];
  const ukendte = linjer.filter((l) => l.advarsel === 'ukendt').length;
  return [
    'Mængderne i trinene er til ' + m.uge.portioner + ' — se ingredienslisten',
    faktor > FADE_OVER ? 'Brug to fade — tiden kan blive længere' : faktor < FADE_UNDER ? 'Hold øje med tiden' : null,
    ukendte ? (ukendte === 1 ? 'Én mængde' : ukendte + ' mængder') + ' kunne ikke regnes om og står som til ' + m.uge.portioner : null,
    linjer.some((l) => l.advarsel === 'form') ? 'Dej og form er rundet op til hele — formen passer måske ikke' : null,
  ].filter(Boolean);
}
