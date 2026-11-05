// test-soeg.js — søgningen i voksendelens lister og bag lupen på forsiden (js/soeg.js): normaliseringen og soeg(retter,
// tekst), hvor hvert ord skal findes i navnet, en ingrediens, gruppen, gruppens ekstra søgeord eller et mærke. Ord på 1-2
// bogstaver matcher kun ordets begyndelse, ord på 3 også slutningen, med to undtagelser for «is» og «ris». Til sidst de
// rigtige opskrifter: «jul» finder præcis juleretterne.
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

test('ét ord findes i navnet, en ingrediens, gruppen eller et mærke; et langt ord også inde i et ord', () => {
  assert.deepEqual(ids('frikadeller'), ['frikadeller'], 'navnet');
  assert.deepEqual(ids('rosiner'), ['gloegg'], 'en ingrediens');
  assert.deepEqual(ids('jul'), ['gloegg', 'ris'], 'gruppens navn');
  assert.deepEqual(ids('vegetar'), ['is', 'ris'], 'et mærkes navn');
  assert.deepEqual(ids('søde'), ['is'], 'gruppen «Søde sager»');
  assert.deepEqual(ids('mande'), ['ris'], 'fire bogstaver eller flere må stå inde i et ord');
});

// «is» gav 62 træf på de rigtige retter, fordi det står inde i «ris» og «fisk»
test('et ord på 1-2 bogstaver matcher kun ordets begyndelse', () => {
  const liste = [ret('m', 'Æg og is', [], null), ret('n', 'Pandekager', ['æg-hvide'], null), ret('o', 'Spejlæg', [], null), ret('p', 'Fisk', [], null)];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('æg'), ['m', 'n'], 'bindestregen skiller ordene ad, og «Spejlæg» slutter kun på «æg»');
  assert.deepEqual(fundet('is'), ['m'], '«Fisk» har «is» inde i ordet');
  assert.deepEqual(soeg([ret('k', 'Bær', ['a', 'is'], null)], 'IS').map((r) => r.id), ['k'], 'også en ingrediens, uanset store bogstaver');
});

test('et ord på 3 bogstaver står først eller sidst i et ord, ikke inde i det', () => {
  const liste = [
    ret('a', 'Kartoffelmos', [], null), ret('b', 'Mosaikkage', [], null), ret('c', 'Kartoffelmosen', [], null),
    ret('d', 'Blomkål', [], null), ret('e', 'Blomkålssuppe', [], null), ret('f', 'Boller', ['hvedemel'], null),
  ];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('mos'), ['a', 'b']);
  assert.deepEqual(fundet('kål'), ['d']);
  assert.deepEqual(fundet('mel'), ['f']);
  assert.deepEqual(ids('flø'), ['is'], 'begyndelsen af «Flødeis»');
  assert.deepEqual(ids('æbl'), ['gloegg'], 'æ er et bogstav');
});

test('undtagelserne: «is» finder også ord på «eis», og «ris» tæller ikke ordene «gris» og «pris»', () => {
  const liste = [
    ret('vanilje', 'Banansplit', ['vaniljeis'], null), ret('floede', 'Flødeis', [], null), ret('bombe', 'Isbombe', [], null),
    ret('flormel', 'Glasur', ['flormelis'], null), ret('fisk', 'Fisk', [], null), ret('ris', 'Ris', [], null), ret('groed', 'Grød', ['grødris'], null),
    ret('gris', 'Hakket gris', [], null), ret('hoisin', 'Hoisin-gris', [], null), ret('pris', 'God pris', [], null),
  ];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('is'), ['vanilje', 'floede', 'bombe'], 'ikke flormelis, fisk, ris eller gris');
  assert.deepEqual(fundet('ris'), ['ris', 'groed'], 'ikke gris og pris');
  assert.deepEqual(ids('is'), ['is'], '«Flødeis» slutter på «eis», og «grødris» gør ikke');
  assert.deepEqual(ids('ris'), ['ris'], '«Risalamande» og «grødris» er samme ret');
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
  // Begge ord skal passe: det er de juleretter, der også har kylling (tarteletterne, fra v7).
  assert.deepEqual(soeg(poster, 'jul kylling').map((p) => p.id), jul.filter((id) => kylling.includes(id)));
  assert.ok(soeg(poster, 'jul kylling').length < kylling.length);
});
