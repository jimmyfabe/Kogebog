// test-maerker.js — mærkerne på en ret (js/maerker.js, docs/foraeldredel.md afsnit 5) og «slags» på kød- og fiskevarerne
// i js/katalog.js, som vegetar og fisk bygger på.
// Kør:  node test/test-maerker.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maerkerFor, MAERKER, GROENT_G, BILLIG_KR } from '../js/maerker.js';
import { lavModel, LYN_MIN } from '../js/model.js';
import { VARER, AFDELINGER, ENHEDER, INGREDIENSER } from '../js/katalog.js';
import { validerVarer } from './test-opskrifter.js';
import { tomFamilie } from '../js/lager.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (id) => JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'));
// En rigtig ret som model, eventuelt rettet først i opskriftens JSON
const model = (id, aendr = () => {}) => { const d = json(id); aendr(d); return lavModel(d); };
const har = (m, k, valg) => maerkerFor(m, valg).includes(k);
const ALLE = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper.flatMap((g) => g.retter);
const UGEPLAN = ALLE.map((id) => model(id)).filter((m) => m.uge);
const KNIV = ['skaere', 'rive'];

test('MAERKER har de otte mærker i fast rækkefølge, hver med ikon og dansk navn', () => {
  assert.deepEqual(Object.keys(MAERKER), ['hurtig', 'groent', 'billig', 'ingenKniv', 'vegetar', 'fisk', 'ny', 'favorit']);
  for (const [k, { ikon, navn, ...andet }] of Object.entries(MAERKER)) {
    assert.ok(typeof ikon === 'string' && ikon.trim(), k + ': ikon');
    assert.ok(typeof navn === 'string' && navn.trim(), k + ': navn');
    assert.deepEqual(andet, {}, k + ': kun ikon og navn');
  }
  assert.equal(new Set(Object.values(MAERKER).map((x) => x.navn)).size, 8, 'navnene er aria-label og skal være forskellige');
  assert.equal(GROENT_G, 250);
  assert.equal(BILLIG_KR, 12);
});

test('favorit er et rødt hjerte som på færdig-skærmen, og der står ingen ⭐ i appens filer', () => {
  // U+2764 med U+FE0F: uden den kan hjertet stå som et sort tegn i stedet for den røde emoji
  assert.equal(MAERKER.favorit.ikon, '\u2764\uFE0F');
  assert.equal(MAERKER.favorit.navn, 'Favorit', 'skærmlæseren siger stadig «Favorit»');
  const filer = ['app.js', 'app.css', 'familie.css', 'print.css', 'index.html', 'print.html',
    ...fs.readdirSync(path.join(ROD, 'js')).map((f) => 'js/' + f)];
  assert.deepEqual(filer.filter((f) => fs.readFileSync(path.join(ROD, f), 'utf8').includes('\u2B50')), []);
});

test('masser af grønt: mindst GROENT_G gram pr. portion, også lige på grænsen', () => {
  for (const p of [1, 3, 4, 12]) {
    const groent = (g) => har(model('koedsovs', (d) => { Object.assign(d.tumbi, { portioner: p, groent_g: g }); }), 'groent');
    assert.equal(groent(GROENT_G * p), true, p + ' portioner på grænsen');
    assert.equal(groent(GROENT_G * p + 1), true, p + ' portioner over');
    assert.equal(groent(GROENT_G * p - 1), false, p + ' portioner under');
  }
  // Uden gyldige portioner kan der ikke regnes pr. portion
  for (const p of [undefined, 0, 2.5]) assert.equal(har(model('koedsovs', (d) => { Object.assign(d.tumbi, { portioner: p, groent_g: 5000 }); }), 'groent'), false);
});

test('billig: højst BILLIG_KR kroner pr. portion, også lige på grænsen', () => {
  for (const p of [1, 3, 4, 12]) {
    const billig = (kr) => har(model('koedsovs', (d) => { Object.assign(d.tumbi, { portioner: p, pris_kr: kr }); }), 'billig');
    assert.equal(billig(BILLIG_KR * p), true, p + ' portioner på grænsen');
    assert.equal(billig(BILLIG_KR * p - 1), true, p + ' portioner under');
    assert.equal(billig(BILLIG_KR * p + 1), false, p + ' portioner over');
  }
  // En pris på 0 eller ingen pris er ikke billig, men en fejl (validatoren fanger den)
  for (const kr of [0, undefined, '40']) assert.equal(har(model('koedsovs', (d) => { Object.assign(d.tumbi, { portioner: 4, pris_kr: kr }); }), 'billig'), false);
});

test('hurtig: højst LYN_MIN minutter i alt, som ⚡ i js/model.js', () => {
  const hurtig = (tid) => har(model('koedsovs', (d) => { if (tid === undefined) delete d.totalTime; else d.totalTime = tid; }), 'hurtig');
  assert.equal(hurtig('PT' + LYN_MIN + 'M'), true);
  assert.equal(hurtig('PT' + (LYN_MIN - 1) + 'M'), true);
  assert.equal(hurtig('PT' + (LYN_MIN + 1) + 'M'), false);
  assert.equal(hurtig('PT0M'), false);
  assert.equal(hurtig(undefined), false);
});

test('ingen kniv: intet trin med verbet skaere eller rive', () => {
  // Kødsovsen hakker løget (skaere) og river guleroden (rive)
  const ks = json('koedsovs').recipeInstructions.map((s) => s.tumbi.verbum);
  assert.ok(ks.includes('skaere') && ks.includes('rive'));
  assert.equal(har(model('koedsovs'), 'ingenKniv'), false);
  const uden = (verber) => model('koedsovs', (d) => { d.recipeInstructions = d.recipeInstructions.filter((s) => !verber.includes(s.tumbi.verbum)); });
  assert.equal(har(uden(['skaere']), 'ingenKniv'), false, 'rivejernet er også kniv');
  assert.equal(har(uden(['rive']), 'ingenKniv'), false);
  assert.equal(har(uden(KNIV), 'ingenKniv'), true);
  // Dåseåbneren («Hæld tomaterne i gryden.» med voksen-hjælp «kniv») er ikke en kniv: one-pot-tomatpastaen har ingen af verberne
  const tp = json('one-pot-tomatpasta').recipeInstructions.map((s) => s.tumbi);
  assert.ok(tp.some((t) => t.voksen_hjaelp === 'kniv') && !tp.some((t) => KNIV.includes(t.verbum)));
  assert.equal(har(model('one-pot-tomatpasta'), 'ingenKniv'), true);
  // Det samme for alle rigtige retter i ugeplanen
  for (const m of UGEPLAN) assert.equal(har(m, 'ingenKniv'), !m.trin.some((t) => KNIV.includes(t.verbum)), m.id);
});

test('vegetar og fisk på de rigtige retter', () => {
  const slags = (id) => maerkerFor(model(id)).filter((k) => k === 'vegetar' || k === 'fisk');
  // Grøntsagsbouillon (også «½ bouillonterning» i kålpandekagerne) er vegetar; pladepizza og taco-bradepande er uden kød
  for (const id of ['linse-dhal', 'minestrone', 'kaalpandekager', 'pladepizza', 'taco-bradepande']) assert.deepEqual(slags(id), ['vegetar'], id);
  // Kød med sit eget ikon: chorizo, pølser, skinke og gyoza med kylling
  for (const id of ['koedsovs', 'chorizo-pasta', 'poelse-boennegryde', 'floedekartofler-med-skinke-og-broccoli', 'gyoza-med-noedler-og-groent']) {
    assert.deepEqual(slags(id), [], id);
  }
  // Fisk: makrel og tun har deres egne ikoner, laks og fiskepinde har «koed»
  for (const id of ['rugbroedsaften', 'lun-tunpasta', 'pasta-med-laks-spinat-og-citron', 'fiskepinde-med-baade']) assert.deepEqual(slags(id), ['fisk'], id);
  // En linje uden kendt vare kunne være kød, så retten er ikke vegetar
  for (const vare of ['ukendt', 'constructor', undefined]) {
    assert.equal(har(model('linse-dhal', (d) => { d.tumbi.ingredienser[0].vare = vare; }), 'vegetar'), false, String(vare));
  }
  // En ret uden for ugeplanen har ingen varer: hverken vegetar eller fisk, og intet grønt eller pris
  const pk = model('pandekager');
  assert.equal(pk.uge, null);
  assert.deepEqual(maerkerFor(pk).filter((k) => ['groent', 'billig', 'vegetar', 'fisk'].includes(k)), []);
});

test('ny og favorit kommer kun med, når familien er givet, og ny først, når familien har lavet en ret', () => {
  const m = model('linse-dhal');
  for (const valg of [undefined, {}, { familie: undefined }, { familie: null }]) {
    const mk = maerkerFor(m, valg);
    assert.ok(!mk.includes('ny') && !mk.includes('favorit'), JSON.stringify(valg));
  }
  const fam = (favoritter, lavet) => ({ familie: { v: 1, voksne: null, boern: null, barnAndel: 0.7, udvalg: null, favoritter, lavet } });
  // Før den første ret er lavet, er ingen ret «ny for os» (ellers var alle retter nye)
  assert.equal(har(m, 'ny', { familie: tomFamilie() }), false);
  assert.equal(har(m, 'ny', fam([], {})), false);
  assert.equal(har(m, 'ny', { familie: { ...tomFamilie(), lavet: { andenRet: { gange: 1, sidst: '2026-10-31' } } } }), true);
  assert.equal(har(m, 'favorit', fam([], {})), false);
  assert.equal(har(m, 'ny', fam([], { 'linse-dhal': { gange: 1, sidst: '2026-10-31' } })), false);
  assert.equal(har(m, 'ny', fam([], { 'koedsovs': { gange: 2, sidst: '2026-10-30' } })), true);
  assert.equal(har(m, 'favorit', fam(['koedsovs', 'linse-dhal'], {})), true);
  assert.equal(har(m, 'favorit', fam(['koedsovs'], {})), false);
  // Forkerte typer inde i familien giver standardværdierne (ingen favoritter, intet lavet) i stedet for en fejl
  assert.deepEqual(maerkerFor(m, fam('linse-dhal', null)).filter((k) => k === 'ny' || k === 'favorit'), []);
  // Object.hasOwn: «constructor» er ikke lavet, fordi alle objekter arver navnet
  assert.equal(har({ ...m, id: 'constructor' }, 'ny', fam([], { 'koedsovs': { gange: 2, sidst: '2026-10-30' } })), true);
});

test('forkerte argumenter giver en TypeError', () => {
  for (const m of [null, undefined, 'linse-dhal', 42, []]) assert.throws(() => maerkerFor(m), TypeError, String(m));
  for (const familie of ['x', 3, [], true]) assert.throws(() => maerkerFor(model('linse-dhal'), { familie }), TypeError, String(familie));
});

test('mærkerne kommer i MAERKERs rækkefølge, og hvert mærke findes på en rigtig ret i ugeplanen', () => {
  const orden = Object.keys(MAERKER);
  const set = new Set();
  for (const id of ALLE) {
    const m = model(id);
    const mk = maerkerFor(m, { familie: { favoritter: [id], lavet: { andenRet: { gange: 1, sidst: '2026-10-31' } } } });
    assert.deepEqual(mk, orden.filter((k) => mk.includes(k)), id);
    assert.ok(!(mk.includes('vegetar') && mk.includes('fisk')), id + ': vegetar og fisk udelukker hinanden');
    if (m.uge) for (const k of mk) set.add(k);
  }
  assert.deepEqual(orden.filter((k) => !set.has(k)), []);
  // En ret med alle mærker undtagen fisk
  const alt = model('linse-dhal', (d) => {
    d.totalTime = 'PT' + LYN_MIN + 'M';
    Object.assign(d.tumbi, { portioner: 4, groent_g: GROENT_G * 4, pris_kr: BILLIG_KR * 4 });
    d.recipeInstructions = d.recipeInstructions.filter((s) => !KNIV.includes(s.tumbi.verbum));
  });
  const lavet = { andenRet: { gange: 1, sidst: '2026-10-31' } };
  assert.deepEqual(maerkerFor(alt, { familie: { favoritter: ['linse-dhal'], lavet } }), ['hurtig', 'groent', 'billig', 'ingenKniv', 'vegetar', 'ny', 'favorit']);
});

test('kød- og fiskevarerne i katalog.js har «slags», og validatoren fejler uden det', () => {
  const forvent = { 'chorizo': 'koed', 'partypoelser': 'koed', 'skinketern': 'koed', 'gyoza': 'koed', 'bacon-tern': 'koed', 'hakket-svinekoed': 'koed',
    'makrel-tomat': 'fisk', 'tun': 'fisk', 'varmroeget-laks': 'fisk', 'laksefileter': 'fisk', 'fiskefileter': 'fisk', 'fiskepinde': 'fisk' };
  for (const [id, s] of Object.entries(forvent)) assert.equal(VARER[id].slags, s, id);
  // Grøntsagsbouillon er ikke kød
  assert.equal(VARER.bouillonterninger.slags, undefined);
  const varer = (aendr) => { const v = structuredClone(VARER); aendr(v); return validerVarer({ VARER: v, AFDELINGER, ENHEDER, INGREDIENSER }); };
  assert.deepEqual(varer(() => {}), []);
  for (const id of ['chorizo', 'makrel-tomat', 'hakket-oksekoed']) {
    const fejl = varer((v) => { delete v[id].slags; });
    assert.ok(fejl.some((f) => f.startsWith('js/katalog.js: VARER «' + id + '»: ikonet «' + VARER[id].ikon + '» er kød eller fisk')), fejl.join('\n'));
  }
  const fejl = varer((v) => { v.chorizo.slags = 'svin'; });
  assert.ok(fejl.includes('js/katalog.js: VARER «chorizo»: «slags» skal være "koed" eller "fisk" (udelad feltet ellers), fandt "svin"'), fejl.join('\n'));
});
