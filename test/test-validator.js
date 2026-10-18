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

test('de rigtige opskrifter er gyldige', () => {
  const { fejl, tal } = valider(ROD);
  assert.deepEqual(fejl, []);
  assert.equal(tal.retter, 5);
});

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
  forventFejl('opskrifter/frikadeller.json', (d) => { delete d.recipeInstructions[1].tumbi.voksen_hjaelp; }, 'trin 2: verbet «skaere» skal have "voksen": true og "voksen_hjaelp": "kniv"');
  forventFejl('opskrifter/frikadeller.json', (d) => { delete d.recipeInstructions[1].tumbi.voksen; }, 'trin 2: verbet «skaere» skal have "voksen": true');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[9].tumbi.voksen_hjaelp = 'ja'; }, 'trin 10: «voksen_hjaelp» skal være "kniv", "varme"');
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
  forventFejl('opskrifter/frikadeller.json', (d) => { d.recipeInstructions = d.recipeInstructions.filter((s, i) => i !== 10); },
    'rører råt kød eller æg (koed), men der kommer ikke et «vaske-haender»-trin bagefter');
});

test('ingrediens-ikoner skal være kendte og passe til mængden', () => {
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].ikon = 'kanel'; }, 'ingrediens 1: ukendt ikon "kanel"');
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser[0].maengde = '3 dl'; }, 'ingrediens 1: mængden «3 dl» passer ikke til «2,5 dl hvedemel»');
  forventFejl('opskrifter/pandekager.json', (d) => { d.tumbi.ingredienser.pop(); }, '«tumbi.ingredienser» har 6 linjer, men recipeIngredient har 7');
  forventFejl('opskrifter/pandekager.json', (d) => { d.recipeInstructions[1].tumbi.ikoner = ['chorizo']; }, 'trin 2: ikonet «chorizo» er ikke blandt rettens ingredienser');
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
  forventFejl('lyd/liste.json', (d) => { d.filer = ['pandekager/99.mp3']; }, 'retten har kun 12 trin');
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
    assert.match(ok.stdout, /^OK: 5 retter/);
  } finally { ryd(m); }
});
