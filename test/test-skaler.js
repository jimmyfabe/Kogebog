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
// så skal formatet enten have en regel i js/skaler.js eller skrives på listen her
const UKENDTE = ['', '1 stort', '8-10 g'];

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
      if (f === 3 && s.advarsel === null && !l.maengde.endsWith('knivspids')) assert.notEqual(s.tekst, l.maengde, hvor);
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
  'tom, «stort» og ukendt format: uændret med advarslen ukendt': [
    ['', 0.5, '', 'ukendt'], ['1 stort', 1.5, '1 stort', 'ukendt'], ['8-10 g', 0.5, '8-10 g', 'ukendt'], ['lidt', 3, 'lidt', 'ukendt'],
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

test('en ingrediens i retten: mængden regnes om, navnet står som før, og advarslen følger med', () => {
  const tp = ret('one-pot-tomatpasta');
  assert.deepEqual(skaleretIngrediens(tp, 0, 1.5), { maengde: '450 g', tekst: '450 g penne', skaleret: true, advarsel: null });
  assert.deepEqual(skaleretIngrediens(tp, 9, 1.5), { maengde: '1 knivspids', tekst: '1 knivspids peber', skaleret: false, advarsel: null });
  const kt = ret('kyllingetaerte-med-butterdej');
  assert.deepEqual(skaleretIngrediens(kt, 9, 1.5), { maengde: '2 ruller', tekst: '2 ruller færdig butterdej', skaleret: true, advarsel: 'form' });
  // Halveret er dejen stadig én rulle: ikke skaleret, men formen passer måske ikke
  assert.deepEqual(skaleretIngrediens(kt, 9, 0.5), { maengde: '1 rulle', tekst: '1 rulle færdig butterdej', skaleret: false, advarsel: 'form' });
  assert.deepEqual(skaleretIngrediens(kt, 10, 1.5), { maengde: '2', tekst: '2 æg til pensling', skaleret: true, advarsel: null }, 'æg er hele');
  const cp = ret('chorizo-pasta');
  assert.deepEqual(skaleretIngrediens(cp, 1, 3), { maengde: '1 stort', tekst: '1 stort løg', skaleret: false, advarsel: 'ukendt' });
  assert.deepEqual(skaleretIngrediens(cp, 9, 3), { maengde: '', tekst: 'peber (og evt. salt)', skaleret: false, advarsel: 'ukendt' });
  // Alle linjer i alle ugeplan-retter
  for (const r of RETTER.filter((x) => x.model.uge)) {
    for (const f of FAKTORER) {
      r.model.ingredienser.forEach((x, i) => {
        const s = skaleretIngrediens(r.model, i, f);
        const hvor = r.id + ' × ' + f + ': «' + x.tekst + '»';
        assert.equal(s.tekst, s.maengde + x.tekst.slice(x.maengde.length), hvor);
        assert.equal(s.skaleret, s.maengde !== x.maengde, hvor);
        assert.deepEqual({ tekst: s.maengde, advarsel: s.advarsel }, sk(x.maengde, f, r.varer[i]), hvor);
      });
    }
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
  // Chorizo-pastaen har «1 stort løg» og «peber (og evt. salt)» uden mængde
  const cp = ret('chorizo-pasta');
  assert.deepEqual(voksenNoter(cp, 3, linjerTil(cp, 3)), [TRIN, FADE, '2 mængder kunne ikke regnes om og står som til 4']);
  // Kødsovsen har kun «revet ost til servering»
  const ks = ret('koedsovs');
  assert.deepEqual(voksenNoter(ks, 0.75, linjerTil(ks, 0.75)), [TRIN, 'Én mængde kunne ikke regnes om og står som til 4']);
  // Kyllingetærten har «1 rulle færdig butterdej»: rundet op, både når den ganges og halveres
  const kt = ret('kyllingetaerte-med-butterdej');
  assert.deepEqual(voksenNoter(kt, 1.5, linjerTil(kt, 1.5)), [TRIN, FORM]);
  assert.deepEqual(voksenNoter(kt, 0.5, linjerTil(kt, 0.5)), [TRIN, FORM]);
  // One-pot-tomatpastaen kan regnes helt om
  const tp = ret('one-pot-tomatpasta');
  assert.deepEqual(voksenNoter(tp, 1.5, linjerTil(tp, 1.5)), [TRIN]);
  assert.deepEqual(voksenNoter(cp, 1, linjerTil(cp, 1)), [], 'faktor 1: ingen noter');
});
