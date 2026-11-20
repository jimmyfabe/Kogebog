// sw-indhold.js — fingeraftrykkene, service workeren (sw.js) bruger, regnet ét sted, så test/test-sw.js, e2e-delen
// «opdatering» og filen selv er enige:
//   INDHOLD (i sw.js): sha256 (16 tegn) over stierne og indholdet af alle FILER. Skifter ved hver ændring, så cachens
//     navn (VERSION) skifter, og enhederne henter den nye udgave.
//   sw-indhold.json: sha256 (16 tegn) af hver fil for sig, { indhold: INDHOLD, filer: { <sti i FILER>: <hash> } }.
//     Installationen af en ny udgave genbruger en fil fra den forrige cache, når dens hash er den samme i begge udgaver
//     (GitHub Pages giver alle filer udgivelsens tid som ETag, så 304 sparer intet på tværs af udgivelser; code review M2).
// Tekstfiler regnes med LF, for git på Windows kan give CRLF i arbejdsmappen, og samme indhold skal give samme tal overalt.
//
// Kør (Git Bash, i D:/Claude/Kogebog), når test/test-sw.js siger, at sw-indhold.json ikke passer:
//   node vaerktoej/sw-indhold.js
// Den skriver sw-indhold.json ud fra FILER og INDHOLD i sw.js. Sæt INDHOLD i sw.js først (test/test-sw.js viser værdien);
// passer INDHOLD ikke til filerne, skriver den intet og siger, hvad INDHOLD skal være.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const INDHOLD_FIL = 'sw-indhold.json';
const TEKSTFIL = /\.(html|js|css|json|svg|webmanifest)$/;
const fil = (f) => (f === './' ? 'index.html' : f);

// Indholdet, tallene regnes af: tekstfiler med LF. data er en Buffer (eller tekst, fx en fil, e2e har ændret i hukommelsen)
function normaliseret(f, data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  return TEKSTFIL.test(fil(f)) ? Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : buf;
}

// erstat: Map fra sti til indhold, der bruges i stedet for filen på disken (e2e: en ny udgave uden at røre disken)
const laeser = (rod, erstat) => (f) => (erstat && erstat.has(f) ? erstat.get(f) : fs.readFileSync(path.join(rod, fil(f))));

// Én fil: sha256 (16 tegn) af indholdet
export const filHash = (f, data) => crypto.createHash('sha256').update(normaliseret(f, data)).digest('hex').slice(0, 16);

// INDHOLD (og LYD for lydfilerne): sha256 (16 tegn) over stierne og indholdet i listens rækkefølge
export function indholdAf(rod, filer, erstat = null) {
  const laes = laeser(rod, erstat);
  const h = crypto.createHash('sha256');
  for (const f of filer) h.update(f + '\n').update(normaliseret(f, laes(f))).update('\n');
  return h.digest('hex').slice(0, 16);
}

// sw-indhold.json for filerne: hver fils hash, i FILER-rækkefølge
export function manifestAf(rod, filer, indhold, erstat = null) {
  const laes = laeser(rod, erstat);
  return { indhold, filer: Object.fromEntries(filer.map((f) => [f, filHash(f, laes(f))])) };
}

export const manifestTekst = (m) => JSON.stringify(m, null, 1) + '\n';

// FILER og INDHOLD, som de står i sw.js (læst i en sandkasse som i test/test-version.js)
export function fraSw(kilde) {
  const ctx = vm.createContext({ self: { addEventListener() {} } });
  vm.runInContext(kilde + '\n;globalThis.__FILER = FILER; globalThis.__INDHOLD = INDHOLD;', ctx);
  return { filer: [...ctx.__FILER], indhold: ctx.__INDHOLD };
}

function skriv(rod) {
  const { filer, indhold } = fraSw(fs.readFileSync(path.join(rod, 'sw.js'), 'utf8'));
  const nu = indholdAf(rod, filer);
  if (nu !== indhold) {
    console.error('INDHOLD i sw.js passer ikke til filerne. Sæt den til \'' + nu + '\', og kør så denne igen. Intet er skrevet.');
    return 1;
  }
  fs.writeFileSync(path.join(rod, INDHOLD_FIL), manifestTekst(manifestAf(rod, filer, indhold)));
  console.log(INDHOLD_FIL + ' er skrevet: ' + filer.length + ' filer, indhold ' + indhold + '.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = skriv(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
