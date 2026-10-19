// test-validator.js — viser, at test-opskrifter.js fejler med en tydelig besked, når en fil er ødelagt.
// Hver test kopierer opskrifter/, grafik/ og lyd/ til en midlertidig mappe og ødelægger én ting.
// Kør:  node test/test-validator.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { valider } from './test-opskrifter.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function kopi() {
  const ny = fs.mkdtempSync(path.join(os.tmpdir(), 'kog-val-'));
  for (const m of ['opskrifter', 'grafik', 'lyd']) fs.cpSync(path.join(ROD, m), path.join(ny, m), { recursive: true });
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

test('piske, pensle, mose og drysse: barnet selv, eller en voksen for varmens skyld', () => {
  // Boller trin 11 (pisk ægget, og pensl) har ingen voksen: det er koldt
  for (const v of ['piske', 'pensle', 'mose', 'drysse']) {
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
});

// De fem verber fra 19-10. Tage ud af ovnen og si kogende vand er altid varme; kagerullen, staniolen og gæren kan barnet selv
test('tage-ud og si kræver en voksen for varmens skyld; kagerulle, pakke-ind og smuldre kan barnet', () => {
  for (const v of ['tage-ud', 'si']) {
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
    ['pizzasnegle', 'Tag pladen ud af ovnen.', 'tage-ud'], ['brownie', 'Tag formen ud af ovnen.', 'tage-ud'],
    ['blondie', 'Tag formen ud af ovnen.', 'tage-ud'], ['hvidloegsflutes', 'Tag flutes ud af ovnen.', 'tage-ud'],
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
});

// Ordvagten: nævner trinteksten kniv, rivejern eller varme (riv, bag, steg, kog/koge/kogende, hak, skær, kniv, komfur,
// kogeplade, smelt, skræl, ovn), er det et voksen-trin,
// uanset hvilket verbum trinnet har fået
test('trinteksten om kniv eller varme kræver et voksen-trin', () => {
  const tekst = (t) => (d) => { d.recipeInstructions[2].text = t; };
  forventFejl('opskrifter/pandekager.json', tekst('Tænd ovnen.'), 'trin 3: teksten nævner «ovn»');
  forventFejl('opskrifter/pandekager.json', tekst('Riv lidt citronskal.'), 'trin 3: teksten nævner «Riv»');
  forventFejl('opskrifter/pandekager.json', tekst('Hak melet fint.'), 'trin 3: teksten nævner «Hak»');
  // Ikke kun bydeformen: kogende vand, kniven, komfuret, smelte og skrælle (code review 19-10)
  forventFejl('opskrifter/pandekager.json', tekst('Lad vandet koge.'), 'trin 3: teksten nævner «koge»');
  forventFejl('opskrifter/pandekager.json', tekst('Hæld det kogende vand fra.'), 'trin 3: teksten nævner «kogende»');
  forventFejl('opskrifter/pandekager.json', tekst('Brug kniven forsigtigt.'), 'trin 3: teksten nævner «kniven»');
  forventFejl('opskrifter/pandekager.json', tekst('Smelt smørret.'), 'trin 3: teksten nævner «Smelt»');
  forventFejl('opskrifter/pandekager.json', tekst('Skræl kartoflerne.'), 'trin 3: teksten nævner «Skræl»');
  forventFejl('opskrifter/pandekager.json', tekst('Tænd komfuret.'), 'trin 3: teksten nævner «komfuret»');
  // Ordene inde i andre ord tæller ikke: bagepapir, rivejern, kogebog, skærebræt
  forventGyldig('opskrifter/pandekager.json', tekst('Læg bagepapir ved rivejernet.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Læg kogebogen ved skærebrættet.'));
  // «varm», «brun» og «knivspids» er ikke kniv eller varme: en varm skive brød, brun farin, en knivspids salt
  forventGyldig('opskrifter/pandekager.json', tekst('Smag en varm skive.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Mål 1,5 dl brun farin.'));
  forventGyldig('opskrifter/pandekager.json', tekst('Kom en knivspids salt i.'));
  // Som voksen-trin er det i orden
  forventGyldig('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions[2].text = 'Tænd ovnen.';
    Object.assign(d.recipeInstructions[2].tumbi, { voksen: true, voksen_hjaelp: 'varme' });
  });
});

// Det, der vises og læses op, er til køkkenet. Hvad kilden siger, og hvad der er et skøn, står i «tumbi.kilde»
test('noter om kilden og skøn står i tumbi.kilde, ikke i den synlige tekst', () => {
  const fil = 'opskrifter/koedsovs.json';
  forventFejl(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Kilden siger to gulerødder.'; }, 'trin 3 (noten): «Kilden» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeInstructions[2].text = 'Riv dem, som kilden siger.'; }, 'trin 3: «kilden» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeYield = 'ca. 4 personer (skøn)'; }, '«recipeYield»: «skøn» er en redaktionel note');
  forventFejl(fil, (d) => { d.recipeIngredient[0] = '1 spsk olie (kildens mål)'; }, 'ingrediens 1: «kildens» er en redaktionel note');
  forventFejl(fil, (d) => { d.description = 'Kødsovs, som kilden laver den.'; }, '«description»: «kilden» er en redaktionel note');
  // Ordene inde i andre ord tæller ikke
  forventGyldig(fil, (d) => { d.recipeInstructions[2].tumbi.note = 'Brug kildevand, hvis I har det. Skønt det tager tid.'; });
});

// Kildenoten står i printets fod. Har den flere sætninger, slutter den med punktum (UI-review 4: alle seks sluttede uden).
// En kort betegnelse som «Egen tekst» er ikke en sætning og står uden punktum
test('en kildenote med flere sætninger slutter med punktum', () => {
  const fil = 'opskrifter/hytteostboller.json';
  forventFejl(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Trinene er egen tekst'; }, '«tumbi.kilde» har flere sætninger og skal slutte med punktum');
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Arla: «Hytteostboller» (arla.dk). Trinene er egen tekst.'; });
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Egen tekst'; });
  // «ca. 3 dl» er en forkortelse, ikke en ny sætning
  forventGyldig(fil, (d) => { d.tumbi.kilde = 'Egen tekst med ca. 3 dl mælk'; });
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

// En pause (vente) med råt kød eller æg på hænderne: barnet går fra køkkenet uden at vaske sig.
// Pandekager får en pause mellem æggene (trin 7) og vasken
test('ingen pause med råt kød eller æg på hænderne', () => {
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions.splice(7, 0, { '@type': 'HowToStep', text: 'Lad dejen hvile.', tumbi: { verbum: 'vente', timer_sek: 600 } });
  }, 'trin 8: en pause med råt kød eller æg på hænderne fra trin 7');
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

test('manglende grafik for et verbum, en ret eller en gruppe', () => {
  const m = kopi();
  try {
    fs.rmSync(path.join(m, 'grafik/verbum-aelte.svg'));
    fs.rmSync(path.join(m, 'grafik/ret-boller.svg'));
    fs.rmSync(path.join(m, 'grafik/gruppe-bagning.svg'));
    const { fejl } = valider(m);
    assert.ok(fejl.includes('grafik/verbum-aelte.svg: billedet mangler (verbum «aelte»)'), fejl.join('\n'));
    assert.ok(fejl.includes('grafik/ret-boller.svg: billedet mangler (retten «boller»)'), fejl.join('\n'));
    assert.ok(fejl.includes('grafik/gruppe-bagning.svg: billedet mangler (gruppen «bagning»)'), fejl.join('\n'));
  } finally { ryd(m); }
});

test('lydlisten må kun nævne filer, der findes', () => {
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/3.mp3']; }, '«pandekager/3.mp3» står på listen, men filen lyd/pandekager/3.mp3 findes ikke');
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/99.mp3']; }, 'retten har kun 11 trin');
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
