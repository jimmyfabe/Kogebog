// test-udvalg.js — børnenes valg følger ugens udvalg fra voksendelen (retterTilBoern og sideAntal i js/ugeplan.js,
// docs/foraeldredel.md afsnit 8): et udvalg på 8 retter giver 2 sider. Uden udvalg er det favoritterne og nye retter,
// højst 12 (docs/fable-foraeldrekogebog-2026-11-10.md, fase 1 b).
// Kør:  node test/test-udvalg.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lavModel } from '../js/model.js';
import * as lager from '../js/lager.js';
import { blandet } from '../js/grupper.js';

// js/hold.js lytter på document, når det indlæses (js/ugeplan.js henter det). Node har intet document, og testen bruger
// kun de rene funktioner, så ugeplan.js hentes først, når der er et
globalThis.document ??= { addEventListener() {} };
const { retterTilBoern, sideAntal, prikVindue, BOERN_KORT, BOERN_HJERTER } = await import('../js/ugeplan.js');

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (id) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
const GRUPPER = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper;
const IDS = GRUPPER.flatMap((g) => g.retter);
// Ugeplan-retterne, som børnenes valg viste dem, før udvalget fandtes (iPlanen): i index.json's rækkefølge
const UGEPLAN = IDS.map((id) => lavModel(json(id))).filter((m) => m.uge);
const ids = (retter) => retter.map((m) => m.id);
// 8 retter spredt over hele listen, i index.json's rækkefølge
const OTTE = Array.from({ length: 8 }, (_, k) => UGEPLAN[Math.floor((k * UGEPLAN.length) / 8)].id);
const UDEN_FOR = IDS.find((id) => !UGEPLAN.some((m) => m.id === id)); // en ret, der ikke er i ugeplanen (bagning)

// Udvalgets 8 retter, som børnene ser dem: blandet over grupperne (ikke i den rækkefølge, de blev valgt)
const OTTE_BLANDET = ids(blandet(UGEPLAN.filter((m) => OTTE.includes(m.id)), GRUPPER, (m) => m.id));

test('et udvalg på 8 retter giver 2 sider med netop de 8 retter, blandet over grupperne', () => {
  assert.ok(sideAntal(UGEPLAN) > 2, 'uden udvalg er der flere end 2 sider (' + UGEPLAN.length + ' retter)');
  assert.notDeepEqual(OTTE_BLANDET, OTTE, 'blandingen ændrer rækkefølgen for de 8');
  const vist = retterTilBoern(UGEPLAN, { udvalg: { ids: [...OTTE].reverse(), rettet: '2026-10-31' }, favoritter: [OTTE[0], UGEPLAN[1].id] }, GRUPPER);
  assert.deepEqual(ids(vist), OTTE_BLANDET, 'udvalget gælder, også når der er favoritter');
  assert.equal(sideAntal(vist), 2);
  // Uden grupper står de i ugeplan-listens rækkefølge, uanset rækkefølgen i udvalget
  assert.deepEqual(ids(retterTilBoern(UGEPLAN, { udvalg: { ids: [...OTTE].reverse() } })), OTTE);
});

test('sideAntal: fire retter pr. side og mindst én side', () => {
  for (const [antal, sider] of [[0, 1], [1, 1], [4, 1], [5, 2], [8, 2], [9, 3], [24, 6]]) {
    assert.equal(sideAntal(UGEPLAN.slice(0, antal)), sider, antal + ' retter');
  }
  assert.equal(sideAntal(UGEPLAN), Math.ceil(UGEPLAN.length / 4));
});

// Uden udvalg, favoritter og «lavet» (en ny familie): de første 12, blandet over grupperne som «Fyld op med nye»
const NYE_12 = ids(blandet(UGEPLAN, GRUPPER, (m) => m.id)).slice(0, BOERN_KORT);

test('uden udvalg og uden favoritter: 12 retter, familien ikke har lavet, blandet over grupperne (3 sider)', () => {
  assert.ok(UGEPLAN.length > BOERN_KORT, 'flere ugeplan-retter end 12 (' + UGEPLAN.length + ')');
  for (const familie of [{ udvalg: null, favoritter: [], lavet: {} }, null, undefined, {}, 42, 'familie']) {
    const vist = retterTilBoern(UGEPLAN, familie, GRUPPER);
    assert.deepEqual(ids(vist), NYE_12, JSON.stringify(familie));
    assert.equal(sideAntal(vist), 3, JSON.stringify(familie));
  }
  assert.ok(new Set(NYE_12.map((id) => GRUPPER.findIndex((g) => g.retter.includes(id)))).size > 1, 'de 12 er fra flere grupper');
});

test('uden udvalg: favoritterne først (de mindst nyligt lavede før de nyeste), og så nye retter, til der er 12', () => {
  const [a, b, c] = [UGEPLAN[5].id, UGEPLAN[2].id, UGEPLAN[9].id];
  const lavet = { [a]: { gange: 2, sidst: '2026-11-10' }, [b]: { gange: 1, sidst: '2026-10-01' }, [NYE_12[0]]: { gange: 1, sidst: '2026-11-01' } };
  const vist = ids(retterTilBoern(UGEPLAN, { udvalg: null, favoritter: [a, b, c], lavet }, GRUPPER));
  // c er aldrig lavet ('' først), b for længst, a for nylig
  assert.deepEqual(vist.slice(0, 3), [c, b, a]);
  assert.equal(vist.length, BOERN_KORT);
  const nye = vist.slice(3);
  assert.ok(nye.every((id) => !Object.hasOwn(lavet, id) && ![a, b, c].includes(id)), 'de 9 andre er aldrig lavet og ikke favoritter: ' + nye);
  assert.deepEqual(nye, ids(blandet(UGEPLAN.filter((m) => ![a, b, c].includes(m.id) && !Object.hasOwn(lavet, m.id)), GRUPPER, (m) => m.id)).slice(0, 9));
});

test('uden udvalg: højst 10 favoritter, så der altid er mindst 2 nye', () => {
  const fav = UGEPLAN.slice(0, 14).map((m) => m.id);
  const lavet = Object.fromEntries(fav.map((id, k) => [id, { gange: 1, sidst: '2026-10-' + String(10 + k).padStart(2, '0') }]));
  const vist = ids(retterTilBoern(UGEPLAN, { udvalg: null, favoritter: fav, lavet }, GRUPPER));
  assert.equal(BOERN_HJERTER, 10);
  assert.deepEqual(vist.slice(0, BOERN_HJERTER), fav.slice(0, BOERN_HJERTER), 'de 10, der er lavet for længst');
  assert.equal(vist.length, BOERN_KORT);
  assert.ok(vist.slice(BOERN_HJERTER).every((id) => !fav.includes(id) && !Object.hasOwn(lavet, id)), 'de 2 sidste er nye');
});

test('uden udvalg: er der ikke nye nok, fyldes der op med de retter, der er lavet for længst', () => {
  const alle = UGEPLAN.slice(0, 6);
  const lavet = Object.fromEntries(alle.slice(1).map((m, k) => [m.id, { gange: 1, sidst: '2026-10-' + String(20 - k).padStart(2, '0') }]));
  const vist = ids(retterTilBoern(alle, { udvalg: null, favoritter: [], lavet }, GRUPPER));
  assert.deepEqual(vist, [alle[0].id, ...alle.slice(1).map((m) => m.id).reverse()], 'den nye først, så de lavede fra ældst til nyest');
  // Favoritter uden for ugeplanen (en kage) og ukendte id'er tæller ikke
  const udenFor = ids(retterTilBoern(UGEPLAN, { udvalg: null, favoritter: [UDEN_FOR, 'findes-ikke', '__proto__'], lavet: {} }, GRUPPER));
  assert.deepEqual(udenFor, NYE_12);
});

test('ukendte id\'er og retter uden for ugeplanen ignoreres, og hver ret står der én gang', () => {
  assert.ok(UDEN_FOR, 'index.json har en ret uden for ugeplanen');
  const udvalg = { ids: ['findes-ikke', OTTE[3], UDEN_FOR, '__proto__', 'constructor', 42, null, OTTE[1], OTTE[3]], rettet: null };
  const vist = retterTilBoern(UGEPLAN, { udvalg }, GRUPPER);
  assert.deepEqual(ids(vist), [OTTE[1], OTTE[3]]);
  assert.equal(sideAntal(vist), 1);
});

test('et udvalg uden retter tilbage, eller med forkert form, giver favoritterne og nye retter', () => {
  const forkerte = [{ ids: ['findes-ikke', UDEN_FOR] }, { ids: [] }, {}, { ids: OTTE[0] }, OTTE, OTTE[0], 42, true];
  for (const udvalg of forkerte) assert.deepEqual(ids(retterTilBoern(UGEPLAN, { udvalg, favoritter: [], lavet: {} }, GRUPPER)), NYE_12, JSON.stringify(udvalg));
  // Grupper med forkert form: retterne står i listens rækkefølge (blandet uden grupper)
  assert.deepEqual(ids(retterTilBoern(UGEPLAN, null, 'grupper')), ids(UGEPLAN).slice(0, BOERN_KORT));
});

test('ingen ugeplan-retter giver en tom liste på én side, og en liste, der ikke er en liste, er en fejl', () => {
  assert.deepEqual(retterTilBoern([], { udvalg: { ids: OTTE } }, GRUPPER), []);
  assert.deepEqual(retterTilBoern([], { favoritter: OTTE }, GRUPPER), []);
  assert.equal(sideAntal(retterTilBoern([], null)), 1);
  for (const alle of [null, undefined, 'koedsovs', { length: 2 }]) assert.throws(() => retterTilBoern(alle, null), TypeError);
});

// Udvalget, som voksendelen gemmer det (gemFamilie), og som børnenes valg læser det (hentFamilie i retValgSkaerm)
test('udvalget fra kog-familie-v1 giver 2 sider i børnenes valg', () => {
  const data = new Map();
  const falsk = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); } };
  Object.defineProperty(globalThis, 'localStorage', { value: falsk, configurable: true, writable: true });
  assert.equal(lager.hentFamilie(IDS).udvalg, null);
  assert.deepEqual(ids(retterTilBoern(UGEPLAN, lager.hentFamilie(IDS), GRUPPER)), NYE_12);
  assert.ok(lager.gemFamilie({ udvalg: { ids: OTTE, rettet: '2026-10-31' } }, IDS));
  const vist = retterTilBoern(UGEPLAN, lager.hentFamilie(IDS), GRUPPER);
  assert.deepEqual(ids(vist), OTTE_BLANDET);
  assert.equal(sideAntal(vist), 2);
});

test('prikVindue: højst syv prikker, præcis én fyldt, og små prikker kun, hvor der er flere sider', () => {
  for (const sider of [1, 2, 3, 7, 8, 21, 38]) {
    for (let side = 0; side < sider; side++) {
      const p = prikVindue(side, sider);
      const hvor = 'side ' + side + ' af ' + sider;
      assert.equal(p.length, Math.min(7, sider), hvor);
      assert.equal(p.filter((x) => x.nu).length, 1, hvor);
      assert.ok(!p.find((x) => x.nu).lille, hvor + ': den fyldte prik er aldrig lille');
      assert.equal(p[0].lille, sider > 7 && side > 3, hvor + ': venstre kant');
      assert.equal(p[p.length - 1].lille, sider > 7 && side < sider - 4, hvor + ': højre kant');
    }
  }
});

test('prikVindue: den fyldte prik flytter sig, mens man blader, og vinduet følger efter', () => {
  const nuPaa = (side) => prikVindue(side, 21).findIndex((x) => x.nu);
  assert.deepEqual([0, 1, 2, 3, 4, 10, 17, 18, 19, 20].map(nuPaa), [0, 1, 2, 3, 3, 3, 3, 4, 5, 6]);
});

test('prikVindue: forkerte input giver ingen prikker eller den nærmeste side', () => {
  assert.deepEqual(prikVindue(0, 0), []);
  assert.deepEqual(prikVindue(0, NaN), []);
  assert.equal(prikVindue(99, 3).findIndex((x) => x.nu), 2);
  assert.equal(prikVindue(-4, 3).findIndex((x) => x.nu), 0);
});
