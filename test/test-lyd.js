// test-lyd.js — lydfilerne (Røst-stemmen i lyd/) passer til det, appen læser op.
// Fejler, hvis en replik mangler sin fil i lyd/liste.json, hvis listen peger på en fil, der ikke findes, hvis en
// lydfil er lavet til en anden tekst end den, appen siger nu (lyd/tekster.json), eller hvis app.js læser noget op
// uden om js/replikker.js (så ville den nye tekst aldrig komme på talelisten).
// Kør:  node test/test-lyd.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lavTaleliste } from '../vaerktoej/lav-taleliste.js';

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
  assert.deepEqual(kald.filter((k) => !/^R\.[A-Za-z_]+(?:\(|$)/.test(k)), [], 'Tale.sig skal have en replik fra js/replikker.js (R.…)');
  // Ingen andre filer læser op
  for (const f of fs.readdirSync(path.join(ROD, 'js'))) {
    if (f === 'tale.js') continue;
    assert.ok(!/\bsig\(|speechSynthesis/.test(fs.readFileSync(path.join(ROD, 'js', f), 'utf8')), 'js/' + f + ' læser op uden om tale.js');
  }
});
