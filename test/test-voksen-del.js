// test-voksen-del.js — voksendelens logik (js/voksen-del.js, docs/foraeldredel.md afsnit 2-5): adresserne, låsen (hold,
// 10 minutter uden tryk, ugeplanen bag den, børnenes adresser lukker den), forsiden med ugens dage og boblerne, «Mere»,
// vælg-tilstanden (#/voksen/dag/<1-7>), de gamle adresser (#/uge), «Print» i «Retter»,
// «Fyld op med nye», afkrydsningen og filtrene i udvalget. Skærmene selv
// prøves i WebKit. js/hold.js lytter på document, når den indlæses, så testen giver et lille falsk document først.
// Kør:  node test/test-voksen-del.js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lager from '../js/lager.js';
import { lavModel } from '../js/model.js';
import { saml, grupper } from '../js/indkoeb.js';

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
  focus() { fokus = this; }, blur() { if (fokus === this) fokus = null; }, scrollIntoView() {},
  querySelectorAll() { return []; }, querySelector() { return null; },
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
// rute() skifter en gammel adresse (#/uge) til den nye med history.replaceState: her skifter den kun hash
const erstattet = [];
globalThis.history = { replaceState: (s, t, url) => { erstattet.push(url); location.hash = url; } };
// Skærmens størrelse til matchMedia: kun (max-width: …), (max-height: …), (pointer: coarse) og «mindre bevægelse» (aldrig
// slået til her), som voksendelen og ugeplanen bruger
const skaermMaal = { b: 1280, h: 800, groft: false };
globalThis.matchMedia = (q) => ({
  matches: q.split(',').some((alt) => alt.trim().split(/\s+and\s+/).every((del) => {
    const m = /^\(\s*([a-z-]+)\s*:\s*([a-z0-9.]+)\s*\)$/.exec(del.trim());
    if (!m) throw new Error('matchMedia i testen kender ikke ' + del);
    if (m[1] === 'max-width') return skaermMaal.b <= parseFloat(m[2]);
    if (m[1] === 'max-height') return skaermMaal.h <= parseFloat(m[2]);
    if (m[1] === 'pointer') return (m[2] === 'coarse') === skaermMaal.groft;
    if (m[1] === 'prefers-reduced-motion') return false;
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
const U = await import('../js/ugeplan.js');
const { el } = await import('../js/dom.js');

// app.js' hjælpere, så tyndt som muligt: statusSkaerm giver sine valg tilbage, så vagten kan genkendes. vis() tegner
// adressens skærm igen, som app.js gør
let visKald = 0;
const annonceret = []; // det, skærmlæseren får at vide (K.annoncer)
const S = { ids: [], retter: new Map(), grupper: [] };
const huskede = []; // K.huskFra: den ret og den plads, «Åbn» vil vende tilbage til
const efterNavigering = []; // naviger(hash, efter): det, der skal ske på den nye skærm (fokus på dagen efter et valg)
const K = {
  S,
  naviger: (hash, efter) => { location.hash = hash; if (efter) efterNavigering.push(efter); },
  vis: () => { visKald++; V.rute(location.hash); },
  visSkaerm: (s) => { vist.push(s); },
  statusSkaerm: (valg) => ({ status: valg }),
  knap: (tekst, { klasse = '', label, onclick } = {}) => el('button', { type: 'button', class: 'knap ' + klasse, 'aria-label': label, onclick }, tekst ? el('span', { tekst }) : null),
  klik: (fn) => fn,
  billede: () => lavEl('img'),
  lynMaerke: () => null,
  lynTekst: () => null,
  // Toppen husker sin pil (adressen) og dens tekst, så listens «Til ugeplanen» kan ses (review U2)
  topbar: (midte, tilbage = null, valg = {}) => Object.assign(lavEl('header'), { topbar: { tilbage, ...valg } }),
  annoncer: (tekst) => { annonceret.push(tekst); },
  indlaes: () => {},
  huskFra: (ret, y) => { huskede.push({ ret, y }); },
};
V.init(K);
// Forsidens dage og «Mere»s handlinger kommer fra ugeplanen, som app.js også giver sine hjælpere
U.init({ ...K, voksne: (hash) => V.aabn(hash), fraVoksne: () => V.fraVoksne() });
const tryk = () => { for (const fn of lyttere.pointerdown) fn(); };
const MIN = 60 * 1000;

test('adresserne: kun #/voksen og #/voksen/… er voksendelens, og en ukendt side er forsiden', () => {
  const tabel = [
    ['#/voksen', 'hub'], ['#voksen', 'hub'], ['#/voksen/', 'hub'], ['#/voksen/husstand', 'husstand'],
    ['#/voksen/udvalg', 'udvalg'], ['#/voksen/favoritter', 'favoritter'], ['#/voksen/katalog', 'katalog'], ['#/voksen/ukendt', 'hub'],
    ['#/voksen/katalog/x', 'hub'], ['#/voksen/mere', 'mere'], ['#/voksen/mere/x', 'hub'],
    ['#/voksen/dag', 'dag'], ['#/voksen/dag/3', 'dag'], ['#/voksen/dag/9', 'dag'], ['#/voksen/dagx', 'hub'],
    ['#/voksenx', null], ['#/uge', null], ['#/', null], ['', null], ['#/ret/voksen', null], ['#/uge/voksen', null],
  ];
  for (const [hash, side] of tabel) assert.equal(V.voksenSide(hash), side, hash);
});

// Vælg-tilstandens dag: præcis 1-7 i adressen, ellers null (og skærmen siger en fast tekst, se nedenfor)
test('voksenDag: #/voksen/dag/1 til /7 er mandag til søndag (0-6), og alt andet er ingen dag', () => {
  const tabel = [
    ['#/voksen/dag/1', 0], ['#/voksen/dag/2', 1], ['#/voksen/dag/7', 6], ['#voksen/dag/4', 3],
    ['#/voksen/dag/0', null], ['#/voksen/dag/8', null], ['#/voksen/dag/01', null], ['#/voksen/dag/3x', null], ['#/voksen/dag/', null],
    ['#/voksen/dag', null], ['#/voksen/dag/2/', null], ['#/voksen/dag/1e0', null], ['#/voksen/dag/ 3', null], ['#/voksen/dag/-1', null],
    ['#/voksen/dag/٣', null], ['#/uge/dag/2', null], ['#/voksen', null], ['', null], [undefined, null],
  ];
  for (const [hash, dag] of tabel) assert.equal(V.voksenDag(hash), dag, String(hash));
});

test('nyAdresse: de gamle adresser til den voksne (#/uge, #/uge/dag/<n>) får deres nye, børnenes og listens gør ikke', () => {
  const tabel = [
    ['#/uge', '#/voksen'], ['#uge', '#/voksen'], ['#/uge/', '#/voksen'], ['#/uge/xyz', '#/voksen'], ['#/uge/dag/9', '#/voksen'],
    ['#/uge/dag/1', '#/voksen/dag/1'], ['#/uge/dag/5', '#/voksen/dag/5'], ['#/uge/dag/7', '#/voksen/dag/7'],
    ['#/uge/vaelg', null], ['#/uge/vaelg/rosa', null], ['#/uge/vaelg/rosa/koedsovs', null], ['#/indkoeb', null], ['#/hent/abc', null],
    ['#/voksen', null], ['#/voksen/dag/2', null], ['#/', null], ['', null], ['#/ugex', null],
  ];
  for (const [hash, ny] of tabel) assert.equal(V.nyAdresse(hash), ny, hash);
});

test('låst: en adresse herinde viser holdet først, og aabn() låser op og går til forsiden', () => {
  assert.equal(V.erLaastOp(), false);
  vist.length = 0;
  assert.equal(V.rute('#/voksen/udvalg'), true);
  assert.equal(vist.length, 1);
  assert.equal(vist[0].status.titel, 'Til de voksne', 'vagten (holdet) skal vises, ikke udvalget');
  V.aabn();
  assert.equal(V.erLaastOp(), true);
  assert.equal(location.hash, '#/voksen');
});

test('låsen dækker ugeplanen: laasFor siger bag, fri eller luk for hver adresse', () => {
  const tabel = [
    ['#/voksen', 'bag'], ['#/voksen/katalog', 'bag'], ['#/voksen/mere', 'bag'], ['#/voksen/dag/3', 'bag'], ['#/voksen/dag/9', 'bag'],
    ['#/uge', 'bag'], ['#/uge/', 'bag'], ['#/uge/dag/3', 'bag'],
    ['#/uge/xyz', 'bag'], ['#/uge/vaelg', 'luk'], ['#/uge/vaelg/rosa', 'luk'], ['#/indkoeb', 'fri'], ['#/hent/x', 'fri'],
    ['#/', 'luk'], ['', 'luk'], ['#/ret/x', 'luk'], ['#/gruppe/kylling', 'luk'], ['#/ugex', 'luk'],
  ];
  for (const [hash, zone] of tabel) assert.equal(V.laasFor(hash), zone, hash);
});

test('låsen holder på de gamle adresser til ugeplanen, og lukker på indkøbslisten, forsiden og børnenes valg', () => {
  for (const [hash, ny] of [['#/uge', '#/voksen'], ['#/uge/dag/2', '#/voksen/dag/2']]) {
    V.aabn();
    erstattet.length = 0;
    assert.equal(V.rute(hash), true, hash + ': voksendelen tegner den nye adresse');
    assert.deepEqual(erstattet, [ny], hash + ': skiftet med history.replaceState');
    assert.equal(location.hash, ny);
    assert.equal(V.erLaastOp(), true, hash + ': låsen er stadig åben');
  }
  // Review L2 (15-11): indkøbslisten har kun «Til forsiden», så låsen kan ikke bruges derfra. Står den åben, kommer et barn
  // ind i voksendelen med browserens «tilbage», når iPad'en er givet videre på listen
  for (const hash of ['#/indkoeb', '#/hent/abc', '#/', '#/uge/vaelg', '#/uge/vaelg/rosa', '#/ret/koedsovs']) {
    V.aabn();
    assert.equal(V.rute(hash), false, hash);
    assert.equal(V.erLaastOp(), false, hash + ': låsen lukker');
  }
});

test('låst: #/uge, #/uge/dag/<n>, vælg-tilstanden og «Mere» viser holdet, indkøbslisten gør ikke', () => {
  V.rute('#/');
  for (const [hash, ny] of [['#/uge', '#/voksen'], ['#/uge/dag/4', '#/voksen/dag/4'], ['#/voksen/dag/3', '#/voksen/dag/3'], ['#/voksen/mere', '#/voksen/mere']]) {
    vist.length = 0;
    location.hash = hash;
    assert.equal(V.rute(hash), true, hash);
    assert.equal(vist.at(-1).status.titel, 'Til de voksne', hash + ': holdet, ikke ugeplanen');
    assert.equal(location.hash, ny, hash + ': holdet står på den nye adresse, så det åbner den');
  }
  vist.length = 0;
  assert.equal(V.rute('#/indkoeb'), false);
  assert.equal(vist.length, 0, 'indkøbslisten kræver ikke holdet (telefonen åbner den)');
});

test('tilbage fra indkøbslisten til voksendelen kræver holdet igen (review L2)', () => {
  V.aabn();
  V.rute('#/indkoeb');
  vist.length = 0;
  assert.equal(V.rute('#/voksen'), true);
  assert.equal(vist.at(-1).status.titel, 'Til de voksne', '«tilbage» til #/voksen viser holdet, ikke menuen');
  V.aabn('#/uge');
  V.rute('#/hent/abc');
  vist.length = 0;
  assert.equal(V.rute('#/uge'), true);
  assert.equal(vist.at(-1).status.titel, 'Til de voksne', '«tilbage» til #/uge viser holdet');
  V.rute('#/');
});

test('aabn(hash) går til en adresse bag låsen (en gammel som dens nye), og ellers til forsiden', () => {
  for (const [hash, ny] of [['#/uge', '#/voksen'], ['#/uge/dag/5', '#/voksen/dag/5'], ['#/voksen/dag/3', '#/voksen/dag/3'], ['#/voksen/mere', '#/voksen/mere']]) {
    V.rute('#/');
    V.aabn(hash);
    assert.equal(location.hash, ny, hash);
    assert.equal(V.erLaastOp(), true, hash);
  }
  for (const hash of ['#/ret/koedsovs', '#/uge/vaelg', '#/indkoeb', 'javascript:alert(1)', undefined]) {
    V.rute('#/');
    V.aabn(hash);
    assert.equal(location.hash, '#/voksen', String(hash));
  }
  V.rute('#/');
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

// Review T1 (15-11): ugeplanen ligger bag samme lås, så dens skærme skal også blive til holdet, når tiden løber ud.
// Review R4 (15-11): det tegnede skal være holdet («Til de voksne»), ikke bare et kald til vis(). Indkøbslisten har ingen
// åben lås at løbe ud (rute lukker den med det samme, L2), så den del er væk; det står i testen af laasFor og rute ovenfor
test('efter 10 minutter bliver forsiden, vælg-tilstanden og «Mere» til holdet', (t) => {
  t.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  for (const hash of ['#/voksen', '#/voksen/dag/3', '#/voksen/mere']) {
    V.aabn(hash);
    assert.equal(location.hash, hash);
    const foer = visKald;
    const skaerme = vist.length;
    mock.timers.tick(V.LUK_MS);
    assert.equal(V.erLaastOp(), false, hash);
    assert.equal(visKald, foer + 1, hash + ': skærmen skal tegnes igen, når tiden er gået');
    assert.equal(vist.length, skaerme + 1, hash + ': voksendelen tegner holdet');
    assert.equal(vist.at(-1).status?.titel, 'Til de voksne', hash + ': holdet, ikke ugeplanen');
  }
  V.rute('#/');
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
  V.soegePost(model('kylling', 'Kylling i karry', ['kyllingebryst', 'ris']), 'kylling', ['hurtig', 'groent']),
  V.soegePost(model('laks', 'Laks med ris', ['laksefilet', 'ris']), 'fisk', ['fisk', 'hurtig']),
  V.soegePost(model('boller', 'Boller', ['hvedemel']), 'broed-og-pizza', []),
  V.soegePost(model('risalamande', 'Risalamande', ['grødris']), 'jul', ['favorit']),
];

test('soegePost: gruppens og mærkernes navne kommer fra GRUPPER og MAERKER, og en ukendt gruppe har intet navn', () => {
  const p = POSTER[1];
  assert.equal(p.gruppe, 'Kylling');
  assert.equal(p.gruppeOrd, 'Aftensmad', 'kylling kom fra Aftensmad, så ordet finder den stadig');
  assert.equal(POSTER[3].gruppeOrd, 'Bagning');
  assert.equal(POSTER[0].gruppeOrd, null);
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
  assert.deepEqual(ids({ gruppe: 'fisk', tekst: 'ris' }), ['laks']);
  assert.deepEqual(ids({ gruppe: 'fisk', maerker: ['fisk'], tekst: 'ris' }), ['laks']);
  assert.deepEqual(ids({ tekst: 'jul' }), ['gloegg', 'risalamande'], 'gruppens navn «Jul»');
  assert.deepEqual(ids({ tekst: 'Favorit' }), ['risalamande'], 'mærkets navn');
  assert.deepEqual(ids({ gruppe: 'broed-og-pizza', tekst: 'ris' }), [], 'ingen træf');
  assert.deepEqual(ids({ gruppe: 'halloween' }), []);
});

// Aftensmad blev delt i fem grupper: chippen og søgeordet skal stadig samle dem (katalogFiltre og soegePost)
test('filtrer: «Aftensmad» er de seks grupper (AFTENSMAD_GRUPPER; antallet tjekkes i test-forside.js), og søgeordene «aftensmad» og «bagning» finder dem', () => {
  const ids = (valg) => V.filtrer(POSTER, valg).map((p) => p.m.id);
  assert.deepEqual(ids({ gruppe: 'aftensmad' }), ['kylling', 'laks']);
  assert.deepEqual(ids({ gruppe: 'aftensmad', tekst: 'karry' }), ['kylling']);
  assert.deepEqual(ids({ tekst: 'aftensmad' }), ['kylling', 'laks']);
  assert.deepEqual(ids({ tekst: 'bagning' }), ['boller']);
  assert.deepEqual(ids({ gruppe: 'constructor' }), [], 'et id fra adressen er ikke en gruppe');
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
  assert.deepEqual(raekke.slice(fra, raekke.indexOf('soeg-resultat') + 1), ['form', 'voksen-filtre', 'soeg-tal', 'udvalg-tal', 'soeg-resultat'],
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
// Låsen glemmer, hvordan filtrene stod. Var de foldet anderledes, flytter listen sig efter holdet, og den gemte plads rammer
// forbi, så listen starter øverst
test('«Åbn» i Katalog: pladsen huskes kun, når filtrene står, som de står efter holdet', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const aabnFoerste = () => {
    const skaerm = vist.at(-1);
    send(medFokusNavn(skaerm, 'aabn-' + raekkerI(skaerm)[0]), 'click');
    V.rute('#/');
    return huskede.at(-1).y;
  };
  const TELEFON = { b: 390, h: 844 };
  const STOR = { b: 820, h: 1180 };
  aabnSide('katalog', TELEFON);
  assert.equal(aabnFoerste(), undefined, 'telefonen: foldet sammen, som efter holdet');
  foldUd(aabnSide('katalog', TELEFON));
  assert.equal(aabnFoerste(), 0, 'telefonen: foldet ud, så listen står lavere nu end efter holdet');
  aabnSide('katalog', STOR);
  assert.equal(aabnFoerste(), undefined, 'stor skærm: foldet ud, som efter holdet');
  const d = filtreI(aabnSide('katalog', STOR));
  d.open = false;
  send(d, 'toggle');
  assert.equal(aabnFoerste(), 0, 'stor skærm: foldet sammen, så listen står højere nu end efter holdet');
  foldUd(aabnSide('katalog', TELEFON));
  const f = filtreI(vist.at(-1));
  f.open = false;
  send(f, 'toggle');
  assert.equal(aabnFoerste(), undefined, 'foldet ud og sammen igen: som efter holdet');
});

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
  assert.match(hjaelp(), /Nu vælger børnene mellem favoritterne og nye retter, højst 12\. Efter det første «Med» vælger de kun mellem dem, der er med\./, hjaelp());
  // Review U7 (15-11): katalogets «Med» har sin egen klasse, så den kan stå i venstre side på telefonen (familie.css)
  assert.ok(String(medFokusNavn(vist.at(-1), 'ret-' + uge[0]).className).split(/\s+/).includes('voksen-med'), 'katalogets «Med» har klassen voksen-med');
  send(medFokusNavn(vist.at(-1), 'ret-' + uge[0]), 'click');
  assert.equal(JSON.parse(lageret.get('kog-familie-v1')).udvalg.ids.length, 1, '«Med» har lavet et udvalg med én ret');
  assert.match(hjaelp(), /Børnene vælger kun mellem de retter, der er med\.$/, hjaelp());
  assert.doesNotMatch(hjaelp(), /alle \d+ retter/);
});

// «Print» i «Retter» (v10): hver række har et link til print.html?ret=<id>, og over listen står hele kogebogen eller de
// viste retter. Husstandens portioner (n) og «Mere grønt» (groen=1) følger med, som på retten uden en dag i ugeplanen
const printHref = (rod, navn) => medFokusNavn(rod, navn)?.attr.href;
test('«Retter»: «Print» i hver række og «Print hele kogebogen» over listen, med husstanden og mere grønt i adressen', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  let skaerm = aabnSide('katalog');
  const raekker = find(skaerm, (e) => e.tag === 'li' && e.attr['data-ret']);
  assert.equal(raekker.length, S.ids.length);
  const forkert = raekker.filter((li) => printHref(li, 'print-' + li.attr['data-ret']) !== 'print.html?ret=' + li.attr['data-ret']);
  assert.deepEqual(forkert.map((li) => li.attr['data-ret']), [], 'rækker uden det rigtige printlink');
  const link = medFokusNavn(skaerm, 'print-' + S.ids[0]);
  assert.equal(link.tag, 'a');
  // Review F2 (15-11): Safari springer links over med Tab, medmindre de har tabindex
  assert.equal(link.attr.tabindex, '0', '«Print» i rækken kan nås med Tab');
  assert.equal(medFokusNavn(skaerm, 'print-flere').attr.tabindex, '0', '«Print hele kogebogen» kan nås med Tab');
  assert.equal(link.attr['aria-label'], 'Print ' + S.retter.get(S.ids[0]).navn);
  // Review F4 (15-11): på telefonen står kun printikonet i rækken (.kun-bred), så de fire knapper kan stå på én linje
  assert.deepEqual(link.born.filter((b) => b.tag === 'span').map((b) => b.className), ['kun-bred']);
  assert.equal(medFokusNavn(skaerm, 'print-flere').born.find((b) => b.tag === 'span').className, undefined, '«Print hele kogebogen» står altid med tekst');
  assert.equal(printHref(skaerm, 'print-flere'), 'print.html?alle');
  assert.equal(tekstAf(medFokusNavn(skaerm, 'print-flere')), 'Print hele kogebogen');
  // Review U4 (15-11): mange retter fylder mere end én A4-side, så teksten lover kun, at hver ret begynder på en ny side
  // (.ret-side + .ret-side { break-before: page } i print.css)
  assert.equal(medFokusNavn(skaerm, 'print-flere').attr['aria-label'], 'Print hele kogebogen: ' + S.ids.length + ' retter, hver på en ny side');
  assert.equal(tekstAf(find(skaerm, (e) => e.className === 'voksen-print-hjaelp')[0]), 'Hver ret begynder på en ny side. Vælg «Gem som PDF» i printet for at få en PDF.');
  // Søgningen gør det til de viste retter, i listens rækkefølge
  skriv(skaerm, 'jul');
  const jul = raekkerI(skaerm);
  assert.ok(jul.length > 1 && jul.length < S.ids.length, 'jul: ' + jul.length);
  assert.equal(printHref(skaerm, 'print-flere'), 'print.html?retter=' + jul.join(','));
  assert.equal(tekstAf(medFokusNavn(skaerm, 'print-flere')), 'Print de ' + jul.length + ' viste');
  // Review L4 (15-11): navnet, skærmlæseren siger, begynder med den tekst, man ser (så stemmestyring finder knappen)
  assert.equal(medFokusNavn(skaerm, 'print-flere').attr['aria-label'], 'Print de ' + jul.length + ' viste retter, hver på en ny side');
  const enRet = S.ids.map((id) => S.retter.get(id).navn.replace(/\u00ad/g, '')).find((navn) => { skriv(skaerm, navn); return raekkerI(skaerm).length === 1; });
  assert.ok(enRet, 'mindst én ret kan søges frem alene');
  assert.equal(tekstAf(medFokusNavn(skaerm, 'print-flere')), 'Print den viste ret');
  assert.equal(medFokusNavn(skaerm, 'print-flere').attr['aria-label'], 'Print den viste ret');
  // Husstand og mere grønt: n og groen=1 på alle links
  V.rute('#/');
  lageret.clear();
  assert.ok(lager.gemFamilie({ voksne: 2, boern: 2, mereGroent: true }, S.ids));
  V.aabn();
  location.hash = '#/voksen/katalog';
  V.rute(location.hash);
  skaerm = vist.at(-1);
  const f = lager.hentFamilie(S.ids);
  const n = V.husstandSum(f.voksne, f.boern, f.barnAndel).n;
  assert.ok(f.mereGroent === true && n >= 3, JSON.stringify({ mereGroent: f.mereGroent, n }));
  assert.equal(printHref(skaerm, 'print-koedsovs'), 'print.html?ret=koedsovs&n=' + n + '&groen=1');
  assert.equal(printHref(skaerm, 'print-flere'), 'print.html?alle&n=' + n + '&groen=1');
});

// ---------- Forsiden (#/voksen), «Mere» og vælg-tilstanden (docs/voksen-forside-plan-16-11-2026.md) ----------

const h1I = (rod) => tekstAf(find(rod, (e) => e.tag === 'h1')[0]);
const dageI = (rod) => find(rod, (e) => e.tag === 'li' && harKlasse(e, 'voksen-dag'));
const gemtUge = () => JSON.parse(lageret.get('kog-uge-v1'));
const ugensRetter = () => S.ids.filter((id) => S.retter.get(id).uge);
const planMed = (dage) => JSON.stringify({ v: 1, uge: null, n: 4, dage, rettet: 1 });

test('forsiden: boblerne Indkøbsliste, Retter og Mere øverst, og ugens 7 dage med «Vælg ret»', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('');
  assert.equal(h1I(skaerm), 'Ugeplan');
  const nav = find(skaerm, (e) => e.tag === 'nav')[0];
  assert.ok(harKlasse(nav, 'voksen-bobler'));
  assert.deepEqual(find(nav, (e) => e.tag === 'button').map((b) => b.dataset.fokus), ['indkoeb', 'katalog', 'mere']);
  assert.deepEqual(find(nav, (e) => e.tag === 'button').map(tekstAf), ['Indkøbsliste', 'Retter', 'Mere'], 'en tom uge: intet antal varer');
  const dage = dageI(skaerm);
  assert.equal(dage.length, 7);
  assert.deepEqual(dage.map((d) => d.attr['data-dag']), ['0', '1', '2', '3', '4', '5', '6']);
  assert.ok(dage.every((d) => harKlasse(d, 'voksen-dag-tom')), 'alle dage er tomme');
  assert.match(tekstAf(medFokusNavn(skaerm, 'dag-1')), /^Tirsdag\d{1,2}\/\d{1,2}Vælg ret$/);
  // Hele ugen er tom: en linje hjælp og «Lad børnene vælge» (børnenes valg, uden for låsen)
  // Kort: knappen lige under siger resten (review U11)
  assert.equal(tekstAf(medKlasse(skaerm, 'voksen-uge-tom')[0]).replace(/Lad børnene vælge$/, ''), 'Ugen er tom. Tryk på en dag, eller lad børnene vælge.');
  assert.equal(tekstAf(medFokusNavn(skaerm, 'boern')), 'Lad børnene vælge');
  send(medFokusNavn(skaerm, 'boern'), 'click');
  assert.equal(location.hash, '#/uge/vaelg');
  // Et tryk på en tom dag åbner vælg-tilstanden til den dag
  aabnSide('');
  send(medFokusNavn(vist.at(-1), 'dag-3'), 'click');
  assert.equal(location.hash, '#/voksen/dag/4');
  aabnSide('');
  send(medFokusNavn(vist.at(-1), 'mere'), 'click');
  assert.equal(location.hash, '#/voksen/mere');
  aabnSide('');
  send(medFokusNavn(vist.at(-1), 'katalog'), 'click');
  assert.equal(location.hash, '#/voksen/katalog');
});

const topI = (rod) => find(rod, (e) => e.tag === 'header' && e.topbar)[0].topbar;
test('indkøbslisten fra forsidens boble: låsen bliver åben, og listen har «Til ugeplanen» i stedet for huset (review U2)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  aabnSide('');
  lageret.set('kog-uge-v1', planMed([{ ret: ugensRetter()[0], n: 4, af: 'bo' }, null, null, null, null, null, null]));
  V.rute('#/voksen');
  send(medFokusNavn(vist.at(-1), 'indkoeb'), 'click');
  assert.match(location.hash, /^#\/hent\/v1\./);
  assert.equal(V.rute(location.hash), false, 'listen tegnes af ugeplanen, ikke af voksendelen');
  assert.ok(V.erLaastOp() && V.fraVoksne(), 'låsen er stadig åben på listen');
  const liste = U.skaerm(U.rute(location.hash));
  assert.equal(location.hash, '#/indkoeb', '#/hent gemmer listen og skifter adressen');
  assert.deepEqual(topI(liste), { tilbage: '#/voksen', tekst: 'Til ugeplanen', label: 'Til ugeplanen' });
  V.rute(location.hash);
  assert.ok(V.erLaastOp(), 'også på #/indkoeb');
  // «Til ugeplanen»: forsiden uden et nyt hold, og listen er forladt
  vist.length = 0;
  assert.equal(V.rute('#/voksen'), true);
  assert.equal(h1I(vist.at(-1)), 'Ugeplan', 'forsiden, ikke holdet');
  assert.equal(V.fraVoksne(), false);
  // Den samme liste åbnet på anden vis (browserens «tilbage», telefonens link) lukker låsen og har huset (review L2)
  assert.equal(V.rute('#/indkoeb'), false);
  assert.equal(V.erLaastOp(), false);
  assert.equal(topI(U.skaerm(U.rute('#/indkoeb'))).tilbage, null, 'huset til børnenes forside');
  // Fra listen til børnenes forside lukker låsen
  V.aabn();
  send(medFokusNavn(vist.at(-1), 'indkoeb'), 'click');
  V.rute(location.hash);
  assert.ok(V.erLaastOp());
  V.rute('#/');
  assert.ok(!V.erLaastOp() && !V.fraVoksne());
});

test('forsiden: en tom uge har en hvid «Indkøbsliste», og et tryk siger, hvad man gør, i stedet for at åbne listen (review U3)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('');
  const foer = location.hash;
  assert.ok(harKlasse(medFokusNavn(skaerm, 'indkoeb'), 'voksen-boble-tom'));
  assert.equal(medKlasse(skaerm, 'uge-besked').length, 0, 'ingen besked før trykket');
  annonceret.length = 0;
  send(medFokusNavn(skaerm, 'indkoeb'), 'click');
  assert.equal(location.hash, foer, 'bliver på forsiden');
  const ny = vist.at(-1);
  const TEKST = 'Der er ingen varer endnu. Vælg en ret til en dag, så kommer varerne på listen.';
  assert.equal(tekstAf(medKlasse(ny, 'uge-besked')[0]), TEKST);
  assert.equal(fokus, medFokusNavn(ny, 'indkoeb'), 'fokus bliver på boblen');
  assert.deepEqual(annonceret, [TEKST]);
  assert.ok(!V.fraVoksne(), 'ingen liste er åbnet');
  // Med en ret i ugen er boblen gul og åbner listen
  lageret.set('kog-uge-v1', planMed([null, null, { ret: ugensRetter()[1], n: 4, af: 'bo' }, null, null, null, null]));
  V.rute('#/voksen/dag/1');
  V.rute('#/voksen');
  const fyldt = vist.at(-1);
  assert.ok(!harKlasse(medFokusNavn(fyldt, 'indkoeb'), 'voksen-boble-tom'));
  assert.equal(medKlasse(fyldt, 'uge-besked').length, 0);
  send(medFokusNavn(fyldt, 'indkoeb'), 'click');
  assert.match(location.hash, /^#\/hent\//);
});

test('«Mere»: ugeplanens handlinger og familiens husstand, udvalg, favoritter og «Mere grønt i maden»', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  let skaerm = aabnSide('mere');
  assert.equal(h1I(skaerm), 'Mere');
  assert.deepEqual(find(skaerm, (e) => e.tag === 'h2').map(tekstAf), ['Ugeplanen', 'Familien']);
  const lister = find(skaerm, (e) => e.tag === 'ul' && harKlasse(e, 'voksen-menu'));
  assert.equal(lister.length, 1);
  assert.deepEqual(find(lister[0], (e) => harKlasse(e, 'voksen-punkt')).map((b) => b.dataset.fokus), ['husstand', 'udvalg', 'favoritter']);
  // Uden udvalg siger «Ugens udvalg», hvor mange børnene vælger mellem (højst 12; hårdt mellemrum før «retter»)
  assert.match(tekstAf(medFokusNavn(skaerm, 'udvalg')), /Ikke sat: børnene vælger mellem 12\u00a0retter$/);
  assert.ok(medFokusNavn(skaerm, 'groent'), '«Mere grønt i maden» står under «Familien»');
  assert.ok(medFokusNavn(skaerm, 'boern') && medFokusNavn(skaerm, 'plan-n-plus'), '«Børnene vælger» og portionerne står der altid');
  assert.equal(medFokusNavn(skaerm, 'ny-uge'), undefined, 'en ny, tom plan: intet at tømme');
  assert.equal(medFokusNavn(skaerm, 'del'), undefined, 'en tom uge: intet at dele');
  send(medFokusNavn(skaerm, 'husstand'), 'click');
  assert.equal(location.hash, '#/voksen/husstand');
  // Med en ret i planen: Del som tekst og Print
  lageret.set('kog-uge-v1', planMed([{ ret: ugensRetter()[0], n: 4, af: 'bo' }, null, null, null, null, null, null]));
  location.hash = '#/voksen/mere';
  V.rute(location.hash);
  skaerm = vist.at(-1);
  assert.equal(tekstAf(medFokusNavn(skaerm, 'del')), 'Del som tekst');
  assert.equal(medFokusNavn(skaerm, 'print').attr.href, 'print.html?uge');
  assert.ok(medFokusNavn(skaerm, 'ny-uge'), '«Ny uge» med en ret i planen');
  // Husstand, udvalg og favoritter går tilbage til «Mere», ikke til forsiden
  location.hash = '#/voksen/husstand';
  V.rute(location.hash);
  const tilbage = find(vist.at(-1), (e) => e.tag === 'button' && e.attr['aria-label'] === 'Tilbage til Mere');
  assert.equal(tilbage.length, 1);
  send(tilbage[0], 'click');
  assert.equal(location.hash, '#/voksen/mere');
});

test('vælg-tilstanden: «Vælg ret til tirsdag» viser ugeplanens retter, og «Vælg» lægger retten på dagen og går til forsiden', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('dag/2');
  assert.equal(h1I(skaerm), 'Vælg ret til tirsdag');
  assert.match(tekstAf(medKlasse(skaerm, 'voksen-undertitel')[0]), /^Tirsdag \d{1,2}\/\d{1,2} · 4 portioner$/);
  assert.deepEqual(raekkerI(skaerm), ugensRetter(), 'kun retterne i ugeplanen, i index.json-rækkefølgen');
  const id = ugensRetter()[2];
  const navn = S.retter.get(id).navn;
  annonceret.length = 0;
  efterNavigering.length = 0;
  send(medFokusNavn(skaerm, 'vaelg-' + id), 'click');
  assert.deepEqual(gemtUge().dage[1], { ret: id, af: 'bo', n: 4 }, 'retten står på tirsdag med planens portioner');
  assert.deepEqual(gemtUge().dage.filter(Boolean).length, 1, 'kun tirsdag er ændret');
  assert.equal(location.hash, '#/voksen', 'tilbage på forsiden');
  assert.deepEqual(annonceret, [navn + ' står nu på tirsdag.']);
  assert.equal(efterNavigering.length, 1, 'fokus på dagen, når forsiden er tegnet');
  // Forsiden: tirsdag er udfyldt, og indkøbslisten har varer
  V.rute(location.hash);
  const forside = vist.at(-1);
  efterNavigering[0]();
  assert.equal(fokus, medFokusNavn(forside, 'dag-1'), 'fokus står på tirsdag');
  const tirsdag = dageI(forside)[1];
  assert.equal(tirsdag.attr['data-ret'], id);
  assert.ok(!harKlasse(tirsdag, 'voksen-dag-tom'));
  assert.equal(tekstAf(medKlasse(tirsdag, 'voksen-dag-ret-navn')[0]), navn);
  assert.equal(tekstAf(medKlasse(tirsdag, 'voksen-dag-under')[0]), '4 portioner');
  assert.equal(medKlasse(forside, 'voksen-uge-tom').length, 0, 'ugen er ikke tom længere');
  const tal = tekstAf(medKlasse(forside, 'voksen-boble-tal')[0]);
  assert.match(tal, /^[1-9]\d*\u00a0varer?$/, 'Indkøbsliste siger antallet af varer (' + tal + ')');
  // Regnet her af tirsdagens opskrift og indkøbslisten (saml, grupper) uden basisvarerne, ikke af U.antalVarer (review F4)
  const ret = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
  const afd = grupper(saml([{ ret, n: 4 }]));
  const forvent = afd.filter((g) => g.afd !== 'basis').reduce((sum, g) => sum + g.varer.length, 0);
  assert.ok(afd.some((g) => g.afd === 'basis' && g.varer.length), 'retten har basisvarer, som ikke tæller');
  assert.equal(Number.parseInt(tal, 10), forvent);
  send(medFokusNavn(forside, 'indkoeb'), 'click');
  assert.match(location.hash, /^#\/hent\/v1\.[0-9]{8}\./, 'listen følger planen: linket har tirsdagens ret');
});

test('vælg-tilstanden: «Højst 40 min» viser kun retter på højst 40 minutter, huskes fra dag til dag og glemmes ved låsen (review F1)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  let skaerm = aabnSide('dag/2');
  // Det forventede regnes her af opskrifternes totalTime (PT…H…M), ikke af appens model
  const minutter = (id) => {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8')).totalTime || '');
    return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : null;
  };
  const korte = ugensRetter().filter((id) => minutter(id) > 0 && minutter(id) <= 40);
  assert.ok(korte.length >= 20 && korte.length < ugensRetter().length, 'både korte og lange retter i ugeplanen (' + korte.length + ' af ' + ugensRetter().length + ')');
  const chip = () => medFokusNavn(vist.at(-1), 'sorter-hverdag');
  assert.equal(tekstAf(chip()), 'Højst 40 min');
  assert.equal(chip().attr['aria-pressed'], 'false');
  assert.deepEqual(raekkerI(skaerm), ugensRetter());
  send(chip(), 'click');
  skaerm = vist.at(-1);
  assert.equal(chip().attr['aria-pressed'], 'true');
  assert.deepEqual(raekkerI(skaerm), korte, 'kun retterne på højst 40 minutter, i samme rækkefølge');
  assert.ok(tekstAf(skaerm).includes('Højst 40 min'), 'linjen over filtrene siger, at den er valgt');
  // Huskes fra dag til dag
  location.hash = '#/voksen/dag/5';
  V.rute(location.hash);
  assert.deepEqual(raekkerI(vist.at(-1)), korte, 'også fredag');
  // Ingen træf med kun «Højst 40 min» valgt: «Fjern filtrene» står der og slår den fra (søgningen bliver)
  skriv(vist.at(-1), 'xyzzy');
  const fjern = medFokusNavn(vist.at(-1), 'fjern-filtre');
  assert.ok(fjern, '«Fjern filtrene», når kun tiden er valgt');
  send(fjern, 'click');
  assert.equal(chip().attr['aria-pressed'], 'false', '«Fjern filtrene» fjerner også «Højst 40 min»');
  skriv(vist.at(-1), '');
  assert.deepEqual(raekkerI(vist.at(-1)), ugensRetter());
  send(chip(), 'click');
  // Låsen glemmer den
  V.rute('#/');
  V.aabn('#/voksen/dag/2');
  V.rute(location.hash);
  assert.equal(chip().attr['aria-pressed'], 'false');
  assert.deepEqual(raekkerI(vist.at(-1)), ugensRetter());
});

test('vælg-tilstanden: «Vælg» læser planen lige før, så en dag, der er lagt imens (en anden fane), bliver (M1, review F2)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const [a, b] = ugensRetter();
  const skaerm = aabnSide('dag/2');
  assert.equal(lageret.has('kog-uge-v1'), false, 'skærmen er tegnet med en tom plan');
  lageret.set('kog-uge-v1', planMed([{ ret: a, n: 3, af: 'pip' }, null, null, null, null, null, null]));
  send(medFokusNavn(skaerm, 'vaelg-' + b), 'click');
  assert.deepEqual(gemtUge().dage[0], { ret: a, n: 3, af: 'pip' }, 'mandag fra den anden fane er der stadig');
  assert.deepEqual(gemtUge().dage[1], { ret: b, af: 'bo', n: 4 });
});

test('saetDag: kun dag 0-6 som heltal; alt andet ændrer intet (review F5)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  aabnSide('');
  const [a, b] = ugensRetter();
  lageret.set('kog-uge-v1', planMed([{ ret: a, n: 4, af: 'bo' }, null, null, null, null, null, null]));
  const foer = lageret.get('kog-uge-v1');
  for (const i of [-1, 7, 1.5, '1', NaN, null, undefined, Infinity]) {
    assert.equal(U.saetDag(i, b), null, String(i));
    assert.equal(lageret.get('kog-uge-v1'), foer, String(i) + ': planen er ikke skrevet');
  }
  assert.equal(U.saetDag(6, b).dage[6].ret, b, 'søndag (6) er en dag');
});

test('vælg-tilstanden: «Behold» på dagens ret, portionerne bliver, og den gamle rets dyr følger med', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const [a, b] = ugensRetter();
  lageret.clear();
  V.aabn();
  lageret.set('kog-uge-v1', planMed([null, null, null, null, { ret: a, n: 6, af: 'rosa' }, null, null]));
  location.hash = '#/voksen/dag/5';
  V.rute(location.hash);
  const skaerm = vist.at(-1);
  assert.equal(tekstAf(medFokusNavn(skaerm, 'vaelg-' + a)), 'Behold');
  assert.equal(medFokusNavn(skaerm, 'vaelg-' + a).attr['aria-label'], 'Behold ' + S.retter.get(a).navn + ' til fredag');
  assert.match(tekstAf(medKlasse(skaerm, 'voksen-undertitel')[0]), / · 6 portioner$/);
  // «nu» står ikke alene på sin linje på 360 px: hårdt mellemrum efter dagen (review U10)
  assert.equal(tekstAf(medKlasse(skaerm, 'voksen-raekke-nu')[0]), 'Står på fredag\u00a0nu');
  send(medFokusNavn(skaerm, 'vaelg-' + b), 'click');
  assert.deepEqual(gemtUge().dage[4], { ret: b, af: 'rosa', n: 6 });
});

test('vælg-tilstanden: en dag uden for 1-7 giver en fast tekst, og intet fra adressen kommer på skærmen', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  for (const dag of ['0', '8', '9', '01', '%3Cb%3E', '<img src=x>', '']) {
    const skaerm = aabnSide('dag/' + dag);
    assert.equal(skaerm.status?.titel, 'Den dag findes ikke', dag);
    assert.equal(skaerm.status.tekst, 'Adressen peger ikke på en af ugens syv dage. Vælg dagen på ugeplanen.');
    send(find(skaerm.status.handling, (e) => e.tag === 'button')[0], 'click');
    assert.equal(location.hash, '#/voksen', dag + ': «Til ugeplanen»');
    V.rute('#/');
  }
});

test('vælg-tilstanden: kan planen ikke gemmes, bliver man på listen med en besked ved retten', (t) => {
  const setItem = globalThis.localStorage.setItem;
  t.after(() => { globalThis.localStorage.setItem = setItem; V.rute('#/'); });
  medOpskrifter();
  aabnSide('dag/1');
  const id = ugensRetter()[0];
  globalThis.localStorage.setItem = () => { throw new Error('lageret er fuldt'); };
  send(medFokusNavn(vist.at(-1), 'vaelg-' + id), 'click');
  assert.equal(location.hash, '#/voksen/dag/1', 'bliver i vælg-tilstanden');
  const raekke = find(vist.at(-1), (e) => e.tag === 'li' && e.attr['data-ret'] === id)[0];
  assert.match(tekstAf(find(raekke, (e) => e.attr.role === 'alert')[0]), /^Planen kunne ikke gemmes på denne enhed\./);
  assert.equal(fokus, medFokusNavn(vist.at(-1), 'vaelg-' + id), 'fokus bliver på knappen');
});

test('forsiden: en udfyldt dag folder et ark ud med portioner, «Byt ret», «Fjern» og «Åbn retten»', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const id = ugensRetter()[1];
  aabnSide('');
  lageret.set('kog-uge-v1', planMed([null, null, { ret: id, n: 4, af: 'pip' }, null, null, null, null]));
  V.rute(location.hash);
  const knap = medFokusNavn(vist.at(-1), 'dag-2');
  assert.equal(knap.attr['aria-expanded'], 'false');
  send(knap, 'click');
  let dag = medFokusNavn(vist.at(-1), 'dag-2');
  assert.equal(dag.attr['aria-expanded'], 'true');
  assert.equal(dag.attr['aria-controls'], 'dag-ark-2');
  assert.equal(fokus, dag, 'fokus bliver på dagen');
  const ark = find(vist.at(-1), (e) => e.attr.id === 'dag-ark-2')[0];
  assert.equal(ark.attr.role, 'group');
  assert.match(tekstAf(ark), /Valgt af Pip/);
  assert.deepEqual(['dag-2-byt', 'dag-2-fjern', 'dag-2-aabn'].map((n) => Boolean(medFokusNavn(ark, n))), [true, true, true]);
  // Portionerne gemmes gennem gemPlan
  const plus = find(ark, (e) => e.tag === 'button' && /^Flere/.test(e.attr['aria-label'] || ''))[0];
  assert.ok(plus, 'arket har en knap til flere portioner');
  send(plus, 'click');
  assert.equal(gemtUge().dage[2].n, 5);
  assert.equal(tekstAf(medKlasse(medFokusNavn(vist.at(-1), 'dag-2'), 'voksen-dag-under')[0]), '5 portioner');
  // «Byt ret» åbner vælg-tilstanden til dagen
  send(medFokusNavn(vist.at(-1), 'dag-2-byt'), 'click');
  assert.equal(location.hash, '#/voksen/dag/3');
  V.rute(location.hash);
  assert.equal(h1I(vist.at(-1)), 'Vælg ret til onsdag');
  // Tilbage på forsiden er arket lukket (siden er skiftet), og «Fjern» tømmer dagen
  location.hash = '#/voksen';
  V.rute(location.hash);
  assert.equal(medFokusNavn(vist.at(-1), 'dag-2').attr['aria-expanded'], 'false', 'arket er lukket efter et sideskift');
  send(medFokusNavn(vist.at(-1), 'dag-2'), 'click');
  annonceret.length = 0;
  send(medFokusNavn(vist.at(-1), 'dag-2-fjern'), 'click');
  assert.equal(gemtUge().dage[2], null);
  assert.deepEqual(annonceret, ['Retten er fjernet fra onsdag.']);
  dag = medFokusNavn(vist.at(-1), 'dag-2');
  assert.equal(fokus, dag, 'fokus står på den tomme dag');
  assert.ok(harKlasse(dageI(vist.at(-1))[2], 'voksen-dag-tom'));
});

test('forsiden: Escape lukker arket, og «Åbn retten» husker dagen og åbner retten', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const id = ugensRetter()[0];
  aabnSide('');
  lageret.set('kog-uge-v1', planMed([{ ret: id, n: 4, af: 'bo' }, null, null, null, null, null, null]));
  V.rute(location.hash);
  send(medFokusNavn(vist.at(-1), 'dag-0'), 'click');
  const li = dageI(vist.at(-1))[0];
  for (const fn of li.lyt.keydown || []) fn({ key: 'Escape', preventDefault() {} });
  assert.equal(medFokusNavn(vist.at(-1), 'dag-0').attr['aria-expanded'], 'false');
  assert.equal(fokus, medFokusNavn(vist.at(-1), 'dag-0'));
  send(medFokusNavn(vist.at(-1), 'dag-0'), 'click');
  huskede.length = 0;
  send(medFokusNavn(vist.at(-1), 'dag-0-aabn'), 'click');
  assert.equal(location.hash, '#/ret/' + id);
  assert.equal(huskede.at(-1).ret, id);
});

test('forsiden: en plan fra en nyere udgave viser en fast tekst, og vælg-tilstanden kan ikke ændre den', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  aabnSide('');
  lageret.set('kog-uge-v1', JSON.stringify({ v: 99, dage: [] }));
  V.rute(location.hash);
  assert.equal(dageI(vist.at(-1)).length, 0);
  assert.match(tekstAf(medKlasse(vist.at(-1), 'uge-advarsel')[0]), /^Ugeplanen er lavet med en nyere udgave/);
  location.hash = '#/voksen/dag/2';
  V.rute(location.hash);
  assert.equal(vist.at(-1).status?.titel, 'Ugeplanen er lavet med en nyere udgave');
  // Samme skærm og tekst som børnenes valg (js/ugeplan.js), kun knappen er en anden: «Tilbage» til voksendelen (review F6)
  const boernenes = U.laastPlanSkaerm().status;
  assert.equal(vist.at(-1).status.tekst, boernenes.tekst);
  assert.equal(find(boernenes.handling, (e) => e.tag === 'button').map(tekstAf).join(), 'Til forsiden');
  const tilbage = find(vist.at(-1).status.handling, (e) => e.tag === 'button');
  assert.deepEqual(tilbage.map(tekstAf), ['Tilbage']);
  send(tilbage[0], 'click');
  assert.equal(location.hash, '#/voksen');
});

test('vælg-tilstanden: bliver planen låst af en nyere udgave, før der trykkes «Vælg», bliver skærmen til ugeplanens låste skærm (review F6)', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const skaerm = aabnSide('dag/2');
  const id = ugensRetter()[0];
  lageret.set('kog-uge-v1', JSON.stringify({ v: 99, dage: [] }));
  send(medFokusNavn(skaerm, 'vaelg-' + id), 'click');
  assert.equal(vist.at(-1).status?.tekst, U.laastPlanSkaerm().status.tekst);
  assert.equal(lageret.get('kog-uge-v1'), JSON.stringify({ v: 99, dage: [] }), 'den nyere plan er ikke skrevet over');
});

// Review 02-11 (fund 3): på en kompakt skærm står «Alle» i den lukkede boks, så «Fjern filtrene» gav fokus til
// overskriften. Nu står fokus på linjen over filtrene, og på en stor skærm stadig på «Alle»
test('«Fjern filtrene» i kataloget giver fokus til linjen over filtrene på en kompakt skærm og til «Alle» på en stor', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  for (const [maal, navn] of [[{ b: 390, h: 844 }, 'filtre-katalog'], [{ b: 1280, h: 800 }, 'filtre-katalog'], [{ b: 1024, h: 1366 }, 'gruppe-alle']]) {
    const hvor = maal.b + '×' + maal.h;
    if (!filtreI(aabnSide('katalog', maal)).open) foldUd(vist.at(-1));
    send(medFokusNavn(vist.at(-1), 'gruppe-halloween'), 'click');
    skriv(vist.at(-1), 'xyzzy');
    send(medFokusNavn(vist.at(-1), 'fjern-filtre'), 'click');
    assert.equal(fokus, medFokusNavn(vist.at(-1), navn), hvor + ': fokus står på ' + navn);
    assert.ok(!filtreI(vist.at(-1)).open || navn === 'gruppe-alle', hvor + ': fokus står på noget, der kan ses');
    V.rute('#/');
  }
});

// ---------- «Mere grønt i maden» (js/groent.js) ----------

const groentKontakt = () => medFokusNavn(vist.at(-1), 'groent');
const groentStatus = () => tekstAf(find(vist.at(-1), (e) => e.attr.id === 'groent-status')[0]);
const gemtFamilie = () => JSON.parse(lageret.get('kog-familie-v1'));

test('«Mere grønt i maden»: kontakten slår til og fra, gemmer i familien og siger antallet af retter', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  const n = S.ids.filter((id) => S.retter.get(id).groen).length;
  assert.ok(n >= 1, 'mindst én ret har mere grønt (kødsovsen)');
  aabnSide('mere');
  const k = groentKontakt();
  assert.equal(k.tag, 'button');
  assert.equal(k.attr.role, 'switch');
  assert.equal(k.attr['aria-checked'], 'false');
  assert.equal(tekstAf(find(vist.at(-1), (e) => e.attr.id === k.attr['aria-labelledby'])[0]), 'Mere grønt i maden');
  assert.equal(k.attr['aria-describedby'], 'groent-status');
  assert.equal(groentStatus(), 'Slået fra');
  assert.equal(lageret.has('kog-familie-v1'), false, 'at vise «Mere» gemmer intet');
  annonceret.length = 0;
  send(groentKontakt(), 'click');
  assert.equal(gemtFamilie().mereGroent, true);
  assert.equal(groentKontakt().attr['aria-checked'], 'true');
  assert.equal(groentStatus(), 'Halvt kød og halvt røde linser i ' + n + '\u00a0' + (n === 1 ? 'ret' : 'retter'));
  assert.equal(fokus, groentKontakt(), 'fokus bliver på kontakten, når skærmen er tegnet igen');
  assert.deepEqual(annonceret, ['Mere grønt i maden er slået til.']);
  send(groentKontakt(), 'click');
  assert.equal(gemtFamilie().mereGroent, false);
  assert.equal(groentKontakt().attr['aria-checked'], 'false');
  assert.equal(groentStatus(), 'Slået fra');
  assert.deepEqual(annonceret, ['Mere grønt i maden er slået til.', 'Mere grønt i maden er slået fra.']);
});

test('«Mere grønt i maden»: valget rører ikke resten af familien, og en fejl i lageret giver en besked uden skift', (t) => {
  const setItem = globalThis.localStorage.setItem;
  t.after(() => { globalThis.localStorage.setItem = setItem; V.rute('#/'); });
  medOpskrifter();
  aabnSide('mere');
  lageret.set('kog-familie-v1', JSON.stringify({ v: 1, voksne: 2, boern: 1, barnAndel: 0.7, udvalg: null, favoritter: [S.ids[0]], lavet: {} }));
  V.rute(location.hash);
  send(groentKontakt(), 'click');
  const f = gemtFamilie();
  assert.deepEqual([f.voksne, f.boern, f.barnAndel, f.favoritter, f.mereGroent], [2, 1, 0.7, [S.ids[0]], true]);
  globalThis.localStorage.setItem = () => { throw new Error('lageret er fuldt'); };
  annonceret.length = 0;
  send(groentKontakt(), 'click');
  assert.equal(groentKontakt().attr['aria-checked'], 'true', 'kontakten står, som den stod');
  const fejl = find(vist.at(-1), (e) => e.attr.role === 'alert');
  assert.equal(fejl.length, 1);
  assert.match(tekstAf(fejl[0]), /^Valget kunne ikke gemmes på denne enhed\./);
  assert.deepEqual(annonceret, [], 'intet «slået fra», når det ikke blev gemt');
});

test('«Mere grønt i maden»: en familie fra en nyere udgave giver en kontakt, der ikke kan trykkes på', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  aabnSide('mere');
  lageret.set('kog-familie-v1', JSON.stringify({ v: 99, mereGroent: true }));
  V.rute(location.hash);
  assert.equal(groentKontakt().attr.disabled, '');
  assert.equal(groentStatus(), 'Lavet med en nyere udgave');
});

test('«Mere grønt i maden»: «Indkøbsliste» på forsiden giver et link med g, præcis når den er slået til', (t) => {
  t.after(() => V.rute('#/'));
  medOpskrifter();
  aabnSide('');
  const ret = S.ids.find((id) => S.retter.get(id).uge);
  lageret.set('kog-uge-v1', JSON.stringify({ v: 1, uge: null, n: 4, dage: [{ ret, n: 4, af: 'bo' }, null, null, null, null, null, null], rettet: 1 }));
  for (const til of [false, true]) {
    lageret.set('kog-familie-v1', JSON.stringify({ v: 1, mereGroent: til }));
    V.rute(location.hash);
    send(medFokusNavn(vist.at(-1), 'indkoeb'), 'click');
    assert.match(location.hash, til ? /^#\/hent\/v2\.[0-9]{8}\..*\.g\.[0-9a-f]{4}$/ : /^#\/hent\/v1\.[0-9]{8}\.[^.]*\.[0-9a-f]{4}$/, location.hash);
    location.hash = '#/voksen/';
    V.aabn();
  }
});

// Kataloget søger i den udgave, der vises og laves: slået til finder «røde linser» også retterne med mere grønt (før
// søgte voksendelen altid i grundretten og fandt dem ikke). Retter med linser i grundretten findes begge gange
test('«Mere grønt i maden»: søgningen i kataloget finder retterne med mere grønt på linserne, præcis når den er slået til', (t) => {
  t.after(() => { skriv(vist.at(-1), ''); V.rute('#/'); });
  medOpskrifter();
  const groenne = S.ids.filter((id) => S.retter.get(id).groen);
  const fundet = {};
  for (const til of [false, true]) {
    aabnSide('katalog');
    lageret.set('kog-familie-v1', JSON.stringify({ v: 1, mereGroent: til }));
    V.rute(location.hash);
    skriv(vist.at(-1), 'røde linser');
    fundet[til] = raekkerI(vist.at(-1));
  }
  assert.ok(groenne.length >= 1 && groenne.every((id) => !fundet.false.includes(id)), 'slået fra: ingen af retterne med mere grønt (' + fundet.false.join(', ') + ')');
  assert.deepEqual(fundet.true, S.ids.filter((id) => fundet.false.includes(id) || groenne.includes(id)), 'slået til: også retterne med mere grønt');
});
