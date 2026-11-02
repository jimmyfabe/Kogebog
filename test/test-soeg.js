// test-soeg.js — søgningen i voksendelens lister (js/soeg.js): normaliseringen og soeg(retter, tekst), hvor hvert ord skal
// findes i navnet, en ingrediens, gruppen eller et mærke. Til sidst de rigtige opskrifter: «jul» finder præcis juleretterne.
// Kør:  node test/test-soeg.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliser, soegeord, soegeTekst, soeg } from '../js/soeg.js';
import { lavModel } from '../js/model.js';
import { GRUPPER } from '../js/katalog.js';
import { MAERKER, maerkerFor } from '../js/maerker.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ret = (id, navn, ingredienser, gruppe, maerker = []) => ({ id, navn, ingredienser: ingredienser.map((n) => ({ navn: n })), gruppe, maerker });
const RETTER = [
  ret('taerte', 'Kyllinge\u00adtærte med butterdej', ['kyllingebryst', 'butterdej', 'løg'], 'Aftensmad', ['Hurtig']),
  ret('gloegg', 'Børnegløgg', ['æblemost', 'rosiner'], 'Jul', ['Ingen kniv']),
  ret('frikadeller', 'Frikadeller med kartofler', ['hakket svinekød', 'æg', 'kartofler'], 'Aftensmad'),
  ret('is', 'Flødeis med bær', ['piskefløde', 'frosne bær'], 'Søde sager', ['Vegetar', 'Favorit']),
  ret('ris', 'Risalamande', ['grødris', 'mandler', 'piskefløde'], 'Jul', ['Vegetar']),
];
const ids = (tekst) => soeg(RETTER, tekst).map((r) => r.id);

test('normaliser: små bogstaver, NFC, uden blød bindestreg og ét mellemrum mellem ordene', () => {
  assert.equal(normaliser('  KYLLINGE\u00adTÆRTE  '), 'kyllingetærte');
  assert.equal(normaliser('Æ Ø Å'), 'æ ø å');
  assert.equal(normaliser('a\u030ae'), 'åe', 'å skrevet som a + ring (NFD) bliver ét tegn');
  assert.equal(normaliser('A\u030a'), 'å', 'også det store Å skrevet som A + ring');
  assert.equal(normaliser('rød\t\n  kål\u00a0og  ris'), 'rød kål og ris', 'tabulator, linjeskift og hårdt mellemrum er mellemrum');
  assert.equal(normaliser(''), '');
  assert.equal(normaliser(null), '');
  assert.equal(normaliser(undefined), '');
});

test('søgeordene: mellemrum og komma skiller, og en tom søgning har ingen ord', () => {
  assert.deepEqual(soegeord('Kylling,  RIS '), ['kylling', 'ris']);
  assert.deepEqual(soegeord(' , '), []);
  assert.deepEqual(soegeord(''), []);
  assert.deepEqual(soegeord('   '), []);
});

test('tom søgning: alle retter i deres rækkefølge, som en ny liste', () => {
  for (const tom of ['', '   ', '\u00ad', null, undefined]) {
    const r = soeg(RETTER, tom);
    assert.deepEqual(r.map((x) => x.id), RETTER.map((x) => x.id), JSON.stringify(tom));
    assert.notEqual(r, RETTER, 'en ny liste, så den, der kalder, ikke ændrer retterne');
  }
});

test('ét ord findes i navnet, en ingrediens, gruppen eller et mærke, også inde i et ord', () => {
  assert.deepEqual(ids('frikadeller'), ['frikadeller'], 'navnet');
  assert.deepEqual(ids('rosiner'), ['gloegg'], 'en ingrediens');
  assert.deepEqual(ids('jul'), ['gloegg', 'ris'], 'gruppens navn');
  assert.deepEqual(ids('vegetar'), ['is', 'ris'], 'et mærkes navn');
  assert.deepEqual(ids('søde'), ['is'], 'gruppen «Søde sager»');
  assert.deepEqual(ids('is'), ['is', 'ris'], '«is» står også inde i «ris» (bevidst: ordet må stå inde i et andet ord)');
});

test('flere ord: hvert ord skal findes (OG), i hvert sit felt eller samme', () => {
  assert.deepEqual(ids('jul vegetar'), ['ris']);
  assert.deepEqual(ids('kylling butterdej'), ['taerte']);
  assert.deepEqual(ids('piskefløde bær'), ['is']);
  assert.deepEqual(ids('jul kylling'), [], 'et ord, der ikke findes, giver ingen træf');
  assert.deepEqual(ids('kartofler kartofler'), ['frikadeller'], 'samme ord to gange');
});

test('store bogstaver, æ/ø/å og blød bindestreg', () => {
  assert.deepEqual(ids('KYLLING'), ['taerte']);
  assert.deepEqual(ids('Kyllingetærte'), ['taerte'], 'navnet har en blød bindestreg: «Kyllinge|tærte»');
  assert.deepEqual(ids('kyllinge\u00adtærte'), ['taerte'], 'også med blød bindestreg i søgningen');
  assert.deepEqual(ids('BØRNEGLØGG'), ['gloegg']);
  assert.deepEqual(ids('æblemost'), ['gloegg']);
  assert.deepEqual(soeg([ret('x', 'Rødkål', [], null)], 'rødka\u030al').map((r) => r.id), ['x'], 'å skrevet som a + ring finder å');
});

test('ingen træf', () => {
  assert.deepEqual(ids('xyzæøå'), []);
  assert.deepEqual(ids('pizza'), []);
  assert.deepEqual(soeg([], 'kylling'), []);
  assert.deepEqual(soeg([], ''), []);
});

test('et ord kan ikke findes hen over to felter', () => {
  // «løg» er sidste ingrediens og «Aftensmad» gruppen: «løgaften» må ikke findes
  assert.deepEqual(ids('løgaften'), []);
  assert.deepEqual(ids('dejkyllingebryst'), []);
});

test('soegeTekst tåler manglende og forkerte felter', () => {
  assert.equal(soegeTekst({}), '');
  assert.equal(soegeTekst(null), '');
  assert.equal(soegeTekst({ navn: 'Suppe', ingredienser: [null, { navn: 'Gulerod' }, {}], gruppe: null, maerker: 'Hurtig' }), 'suppe\ngulerod');
});

test('de rigtige opskrifter: «jul» finder præcis juleretterne, og «Kylling» og «kylling» finder det samme', () => {
  const ix = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8'));
  const familie = { favoritter: [], lavet: {} };
  const poster = ix.grupper.flatMap((g) => g.retter.map((id) => {
    const m = lavModel(JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8')));
    return { id, navn: m.navn, ingredienser: m.ingredienser, gruppe: GRUPPER[g.id], maerker: maerkerFor(m, { familie }).map((k) => MAERKER[k].navn) };
  }));
  const jul = ix.grupper.find((g) => g.id === 'jul').retter;
  assert.ok(jul.length > 0);
  assert.deepEqual(soeg(poster, 'jul').map((p) => p.id), jul, 'en ret uden for jul, der nævner «jul», skal ses her');
  const kylling = soeg(poster, 'kylling').map((p) => p.id);
  assert.ok(kylling.length > 0);
  assert.deepEqual(soeg(poster, 'Kylling').map((p) => p.id), kylling);
  assert.deepEqual(soeg(poster, 'jul kylling'), []);
});
