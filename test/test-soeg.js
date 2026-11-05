// test-soeg.js — søgningen i voksendelens lister og bag lupen på forsiden (js/soeg.js): normaliseringen og soeg(retter,
// tekst), hvor hvert ord skal findes i navnet, en ingrediens, gruppen, gruppens ekstra søgeord eller et mærke. Ord på højst
// 3 bogstaver matcher kun ordets begyndelse, og kun madordene i SLUTORD også slutningen og foran et s, med undtagelser for seks korte ord.
// Til sidst de rigtige opskrifter: «jul» finder præcis juleretterne, og «and» finder ikke vand.
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

test('accenter tæller ikke: «tomatpure» finder «tomatpuré», men å og a er stadig to bogstaver', () => {
  const liste = [ret('p', 'Pasta', ['tomatpuré'], null), ret('g', 'Kage', ['ribsgelé'], null), ret('r', 'Rösti', [], null), ret('c', 'Dip', ['crème fraîche'], null), ret('a', 'Blåbær', [], null), ret('b', 'Blabla', [], null)];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('tomatpure'), ['p']);
  assert.deepEqual(fundet('tomatpuré'), ['p'], 'også med accenten skrevet');
  assert.deepEqual(fundet('tomatpur' + String.fromCharCode(0x65, 0x301)), ['p'], 'også e + accent (NFD)');
  assert.deepEqual(fundet('ribsgele'), ['g']);
  assert.deepEqual(fundet('rosti'), ['r']);
  assert.deepEqual(fundet('creme fraiche'), ['c']);
  assert.deepEqual(fundet('blå'), ['a'], 'å er ikke a med en accent');
  assert.deepEqual(fundet('blab'), ['b'], 'og a finder ikke å');
  assert.equal(normaliser('tomatpuré ÆØÅ'), 'tomatpure æøå');
});

test('søgeordene: mellemrum og komma skiller, og en tom søgning har ingen ord', () => {
  assert.deepEqual(soegeord('Kylling,  RIS '), ['kylling', 'ris']);
  assert.deepEqual(soegeord(' , '), []);
  assert.deepEqual(soegeord(''), []);
  assert.deepEqual(soegeord('   '), []);
});

// To mellemrum på iPhone skriver et punktum: «kylling. » må ikke give «ingen retter»
test('søgeordene: punktum, semikolon og kolon skiller også', () => {
  assert.deepEqual(soegeord('kylling.'), ['kylling']);
  assert.deepEqual(soegeord('kylling. ris'), ['kylling', 'ris']);
  assert.deepEqual(soegeord('kylling;ris:fisk'), ['kylling', 'ris', 'fisk']);
  assert.deepEqual(soegeord(' . '), []);
  assert.deepEqual(ids('kylling.'), ['taerte']);
  assert.deepEqual(ids('kylling. butterdej'), ['taerte']);
  assert.deepEqual(ids('.'), RETTER.map((r) => r.id), 'kun et punktum er en tom søgning');
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

test('et madord på 3 bogstaver (SLUTORD) står først eller sidst i et ord, ikke inde i det', () => {
  const liste = [
    ret('a', 'Kartoffelmos', [], null), ret('b', 'Mosaikkage', [], null), ret('c', 'Kartoffelmosen', [], null),
    ret('d', 'Blomkål', [], null), ret('e', 'Blomkålssuppe', [], null), ret('f', 'Boller', ['hvedemel'], null),
  ];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('mos'), ['a', 'b']);
  assert.deepEqual(fundet('kål'), ['d', 'e'], '«Blomkålssuppe» har «kål» foran et s');
  assert.deepEqual(fundet('mel'), ['f']);
  assert.deepEqual(ids('flø'), ['is'], 'begyndelsen af «Flødeis»');
  assert.deepEqual(ids('æbl'), ['gloegg'], 'æ er et bogstav');
});

test('et madord findes også foran et s midt i et ord, men et andet kort ord gør ikke', () => {
  for (const [o, d] of [['bær', 'kirsebærsauce'], ['bær', 'hindbærsyltetøj'], ['bær', 'solbærsaft'], ['løg', 'hvidløgspulver'], ['kål', 'blomkålssuppe'], ['kød', 'oksekødsovs']]) {
    assert.equal(soeg([ret('x', 'Noget', [d], null)], o).length, 1, o + ' i ' + d);
  }
  for (const [o, d] of [['and', 'vandskål'], ['rød', 'brødskive'], ['alt', 'saltsten'], ['ing', 'kyllingsbryst']]) {
    assert.equal(soeg([ret('x', 'Noget', [d], null)], o).length, 0, o + ' i ' + d);
  }
});

test('alle madord i SLUTORD findes sidst i et ord', () => {
  for (const [o, d] of [['kål', 'blomkål'], ['bær', 'blåbær'], ['mos', 'kartoffelmos'], ['mel', 'hvedemel'], ['ost', 'hytteost'], ['ris', 'jasminris'], ['kød', 'oksekød'], ['løg', 'hvidløg'], ['dej', 'butterdej'], ['dip', 'skyrdip'], ['fad', 'tomatfad']]) {
    assert.equal(soeg([ret('x', 'Noget', [d], null)], o).length, 1, o + ' i ' + d);
    assert.equal(soeg([ret('x', 'Noget', [d + 'e'], null)], o).length, 0, o + ' inde i ' + d + 'e');
  }
  assert.equal(soeg([ret('x', 'Blomkål', [], null)], 'k' + String.fromCharCode(0x61, 0x30A) + 'l').length, 1, 'også «kål» skrevet som a + ring');
});

test('et andet ord på 3 bogstaver står kun først i et ord: «and» finder ikke vand, og «rød» ikke brød', () => {
  for (const [o, d] of [['and', 'vand'], ['and', 'danskvand'], ['rød', 'brød'], ['rød', 'sprød'], ['rød', 'risengrød'], ['alt', 'salt'], ['mad', 'aftensmad'], ['ing', 'kylling'], ['ing', 'honning']]) {
    assert.equal(soeg([ret('x', 'Noget', [d], null)], o).length, 0, o + ' i ' + d);
  }
  for (const [o, d] of [['and', 'andesteg'], ['rød', 'rødkål'], ['rød', 'røde'], ['alt', 'altid'], ['mad', 'madpakke'], ['ing', 'ingefær']]) {
    assert.equal(soeg([ret('x', 'Noget', [d], null)], o).length, 1, o + ' først i ' + d);
  }
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

test('undtagelserne: «mel», «kål» og «ost» tæller ikke krymmel, skål og frost', () => {
  const liste = [
    ret('krymmel', 'Muffins', ['krymmel'], null), ret('jul', 'Småkager', ['julekrymmel'], null), ret('boller', 'Boller', ['hvedemel'], null),
    ret('skaal', 'Sushi-skål', [], null), ret('risskaal', 'Koreansk risskål', [], null), ret('blomkaal', 'Blomkål', [], null),
    ret('frost', 'Bær på frost', [], null), ret('most', 'Punch', ['æblemost'], null), ret('hytteost', 'Toast', ['hytteost'], null),
    ret('hassel', 'Hasselbagte', ['1 kg kartofler (ca. 10 mellemstore)'], null), ret('kmos', 'Kartoffelmos', ['1,2 kg melede kartofler'], null),
  ];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('mel'), ['boller']);
  assert.deepEqual(fundet('kål'), ['blomkaal']);
  assert.deepEqual(fundet('ost'), ['hytteost']);
  assert.deepEqual(fundet('krymmel'), ['krymmel', 'jul'], 'ordet selv findes stadig');
});

// «Ingen retter passer til «nød»» må en voksen, der tjekker for nødder, ikke få, når 8 af 151 retter har nødder
test('undtagelsen: «nød» må stå hvor som helst i et ord', () => {
  const liste = [
    ret('muskat', 'Kartoffelmos', ['muskatnød'], null), ret('val', 'Småkager', ['valnødder'], null), ret('peber', 'Pebernødder', [], null),
    ret('hassel', 'Kage', ['hasselnødder'], null), ret('nodde', 'Nøddekage', [], null), ret('boller', 'Boller', ['hvedemel'], null),
  ];
  const fundet = (t) => soeg(liste, t).map((r) => r.id);
  assert.deepEqual(fundet('nød'), ['muskat', 'val', 'peber', 'hassel', 'nodde']);
  assert.deepEqual(fundet('NØD'), fundet('nød'));
  assert.deepEqual(fundet('nødder'), ['val', 'peber', 'hassel']);
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
  // Vand, brød, salt og kylling står i mange af de rigtige retter: de ord giver ikke længere træf
  const ord = (p) => soegeTekst(p).split(/[^\p{L}\p{N}]+/u);
  for (const o of ['and', 'rød', 'alt', 'ing']) {
    const traef = soeg(poster, o);
    assert.ok(traef.length > 0, o);
    for (const p of traef) assert.ok(ord(p).some((d) => d.startsWith(o)), o + ' i ' + p.id);
  }
  assert.ok(soeg(poster, 'rød').some((p) => ord(p).includes('rødkål')), '«rød» finder stadig rødkål');
});
