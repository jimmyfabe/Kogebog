// indsaet-lyd.js — lægger Røst-stemmens færdige mp3-filer i lyd/ og skriver lyd/liste.json og lyd/tekster.json.
// Kun filer, hvis tekst er præcis den, appen siger nu (lavTaleliste), kommer med: teksten, lyden blev lavet af, står i
// <udmappe>/maalinger.jsonl, og den valgte udgave (seed) i <udmappe>/kvalitet.json (D:/Stemmer/efterbehandl_kogebog.py).
// Resten læses af iPad-stemmen, som før. Se CLAUDE.md, «Stemmen».
// Gamle mp3-filer i lyd/, som ikke kom på den nye liste (replikken findes ikke mere, eller dens tekst er ændret uden
// ny lyd), nævnes bagefter. Med --ryd slettes de (kun .mp3 i lyd/<mappe>/, og tomme mapper i lyd/).
// --kun-rens (uden Røst-mappe): fjerner kun de filer fra lyd/liste.json og lyd/tekster.json, hvis tekst er ændret (se
// rensListen nedenfor). Ingen mp3 kopieres eller slettes.
// Kør:  node vaerktoej/indsaet-lyd.js D:/Stemmer/kogebog-500m [--ryd]
//       node vaerktoej/indsaet-lyd.js --kun-rens
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lavTaleliste } from './lav-taleliste.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEMME = 'Røst v3 500m fra Alexandra Instituttet (referencestemmen «Nic»)';
const NAVN = /^[a-z0-9-]+\/[a-z0-9-]+\.mp3$/;

const skriv = (sti, obj) => fs.writeFileSync(path.join(ROD, sti), JSON.stringify(obj, null, 2) + '\n');

// --kun-rens: tale.js spiller lyd/<fil>, når filen står i lyd/liste.json, og ser ikke på teksten. Er en replik ændret
// (fx en discount-bytning i en opskrift), ville den gamle mp3 sige den gamle tekst. Fjern derfor hver fil, hvis tekst i
// lyd/tekster.json ikke er præcis den, lavTaleliste giver nu (også en fil, som ingen replik bruger mere). Så læser
// iPad-stemmen replikken, til Røst har lavet den igen. mp3-filerne bliver liggende (test-lyd.js nævner dem som mp3 uden
// for listen), og Røst skriver dem over med samme navn.
function rensListen() {
  const laes = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));
  const liste = laes('lyd/liste.json');
  const tekster = laes('lyd/tekster.json');
  if (liste.version !== 1 || !Array.isArray(liste.filer)) throw new Error('lyd/liste.json har ikke formen { version: 1, filer: [...] }');
  if (tekster.version !== 1 || !tekster.tekster || typeof tekster.tekster !== 'object' || Array.isArray(tekster.tekster)) {
    throw new Error('lyd/tekster.json har ikke formen { version: 1, tekster: { fil: tekst } }');
  }
  const nu = new Map(lavTaleliste().map((x) => [x.fil, x.tekst]));
  const passer = (f) => Object.hasOwn(tekster.tekster, f) && tekster.tekster[f] === nu.get(f);
  const behold = liste.filer.filter(passer);
  const fjernet = liste.filer.filter((f) => !passer(f));
  const iListe = new Set(liste.filer);
  const udenFil = Object.keys(tekster.tekster).filter((f) => !iListe.has(f));
  console.log(fjernet.length + ' af ' + liste.filer.length + ' lydfiler er lavet af en anden tekst end den, appen siger nu'
    + (fjernet.length ? ' (fjernet fra lyd/liste.json og lyd/tekster.json; mp3-filerne står endnu):' : ''));
  for (const f of fjernet) console.log('  ' + f + ': lyden siger «' + tekster.tekster[f] + '», appen siger «' + (nu.get(f) ?? '(ingen replik)') + '»');
  if (udenFil.length) console.log(udenFil.length + ' tekster i lyd/tekster.json uden fil i lyd/liste.json (fjernet)');
  if (!fjernet.length && !udenFil.length) return;
  skriv('lyd/liste.json', { version: 1, filer: behold });
  skriv('lyd/tekster.json', { version: 1, stemme: tekster.stemme ?? STEMME, tekster: Object.fromEntries(behold.map((f) => [f, tekster.tekster[f]])) });
  console.log(behold.length + ' lydfiler tilbage. Sæt den nye INDHOLD i sw.js (lyd/liste.json står i FILER), se test/test-sw.js');
}

const BRUG = 'Brug: node vaerktoej/indsaet-lyd.js <udmappe med kvalitet.json, maalinger.jsonl og mp3/> [--ryd]\n'
  + '  eller: node vaerktoej/indsaet-lyd.js --kun-rens';
const argumenter = process.argv.slice(2);
const ryd = argumenter.includes('--ryd');
const kunRens = argumenter.includes('--kun-rens');
const ud = argumenter.find((a) => !a.startsWith('--'));
const ukendt = argumenter.filter((a) => a.startsWith('--') && a !== '--ryd' && a !== '--kun-rens');
if (ukendt.length || (kunRens ? ud || ryd : !ud || !fs.existsSync(path.join(ud, 'kvalitet.json')))) {
  console.error(BRUG);
  process.exit(2);
}
if (kunRens) {
  try {
    rensListen();
  } catch (e) {
    console.error('indsaet-lyd.js --kun-rens: ' + e.message);
    process.exit(1);
  }
  process.exit(0);
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

skriv('lyd/liste.json', { version: 1, filer: med.map((x) => x.fil) });
skriv('lyd/tekster.json', { version: 1, stemme: STEMME, tekster: Object.fromEntries(med.map((x) => [x.fil, x.tekst])) });

const bytes = med.reduce((s, x) => s + fs.statSync(path.join(ROD, 'lyd', x.fil)).size, 0);
console.log(med.length + ' lydfiler i lyd/ (' + (bytes / 1e6).toFixed(2) + ' MB); ' + uden.length + ' uden lyd (iPad-stemmen)');
for (const u of uden) console.log('  ' + u);

// Gamle filer: mp3 i lyd/<mappe>/, som ikke står på den nye liste (appen spiller dem aldrig, og test-lyd.js fejler)
const paaListen = new Set(med.map((x) => x.fil));
const LYD = path.join(ROD, 'lyd');
const gamle = [];
for (const d of fs.readdirSync(LYD, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(LYD, d.name))) {
    if (f.endsWith('.mp3') && !paaListen.has(d.name + '/' + f)) gamle.push(d.name + '/' + f);
  }
}
if (gamle.length) {
  console.log(gamle.length + ' gamle lydfiler i lyd/, som ingen replik bruger nu' + (ryd ? ' (slettet):' : ' (slet dem med --ryd):'));
  for (const g of gamle) {
    console.log('  ' + g);
    if (ryd) fs.unlinkSync(path.join(LYD, g));
  }
  if (ryd) {
    for (const d of fs.readdirSync(LYD, { withFileTypes: true })) {
      if (d.isDirectory() && !fs.readdirSync(path.join(LYD, d.name)).length) fs.rmdirSync(path.join(LYD, d.name));
    }
  }
}
