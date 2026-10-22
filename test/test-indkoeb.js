// test-indkoeb.js — ugeplanens rene logik (docs/ugeplan-plan.md, afsnit 5): indkøbslisten (js/indkoeb.js).
// Kør:  node test/test-indkoeb.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saml, visMaengde, vareTekst, grupper, tekst, MAKS_M } from '../js/indkoeb.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ret = (id) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
const KS = ret('koedsovs');
const BOL = ret('bolognese-one-pot');
const CHO = ret('chorizo-pasta');
const TUN = ret('tunfrikadeller');

// En lille ret i ugeplanen til grænsetilfældene: «linjer» er [vare, antal, enhed]
const lille = (linjer, portioner = 4) => ({
  tumbi: { ugeplan: true, portioner, ingredienser: linjer.map(([vare, antal, enhed]) => (antal === undefined ? { vare } : { vare, antal, enhed })) },
});
const som = (varer) => Object.fromEntries(varer.map((v) => [v.id, vareTekst(v.id, v.m)]));

test('kødsovsen til 4 giver varerne i butikkens rækkefølge og basisvarerne sidst', () => {
  assert.deepEqual(saml([{ ret: KS, n: 4 }]), [
    { id: 'gulerod', m: 2 }, { id: 'hvidloeg', m: 2 }, { id: 'loeg', m: 1 },
    { id: 'hakkede-tomater', m: 800 }, { id: 'spaghetti', m: 400 }, { id: 'tomatpure', m: 30 },
    { id: 'hakket-oksekoed', m: 500 }, { id: 'revet-ost', m: 100 },
    { id: 'olie', m: 0 }, { id: 'peber', m: 0 }, { id: 'salt', m: 0 }, { id: 'oregano', m: 0 },
  ]);
  assert.equal(tekst(saml([{ ret: KS, n: 4 }])), [
    'Frugt og grønt', 'Gulerødder: 2 stk', 'Hvidløg: 2 fed', 'Løg: 1 stk', '',
    'Dåser og tørvarer', 'Hakkede tomater: 2 dåser (800 g)', 'Spaghetti: 1 pakke (500 g)', 'Tomatpuré: 1 tube (140 g)', '',
    'Køl', 'Hakket oksekød: 1 bakke (500 g)', 'Revet ost: 1 pose (175 g)', '',
    'Tjek, at I har', 'Olie', 'Peber', 'Salt', 'Tørret oregano',
  ].join('\n'));
});

test('ugens retter lægges sammen og skaleres til de valgte portioner, før der rundes op', () => {
  // Bolognesen til 6 (× 1,5) og chorizo-pastaen til 2 (× 0,5)
  const varer = saml([{ ret: KS, n: 4 }, { ret: BOL, n: 6 }, { ret: CHO, n: 2 }]);
  const m = Object.fromEntries(varer.map((v) => [v.id, v.m]));
  assert.equal(m['hakket-oksekoed'], 500 + 540);
  assert.equal(m['loeg'], 1.5);
  assert.equal(m['hvidloeg'], 3.5);
  assert.equal(m['tomatpure'], 37.5);
  assert.equal(m['madlavningsflode'], 125); // 2,5 dl × 0,5 i ml
  assert.deepEqual(Object.fromEntries(Object.entries(som(varer)).filter(([, t]) => t)), {
    'gulerod': '2 stk', 'hvidloeg': '4 fed', 'loeg': '2 stk',
    'bouillonterninger': '1 pakke (8 stk)', 'fuldkornspasta': '1 pakke (500 g)', 'hakkede-tomater': '2 dåser (800 g)',
    'passata': '2 flasker (1 kg)', 'spaghetti': '2 pakker (1 kg)', 'tomatpure': '1 tube (140 g)',
    'chorizo': '1 pakke (250 g)', 'flodeost': '2 bægre (400 g)', 'hakket-oksekoed': '3 bakker (1,5 kg)',
    'madlavningsflode': '1 bæger (2,5 dl)', 'parmesan': '2 poser (200 g)', 'revet-ost': '1 pose (175 g)',
  });
  // Basisvarerne står én gang uden mængde; vandet står der ikke
  assert.deepEqual(varer.filter((v) => v.m === 0).map((v) => v.id), ['hvidloegspulver', 'olie', 'peber', 'salt', 'oregano']);
  assert.equal(varer.some((v) => v.id === 'vand'), false);
  // Samme ret to dage i træk lægges også sammen, og to halve dåser er én dåse
  const to = saml([{ ret: lille([['hakkede-tomater', 200, 'g']]), n: 4 }, { ret: lille([['hakkede-tomater', 200, 'g']]), n: 4 }]);
  assert.deepEqual(to, [{ id: 'hakkede-tomater', m: 400 }]);
  assert.equal(vareTekst('hakkede-tomater', 400), '1 dåse (400 g)');
});

test('tunfrikadellerne: persille i bundter, æg i bakker, og Æ står sidst i Køl', () => {
  const varer = saml([{ ret: TUN, n: 8 }]);
  const koel = grupper(varer).find((g) => g.afd === 'koel');
  assert.deepEqual(koel.varer.map((v) => v.navn), ['Græsk yoghurt', 'Smør', 'Æg']);
  assert.deepEqual(som(varer), {
    'hvidloeg': '4 fed', 'loeg': '2 stk', 'persille': '2 bundter',
    'havregryn': '1 pose (1 kg)', 'tun': '4 dåser (740 g)',
    'graesk-yoghurt': '1 bæger (500 g)', 'smoer': '1 pakke (250 g)', 'aeg': '1 bakke (10 stk)',
    'olie': '', 'peber': '', 'salt': '',
  });
  assert.equal(vareTekst('persille', 1), '1 bundt');
  assert.deepEqual(koel.varer[2], { id: 'aeg', navn: 'Æg', ikon: 'aeg', maengde: '1 bakke (10 stk)' });
});

test('afrunding: stk og fed til hele, gram til 10 g og fra 1 kg til 100 g, ml til ½ dl og fra 1 l til 1 dl', () => {
  const tabel = [
    [1, 'stk', '1 stk'], [1.01, 'stk', '2 stk'], [3.5, 'fed', '4 fed'],
    [1, 'g', '10 g'], [120, 'g', '120 g'], [121, 'g', '130 g'], [990, 'g', '990 g'], [991, 'g', '1 kg'],
    [1000, 'g', '1 kg'], [1001, 'g', '1,1 kg'], [1200, 'g', '1,2 kg'], [12345, 'g', '12,4 kg'],
    [1, 'ml', '½ dl'], [50, 'ml', '½ dl'], [51, 'ml', '1 dl'], [120, 'ml', '1,5 dl'], [950, 'ml', '9,5 dl'],
    [951, 'ml', '1 l'], [1001, 'ml', '1,1 l'], [1250, 'ml', '1,3 l'],
    // Kommatal fra regningen giver ikke et trin mere: 1,1 × 100 = 110,00000000000001
    [1.1 * 100, 'g', '110 g'], [(1.1 * 100 * 5) / 11, 'ml', '½ dl'], [1.1 * 100 * 10, 'ml', '1,1 l'], [(0.1 + 0.2) * 10, 'stk', '3 stk'],
    // Ingen mængde og ugyldige tal giver tom tekst; en ukendt enhed også
    [0, 'g', ''], [-5, 'g', ''], [NaN, 'g', ''], [Infinity, 'g', ''], ['400', 'g', ''], [5, 'dåse', ''],
  ];
  for (const [m, enhed, forventet] of tabel) assert.equal(visMaengde(m, enhed), forventet, m + ' ' + enhed);
});

test('pakker: altid hele pakker, og parentesen er pakkernes indhold', () => {
  const tabel = [
    [400, [400, 'dåse', 'dåser'], 'g', '1 dåse (400 g)'], [401, [400, 'dåse', 'dåser'], 'g', '2 dåser (800 g)'],
    [1100, [400, 'dåse', 'dåser'], 'g', '3 dåser (1,2 kg)'], [1110, [185, 'dåse', 'dåser'], 'g', '6 dåser (1,11 kg)'],
    [500, [250, 'bæger', 'bægre'], 'ml', '2 bægre (5 dl)'], [1250, [250, 'bæger', 'bægre'], 'ml', '5 bægre (1,25 l)'],
    [50, [50, 'flaske', 'flasker'], 'ml', '1 flaske (½ dl)'], [2, [1, 'bundt', 'bundter'], 'stk', '2 bundter'],
    [3 * (400 / 3), [400, 'dåse', 'dåser'], 'g', '1 dåse (400 g)'],
  ];
  for (const [m, pakke, enhed, forventet] of tabel) assert.equal(visMaengde(m, enhed, pakke), forventet, m + ' ' + pakke[1]);
});

test('linjer, der ikke kan lægges sammen, og retter uden for ugeplanen springes over', () => {
  const tomat = ['hakkede-tomater', 400, 'g'];
  // Arvede navne er ikke varer eller enheder (Object.hasOwn)
  for (const vare of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 7, null]) {
    assert.deepEqual(saml([{ ret: lille([[vare, 1, 'stk'], tomat]), n: 4 }]), [{ id: 'hakkede-tomater', m: 400 }], String(vare));
  }
  for (const enhed of ['constructor', 'toString', 'dåse', 'G', undefined]) {
    assert.deepEqual(saml([{ ret: lille([['spaghetti', 1, enhed], tomat]), n: 4 }]), [{ id: 'hakkede-tomater', m: 400 }], String(enhed));
  }
  // Forkert dimension (spsk er rumfang, tomatpuré er gram), og antal, der ikke er et tal over 0
  assert.deepEqual(saml([{ ret: lille([['tomatpure', 2, 'spsk'], tomat]), n: 4 }]), [{ id: 'hakkede-tomater', m: 400 }]);
  for (const antal of [0, -1, '400', NaN, Infinity, null]) {
    assert.deepEqual(saml([{ ret: lille([['spaghetti', antal, 'g'], tomat]), n: 4 }]), [{ id: 'hakkede-tomater', m: 400 }], String(antal));
  }
  // Portioner skal være et heltal 1-12, både de valgte og opskriftens; retten skal være i ugeplanen
  for (const n of [0, 13, 1.5, '4', undefined]) assert.deepEqual(saml([{ ret: lille([tomat]), n }]), [], String(n));
  for (const p of [0, 13, 2.5, '4']) assert.deepEqual(saml([{ ret: lille([tomat], p), n: 4 }]), [], String(p));
  const udenfor = lille([tomat]);
  delete udenfor.tumbi.ugeplan;
  assert.deepEqual(saml([{ ret: udenfor, n: 4 }, null, {}, { ret: {} }, { ret: { tumbi: { ugeplan: true, portioner: 4 } }, n: 4 }]), []);
  // Enheder med samme dimension lægges sammen: kg og g, dl og spsk
  assert.deepEqual(saml([{ ret: lille([['spaghetti', 0.5, 'kg'], ['spaghetti', 100, 'g']]), n: 4 }]), [{ id: 'spaghetti', m: 600 }]);
  assert.deepEqual(saml([{ ret: lille([['madlavningsflode', 1, 'dl'], ['madlavningsflode', 2, 'spsk']]), n: 4 }]), [{ id: 'madlavningsflode', m: 130 }]);
  assert.throws(() => saml('koedsovs'), TypeError);
  assert.throws(() => saml(null), TypeError);
});

test('en vare kan højst have 100.000 i sin enhed, og listen viser kun kendte varer', () => {
  const meget = lille(Array.from({ length: 12 }, () => ['spaghetti', 10, 'kg']), 1);
  assert.deepEqual(saml([{ ret: meget, n: 12 }]), [{ id: 'spaghetti', m: MAKS_M }]);
  assert.deepEqual(grupper([{ id: 'constructor', m: 1 }, { id: 'vand', m: 0 }, { id: 'salt', m: 0 }, { id: 'loeg', m: 2 }]), [
    { afd: 'groent', navn: 'Frugt og grønt', varer: [{ id: 'loeg', navn: 'Løg', ikon: 'loeg', maengde: '2 stk' }] },
    { afd: 'basis', navn: 'Tjek, at I har', varer: [{ id: 'salt', navn: 'Salt', ikon: 'salt', maengde: '' }] },
  ]);
  assert.equal(vareTekst('toString', 5), '');
  assert.equal(tekst([]), '');
});
