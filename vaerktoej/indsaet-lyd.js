// indsaet-lyd.js — lægger Røst-stemmens færdige mp3-filer i lyd/ og skriver lyd/liste.json og lyd/tekster.json.
// Kun filer, hvis tekst er præcis den, appen siger nu (lavTaleliste), kommer med: teksten, lyden blev lavet af, står i
// <udmappe>/maalinger.jsonl, og den valgte udgave (seed) i <udmappe>/kvalitet.json (D:/Stemmer/efterbehandl_kogebog.py).
// Resten læses af iPad-stemmen, som før. Se CLAUDE.md, «Stemmen».
// Kør:  node vaerktoej/indsaet-lyd.js D:/Stemmer/kogebog-500m
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lavTaleliste } from './lav-taleliste.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEMME = 'Røst v3 500m fra Alexandra Instituttet (referencestemmen «Nic»)';
const NAVN = /^[a-z0-9-]+\/[a-z0-9-]+\.mp3$/;

const ud = process.argv[2];
if (!ud || !fs.existsSync(path.join(ud, 'kvalitet.json'))) {
  console.error('Brug: node vaerktoej/indsaet-lyd.js <udmappe med kvalitet.json, maalinger.jsonl og mp3/>');
  process.exit(2);
}
const kvalitet = JSON.parse(fs.readFileSync(path.join(ud, 'kvalitet.json'), 'utf8')).filer;
const lavetAf = new Map(); // «fil|seed» → teksten, lyden blev lavet af (sidste måling vinder)
for (const linje of fs.readFileSync(path.join(ud, 'maalinger.jsonl'), 'utf8').split('\n')) {
  if (!linje.trim()) continue;
  const m = JSON.parse(linje);
  lavetAf.set(m.fil + '|' + m.seed, m.tekst);
}

const med = [];
const uden = [];
for (const { fil, tekst } of lavTaleliste()) {
  const k = kvalitet[fil];
  const kilde = path.join(ud, 'mp3', fil);
  const grund = !NAVN.test(fil) ? 'uventet filnavn'
    : !k || k.valgt === undefined ? 'ikke i kvalitet.json'
    : lavetAf.get(fil + '|' + k.valgt) !== tekst ? 'lavet af en anden tekst («' + lavetAf.get(fil + '|' + k.valgt) + '»)'
    : !fs.existsSync(kilde) ? 'ingen mp3'
    : null;
  if (grund) { uden.push(fil + ': ' + grund); continue; }
  const maal = path.join(ROD, 'lyd', fil);
  fs.mkdirSync(path.dirname(maal), { recursive: true });
  fs.copyFileSync(kilde, maal);
  med.push({ fil, tekst });
}
med.sort((a, b) => (a.fil < b.fil ? -1 : a.fil > b.fil ? 1 : 0));

const skriv = (sti, obj) => fs.writeFileSync(path.join(ROD, sti), JSON.stringify(obj, null, 2) + '\n');
skriv('lyd/liste.json', { version: 1, filer: med.map((x) => x.fil) });
skriv('lyd/tekster.json', { version: 1, stemme: STEMME, tekster: Object.fromEntries(med.map((x) => [x.fil, x.tekst])) });

const bytes = med.reduce((s, x) => s + fs.statSync(path.join(ROD, 'lyd', x.fil)).size, 0);
console.log(med.length + ' lydfiler i lyd/ (' + (bytes / 1e6).toFixed(2) + ' MB); ' + uden.length + ' uden lyd (iPad-stemmen)');
for (const u of uden) console.log('  ' + u);
