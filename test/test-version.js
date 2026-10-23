// test-version.js — versionsnummeret (UDGAVE i js/version.js) skal hæves, hver gang en fil, appen henter, ændres.
// UDGAVE_INDHOLD ved siden af er filernes fingeraftryk for det nummer. Ændres en fil uden et nyt nummer, fejler testen og
// skriver de to nye linjer i fejlbeskeden. Er filerne ændret siden main, skal nummeret også være højere end mains.
// Testen ændrer ikke js/version.js selv. Samme opbygning som LEGO-appens test/test-version.js.
// Kør:  node test/test-version.js            (tester projektmappen)
//       node test/test-version.js <mappe>    (tester en kopi, fx for at se fejlbeskeden)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROD = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lf = (s) => s.replace(/\r\n/g, '\n');
const laes = (f) => lf(fs.readFileSync(path.join(ROD, f), 'utf8'));
const VERSIONSFIL = 'js/version.js';
const U_LINJE = /^export const UDGAVE = '([^']*)';/gm;
const I_LINJE = /^export const UDGAVE_INDHOLD = '([^']*)';/gm;

// Filerne, appen henter: FILER i sw.js (læst i en sandkasse) og sw.js selv. Lyden er med gennem LYD i sw.js.
const swKilde = laes('sw.js');
const ctx = vm.createContext({ self: { addEventListener() {} } });
vm.runInContext(swKilde + '\n;globalThis.__FILER = FILER;', ctx);
const FILER = ctx.__FILER.map((f) => (f === './' ? 'index.html' : f)).filter((f, i, a) => a.indexOf(f) === i).concat('sw.js');

// sha256 (16 tegn) over stierne og indholdet i FILER-rækkefølge. Tekstfiler regnes med LF, for git på Windows kan give
// CRLF. I js/version.js tæller værdierne af UDGAVE og UDGAVE_INDHOLD ikke med, så et hævet nummer alene ikke ændrer
// fingeraftrykket. I sw.js tæller INDHOLD ikke med: den skifter med js/version.js, og filerne er her i forvejen.
const TEKSTFIL = /\.(html|js|css|json|svg|webmanifest)$/;
function fingeraftryk(kilde = (f) => fs.readFileSync(path.join(ROD, f))) {
  const h = crypto.createHash('sha256');
  for (const f of FILER) {
    let data = kilde(f);
    if (TEKSTFIL.test(f)) {
      let t = lf(data.toString('utf8'));
      if (f === VERSIONSFIL) t = t.replace(U_LINJE, "export const UDGAVE = '';").replace(I_LINJE, "export const UDGAVE_INDHOLD = '';");
      if (f === 'sw.js') t = t.replace(/^const INDHOLD = '[0-9a-f]*';/m, "const INDHOLD = '';");
      data = Buffer.from(t, 'utf8');
    }
    h.update(f + '\n').update(data).update('\n');
  }
  return h.digest('hex').slice(0, 16);
}

const to = (n) => String(n).padStart(2, '0');
const nu = new Date();
const idag = to(nu.getDate()) + '-' + to(nu.getMonth() + 1) + '-' + nu.getFullYear();
const nyeLinjer = (nr, h) => "Sæt i js/version.js:\n  export const UDGAVE = 'v" + nr + ' · ' + idag + "';\n" +
  "  export const UDGAVE_INDHOLD = 'v" + nr + ':' + h + "';";

const vKilde = laes(VERSIONSFIL);
const uFund = [...vKilde.matchAll(U_LINJE)];
const iFund = [...vKilde.matchAll(I_LINJE)];
const UDGAVE = uFund.length ? uFund[0][1] : '';
const uM = /^v(\d+) · (\d{2})-(\d{2})-(\d{4})$/.exec(UDGAVE);
const iM = /^v(\d+):([0-9a-f]{16})$/.exec(iFund.length ? iFund[0][1] : '');
const dato = (m) => m[4] + m[3] + m[2]; // ÅÅÅÅMMDD, så datoer kan sammenlignes som tekst

// Mains nummer (det udgivne): 0, når main findes uden js/version.js, og null uden git eller main
const vis = (f) => execFileSync('git', ['-C', ROD, 'show', 'main:./' + f], { stdio: ['ignore', 'pipe', 'ignore'] });
let mU = null, mainNr = null;
try {
  execFileSync('git', ['-C', ROD, 'rev-parse', '--verify', '--quiet', 'main^{commit}'], { stdio: 'ignore' });
  mainNr = 0;
  try { mU = /^export const UDGAVE = 'v(\d+) · (\d{2})-(\d{2})-(\d{4})';/m.exec(lf(vis(VERSIONSFIL).toString('utf8'))); } catch { /* main har ingen js/version.js */ }
  if (mU) mainNr = +mU[1];
} catch { /* ingen git eller ingen main */ }

test('UDGAVE står én gang og har formen v<nr> · DD-MM-ÅÅÅÅ med en rigtig dato, der ikke er i fremtiden', () => {
  assert.equal(uFund.length, 1, 'UDGAVE skal stå én gang i ' + VERSIONSFIL);
  assert.ok(uM, "UDGAVE har ikke formen v<nr> · DD-MM-ÅÅÅÅ: '" + UDGAVE + "'");
  const d = new Date(+uM[4], +uM[3] - 1, +uM[2]);
  assert.ok(+uM[1] >= 1 && d.getDate() === +uM[2] && d.getMonth() === +uM[3] - 1 && d <= nu, 'datoen findes ikke eller er i fremtiden: ' + UDGAVE);
});

test('UDGAVE_INDHOLD står én gang og har formen v<nr>:<16 tegn>', () => {
  assert.equal(iFund.length, 1, 'UDGAVE_INDHOLD skal stå én gang i ' + VERSIONSFIL);
  assert.ok(iM, "UDGAVE_INDHOLD har ikke formen v<nr>:<16 tegn>: '" + iFund[0][1] + "'");
});

test('filerne er ikke ændret uden et nyt versionsnummer', () => {
  assert.ok(uM && iM, 'kan ikke regnes, se fejlene ovenfor');
  const h = fingeraftryk(), vNr = +uM[1], iNr = +iM[1];
  assert.ok(iNr <= vNr, 'nummeret må ikke gå ned: UDGAVE er v' + vNr + ', men UDGAVE_INDHOLD er sat for v' + iNr);
  if (iM[2] === h) {
    assert.equal(iNr, vNr, "nummeret er hævet uden ændrede filer. Sæt UDGAVE_INDHOLD i js/version.js til 'v" + vNr + ':' + h + "'");
  } else if (iNr === vNr && mainNr !== null && vNr > mainNr) {
    // Nummeret hæves én gang pr. udgivelse: v<vNr> er ikke på main endnu, så kun fingeraftrykket skal skrives om
    assert.fail('filerne er ændret, men v' + vNr + ' er ikke udgivet endnu (main har ' + (mainNr ? 'v' + mainNr : 'intet nummer') +
      "). Sæt UDGAVE_INDHOLD i js/version.js til 'v" + vNr + ':' + h + "'");
  } else if (iNr === vNr) {
    assert.fail('filerne er ændret siden v' + iNr + ', men nummeret er det samme. ' + nyeLinjer(vNr + 1, h));
  } else {
    assert.fail('filerne er ændret, og nummeret er hævet til v' + vNr + ". Sæt UDGAVE_INDHOLD i js/version.js til 'v" + vNr + ':' + h + "'");
  }
});

// UDGAVE_INDHOLD alene bekræfter sig selv: skriver man kun fingeraftrykket om og beholder nummeret, passer testen
// ovenfor. Er filerne ændret siden main (det udgivne), skal nummeret derfor være højere end mains, og datoen må ikke være
// ældre. Springes over uden git, eller når main endnu ikke har et nummer.
test('nummeret er hævet siden main', (t) => {
  if (!mU) { t.skip('main har intet versionsnummer endnu'); return; }
  assert.ok(uM, 'kan ikke regnes, se fejlene ovenfor');
  let hMain = null;
  try { hMain = fingeraftryk(vis); } catch { /* en fil i FILER findes ikke på main: filerne er ændret */ }
  if (hMain === fingeraftryk()) return; // samme filer som main
  const mNr = +mU[1];
  assert.ok(+uM[1] > mNr && dato(uM) >= dato(mU), 'filerne er ændret siden main (v' + mNr + ' · ' + mU[2] + '-' + mU[3] + '-' + mU[4] +
    '), men nummeret er ' + UDGAVE + '. ' + nyeLinjer(mNr + 1, fingeraftryk()));
});

// Kommentarer fjernes først, så et udkommenteret kald ikke tæller
const udenKommentarer = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
test('forsiden og begge print viser nummeret', () => {
  for (const [fil, fra] of [['app.js', './js/version.js'], ['js/print.js', './version.js'], ['js/print-uge.js', './version.js']]) {
    const k = udenKommentarer(laes(fil));
    assert.ok(k.includes("import { UDGAVE } from '" + fra + "';"), fil + ' skal hente UDGAVE fra ' + fra);
    assert.match(k, /tekst: 'Version ' \+ UDGAVE/, fil + " skal vise 'Version ' + UDGAVE");
  }
});
