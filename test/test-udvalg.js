// test-udvalg.js — børnenes valg følger ugens udvalg fra voksendelen (retterTilBoern og sideAntal i js/ugeplan.js,
// docs/foraeldredel.md afsnit 8): et udvalg på 8 retter giver 2 sider, og uden udvalg er det alle ugeplan-retter som før.
// Kør:  node test/test-udvalg.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lavModel } from '../js/model.js';
import * as lager from '../js/lager.js';

// js/hold.js lytter på document, når det indlæses (js/ugeplan.js henter det). Node har intet document, og testen bruger
// kun de rene funktioner, så ugeplan.js hentes først, når der er et
globalThis.document ??= { addEventListener() {} };
const { retterTilBoern, sideAntal } = await import('../js/ugeplan.js');

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (id) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
const IDS = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper.flatMap((g) => g.retter);
// Ugeplan-retterne, som børnenes valg viste dem, før udvalget fandtes (iPlanen): i index.json's rækkefølge
const UGEPLAN = IDS.map((id) => lavModel(json(id))).filter((m) => m.uge);
const ids = (retter) => retter.map((m) => m.id);
// 8 retter spredt over hele listen, i index.json's rækkefølge
const OTTE = Array.from({ length: 8 }, (_, k) => UGEPLAN[Math.floor((k * UGEPLAN.length) / 8)].id);
const UDEN_FOR = IDS.find((id) => !UGEPLAN.some((m) => m.id === id)); // en ret, der ikke er i ugeplanen (bagning)

test('et udvalg på 8 retter giver 2 sider med netop de 8 retter, i samme rækkefølge som før', () => {
  assert.ok(sideAntal(UGEPLAN) > 2, 'uden udvalg er der flere end 2 sider (' + UGEPLAN.length + ' retter)');
  // Udvalget gemmer retterne i den rækkefølge, de blev valgt: børnene ser dem i den kendte rækkefølge
  const vist = retterTilBoern(UGEPLAN, { ids: [...OTTE].reverse(), rettet: '2026-10-31' });
  assert.deepEqual(ids(vist), OTTE);
  assert.equal(sideAntal(vist), 2);
});

test('sideAntal: fire retter pr. side og mindst én side', () => {
  for (const [antal, sider] of [[0, 1], [1, 1], [4, 1], [5, 2], [8, 2], [9, 3], [24, 6]]) {
    assert.equal(sideAntal(UGEPLAN.slice(0, antal)), sider, antal + ' retter');
  }
  assert.equal(sideAntal(UGEPLAN), Math.ceil(UGEPLAN.length / 4));
});

test('uden udvalg (null) er det alle ugeplan-retter i samme rækkefølge som før', () => {
  for (const udvalg of [null, undefined]) {
    const vist = retterTilBoern(UGEPLAN, udvalg);
    assert.deepEqual(ids(vist), ids(UGEPLAN), String(udvalg));
    assert.equal(sideAntal(vist), Math.ceil(UGEPLAN.length / 4), String(udvalg));
  }
});

test('ukendte id\'er og retter uden for ugeplanen ignoreres, og hver ret står der én gang', () => {
  assert.ok(UDEN_FOR, 'index.json har en ret uden for ugeplanen');
  const udvalg = { ids: ['findes-ikke', OTTE[3], UDEN_FOR, '__proto__', 'constructor', 42, null, OTTE[1], OTTE[3]], rettet: null };
  const vist = retterTilBoern(UGEPLAN, udvalg);
  assert.deepEqual(ids(vist), [OTTE[1], OTTE[3]]);
  assert.equal(sideAntal(vist), 1);
});

test('et udvalg uden retter tilbage, eller med forkert form, giver alle ugeplan-retter', () => {
  const forkerte = [{ ids: ['findes-ikke', UDEN_FOR] }, { ids: [] }, {}, { ids: OTTE[0] }, OTTE, OTTE[0], 42, true];
  for (const udvalg of forkerte) assert.deepEqual(ids(retterTilBoern(UGEPLAN, udvalg)), ids(UGEPLAN), JSON.stringify(udvalg));
});

test('ingen ugeplan-retter giver en tom liste på én side, og en liste, der ikke er en liste, er en fejl', () => {
  assert.deepEqual(retterTilBoern([], { ids: OTTE }), []);
  assert.equal(sideAntal(retterTilBoern([], null)), 1);
  for (const alle of [null, undefined, 'koedsovs', { length: 2 }]) assert.throws(() => retterTilBoern(alle, null), TypeError);
});

// Udvalget, som voksendelen gemmer det (gemFamilie), og som børnenes valg læser det (hentFamilie i retValgSkaerm)
test('udvalget fra kog-familie-v1 giver 2 sider i børnenes valg', () => {
  const data = new Map();
  const falsk = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); } };
  Object.defineProperty(globalThis, 'localStorage', { value: falsk, configurable: true, writable: true });
  assert.equal(lager.hentFamilie(IDS).udvalg, null);
  assert.deepEqual(ids(retterTilBoern(UGEPLAN, lager.hentFamilie(IDS).udvalg)), ids(UGEPLAN));
  assert.ok(lager.gemFamilie({ udvalg: { ids: OTTE, rettet: '2026-10-31' } }, IDS));
  const vist = retterTilBoern(UGEPLAN, lager.hentFamilie(IDS).udvalg);
  assert.deepEqual(ids(vist), OTTE);
  assert.equal(sideAntal(vist), 2);
});
