// test-groent.js — «Mere grønt i maden» (js/groent.js): rettelsen oven på grundretten giver en ny opskrift med halvt kød og
// røde linser, grundretten røres ikke, og hver linje og hvert trin har den lydfil, der siger netop dens tekst.
// Testen bruger sin egen rettelse på kødsovsen (ikke den i opskriften), så den ikke går i stykker, når opskriften rettes.
// Kør:  node test/test-groent.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { medMereGroent, patchFejl, harMereGroent, valgt } from '../js/groent.js';
import { lavModel } from '../js/model.js';
import * as R from '../js/replikker.js';
import { lavTaleliste } from '../vaerktoej/lav-taleliste.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Kødsovsen uden sin egen rettelse: 12 ingredienser (linje 1 er «500 g hakket oksekød») og 13 trin (trin 7 er tomaterne)
function koedsovs() {
  const d = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/koedsovs.json'), 'utf8'));
  delete d.tumbi.mere_groent;
  return d;
}
const LINSER = { efter: 6, tekst: '100 g røde linser', ikon: 'linser', maengde: '100 g', vare: 'roede-linser', antal: 100, enhed: 'g' };
const VAND = { efter: 6, tekst: '3 dl vand', ikon: 'vand', maengde: '3 dl', vare: 'vand' };
const LINSE_TRIN = { efter: 6, '@type': 'HowToStep', text: 'Hæld linser og 3 dl vand i gryden.', tumbi: { verbum: 'haelde', voksen: true, voksen_hjaelp: 'varme', ikoner: ['linser', 'vand'] } };
function medRettelse(aendr = () => {}) {
  const d = koedsovs();
  d.tumbi.mere_groent = {
    ingredienser: [{ i: 1, tekst: '250 g hakket oksekød', antal: 250 }],
    nye_ingredienser: [structuredClone(LINSER), structuredClone(VAND)],
    nye_trin: [structuredClone(LINSE_TRIN)],
    pris_kr: 63,
    groent_g: 1070,
  };
  aendr(d.tumbi.mere_groent, d);
  return d;
}
const lyd = (d) => d.tumbi.ingredienser.map((x) => x.lyd);
const trinLyd = (d) => d.recipeInstructions.map((s) => s.tumbi.lyd);
const tal = (fra, til, foer = '') => Array.from({ length: til - fra + 1 }, (_, k) => foer + (fra + k));

test('uden rettelse: null, og valgt() giver grundretten', () => {
  const d = koedsovs();
  assert.equal(harMereGroent(d), false);
  assert.equal(medMereGroent(d), null);
  assert.deepEqual(patchFejl(d), []);
  const m = lavModel(d);
  assert.equal(m.groen, null);
  assert.equal(m.erGroen, false);
  assert.equal(valgt(m, true), m);
  assert.equal(valgt(m, false), m);
  // Grundretten har ingen «lyd», så filerne er de samme som før
  assert.ok(m.ingredienser.every((x) => x.lyd === null) && m.trin.every((t) => t.lyd === null));
  assert.equal(R.ingrediens(m, 1).fil, 'koedsovs/ingrediens-2.mp3');
  assert.equal(R.trin(m, m.trin[7]).fil, 'koedsovs/8.mp3');
});

test('rettelsen giver en ny opskrift: halvt kød, linser og vand efter tomatpuréen og et nyt trin efter tomaterne', () => {
  const d = medRettelse();
  const foer = structuredClone(d);
  const g = medMereGroent(d);
  assert.deepEqual(d, foer, 'grundretten må ikke ændres');
  assert.equal('mere_groent' in g.tumbi, false);
  assert.deepEqual(g.recipeIngredient, [...foer.recipeIngredient.slice(0, 1), '250 g hakket oksekød', ...foer.recipeIngredient.slice(2, 7),
    '100 g røde linser', '3 dl vand', ...foer.recipeIngredient.slice(7)]);
  // Den skiftede linje beholder vare, ikon og enhed; mængden følger teksten
  assert.deepEqual(g.tumbi.ingredienser[1], { ikon: 'koed', maengde: '250 g', vare: 'hakket-oksekoed', antal: 250, enhed: 'g', lyd: 'groen-ingrediens-2' });
  assert.deepEqual(g.tumbi.ingredienser[7], { ikon: 'linser', maengde: '100 g', vare: 'roede-linser', antal: 100, enhed: 'g', lyd: 'groen-ingrediens-8' });
  assert.deepEqual(g.tumbi.ingredienser[8], { ikon: 'vand', maengde: '3 dl', vare: 'vand', lyd: 'groen-ingrediens-9' });
  assert.deepEqual(lyd(g), ['ingrediens-1', 'groen-ingrediens-2', ...tal(3, 7, 'ingrediens-'), 'groen-ingrediens-8', 'groen-ingrediens-9', ...tal(8, 12, 'ingrediens-')]);
  // Trinene: det nye står som trin 8, og de gamle trin 8-13 er nu 9-14 med deres gamle filer
  assert.equal(g.recipeInstructions.length, 14);
  assert.deepEqual(g.recipeInstructions[7], { '@type': 'HowToStep', text: LINSE_TRIN.text, tumbi: { ...LINSE_TRIN.tumbi, lyd: 'groen-8' } });
  assert.deepEqual(trinLyd(g), [...tal(1, 7), 'groen-8', ...tal(8, 13)]);
  assert.equal(g.recipeInstructions[8].text, foer.recipeInstructions[7].text);
  assert.equal(g.tumbi.pris_kr, 63);
  assert.equal(g.tumbi.groent_g, 1070);
  // Resten er grundrettens
  for (const k of ['name', 'image', 'totalTime', 'recipeYield']) assert.equal(g[k], foer[k]);
  assert.equal(g.tumbi.id, 'koedsovs');
});

test('nye punkter først (efter: -1) og flere efter samme punkt i rettelsens rækkefølge; et skiftet trin får sin egen fil', () => {
  const d = medRettelse((p) => {
    p.nye_ingredienser.unshift({ ...LINSER, efter: -1, tekst: '50 g røde linser', maengde: '50 g', antal: 50 });
    p.trin = [{ i: 7, '@type': 'HowToStep', text: 'Lad sovsen småkoge i 25 minutter.', tumbi: { verbum: 'koge', voksen: true, voksen_hjaelp: 'varme', timer_sek: 1500 } }];
  });
  const g = medMereGroent(d);
  assert.equal(g.recipeIngredient[0], '50 g røde linser');
  assert.deepEqual(g.recipeIngredient.slice(8, 10), ['100 g røde linser', '3 dl vand']);
  assert.deepEqual(lyd(g).slice(0, 3), ['groen-ingrediens-1', 'ingrediens-1', 'groen-ingrediens-3']);
  // Trin 8 i grundretten (indeks 7) er skiftet ud og står efter det nye trin
  assert.equal(g.recipeInstructions[8].text, 'Lad sovsen småkoge i 25 minutter.');
  assert.deepEqual(trinLyd(g), [...tal(1, 7), 'groen-8', 'groen-9', ...tal(9, 13)]);
});

test('en skiftet linje uden mængde beholder en tom mængde', () => {
  const g = medMereGroent(medRettelse((p) => { p.ingredienser.push({ i: 11, tekst: 'lidt revet ost til servering', antal: 50 }); }));
  assert.deepEqual(g.tumbi.ingredienser[13], { ikon: 'ost', maengde: '', vare: 'revet-ost', antal: 50, enhed: 'g', lyd: 'groen-ingrediens-14' });
});

test('forkert form: patchFejl siger hvad, og medMereGroent kaster en Error i stedet for at vise retten med alt kødet', () => {
  const tilfaelde = [
    [(p, d) => { d.tumbi.mere_groent = []; }, '«tumbi.mere_groent» skal være et objekt'],
    [(p) => { p.kartofler = []; }, 'ukendt felt «kartofler»'],
    [(p) => { p.ingredienser = {}; }, '«ingredienser» skal være en liste'],
    [(p) => { p.ingredienser[0].i = 12; }, 'ingredienser 1: «i» skal være et heltal fra 0 til 11'],
    [(p) => { p.ingredienser[0].i = '1'; }, 'ingredienser 1: «i» skal være et heltal fra 0 til 11'],
    [(p) => { p.ingredienser.push({ i: 1, tekst: '200 g hakket oksekød', antal: 200 }); }, 'ingredienser 2: linje 1 skiftes to gange'],
    [(p) => { p.ingredienser[0].vare = 'hakket-svinekoed'; }, 'ingredienser 1: ukendt felt «vare»'],
    [(p) => { delete p.ingredienser[0].antal; }, 'ingredienser 1: «antal» skal stå der, præcis når grundrettens linje har et'],
    [(p) => { p.ingredienser[0].antal = 0; }, 'ingredienser 1: «antal» skal være et tal over 0'],
    [(p) => { p.ingredienser[0].tekst = ' '; }, 'ingredienser 1: «tekst» skal være en tekst, der ikke er tom'],
    [(p) => { p.nye_ingredienser[0].efter = -2; }, 'nye_ingredienser 1: «efter» skal være et heltal fra -1 til 11'],
    [(p) => { p.nye_ingredienser[0].efter = 12; }, 'nye_ingredienser 1: «efter» skal være et heltal fra -1 til 11'],
    [(p) => { p.nye_ingredienser[1] = '3 dl vand'; }, 'nye_ingredienser 2: skal være et objekt'],
    [(p) => { p.nye_ingredienser[0].lyd = 'groen-ingrediens-8'; }, 'nye_ingredienser 1: «lyd» skrives ikke i opskriften'],
    [(p) => { p.nye_trin[0].efter = 13; }, 'nye_trin 1: «efter» skal være et heltal fra -1 til 12'],
    [(p) => { delete p.nye_trin[0].text; }, 'nye_trin 1: «text» skal være en tekst, der ikke er tom'],
    [(p) => { p.nye_trin[0].tumbi.lyd = 'groen-8'; }, 'nye_trin 1: «tumbi.lyd» skrives ikke i opskriften'],
    [(p) => { p.trin = [{ i: 13, '@type': 'HowToStep', text: 'Spis.', tumbi: { verbum: 'smage' } }]; }, 'trin 1: «i» skal være et heltal fra 0 til 12'],
    [(p) => { delete p.pris_kr; }, '«pris_kr» skal stå der, præcis når grundretten har «tumbi.pris_kr»'],
    [(p, d) => { delete d.tumbi.groent_g; }, '«groent_g» skal stå der, præcis når grundretten har «tumbi.groent_g»'],
    [(p) => { p.groent_g = 1070.5; }, '«groent_g» skal være et heltal fra 0'],
  ];
  for (const [aendr, forventet] of tilfaelde) {
    const d = medRettelse(aendr);
    const fejl = patchFejl(d);
    assert.ok(fejl.some((f) => f.startsWith(forventet)), 'forventede «' + forventet + '», fik:\n  ' + fejl.join('\n  '));
    assert.throws(() => medMereGroent(d), (e) => e instanceof Error && e.message.includes(forventet) && e.message.includes('koedsovs'));
    assert.throws(() => lavModel(d), Error);
  }
  assert.deepEqual(patchFejl(medRettelse()), []);
});

test('lavModel: m.groen er retten med mere grønt, og stemmen siger hver tekst med sin egen fil', () => {
  const m = lavModel(medRettelse());
  const g = m.groen;
  assert.equal(g.erGroen, true);
  assert.equal(g.groen, null);
  assert.equal(valgt(m, true), g);
  assert.equal(valgt(m, false), m);
  assert.equal(valgt(m, 'true'), m, 'kun true slår den til');
  assert.equal(g.id, m.id);
  assert.equal(g.navn, m.navn);
  assert.equal(g.uge.prisKr, 63);
  assert.deepEqual(g.uge.tumbi.ingredienser.filter((x) => x.vare === 'roede-linser').map((x) => x.antal), [100]);
  assert.deepEqual(R.ingrediens(g, 1), { tekst: '250 g hakket oksekød', fil: 'koedsovs/groen-ingrediens-2.mp3' });
  assert.deepEqual(R.ingrediens(g, 2), R.ingrediens(m, 2));
  assert.deepEqual(R.trin(g, g.trin[7]), { tekst: LINSE_TRIN.text, fil: 'koedsovs/groen-8.mp3' });
  // Trin 9 i retten med mere grønt er grundrettens trin 8 og siger det med grundrettens fil
  assert.deepEqual(R.trin(g, g.trin[8]), R.trin(m, m.trin[7]));
  assert.equal(g.trin[8].nr, 9);
  // Talelisten: hver fil har én tekst, også med begge udgaver af retten (lavTaleliste kaster ellers)
  const liste = lavTaleliste([m]);
  const filer = liste.map((x) => x.fil);
  for (const f of ['koedsovs/groen-ingrediens-2.mp3', 'koedsovs/groen-ingrediens-8.mp3', 'koedsovs/groen-ingrediens-9.mp3', 'koedsovs/groen-8.mp3']) assert.ok(filer.includes(f), f);
  assert.equal(filer.filter((f) => /\/groen-/.test(f)).length, 4);
  // Timeren på trin 9 i retten med mere grønt («Lad sovsen småkoge»): «Der kører allerede en timer på … trin 9»
  assert.ok(filer.includes('koedsovs/timer-optaget-9.mp3'));
});

// Linserne skal koge med, så rettens timere bliver længere. Tiden i alt (og kogetiden) følger med, rundet op til 5 minutter;
// forberedelsen er den samme. Kødsovsens linser koger med i den småkogning, der var der i forvejen, så den er uændret
test('tiden i alt følger rettens timere: hyrdetærten med mere grønt tager 60 minutter, kødsovsen stadig 50', () => {
  const laes = (id) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
  const hyrde = laes('hyrdetaerte');
  const g = medMereGroent(hyrde);
  assert.deepEqual([g.totalTime, g.cookTime, g.prepTime], ['PT60M', 'PT50M', hyrde.prepTime]);
  assert.equal(lavModel(hyrde).groen.minutter, 60);
  assert.equal(lavModel(hyrde).minutter, 50, 'grundretten er som før');
  const koed = laes('koedsovs');
  assert.deepEqual([medMereGroent(koed).totalTime, medMereGroent(koed).cookTime], [koed.totalTime, koed.cookTime]);
  assert.equal(koed.totalTime, 'PT50M');
  // Uden timere i trinnene (rettelsen her har ingen) står tiderne, som de var
  const d = medRettelse();
  assert.deepEqual([medMereGroent(d).totalTime, medMereGroent(d).cookTime], [d.totalTime, d.cookTime]);
});
