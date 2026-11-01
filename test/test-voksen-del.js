// test-voksen-del.js — voksendelens logik (js/voksen-del.js, docs/foraeldredel.md afsnit 2-5): adresserne, låsen (hold,
// 10 minutter uden tryk, ud af #/voksen…), «Fyld op med nye», afkrydsningen og filtrene i udvalget. Skærmene selv
// prøves i WebKit. js/hold.js lytter på document, når den indlæses, så testen giver et lille falsk document først.
// Kør:  node test/test-voksen-del.js
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as lager from '../js/lager.js';

const lyttere = {};
const lavEl = (tag) => ({
  tag, born: [], attr: {}, dataset: {}, style: { setProperty() {} }, classList: { add() {}, remove() {} },
  setAttribute(k, v) { this.attr[k] = v; }, append(...b) { this.born.push(...b); }, prepend() {}, addEventListener() {},
});
globalThis.document = {
  addEventListener: (type, fn) => { (lyttere[type] ??= []).push(fn); },
  createElement: lavEl,
  createElementNS: (ns, tag) => lavEl(tag),
  createTextNode: (tekst) => ({ tekst }),
  querySelector: () => null,
};
globalThis.location = { hash: '#/' };

const V = await import('../js/voksen-del.js');

// app.js' hjælpere, så tyndt som muligt: statusSkaerm giver sine valg tilbage, så vagten kan genkendes
const vist = [];
let visKald = 0;
V.init({
  S: { ids: [], retter: new Map() },
  naviger: (hash) => { location.hash = hash; },
  vis: () => { visKald++; },
  visSkaerm: (s) => { vist.push(s); },
  statusSkaerm: (valg) => ({ status: valg }),
  knap: () => lavEl('button'),
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
    ['#/voksen/udvalg', 'udvalg'], ['#/voksen/favoritter', 'favoritter'], ['#/voksen/ukendt', 'hub'],
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

test('husstanden i ord: ental og flertal, og et tomt antal står ikke med', () => {
  assert.equal(V.husstandTekst(2, 2), '2 voksne og 2 børn');
  assert.equal(V.husstandTekst(1, 1), '1 voksen og 1 barn');
  assert.equal(V.husstandTekst(2, 0), '2 voksne');
  assert.equal(V.husstandTekst(null, 3), '3 børn');
  assert.equal(V.husstandTekst(null, null), '');
});
