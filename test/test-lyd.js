// test-lyd.js — lydfilerne (Røst-stemmen i lyd/) passer til det, appen læser op.
// Fejler, hvis en replik mangler sin fil i lyd/liste.json, hvis listen peger på en fil, der ikke findes, hvis en
// lydfil er lavet til en anden tekst end den, appen siger nu (lyd/tekster.json), eller hvis app.js læser noget op
// uden om js/replikker.js (så ville den nye tekst aldrig komme på talelisten).
// Kør:  node test/test-lyd.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lavTaleliste, tilRoest, alleRetter } from '../vaerktoej/lav-taleliste.js';
import * as R from '../js/replikker.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const laes = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));
const LISTE = laes('lyd/liste.json');
const TEKSTER = fs.existsSync(path.join(ROD, 'lyd/tekster.json')) ? laes('lyd/tekster.json').tekster : {};
const TALE = lavTaleliste();
const HVORDAN = ' (lav lyden som beskrevet i CLAUDE.md, «Stemmen»)';

test('hver replik har sin lydfil i lyd/liste.json', () => {
  const filer = new Set(LISTE.filer);
  const mangler = TALE.filter((x) => !filer.has(x.fil)).map((x) => x.fil);
  assert.deepEqual(mangler, [], mangler.length + ' af ' + TALE.length + ' replikker mangler i lyd/liste.json' + HVORDAN);
});

test('lyd/liste.json peger kun på filer, der findes, og som appen spiller', () => {
  assert.equal(LISTE.version, 1);
  assert.ok(Array.isArray(LISTE.filer), 'filer skal være en liste');
  assert.equal(new Set(LISTE.filer).size, LISTE.filer.length, 'dubletter i lyd/liste.json');
  for (const f of LISTE.filer) assert.match(f, /^[a-z0-9-]+\/[a-z0-9-]+\.mp3$/, 'uventet filnavn i lyd/liste.json: ' + f);
  const findesIkke = LISTE.filer.filter((f) => !fs.existsSync(path.join(ROD, 'lyd', f)));
  assert.deepEqual(findesIkke, [], 'lyd/liste.json peger på filer, der ikke findes');
  const kendte = new Set(TALE.map((x) => x.fil));
  assert.deepEqual(LISTE.filer.filter((f) => !kendte.has(f)), [], 'lyd/liste.json nævner filer, som appen aldrig spiller');
});

test('hver lydfil er lavet til præcis den tekst, appen siger nu', () => {
  const filer = new Set(LISTE.filer);
  const forkert = TALE.filter((x) => filer.has(x.fil) && TEKSTER[x.fil] !== x.tekst)
    .map((x) => x.fil + ': lyden siger «' + TEKSTER[x.fil] + '», appen siger «' + x.tekst + '»');
  assert.deepEqual(forkert, [], 'teksten er ændret efter lyden blev lavet' + HVORDAN);
});

test('hver mp3 i lyd/ står i listen og er en mp3-fil', () => {
  const mp3 = [];
  const gaa = (mappe) => {
    for (const d of fs.readdirSync(path.join(ROD, 'lyd', mappe), { withFileTypes: true })) {
      const rel = mappe ? mappe + '/' + d.name : d.name;
      if (d.isDirectory()) gaa(rel);
      else if (d.name.endsWith('.mp3')) mp3.push(rel);
    }
  };
  gaa('');
  const filer = new Set(LISTE.filer);
  assert.deepEqual(mp3.filter((f) => !filer.has(f)), [], 'mp3-filer i lyd/, som ikke står i lyd/liste.json');
  for (const f of mp3) {
    const b = fs.readFileSync(path.join(ROD, 'lyd', f)).subarray(0, 3);
    assert.ok(b.toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), f + ' er ikke en mp3-fil');
  }
});

test('app.js læser kun op gennem js/replikker.js', () => {
  const app = fs.readFileSync(path.join(ROD, 'app.js'), 'utf8');
  const kald = [...app.matchAll(/Tale\.sig\(\s*([^,)]*)/g)].map((m) => m[1].trim());
  assert.ok(kald.length >= 10, 'fandt kun ' + kald.length + ' kald til Tale.sig i app.js');
  // … også replikken, der siges bagefter (Tale.sig(…, { derefter: R.… }))
  const derefter = [...app.matchAll(/derefter:\s*([^,)}]*)/g)].map((m) => m[1].trim());
  assert.ok(derefter.length >= 1, 'fandt ingen derefter i app.js');
  kald.push(...derefter);
  assert.deepEqual(kald.filter((k) => !/^R\.[A-Za-z_]+(?:\(|$)/.test(k)), [], 'Tale.sig skal have en replik fra js/replikker.js (R.…)');
  // Hver replik, app.js læser op (R.NAVN), skal også stå på talelisten (vaerktoej/lav-taleliste.js). Ellers får den
  // aldrig en lydfil, og alle tjek ovenfor er grønne alligevel (bevist med en ny R.NY i code review 19-10)
  const taleliste = fs.readFileSync(path.join(ROD, 'vaerktoej/lav-taleliste.js'), 'utf8');
  const paaListen = new Set([...taleliste.matchAll(/\bR\.([A-Za-z_]+)/g)].map((m) => m[1]));
  const brugt = [...new Set(kald.map((k) => /^R\.([A-Za-z_]+)/.exec(k)).filter(Boolean).map((m) => m[1]))];
  assert.deepEqual(brugt.filter((n) => !paaListen.has(n)), [], 'app.js læser disse replikker op, men de mangler i vaerktoej/lav-taleliste.js (så får de ingen lydfil)');
  // Ingen andre filer læser op
  for (const f of fs.readdirSync(path.join(ROD, 'js'))) {
    if (f === 'tale.js') continue;
    assert.ok(!/\bsig\(|speechSynthesis/.test(fs.readFileSync(path.join(ROD, 'js', f), 'utf8')), 'js/' + f + ' læser op uden om tale.js');
  }
});

// Jimmy 21-10-2026: «Hent en voksen» på hvert voksen-trin (og ved hvert kort tryk på «Næste») var irriterende at høre på.
// Trinnet siger nu kun sig selv, og trekanten på skærmen viser, at en voksen hjælper
test('et voksen-trin siger kun trinnet, ikke «Hent en voksen»', () => {
  const voksenTrin = alleRetter().flatMap((m) => m.trin.filter((t) => t.voksen).map((t) => [m, t]));
  assert.ok(voksenTrin.length >= 100, 'fandt kun ' + voksenTrin.length + ' voksen-trin');
  const forkert = voksenTrin.filter(([m, t]) => R.trin(m, t).tekst !== t.tekst).map(([m, t]) => R.trin(m, t).fil + ': ' + R.trin(m, t).tekst);
  assert.deepEqual(forkert, [], 'et voksen-trin skal sige præcis sin tekst');
  assert.deepEqual(TALE.filter((x) => /hent en voksen/i.test(x.tekst)).map((x) => x.fil), [], 'ingen replik må sige «Hent en voksen»');
});

// Når retten åbnes: én replik efter rettens voksen-trin (kun varme, kun kniv eller begge), og ingen uden voksen-trin
test('en ret med voksen-trin får start-replikken i den rigtige udgave', () => {
  const ret = (...slags) => ({ trin: slags.map((s, i) => ({ nr: i + 1, voksen: s !== null, voksenSlags: s })) });
  const start = 'Den her ret laver du sammen med en voksen. ';
  const slut = ' Når du ser trekanten, holder den voksne knappen inde.';
  assert.deepEqual(R.voksenStart(ret(null, 'varme', 'kniv', 'varme')),
    { tekst: start + 'Der er varme og skarpe ting.' + slut, fil: 'faelles/voksen-start-begge.mp3' });
  assert.deepEqual(R.voksenStart(ret('varme', null)), { tekst: start + 'Der er varme ting.' + slut, fil: 'faelles/voksen-start-varme.mp3' });
  assert.deepEqual(R.voksenStart(ret(null, 'kniv')), { tekst: start + 'Der er skarpe ting.' + slut, fil: 'faelles/voksen-start-kniv.mp3' });
  assert.equal(R.voksenStart(ret(null, null)), null, 'barnet kan lave retten selv: ingen replik');
  // De rigtige retter
  const m = Object.fromEntries(alleRetter().map((x) => [x.id, x]));
  assert.equal(R.voksenStart(m.pandekager).fil, 'faelles/voksen-start-varme.mp3', 'pandekager: kun varme');
  assert.equal(R.voksenStart(m.koedsovs).fil, 'faelles/voksen-start-begge.mp3', 'kødsovs: kniv og varme');
  assert.equal(R.voksenStart(m.havregrynskugler), null, 'havregrynskugler: ingen voksen-trin');
  // Alle tre udgaver er på talelisten (også kniv, som ingen ret bruger endnu), og app.js siger den, når retten åbnes
  for (const x of Object.values(R.VOKSEN_START)) assert.ok(TALE.some((y) => y.fil === x.fil), x.fil + ' mangler på talelisten');
  const app = fs.readFileSync(path.join(ROD, 'app.js'), 'utf8');
  assert.match(app, /Tale\.sig\(R\.retAaben\(m\), \{ derefter: R\.voksenStart\(m\) \}\)/, 'app.js skal sige R.voksenStart efter navnet, når retten åbnes');
});

// Røst siger «Bagning» som «bau-ning», så talelisten skriver ordet, som det lyder (UDTALE), men kun til Røst (21-10)
test('UDTALE retter kun hele ord, beholder stort bogstav og når kun Røst', () => {
  assert.equal(tilRoest('Bagning'), 'Bæining');
  assert.equal(tilRoest('nu kommer bagning.'), 'nu kommer bæining.');
  assert.equal(tilRoest('Bagningen og ombagning'), 'Bagningen og ombagning', 'kun hele ord');
  assert.equal(tilRoest('toString constructor'), 'toString constructor', 'arvede egenskaber er ikke ord på listen');
  assert.equal(TALE.find((x) => x.fil === 'faelles/gruppe-bagning.mp3').tekst, 'Bæining');
  assert.equal(R.gruppe('bagning').tekst, 'Bagning', 'skærmen og iPad-stemmen får det rigtige ord');
});

// indsaet-lyd.js i en midlertidig kopi af appen: gamle mp3-filer nævnes, og --ryd sletter kun dem (code review 19-10)
test('indsaet-lyd.js nævner gamle mp3-filer og sletter dem kun med --ryd', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kog-indsaet-'));
  try {
    for (const d of ['js', 'vaerktoej', 'opskrifter']) fs.cpSync(path.join(ROD, d), path.join(tmp, d), { recursive: true });
    fs.copyFileSync(path.join(ROD, 'package.json'), path.join(tmp, 'package.json'));
    const mp3 = Buffer.from('ID3 falsk');
    const laeg = (sti) => { fs.mkdirSync(path.dirname(sti), { recursive: true }); fs.writeFileSync(sti, mp3); };
    // Røst-mappen: kun «Færdig!» er lavet, af den tekst appen siger nu
    const ud = path.join(tmp, 'roest');
    const faerdig = TALE.find((x) => x.fil === 'faelles/faerdig.mp3');
    fs.mkdirSync(ud);
    fs.writeFileSync(path.join(ud, 'kvalitet.json'), JSON.stringify({ filer: { 'faelles/faerdig.mp3': { valgt: 42 } } }));
    fs.writeFileSync(path.join(ud, 'maalinger.jsonl'), JSON.stringify({ fil: faerdig.fil, seed: 42, tekst: faerdig.tekst }) + '\n');
    laeg(path.join(ud, 'mp3', 'faelles', 'faerdig.mp3'));
    // lyd/ har en fil fra en ret, der ikke findes mere, og en, hvis tekst er ændret uden ny lyd
    laeg(path.join(tmp, 'lyd', 'gammel-ret', '1.mp3'));
    laeg(path.join(tmp, 'lyd', 'faelles', 'print-hold.mp3'));
    const koer = (...a) => spawnSync(process.execPath, [path.join(tmp, 'vaerktoej', 'indsaet-lyd.js'), ud, ...a], { encoding: 'utf8' });

    let k = koer();
    assert.equal(k.status, 0, k.stderr);
    assert.match(k.stdout, /2 gamle lydfiler i lyd\/.*--ryd/);
    assert.match(k.stdout, /faelles\/print-hold\.mp3/);
    assert.ok(fs.existsSync(path.join(tmp, 'lyd', 'gammel-ret', '1.mp3')), 'uden --ryd slettes intet');

    k = koer('--ryd');
    assert.equal(k.status, 0, k.stderr);
    assert.match(k.stdout, /2 gamle lydfiler i lyd\/.*\(slettet\)/);
    assert.ok(!fs.existsSync(path.join(tmp, 'lyd', 'gammel-ret')), 'den tomme mappe skal væk');
    assert.ok(!fs.existsSync(path.join(tmp, 'lyd', 'faelles', 'print-hold.mp3')));
    assert.ok(fs.existsSync(path.join(tmp, 'lyd', 'faelles', 'faerdig.mp3')), 'filen på listen må ikke slettes');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'lyd', 'liste.json'), 'utf8')).filer, ['faelles/faerdig.mp3']);
    assert.ok(fs.existsSync(path.join(tmp, 'lyd', 'tekster.json')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
