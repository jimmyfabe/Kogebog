// test-tid.js — timerens tidslogik (js/tid.js), tekstfunktionerne (js/tekst.js) og modellen (js/model.js).
// Kør:  node test/test-tid.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nyTimer, timerStatus, formaterTid, varighed, varighedKort, varighedTale, HURTIG_SEK } from '../js/tid.js';
import { isoTilMinutter, minutterTekst, tilTale, antalOrd, delIngrediens } from '../js/tekst.js';
import { lavModel } from '../js/model.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('timeren regner fra sluttidspunktet', () => {
  const t = nyTimer(1_000_000, 600);
  assert.equal(t.slut, 1_600_000);
  assert.deepEqual(timerStatus(t, 1_000_000), { restMs: 600_000, restSek: 600, andel: 1, faerdig: false });
  // Et halvt sekund inde vises stadig 10:00 (rundes op), ikke 9:59
  assert.equal(timerStatus(t, 1_000_500).restSek, 600);
  assert.equal(timerStatus(t, 1_001_000).restSek, 599);
  assert.equal(timerStatus(t, 1_300_000).andel, 0.5);
  // iPad'en sov i 20 minutter: timeren er færdig, ikke bagud
  const s = timerStatus(t, 1_000_000 + 20 * 60_000);
  assert.equal(s.faerdig, true);
  assert.equal(s.restMs, 0);
  assert.equal(s.andel, 0);
  // Uret er stillet tilbage: andelen bliver aldrig over 1
  assert.equal(timerStatus(t, 900_000).andel, 1);
});

test('timeren nægter forkerte varigheder', () => {
  assert.throws(() => nyTimer(0, 0));
  assert.throws(() => nyTimer(0, -1));
  assert.throws(() => nyTimer(0, 1.5));
});

test('hurtig-tilstand giver 2 sekunder', () => {
  assert.equal(varighed(600, true), HURTIG_SEK);
  assert.equal(varighed(600, false), 600);
});

test('tiden skrives som m:ss og h:mm:ss', () => {
  assert.equal(formaterTid(600), '10:00');
  assert.equal(formaterTid(5), '0:05');
  assert.equal(formaterTid(0), '0:00');
  assert.equal(formaterTid(3725), '1:02:05');
  assert.equal(varighedKort(600), '10 min');
  assert.equal(varighedKort(45), '45 sek');
  assert.equal(varighedKort(90), '1 min 30 sek');
  assert.equal(varighedKort(5400), '1 t 30 min');
  assert.equal(varighedTale(60), '1 minut');
  assert.equal(varighedTale(90), '1 minut og 30 sekunder');
  assert.equal(varighedTale(3661), '1 time, 1 minut og 1 sekund');
});

test('ISO 8601-varigheder', () => {
  assert.equal(isoTilMinutter('PT50M'), 50);
  assert.equal(isoTilMinutter('PT1H45M'), 105);
  assert.equal(isoTilMinutter('P1DT2H'), 1560);
  assert.equal(isoTilMinutter('50 min'), null);
  assert.equal(isoTilMinutter('PT'), null);
  assert.equal(minutterTekst(105), '1 t 45 min');
  assert.equal(minutterTekst(30), '30 min');
  assert.equal(minutterTekst(60), '1 t');
});

test('enheder skrives ud til stemmen', () => {
  assert.equal(tilTale('Mål 2,5 dl mel.'), 'Mål 2,5 deciliter mel.');
  assert.equal(tilTale('1 spsk sukker'), '1 spiseskefuld sukker');
  assert.equal(tilTale('3 spsk olie'), '3 spiseskefulde olie');
  assert.equal(tilTale('500 g hakket kød'), '500 gram hakket kød');
  assert.equal(tilTale('1,25 l kogende vand'), '1,25 liter kogende vand');
  assert.equal(tilTale('2,5 dl madlavningsfløde 15 %'), '2,5 deciliter madlavningsfløde 15 procent');
  assert.equal(tilTale('Lad dejen hvile.'), 'Lad dejen hvile.');
  // æ, ø og å er bogstaver: «l» i «løg» og «g» i «gås» er ikke en enhed
  assert.equal(tilTale('1 løg'), '1 løg');
  assert.equal(tilTale('1 stort løg'), '1 stort løg');
  assert.equal(tilTale('2 gås'), '2 gås');
  assert.equal(tilTale('25 g gær'), '25 gram gær');
  assert.equal(tilTale('1 dlø'), '1 dlø');
  assert.equal(tilTale('2 kgå'), '2 kgå');
  assert.equal(tilTale('1 spskæ'), '1 spskæ');
  assert.equal(tilTale('1 tskø'), '1 tskø');
  assert.equal(tilTale('2 stkæ'), '2 stkæ');
  assert.equal(tilTale('ca. 16 stk.'), 'ca. 16 stykker');
  assert.equal(tilTale('1 kg kartofler'), '1 kilo kartofler');
});

test('ord tælles uden tegnsætning', () => {
  assert.equal(antalOrd('Smag! Sukker eller syltetøj?'), 4);
  assert.equal(antalOrd('Rør, til dejen er glat.'), 5);
  assert.equal(antalOrd('Mål 2,5 dl mel.'), 4);
});

test('ingrediensen deles i mængde og navn', () => {
  assert.deepEqual(delIngrediens('2,5 dl hvedemel', '2,5 dl'), { maengde: '2,5 dl', navn: 'hvedemel' });
  assert.deepEqual(delIngrediens('smør til panden', ''), { maengde: '', navn: 'smør til panden' });
  assert.deepEqual(delIngrediens('3 æg', '4'), { maengde: '', navn: '3 æg' });
});

test('modellen af pandekagerne', () => {
  const json = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/pandekager.json'), 'utf8'));
  const m = lavModel(json);
  assert.equal(m.id, 'pandekager');
  assert.equal(m.minutter, 35);
  assert.equal(m.trin.length, 11);
  assert.equal(m.ingredienser[0].ikon, 'mel');
  assert.equal(m.ingredienser[0].navn, 'hvedemel');
  assert.equal(m.trin[8].timerSek, 60);
  assert.equal(m.trin[9].voksen, true);
  assert.equal(m.trin[9].voksenSlags, 'varme');
  assert.equal(m.trin[0].voksen, false);
  assert.equal(m.trin[0].voksenSlags, null);
  assert.equal(m.afproevet, false);
});
