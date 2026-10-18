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

const ANTAL_RETTER = laes(ROD, 'opskrifter/index.json').retter.length;

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
  forventFejl('opskrifter/index.json', (d) => { d.retter = d.retter.filter((x) => x !== 'boller'); }, 'opskrifter/boller.json: står ikke i opskrifter/index.json');
  forventFejl('opskrifter/index.json', (d) => { d.retter.push('lasagne'); }, 'retten «lasagne» findes ikke');
  forventFejl('opskrifter/index.json', (d) => { d.retter.push('boller'); }, 'id «boller» står der to gange');
});

test('manglende felter og for lange sætninger', () => {
  forventFejl('opskrifter/koedsovs.json', (d) => { delete d.name; }, 'opskrifter/koedsovs.json: mangler «name»');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.totalTime = '50 min'; }, '«totalTime» skal være en ISO 8601-varighed');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.recipeInstructions[3].text = 'Brun kødet i gryden ved høj varme i otte lange minutter.'; }, 'trin 4: teksten er for lang');
  forventFejl('opskrifter/koedsovs.json', (d) => { d.recipeInstructions[3].tumbi.farve = 'rød'; }, 'trin 4: ukendt felt «tumbi.farve»');
});

test('råt kød uden «vask hænderne» bagefter', () => {
  forventFejl('opskrifter/frikadeller.json', (d) => { d.recipeInstructions = d.recipeInstructions.filter((s, i) => i !== 12); },
    'rører råt kød eller æg (koed), men der kommer ikke et «vaske-haender»-trin bagefter');
});

test('andre ingredienser mellem råt kød/æg og håndvasken', () => {
  forventFejl('opskrifter/pandekager.json', (d) => {
    d.recipeInstructions.splice(7, 0, { '@type': 'HowToStep', text: 'Hæld sukker i.', tumbi: { verbum: 'haelde', ikoner: ['sukker'] } });
  }, 'trin 8: rører sukker med hænder, der har rørt råt kød eller æg i trin 7');
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

test('manglende grafik for et verbum eller en ret', () => {
  const m = kopi();
  try {
    fs.rmSync(path.join(m, 'grafik/verbum-aelte.svg'));
    fs.rmSync(path.join(m, 'grafik/ret-boller.svg'));
    const { fejl } = valider(m);
    assert.ok(fejl.includes('grafik/verbum-aelte.svg: billedet mangler (verbum «aelte»)'), fejl.join('\n'));
    assert.ok(fejl.includes('grafik/ret-boller.svg: billedet mangler (retten «boller»)'), fejl.join('\n'));
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
