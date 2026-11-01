// test-skaler.js — skalering til husstandens portioner (js/skaler.js, docs/foraeldredel.md afsnit 4): husstanden som
// portioner, faktoren for en ret, afrundingstabellen række for række og alle ingredienslinjer i alle opskrifter.
// Kør:  node test/test-skaler.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { portionerFraHusstand, faktorFor, skalerMaengde, BARN_ANDEL, MAKS_PORTIONER, skaleretIngrediens, voksenNoter, portionerTekst } from '../js/skaler.js';
import * as lager from '../js/lager.js';
import { lavModel } from '../js/model.js';
import { boejNavn, NAVNEORD, TILLAEGSORD, KOEN, tilTale, ukendtKoen } from '../js/tekst.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (fil) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', fil), 'utf8'));
const IDS = json('index.json').grupper.flatMap((g) => g.retter);
const RETTER = IDS.map((id) => {
  const j = json(id + '.json');
  return { id, model: lavModel(j), varer: ((j.tumbi && j.tumbi.ingredienser) || []).map((l) => (l && l.vare) || undefined) };
});
// Alle ingredienslinjer: { id, maengde, tekst, vare }
const LINJER = RETTER.flatMap(({ id, model, varer }) => model.ingredienser.map((l, i) => ({ id, maengde: l.maengde, tekst: l.tekst, vare: varer[i] })));
const FAKTORER = [0.5, 1.5, 3];
// Mængderne i opskrifterne, der står uændret med 'ukendt'. Får en opskrift et nyt format, fejler testen og nævner det:
// så skal formatet enten have en regel i js/skaler.js eller skrives på listen her. «1 stort» (løg) er skrevet som «1» og
// navnet «stort løg» (01-11), så tillægsordet bøjes med navneordet («3 store løg»). En tom mængde («peber») er ikke
// ukendt: der er intet at regne om (01-11)
const UKENDTE = ['8-10 g'];

const sk = (maengde, faktor, vare) => skalerMaengde(maengde, faktor, { vare });
const tekst = (maengde, faktor, vare) => sk(maengde, faktor, vare).tekst;

test('opskrifterne er indlæst', () => {
  assert.ok(RETTER.length >= 87, 'retter: ' + RETTER.length);
  assert.ok(LINJER.length >= 783, 'linjer: ' + LINJER.length);
});

test('faktor 1 giver nøjagtig den oprindelige tekst for alle ingredienslinjer', () => {
  for (const l of LINJER) {
    assert.deepEqual(sk(l.maengde, 1, l.vare), { tekst: l.maengde, advarsel: null }, l.id + ': ' + l.tekst);
    assert.equal(tekst(l.maengde, 1, l.vare) + l.tekst.slice(l.maengde.length), l.tekst, l.id);
  }
});

test('ved 0,5 / 1,5 / 3 er hver linje skaleret eller uændret med en advarsel, aldrig NaN, undefined eller tom', () => {
  const ukendte = new Set();
  for (const f of FAKTORER) {
    for (const l of LINJER) {
      const hvor = l.id + ' × ' + f + ': «' + l.tekst + '»';
      const s = sk(l.maengde, f, l.vare);
      assert.equal(typeof s.tekst, 'string', hvor);
      assert.ok(!/NaN|undefined|Infinity|null/.test(s.tekst), hvor + ' → ' + s.tekst);
      assert.ok(!/\d\.\d/.test(s.tekst), 'decimalkomma, ikke punktum: ' + hvor + ' → ' + s.tekst);
      assert.ok([null, 'form', 'ukendt'].includes(s.advarsel), hvor);
      if (l.maengde) assert.ok(s.tekst.trim().length > 0, 'tom tekst: ' + hvor);
      assert.ok((s.tekst + l.tekst.slice(l.maengde.length)).trim().length > 0, hvor);
      if (s.advarsel === 'ukendt') {
        assert.equal(s.tekst, l.maengde, hvor);
        ukendte.add(l.maengde);
      }
      // Ved × 3 ændres hver mængde, der kan skaleres; kun knivspids står uændret efter tabellen
      if (f === 3 && s.advarsel === null && l.maengde !== '' && !l.maengde.endsWith('knivspids')) assert.notEqual(s.tekst, l.maengde, hvor);
    }
  }
  assert.deepEqual([...ukendte].sort(), [...UKENDTE].sort());
});

// Afrundingstabellen (docs/foraeldredel.md, afsnit 4) række for række: [mængde, faktor, svar, advarsel, vare]
const TABEL = {
  'g: under 50 g til nærmeste 5 g, ellers 10 g, fra 1 kg i kg med én decimal': [
    ['40 g', 0.5, '20 g'], ['25 g', 0.5, '15 g'], ['75 g', 0.5, '40 g'], ['10 g', 0.25, '5 g'], ['2 g', 0.5, '2 g'],
    ['130 g', 1.5, '200 g'], ['350 g', 0.75, '260 g'], ['150 g', 0.5, '80 g'], ['400 g', 0.25, '100 g'],
    ['800 g', 1.5, '1,2 kg'], ['450 g', 3, '1,4 kg'], ['500 g', 2, '1 kg'], ['330 g', 3, '990 g'], ['ca. 650 g', 0.5, 'ca. 330 g'],
    ['350 g', 7 / 10, '250 g'], // 350 × 0,7 = 244,99999999999997 i kommatal: skal runde som 245
  ],
  'kg: 0,1 kg, og under 1 kg i gram': [
    ['1,2 kg', 1.5, '1,8 kg'], ['1 kg', 1.25, '1,3 kg'], ['1 kg', 3, '3 kg'], ['1 kg', 0.5, '500 g'], ['1,2 kg', 0.75, '900 g'],
  ],
  'dl og l: ½ dl, under 1 l i dl': [
    ['1 dl', 0.5, '½ dl'], ['3 dl', 0.5, '1,5 dl'], ['1,5 dl', 0.5, '1 dl'], ['2,5 dl', 1.5, '4 dl'], ['¾ dl', 0.5, '½ dl'],
    ['2½ dl', 0.5, '1,5 dl'], ['1,75 dl', 1.5, '2,5 dl'], ['ca. 1,5 dl', 3, 'ca. 4,5 dl'], ['15 dl', 0.5, '7,5 dl'],
    ['1 l', 0.5, '5 dl'], ['3 l', 0.5, '1,5 l'], ['6 dl', 3, '1,8 l'], ['1,25 l', 1.5, '1,9 l'], ['2 l', 0.25, '5 dl'],
  ],
  'tsk og spsk: ½, mindst ½': [
    ['½ tsk', 0.5, '½ tsk'], ['½ tsk', 3, '1,5 tsk'], ['1 tsk', 1.5, '1,5 tsk'], ['2 spsk', 0.75, '1,5 spsk'], ['3 spsk', 0.5, '1,5 spsk'],
    ['4½ spsk', 1.5, '7 spsk'], ['¾ tsk', 0.5, '½ tsk'], ['¼ tsk', 0.5, '¼ tsk'], ['ca. 1 tsk', 0.5, 'ca. ½ tsk'],
  ],
  'knivspids: uændret': [
    ['1 knivspids', 0.5, '1 knivspids'], ['1 knivspids', 3, '1 knivspids'],
  ],
  'fed, skiver og blade: hele, mindst 1': [
    ['2 fed', 0.5, '1 fed'], ['1 fed', 0.5, '1 fed'], ['3 fed', 1.5, '5 fed'], ['2 fed', 3, '6 fed'],
    ['8 skiver', 0.5, '4 skiver'], ['6 skiver', 1.5, '9 skiver'], ['2 skiver', 0.5, '1 skive'],
    ['4 blade', 0.5, '2 blade'], ['4 blade', 0.25, '1 blad'],
  ],
  'stk (tal uden enhed): ½ op til 3, ellers hele': [
    ['1', 0.5, '½'], ['1', 1.5, '1,5'], ['2', 1.5, '3'], ['5', 0.5, '2,5'], ['3', 1.5, '5'], ['½', 0.5, '½'], ['½', 3, '1,5'],
    ['10', 0.75, '8'], ['12', 1.25, '15'],
  ],
  '«N stk.» (i navnet, «(4 stk.)»): som et tal uden enhed': [
    ['4 stk.', 0.5, '2 stk.'], ['1 stk.', 0.5, '½ stk.'], ['4 stk.', 1.5, '6 stk.'],
  ],
  'æg: altid hele, rundet op': [
    ['1', 0.5, '1', null, 'aeg'], ['3', 1.5, '5', null, 'aeg'], ['5', 0.5, '3', null, 'aeg'], ['8', 0.75, '6', null, 'aeg'], ['2', 3, '6', null, 'aeg'],
  ],
  'dåse, pose, glas og pakke: ½': [
    ['1 dåse', 0.5, '½ dåse'], ['2 dåser', 0.5, '1 dåse'], ['1 dåse', 1.5, '1,5 dåse'], ['1 dåse', 3, '3 dåser'], ['2 dåser', 1.25, '2,5 dåser'],
    ['½ dåse', 3, '1,5 dåse'], ['½ dåse', 0.5, '½ dåse'], ['2 små dåser', 0.5, '1 lille dåse'], ['2 små dåser', 1.5, '3 små dåser'],
    ['1 pose', 2, '2 poser'], ['2 poser', 0.5, '1 pose'], ['1 glas', 3, '3 glas'], ['1 pakke', 2, '2 pakker'],
  ],
  'rulle og plade (dej): hele, rundet op, med advarslen form': [
    ['1 rulle', 0.5, '1 rulle', 'form'], ['1 rulle', 1.5, '2 ruller', 'form'], ['2 ruller', 0.5, '1 rulle', 'form'], ['1 plade', 3, '3 plader', 'form'],
  ],
  'tom mængde: uændret uden advarsel (intet at regne om)': [
    ['', 0.5, '', null], [' ', 3, ' ', null],
  ],
  '«stort» og ukendt format: uændret med advarslen ukendt': [
    ['1 stort', 1.5, '1 stort', 'ukendt'], ['8-10 g', 0.5, '8-10 g', 'ukendt'], ['lidt', 3, 'lidt', 'ukendt'],
    ['0 g', 3, '0 g', 'ukendt'], ['2 bundter', 0.5, '2 bundter', 'ukendt'], ['2  dl', 0.5, '2  dl', 'ukendt'], ['1.5 dl', 0.5, '1.5 dl', 'ukendt'],
    ['ca.', 0.5, 'ca.', 'ukendt'], ['½½', 0.5, '½½', 'ukendt'],
  ],
};
for (const [raekke, eksempler] of Object.entries(TABEL)) {
  test('afrunding, ' + raekke, () => {
    for (const [maengde, faktor, svar, advarsel = null, vare] of eksempler) {
      assert.deepEqual(sk(maengde, faktor, vare), { tekst: svar, advarsel }, maengde + ' × ' + faktor);
      assert.deepEqual(sk(maengde, 1, vare), { tekst: maengde, advarsel: null }, maengde + ' × 1');
    }
  });
}

test('skalerMaengde afviser en mængde, der ikke er tekst, og en faktor, der ikke er et positivt tal', () => {
  for (const m of [null, undefined, 300, {}]) assert.throws(() => skalerMaengde(m, 1.5), TypeError, String(m));
  for (const f of [0, -1, NaN, Infinity, null, undefined, '1.5']) assert.throws(() => skalerMaengde('300 g', f), RangeError, String(f));
  assert.deepEqual(skalerMaengde('300 g', 1.5), { tekst: '450 g', advarsel: null });
});

test('husstanden som portioner: voksne + 0,7 × børn, rundet op og inden for 1-12', () => {
  assert.equal(BARN_ANDEL, 0.7);
  // Konstanterne står kun i js/lager.js (ingen lokal kopi, der kan komme ud af trit)
  assert.equal(BARN_ANDEL, lager.BARN_ANDEL);
  assert.equal(MAKS_PORTIONER, lager.MAKS_PORTIONER);
  assert.equal(MAKS_PORTIONER, 12);
  assert.equal(portionerFraHusstand(2, 2, 0.7), 4);
  assert.equal(portionerFraHusstand(1, 0, 0.7), 1);
  assert.equal(portionerFraHusstand(0, 1, 0.7), 1);
  assert.equal(portionerFraHusstand(8, 8, 0.7), 12);
  assert.equal(portionerFraHusstand(null, null, 0.7), null);
  assert.equal(portionerFraHusstand(2, 2), 4); // standard 0,7
  assert.equal(portionerFraHusstand(0, 0, 0.7), 1);
  assert.equal(portionerFraHusstand(null, 2, 0.7), 2);
  assert.equal(portionerFraHusstand(3, null, 0.7), 3);
  assert.equal(portionerFraHusstand(2, 2, 0.5), 3);
  assert.equal(portionerFraHusstand(2, 2, 1), 4);
  assert.equal(portionerFraHusstand(1, 3, 1), 4);
  assert.equal(portionerFraHusstand(1, 3, 0.7), 4); // 3,1 → 4
  // Kommatal: en andel regnet som 0,1 × 6 er 0,6000000000000001, og × 5 børn giver 3,0000000000000004: ikke 4 portioner
  assert.equal(portionerFraHusstand(0, 5, 0.1 * 6), 3);
});

test('husstanden afviser forkerte antal og andele', () => {
  for (const [v, b] of [[-1, 0], [1.5, 0], ['2', 2], [NaN, 1], [undefined, 2], [2, -1], [2, 0.5]]) {
    assert.throws(() => portionerFraHusstand(v, b, 0.7), RangeError, v + ' + ' + b);
  }
  for (const a of [0, -0.7, 1.1, NaN, '0.7', null]) assert.throws(() => portionerFraHusstand(2, 2, a), RangeError, String(a));
});

test('faktoren er n / rettens portioner, og null uden talportioner eller med et forkert n', () => {
  const ks = RETTER.find((r) => r.id === 'koedsovs').model;
  assert.equal(faktorFor(ks, 4), 1);
  assert.equal(faktorFor(ks, 6), 1.5);
  assert.equal(faktorFor(ks, 2), 0.5);
  assert.equal(faktorFor(ks, 1), 0.25);
  assert.equal(faktorFor(ks, 12), 3);
  for (const n of [0, 13, 2.5, -4, '4', null, undefined, NaN]) assert.equal(faktorFor(ks, n), null, String(n));
  const boller = RETTER.find((r) => r.id === 'boller').model;
  assert.equal(boller.uge, null);
  assert.equal(faktorFor(boller, 4), null);
  for (const m of [null, undefined, {}, { uge: { portioner: 0 } }, { uge: { portioner: 2.5 } }, { uge: { portioner: '4' } }]) {
    assert.equal(faktorFor(m, 4), null, JSON.stringify(m));
  }
  assert.equal(faktorFor({ uge: { portioner: 3 } }, 5), 5 / 3);
});

test('alle ugeplan-retter har faktor 1 til 4 portioner, og alle andre retter har ingen faktor', () => {
  const uge = RETTER.filter((r) => r.model.uge);
  assert.ok(uge.length > 0);
  for (const r of uge) assert.equal(faktorFor(r.model, 4), 1, r.id);
  for (const r of RETTER.filter((x) => !x.model.uge)) assert.equal(faktorFor(r.model, 4), null, r.id);
});

const ret = (id) => RETTER.find((r) => r.id === id).model;

// Et antal uden enhed («2», «½», «ca. 3»): navneordet efter det bøjes, når antallet regnes om
const ANTAL_RE = /^(?:ca\. )?(\d+(?:,\d+)?|\d*[½¼¾])$/;
const antalAf = (maengde) => {
  const t = ANTAL_RE.exec(maengde)[1];
  const b = { '½': 0.5, '¼': 0.25, '¾': 0.75 }[t.slice(-1)];
  return b ? Number(t.slice(0, -1) || 0) + b : Number(t.replace(',', '.'));
};
// Ental efter højst 1 og efter 1,5 («halvanden gulerod»). Med vilje en egen kopi: et uafhængigt facit for erFlertal i
// js/tekst.js, som skærmen og stemmen bruger
const erFlertal = (x) => x > 1 && x !== 1.5;
// Linjerne i ugeplan-retterne med en mængde for hele linjen inde i navnet («(ca. 1 kg)», «(4 stk.)»): tallene dér regnes
// om med linjen. Får en ret en ny sådan linje, eller ændrer en anden linjes tal i navnet sig, fejler testen og nævner den:
// er tallet for hele linjen, skrives linjen her; er det pr. stk., skal mængden have en emballage (EMBALLAGE i js/skaler.js)
const TAL_FOR_HELE_LINJEN = [
  ['bagte-kartofler-med-fyld', '4 store kartofler (ca. 1 kg)', '2 store kartofler (ca. 500 g)'],
  ['fiskepakker-med-laks', '400 g laksefileter (4 stk.)', '200 g laksefileter (2 stk.)'],
  ['gul-ris-med-laks-aerter-og-aeg', '3½ dl ris, ca. 300 g', '2 dl ris, ca. 150 g'],
  ['gulerodssuppe-med-linser', '500 g rugbrød (4 skiver til croutoner, resten ved siden af)', '250 g rugbrød (2 skiver til croutoner, resten ved siden af)'],
  ['gulerodssuppe-med-linser', '6 gulerødder (ca. 600 g)', '3 gulerødder (ca. 300 g)'],
  ['laks-med-sproed-rasp', '4 laksefileter, ca. 400 g i alt', '2 laksefileter, ca. 200 g i alt'],
];

test('en ingrediens i retten: mængden regnes om, navneordet bøjes med, og advarslen følger med', () => {
  const tp = ret('one-pot-tomatpasta');
  assert.deepEqual(skaleretIngrediens(tp, 0, 1.5), { maengde: '450 g', navn: 'penne', tekst: '450 g penne', skaleret: true, advarsel: null });
  assert.deepEqual(skaleretIngrediens(tp, 9, 1.5), { maengde: '1 knivspids', navn: 'peber', tekst: '1 knivspids peber', skaleret: false, advarsel: null });
  const kt = ret('kyllingetaerte-med-butterdej');
  assert.deepEqual(skaleretIngrediens(kt, 9, 1.5), { maengde: '2 ruller', navn: 'færdig butterdej', tekst: '2 ruller færdig butterdej', skaleret: true, advarsel: 'form' });
  // Halveret er dejen stadig én rulle: ikke skaleret, men formen passer måske ikke
  assert.deepEqual(skaleretIngrediens(kt, 9, 0.5), { maengde: '1 rulle', navn: 'færdig butterdej', tekst: '1 rulle færdig butterdej', skaleret: false, advarsel: 'form' });
  assert.deepEqual(skaleretIngrediens(kt, 10, 1.5), { maengde: '2', navn: 'æg til pensling', tekst: '2 æg til pensling', skaleret: true, advarsel: null }, 'æg er hele');
  const cp = ret('chorizo-pasta');
  assert.deepEqual(skaleretIngrediens(cp, 1, 3), { maengde: '3', navn: 'store løg', tekst: '3 store løg', skaleret: true, advarsel: null });
  assert.deepEqual(skaleretIngrediens(cp, 9, 3), { maengde: '', navn: 'peber (og evt. salt)', tekst: 'peber (og evt. salt)', skaleret: false, advarsel: null });
  // Alle linjer i alle ugeplan-retter
  for (const r of RETTER.filter((x) => x.model.uge)) {
    for (const f of FAKTORER) {
      r.model.ingredienser.forEach((x, i) => {
        const s = skaleretIngrediens(r.model, i, f);
        const hvor = r.id + ' × ' + f + ': «' + x.tekst + '»';
        // Navnet er bøjet efter et antal uden enhed, der er ændret, og ellers opskriftens. Tallene i navnet på linjerne i
        // TAL_FOR_HELE_LINJEN regnes også om: dem tjekker testen «tal i navnet …» nedenfor
        const navn = s.skaleret && ANTAL_RE.test(s.maengde) ? boejNavn(x.navn, erFlertal(antalAf(s.maengde))) : x.navn;
        if (!TAL_FOR_HELE_LINJEN.some(([id, t]) => id === r.id && t === x.tekst)) assert.equal(s.navn, navn, hvor);
        assert.equal(s.tekst, s.maengde + x.tekst.slice(x.maengde.length).replace(x.navn, () => s.navn), hvor);
        assert.equal(s.skaleret, s.maengde !== x.maengde, hvor);
        assert.deepEqual({ tekst: s.maengde, advarsel: s.advarsel }, sk(x.maengde, f, r.varer[i]), hvor);
      });
    }
  }
});

test('ved faktor 1 er hver linje i hver ugeplan-ret nøjagtig opskriftens (Røst-lyden er lavet af den)', () => {
  for (const r of RETTER.filter((x) => x.model.uge)) {
    r.model.ingredienser.forEach((x, i) => {
      assert.deepEqual(skaleretIngrediens(r.model, i, 1), { maengde: x.maengde, navn: x.navn, tekst: x.tekst, skaleret: false, advarsel: null }, r.id + ': ' + x.tekst);
    });
  }
});

// Alle linjer med et antal uden enhed i alle retter (også dem uden talportioner: bliver en af dem en ugeplan-ret, kan den
// ikke komme med et ord, som skaleringen ikke kan bøje)
const ANTAL_LINJER = RETTER.flatMap(({ id, model }) => model.ingredienser.filter((x) => ANTAL_RE.test(x.maengde)).map((x) => ({ id, ...x, uge: Boolean(model.uge) })));

test('hvert navneord efter et antal uden enhed står i NAVNEORD i js/tekst.js (eller er udtrykkeligt uændret)', () => {
  assert.ok(ANTAL_LINJER.length >= 148, 'linjer med et antal uden enhed: ' + ANTAL_LINJER.length);
  const mangler = ANTAL_LINJER.filter((l) => boejNavn(l.navn, false) === null || boejNavn(l.navn, true) === null);
  assert.deepEqual(mangler.map((l) => l.id + ': «' + l.tekst + '»'), [],
    'skriv navneordet i NAVNEORD i js/tekst.js med ental og flertal (samme ord to gange, hvis det ikke bøjes) og dets køn i KOEN');
  // Opskriften skriver selv den rigtige form efter sit antal: «1 gulerod», «2 gulerødder», «½ agurk», «1 stort løg»
  for (const l of ANTAL_LINJER) assert.equal(boejNavn(l.navn, erFlertal(antalAf(l.maengde))), l.navn, l.id + ': «' + l.tekst + '»');
});

test('hver linje uden enhed regnet om til 1 og til mindst 2 står i ental og flertal', () => {
  let regnet = 0;
  for (const r of RETTER.filter((x) => x.model.uge)) {
    r.model.ingredienser.forEach((x, i) => {
      if (!ANTAL_RE.test(x.maengde)) return;
      const x0 = antalAf(x.maengde);
      const hvor = r.id + ': «' + x.tekst + '»';
      // Til 1 (ved 1 er faktoren 1, og teksten står som i opskriften) og til mindst 2
      const maal = [...(x0 === 1 ? [] : [[1 / x0, '1']]), [x0 >= 2 ? 1.5 : 2 / x0, null]];
      for (const [f, tal] of maal) {
        const s = skaleretIngrediens(r.model, i, f);
        assert.ok(s.skaleret, hvor + ' × ' + f);
        if (tal) assert.equal(s.maengde, tal, hvor + ' × ' + f);
        const flertal = erFlertal(antalAf(s.maengde));
        assert.equal(flertal, tal === null, hvor + ' × ' + f + ' → ' + s.maengde);
        // Navneordet står i den form, NAVNEORD har til antallet (også bag et tillægsord)
        const ord = s.navn.match(/^\p{L}+(?: \p{L}+)?/u)[0].split(' ');
        const former = Object.entries(NAVNEORD).find(([e, fl]) => ord.includes(e) || ord.includes(fl));
        assert.ok(former && ord.includes(former[flertal ? 1 : 0]), hvor + ' × ' + f + ' → ' + s.tekst);
        assert.equal(s.tekst, s.maengde + ' ' + s.navn, hvor);
        regnet++;
      }
    });
  }
  assert.ok(regnet >= 187, 'omregnede linjer: ' + regnet);
});

test('navneordene bøjes rigtigt i de rigtige retter, også med et tillægsord foran', () => {
  const linje = (id, i, f) => skaleretIngrediens(ret(id), i, f).tekst;
  const find = (id, tekst) => ret(id).ingredienser.findIndex((x) => x.tekst === tekst);
  const eksempler = [
    ['koedsovs', '2 gulerødder', 0.5, '1 gulerod'],
    ['koedsovs', '2 gulerødder', 0.75, '1,5 gulerod'], // halvanden gulerod
    ['kikaerteboller-i-karry', '1 gulerod', 2, '2 gulerødder'],
    ['one-pot-tomatpasta', '1 grøntsagsbouillonterning', 2, '2 grøntsagsbouillonterninger'],
    ['chorizo-pasta', '2 grøntsagsbouillonterninger', 0.5, '1 grøntsagsbouillonterning'],
    ['chorizo-pasta', '1 stort løg', 3, '3 store løg'],
    ['chorizo-pasta', '1 stort løg', 0.5, '½ stort løg'],
    ['bagte-kartofler-med-fyld', '4 store kartofler (ca. 1 kg)', 0.25, '1 stor kartoffel (ca. 250 g)'],
    ['koteletter-med-aeble', '2 røde æbler', 0.5, '1 rødt æble'],
    ['orange-pasta-med-hemmelig-groentsagssovs', '2 orange peberfrugter', 0.5, '1 orange peberfrugt'],
    ['tunfrikadeller', '1 løg, groftrevet', 3, '3 løg, groftrevet'],
    ['kyllingefrikadeller', '1 æg', 2, '2 æg'],
    ['kylling-salatbaade-med-ris', '1 icebergsalat', 2, '2 icebergsalater'],
    ['groen-porre-kartoffelsuppe-med-bacondrys', '3 porrer', 0.25, '1 porre'],
    ['kikaerteburger', '4 fuldkornsburgerboller', 0.25, '1 fuldkornsburgerbolle'],
    ['taco-bradepande', '6 tortillas', 0.25, '1,5 tortilla'],
  ];
  for (const [id, foer, f, efter] of eksempler) {
    const i = find(id, foer);
    assert.ok(i >= 0, id + ': «' + foer + '» findes ikke');
    assert.equal(linje(id, i, f), efter, id + ': «' + foer + '» × ' + f);
  }
});

test('tal i navnet for hele linjen regnes om med linjen; procent, vægt pr. emballage og pr. stk. og «1 tsk salt» står som før', () => {
  const tal = (t) => (t.match(/\d+(?:,\d+)?|[½¼¾]/g) || []).join(' ');
  const aendret = [];
  for (const { id, model } of RETTER.filter((r) => r.model.uge)) {
    model.ingredienser.forEach((x, i) => {
      if (!/[\d½¼¾]/.test(x.navn)) return;
      const s = skaleretIngrediens(model, i, 0.5);
      if (tal(s.navn) !== tal(x.navn)) aendret.push([id, x.tekst, s.tekst]);
    });
  }
  assert.deepEqual(aendret.sort(), [...TAL_FOR_HELE_LINJEN].sort());
  const linje = (id, tekst, f) => {
    const m = ret(id);
    return skaleretIngrediens(m, m.ingredienser.findIndex((x) => x.tekst === tekst), f).tekst;
  };
  assert.equal(linje('bagte-kartofler-med-fyld', '4 store kartofler (ca. 1 kg)', 0.25), '1 stor kartoffel (ca. 250 g)');
  assert.equal(linje('laks-med-sproed-rasp', '4 laksefileter, ca. 400 g i alt', 3), '12 laksefileter, ca. 1,2 kg i alt');
  assert.equal(linje('gulerodssuppe-med-linser', '500 g rugbrød (4 skiver til croutoner, resten ved siden af)', 0.25), '130 g rugbrød (1 skive til croutoner, resten ved siden af)');
  assert.equal(linje('tunfrikadeller', '2 dåser tun i vand (ca. 185 g)', 0.5), '1 dåse tun i vand (ca. 185 g)', 'vægten er pr. dåse');
  assert.equal(linje('gyoza-med-noedler-og-groent', '2 poser frosne gyoza (ca. 380 g)', 1.5), '3 poser frosne gyoza (ca. 380 g)', 'vægten er pr. pose');
  assert.equal(linje('chorizo-pasta', '2,5 dl madlavningsfløde 15 %', 2), '5 dl madlavningsfløde 15 %');
  assert.equal(linje('cremet-koedsovs', '3 l vand og 1 tsk salt til pastaen', 0.5), '1,5 l vand og 1 tsk salt til pastaen');
  // Linjer, ingen ret har i dag: en mængde pr. stk. står som før, og en brøk i navnet regnes om (code-reviewer 01-11)
  const linjen = (maengde, navn, f) => skaleretIngrediens({ ingredienser: [{ maengde, navn, tekst: maengde + ' ' + navn }], uge: { tumbi: {} } }, 0, f).tekst;
  assert.equal(linjen('4', 'bøffer à ca. 150 g', 0.5), '2 bøffer à ca. 150 g');
  assert.equal(linjen('4', 'kyllingebryst (ca. 150 g pr. stk.)', 0.5), '2 kyllingebryst (ca. 150 g pr. stk.)');
  assert.equal(linjen('2', 'rugbrød (4 skiver hver)', 0.5), '1 rugbrød (4 skiver hver)');
  assert.equal(linjen('4', 'laksefileter (ca. 600 g i alt)', 0.5), '2 laksefileter (ca. 300 g i alt)');
  assert.equal(linjen('4 dl', 'ris (ca. ½ kg)', 0.5), '2 dl ris (ca. 250 g)');
});

test('stemmen kender kønnet i hver linje regnet om til 1-12 portioner, også efter et tillægsord i flertal', () => {
  // iPad-stemmen læser den omregnede linje (tilTale): «2,5 store løg» er «to og et halvt», ikke «to og en halv»
  assert.equal(tilTale('2,5 store løg'), 'to og et halvt store løg');
  assert.equal(tilTale('2,5 æbler'), 'to og et halvt æbler');
  assert.equal(tilTale('½ små mozzarellakugler'), 'en halv små mozzarellakugler');
  assert.equal(tilTale('1 lille løg'), 'et lille løg');
  const ukendte = [];
  for (const { id, model } of RETTER.filter((r) => r.model.uge)) {
    for (let n = 1; n <= MAKS_PORTIONER; n++) {
      const f = faktorFor(model, n);
      model.ingredienser.forEach((x, i) => {
        const t = skaleretIngrediens(model, i, f).tekst;
        if (ukendtKoen(t).length) ukendte.push(id + ' ved ' + n + ': ' + t);
      });
    }
  }
  assert.deepEqual([...new Set(ukendte)], []);
});

test('boejNavn: ental og flertal, tillægsordet efter kønnet, «eller», resten uændret, null for et ukendt ord', () => {
  assert.equal(boejNavn('gulerødder', false), 'gulerod');
  assert.equal(boejNavn('gulerod', true), 'gulerødder');
  assert.equal(boejNavn('gulerødder', true), 'gulerødder');
  assert.equal(boejNavn('æg til pensling', true), 'æg til pensling');
  assert.equal(boejNavn('stort løg', true), 'store løg');
  assert.equal(boejNavn('store løg', false), 'stort løg', 'et løg');
  assert.equal(boejNavn('store kartofler', false), 'stor kartoffel', 'en kartoffel');
  assert.equal(boejNavn('små mozzarellakugler (mini-mozzarella)', false), 'lille mozzarellakugle (mini-mozzarella)');
  assert.equal(boejNavn('grøn peberfrugt (til stilkene)', true), 'grønne peberfrugter (til stilkene)');
  assert.equal(boejNavn('æbler eller pærer', false), 'æble eller pære');
  assert.equal(boejNavn('æble eller pære til pynt', true), 'æbler eller pærer til pynt');
  assert.equal(boejNavn('æbler eller blommer', false), 'æble eller blommer', 'et ukendt ord efter «eller» står som før');
  assert.equal(boejNavn('laksefileter, ca. 400 g i alt', false), 'laksefilet, ca. 400 g i alt');
  for (const n of ['peber', 'stor portion', '(til pensling)', '', ' gulerod', 'Gulerod']) assert.equal(boejNavn(n, true), null, JSON.stringify(n));
  for (const n of [null, undefined, 3]) assert.throws(() => boejNavn(n, true), TypeError, String(n));
  for (const f of [1, 'ja', undefined]) assert.throws(() => boejNavn('gulerod', f), TypeError, String(f));
});

test('NAVNEORD og TILLAEGSORD passer til KOEN, og ingen form står to steder', () => {
  // Kønnet står kun i KOEN: hvert navneord skal have det, ellers kan tillægsordet («et stort løg») og stemmen ikke bøjes
  for (const e of Object.keys(NAVNEORD)) assert.ok(KOEN[e] === 'n' || KOEN[e] === 't', e + ': køn i KOEN');
  const former = Object.entries(NAVNEORD).flatMap(([e, f]) => (e === f ? [e] : [e, f]));
  assert.equal(new Set(former).size, former.length, 'en form står kun ved ét navneord');
  for (const [en, et, fl] of TILLAEGSORD) {
    if (en === et) assert.equal(KOEN[en], null, en + ': samme form i begge køn, så stemmen ser på navneordet');
    else assert.ok(KOEN[en] === 'n' && KOEN[et] === 't', en + '/' + et + ': kønnet i KOEN');
    assert.ok(!Object.hasOwn(NAVNEORD, fl) && !former.includes(en), en + ': et tillægsord er ikke et navneord');
  }
});

test('noterne til den voksne: trinene altid, to fade over 1,5, hold øje under 0,5, og ingen ved faktor 1', () => {
  const ks = ret('koedsovs');
  const TRIN = 'Mængderne i trinene er til 4 — se ingredienslisten';
  assert.deepEqual(voksenNoter(ks, 1, []), []);
  assert.deepEqual(voksenNoter(ks, 1.5, []), [TRIN]);
  assert.deepEqual(voksenNoter(ks, 1.75, []), [TRIN, 'Brug to fade — tiden kan blive længere']);
  assert.deepEqual(voksenNoter(ks, 3, []), [TRIN, 'Brug to fade — tiden kan blive længere']);
  assert.deepEqual(voksenNoter(ks, 0.5, []), [TRIN]);
  assert.deepEqual(voksenNoter(ks, 0.25, []), [TRIN, 'Hold øje med tiden']);
  assert.equal(portionerTekst(1), '1 portion');
  assert.equal(portionerTekst(6), '6 portioner');
});

// Linjerne til en ret ved faktoren, som retten og printet regner dem
const linjerTil = (m, f) => m.ingredienser.map((x, i) => skaleretIngrediens(m, i, f));

test('noterne siger det, når en mængde ikke kunne regnes om, eller dejen er rundet op til hele', () => {
  const TRIN = 'Mængderne i trinene er til 4 — se ingredienslisten';
  const FADE = 'Brug to fade — tiden kan blive længere';
  const FORM = 'Dej og form er rundet op til hele — formen passer måske ikke';
  // En linje uden mængde («peber (og evt. salt)», «revet ost til servering») tæller ikke som en mængde, der ikke kunne
  // regnes om: den voksne ville lede efter en mængde, der ikke står der (ui-reviewer 01-11)
  const cp = ret('chorizo-pasta');
  assert.deepEqual(voksenNoter(cp, 3, linjerTil(cp, 3)), [TRIN, FADE]);
  const ks = ret('koedsovs');
  assert.deepEqual(voksenNoter(ks, 0.75, linjerTil(ks, 0.75)), [TRIN]);
  // Et interval («8-10 g») kan ikke regnes om. Ingen ugeplan-ret har et i dag, så linjerne er skrevet her
  assert.deepEqual(voksenNoter(ks, 0.75, [{ advarsel: 'ukendt' }, { advarsel: null }]), [TRIN, 'Én mængde kunne ikke regnes om og står som til 4']);
  assert.deepEqual(voksenNoter(ks, 1.5, [{ advarsel: 'ukendt' }, { advarsel: 'ukendt' }]), [TRIN, '2 mængder kunne ikke regnes om og står som til 4']);
  // Kyllingetærten har «1 rulle færdig butterdej»: rundet op, både når den ganges og halveres
  const kt = ret('kyllingetaerte-med-butterdej');
  assert.deepEqual(voksenNoter(kt, 1.5, linjerTil(kt, 1.5)), [TRIN, FORM]);
  assert.deepEqual(voksenNoter(kt, 0.5, linjerTil(kt, 0.5)), [TRIN, FORM]);
  // One-pot-tomatpastaen kan regnes helt om
  const tp = ret('one-pot-tomatpasta');
  assert.deepEqual(voksenNoter(tp, 1.5, linjerTil(tp, 1.5)), [TRIN]);
  assert.deepEqual(voksenNoter(cp, 1, linjerTil(cp, 1)), [], 'faktor 1: ingen noter');
});
