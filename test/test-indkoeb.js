// test-indkoeb.js — ugeplanens rene logik (docs/ugeplan-plan.md, afsnit 5): indkøbslisten (js/indkoeb.js) og koden i
// linket (js/plankode.js) med en tabel over fjendtlige koder.
// Kør:  node test/test-indkoeb.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saml, visMaengde, vareTekst, grupper, tekst, manglerTekst, holdSammen, MAKS_M } from '../js/indkoeb.js';
import { kod, afkod, fnv1a, kontrolsum, ukendtTekst, kodeFraTekst, BESKED_NYERE, BESKED_UGYLDIG, BESKED_GAMMEL } from '../js/plankode.js';
import * as lager from '../js/lager.js';
import { VARER } from '../js/katalog.js';

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

test('de billige retter fra 22-10 lægges sammen: to halve dåser majs, mælk i dl og kyllingelår i kg', () => {
  // Wok og nudelsuppe har hver ½ dåse majs, æggekagen 2 dl og makaronien 6 dl mælk, bradepandekyllingen 1 kg lår til 4
  const varer = saml([
    { ret: ret('wok-med-nudler'), n: 4 }, { ret: ret('kyllinge-nudelsuppe'), n: 4 },
    { ret: ret('ovnaeggekage'), n: 4 }, { ret: ret('one-pot-makaroni'), n: 4 },
    { ret: ret('bradepandekylling'), n: 6 },
  ]);
  const m = Object.fromEntries(varer.map((v) => [v.id, v.m]));
  assert.equal(m['majs'], 1);
  assert.equal(m['nudler'], 250 + 200);
  assert.equal(m['maelk'], 200 + 600); // i ml
  assert.equal(m['kyllingelaar'], 1500); // 1 kg × 6/4 i g
  assert.equal(m['salt'], 0);
  const t = som(varer);
  assert.equal(t['majs'], '1 dåse');
  assert.equal(t['nudler'], '450 g');
  assert.equal(t['maelk'], '1 karton (1 l)');
  assert.equal(t['kyllingelaar'], '1,5 kg');
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

// På skærmen og i printet: tal og enhed brydes ikke over to linjer («1 pakke (500 | g)» på 360 px, UI-review V2, 23-10).
// Mængden selv og teksten, der deles, har almindelige mellemrum
test('mængden, som den vises, holder tal og enhed sammen med et hårdt mellemrum', () => {
  const H = '\u00a0';
  assert.equal(holdSammen('1 pakke (500 g)'), '1' + H + 'pakke (500' + H + 'g)');
  assert.equal(holdSammen('2 flasker (1 kg)'), '2' + H + 'flasker (1' + H + 'kg)');
  assert.equal(holdSammen('1 bæger (2,5 dl)'), '1' + H + 'bæger (2,5' + H + 'dl)');
  assert.equal(holdSammen('½ dl'), '½' + H + 'dl');
  assert.equal(holdSammen('4 fed'), '4' + H + 'fed');
  assert.equal(holdSammen(''), '');
  assert.equal(vareTekst('spaghetti', 500), '1 pakke (500 g)');
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

// En blød bindestreg i et varenavn (Grøntsags|blanding, UI-review 27-10) er kun til skærmen: «Del som tekst» sender
// navnet uden den, så den ikke står som et usynligt tegn i Noter eller Beskeder
test('tekstudgaven har ingen bløde bindestreger', () => {
  const ids = Object.keys(VARER);
  assert.ok(ids.some((id) => VARER[id].navn.includes('\u00ad')), 'forventede mindst ét varenavn med en blød bindestreg');
  const t = tekst(ids.map((id) => ({ id, m: 1 })));
  assert.ok(t.includes('Grøntsagsblanding') && !t.includes('\u00ad'), 'tekst() skal fjerne U+00AD');
});

// «Del som tekst» og printet siger, hvor mange dage der mangler på listen, og hvorfor (code review U5 og U6, 23-10)
test('dagene, der mangler på listen: én sætning pr. grund, i ental og flertal', () => {
  assert.equal(manglerTekst(0, 0), '');
  assert.equal(manglerTekst(1, 0), 'Én dag mangler på listen, fordi opskriften ikke kunne hentes.');
  assert.equal(manglerTekst(2, 0), '2 dage mangler på listen, fordi opskrifterne ikke kunne hentes.');
  assert.equal(manglerTekst(0, 1), 'Én dag mangler på listen, fordi retten ikke længere er i ugeplanen.');
  assert.equal(manglerTekst(1, 3), 'Én dag mangler på listen, fordi opskriften ikke kunne hentes. '
    + '3 dage mangler på listen, fordi retterne ikke længere er i ugeplanen.');
});

// ---------- Koden i linket (js/plankode.js) ----------

// Retterne i ugeplanen, som appen finder dem: i index.json og med «tumbi.ugeplan»: true
const INDEX = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', 'index.json'), 'utf8'));
const UGEPLAN = INDEX.grupper.flatMap((g) => g.retter).filter((id) => ret(id).tumbi.ugeplan === true);
const IDAG = new Date(2026, 9, 22); // torsdag 22-10-2026; mandagen er 26-10
const af = (kode, retter = UGEPLAN) => afkod(kode, { retter, idag: IDAG });
const medSum = (krop) => krop + '.' + kontrolsum(krop);
const UGYLDIG = { ok: false, fejl: 'ugyldig', besked: BESKED_UGYLDIG };
const NYERE = { ok: false, fejl: 'nyere', besked: BESKED_NYERE };
const GAMMEL = { ok: false, fejl: 'gammel', besked: BESKED_GAMMEL };
const PLAN = [{ ret: 'koedsovs', n: 4 }, null, { ret: 'bolognese-one-pot', n: 6 }, null, null, { ret: 'tunfrikadeller', n: 12 }, null];

test('FNV-1a giver de kendte værdier, og kontrolsummen er 4 hex', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(fnv1a('foobar'), 0xbf9cf968);
  assert.equal(kontrolsum(''), (0x811c ^ 0x9dc5).toString(16));
  assert.match(kontrolsum('v1.20261026.koedsovs_4~~~~~~'), /^[0-9a-f]{4}$/);
});

test('ugeplanen er aftensretterne med ugeplan-felter (de fem første og de billige fra 22-10), og pandekager er ikke med', () => {
  assert.deepEqual(UGEPLAN.slice().sort(), [
    'bolognese-one-pot', 'bradepande-fajitas', 'bradepandekylling', 'chili-con-carne', 'chorizo-pasta',
    'cremet-koedsovs', 'fiskefars-i-fad', 'fiskepinde-med-baade', 'gryderis-med-kylling', 'halv-halv-koedsovs',
    'hyrdetaerte', 'koedboller-i-tomatsovs', 'koedsovs', 'kyllinge-nudelsuppe', 'kyllingefrikadeller',
    'kyllingekarry', 'linse-dhal', 'linsebolognese', 'lun-tunpasta', 'medister-i-ovn', 'minestrone',
    'one-pot-makaroni', 'one-pot-tomatpasta', 'ovnaeggekage', 'ovnbagt-blomkaal', 'ovnpandekage', 'pastagratin',
    'pladepizza', 'poelse-boennegryde', 'rugbroedsaften', 'taco-bradepande', 'tomatsuppe-med-boenner',
    'tunfrikadeller', 'wok-med-nudler', 'wraps-med-boenner',
  ]);
  assert.ok(!UGEPLAN.includes('pandekager'));
});

test('en plan kodes og afkodes tilbage til det samme', () => {
  const kode = kod('2026-10-26', PLAN);
  assert.equal(kode, medSum('v1.20261026.koedsovs_4~~bolognese-one-pot_6~~~tunfrikadeller_12~'));
  assert.deepEqual(af(kode), { ok: true, uge: '2026-10-26', dage: PLAN, ukendte: 0, kode });
  // En uge med kun fri aftener er også en plan
  const tom = kod('2026-10-26', Array(7).fill(null));
  assert.equal(tom, medSum('v1.20261026.~~~~~~'));
  assert.deepEqual(af(tom), { ok: true, uge: '2026-10-26', dage: Array(7).fill(null), ukendte: 0, kode: tom });
  // 8 uger før og efter i dag er grænsen (52 og 53 dage er med; 59 og 60 er ikke)
  for (const uge of ['2026-08-31', '2026-12-14']) assert.equal(af(kod(uge, PLAN)).ok, true, uge);
  // Mere end 8 uger tilbage er en gammel plan, ikke et afskåret link (code review U4, 23-10); mere end 8 uger frem kan
  // appen ikke lave med et rigtigt ur
  assert.deepEqual(af(kod('2026-08-24', PLAN)), GAMMEL, '2026-08-24');
  assert.equal(BESKED_GAMMEL, 'Linket er for gammelt.');
  assert.deepEqual(af(kod('2026-12-21', PLAN)), UGYLDIG, '2026-12-21');
  // Et gammelt link, der er skåret over, kan stadig ikke læses (datoen tjekkes først efter formen og kontrolsummen)
  assert.deepEqual(af(kod('2026-08-24', PLAN).slice(0, -10)), UGYLDIG, 'gammelt og afskåret');
});

test('kod nægter forkerte planer', () => {
  for (const uge of ['2026-10-27', '2026-02-30', '26-10-2026', '20261026', 20261026, null]) assert.throws(() => kod(uge, PLAN), RangeError, String(uge));
  const med = (i, d) => PLAN.map((x, j) => (j === i ? d : x));
  for (const d of [{ ret: 'koedsovs', n: 0 }, { ret: 'koedsovs', n: 13 }, { ret: 'koedsovs', n: '4' }, { ret: 'Koedsovs', n: 4 },
    { ret: 'a'.repeat(41), n: 4 }, { ret: 'koed_sovs', n: 4 }, undefined, {}]) {
    assert.throws(() => kod('2026-10-26', med(1, d)), RangeError, JSON.stringify(d));
  }
  assert.throws(() => kod('2026-10-26', PLAN.slice(0, 6)), RangeError);
  assert.throws(() => kod('2026-10-26', [...PLAN, null]), RangeError);
});

// Fjendtlige koder (afsnit 5). Kontrolsummen er rigtig, hvor det giver mening, så det er den regel, der står ved siden
// af, der afviser koden, og ikke kontrolsummen
const GOD = kod('2026-10-26', PLAN);
const FORKERT_SUM = GOD.slice(0, -1) + (GOD.endsWith('0') ? '1' : '0');
const FJENDTLIGE = [
  ['<script> i et felt', medSum('v1.20261026.<script>_4~~~~~~')],
  ['<script> efter koden', GOD + '<script>alert(1)</script>'],
  ['%3C (URL-kodet <)', medSum('v1.20261026.koedsovs%3Cscript%3E_4~~~~~~')],
  ['punktummerne %-kodet', GOD.replaceAll('.', '%2e')],
  ['tilde %-kodet', GOD.replaceAll('~', '%7E')],
  ['8 dage', medSum('v1.20261026.koedsovs_4~~~~~~~')],
  ['6 dage', medSum('v1.20261026.koedsovs_4~~~~~')],
  ['_0', medSum('v1.20261026.koedsovs_0~~~~~~')],
  ['_13', medSum('v1.20261026.koedsovs_13~~~~~~')],
  ['_04', medSum('v1.20261026.koedsovs_04~~~~~~')],
  ['ingen portioner', medSum('v1.20261026.koedsovs~~~~~~')],
  ['tomme portioner', medSum('v1.20261026.koedsovs_~~~~~~')],
  ['to gange _', medSum('v1.20261026.koedsovs_4_4~~~~~~')],
  ['__proto__', medSum('v1.20261026.__proto___4~~~~~~')],
  ['id på 41 tegn', medSum('v1.20261026.' + 'a'.repeat(41) + '_4~~~~~~')],
  ['bindestreg sidst i id', medSum('v1.20261026.koedsovs-_4~~~~~~')],
  ['10.000 tegn', 'v1.20261026.' + 'a'.repeat(10000)],
  ['10.000 tegn i en gyldig form', medSum('v1.20261026.' + Array(7).fill('a'.repeat(1400) + '_4').join('~'))],
  ['30-02', medSum('v1.20260230.koedsovs_4~~~~~~')],
  ['ikke en mandag', medSum('v1.20261027.koedsovs_4~~~~~~')],
  ['år 0099', medSum('v1.00991026.koedsovs_4~~~~~~')],
  ['mere end 8 uger frem', medSum('v1.20270104.koedsovs_4~~~~~~')],
  ['7 cifre i datoen', medSum('v1.2026102.koedsovs_4~~~~~~')],
  ['forkert kontrolsum', FORKERT_SUM],
  ['kontrolsum med store bogstaver', GOD.slice(0, -4) + GOD.slice(-4).toUpperCase()],
  ['afskåret link', GOD.slice(0, -10)],
  ['uden kontrolsum', GOD.slice(0, -5)],
  ['store bogstaver', medSum('V1.20261026.KOEDSOVS_4~~~~~~')],
  ['mellemrum', medSum('v1.20261026.koedsovs_4 ~~~~~~')],
  ['linjeskift sidst', GOD + '\n'],
  ['v0', medSum('v0.20261026.koedsovs_4~~~~~~')],
  ['v01', medSum('v01.20261026.koedsovs_4~~~~~~')],
  ['v2 for lang (længden tjekkes før udgaven)', 'v2.' + 'a'.repeat(500)],
  ['v2 med % (tegnene tjekkes før udgaven)', 'v2.20261026.%3Cscript%3E'],
  ['tom', ''],
  ['ikke en tekst', null],
  ['et tal', 20261026],
  ['et objekt', { toString: () => GOD }],
];

test('fjendtlige koder giver «Linket kan ikke læses», og intet fra adressen kommer med i svaret', () => {
  // Kontrolsummen er kun forkert i de tilfælde, der handler om den
  assert.notEqual(FORKERT_SUM, GOD);
  for (const [navn, kode] of FJENDTLIGE) {
    const r = af(kode);
    assert.deepEqual(r, UGYLDIG, navn);
    for (const ord of ['script', 'alert', '%', 'proto', 'aaaa']) assert.equal(JSON.stringify(r).includes(ord), false, navn + ': ' + ord);
  }
});

test('en nyere udgave giver «Opdatér appen», men kun når koden ellers er ren', () => {
  for (const kode of ['v2.20261026.koedsovs_4~~~~~~.abcd', 'v2.', 'v9.x', 'v10.20261026.noget-nyt', 'v123.a.b.c']) {
    assert.deepEqual(af(kode), NYERE, kode);
  }
  assert.deepEqual(af(GOD.replace(/^v1/, 'v2')), NYERE);
  assert.deepEqual(af('v2'), UGYLDIG); // uden punktum er det ikke en udgave
});

test('constructor_4 og andre ukendte retter giver en tom dag og kun et tal', () => {
  const kode = medSum('v1.20261026.constructor_4~koedsovs_4~tostring_2~pandekager_4~' + 'b'.repeat(40) + '_4~~');
  const r = af(kode);
  assert.equal(r.ok, true);
  assert.equal(r.ukendte, 4);
  assert.deepEqual(r.dage, [null, { ret: 'koedsovs', n: 4 }, null, null, null, null, null]);
  // Koden gemmes genskrevet fra det godkendte: de ukendte id'er er væk, og det samme link giver den samme kode
  assert.equal(r.kode, kod('2026-10-26', r.dage));
  for (const ord of ['constructor', 'tostring', 'pandekager', 'bbbb']) assert.equal(JSON.stringify(r).includes(ord), false, ord);
  assert.deepEqual(af(r.kode), { ...r, ukendte: 0 });
  assert.deepEqual(af(kode), r);
  assert.equal(ukendtTekst(1), '1 ret kunne ikke findes');
  assert.equal(ukendtTekst(4), '4 retter kunne ikke findes');
  // En tom liste over retter: alle dage bliver tomme, men koden er stadig gyldig
  assert.deepEqual(af(GOD, []).dage, Array(7).fill(null));
  assert.equal(af(GOD, []).ukendte, 3);
});

// Code review U9 (23-10): feltet «Sæt linket ind» tog al tekst efter #/hent/, så «… Hilsen far» efter linket, eller en
// tilde, som en app har kodet til %7E, gav «Linket kan ikke læses»
test('linket i feltet: koden efter #/hent/ til første mellemrum, og %7E bliver til ~', () => {
  const url = 'https://jimmyfabe.github.io/Kogebog/index.html#/hent/' + GOD;
  for (const t of [GOD, url, url + '.', '  ' + url + '  ', 'Her er listen: ' + url + '. Hilsen far', url + ' Hilsen far',
    url + '\nHilsen far', url + '\tx', url.replaceAll('~', '%7E'), url.replaceAll('~', '%7e') + ', tak']) {
    assert.equal(kodeFraTekst(t), GOD, JSON.stringify(t));
  }
  assert.equal(kodeFraTekst(''), '');
  assert.equal(kodeFraTekst(null), '');
  // Andet end koden går stadig gennem afkod og afvises der
  assert.deepEqual(af(kodeFraTekst('Hej! MARK-felt-123')), UGYLDIG);
  assert.deepEqual(af(kodeFraTekst(url.replaceAll('.', '%2e'))), UGYLDIG);
});

test('afkod kræver en liste over retter og en rigtig dato', () => {
  assert.throws(() => afkod(GOD, {}), TypeError);
  assert.throws(() => afkod(GOD), TypeError);
  assert.throws(() => afkod(GOD, { retter: { koedsovs: true }, idag: IDAG }), TypeError);
  assert.throws(() => afkod(GOD, { retter: UGEPLAN, idag: new Date('ikke en dato') }), TypeError);
  assert.throws(() => afkod(GOD, { retter: UGEPLAN, idag: '2026-10-22' }), TypeError);
});

// ---------- Lageret (js/lager.js) med et falsk localStorage ----------

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
const gemt = (l, k) => JSON.parse(l.data.get(k));

// «kog-v1» må ikke ændre opførsel (afsnit 3). Testene her er skrevet og kørt mod lager.js fra før ugeplanen
test('kog-v1 opfører sig som før: tomt, gem, rens og nulstilling ved en anden udgave', () => {
  const TOMT = { v: 1, sidste: null, timer: null };
  let l = medLager();
  assert.deepEqual(lager.hent(), TOMT);
  const sidste = { ret: 'koedsovs', nr: 3, tid: 1761120000000 };
  assert.deepEqual(lager.gem({ sidste }), { v: 1, sidste, timer: null });
  assert.equal(l.data.get('kog-v1'), JSON.stringify({ v: 1, sidste, timer: null }));
  const timer = { ret: 'boller', nr: 7, start: 1000, slut: 61000, sek: 60 };
  assert.deepEqual(lager.gem({ timer }), { v: 1, sidste, timer });
  assert.deepEqual(lager.hent(), { v: 1, sidste, timer });
  // Ekstra felter og forkerte værdier renses væk
  assert.deepEqual(lager.gem({ sidste: { ret: 'Koedsovs', nr: 3, tid: 1 }, ekstra: 1 }), { v: 1, sidste: null, timer });
  assert.deepEqual(lager.gem({ timer: { ...timer, sek: 0 } }), TOMT);
  assert.deepEqual(l.skrevet, ['kog-v1', 'kog-v1', 'kog-v1', 'kog-v1']);
  // En anden udgave (også en nyere) nulstilles, og gem() skriver ovenpå. Sådan er kog-v1, og sådan bliver den
  l = medLager({ 'kog-v1': { v: 2, sidste, timer: null } });
  assert.deepEqual(lager.hent(), TOMT);
  assert.deepEqual(lager.gem({ sidste }), { v: 1, sidste, timer: null });
  assert.equal(gemt(l, 'kog-v1').v, 1);
  // Ødelagt JSON, et lager, der ikke kan læses, og et, der ikke kan skrives
  medLager({ 'kog-v1': '{ikke json' });
  assert.deepEqual(lager.hent(), TOMT);
  l = medLager({ 'kog-v1': { v: 1, sidste, timer: null } });
  l.fejl = 'laes';
  assert.deepEqual(lager.hent(), TOMT);
  l.fejl = 'skriv';
  assert.deepEqual(lager.gem({ sidste }), { v: 1, sidste, timer: null });
});

// Et falsk navigator.storage.persist, der tæller kaldene og svarer, som det får besked på
function medPersist(svar = () => Promise.resolve(true)) {
  const t = { kald: 0 };
  Object.defineProperty(globalThis, 'navigator', {
    value: { storage: { persist: () => { t.kald++; return svar(); } } }, configurable: true, writable: true,
  });
  return t;
}

const TOM_UGE = { v: 1, uge: null, dage: [null, null, null, null, null, null, null], n: 4, prBarn: 1, rettet: null, laast: false };
const TOM_LISTE = { v: 1, kode: null, uge: null, varer: [], koebt: [], harVi: [], hentet: null, laast: false };
const DAGE = [{ ret: 'koedsovs', af: 'rosa', n: 4 }, null, { ret: 'tunfrikadeller', af: 'pip', n: 6 }, null, { ret: 'chorizo-pasta', af: 'bo', n: 4 }, null, null];
const UGE_DATA = { uge: '2026-10-26', dage: DAGE, n: 4, prBarn: 2, rettet: 1761120000000 };
const LISTE_DATA = {
  kode: GOD, uge: '2026-10-26', varer: [{ id: 'loeg', m: 1.5 }, { id: 'hakket-oksekoed', m: 1040 }, { id: 'salt', m: 0 }],
  koebt: ['loeg'], harVi: ['salt'], hentet: 1761120000000,
};
const uden = (o) => { const { laast, ...r } = o; return r; };

test('ugeplanen gemmes og hentes, og iPad\'en beder om at beholde lageret', () => {
  const l = medLager();
  const p = medPersist();
  assert.deepEqual(lager.hentUge(UGEPLAN), TOM_UGE);
  const gemmet = lager.gemUge(UGE_DATA, UGEPLAN);
  assert.deepEqual(gemmet, { v: 1, ...UGE_DATA });
  assert.deepEqual(gemt(l, 'kog-uge-v1'), { v: 1, ...UGE_DATA });
  assert.deepEqual(lager.hentUge(UGEPLAN), { v: 1, ...UGE_DATA, laast: false });
  assert.equal(p.kald, 1);
  // En ændring lægges oven på det gemte
  assert.deepEqual(lager.gemUge({ n: 6 }, UGEPLAN), { v: 1, ...UGE_DATA, n: 6 });
  assert.equal(p.kald, 2);
  // persist(), der siger nej, kaster eller ikke findes, er ingen fejl
  medPersist(() => Promise.reject(new Error('nej')));
  assert.notEqual(lager.gemUge({ n: 5 }, UGEPLAN), null);
  medPersist(() => { throw new Error('nej'); });
  assert.notEqual(lager.gemUge({ n: 5 }, UGEPLAN), null);
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
  assert.notEqual(lager.gemUge({ n: 5 }, UGEPLAN), null);
  assert.throws(() => lager.hentUge(), TypeError);
  assert.throws(() => lager.gemUge({}, { koedsovs: true }), TypeError);
});

test('ugeplanen renses: kun kendte retter, dyrene og portioner 1-12', () => {
  const l = medLager();
  medPersist();
  const daarlige = [
    { ret: 'pandekager', af: 'rosa', n: 4 }, // står i index.json, men ikke i ugeplanen
    { ret: 'constructor', af: 'rosa', n: 4 }, { ret: 'koedsovs', af: 'constructor', n: 4 }, { ret: 'koedsovs', af: 'Rosa', n: 4 },
    { ret: 'koedsovs', af: 'toString', n: 4 }, { ret: 'koedsovs', n: 4 }, { ret: 'koedsovs', af: 'rosa', n: 0 },
    { ret: 'koedsovs', af: 'rosa', n: 13 }, { ret: 'koedsovs', af: 'rosa', n: '4' }, { ret: 'koedsovs', af: 'rosa', n: 2.5 }, 'koedsovs', 7,
  ];
  for (const d of daarlige) {
    assert.deepEqual(lager.gemUge({ ...UGE_DATA, dage: [d, ...DAGE.slice(1)] }, UGEPLAN).dage, [null, ...DAGE.slice(1)], JSON.stringify(d));
  }
  // Ekstra felter forsvinder, og et barns navn kan ikke gemmes som noget andet end et af dyrene
  assert.deepEqual(lager.gemUge({ ...UGE_DATA, dage: [{ ...DAGE[0], navn: 'x', ekstra: 1 }, ...DAGE.slice(1)], hemmelig: 1 }, UGEPLAN), { v: 1, ...UGE_DATA });
  for (const dage of [DAGE.slice(0, 6), [...DAGE, null], 'mandag', null]) assert.deepEqual(lager.gemUge({ ...UGE_DATA, dage }, UGEPLAN).dage, TOM_UGE.dage);
  for (const [felt, v, forventet] of [['uge', '26-10-2026', null], ['uge', 20261026, null], ['n', 0, 4], ['n', 13, 4], ['n', '6', 4],
    ['prBarn', 3, 1], ['prBarn', 0, 1], ['rettet', 'i går', null], ['rettet', NaN, null]]) {
    medLager();
    assert.equal(lager.gemUge({ ...UGE_DATA, [felt]: v }, UGEPLAN)[felt], forventet, felt + ' ' + v);
  }
  // Data, der er rettet i lageret udefra, renses også ved læsning
  medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA, dage: [{ ret: 'constructor', af: 'bo', n: 4 }, ...DAGE.slice(1)] } });
  assert.deepEqual(lager.hentUge(UGEPLAN).dage, [null, ...DAGE.slice(1)]);
  // Planen viser kun retter, der stadig findes: fjernes en ret fra index.json, vises dagen tom
  medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA } });
  assert.deepEqual(lager.hentUge(UGEPLAN.filter((id) => id !== 'koedsovs')).dage, [null, ...DAGE.slice(1)]);
  assert.equal(l.skrevet.every((k) => k === 'kog-uge-v1'), true);
});

// Sikkerhed S1 (23-10): en gemt uge, der ligner en dato, men ikke er en rigtig mandag, fik kod() til at kaste, og så
// kunne #/uge (med «Ny uge») ikke åbnes. kog-uge-v1 deler origin med Lystårnet og LEGO. Lageret godtager kun en mandag
test('ugen i planen er altid en rigtig mandag, så planen kan kodes', () => {
  medPersist();
  const tilKode = (p) => p.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  for (const uge of ['2026-10-27', '2026-02-30', '2026-13-02', '0099-01-05', '2026-11-01']) {
    medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA, uge } });
    const p = lager.hentUge(UGEPLAN);
    assert.equal(p.uge, null, 'hentUge: ' + uge);
    assert.deepEqual(p.dage, DAGE, 'dagene bliver: ' + uge);
    medLager();
    assert.equal(lager.gemUge({ ...UGE_DATA, uge }, UGEPLAN).uge, null, 'gemUge: ' + uge);
  }
  medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA } });
  const p = lager.hentUge(UGEPLAN);
  assert.equal(p.uge, '2026-10-26');
  assert.doesNotThrow(() => kod(p.uge, tilKode(p)));
});

// Code review M1 (22-10): «retter» er de retter, der kan vises nu. Mangler en hentning (nyt id uden net), må en
// skrivning ikke slette de andre dage i lageret, og et felt sat til undefined er ingen ændring
test('en kort retter-liste eller et felt sat til undefined sletter ikke gemte dage', () => {
  const l = medLager();
  medPersist();
  lager.gemUge(UGE_DATA, UGEPLAN);
  // Kun kødsovsen er hentet: svaret viser kun den, men lageret beholder alle tre dage
  assert.deepEqual(lager.gemUge({ n: 6 }, ['koedsovs']), { v: 1, ...UGE_DATA, n: 6, dage: [DAGE[0], null, null, null, null, null, null] });
  assert.deepEqual(gemt(l, 'kog-uge-v1'), { v: 1, ...UGE_DATA, n: 6 });
  assert.deepEqual(uden(lager.hentUge(UGEPLAN)), { v: 1, ...UGE_DATA, n: 6 });
  // Ingen retter hentet endnu
  assert.notEqual(lager.gemUge({ n: 5 }, []), null);
  assert.deepEqual(uden(lager.hentUge(UGEPLAN)), { v: 1, ...UGE_DATA, n: 5 });
  // Et felt sat til undefined lader det gemte stå
  for (const felt of ['uge', 'dage', 'n', 'prBarn', 'rettet']) {
    assert.deepEqual(lager.gemUge({ [felt]: undefined }, UGEPLAN), { v: 1, ...UGE_DATA, n: 5 }, felt);
  }
  // Nye dage skal stadig stå i «retter»; en ret, der allerede står i planen, må gemmes igen, selvom den ikke er hentet
  const dage = [DAGE[0], { ret: 'pandekager', af: 'pip', n: 4 }, ...DAGE.slice(2)];
  assert.notEqual(lager.gemUge({ dage }, ['koedsovs']), null);
  assert.deepEqual(gemt(l, 'kog-uge-v1').dage, DAGE);
  // Den gemte del renses stadig for form: et id, der ikke ligner et id fra index.json, eller over 40 tegn forsvinder
  const l2 = medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA, dage: [{ ret: '<b>', af: 'bo', n: 4 }, { ret: 'a'.repeat(41), af: 'bo', n: 4 }, ...DAGE.slice(2)] } });
  assert.notEqual(lager.gemUge({ n: 6 }, ['koedsovs']), null);
  assert.deepEqual(gemt(l2, 'kog-uge-v1').dage, [null, null, ...DAGE.slice(2)]);
});

test('indkøbslisten gemmes og renses: kendte varer, m 0-100.000, højst 200, afkrydsning kun for varer på listen', () => {
  const l = medLager();
  const p = medPersist();
  assert.deepEqual(lager.hentListe(), TOM_LISTE);
  assert.deepEqual(lager.gemListe(LISTE_DATA), { v: 1, ...LISTE_DATA });
  assert.deepEqual(lager.hentListe(), { v: 1, ...LISTE_DATA, laast: false });
  assert.equal(p.kald, 0); // kun iPad'en beder om at beholde lageret, når en plan gemmes
  // Afkrydsningerne lægges oven på det gemte
  assert.deepEqual(lager.gemListe({ koebt: ['loeg', 'hakket-oksekoed'] }).koebt, ['loeg', 'hakket-oksekoed']);
  assert.deepEqual(uden(lager.hentListe()), { v: 1, ...LISTE_DATA, koebt: ['loeg', 'hakket-oksekoed'] });
  // Varerne: arvede navne, ukendte varer, forkerte mængder og dobbelte linjer forsvinder
  const varer = [
    { id: 'constructor', m: 1 }, { id: '__proto__', m: 1 }, { id: 'toString', m: 1 }, { id: 'hvedemel', m: 1 }, { id: 7, m: 1 },
    { id: 'loeg', m: -1 }, { id: 'loeg', m: 100001 }, { id: 'loeg', m: '2' }, { id: 'loeg', m: NaN }, { id: 'loeg', m: Infinity }, null,
    { id: 'loeg', m: 100000 }, { id: 'loeg', m: 3 }, { id: 'salt', m: 0 },
  ];
  medLager();
  assert.deepEqual(lager.gemListe({ varer }).varer, [{ id: 'loeg', m: 100000 }, { id: 'salt', m: 0 }]);
  // Kun de første 200 linjer læses
  medLager();
  assert.deepEqual(lager.gemListe({ varer: [...Array(200).fill({ id: 'constructor', m: 1 }), { id: 'loeg', m: 2 }] }).varer, []);
  medLager();
  assert.deepEqual(lager.gemListe({ varer: [...Array(199).fill({ id: 'constructor', m: 1 }), { id: 'loeg', m: 2 }] }).varer, [{ id: 'loeg', m: 2 }]);
  // Afkrydsninger af varer, der ikke er på listen, af arvede navne og to gange den samme forsvinder
  medLager();
  const r = lager.gemListe({ ...LISTE_DATA, koebt: ['loeg', 'loeg', 'constructor', 'aeg', 5], harVi: ['salt', 'toString', null] });
  assert.deepEqual([r.koebt, r.harVi], [['loeg'], ['salt']]);
  // Koden: højst 400 tegn og kun tegnene fra linket
  for (const [kode, forventet] of [[GOD, GOD], ['a'.repeat(400), 'a'.repeat(400)], ['a'.repeat(401), null], ['<script>', null],
    [GOD.toUpperCase(), null], ['%3C', null], ['', null], [123, null]]) {
    medLager();
    assert.equal(lager.gemListe({ ...LISTE_DATA, kode }).kode, forventet, String(kode).slice(0, 20));
  }
  for (const [felt, v] of [['uge', 'i morgen'], ['hentet', '2026'], ['varer', 'loeg'], ['koebt', 'loeg']]) {
    medLager();
    assert.deepEqual(lager.gemListe({ ...LISTE_DATA, [felt]: v })[felt], TOM_LISTE[felt], felt);
  }
  assert.equal(l.skrevet.every((k) => k === 'kog-liste-v1'), true);
});

// Code review af trin 1-5 (22-10): samme fejl som M1 i gemUge (f314805). { varer: undefined } tømte listen, og
// afkrydsningerne forsvandt med den, fordi de kun gælder varer på listen
test('et felt sat til undefined lader den gemte liste stå', () => {
  const l = medLager();
  lager.gemListe(LISTE_DATA);
  for (const felt of ['kode', 'uge', 'varer', 'koebt', 'harVi', 'hentet']) {
    assert.deepEqual(lager.gemListe({ [felt]: undefined }), { v: 1, ...LISTE_DATA }, felt);
  }
  assert.deepEqual(lager.gemListe({ varer: undefined, koebt: ['loeg', 'hakket-oksekoed'] }).koebt, ['loeg', 'hakket-oksekoed']);
  assert.deepEqual(gemt(l, 'kog-liste-v1').varer, LISTE_DATA.varer);
});

test('versionsvagten: et højere v læses som tomt og overskrives aldrig', () => {
  // v står som tekst i JSON'en, så 1e999 (uendelig) også kan prøves
  for (const v of ['2', '1.5', '99', '1e999']) {
    const uge = '{"v":' + v + ',"uge":"2027-01-04","dage":"ny form","mere":true}';
    const liste = '{"v":' + v + ',"kode":"v2.noget","varer":{"ny":"form"}}';
    const l = medLager({ 'kog-uge-v1': uge, 'kog-liste-v1': liste });
    const p = medPersist();
    assert.deepEqual(lager.hentUge(UGEPLAN), { ...TOM_UGE, laast: true }, 'uge v' + v);
    assert.deepEqual(lager.hentListe(), { ...TOM_LISTE, laast: true }, 'liste v' + v);
    assert.equal(lager.gemUge(UGE_DATA, UGEPLAN), null);
    assert.equal(lager.gemListe(LISTE_DATA), null);
    // Heller ikke en ændring, der selv påstår at være den nyere udgave eller ulåst
    assert.equal(lager.gemUge({ ...UGE_DATA, v: Number(v), laast: false }, UGEPLAN), null);
    assert.equal(lager.gemListe({ ...LISTE_DATA, v: Number(v), laast: false }), null);
    assert.equal(l.data.get('kog-uge-v1'), uge);
    assert.equal(l.data.get('kog-liste-v1'), liste);
    assert.deepEqual(l.skrevet, []);
    assert.equal(p.kald, 0);
  }
  // Låsen gælder kun den nøgle, der er skrevet af den nyere udgave
  let l = medLager({ 'kog-uge-v1': { v: 2 } });
  assert.notEqual(lager.gemListe(LISTE_DATA), null);
  assert.equal(lager.gemUge(UGE_DATA, UGEPLAN), null);
  assert.deepEqual(l.skrevet, ['kog-liste-v1']);
  // Et lavere, manglende eller ugyldigt v (der er ingen ældre udgave) og ødelagt JSON læses som tomt og kan skrives
  for (const raa of [{ v: 0, uge: '2026-10-26' }, { uge: '2026-10-26' }, { v: '2', uge: '2026-10-26' }, { v: null }, { v: NaN }, [1, 2], '{ikke json', '7']) {
    l = medLager({ 'kog-uge-v1': raa, 'kog-liste-v1': raa });
    assert.deepEqual(lager.hentUge(UGEPLAN), TOM_UGE, JSON.stringify(raa));
    assert.deepEqual(lager.hentListe(), TOM_LISTE, JSON.stringify(raa));
    assert.notEqual(lager.gemUge(UGE_DATA, UGEPLAN), null);
    assert.notEqual(lager.gemListe(LISTE_DATA), null);
    assert.equal(gemt(l, 'kog-uge-v1').v, 1);
  }
});

test('et lager, der ikke kan læses eller skrives, giver tomme data og null, aldrig en fejl', () => {
  const l = medLager({ 'kog-uge-v1': { v: 1, ...UGE_DATA }, 'kog-liste-v1': { v: 1, ...LISTE_DATA } });
  const p = medPersist();
  l.fejl = 'laes';
  assert.deepEqual(lager.hentUge(UGEPLAN), TOM_UGE);
  assert.deepEqual(lager.hentListe(), TOM_LISTE);
  l.fejl = 'skriv';
  assert.equal(lager.gemUge(UGE_DATA, UGEPLAN), null);
  assert.equal(lager.gemListe(LISTE_DATA), null);
  assert.equal(p.kald, 0);
  Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
  assert.deepEqual(lager.hentUge(UGEPLAN), TOM_UGE);
  assert.equal(lager.gemListe(LISTE_DATA), null);
});

test('de nye nøgler og kog-v1 rører ikke hinanden', () => {
  const kog = JSON.stringify({ v: 1, sidste: { ret: 'koedsovs', nr: 2, tid: 5 }, timer: null });
  const l = medLager({ 'kog-v1': kog });
  medPersist();
  lager.gemUge(UGE_DATA, UGEPLAN);
  lager.gemListe(LISTE_DATA);
  assert.equal(l.data.get('kog-v1'), kog);
  assert.deepEqual(lager.hent(), JSON.parse(kog));
  l.skrevet = [];
  lager.gem({ timer: null });
  assert.deepEqual(l.skrevet, ['kog-v1']);
  assert.deepEqual(uden(lager.hentUge(UGEPLAN)), { v: 1, ...UGE_DATA });
  assert.deepEqual(uden(lager.hentListe()), { v: 1, ...LISTE_DATA });
});
