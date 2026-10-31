// test-validator.js — viser, at test-opskrifter.js fejler med en tydelig besked, når en fil er ødelagt.
// Hver test kopierer opskrifter/ og grafik/ (og en tom lydliste) til en midlertidig mappe og ødelægger én ting.
// Kør:  node test/test-validator.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { valider, validerVarer } from './test-opskrifter.js';
import { VARER, AFDELINGER, ENHEDER, INGREDIENSER } from '../js/katalog.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function kopi() {
  const ny = fs.mkdtempSync(path.join(os.tmpdir(), 'kog-val-'));
  for (const m of ['opskrifter', 'grafik']) fs.cpSync(path.join(ROD, m), path.join(ny, m), { recursive: true });
  // Lydfilerne (377 filer, ca. 8 MB) kopieres ikke, det gjorde testen fire gange langsommere: kopien får en tom
  // lydliste. De rigtige lydfiler tjekkes af «de rigtige opskrifter er gyldige» og af test-lyd.js
  fs.mkdirSync(path.join(ny, 'lyd'));
  fs.writeFileSync(path.join(ny, 'lyd/liste.json'), JSON.stringify({ version: 1, filer: [] }));
  return ny;
}
const ryd = (mappe) => fs.rmSync(mappe, { recursive: true, force: true });
const laes = (mappe, fil) => JSON.parse(fs.readFileSync(path.join(mappe, fil), 'utf8'));
const skriv = (mappe, fil, data) => fs.writeFileSync(path.join(mappe, fil), typeof data === 'string' ? data : JSON.stringify(data, null, 2));

// Ret opskriften og forvent præcis den fejl (som tekststykke)
function forventFejl(fil, ret, forventet) {
  const m = kopi();
  try {
    const data = laes(m, fil);
    ret(data, m);
    skriv(m, fil, data);
    const { fejl } = valider(m);
    assert.ok(fejl.some((f) => f.includes(forventet)), 'forventede en fejl med «' + forventet + '», fik:\n  ' + fejl.join('\n  '));
    return fejl;
  } finally { ryd(m); }
}

const ANTAL_RETTER = laes(ROD, 'opskrifter/index.json').grupper.flatMap((g) => g.retter).length;
const gruppe = (d, id) => d.grupper.find((g) => g.id === id);

test('de rigtige opskrifter er gyldige', () => {
  const { fejl, tal } = valider(ROD);
  assert.deepEqual(fejl, []);
  assert.equal(tal.retter, ANTAL_RETTER);
});

test('retter i docs/venter-paa-billede valideres, uden billede og uden index.json', () => {
  const m = kopi();
  try {
    const d = laes(m, 'opskrifter/pandekager.json');
    d.tumbi.id = 'ny-ret';
    d.image = 'grafik/ret-ny-ret.webp';
    const foer = valider(m).tal;
    fs.mkdirSync(path.join(m, 'docs/venter-paa-billede'), { recursive: true });
    skriv(m, 'docs/venter-paa-billede/ny-ret.json', d);
    const gyldig = valider(m);
    assert.deepEqual(gyldig.fejl, []);
    assert.equal(gyldig.tal.venter, 1);
    assert.equal(gyldig.tal.retter, ANTAL_RETTER);
    // OK-linjens trin, voksen-trin og timere er kun retterne i appen (opskrifter/), ikke dem, der venter (review 31-10)
    const appens = ({ trin, voksentrin, timere }) => ({ trin, voksentrin, timere });
    assert.deepEqual(appens(gyldig.tal), appens(foer));
    // Lyden kender kun retterne i appen: en lydfil til en ret, der venter, afvises (review 31-10)
    skriv(m, 'lyd/liste.json', { version: 1, filer: ['ny-ret/1.mp3'] });
    const lyd = valider(m).fejl;
    assert.ok(lyd.includes('lyd/liste.json: «ny-ret/1.mp3»: retten «ny-ret» findes ikke'), lyd.join('\n'));
    skriv(m, 'lyd/liste.json', { version: 1, filer: [] });
    d.recipeInstructions[2].tumbi.verbum = 'hælde';
    skriv(m, 'docs/venter-paa-billede/ny-ret.json', d);
    const { fejl } = valider(m);
    assert.ok(fejl.some((f) => f.startsWith('docs/venter-paa-billede/ny-ret.json: trin 3: ukendt verbum "hælde"')), fejl.join('\n'));
  } finally { ryd(m); }
});

// Ret opskriften, og forvent, at alt stadig er gyldigt
function forventGyldig(fil, ret) {
  const m = kopi();
  try {
    const data = laes(m, fil);
    ret(data);
    skriv(m, fil, data);
    assert.deepEqual(valider(m).fejl, []);
  } finally { ryd(m); }
}

test('ødelagt JSON giver filnavn og «ikke gyldig JSON»', () => {
  const m = kopi();
  try {
    const tekst = fs.readFileSync(path.join(m, 'opskrifter/pandekager.json'), 'utf8');
    skriv(m, 'opskrifter/pandekager.json', tekst.slice(0, -4)); // den sidste } mangler
    const { fejl } = valider(m);
    assert.ok(fejl.some((f) => f.startsWith('opskrifter/pandekager.json: er ikke gyldig JSON')), fejl.join('\n'));
  } finally { ryd(m); }
});

test('ukendt verbum nævner trinnet og de lovlige verber', () => {
  const fejl = forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[2].tumbi.verbum = 'hælde'; }, 'trin 3: ukendt verbum "hælde"');
  assert.ok(fejl.some((f) => f.includes('roere, haelde')));
});

test('timer skal være et positivt heltal', () => {
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[8].tumbi.timer_sek = -5; }, 'trin 9: «timer_sek» skal være et positivt heltal');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[8].tumbi.timer_sek = 12.5; }, 'trin 9: «timer_sek» skal være et positivt heltal');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[8].tumbi.timer_sek = '600'; }, 'trin 9: «timer_sek» skal være et positivt heltal');
});

test('kniv og varme kræver voksen: true og voksen_hjaelp', () => {
  forventFejl('opskrifter/frikadeller.json', (d) => { delete d.recipeInstructions[1].tumbi.voksen_hjaelp; }, 'trin 2: verbet «rive» skal have "voksen": true og "voksen_hjaelp": "kniv"');
  forventFejl('opskrifter/frikadeller.json', (d) => { delete d.recipeInstructions[1].tumbi.voksen; }, 'trin 2: verbet «rive» skal have "voksen": true');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[9].tumbi.voksen_hjaelp = 'ja'; }, 'trin 10: «voksen_hjaelp» skal være "kniv", "varme"');
});

test('rive og bage kræver altid en voksen: rivejernet er kniv, og ovnen er varme', () => {
  const rive = (st) => { st.verbum = 'rive'; };
  forventFejl('opskrifter/koedsovs.json', (d) => { const st = d.recipeInstructions[2].tumbi; rive(st); delete st.voksen; delete st.voksen_hjaelp; },
    'trin 3: verbet «rive» skal have "voksen": true og "voksen_hjaelp": "kniv"');
  forventFejl('opskrifter/koedsovs.json', (d) => { const st = d.recipeInstructions[2].tumbi; rive(st); st.voksen_hjaelp = 'varme'; },
    'trin 3: verbet «rive» skal have "voksen": true og "voksen_hjaelp": "kniv"');
  forventGyldig('opskrifter/koedsovs.json', (d) => { rive(d.recipeInstructions[2].tumbi); });
  const bage = (st) => { st.verbum = 'bage'; };
  forventFejl('opskrifter/boller.json', (d) => { const st = d.recipeInstructions[12].tumbi; bage(st); delete st.voksen; delete st.voksen_hjaelp; },
    'trin 13: verbet «bage» skal have "voksen": true og "voksen_hjaelp": "varme"');
  forventFejl('opskrifter/boller.json', (d) => { const st = d.recipeInstructions[12].tumbi; bage(st); st.voksen_hjaelp = 'kniv'; },
    'trin 13: verbet «bage» skal have "voksen": true og "voksen_hjaelp": "varme"');
  forventGyldig('opskrifter/boller.json', (d) => { bage(d.recipeInstructions[12].tumbi); });
});

// pynte og sproejte (20-10): læg en oliven på, klem ketchup ud. Øjebollernes «Læg et øje på hver varm bolle.» er varme
test('piske, pensle, mose, drysse, pynte og sprøjte: barnet selv, eller en voksen for varmens skyld', () => {
  // Boller trin 11 (pisk ægget, og pensl) har ingen voksen: det er koldt
  for (const v of ['piske', 'pensle', 'mose', 'drysse', 'pynte', 'sproejte']) {
    forventGyldig('opskrifter/boller.json', (d) => { const st = d.recipeInstructions[10].tumbi; st.verbum = v; delete st.voksen; delete st.voksen_hjaelp; });
    forventGyldig('opskrifter/boller.json', (d) => { Object.assign(d.recipeInstructions[10].tumbi, { verbum: v, voksen: true, voksen_hjaelp: 'varme' }); });
    forventFejl('opskrifter/boller.json', (d) => { Object.assign(d.recipeInstructions[10].tumbi, { verbum: v, voksen: true, voksen_hjaelp: 'kniv' }); },
      'trin 11: verbet «' + v + '» kan barnet selv. Hjælper den voksne, er det for varmens skyld: brug "voksen_hjaelp": "varme", fandt "kniv"');
  }
  // smøre har ingen fast regel: barnet smører selv med en sløv kniv
  forventGyldig('opskrifter/boller.json', (d) => { const st = d.recipeInstructions[10].tumbi; st.verbum = 'smoere'; });
});

test('tun på dåse og skinke er ikke rå: ingen håndvask bagefter', () => {
  for (const [ikon, tekst] of [['tun', '1 dåse tun'], ['skinke', '100 g skinke']]) {
    forventGyldig('opskrifter/koedsovs.json', (d) => {
      udenUgeplan(d);
      d.recipeIngredient.push(tekst);
      d.tumbi.ingredienser.push({ ikon, maengde: tekst.split(' ').slice(0, 2).join(' ') });
      // Lige efter trinnet med tun eller skinke rører barnet tomatpuré og salt, uden at vaske hænder først
      d.recipeInstructions.splice(6, 0, { '@type': 'HowToStep', text: 'Kom ' + ikon + ' i.', tumbi: { verbum: 'haelde', ikoner: [ikon] } });
    });
  }
});

// Når tiden i ovnen er gået, er pladen eller formen varm: trinnet efter bagningen er den voksnes.
// Trinnet lige efter boller i ovnen fjernes, så barnets næste trin kommer direkte efter ovnen
test('efter ovnen tager en voksen pladen eller formen ud', () => {
  const ovn = (d) => d.recipeInstructions.findIndex((s) => s.tumbi.verbum === 'bage' && 'timer_sek' in s.tumbi);
  forventFejl('opskrifter/boller.json', (d) => { d.recipeInstructions.splice(ovn(d) + 1, 1); },
    'trin 13: når tiden i ovnen er gået, tager en voksen det ud');
  // Bagningen som sidste trin: der er ingen til at tage det ud
  forventFejl('opskrifter/boller.json', (d) => { d.recipeInstructions.splice(ovn(d) + 1); },
    'trin 13: når tiden i ovnen er gået, tager en voksen det ud');
  // Et voksen-trin med varme er ikke nok: udtagningen har sit eget verbum og billede, «tage-ud» (fra 19-10)
  forventFejl('opskrifter/boller.json', (d) => { d.recipeInstructions[ovn(d) + 1].tumbi.verbum = 'haelde'; },
    'trin 13: når tiden i ovnen er gået, tager en voksen det ud: trinnet efter skal have verbet "tage-ud"');
  // Også uden timer: pladen er lige varm (code review 19-10)
  forventFejl('opskrifter/boller.json', (d) => { const i = ovn(d); delete d.recipeInstructions[i].tumbi.timer_sek; d.recipeInstructions.splice(i + 1, 1); },
    'trin 13: når tiden i ovnen er gået, tager en voksen det ud');
  // Flutes bages i to omgange: et bage-trin lige efter et andet er stadig i ovnen, og «tage-ud» kommer efter det sidste
  forventGyldig('opskrifter/hvidloegsflutes.json', () => {});
  forventFejl('opskrifter/hvidloegsflutes.json', (d) => { d.recipeInstructions.find((s) => s.tumbi.verbum === 'tage-ud').tumbi.verbum = 'bage'; },
    'når tiden i ovnen er gået, tager en voksen det ud');
  // En dyb form (brownie, blondie) har sit eget billede, «tage-ud-form», og tæller også som udtagningen (fra 19-10)
  forventGyldig('opskrifter/boller.json', (d) => { d.recipeInstructions[ovn(d) + 1].tumbi.verbum = 'tage-ud-form'; });
  forventFejl('opskrifter/brownie.json', (d) => { d.recipeInstructions.find((s) => s.tumbi.verbum === 'tage-ud-form').tumbi.verbum = 'haelde'; },
    'trinnet efter skal have verbet "tage-ud" (fx «Tag pladen ud af ovnen.») eller "tage-ud-form"');
});

// De fem verber fra 19-10 og «tage-ud-form». Tage ud af ovnen og si kogende vand er altid varme; kagerullen, staniolen og
// gæren kan barnet selv
test('tage-ud, tage-ud-form og si kræver en voksen for varmens skyld; kagerulle, pakke-ind og smuldre kan barnet', () => {
  for (const v of ['tage-ud', 'tage-ud-form', 'si']) {
    forventFejl('opskrifter/koedsovs.json', (d) => { const st = d.recipeInstructions[2].tumbi; st.verbum = v; delete st.voksen; delete st.voksen_hjaelp; },
      'trin 3: verbet «' + v + '» skal have "voksen": true og "voksen_hjaelp": "varme"');
    forventFejl('opskrifter/koedsovs.json', (d) => { Object.assign(d.recipeInstructions[2].tumbi, { verbum: v, voksen: true, voksen_hjaelp: 'kniv' }); },
      'trin 3: verbet «' + v + '» skal have "voksen": true og "voksen_hjaelp": "varme"');
  }
  for (const v of ['kagerulle', 'pakke-ind', 'smuldre']) {
    forventGyldig('opskrifter/boller.json', (d) => { const st = d.recipeInstructions[10].tumbi; st.verbum = v; delete st.voksen; delete st.voksen_hjaelp; });
  }
});

// Trinene, der fik de nye verber. Tunfrikadellernes «Hæld vandet fra tunen.» beholder «haelde»: si-billedet viser
// en varm gryde over dørslaget, og tunen er kold og står i en dåse
test('trinene med de nye verber', () => {
  const forvent = [
    ['boller', 'Tag pladen ud af ovnen.', 'tage-ud'], ['hytteostboller', 'Tag pladen ud af ovnen.', 'tage-ud'],
    ['pizzasnegle', 'Tag pladen ud af ovnen.', 'tage-ud'], ['brownie', 'Tag formen ud af ovnen.', 'tage-ud-form'],
    ['blondie', 'Tag formen ud af ovnen.', 'tage-ud-form'], ['hvidloegsflutes', 'Tag flutes ud af ovnen.', 'tage-ud'],
    ['kartoffelmos', 'Hæld vandet fra i dørslaget.', 'si'], ['koedsovs', 'Hæld vandet fra spaghettien.', 'si'],
    ['pizzasnegle', 'Rul dejen ud til en stor firkant.', 'kagerulle'], ['hvidloegsflutes', 'Pak flutes ind i staniol.', 'pakke-ind'],
    ['boller', 'Smuldr gæren ned i skålen.', 'smuldre'], ['pizzasnegle', 'Smuldr gæren ned i en stor skål.', 'smuldre'],
    ['tunfrikadeller', 'Hæld vandet fra tunen.', 'haelde'],
  ];
  for (const [id, tekst, verbum] of forvent) {
    const trin = laes(ROD, 'opskrifter/' + id + '.json').recipeInstructions.find((s) => s.text === tekst);
    assert.ok(trin, id + ': trinnet «' + tekst + '» findes ikke');
    assert.equal(trin.tumbi.verbum, verbum, id + ': «' + tekst + '»');
  }
  // Si-trinene viser, hvad der er i dørslaget (UI-review 5)
  for (const [id, tekst, ikon] of [['kartoffelmos', 'Hæld vandet fra i dørslaget.', 'kartoffel'], ['koedsovs', 'Hæld vandet fra spaghettien.', 'spaghetti']]) {
    const trin = laes(ROD, 'opskrifter/' + id + '.json').recipeInstructions.find((s) => s.text === tekst);
    assert.deepEqual(trin.tumbi.ikoner, [ikon], id + ': «' + tekst + '» skal have ikonet ' + ikon);
  }
});

// Ordvagten: nævner trinteksten kniv, rivejern eller varme, er det et voksen-trin, uanset hvilket verbum trinnet har fået.
// Den går efter stammen (riv, hak, skær, skræl, kniv, bag, steg, kog, smelt, komfur, ovn) og fanger alle bøjninger.
// Ordene, der ikke er kniv eller varme, står i UNDTAGELSER i test-opskrifter.js
test('trinteksten om kniv eller varme kræver et voksen-trin', () => {
  const tekst = (t) => (d) => { d.recipeInstructions[2].text = t; };
  forventFejl('opskrifter/pandekager.json', tekst('Tænd ovnen.'), 'trin 3: teksten nævner «ovnen»');
  forventFejl('opskrifter/pandekager.json', tekst('Riv lidt citronskal.'), 'trin 3: teksten nævner «Riv»');
  forventFejl('opskrifter/pandekager.json', tekst('Hak melet fint.'), 'trin 3: teksten nævner «Hak»');
  // Ikke kun bydeformen: kogende vand, kniven, komfuret, smelte og skrælle (code review 19-10)
  forventFejl('opskrifter/pandekager.json', tekst('Lad vandet koge.'), 'trin 3: teksten nævner «koge»');
  forventFejl('opskrifter/pandekager.json', tekst('Hæld det kogende vand fra.'), 'trin 3: teksten nævner «kogende»');
  forventFejl('opskrifter/pandekager.json', tekst('Brug kniven forsigtigt.'), 'trin 3: teksten nævner «kniven»');
  forventFejl('opskrifter/pandekager.json', tekst('Smelt smørret.'), 'trin 3: teksten nævner «Smelt»');
  forventFejl('opskrifter/pandekager.json', tekst('Skræl kartoflerne.'), 'trin 3: teksten nævner «Skræl»');
  forventFejl('opskrifter/pandekager.json', tekst('Tænd komfuret.'), 'trin 3: teksten nævner «komfuret»');
  // Bøjninger, som listen over tilladte former manglede (code review 3, 19-10), og sammensatte ord med stammen inde i
  forventFejl('opskrifter/pandekager.json', tekst('Lad smørret smelte.'), 'trin 3: teksten nævner «smelte»');
  forventFejl('opskrifter/pandekager.json', tekst('Lad den voksne skære løget.'), 'trin 3: teksten nævner «skære»');
  forventFejl('opskrifter/pandekager.json', tekst('Lad sovsen småkoge.'), 'trin 3: teksten nævner «småkoge»');
  forventFejl('opskrifter/pandekager.json', tekst('Brug brødkniven.'), 'trin 3: teksten nævner «brødkniven»');
  forventFejl('opskrifter/pandekager.json', tekst('Stil den i bageovnen.'), 'trin 3: teksten nævner «bageovnen»');
  // Undtagelserne: redskabet i sig selv (bagepapir, rivejern, kogebog, skærebræt, smørekniv), et mål (knivspids),
  // tid (bagefter), det, der allerede er hakket, og «ovn» inde i et andet ord (hovne)
  forventGyldig('opskrifter/pandekager.json', tekst('Læg bagepapir ved rivejernet.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Læg kogebogen ved skærebrættet.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Læg bagepapir på pladen.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Lad rosinerne hovne op.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Smør med smørekniven.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Kom de hakkede tomater i.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Vask hænderne bagefter.'));
  // «bag» som forholdsord kan ikke skelnes fra «og bag dem» (hvidløgsflutes trin 10): et falsk fund med vilje. Skriv «bagved»
  forventFejl('opskrifter/pandekager.json', tekst('Stil skålen bag gryden.'), 'trin 3: teksten nævner «bag»');
  forventGyldig('opskrifter/pandekager.json', tekst('Stil skålen bagved gryden.'));
  // «varm», «brun» og «knivspids» er ikke kniv eller varme: en varm skive brød, brun farin, en knivspids salt
  forventGyldig('opskrifter/pandekager.json', tekst('Smag en varm skive.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Mål 1,5 dl brun farin.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Kom en knivspids salt i.'));
  // Som voksen-trin er det i orden
  forventGyldig('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions[2].text = 'Tænd ovnen.';
    Object.assign(d.recipeInstructions[2].tumbi, { voksen: true, voksen_hjaelp: 'varme' });
  });
  forventGyldig('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions[2].text = 'Hak melet fint.';
    Object.assign(d.recipeInstructions[2].tumbi, { voksen: true, voksen_hjaelp: 'kniv' });
  });
});

// Ordvagten kræver også den rigtige hjælp: kniv-ord giver "kniv", varme-ord giver "varme" (code review 19-10).
// «voksen_hjaelp» er én værdi, så et trin med både kniv og varme skal deles i to
test('trinteksten om kniv eller varme kræver den rigtige voksen_hjaelp', () => {
  const trin3 = (text, voksen_hjaelp) => (d) => {
    d.recipeInstructions[2].text = text;
    Object.assign(d.recipeInstructions[2].tumbi, { voksen: true, voksen_hjaelp });
  };
  forventFejl('opskrifter/pandekager.json', trin3('Tænd ovnen.', 'kniv'), 'trin 3: teksten nævner «ovnen» (varme), så «voksen_hjaelp» skal være "varme", fandt "kniv"');
  forventFejl('opskrifter/pandekager.json', trin3('Hak melet fint.', 'varme'), 'trin 3: teksten nævner «Hak» (kniv eller rivejern), så «voksen_hjaelp» skal være "kniv", fandt "varme"');
  for (const hjaelp of ['kniv', 'varme']) {
    forventFejl('opskrifter/pandekager.json', trin3('Hak smørret, og smelt det.', hjaelp),
      'trin 3: teksten nævner både «Hak» (kniv) og «smelt» (varme), men «voksen_hjaelp» kan kun være én af dem: del trinnet i to');
  }
});

// «Lad bollerne bage» er ovnen, også med verbet «vente» (code review 3, 19-10): teksten kræver en voksen og varme.
// Med verbet «bage» skal «tage-ud» komme bagefter. Boller trin 13 er «Bag bollerne i ovnen.», og trin 14 tager pladen ud
test('en pause, hvor der bages, kræver en voksen og varme', () => {
  const fil = 'opskrifter/boller.json';
  const bager = (verbum, voksen) => (d) => {
    const s = d.recipeInstructions[12];
    s.text = 'Lad bollerne bage i 12 minutter.';
    s.tumbi.verbum = verbum;
    if (!voksen) { delete s.tumbi.voksen; delete s.tumbi.voksen_hjaelp; }
  };
  forventFejl(fil, bager('vente', false), 'trin 13: teksten nævner «bage» (kniv, rivejern eller varme), så trinnet skal have "voksen": true');
  forventGyldig(fil, bager('vente', true));
  forventGyldig(fil, bager('bage', true));
  forventFejl(fil, (d) => { bager('bage', true)(d); d.recipeInstructions.splice(13, 1); }, 'trin 13: når tiden i ovnen er gået, tager en voksen det ud');
});

// Det, der vises og læses op, er til køkkenet. Hvad kilden siger, og hvad der er et skøn, står i «tumbi.kilde»
test('noter om kilden og skøn står i tumbi.kilde, ikke i den synlige tekst', () => {
  const fil = 'opskrifter/koedsovs.json';
  forventFejl(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Kilden siger to gulerødder.'; }, 'trin 3 (noten): «Kilden» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeInstructions[2].text = 'Riv dem, som kilden siger.'; }, 'trin 3: «kilden» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeYield = 'ca. 4 personer (skøn)'; }, '«recipeYield»: «skøn» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeIngredient[0] = '1 spsk olie (kildens mål)'; }, 'ingrediens 1: «kildens» er en redaktionel note');
  forventFejl(fil, (d) => { d.description = 'Kødsovs, som kilden laver den.'; }, '«description»: «kilden» er en redaktionel note');
  // Flere bøjninger: kilder, kilderne, skønnet, skønnes, skønsmæssigt (code review 19-10)
  forventFejl(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Kilderne siger to gulerødder.'; }, 'trin 3 (noten): «Kilderne» er en redaktionel note');
  forventFejl(fil, (d) => { d.description = 'Kødsovs fra to kilder.'; }, '«description»: «kilder» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeYield = 'ca. 4 personer (skønnet)'; }, '«recipeYield»: «skønnet» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeYield = 'ca. 4 personer, skønnes det'; }, '«recipeYield»: «skønnes» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeIngredient[0] = '1 spsk olie (skønsmæssigt)'; }, 'ingrediens 1: «skønsmæssigt» er en redaktionel note');
  // Stammen fanger alle bøjninger og sammensatte ord (code review 3, 19-10)
  forventFejl(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Kildeteksten siger to gulerødder.'; }, 'trin 3 (noten): «Kildeteksten» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeYield = 'ca. 4 personer (skønsmæssig)'; }, '«recipeYield»: «skønsmæssig» er en redaktionel note');
  forventFejl(fil, (d) => { d.description = 'Kødsovs. Mængderne er skønnede.'; }, '«description»: «skønnede» er en redaktionel note');
  // Redskaberne står i printet under «Redskaber»
  forventFejl(fil, (d) => { d.tool.push('træske (kilden siger grydeske)'); }, 'redskab 8: «kilden» er en redaktionel note');
  // Undtagelserne: «kildevand», «skønt» (selvom) og «skønne» (smukke) er ikke et skøn
  forventGyldig(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Brug kildevand, hvis I har det. Skønt det tager tid.'; });
  forventGyldig(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'To skønne gulerødder.'; });
});

// Kildenoten står i printets fod. Har den flere sætninger, slutter den med punktum (UI-review 4: alle seks sluttede uden).
// En kort betegnelse som «Egen tekst» er ikke en sætning og står uden punktum
test('en kildenote med flere sætninger slutter med punktum', () => {
  const fil = 'opskrifter/hytteostboller.json';
  forventFejl(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Trinene er egen tekst'; }, '«tumbi.kilde» har flere sætninger og skal slutte med punktum');
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Trinene er egen tekst.'; });
  // Udråbstegn og spørgsmålstegn slutter også en sætning (code review 19-10)
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Trinene er egen tekst!'; });
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Er trinene egen tekst?'; });
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Egen tekst'; });
  // «ca. 3 dl» er en forkortelse, ikke en ny sætning
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Egen tekst med ca. 3 dl mælk'; });
});

// Kilden står i printets fod, og printet viser ikke pris og grønt: butik og metode for dem står i «tumbi.ugeplan_kilde»,
// som ingen side viser (UI-review 2, 23-10)
test('pris og grønt står i tumbi.ugeplan_kilde, ikke i kilden på printet', () => {
  const fil = 'opskrifter/chili-con-carne.json';
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Prisen er et skøn.'; }, '«tumbi.kilde» nævner «Pris», men printet viser ikke pris og grønt');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Fra 365discount.'; }, '«tumbi.kilde» nævner «365discount»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Grønt er et skøn.'; }, '«tumbi.kilde» nævner «Grønt»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Det er uden grønt.'; }, '«tumbi.kilde» nævner «grønt»');
  // Andre bøjninger og sammensætninger, store bogstaver og mellemrum (code review, 23-10)
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Grøntet er uden bælgfrugter.'; }, '«tumbi.kilde» nævner «Grønt»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Kilopris fra Netto.'; }, '«tumbi.kilde» nævner «Kilopris»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Hyldepriserne fra Rema.'; }, '«tumbi.kilde» nævner «Hyldepris»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' PRISEN ER ET SKØN.'; }, '«tumbi.kilde» nævner «PRIS»');
  forventFejl(fil, (d) => { d.tumbi.kilde += ' Fra 365 Discount.'; }, '«tumbi.kilde» nævner «365 Discount»');
  // Ord, der kun begynder sådan, er i orden: «grøntsager» er en vare, ikke ugeplanens tal
  forventGyldig(fil, (d) => { d.tumbi.kilde += ' Brug frosne grøntsager.'; });
  forventGyldig(fil, (d) => { d.tumbi.kilde += ' Grøntsagerne kan være frosne.'; });
  for (const v of ['', 'Prisen er et skøn', 42, null]) forventFejl(fil, (d) => { d.tumbi.ugeplan_kilde = v; }, '«tumbi.ugeplan_kilde» skal være en tekst, der slutter med punktum');
  // Noten kræves kun i ugeplanen (code review, 23-10)
  forventFejl(fil, (d) => { delete d.tumbi.ugeplan_kilde; }, '«tumbi.ugeplan» kræver «tumbi.ugeplan_kilde»');
  forventGyldig(fil, (d) => { delete d.tumbi.ugeplan; delete d.tumbi.ugeplan_kilde; });
});

test('voksen og voksen_hjaelp følges ad', () => {
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[9].tumbi.voksen = 'ja'; }, 'trin 10: «voksen» skal være true');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[2].tumbi.voksen = false; }, 'trin 3: «voksen» skal være true (udelad feltet');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[2].tumbi.voksen = true; }, 'trin 3: "voksen": true kræver også «voksen_hjaelp»');
  forventFejl('opskrifter/boller.json', (d) => { delete d.recipeInstructions[12].tumbi.voksen; }, 'trin 13: «voksen_hjaelp» kræver også "voksen": true');
});

test('id skal passe til filnavnet', () => {
  forventFejl('opskrifter/boller.json', (d) => { d.tumbi.id = 'boller2'; }, 'tumbi.id "boller2" passer ikke til filnavnet «boller»');
});

test('index.json skal passe til filerne', () => {
  forventFejl('opskrifter/index.json', (d) => { const g = gruppe(d, 'bagning'); g.retter = g.retter.filter((x) => x !== 'boller'); }, 'opskrifter/boller.json: står ikke i opskrifter/index.json');
  forventFejl('opskrifter/index.json', (d) => { gruppe(d, 'aftensmad').retter.push('lasagne'); }, 'retten «lasagne» findes ikke');
  forventFejl('opskrifter/index.json', (d) => { gruppe(d, 'bagning').retter.push('boller'); }, 'id «boller» står der to gange');
});

// Forsiden har tre afsnit (aftensmad, bagning, søde sager), og hver ret står i præcis én af dem
test('hver ret står i præcis én kendt gruppe', () => {
  forventFejl('opskrifter/index.json', (d) => { gruppe(d, 'soede-sager').retter.push('boller'); }, '«boller» står i to grupper (bagning og soede-sager)');
  forventFejl('opskrifter/index.json', (d) => { d.grupper[0].id = 'forretter'; }, 'ukendt gruppe «forretter»');
  forventFejl('opskrifter/index.json', (d) => { d.grupper[1].id = 'aftensmad'; }, 'gruppen «aftensmad» står der to gange');
  forventFejl('opskrifter/index.json', (d) => { gruppe(d, 'bagning').retter = []; }, 'gruppen «bagning» skal have mindst én ret');
  forventFejl('opskrifter/index.json', (d) => { gruppe(d, 'bagning').navn = 'Bagværk'; }, 'gruppen «bagning»: ukendt felt «navn»');
  forventFejl('opskrifter/index.json', (d) => { d.version = 1; d.retter = d.grupper.flatMap((g) => g.retter); delete d.grupper; }, '«version» skal være 2');
  forventFejl('opskrifter/index.json', (d) => { delete d.grupper; }, '«grupper» skal være en liste med mindst én gruppe');
});

test('manglende felter og for lange sætninger', () => {
  forventFejl('opskrifter/koedsovs.json', (d) => { delete d.name; }, 'opskrifter/koedsovs.json: mangler «name»');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.totalTime = '50 min'; }, '«totalTime» skal være en ISO 8601-varighed');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.recipeInstructions[3].text = 'Brun kødet i gryden ved høj varme i otte lange minutter.'; }, 'trin 4: teksten er for lang');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.recipeInstructions[3].tumbi.farve = 'rød'; }, 'trin 4: ukendt felt «tumbi.farve»');
});

// Frikadeller trin 12 former farsen, som har både kød og æg i (trin 8 og 9). Uden vasken i trin 13 meldes begge
test('råt kød uden «vask hænderne» bagefter', () => {
  forventFejl('opskrifter/frikadeller.json', (d) => { d.recipeInstructions = d.recipeInstructions.filter((s, i) => i !== 12); },
    'trin 12: rører råt kød eller æg (koed, aeg) (dejen med koed, aeg fra trin 9 er stadig rå), men der kommer ikke et «vaske-haender»-trin bagefter');
});

// At forme farsen eller rulle dejen ud rører det rå lige så meget som at ælte den (code review 19-10).
// Tunfrikadeller: hænderne vaskes mellem æggene (trin 8) og formningen, og bagefter er der ingen vask
test('fars og dej med råt æg: hænderne vaskes efter formningen, ikke før', () => {
  for (const v of ['rulle', 'kagerulle']) {
    forventFejl('opskrifter/tunfrikadeller.json', (d) => {
      const r = d.recipeInstructions;
      const form = r.findIndex((s) => s.tumbi.verbum === 'rulle');
      r[form].tumbi.verbum = v;
      const [vask] = r.splice(form + 1, 1);
      r.splice(form, 0, vask);
    }, 'trin 10: rører råt kød eller æg (aeg) (dejen med aeg fra trin 8 er stadig rå), men der kommer ikke et «vaske-haender»-trin bagefter');
  }
});

// Code review 20-10: stilken blev stukket i calzonen efter penslingen og håndvasken, altså i råt æg
test('pynte efter en pensling med æg rører det rå æg, indtil der er bagt', () => {
  const fil = 'opskrifter/graeskar-calzone.json';
  forventFejl(fil, (d) => {
    const r = d.recipeInstructions;
    const [stilk] = r.splice(r.findIndex((s) => s.tumbi.verbum === 'pynte'), 1);
    r.splice(r.findIndex((s) => s.tumbi.verbum === 'bage'), 0, stilk);
  }, 'trin 11: rører råt kød eller æg (aeg) (aeg fra penslingen i trin 8 er stadig råt), men der kommer ikke et «vaske-haender»-trin bagefter');
  // Vasker barnet hænderne igen efter pyntningen, er det i orden
  forventGyldig(fil, (d) => {
    const r = d.recipeInstructions;
    const [stilk] = r.splice(r.findIndex((s) => s.tumbi.verbum === 'pynte'), 1);
    const bag = r.findIndex((s) => s.tumbi.verbum === 'bage');
    r.splice(bag, 0, stilk, { '@type': 'HowToStep', text: 'Vask hænderne.', tumbi: { verbum: 'vaske-haender' } });
  });
  // At drysse rører ikke det penslede, og efter bagningen er ægget ikke råt (øjnene lægges på de varme boller)
  forventGyldig('opskrifter/heksefingre.json', () => {});
  forventGyldig('opskrifter/oejeboller.json', () => {});
});

// Code review 2, 20-10: at pakke ind og smuldre rører også det penslede, og det samme gør de verber, der former dejen.
// En pensling med æg, der aldrig bages eller steges, spises rå. Alle penslinger i retterne er med æg, så en pensling
// uden æg kan ikke prøves her
test('pakke ind, smuldre og forme efter en pensling med æg kræver en ny håndvask', () => {
  for (const v of ['pakke-ind', 'smuldre']) {
    forventFejl('opskrifter/mumiepoelser.json', (d) => {
      const r = d.recipeInstructions;
      const [rul] = r.splice(r.findIndex((s) => s.tumbi.verbum === 'pakke-ind'), 1);
      rul.tumbi.verbum = v;
      r.splice(r.findIndex((s) => s.tumbi.verbum === 'bage'), 0, rul);
    }, 'trin 5: rører råt kød eller æg (aeg) (aeg fra penslingen i trin 3 er stadig råt), men der kommer ikke et «vaske-haender»-trin bagefter');
  }
  for (const v of ['rulle', 'kagerulle', 'aelte']) {
    forventFejl('opskrifter/heksefingre.json', (d) => {
      const r = d.recipeInstructions;
      const pensl = r.findIndex((s) => s.tumbi.verbum === 'pensle');
      const flyt = r.splice(pensl, 2); // penslingen og håndvasken efter den
      const form = r.findIndex((s) => s.tumbi.verbum === 'rulle');
      r[form].tumbi.verbum = v;
      r.splice(form, 0, ...flyt);
    }, 'trin 6: rører råt kød eller æg (aeg) (aeg fra penslingen i trin 4 er stadig råt), men der kommer ikke et «vaske-haender»-trin bagefter');
  }
});

test('en pensling med æg skal bages eller steges bagefter', () => {
  const fil = 'opskrifter/graeskar-calzone.json';
  forventFejl(fil, (d) => {
    const r = d.recipeInstructions;
    const flyt = r.splice(r.findIndex((s) => s.tumbi.verbum === 'pensle'), 2); // penslingen og håndvasken efter den
    r.splice(r.findIndex((s) => s.tumbi.verbum === 'tage-ud') + 1, 0, ...flyt);
  }, 'trin 12: penslet med råt æg (aeg), men der bages eller steges ikke bagefter');
  // Stegning tæller som bagning: efter den er ægget ikke råt, og stilken må stikkes i uden en ny håndvask
  forventGyldig(fil, (d) => {
    const r = d.recipeInstructions;
    const [stilk] = r.splice(r.findIndex((s) => s.tumbi.verbum === 'pynte'), 1);
    const bag = r.findIndex((s) => s.tumbi.verbum === 'bage');
    r[bag].tumbi.verbum = 'stege';
    r.splice(bag + 1, 0, stilk);
  });
});

// Efter stegningen eller bagningen er dejen ikke rå længere (code review 3, 19-10): at rulle pandekagen sammen eller
// bollerne i et viskestykke rører ikke råt æg. «koge» tæller med vilje ikke: det er ofte noget andet, der varmes
// (smør eller mælk i en lille gryde), mens dejen er rå
test('dejen er ikke rå efter stegning eller bagning', () => {
  const rul = (text) => ({ '@type': 'HowToStep', text, tumbi: { verbum: 'rulle' } });
  forventGyldig('opskrifter/pandekager.json', (d) => { d.recipeInstructions.splice(10, 0, rul('Rul pandekagen sammen.')); });
  forventGyldig('opskrifter/hytteostboller.json', (d) => { d.recipeInstructions.splice(13, 0, rul('Rul bollerne i et viskestykke.')); });
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions[8].tumbi.verbum = 'koge';
    d.recipeInstructions.splice(10, 0, rul('Rul pandekagen sammen.'));
  }, 'trin 11: rører råt kød eller æg (aeg) (dejen med aeg fra trin 7 er stadig rå)');
});

test('andre ingredienser mellem råt kød/æg og håndvasken', () => {
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions.splice(7, 0, { '@type': 'HowToStep', text: 'Hæld sukker i.', tumbi: { verbum: 'haelde', ikoner: ['sukker'] } });
  }, 'trin 8: rører sukker med hænder, der har rørt råt kød eller æg i trin 7');
});

// Står råt kød eller æg i ingredienserne, men på intet trin, kan validatoren ikke se, hvornår hænderne skal vaskes
test('råt kød og æg i ingredienserne skal stå på et trin', () => {
  const udenIkon = (ik) => (d) => {
    for (const s of d.recipeInstructions) {
      if (!s.tumbi.ikoner) continue;
      s.tumbi.ikoner = s.tumbi.ikoner.filter((x) => x !== ik);
      if (!s.tumbi.ikoner.length) delete s.tumbi.ikoner;
    }
  };
  forventFejl('opskrifter/pandekager.json', udenIkon('aeg'), '«aeg» står i ingredienserne, men intet trin har ikonet');
  forventFejl('opskrifter/frikadeller.json', udenIkon('koed'), '«koed» står i ingredienserne, men intet trin har ikonet');
});

// Reglerne for råt kød og æg bygger på ikonet. Står der æg eller kød i ingrediensen, skal ikonet være «koed» eller «aeg»,
// ellers slipper «3 æg» med mælke-ikonet uden håndvask (code review 19-10). Trinenes ikon skiftes med, så kun ordet afslører det
test('æg og kød i ingredienserne skal have ikonet koed eller aeg', () => {
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.tumbi.ingredienser[2].ikon = 'maelk';
    for (const s of d.recipeInstructions) if (s.tumbi.ikoner) s.tumbi.ikoner = s.tumbi.ikoner.map((x) => (x === 'aeg' ? 'maelk' : x));
  }, 'ingrediens 3: «æg» er råt kød eller æg, så ikonet skal være "koed" eller "aeg", fandt "maelk"');
  forventFejl('opskrifter/koedsovs.json', (d) => {
    d.tumbi.ingredienser[1].ikon = 'tomat';
    for (const s of d.recipeInstructions) if (s.tumbi.ikoner) s.tumbi.ikoner = s.tumbi.ikoner.filter((x) => x !== 'koed');
  }, 'ingrediens 2: «oksekød» er råt kød eller æg, så ikonet skal være "koed" eller "aeg", fandt "tomat"');
  // Stammen fanger alle bøjninger og sammensatte ord (code review 3, 19-10): æggeblommer, laksefilet, baconterninger,
  // og kød, fars, flæsk og rejer inde i ordet
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeIngredient[2] = '3 æggeblommer';
    d.tumbi.ingredienser[2].ikon = 'maelk';
    for (const s of d.recipeInstructions) if (s.tumbi.ikoner) s.tumbi.ikoner = s.tumbi.ikoner.map((x) => (x === 'aeg' ? 'maelk' : x));
  }, 'ingrediens 3: «æggeblommer» er råt kød eller æg, så ikonet skal være "koed" eller "aeg", fandt "maelk"');
  // En ny linje sidst i kødsovsen (ingrediens 13) med et ikon, der ikke er råt. Mængden er tallet og enheden
  const ny = (linje, ikon) => (d) => {
    udenUgeplan(d);
    d.recipeIngredient.push(linje);
    d.tumbi.ingredienser.push({ ikon, maengde: linje.split(' ').slice(0, linje.split(' ').length > 2 ? 2 : 1).join(' ') });
  };
  for (const [linje, ord] of [
    ['200 g laksefilet', 'laksefilet'], ['100 g baconterninger', 'baconterninger'], ['300 g torskefilet', 'torskefilet'],
    ['200 g tigerrejer', 'tigerrejer'], ['200 g stegeflæsk', 'stegeflæsk'], ['400 g kyllingebryst', 'kyllingebryst'],
    ['1 stk medisterpølse', 'medisterpølse'], ['500 g oksefars', 'oksefars'], ['2 æggehvider', 'æggehvider'],
  ]) {
    forventFejl('opskrifter/koedsovs.json', ny(linje, 'ost'), 'ingrediens 13: «' + ord + '» er råt kød eller æg, så ikonet skal være "koed" eller "aeg", fandt "ost"');
  }
  // Undtagelserne: kogt bouillon og fond, fiskesauce og «ægte»
  for (const linje of ['1 l kyllingebouillon', '1 l kyllingefond', '2 tsk fiskesauce', '1 l fiskefond']) forventGyldig('opskrifter/koedsovs.json', ny(linje, 'bouillon'));
  // Færdige pølser og pålæg (20-10): ikonerne «poelse» og «skinke». «kyllingetern» kan være rå og er ikke undtaget
  forventGyldig('opskrifter/koedsovs.json', ny('10 kyllingepølser', 'poelse'));
  forventGyldig('opskrifter/koedsovs.json', ny('100 g kyllingepålæg', 'skinke'));
  forventFejl('opskrifter/koedsovs.json', ny('100 g kyllingetern', 'skinke'), 'ingrediens 13: «kyllingetern» er råt kød eller æg, så ikonet skal være "koed" eller "aeg", fandt "skinke"');
  forventGyldig('opskrifter/koedsovs.json', ny('1 tsk ægte vanilje', 'sukker'));
});

// En pause (vente) med råt kød eller æg på hænderne: barnet går fra køkkenet uden at vaske sig.
// Pandekager får en pause mellem æggene (trin 7) og vasken
test('ingen pause med råt kød eller æg på hænderne', () => {
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions.splice(7, 0, { '@type': 'HowToStep', text: 'Lad dejen hvile.', tumbi: { verbum: 'vente', timer_sek: 600 } });
  }, 'trin 8: en pause med råt kød eller æg på hænderne fra trin 7');
});

// En timer med råt kød eller æg på hænderne er også en pause (code review 21-10 fund 5): kødsovsen brunede kødet i
// 8 minutter med timer på trinnet, hvor barnet lagde det rå kød i gryden, og håndvasken kom først bagefter
test('ingen timer med råt kød eller æg på hænderne', () => {
  // Kødsovsen som før 22-10: timeren på trinnet med kødet
  forventFejl('opskrifter/koedsovs.json', (d) => { d.recipeInstructions[3].tumbi.timer_sek = 480; },
    'trin 4: en timer med råt kød eller æg på hænderne');
  // Pandekager: et trin med timer mellem æggene (trin 7) og vasken, uden ingredienser, så kun timer-reglen kan fange det
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions.splice(7, 0, { '@type': 'HowToStep', text: 'Pisk dejen i 2 minutter.', tumbi: { verbum: 'piske', timer_sek: 120 } });
  }, 'trin 8: en timer med råt kød eller æg på hænderne fra trin 7');
  // Æltningen med timer er barnets eget arbejde i dejen, ikke en pause (pizzasneglene, trin 7), men kun æltningen
  forventGyldig('opskrifter/pizzasnegle.json', (d) => { assert.equal(d.recipeInstructions[6].tumbi.verbum, 'aelte'); });
  forventFejl('opskrifter/pizzasnegle.json', (d) => { d.recipeInstructions[6].tumbi.verbum = 'roere'; },
    'trin 7: en timer med råt kød eller æg på hænderne fra trin 6');
  // Æltningen er kun undtaget, når det rå er i dejen: efter kødet i gryden står barnet ved timeren med råt på hænderne
  forventFejl('opskrifter/koedsovs.json', (d) => {
    d.recipeInstructions.splice(4, 0, { '@type': 'HowToStep', text: 'Ælt dejen i 5 minutter.', tumbi: { verbum: 'aelte', timer_sek: 300 } });
  }, 'trin 5: en timer med råt kød eller æg på hænderne fra trin 4');
});

// Dej med råt æg (eller kød) er først indarbejdet efter æltningen: en vask mellem ægget og æltningen er ikke nok.
// Boller får et æg i dejen før æltningen (trin 7), og efter æltningen rører barnet salt
test('dej med råt æg: hænderne vaskes efter æltningen, ikke før', () => {
  const aeg = { '@type': 'HowToStep', text: 'Rør ægget i dejen.', tumbi: { verbum: 'roere', ikoner: ['aeg'] } };
  const vask = { '@type': 'HowToStep', text: 'Vask hænderne.', tumbi: { verbum: 'vaske-haender' } };
  const salt = { '@type': 'HowToStep', text: 'Drys salt på.', tumbi: { verbum: 'drysse', ikoner: ['salt'] } };
  const aelteIdx = (d) => d.recipeInstructions.findIndex((s) => s.tumbi.verbum === 'aelte');
  // Æg, vask, ælt, salt: saltet røres med æg-dej på fingrene
  forventFejl('opskrifter/boller.json', (d) => {
    const a = aelteIdx(d);
    d.recipeInstructions.splice(a, 0, aeg, vask);
    d.recipeInstructions.splice(a + 3, 0, salt);
  }, 'trin 10: rører salt med hænder, der har rørt råt kød eller æg i trin 9 (dejen med aeg fra trin 7');
  // Æg, ælt, og ingen vask før saltet (meldes allerede fra æg-trinnet)
  forventFejl('opskrifter/boller.json', (d) => {
    const a = aelteIdx(d);
    d.recipeInstructions.splice(a, 0, aeg);
    delete d.recipeInstructions[a + 1].tumbi.ikoner;
    d.recipeInstructions.splice(a + 2, 0, salt);
  }, 'trin 9: rører salt med hænder, der har rørt råt kød eller æg i trin 7.');
  // Æg, ælt, vask, salt: i orden
  forventGyldig('opskrifter/boller.json', (d) => {
    const a = aelteIdx(d);
    d.recipeInstructions.splice(a, 0, aeg);
    delete d.recipeInstructions[a + 1].tumbi.ikoner;
    d.recipeInstructions.splice(a + 2, 0, vask, salt);
  });
});

test('ingrediens-ikoner skal være kendte og passe til mængden', () => {
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].ikon = 'kanel'; }, 'ingrediens 1: ukendt ikon "kanel"');
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].maengde = '3 dl'; }, 'ingrediens 1: mængden «3 dl» passer ikke til «200 g hvedemel»');
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser.pop(); }, '«tumbi.ingredienser» har 6 linjer, men recipeIngredient har 7');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[1].tumbi.ikoner = ['chorizo']; }, 'trin 2: ikonet «chorizo» er ikke blandt rettens ingredienser');
});

test('navne, som alle objekter arver (constructor, toString), er ikke gyldige id\'er', () => {
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].ikon = 'constructor'; }, 'ingrediens 1: ukendt ikon "constructor"');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[2].tumbi.ikoner = ['toString']; }, 'trin 3: ukendt ikon "toString"');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[2].tumbi.verbum = 'valueOf'; }, 'trin 3: ukendt verbum "valueOf"');
  forventFejl('opskrifter/pandekager.json', (d) => { Object.assign(d.recipeInstructions[2].tumbi, { voksen: true, voksen_hjaelp: 'toString' }); },
    'trin 3: «voksen_hjaelp» skal være "kniv", "varme", fandt "toString"');
});

// Ugeplanen (docs/ugeplan-plan.md, afsnit 4). iUgeplan giver kødsovsen alle felterne (de samme, uanset om den rigtige
// opskrift har dem), så hver test kan ødelægge én ting. Linjerne følger recipeIngredient; basisvarerne har ingen mængde
const KOEDSOVS_VARER = [
  ['olie'], ['hakket-oksekoed', 500, 'g'], ['loeg', 1, 'stk'], ['hvidloeg', 2, 'fed'], ['gulerod', 2, 'stk'], ['hakkede-tomater', 800, 'g'],
  ['tomatpure', 30, 'g'], ['oregano'], ['salt'], ['peber'], ['spaghetti', 400, 'g'], ['revet-ost', 100, 'g'],
];
function iUgeplan(d) {
  Object.assign(d.tumbi, { ugeplan: true, portioner: 4, pris_kr: 90, pris_dato: '2026-10', groent_g: 1100 });
  d.tumbi.ingredienser.forEach((x, i) => {
    const [vare, antal, enhed] = KOEDSOVS_VARER[i];
    delete x.antal;
    delete x.enhed;
    Object.assign(x, antal === undefined ? { vare } : { vare, antal, enhed });
  });
}
// Den rigtige kødsovs er i ugeplanen. Tests af andre regler, der tilføjer en linje uden «vare» eller et tredje knivtrin, tager den ud først
function udenUgeplan(d) { delete d.tumbi.ugeplan; }
const KS = 'opskrifter/koedsovs.json';
const ugeplanFejl = (ret, forventet) => forventFejl(KS, (d) => { iUgeplan(d); ret(d); }, forventet);
const ugeplanGyldig = (ret) => forventGyldig(KS, (d) => { iUgeplan(d); ret(d); });

test('en ret i ugeplanen med alle felterne er gyldig', () => {
  ugeplanGyldig(() => {});
  // Grænserne selv er gyldige: 1 og 12 portioner, intet grønt, præcis en time, og en basisvare med en mængde
  ugeplanGyldig((d) => { Object.assign(d.tumbi, { portioner: 1, groent_g: 0 }); d.totalTime = 'PT1H'; });
  ugeplanGyldig((d) => { d.tumbi.portioner = 12; Object.assign(d.tumbi.ingredienser[0], { antal: 1, enhed: 'spsk' }); });
  // Enhederne med samme dimension som varen: kg for gram, dl, l, spsk og tsk for ml
  ugeplanGyldig((d) => { Object.assign(d.tumbi.ingredienser[1], { antal: 0.5, enhed: 'kg' }); });
});

test('tumbi.ugeplan kræver portioner, pris, prisens måned, grønt og noten om pris og grønt', () => {
  for (const k of ['portioner', 'pris_kr', 'pris_dato', 'groent_g', 'ugeplan_kilde']) ugeplanFejl((d) => { delete d.tumbi[k]; }, '«tumbi.ugeplan» kræver «tumbi.' + k + '»');
  for (const v of ['ja', false, 1]) ugeplanFejl((d) => { d.tumbi.ugeplan = v; }, '«tumbi.ugeplan» skal være true (udelad feltet');
  // Uden ugeplanen kræves felterne ikke (de rigtige retter uden felterne er gyldige: «de rigtige opskrifter er gyldige»)
  forventGyldig(KS, (d) => { iUgeplan(d); delete d.tumbi.ugeplan; delete d.tumbi.portioner; });
});

test('portioner, pris, prisens måned og grønt har faste grænser', () => {
  for (const v of [0, 13, 4.5, '4', null]) ugeplanFejl((d) => { d.tumbi.portioner = v; }, '«tumbi.portioner» skal være et heltal fra 1 til 12');
  for (const v of [0, -5, 12.5, '90']) ugeplanFejl((d) => { d.tumbi.pris_kr = v; }, '«tumbi.pris_kr» skal være et heltal over 0');
  for (const v of ['2026-13', '2026-00', '10-2026', '2026-10-01', '2026-1', 202610]) ugeplanFejl((d) => { d.tumbi.pris_dato = v; }, '«tumbi.pris_dato» skal være ÅÅÅÅ-MM');
  for (const v of [-1, 1.5, '100']) ugeplanFejl((d) => { d.tumbi.groent_g = v; }, '«tumbi.groent_g» skal være et heltal fra 0');
  // Også uden ugeplanen: står feltet der, skal det være gyldigt
  forventFejl(KS, (d) => { d.tumbi.portioner = 0; }, '«tumbi.portioner» skal være et heltal fra 1 til 12');
});

test('en ret i ugeplanen tager højst en time og har højst to trin med kniv eller rivejern', () => {
  ugeplanFejl((d) => { d.totalTime = 'PT1H5M'; }, '«totalTime» er 65 min, men en ret i ugeplanen tager højst 60 min');
  // Kødsovsen har 2 (hak og riv). Et tredje er for meget i ugeplanen, men i orden uden den
  const tredje = (d) => d.recipeInstructions.splice(3, 0, { '@type': 'HowToStep', text: 'Skær løget i ringe.', tumbi: { verbum: 'skaere', voksen: true, voksen_hjaelp: 'kniv', ikoner: ['loeg'] } });
  ugeplanFejl(tredje, 'en ret i ugeplanen har højst 2 trin med kniv eller rivejern (skånsomt for hænderne), fandt 3');
  forventGyldig(KS, (d) => { udenUgeplan(d); tredje(d); });
  forventGyldig(KS, (d) => { udenUgeplan(d); d.totalTime = 'PT1H5M'; });
});

test('hver ingredienslinje i ugeplanen har en kendt vare og en mængde, der kan lægges sammen', () => {
  ugeplanFejl((d) => { delete d.tumbi.ingredienser[1].vare; }, 'ingrediens 2: mangler «vare» (retten er i ugeplanen');
  // Object.hasOwn: arvede navne er ikke varer eller enheder
  for (const v of ['constructor', 'toString', 'hakket kød', 7]) ugeplanFejl((d) => { d.tumbi.ingredienser[1].vare = v; }, 'ingrediens 2: ukendt vare ' + JSON.stringify(v));
  for (const e of ['dåse', 'constructor', 'G']) ugeplanFejl((d) => { d.tumbi.ingredienser[5].enhed = e; }, 'ingrediens 6: ukendt enhed ' + JSON.stringify(e));
  // Rumfang og vægt kan ikke lægges sammen: «2 spsk tomatpuré» skrives som 30 g
  ugeplanFejl((d) => { Object.assign(d.tumbi.ingredienser[6], { antal: 2, enhed: 'spsk' }); },
    'ingrediens 7: enheden «spsk» kan ikke lægges sammen med varen «tomatpure» (i «g»): skriv mængden om til g, kg');
  ugeplanFejl((d) => { d.tumbi.ingredienser[3].enhed = 'stk'; }, 'ingrediens 4: enheden «stk» kan ikke lægges sammen med varen «hvidloeg» (i «fed»)');
  for (const v of [0, -1, '800', null]) ugeplanFejl((d) => { d.tumbi.ingredienser[5].antal = v; }, 'ingrediens 6: «antal» skal være et tal over 0');
  ugeplanFejl((d) => { delete d.tumbi.ingredienser[5].enhed; }, 'ingrediens 6: «antal» og «enhed» følges ad');
  ugeplanFejl((d) => { delete d.tumbi.ingredienser[5].antal; }, 'ingrediens 6: «antal» og «enhed» følges ad');
  ugeplanFejl((d) => { delete d.tumbi.ingredienser[1].antal; delete d.tumbi.ingredienser[1].enhed; }, 'ingrediens 2: mangler «antal» og «enhed» (kun basisvarer');
  // Også uden ugeplanen: en vare, der står der, skal være kendt, og ukendte felter fanges (en stavefejl som «enheder»)
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].vare = 'hvedemel'; }, 'ingrediens 1: ukendt vare "hvedemel"');
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].enheder = 'g'; }, 'ingrediens 1: ukendt felt «enheder»');
});

// Indkøbsvarerne i js/katalog.js. validerVarer får en ødelagt kopi af VARER; de rigtige tjekkes også af valider()
test('indkøbsvarerne har en kendt afdeling, en grundenhed, et ikon og en gyldig pakke', () => {
  const varer = (aendr) => { const v = structuredClone(VARER); aendr(v); return validerVarer({ VARER: v, AFDELINGER, ENHEDER, INGREDIENSER }); };
  const forvent = (aendr, tekst) => { const f = varer(aendr); assert.ok(f.some((x) => x.includes(tekst)), 'forventede «' + tekst + '», fik:\n  ' + f.join('\n  ')); };
  assert.deepEqual(varer(() => {}), []);
  for (const a of ['slik', 'constructor']) forvent((v) => { v['hakkede-tomater'].afd = a; }, 'VARER «hakkede-tomater»: ukendt afdeling "' + a + '"');
  forvent((v) => { v['hakkede-tomater'].enhed = 'kg'; }, '«enhed» skal være en grundenhed (faktor 1), fandt «kg»');
  forvent((v) => { v['hakkede-tomater'].enhed = 'dåse'; }, 'ukendt enhed "dåse"');
  forvent((v) => { v['hakkede-tomater'].ikon = 'banan'; }, 'ukendt ikon "banan"');
  for (const p of [[0, 'dåse', 'dåser'], [400, 'dåse'], [12.5, 'dåse', 'dåser'], ['400', 'dåse', 'dåser'], [400, '', 'dåser'], 400]) {
    forvent((v) => { v['hakkede-tomater'].pakke = p; }, '«pakke» skal være [indhold i varens enhed (heltal over 0), ental, flertal]');
  }
  forvent((v) => { v.salt.afd = 'toer'; }, 'VARER «salt»: «basis»: true og afdelingen «basis» følges ad');
  forvent((v) => { v.loeg.afd = 'basis'; }, 'VARER «loeg»: «basis»: true og afdelingen «basis» følges ad');
  forvent((v) => { v.salt.basis = 'ja'; }, '«basis» skal være true');
  forvent((v) => { v.loeg.skjul = true; }, '«skjul» gælder kun basisvarer');
  forvent((v) => { v.salt.pakke = [1000, 'pose', 'poser']; }, 'en basisvare har ingen «pakke»');
  forvent((v) => { v.loeg.pris = 5; }, 'VARER «loeg»: ukendt felt «pris»');
  forvent((v) => { delete v.loeg.navn; }, 'VARER «loeg»: «navn» skal være en tekst');
  forvent((v) => { v['Hakket Kød'] = { ...v['hakket-oksekoed'] }; }, 'VARER «Hakket Kød»: id\'et skal være små bogstaver');
});

test('manglende grafik for et verbum, en ret eller en gruppe', () => {
  const m = kopi();
  try {
    fs.rmSync(path.join(m, 'grafik/verbum-aelte.svg'));
    fs.rmSync(path.join(m, 'grafik/ret-boller.webp'));
    fs.rmSync(path.join(m, 'grafik/gruppe-bagning.svg'));
    const { fejl } = valider(m);
    assert.ok(fejl.includes('grafik/verbum-aelte.svg: billedet mangler (verbum «aelte»)'), fejl.join('\n'));
    assert.ok(fejl.includes('grafik/ret-boller.webp: billedet mangler (retten «boller»)'), fejl.join('\n'));
    assert.ok(fejl.includes('grafik/gruppe-bagning.svg: billedet mangler (gruppen «bagning»)'), fejl.join('\n'));
  } finally { ryd(m); }
});

test('lydlisten må kun nævne filer, der findes', () => {
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/3.mp3']; }, '«pandekager/3.mp3» står på listen, men filen lyd/pandekager/3.mp3 findes ikke');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/99.mp3']; }, 'retten har kun 11 trin');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/timer-optaget-99.mp3']; }, 'retten har kun 11 trin');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/ingrediens-99.mp3']; }, 'ingredienser');
  // Uden tal efter «ingrediens-» blev nummeret NaN, og NaN < 1 og NaN > 7 er begge falske (code review 19-10)
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/ingrediens-x.mp3']; }, 'ingredienser');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/ingrediens-1x.mp3']; }, 'ingredienser');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/hej.mp3']; }, 'ukendt replik for en ret');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['faelles/hej.mp3']; }, 'ukendt fælles replik');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['faelles/timer-optaget-99.mp3']; }, 'ingen ret har 99 trin');
  // Ugeplanen: <ret>/uge.mp3 kun for retter i ugeplanen, kun de tre dyr i DYR (også Bo bliver færdig fra 28-10), og ugen
  // har 7 dage
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/uge.mp3']; }, '«pandekager/uge.mp3»: retten er ikke med i ugeplanen');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['faelles/uge-faerdig-ulv.mp3']; }, 'ukendt fælles replik');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['faelles/uge-dag-8.mp3']; }, 'ukendt fælles replik');
});

test('kommandolinjen giver exit 1 og fejlen på stderr', () => {
  const m = kopi();
  try {
    const d = laes(m, 'opskrifter/chorizo-pasta.json');
    d.recipeInstructions[0].tumbi.verbum = 'vaske';
    skriv(m, 'opskrifter/chorizo-pasta.json', d);
    const k = spawnSync(process.execPath, [path.join(ROD, 'test/test-opskrifter.js'), m], { encoding: 'utf8' });
    assert.equal(k.status, 1);
    assert.match(k.stderr, /opskrifter\/chorizo-pasta\.json: trin 1: ukendt verbum "vaske"/);
    const ok = spawnSync(process.execPath, [path.join(ROD, 'test/test-opskrifter.js')], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, new RegExp('^OK: ' + ANTAL_RETTER + ' retter'));
  } finally { ryd(m); }
});
