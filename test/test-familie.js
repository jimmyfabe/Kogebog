// test-familie.js — familien til voksendelen i js/lager.js (kog-familie-v1, docs/foraeldredel.md, afsnit 3) med et
// falsk localStorage: standardværdier, rens, versionsvagten, et fuldt lager og de gamle nøgler, der ikke må røres.
// Kør:  node test/test-familie.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as lager from '../js/lager.js';

// Et falsk localStorage, der kan nægte at læse eller skrive (privat browsing, fuldt lager), og som husker skrivningerne
class FalskLager {
  constructor(start = {}) {
    this.data = new Map(Object.entries(start));
    this.skrevet = [];
    this.fejl = null; // 'laes' eller 'skriv'
  }
  getItem(k) {
    if (this.fejl === 'laes') throw new Error('SecurityError');
    return this.data.has(k) ? this.data.get(k) : null;
  }
  setItem(k, v) {
    if (this.fejl === 'skriv') throw new Error('QuotaExceededError');
    this.skrevet.push(k);
    this.data.set(k, String(v));
  }
}
function medLager(start = {}) {
  const l = new FalskLager(Object.fromEntries(Object.entries(start).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])));
  Object.defineProperty(globalThis, 'localStorage', { value: l, configurable: true, writable: true });
  return l;
}
const NOEGLE = 'kog-familie-v1';
const gemt = (l) => JSON.parse(l.data.get(NOEGLE));
const uden = (o) => { const { laast, ...r } = o; return r; };

// Retterne er opdigtede, så testen ikke afhænger af index.json; MANGE er nok til alle grænserne
const MANGE = Array.from({ length: 400 }, (_, i) => 'ret-' + (i + 1));
const RETTER = ['koedsovs', 'tunfrikadeller', 'chorizo-pasta', 'pandekager', ...MANGE];
// i dage efter 01-01-2025 som 'ÅÅÅÅ-MM-DD'
const dag = (i) => new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);

const TOM = { v: 1, voksne: null, boern: null, barnAndel: 0.7, udvalg: null, favoritter: [], lavet: {} };
const FAMILIE = {
  voksne: 2, boern: 2, barnAndel: 0.5,
  udvalg: { ids: ['koedsovs', 'tunfrikadeller', 'chorizo-pasta'], rettet: '2026-10-31' },
  favoritter: ['pandekager', 'koedsovs'],
  lavet: { koedsovs: { gange: 3, sidst: '2026-10-28' }, pandekager: { gange: 1, sidst: '2026-10-04' } },
};

test('standardværdier: tomt lager giver den tomme familie, og tomFamilie giver et nyt objekt hver gang', () => {
  const l = medLager();
  assert.deepEqual(lager.tomFamilie(), TOM);
  assert.deepEqual(lager.hentFamilie(RETTER), { ...TOM, laast: false });
  const a = lager.tomFamilie();
  a.favoritter.push('koedsovs');
  a.lavet.koedsovs = { gange: 1, sidst: '2026-10-31' };
  assert.deepEqual(lager.tomFamilie(), TOM);
  assert.deepEqual(l.skrevet, []); // at læse skriver ikke
  // En tom ændring gemmer standardværdierne
  assert.deepEqual(lager.gemFamilie({}, RETTER), TOM);
  assert.deepEqual(gemt(l), TOM);
  assert.throws(() => lager.hentFamilie(), TypeError);
  assert.throws(() => lager.gemFamilie({}, { koedsovs: true }), TypeError);
  assert.throws(() => lager.skiftFavorit('koedsovs'), TypeError);
  assert.throws(() => lager.markerLavet('koedsovs', '2026-10-31', 'koedsovs'), TypeError);
});

test('gem og hent giver det samme', () => {
  const l = medLager();
  assert.deepEqual(lager.gemFamilie(FAMILIE, RETTER), { v: 1, ...FAMILIE });
  assert.deepEqual(gemt(l), { v: 1, ...FAMILIE });
  assert.deepEqual(lager.hentFamilie(RETTER), { v: 1, ...FAMILIE, laast: false });
  // En ændring lægges oven på det gemte, og et felt sat til undefined er ingen ændring
  assert.deepEqual(lager.gemFamilie({ voksne: 1 }, RETTER), { v: 1, ...FAMILIE, voksne: 1 });
  for (const felt of Object.keys(TOM)) {
    assert.deepEqual(lager.gemFamilie({ [felt]: undefined }, RETTER), { v: 1, ...FAMILIE, voksne: 1 }, felt);
  }
  // null nulstiller et felt; v og laast i ændringen tæller ikke
  assert.deepEqual(lager.gemFamilie({ udvalg: null, voksne: null, v: 7, laast: true }, RETTER), { v: 1, ...FAMILIE, udvalg: null, voksne: null });
  assert.deepEqual(uden(lager.hentFamilie(RETTER)), { v: 1, ...FAMILIE, udvalg: null, voksne: null });
  assert.equal(l.skrevet.every((k) => k === NOEGLE), true);
});

test('voksne og børn: null eller et heltal 0-8, og begge 0 er det samme som ikke sat', () => {
  for (let n = 0; n <= 8; n++) {
    medLager();
    assert.equal(lager.gemFamilie({ voksne: n, boern: 1 }, RETTER).voksne, n, 'voksne ' + n);
    assert.equal(lager.gemFamilie({ voksne: 1, boern: n }, RETTER).boern, n, 'børn ' + n);
  }
  for (const v of [-1, 9, 2.5, '2', true, NaN, Infinity, [2], { n: 2 }, null]) {
    medLager();
    const f = lager.gemFamilie({ voksne: v, boern: v }, RETTER);
    assert.deepEqual([f.voksne, f.boern], [null, null], JSON.stringify(v));
  }
  medLager();
  assert.deepEqual(lager.gemFamilie({ voksne: 0, boern: 0 }, RETTER), TOM);
  assert.deepEqual(lager.gemFamilie({ voksne: 0, boern: 3 }, RETTER), { ...TOM, voksne: 0, boern: 3 });
  // Sætter man børnene til 0, når de voksne allerede er 0, bliver begge null
  assert.deepEqual(lager.gemFamilie({ boern: 0 }, RETTER), TOM);
  assert.deepEqual(lager.gemFamilie({ voksne: 0 }, RETTER), { ...TOM, voksne: 0 });
});

test('barnAndel: 0,4-1,0 i trin af 0,1 og gemt med én decimal, ellers 0,7', () => {
  for (const [x, forventet] of [[0.4, 0.4], [0.5, 0.5], [0.6, 0.6], [0.7, 0.7], [0.8, 0.8], [0.9, 0.9], [1, 1],
    [0.1 + 0.2 + 0.2, 0.5], [0.7 + 0.1, 0.8], [0.3, 0.7], [0.1 * 3, 0.7], [1.1, 0.7], [0.75, 0.7], [0, 0.7], [-0.5, 0.7],
    ['0.5', 0.7], [NaN, 0.7], [Infinity, 0.7], [null, 0.7], [true, 0.7]]) {
    medLager();
    assert.equal(lager.gemFamilie({ barnAndel: x }, RETTER).barnAndel, forventet, String(x));
  }
});

test('udvalget: 1-24 kendte id\'er hver én gang og en dato eller null; ingen id\'er giver null', () => {
  const ids = ['koedsovs', 'koedsovs', 'constructor', '__proto__', 'Koedsovs', '<b>', 'a'.repeat(41), 7, null, 'ukendt-ret', 'pandekager'];
  medLager();
  assert.deepEqual(lager.gemFamilie({ udvalg: { ids, rettet: '2026-10-31' } }, RETTER).udvalg, { ids: ['koedsovs', 'pandekager'], rettet: '2026-10-31' });
  // Højst 24: de første 24 gyldige
  medLager();
  assert.deepEqual(lager.gemFamilie({ udvalg: { ids: ['ukendt', ...MANGE.slice(0, 30)] } }, RETTER).udvalg, { ids: MANGE.slice(0, 24), rettet: null });
  for (const rettet of ['31-10-2026', 20261031, '2026-10-31T12:00', null, undefined]) {
    medLager();
    assert.equal(lager.gemFamilie({ udvalg: { ids: ['koedsovs'], rettet } }, RETTER).udvalg.rettet, null, String(rettet));
  }
  for (const udvalg of [{ ids: [] }, { ids: ['ukendt'] }, { ids: 'koedsovs' }, {}, ['koedsovs'], 'koedsovs', 7, false, null]) {
    medLager();
    assert.equal(lager.gemFamilie({ udvalg: { ...FAMILIE.udvalg } }, RETTER).udvalg.ids.length, 3);
    assert.equal(lager.gemFamilie({ udvalg }, RETTER).udvalg, null, JSON.stringify(udvalg));
  }
});

test('favoritter: højst 200 kendte id\'er hver én gang, ellers en tom liste', () => {
  medLager();
  assert.deepEqual(lager.gemFamilie({ favoritter: ['pandekager', 'pandekager', 'constructor', 'ukendt', 7, 'koedsovs'] }, RETTER).favoritter,
    ['pandekager', 'koedsovs']);
  assert.deepEqual(lager.gemFamilie({ favoritter: MANGE.slice(0, 250) }, RETTER).favoritter, MANGE.slice(0, 200));
  for (const favoritter of ['koedsovs', { koedsovs: true }, null, 7]) {
    medLager();
    assert.deepEqual(lager.gemFamilie({ favoritter }, RETTER).favoritter, [], JSON.stringify(favoritter));
  }
});

test('lavet: kendte id\'er med gange 1-999 og en dato; ekstra felter og forkerte typer forsvinder', () => {
  const lavet = {
    koedsovs: { gange: 999, sidst: '2026-10-30', navn: 'x' },
    pandekager: { gange: 1, sidst: '2026-10-01' },
    constructor: { gange: 2, sidst: '2026-10-01' }, 'ukendt-ret': { gange: 2, sidst: '2026-10-01' },
    'ret-1': { gange: 0, sidst: '2026-10-01' }, 'ret-2': { gange: 1000, sidst: '2026-10-01' },
    'ret-3': { gange: 1.5, sidst: '2026-10-01' }, 'ret-4': { gange: '2', sidst: '2026-10-01' },
    'ret-5': { gange: 2 }, 'ret-6': { gange: 2, sidst: '01-10-2026' }, 'ret-7': { gange: 2, sidst: 20261001 },
    'ret-8': null, 'ret-9': 2, 'ret-10': [2, '2026-10-01'],
  };
  medLager();
  assert.deepEqual(lager.gemFamilie({ lavet }, RETTER).lavet,
    { koedsovs: { gange: 999, sidst: '2026-10-30' }, pandekager: { gange: 1, sidst: '2026-10-01' } });
  for (const x of [[{ gange: 1, sidst: '2026-10-01' }], 'koedsovs', 7, null]) {
    medLager();
    assert.deepEqual(lager.gemFamilie({ lavet: x }, RETTER).lavet, {}, JSON.stringify(x));
  }
  // «__proto__» som nøgle i JSON'en bliver ikke til noget
  medLager({ [NOEGLE]: '{"v":1,"lavet":{"__proto__":{"gange":1,"sidst":"2026-10-01"},"koedsovs":{"gange":1,"sidst":"2026-10-01"}}}' });
  const f = lager.hentFamilie(RETTER);
  assert.deepEqual(Object.keys(f.lavet), ['koedsovs']);
  assert.equal(Object.getPrototypeOf(f.lavet), Object.prototype);
});

test('lavet over 300: dem, der er lavet længst tid siden, forsvinder', () => {
  // 310 retter lavet på hver sin dag, i blandet rækkefølge: de 10 ældste forsvinder
  const ids = MANGE.slice(0, 310);
  const lavet = Object.fromEntries(ids.map((id, i) => [id, { gange: 1, sidst: dag((i * 7) % 310) }]));
  const l = medLager();
  const f = lager.gemFamilie({ lavet }, RETTER);
  assert.equal(Object.keys(f.lavet).length, 300);
  const datoer = Object.values(f.lavet).map((x) => x.sidst);
  assert.equal(datoer.some((d) => d < dag(10)), false);
  assert.equal(new Set(datoer).size, 300);
  assert.deepEqual(gemt(l).lavet, f.lavet);
  // Endnu en ret lavet i dag skubber den ældste ud
  const ny = lager.markerLavet('koedsovs', dag(400), RETTER);
  assert.equal(Object.keys(ny.lavet).length, 300);
  assert.deepEqual(ny.lavet.koedsovs, { gange: 1, sidst: dag(400) });
  assert.equal(Object.values(ny.lavet).some((x) => x.sidst === dag(10)), false);
});

test('ukendte id\'er fjernes fra det, der vises, men et id, der allerede er gemt, bevares i lageret', () => {
  const l = medLager();
  lager.gemFamilie(FAMILIE, RETTER);
  // Kun kødsovsen kendes nu (fx mangler en hentning): svaret viser kun den, lageret beholder resten
  const kort = ['koedsovs'];
  const vist = {
    v: 1, voksne: 2, boern: 2, barnAndel: 0.5, udvalg: { ids: ['koedsovs'], rettet: '2026-10-31' }, favoritter: ['koedsovs'],
    lavet: { koedsovs: { gange: 3, sidst: '2026-10-28' } },
  };
  assert.deepEqual(uden(lager.hentFamilie(kort)), vist);
  assert.deepEqual(lager.gemFamilie({ voksne: 2 }, kort), vist);
  assert.deepEqual(gemt(l), { v: 1, ...FAMILIE });
  assert.notEqual(lager.gemFamilie({ boern: 2 }, []), null);
  assert.deepEqual(gemt(l), { v: 1, ...FAMILIE });
  // Et gemt id må gemmes igen, også i et andet felt; et nyt ukendt id kommer ikke ind
  assert.deepEqual(lager.gemFamilie({ favoritter: ['tunfrikadeller', 'ny-ukendt', 'koedsovs'] }, kort).favoritter, ['koedsovs']);
  assert.deepEqual(gemt(l).favoritter, ['tunfrikadeller', 'koedsovs']);
  // Gemte id'er, der ikke ligner et id fra index.json, renses væk ved næste skrivning
  const l2 = medLager({ [NOEGLE]: { v: 1, favoritter: ['<b>', 'a'.repeat(41), 'koedsovs'], udvalg: { ids: ['<b>'] } } });
  assert.notEqual(lager.gemFamilie({}, []), null);
  assert.deepEqual(gemt(l2), { ...TOM, favoritter: ['koedsovs'] });
});

test('skiftFavorit sætter og fjerner hjertet uden at røre resten', () => {
  const l = medLager();
  lager.gemFamilie(FAMILIE, RETTER);
  assert.deepEqual(lager.skiftFavorit('tunfrikadeller', RETTER).favoritter, ['pandekager', 'koedsovs', 'tunfrikadeller']);
  assert.deepEqual(lager.skiftFavorit('koedsovs', RETTER).favoritter, ['pandekager', 'tunfrikadeller']);
  assert.deepEqual(lager.skiftFavorit('koedsovs', RETTER), { v: 1, ...FAMILIE, favoritter: ['pandekager', 'tunfrikadeller', 'koedsovs'] });
  // En ukendt ret får ikke et hjerte, og en gemt favorit, der ikke er hentet, bliver stående
  assert.deepEqual(lager.skiftFavorit('ukendt', RETTER).favoritter, ['pandekager', 'tunfrikadeller', 'koedsovs']);
  assert.deepEqual(lager.skiftFavorit('chorizo-pasta', ['chorizo-pasta']).favoritter, ['chorizo-pasta']);
  assert.deepEqual(gemt(l).favoritter, ['pandekager', 'tunfrikadeller', 'koedsovs', 'chorizo-pasta']);
});

test('markerLavet tæller op til 999 og sætter datoen; en forkert dato kaster', () => {
  const l = medLager();
  assert.deepEqual(lager.markerLavet('koedsovs', '2026-10-30', RETTER).lavet, { koedsovs: { gange: 1, sidst: '2026-10-30' } });
  assert.deepEqual(lager.markerLavet('koedsovs', '2026-10-31', RETTER).lavet, { koedsovs: { gange: 2, sidst: '2026-10-31' } });
  assert.deepEqual(lager.markerLavet('ukendt', '2026-10-31', RETTER).lavet, { koedsovs: { gange: 2, sidst: '2026-10-31' } });
  lager.gemFamilie({ lavet: { koedsovs: { gange: 999, sidst: '2026-10-01' } } }, RETTER);
  assert.deepEqual(lager.markerLavet('koedsovs', '2026-11-01', RETTER).lavet, { koedsovs: { gange: 999, sidst: '2026-11-01' } });
  l.skrevet = [];
  for (const dato of ['31-10-2026', '2026-10-31T18:00', 20261031, new Date(), undefined, '']) {
    assert.throws(() => lager.markerLavet('koedsovs', dato, RETTER), TypeError, String(dato));
  }
  assert.deepEqual(l.skrevet, []);
  assert.deepEqual(gemt(l).lavet, { koedsovs: { gange: 999, sidst: '2026-11-01' } });
});

test('versionsvagten: et højere v læses som tomt og låst og overskrives aldrig', () => {
  // v står som tekst i JSON'en, så 1e999 (uendelig) også kan prøves
  for (const v of ['2', '1.5', '99', '1e999']) {
    const raa = '{"v":' + v + ',"voksne":"ny form","favoritter":{"ny":"form"}}';
    const l = medLager({ [NOEGLE]: raa });
    assert.deepEqual(lager.hentFamilie(RETTER), { ...TOM, laast: true }, 'v' + v);
    assert.equal(lager.gemFamilie(FAMILIE, RETTER), null);
    assert.equal(lager.gemFamilie({ ...FAMILIE, v: Number(v), laast: false }, RETTER), null);
    assert.equal(lager.skiftFavorit('koedsovs', RETTER), null);
    assert.equal(lager.markerLavet('koedsovs', '2026-10-31', RETTER), null);
    assert.equal(l.data.get(NOEGLE), raa);
    assert.deepEqual(l.skrevet, []);
  }
  // Et lavere, manglende eller ugyldigt v og ødelagt JSON læses som tomt og kan skrives
  for (const raa of [{ v: 0, voksne: 2 }, { voksne: 2 }, { v: '2', voksne: 2 }, { v: null }, [1, 2], '{ikke json', '7']) {
    const l = medLager({ [NOEGLE]: raa });
    assert.deepEqual(lager.hentFamilie(RETTER), { ...TOM, laast: false }, JSON.stringify(raa));
    assert.deepEqual(lager.gemFamilie(FAMILIE, RETTER), { v: 1, ...FAMILIE });
    assert.equal(gemt(l).v, 1);
  }
});

test('et lager, der ikke kan læses eller skrives (fuldt), giver tomme data og null, aldrig en fejl', () => {
  const l = medLager({ [NOEGLE]: { v: 1, ...FAMILIE } });
  l.fejl = 'laes';
  assert.deepEqual(lager.hentFamilie(RETTER), { ...TOM, laast: false });
  l.fejl = 'skriv';
  assert.deepEqual(lager.hentFamilie(RETTER), { v: 1, ...FAMILIE, laast: false });
  assert.equal(lager.gemFamilie({ voksne: 1 }, RETTER), null);
  assert.equal(lager.skiftFavorit('tunfrikadeller', RETTER), null);
  assert.equal(lager.markerLavet('koedsovs', '2026-10-31', RETTER), null);
  assert.deepEqual(gemt(l), { v: 1, ...FAMILIE });
  Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
  assert.deepEqual(lager.hentFamilie(RETTER), { ...TOM, laast: false });
  assert.equal(lager.gemFamilie(FAMILIE, RETTER), null);
});

test('kog-v1, kog-uge-v1 og kog-liste-v1 er byte-uændrede efter gemFamilie, skiftFavorit og markerLavet', () => {
  const gamle = {
    'kog-v1': '{"v":1,"sidste":{"ret":"koedsovs","nr":2,"tid":5},"timer":null}',
    'kog-uge-v1': '{"v":1,"uge":"2026-10-26","dage":[{"ret":"koedsovs","af":"rosa","n":4},null,null,null,null,null,null],"n":4,"prBarn":1,"rettet":null}',
    'kog-liste-v1': '{"v":1,"kode":null,"uge":"2026-10-26","varer":[{"id":"loeg","m":1.5}],"koebt":["loeg"],"harVi":[],"hentet":5}',
  };
  const l = medLager(gamle);
  assert.notEqual(lager.gemFamilie(FAMILIE, RETTER), null);
  assert.notEqual(lager.skiftFavorit('tunfrikadeller', RETTER), null);
  assert.notEqual(lager.markerLavet('koedsovs', '2026-10-31', RETTER), null);
  for (const [k, v] of Object.entries(gamle)) assert.equal(l.data.get(k), v, k);
  assert.deepEqual(l.skrevet, [NOEGLE, NOEGLE, NOEGLE]);
  // Og den anden vej: de gamle nøgler skriver ikke i familien
  const foer = l.data.get(NOEGLE);
  lager.gem({ timer: null });
  lager.gemListe({ koebt: [] });
  assert.equal(l.data.get(NOEGLE), foer);
});
