// lager.js — det eneste, der rører localStorage. Nøglen «kog-v1» har et versionsfelt.
// Indhold: { v: 1, sidste: { ret, nr, tid } | null, timer: { ret, nr, start, slut, sek } | null }
// timer er også gemt, når tiden er gået, til nogen trykker «Ok» (slut ligger så i fortiden).
// Der er ingen fremskridt eller børnedata her; mister vi det, mister man kun «Fortsæt» og en kørende timer.
// Ugeplanen og indkøbslisten har deres egne nøgler længere nede (hentUge/gemUge/hentListe/gemListe).
import { VARER, DYR } from './katalog.js';
import { erMandag } from './plankode.js';

const NOEGLE = 'kog-v1';
const VERSION = 1;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const tomt = () => ({ v: VERSION, sidste: null, timer: null });
const erNr = (n) => Number.isInteger(n) && n > 0;

function rens(j) {
  const ud = tomt();
  if (!j || typeof j !== 'object' || j.v !== VERSION) return ud; // ukendt eller ældre udgave: start forfra
  const s = j.sidste;
  if (s && ID_RE.test(String(s.ret)) && erNr(s.nr) && Number.isFinite(s.tid)) ud.sidste = { ret: s.ret, nr: s.nr, tid: s.tid };
  const t = j.timer;
  if (t && ID_RE.test(String(t.ret)) && erNr(t.nr) && Number.isFinite(t.start) && Number.isFinite(t.slut) && erNr(t.sek)) {
    ud.timer = { ret: t.ret, nr: t.nr, start: t.start, slut: t.slut, sek: t.sek };
  }
  return ud;
}

export function hent() {
  try {
    return rens(JSON.parse(localStorage.getItem(NOEGLE) || 'null'));
  } catch (e) {
    return tomt(); // privat browsing eller ødelagt JSON
  }
}

export function gem(aendring) {
  const ny = rens({ ...hent(), ...aendring, v: VERSION });
  try {
    localStorage.setItem(NOEGLE, JSON.stringify(ny));
  } catch (e) {
    /* lageret er fuldt eller slået fra: appen virker stadig, den husker bare ikke */
  }
  return ny;
}

// ---------- Ugeplanen og indkøbslisten (docs/ugeplan-plan.md, afsnit 3) ----------
//   kog-uge-v1 (iPad'en):    { v: 1, uge: 'ÅÅÅÅ-MM-DD' (en mandag), dage: [{ ret, af, n } | null] × 7, n, prBarn, rettet }
//   kog-liste-v1 (telefonen): { v: 1, kode, uge, varer: [{ id, m }], koebt: [id], harVi: [id], hentet }
// Alt renses ved læsning: ret skal stå i «retter» (index.json), varerne i VARER (Object.hasOwn), af er et af DYR
// (bo, rosa, pip: aldrig børnenes navne), n er 1-12, m er 0-100.000, og der er højst 200 varer.
// «retter» filtrerer kun det, der vises, og nye dage: gemUge renser den gemte plan for form og grænser, ikke for «retter»,
// så en kort liste (en hentning, der mangler) aldrig sletter gemte dage. Et felt sat til undefined er ingen ændring.
// Versionsvagten: et højere v er skrevet af en nyere udgave af appen. Det læses som tomt og skrivebeskyttes («laast»), så
// gammel kode fra service workerens cache aldrig skriver ovenpå. Et lavere v løftes ét trin ad gangen af MIGRER_*
// (v1 er den første udgave, så kæderne er tomme). rens() for kog-v1 nulstiller i stedet og må ikke kopieres hertil.
const UGE = 'kog-uge-v1';
const LISTE = 'kog-liste-v1';
const UGE_V = 1;
const LISTE_V = 1;
const MIGRER_UGE = {}; // { 1: (j) => samme data i v2 } den dag, v2 kommer
const MIGRER_LISTE = {};
const MAKS_VARER = 200;
const MAKS_M = 100000;
const MAKS_KODE = 400;
const MAKS_ID = 40; // samme grænse som et ret-id i linket (plankode.js)
const KODE_RE = /^[a-z0-9._~-]+$/;
const DATO_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const erPortioner = (n) => Number.isInteger(n) && n >= 1 && n <= 12;
const erDato = (s) => typeof s === 'string' && DATO_RE.test(s);
const erRetId = (s) => typeof s === 'string' && s.length <= MAKS_ID && ID_RE.test(s);
const udenUndefined = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined));

// Læser en nøgle gennem versionsvagten: { j, laast }, hvor j er data i den nuværende udgave eller null
function laesMedVagt(noegle, version, migrer) {
  let j;
  try {
    j = JSON.parse(localStorage.getItem(noegle) || 'null');
  } catch (e) {
    return { j: null, laast: false }; // privat browsing eller ødelagt JSON
  }
  if (!j || typeof j !== 'object') return { j: null, laast: false };
  if (typeof j.v === 'number' && j.v > version) return { j: null, laast: true };
  while (Number.isInteger(j.v) && j.v < version && Object.hasOwn(migrer, j.v)) j = migrer[j.v](j);
  return { j: j && j.v === version ? j : null, laast: false };
}

function skriv(noegle, data) {
  try {
    localStorage.setItem(noegle, JSON.stringify(data));
    return true;
  } catch (e) {
    return false; // lageret er fuldt eller slået fra
  }
}

// Beder browseren om ikke at rydde lageret af sig selv. Safari svarer efter sin egen vurdering; et nej er ingen fejl
function bevar() {
  try {
    const p = globalThis.navigator?.storage?.persist?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {
    /* findes ikke i denne browser */
  }
}

const tomUge = () => ({ v: UGE_V, uge: null, dage: [null, null, null, null, null, null, null], n: 4, prBarn: 1, rettet: null });

// erKendt(id): må retten stå her. Formen på id'et tjekkes altid
function rensUge(j, erKendt) {
  const ud = tomUge();
  if (!j) return ud;
  if (erMandag(j.uge)) ud.uge = j.uge; // kun en rigtig mandag: ellers kan planen ikke kodes til linket (S1)
  if (Array.isArray(j.dage) && j.dage.length === 7) {
    ud.dage = j.dage.map((d) => (d && erRetId(d.ret) && erKendt(d.ret) && typeof d.af === 'string' &&
      Object.hasOwn(DYR, d.af) && erPortioner(d.n) ? { ret: d.ret, af: d.af, n: d.n } : null));
  }
  if (erPortioner(j.n)) ud.n = j.n;
  if (j.prBarn === 1 || j.prBarn === 2) ud.prBarn = j.prBarn;
  if (Number.isFinite(j.rettet)) ud.rettet = j.rettet;
  return ud;
}

function tjekRetter(retter) {
  if (!Array.isArray(retter)) throw new TypeError('retter skal være en liste med id\'erne fra index.json');
}

// retter: id'erne på de retter, der må stå i planen. Svaret har altid «laast» (true: en nyere udgave har skrevet planen)
export function hentUge(retter) {
  tjekRetter(retter);
  const { j, laast } = laesMedVagt(UGE, UGE_V, MIGRER_UGE);
  return { ...rensUge(j, (id) => retter.includes(id)), laast };
}

// Gemmer ændringen oven på den gemte plan og returnerer planen, som hentUge(retter) viser den (uden «laast»), eller
// null, når planen er låst, eller lageret fejler. En ny dag skal stå i «retter» eller allerede stå i den gemte plan
export function gemUge(aendring, retter) {
  tjekRetter(retter);
  const { j, laast } = laesMedVagt(UGE, UGE_V, MIGRER_UGE);
  if (laast) return null;
  const gl = rensUge(j, () => true);
  const tilladt = [...retter, ...gl.dage.filter(Boolean).map((d) => d.ret)];
  const ny = rensUge({ ...gl, ...udenUndefined(aendring), v: UGE_V }, (id) => tilladt.includes(id));
  if (!skriv(UGE, ny)) return null;
  bevar();
  return rensUge(ny, (id) => retter.includes(id));
}

const tomListe = () => ({ v: LISTE_V, kode: null, uge: null, varer: [], koebt: [], harVi: [], hentet: null });

function rensListe(j) {
  const ud = tomListe();
  if (!j) return ud;
  if (typeof j.kode === 'string' && j.kode.length <= MAKS_KODE && KODE_RE.test(j.kode)) ud.kode = j.kode;
  if (erDato(j.uge)) ud.uge = j.uge;
  if (Array.isArray(j.varer)) {
    for (const x of j.varer.slice(0, MAKS_VARER)) {
      if (!x || typeof x.id !== 'string' || !Object.hasOwn(VARER, x.id)) continue;
      if (!Number.isFinite(x.m) || x.m < 0 || x.m > MAKS_M || ud.varer.some((y) => y.id === x.id)) continue;
      ud.varer.push({ id: x.id, m: x.m });
    }
  }
  // Afkrydsningerne gælder kun varer på listen, hver én gang
  const ids = (a) => (Array.isArray(a)
    ? [...new Set(a.slice(0, MAKS_VARER).filter((id) => typeof id === 'string' && ud.varer.some((x) => x.id === id)))]
    : []);
  ud.koebt = ids(j.koebt);
  ud.harVi = ids(j.harVi);
  if (Number.isFinite(j.hentet)) ud.hentet = j.hentet;
  return ud;
}

// Svaret har altid «laast» (true: en nyere udgave har skrevet listen)
export function hentListe() {
  const { j, laast } = laesMedVagt(LISTE, LISTE_V, MIGRER_LISTE);
  return { ...rensListe(j), laast };
}

// Gemmer ændringen oven på den gemte liste og returnerer det gemte, eller null, når listen er låst, eller lageret fejler.
// Et felt sat til undefined er ingen ændring (som i gemUge): { varer: undefined } tømte før listen
export function gemListe(aendring) {
  const { j, laast } = laesMedVagt(LISTE, LISTE_V, MIGRER_LISTE);
  if (laast) return null;
  const ny = rensListe({ ...rensListe(j), ...udenUndefined(aendring), v: LISTE_V });
  return skriv(LISTE, ny) ? ny : null;
}

// fn kaldes, når en anden fane har ændret indkøbslisten (linket trykket to gange). Browseren sender kun hændelsen til
// de andre faner, aldrig til den, der skrev
export function vedListeAendring(fn) {
  globalThis.addEventListener?.('storage', (e) => {
    if (e.key === LISTE || e.key === null) fn();
  });
}
