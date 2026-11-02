// test-voksen-del.js — voksendelens logik (js/voksen-del.js, docs/foraeldredel.md afsnit 2-5): adresserne, låsen (hold,
// 10 minutter uden tryk, ud af #/voksen…), «Fyld op med nye», afkrydsningen og filtrene i udvalget. Skærmene selv
// prøves i WebKit. js/hold.js lytter på document, når den indlæses, så testen giver et lille falsk document først.
// Kør:  node test/test-voksen-del.js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lager from '../js/lager.js';
import { lavModel } from '../js/model.js';

// Et lille falsk DOM: nok til, at voksendelens skærme kan tegnes og trykkes på. Elementerne husker deres børn, attributter
// og lyttere; send(e, 'click') kalder lytterne. querySelector kender kun '[data-fokus="…"]' og 'main h1' på den viste skærm
const lyttere = {};
let fokus = null;
const lavEl = (tag) => ({
  tag, born: [], attr: {}, dataset: {}, lyt: {}, hidden: false, value: '', open: false,
  style: { setProperty() {} }, classList: { add() {}, remove() {} },
  setAttribute(k, v) { this.attr[k] = String(v); if (k === 'open') this.open = true; },
  getAttribute(k) { return Object.hasOwn(this.attr, k) ? this.attr[k] : null; },
  append(...b) { this.born.push(...b); }, prepend(...b) { this.born.unshift(...b); }, replaceChildren(...b) { this.born = b; },
  addEventListener(type, fn) { (this.lyt[type] ??= []).push(fn); },
  focus() { fokus = this; }, blur() { if (fokus === this) fokus = null; },
});
const alleI = (e) => (e && typeof e === 'object' ? [e, ...(e.born || []).flatMap(alleI)] : []);
const find = (rod, f) => alleI(rod).filter((e) => e.tag && f(e));
const tekstAf = (e) => (e == null ? '' : typeof e.tekst === 'string' ? e.tekst : (e.textContent ?? '') + (e.born || []).map(tekstAf).join(''));
const send = (e, type) => { for (const fn of e.lyt[type] || []) fn({ preventDefault() {}, type }); };
const vist = [];
globalThis.document = {
  addEventListener: (type, fn) => { (lyttere[type] ??= []).push(fn); },
  createElement: lavEl,
  createElementNS: (ns, tag) => lavEl(tag),
  createTextNode: (tekst) => ({ tekst }),
  querySelector: (sel) => {
    const m = /^\[data-fokus="([^"]*)"\]$/.exec(sel);
    const skaerm = vist.at(-1);
    if (m) return find(skaerm, (e) => e.dataset.fokus === m[1])[0] ?? null;
    if (sel === 'main h1') return find(skaerm, (e) => e.tag === 'h1')[0] ?? null;
    return null;
  },
  get activeElement() { return fokus; },
};
globalThis.location = { hash: '#/' };
// Skærmens størrelse til matchMedia: kun (max-width: …), (max-height: …) og (pointer: coarse), som voksendelen bruger
const skaermMaal = { b: 1280, h: 800, groft: false };
globalThis.matchMedia = (q) => ({
  matches: q.split(',').some((alt) => alt.trim().split(/\s+and\s+/).every((del) => {
    const m = /^\(\s*([a-z-]+)\s*:\s*([a-z0-9.]+)\s*\)$/.exec(del.trim());
    if (!m) throw new Error('matchMedia i testen kender ikke ' + del);
    if (m[1] === 'max-width') return skaermMaal.b <= parseFloat(m[2]);
    if (m[1] === 'max-height') return skaermMaal.h <= parseFloat(m[2]);
    if (m[1] === 'pointer') return (m[2] === 'coarse') === skaermMaal.groft;
    throw new Error('matchMedia i testen kender ikke ' + del);
  })),
});
const lageret = new Map();
globalThis.localStorage = {
  getItem: (k) => (lageret.has(k) ? lageret.get(k) : null),
  setItem: (k, v) => { lageret.set(k, String(v)); },
  removeItem: (k) => { lageret.delete(k); },
};

const V = await import('../js/voksen-del.js');
const { el } = await import('../js/dom.js');

// app.js' hjælpere, så tyndt som muligt: statusSkaerm giver sine valg tilbage, så vagten kan genkendes. vis() tegner
// adressens skærm igen, som app.js gør
let visKald = 0;
const S = { ids: [], retter: new Map(), grupper: [] };
V.init({
  S,
  naviger: (hash) => { location.hash = hash; },
  vis: () => { visKald++; V.rute(location.hash); },
  visSkaerm: (s) => { vist.push(s); },
  statusSkaerm: (valg) => ({ status: valg }),
  knap: (tekst, { klasse = '', label, onclick } = {}) => el('button', { type: 'button', class: 'knap ' + klasse, 'aria-label': label, onclick }, tekst ? el('span', { tekst }) : null),
  klik: (fn) => fn,
  billede: () => lavEl('img'),
  topbar: () => lavEl('header'),
  annoncer: () => {},
  indlaes: () => {},
});
const tryk = () => { for (const fn of lyttere.pointerdown) fn(); };
const MIN = 60 * 1000;

test('adresserne: kun #/voksen og #/voksen/… er voksendelens, og en ukendt side er oversigten', () => {
  const tabel = [
    ['#/voksen', 'hub'], ['#voksen', 'hub'], ['#/voksen/', 'hub'], ['#/voksen/husstand', 'husstand'],
    ['#/voksen/udvalg', 'udvalg'], ['#/voksen/favoritter', 'favoritter'], ['#/voksen/katalog', 'katalog'], ['#/voksen/ukendt', 'hub'],
    ['#/voksen/katalog/x', 'hub'],
    ['#/voksenx', null], ['#/uge', null], ['#/', null], ['', null], ['#/ret/voksen', null], ['#/uge/voksen', null],
  ];
  for (const [hash, side] of tabel) assert.equal(V.voksenSide(hash), side, hash);
});

test('låst: en adresse herinde viser holdet først, og aabn() låser op og går til oversigten', () => {
  assert.equal(V.erLaastOp(), false);
  vist.length = 0;
  assert.equal(V.rute('#/voksen/udvalg'), true);
  assert.equal(vist.length, 1);
  assert.equal(vist[0].status.titel, 'Til de voksne', 'vagten (holdet) skal vises, ikke udvalget');
  V.aabn();
  assert.equal(V.erLaastOp(), true);
  assert.equal(location.hash, '#/voksen');
});

test('låsen lukker, når man forlader #/voksen…', () => {
  V.aabn();
  assert.equal(V.rute('#/uge'), false);
  assert.equal(V.erLaastOp(), false);
  V.aabn();
  assert.equal(V.rute('#/'), false);
  assert.equal(V.erLaastOp(), false);
});

test('låsen lukker efter 10 minutter uden tryk, og skærmen bliver til holdet', (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  V.aabn();
  const foer = visKald;
  mock.timers.tick(V.LUK_MS - 1);
  assert.equal(V.erLaastOp(), true);
  mock.timers.tick(1);
  assert.equal(V.erLaastOp(), false);
  assert.equal(visKald, foer + 1, 'skærmen skal tegnes igen (som holdet), når tiden er gået');
});

test('et tryk holder den åben i 10 minutter mere', (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  V.aabn();
  mock.timers.tick(9 * MIN);
  tryk();
  mock.timers.tick(2 * MIN);
  assert.equal(V.erLaastOp(), true, '11 minutter efter åbningen, men 2 efter trykket');
  mock.timers.tick(8 * MIN - 1);
  assert.equal(V.erLaastOp(), true);
  mock.timers.tick(1);
  assert.equal(V.erLaastOp(), false, '10 minutter efter trykket');
});

test('et tryk, efter at tiden er gået, lukker i stedet for at forlænge (iPad\'en sov, så timeren ikke kom)', (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  V.aabn();
  mock.timers.setTime(1_000_000 + V.LUK_MS + MIN);
  const foer = visKald;
  tryk();
  assert.equal(V.erLaastOp(), false);
  assert.equal(visKald, foer + 1);
  mock.timers.setTime(1_000_000 + V.LUK_MS + 2 * MIN);
  tryk();
  assert.equal(V.erLaastOp(), false, 'et tryk på en låst voksendel låser ikke op');
  V.rute('#/');
});

test('«Fyld op med nye»: kun retter, der aldrig er lavet, i listens rækkefølge, 4 ad gangen og højst 24', () => {
  const lavet = { b: { gange: 1, sidst: '2026-10-30' }, d: { gange: 3, sidst: '2026-10-01' } };
  const kandidater = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.deepEqual(V.fyldOp([], kandidater, lavet), ['a', 'c', 'e', 'f']);
  assert.deepEqual(V.fyldOp(['x', 'a'], kandidater, lavet), ['x', 'a', 'c', 'e', 'f', 'g'], 'en ret i udvalget tages ikke igen');
  assert.deepEqual(V.fyldOp([], kandidater, lavet, { antal: V.UDVALG_STANDARD }), ['a', 'c', 'e', 'f', 'g', 'h'], 'færre nye end ønsket: dem der er');
  assert.deepEqual(V.fyldOp(['a'], ['b', 'd'], lavet), ['a'], 'alle er lavet: intet nyt');
  const fuld = Array.from({ length: 22 }, (_, i) => 'r' + i);
  assert.deepEqual(V.fyldOp(fuld, kandidater, lavet), [...fuld, 'a', 'c'], 'aldrig over 24');
  assert.equal(V.fyldOp([...fuld, 'a', 'c'], kandidater, lavet).length, V.UDVALG_MAKS);
  assert.deepEqual(V.fyldOp([], ['a', 'a', 'c'], {}), ['a', 'c'], 'ingen dubletter');
  assert.deepEqual(V.fyldOp([], ['constructor', 'a'], {}), ['constructor', 'a'], 'Object.hasOwn: «constructor» er ikke lavet');
});

test('grænserne for husstanden og udvalget kommer fra js/lager.js, ikke en lokal kopi', () => {
  assert.equal(V.UDVALG_MAKS, lager.MAKS_UDVALG);
  assert.equal(V.MAKS_PERSONER, lager.MAKS_PERSONER);
  assert.equal(V.UDVALG_MAKS, 24);
  assert.equal(V.MAKS_PERSONER, 8);
});

test('afkrydsningen i udvalget: ind, ud, og intet nyt, når der er 24', () => {
  assert.deepEqual(V.skiftIUdvalg([], 'a'), ['a']);
  assert.deepEqual(V.skiftIUdvalg(['a', 'b'], 'a'), ['b']);
  const fuld = Array.from({ length: V.UDVALG_MAKS }, (_, i) => 'r' + i);
  assert.equal(V.skiftIUdvalg(fuld, 'ny'), null);
  assert.deepEqual(V.skiftIUdvalg(fuld, 'r3'), fuld.filter((x) => x !== 'r3'), 'en ret kan altid tages ud af et fuldt udvalg');
});

test('filtrene: en ret skal have alle de valgte mærker, og ingen filtre viser alle', () => {
  const retter = [{ id: 'a', mk: ['hurtig', 'vegetar'] }, { id: 'b', mk: ['hurtig'] }, { id: 'c', mk: [] }];
  const af = (m) => m.mk;
  const ids = (valgte) => V.medMaerker(retter, valgte, af).map((m) => m.id);
  assert.deepEqual(ids([]), ['a', 'b', 'c']);
  assert.deepEqual(ids(['hurtig']), ['a', 'b']);
  assert.deepEqual(ids(['hurtig', 'vegetar']), ['a']);
  assert.deepEqual(ids(['fisk']), []);
});

// Søgeposter som i kataloget: { m, gruppeId, noegler } med navnene, soeg() i js/soeg.js søger i
const model = (id, navn, ingredienser = []) => ({ id, navn, ingredienser: ingredienser.map((n) => ({ navn: n })) });
const POSTER = [
  V.soegePost(model('gloegg', 'Børnegløgg', ['æblemost']), 'jul', ['ingenKniv']),
  V.soegePost(model('kylling', 'Kylling i karry', ['kyllingebryst', 'ris']), 'aftensmad', ['hurtig', 'groent']),
  V.soegePost(model('laks', 'Laks med ris', ['laksefilet', 'ris']), 'aftensmad', ['fisk', 'hurtig']),
  V.soegePost(model('boller', 'Boller', ['hvedemel']), 'bagning', []),
  V.soegePost(model('risalamande', 'Risalamande', ['grødris']), 'jul', ['favorit']),
];

test('soegePost: gruppens og mærkernes navne kommer fra GRUPPER og MAERKER, og en ukendt gruppe har intet navn', () => {
  const p = POSTER[1];
  assert.equal(p.gruppe, 'Aftensmad');
  assert.deepEqual(p.maerker, ['Hurtig', 'Masser af grønt']);
  assert.equal(p.navn, 'Kylling i karry');
  assert.equal(p.m.id, 'kylling');
  assert.deepEqual(p.noegler, ['hurtig', 'groent']);
  assert.equal(V.soegePost(model('x', 'X'), 'ukendt', []).gruppe, null);
  assert.equal(V.soegePost(model('x', 'X'), 'constructor', []).gruppe, null, 'Object.hasOwn: «constructor» er ikke en gruppe');
  assert.equal(V.soegePost(model('x', 'X'), null, []).gruppe, null);
});

test('filtrer: gruppen, alle de valgte mærker og søgeteksten gælder sammen, og intet valgt viser alle', () => {
  const ids = (valg) => V.filtrer(POSTER, valg).map((p) => p.m.id);
  assert.deepEqual(ids(), ['gloegg', 'kylling', 'laks', 'boller', 'risalamande']);
  assert.deepEqual(ids({ gruppe: 'jul' }), ['gloegg', 'risalamande']);
  assert.deepEqual(ids({ gruppe: null, tekst: '' }), ['gloegg', 'kylling', 'laks', 'boller', 'risalamande']);
  assert.deepEqual(ids({ maerker: ['hurtig'] }), ['kylling', 'laks']);
  assert.deepEqual(ids({ maerker: ['hurtig', 'fisk'] }), ['laks']);
  assert.deepEqual(ids({ tekst: 'ris' }), ['kylling', 'laks', 'risalamande'], 'ingrediensen «ris» og navnet «Risalamande»');
  assert.deepEqual(ids({ gruppe: 'aftensmad', tekst: 'ris' }), ['kylling', 'laks']);
  assert.deepEqual(ids({ gruppe: 'aftensmad', maerker: ['fisk'], tekst: 'ris' }), ['laks']);
  assert.deepEqual(ids({ tekst: 'jul' }), ['gloegg', 'risalamande'], 'gruppens navn «Jul»');
  assert.deepEqual(ids({ tekst: 'Favorit' }), ['risalamande'], 'mærkets navn');
  assert.deepEqual(ids({ gruppe: 'bagning', tekst: 'ris' }), [], 'ingen træf');
  assert.deepEqual(ids({ gruppe: 'halloween' }), []);
});

test('linjen over listen: «Viser alle N retter» uden filter, ellers «Viser n af N retter» (hårdt mellemrum før «retter»)', () => {
  assert.equal(V.visTekst(125, 125), 'Viser alle 125 retter');
  assert.equal(V.visTekst(24, 125), 'Viser 24 af 125 retter');
  assert.equal(V.visTekst(0, 125), 'Viser 0 af 125 retter');
  assert.equal(V.visTekst(1, 1), 'Viser 1 ret');
  assert.equal(V.visTekst(0, 1), 'Viser 0 af 1 ret');
});

test('husstanden i ord: ental og flertal, og et tomt antal står ikke med', () => {
  assert.equal(V.husstandTekst(2, 2), '2 voksne og 2 børn');
  assert.equal(V.husstandTekst(1, 1), '1 voksen og 1 barn');
  assert.equal(V.husstandTekst(2, 0), '2 voksne');
  assert.equal(V.husstandTekst(null, 3), '3 børn');
  assert.equal(V.husstandTekst(null, null), '');
});

test('husstandens sum: loftet på 12 portioner siges, når det skærer ned, og kun da', () => {
  assert.deepEqual(V.husstandSum(8, 8, 0.7), { n: 12, loft: true });
  assert.deepEqual(V.husstandSum(8, 6, 0.7), { n: 12, loft: true });
  assert.deepEqual(V.husstandSum(8, 8, 0.5), { n: 12, loft: false });
  assert.deepEqual(V.husstandSum(8, 5, 0.8), { n: 12, loft: false });
  assert.deepEqual(V.husstandSum(2, 2, 0.7), { n: 4, loft: false });
  assert.deepEqual(V.husstandSum(null, null, 0.7), { n: null, loft: false });
  for (let voksne = 0; voksne <= lager.MAKS_PERSONER; voksne++) {
    for (let boern = 0; boern <= lager.MAKS_PERSONER; boern++) {
      for (const andel of V.BARN_VALG) {
        const { n, loft } = V.husstandSum(voksne, boern, andel);
        const raa = Math.ceil(Math.round((voksne + andel * boern) * 1e6) / 1e6);
        assert.equal(loft, raa > lager.MAKS_PORTIONER, voksne + ' + ' + boern + ' × ' + andel);
        assert.equal(n, loft ? lager.MAKS_PORTIONER : voksne + boern ? raa : 1, voksne + ' + ' + boern + ' × ' + andel);
      }
    }
  }
});

// ---------- Skærmene med de rigtige opskrifter (i det falske DOM øverst) ----------

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IX = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', 'index.json'), 'utf8'));
function medOpskrifter() {
  S.grupper = IX.grupper;
  S.ids = IX.grupper.flatMap((g) => g.retter);
  for (const id of S.ids) S.retter.set(id, lavModel(JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'))));
}
const harKlasse = (e, k) => typeof e.className === 'string' && e.className.split(/\s+/).includes(k);
const medKlasse = (rod, k) => find(rod, (e) => harKlasse(e, k));
const medFokusNavn = (rod, n) => find(rod, (e) => e.dataset.fokus === n)[0];
const raekkerI = (rod) => find(rod, (e) => e.tag === 'li' && e.attr['data-ret']).map((e) => e.attr['data-ret']);
const feltI = (rod) => find(rod, (e) => e.tag === 'input')[0];
const talI = (rod) => tekstAf(medKlasse(rod, 'soeg-tal')[0]);
const ingenTekst = (rod) => tekstAf(find(medKlasse(rod, 'voksen-tom')[0], (e) => e.tag === 'p')[0]);
const knapperI = (rod) => find(rod, (e) => e.tag === 'button').map((b) => b.dataset.fokus);
function skriv(rod, tekst) {
  const f = feltI(rod);
  f.value = tekst;
  send(f, 'input');
}
// Låser op og viser voksendelens side på en skærm b × h (under 701 px: en telefon med fingre). Svar: den viste skærm
function aabnSide(side, { b = 1280, h = 800 } = {}) {
  Object.assign(skaermMaal, { b, h, groft: b <= 700 });
  lageret.clear();
  V.aabn();
  location.hash = '#/voksen/' + side;
  V.rute(location.hash);
  return vist.at(-1);
}

test('søgefeltet på kataloget, udvalget og favoritterne: tallet og listen følger hvert tegn, og feltet tegnes ikke om', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const uge = S.ids.filter((id) => S.retter.get(id).uge);
  for (const [side, alle] of [['katalog', S.ids], ['udvalg', uge], ['favoritter', S.ids]]) {
    const skaerm = aabnSide(side);
    const antal = vist.length;
    assert.deepEqual(raekkerI(skaerm), alle, side + ': alle retter i starten');
    assert.equal(talI(skaerm), V.visTekst(alle.length, alle.length), side);
    skriv(skaerm, 'kylling');
    const kylling = raekkerI(skaerm);
    assert.ok(kylling.length > 0 && kylling.length < alle.length, side + ': «kylling» viser nogle af retterne (' + kylling.length + ')');
    assert.equal(talI(skaerm), V.visTekst(kylling.length, alle.length), side);
    skriv(skaerm, 'xyzzy');
    assert.deepEqual(raekkerI(skaerm), [], side + ': ingen træf');
    assert.equal(ingenTekst(skaerm), 'Ingen retter passer til «xyzzy».', side);
    assert.equal(talI(skaerm), V.visTekst(0, alle.length), side);
    send(medFokusNavn(skaerm, 'ryd-soegning'), 'click');
    assert.equal(feltI(skaerm).value, '', side + ': «Ryd søgningen» tømmer feltet');
    assert.equal(fokus, feltI(skaerm), side + ': og giver det fokus');
    assert.deepEqual(raekkerI(skaerm), alle, side + ': og viser alle retter igen');
    assert.equal(vist.length, antal, side + ': skærmen er ikke tegnet om, mens der blev skrevet');
  }
});

test('ingen træf med filtre: «Fjern filtrene» står ved «Ryd søgningen» i kataloget (gruppen) og udvalget (mærket)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  for (const [side, chip, fjernet] of [['katalog', 'gruppe-halloween', S.ids.length], ['udvalg', 'filter-fisk', S.ids.filter((id) => S.retter.get(id).uge).length]]) {
    aabnSide(side);
    send(medFokusNavn(vist.at(-1), chip), 'click');
    assert.equal(medFokusNavn(vist.at(-1), chip).getAttribute('aria-pressed'), 'true', side + ': ' + chip + ' er valgt');
    skriv(vist.at(-1), 'xyzzy');
    assert.equal(ingenTekst(vist.at(-1)), 'Ingen retter passer til «xyzzy» med de valgte filtre.', side);
    assert.deepEqual(knapperI(medKlasse(vist.at(-1), 'voksen-tom')[0]), ['ryd-soegning', 'fjern-filtre'], side);
    send(medFokusNavn(vist.at(-1), 'fjern-filtre'), 'click');
    assert.equal(medFokusNavn(vist.at(-1), chip).getAttribute('aria-pressed'), 'false', side + ': «Fjern filtrene» fjerner ' + chip);
    skriv(vist.at(-1), '');
    assert.equal(raekkerI(vist.at(-1)).length, fjernet, side + ': uden filtre og søgning står alle retter der igen');
    V.rute('#/');
  }
});

// Review-fund 2 (02-11): på 390 px stod udvalgets 8 mærker mellem søgefeltet og listen, så «kylling» ikke viste nogen
// ret over kanten. Mærkerne står nu foldet sammen på telefonen som katalogets filtre, og listen kommer lige efter tallene
const indholdI = (rod) => medKlasse(rod, 'voksen-indhold')[0].born.filter(Boolean);
const klasseAf = (e) => (e.tag === 'form' ? 'form' : String(e.className || e.tag).split(/\s+/)[0]);
test('udvalgets mærker står foldet sammen på telefonen og foldet ud på en stor skærm, og listen kommer lige efter tallene', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const tlf = aabnSide('udvalg', { b: 390, h: 844 });
  const filtre = find(tlf, (e) => e.tag === 'details');
  assert.equal(filtre.length, 1, 'udvalget har én boks med filtre, der kan foldes');
  assert.equal(filtre[0].open, false, 'foldet sammen på telefonen');
  assert.equal(find(filtre[0], (e) => String(e.dataset.fokus).startsWith('filter-')).length, 8, 'alle 8 mærker står i boksen');
  const raekke = indholdI(tlf).map(klasseAf);
  const fra = raekke.indexOf('form');
  assert.deepEqual(raekke.slice(fra, raekke.indexOf('soeg-resultat') + 1), ['form', 'filtre', 'soeg-tal', 'udvalg-tal', 'soeg-resultat'],
    'søgefeltet, filtrene, tallene og listen i den rækkefølge (' + raekke.join(', ') + ')');
  assert.equal(tekstAf(find(filtre[0], (e) => e.tag === 'summary')[0]), 'Mærker');
  V.rute('#/');
  const stor = aabnSide('udvalg', { b: 1280, h: 1000 });
  assert.equal(find(stor, (e) => e.tag === 'details')[0].open, true, 'foldet ud på en stor skærm');
  send(medFokusNavn(stor, 'filter-vegetar'), 'click');
  assert.equal(tekstAf(find(vist.at(-1), (e) => e.tag === 'summary')[0]), 'MærkerVegetar', 'linjen siger, hvilke mærker der er valgt');
  send(medFokusNavn(vist.at(-1), 'filter-vegetar'), 'click');
});

// Review-fund 3 (02-11): på telefonen fyldte de udfoldede filtre skærmen, så et tryk på en gruppe kun ændrede chippen,
// mens tallet og listen stod under kanten, og udfoldningen blev husket, til låsen lukkede. Nu folder et valg og et tegn i
// søgefeltet filtrene sammen på telefonen, fokus står på linjen, der siger, hvad der er valgt, og en ny side starter efter
// skærmen
const filtreI = (rod) => find(rod, (e) => e.tag === 'details')[0];
function foldUd(rod) {
  const d = filtreI(rod);
  d.open = true;
  send(d, 'toggle');
  return d;
}
test('på telefonen folder et valg i filtrene dem sammen, og fokus står på linjen, der siger, hvad der er valgt', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const halloween = IX.grupper.find((g) => g.id === 'halloween').retter;
  foldUd(aabnSide('katalog', { b: 390, h: 844 }));
  send(medFokusNavn(vist.at(-1), 'gruppe-halloween'), 'click');
  let d = filtreI(vist.at(-1));
  assert.equal(d.open, false, 'et tryk på en gruppe folder filtrene sammen, så listen ses');
  assert.deepEqual(raekkerI(vist.at(-1)), halloween, 'listen viser gruppen');
  assert.equal(fokus, find(d, (e) => e.tag === 'summary')[0], 'fokus står på linjen over filtrene');
  assert.equal(tekstAf(fokus), 'Grupper og mærkerHalloween');
  foldUd(vist.at(-1));
  send(medFokusNavn(vist.at(-1), 'filter-vegetar'), 'click');
  d = filtreI(vist.at(-1));
  assert.equal(d.open, false, 'også et mærke folder dem sammen');
  assert.equal(tekstAf(find(d, (e) => e.tag === 'summary')[0]), 'Grupper og mærkerHalloween, Vegetar');
  V.rute('#/');
  foldUd(aabnSide('udvalg', { b: 390, h: 844 }));
  send(medFokusNavn(vist.at(-1), 'filter-fisk'), 'click');
  assert.equal(filtreI(vist.at(-1)).open, false, 'udvalgets mærker foldes også sammen');
  assert.equal(fokus, medFokusNavn(vist.at(-1), 'filtre-udvalg'), 'og fokus står på udvalgets linje');
  send(medFokusNavn(vist.at(-1), 'filter-fisk'), 'click');
});

test('på telefonen folder et tegn i søgefeltet filtrene sammen, og en ny side starter med dem foldet sammen', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('katalog', { b: 390, h: 844 });
  const d = foldUd(skaerm);
  skriv(skaerm, 'k');
  assert.equal(d.open, false, 'det første tegn folder filtrene sammen (uden at tegne skærmen om)');
  assert.equal(vist.at(-1), skaerm);
  foldUd(skaerm);
  location.hash = '#/voksen';
  V.rute(location.hash);
  location.hash = '#/voksen/katalog';
  V.rute(location.hash);
  assert.equal(filtreI(vist.at(-1)).open, false, 'tilbage på kataloget er filtrene foldet sammen igen');
  foldUd(vist.at(-1));
  send(medFokusNavn(vist.at(-1), 'fav-' + S.ids[0]), 'click');
  assert.equal(filtreI(vist.at(-1)).open, true, 'et hjerte i listen folder dem ikke sammen (listen hopper ikke under fingeren)');
});

test('på en stor skærm bliver filtrene foldet ud efter et valg og et tegn, og fokus bliver på chippen', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('katalog', { b: 1280, h: 1000 });
  skriv(skaerm, 'k');
  assert.equal(filtreI(skaerm).open, true);
  send(medFokusNavn(skaerm, 'gruppe-jul'), 'click');
  assert.equal(filtreI(vist.at(-1)).open, true);
  assert.equal(fokus, medFokusNavn(vist.at(-1), 'gruppe-jul'));
});

// Review-fund 8 (02-11): på 1180×820 (iPad på langs) og 1280×800 (desktop) stod grupper og mærker foldet ud fra start,
// så den første ret startede ved y≈757. En lav skærm (højst 900 px) behandles nu som telefonen: filtrene starter foldet
// sammen og foldes sammen efter et valg. En høj skærm (iPad på højkant, en stor skærm) har dem foldet ud
test('filtrene starter foldet sammen på en lav skærm (iPad på langs, desktop) og foldet ud på en høj', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  for (const [b, h, aaben] of [[1180, 820, false], [1280, 800, false], [844, 390, false], [820, 1180, true], [1280, 1000, true]]) {
    for (const side of ['katalog', 'udvalg']) {
      assert.equal(filtreI(aabnSide(side, { b, h })).open, aaben, side + ' på ' + b + '×' + h);
      V.rute('#/');
    }
  }
  foldUd(aabnSide('katalog', { b: 1180, h: 820 }));
  send(medFokusNavn(vist.at(-1), 'gruppe-jul'), 'click');
  assert.equal(filtreI(vist.at(-1)).open, false, 'et valg folder dem sammen på iPad på langs');
  assert.equal(fokus, medFokusNavn(vist.at(-1), 'filtre-katalog'));
});

// Review-fund 5 (02-11): kataloget sagde ikke, at det første «Med» uden et udvalg gør børnenes valg mindre (fra alle
// ugeplanens retter til én). Hjælpeteksten siger det nu, så længe der ikke er et udvalg, og ellers, at børnene kun vælger
// mellem dem, der er med
test('katalogets hjælpetekst siger, at det første «Med» gør børnenes valg mindre, og hvad der gælder med et udvalg', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const uge = S.ids.filter((id) => S.retter.get(id).uge);
  const hjaelp = () => tekstAf(medKlasse(vist.at(-1), 'voksen-hjaelp')[0]);
  aabnSide('katalog');
  assert.match(hjaelp(), new RegExp('Nu vælger børnene mellem alle ' + uge.length + ' retter\. Efter det første «Med» vælger de kun mellem dem, der er med\.'), hjaelp());
  send(medFokusNavn(vist.at(-1), 'ret-' + uge[0]), 'click');
  assert.equal(JSON.parse(lageret.get('kog-familie-v1')).udvalg.ids.length, 1, '«Med» har lavet et udvalg med én ret');
  assert.match(hjaelp(), /Børnene vælger kun mellem de retter, der er med\.$/, hjaelp());
  assert.doesNotMatch(hjaelp(), /alle \d+ retter/);
});

// Review-fund 9 (02-11): på telefonen stod hjertet og «Åbn» altid på deres egen linje, også i rækker uden «Med» («jul» gav
// en side på 4.322 px). Kun rækker med «Med» får klassen .med-udvalg, der giver knapperne en linje for sig (familie.css,
// test-css.js)
test('kataloget: kun rækker med «Med» har knapperne med .med-udvalg', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('katalog', { b: 390, h: 844 });
  const raekker = find(skaerm, (e) => e.tag === 'li' && e.attr['data-ret']);
  assert.equal(raekker.length, S.ids.length);
  const forkert = raekker.filter((li) => harKlasse(medKlasse(li, 'voksen-raekke-knapper')[0], 'med-udvalg') !== Boolean(medFokusNavn(li, 'ret-' + li.attr['data-ret'])));
  assert.deepEqual(forkert.map((li) => li.attr['data-ret']), [], 'rækker, hvor .med-udvalg ikke følger «Med»');
  assert.ok(raekker.some((li) => !medFokusNavn(li, 'ret-' + li.attr['data-ret'])), 'der er rækker uden «Med» (juleretterne)');
});
