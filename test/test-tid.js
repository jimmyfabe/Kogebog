// test-tid.js — timerens tidslogik (js/tid.js), tekstfunktionerne (js/tekst.js), modellen (js/model.js) og index.json
// gennem hentIndex (js/data.js).
// Kør:  node test/test-tid.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nyTimer, timerStatus, formaterTid, varighed, varighedKort, varighedTale, HURTIG_SEK } from '../js/tid.js';
import { isoTilMinutter, minutterTekst, tilTale, antalOrd, delIngrediens } from '../js/tekst.js';
import { lavModel } from '../js/model.js';
import { hentIndex } from '../js/data.js';

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
  // Hårde mellemrum: «2 t 30 min» brydes aldrig over to linjer (før stod «2 t 30» og «min» på hver sin linje på 901×800)
  assert.equal(minutterTekst(105), '1\u00a0t\u00a045\u00a0min');
  assert.equal(minutterTekst(30), '30\u00a0min');
  assert.equal(minutterTekst(60), '1\u00a0t');
  for (const min of [5, 30, 60, 105, 150, 600]) assert.ok(!/ /.test(minutterTekst(min)), minutterTekst(min) + ' har et almindeligt mellemrum');
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
  assert.equal(tilTale('ca. 16 stk.'), 'cirka 16 stykker');
  assert.equal(tilTale('1 kg kartofler'), '1 kilo kartofler');
  // Den bløde bindestreg i et kortnavn læses ikke op
  assert.equal(tilTale('Havregryns­kugler. Tryk igen for at starte.'), 'Havregrynskugler. Tryk igen for at starte.');
});

// Røst-stemmen læser teksten, som den står: brøker, «8-10» og forkortelser skrives ud (som i opskrifterne)
test('brøker, intervaller og forkortelser skrives ud til stemmen', () => {
  assert.equal(tilTale('½ tsk salt'), 'en halv teskefuld salt');
  assert.equal(tilTale('¾ tsk groft salt'), 'trekvart teskefuld groft salt');
  assert.equal(tilTale('¼ tsk salt'), 'en kvart teskefuld salt');
  assert.equal(tilTale('½ dl olivenolie'), 'en halv deciliter olivenolie');
  assert.equal(tilTale('4½ spsk kakao (ca. 25 g)'), '4 og en halv spiseskefulde kakao (cirka 25 gram)');
  assert.equal(tilTale('175 g finvalsede havregryn (ca. 5¾ dl)'), '175 gram finvalsede havregryn (cirka 5 og trekvart deciliter)');
  assert.equal(tilTale('8-10 g salt'), '8 til 10 gram salt');
  assert.equal(tilTale('peber (og evt. salt)'), 'peber (og eventuelt salt)');
  assert.equal(tilTale('2 dl kerner, fx græskarkerner'), '2 deciliter kerner, for eksempel græskarkerner');
  // Kun hele ord: «ca» inde i et ord, «fx» i «fxo» og bindestregen i «hvede-, pizza-» røres ikke
  assert.equal(tilTale('Mexicansk sauce.'), 'Mexicansk sauce.');
  assert.equal(tilTale('fxo'), 'fxo');
  assert.equal(tilTale('500 g mel (hvede-, pizza- eller grahamsmel)'), '500 gram mel (hvede-, pizza- eller grahamsmel)');
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

// hentIndex (js/data.js) med en falsk fetch, der svarer med index.json
async function medIndex(index, fn) {
  const gammel = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(index), { status: 200, headers: { 'content-type': 'application/json' } });
  try { return await fn(); } finally { globalThis.fetch = gammel; }
}

test('hentIndex giver de rigtige retter i forsidens rækkefølge', async () => {
  const index = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8'));
  const ix = await medIndex(index, hentIndex);
  assert.deepEqual(ix.ids, index.grupper.flatMap((g) => g.retter));
  assert.deepEqual(ix.grupper.map((g) => g.id), ['aftensmad', 'bagning', 'soede-sager']);
});

// Validatoren tillader ingen dubletter, men står en ret to gange (også i samme gruppe), vises den kun første gang,
// og en gruppe, der står to gange, springes over anden gang (code review 19-10)
test('hentIndex viser hver ret og hver gruppe kun første gang', async () => {
  const ix = await medIndex({ version: 2, grupper: [
    { id: 'aftensmad', retter: ['frikadeller', 'koedsovs', 'frikadeller'] },
    { id: 'bagning', retter: ['boller', 'koedsovs', 'boller'] },
    { id: 'aftensmad', retter: ['chorizo-pasta'] },
  ] }, hentIndex);
  assert.deepEqual(ix.ids, ['frikadeller', 'koedsovs', 'boller']);
  assert.deepEqual(ix.grupper, [{ id: 'aftensmad', retter: ['frikadeller', 'koedsovs'] }, { id: 'bagning', retter: ['boller'] }]);
});
