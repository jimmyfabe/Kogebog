// test-sw.js — kører sw.js i en sandkasse (node:vm) med falske caches og fetch.
// Tjekker: FILER er komplet og findes, INDHOLD passer til filerne (så VERSION skifter ved hver ændring),
// kun «kog-»-caches slettes, netværk først for opskrifterne, cache først for resten.
// Kør:  node test/test-sw.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { INDHOLD_FIL, indholdAf as indholdI, manifestAf, filHash } from '../vaerktoej/sw-indhold.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KILDE = fs.readFileSync(path.join(ROD, 'sw.js'), 'utf8');
const SCOPE = 'https://eksempel.test/Kogebog/';
const ORIGIN = 'https://eksempel.test';

const absolut = (input) => new URL(typeof input === 'string' ? input : input.url, SCOPE).href;
const utenSoeg = (href) => href.replace(/[?#].*$/, '');

// Request, der forstår relative stier som i en rigtig service worker
class SwRequest extends Request {
  constructor(input, init) { super(typeof input === 'string' ? absolut(input) : input, init); }
}

function falskeCaches(start = {}) {
  const lagre = new Map();
  const lavCache = (navn) => {
    if (!lagre.has(navn)) lagre.set(navn, new Map());
    const m = lagre.get(navn);
    return {
      async match(req, o = {}) {
        const n = absolut(req);
        for (const [k, v] of m) if (k === n || (o.ignoreSearch && utenSoeg(k) === utenSoeg(n))) return v.clone();
        return undefined;
      },
      async put(req, res) { m.set(absolut(req), res); },
      async delete(req) { return m.delete(absolut(req)); },
    };
  };
  for (const [navn, filer] of Object.entries(start)) {
    const c = lavCache(navn);
    for (const [f, tekst] of Object.entries(filer)) c.put(f, new Response(tekst));
  }
  return {
    lagre,
    async open(navn) { return lavCache(navn); },
    async keys() { return [...lagre.keys()]; },
    async delete(navn) { return lagre.delete(navn); },
  };
}

// ur: falsk setTimeout/clearTimeout (standard: de rigtige), så testen selv kan lade tiden gå. naa: falsk Date.now()
// kilde: sw.js, som den ser ud i en anden udgave (standard: filen på disken)
function lavSw({ caches, fetch, ur = { setTimeout, clearTimeout }, naa, kilde = KILDE }) {
  const haendelser = {};
  const self = {
    addEventListener: (type, fn) => { haendelser[type] = fn; },
    registration: { scope: SCOPE },
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
  };
  const ctx = vm.createContext({ self, caches, fetch, Request: SwRequest, Response, URL, AbortController, console, setTimeout: ur.setTimeout, clearTimeout: ur.clearTimeout,
    crypto: globalThis.crypto, TextEncoder, TextDecoder,
    ...(naa ? { Date: class extends Date { static now() { return naa(); } } } : {}) });
  vm.runInContext(kilde + '\n;globalThis.__FILER = FILER; globalThis.__VERSION = VERSION; globalThis.__INDHOLD = typeof INDHOLD === \'undefined\' ? undefined : INDHOLD;'
    + ' globalThis.__LYD = typeof LYD === \'undefined\' ? undefined : LYD; globalThis.__LYD_CACHE = typeof LYD_CACHE === \'undefined\' ? undefined : LYD_CACHE;', ctx);
  return { haendelser, FILER: ctx.__FILER, VERSION: ctx.__VERSION, INDHOLD: ctx.__INDHOLD, LYD: ctx.__LYD, LYD_CACHE: ctx.__LYD_CACHE, hashAf: ctx.hashAf };
}

function haendelse(req) {
  const ventet = [];
  const h = { request: req, svar: null, respondWith(p) { h.svar = p; }, waitUntil(p) { ventet.push(p); } };
  h.ventet = ventet;
  return h;
}

const ok = (tekst) => new Response(tekst, { status: 200, headers: { 'Content-Type': 'text/plain' } });

test('FILER er komplet, uden dubletter, og hver fil findes', () => {
  const { FILER, VERSION } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  assert.match(VERSION, /^kog-/);
  assert.equal(new Set(FILER).size, FILER.length, 'dubletter i FILER');
  for (const f of FILER) {
    const fil = f === './' ? 'index.html' : f;
    assert.ok(fs.existsSync(path.join(ROD, fil)), 'FILER nævner en fil, der ikke findes: ' + f);
  }
  const forventet = ['index.html', 'print.html', 'app.js', 'app.css', 'print.css', 'manifest.webmanifest', 'lyd/liste.json'];
  for (const mappe of ['js', 'grafik', 'opskrifter', 'ikoner']) {
    for (const n of fs.readdirSync(path.join(ROD, mappe))) forventet.push(mappe + '/' + n);
  }
  const mangler = forventet.filter((f) => !FILER.includes(f));
  assert.deepEqual(mangler, [], 'disse filer mangler i sw.js FILER (så virker de ikke offline)');
});

// Code review L3 (22-10): CLAUDE.md er det, en ny session læser først. Den skal kende hvert modul, hver nøgle i
// localStorage og antallet af node-testfiler, ellers laver den sin egen nøgle eller kopierer rens() (afsnit 3)
test('CLAUDE.md nævner hver fil i js/, hver nøgle i lager.js og antallet af node-testfiler', () => {
  const md = fs.readFileSync(path.join(ROD, 'CLAUDE.md'), 'utf8');
  const ikkeNaevnt = fs.readdirSync(path.join(ROD, 'js')).filter((n) => !md.includes('js/' + n));
  assert.deepEqual(ikkeNaevnt, [], 'skriv disse filer i CLAUDE.md («Filer»)');
  const noegler = [...fs.readFileSync(path.join(ROD, 'js', 'lager.js'), 'utf8').matchAll(/= '(kog-[a-z0-9-]+)';/g)].map((m) => m[1]);
  assert.ok(noegler.length >= 3, 'fandt ikke nøglerne i lager.js');
  assert.deepEqual(noegler.filter((k) => !md.includes('`' + k + '`')), [], 'skriv disse nøgler i CLAUDE.md (lager.js og regel 5)');
  const tests = /const TESTS = \[([^\]]*)\]/.exec(fs.readFileSync(path.join(ROD, 'test', 'koer-alle.js'), 'utf8'))[1].match(/'test-[a-z-]+\.js'/g);
  assert.match(md, new RegExp('Alle node-tests \\(' + tests.length + ' filer'), 'antallet af testfiler i CLAUDE.md');
  assert.deepEqual(tests.map((t) => t.slice(1, -1)).filter((t) => !md.includes(t)), [], 'skriv disse testfiler i CLAUDE.md');
});

// sha256 (16 tegn) over stierne og indholdet i listens rækkefølge, regnet af vaerktoej/sw-indhold.js, som også laver
// sw-indhold.json. Tekstfiler regnes med LF, for git på Windows kan give CRLF i arbejdsmappen
const indholdAf = (filer) => indholdI(ROD, filer);

// Lydfilerne (lyd/<ret>/<navn>.mp3) står ikke i FILER (de gemmes, når de spilles), men de er også cache først.
// Derfor har de deres eget tal (LYD) og deres egen cache: en ny udgave af en lydfil giver en ny LYD_CACHE, og en ny
// udgave af appen (INDHOLD) sletter ikke den lyd, der allerede er gemt
function lydfiler() {
  const ud = [];
  for (const d of fs.readdirSync(path.join(ROD, 'lyd'), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(ROD, 'lyd', d.name))) if (f.endsWith('.mp3')) ud.push('lyd/' + d.name + '/' + f);
  }
  return ud.sort();
}

// app.js, js/*.js, grafikken osv. er «cache først»: kun en ny VERSION får dem ud til en enhed, der allerede har appen
test('INDHOLD i sw.js passer til filerne, og VERSION følger med', () => {
  const { FILER, VERSION, INDHOLD } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const nu = indholdAf(FILER);
  assert.equal(INDHOLD, nu, 'filerne er ændret: sæt INDHOLD i sw.js til \'' + nu + '\' (så skifter VERSION, og enhederne henter den nye udgave)');
  assert.equal(VERSION, 'kog-' + INDHOLD, 'VERSION skal være \'kog-\' + INDHOLD');
});

test('LYD i sw.js passer til lydfilerne, og LYD_CACHE følger med', () => {
  const { LYD, LYD_CACHE, VERSION } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const nu = indholdAf(lydfiler());
  assert.equal(LYD, nu, 'lydfilerne er ændret: sæt LYD i sw.js til \'' + nu + '\' (så får lyden en ny cache, og enhederne henter den nye lyd)');
  assert.equal(LYD_CACHE, 'kog-lyd-' + LYD, 'LYD_CACHE skal være \'kog-lyd-\' + LYD');
  assert.notEqual(LYD_CACHE, VERSION);
});

test('activate sletter kun gamle «kog-»-caches og beholder lyden, så længe lydfilerne er de samme', async () => {
  const caches = falskeCaches({ 'mat-2026-10-14-v163': {}, 'lego-v3': {}, 'kog-2026-01-01-v0': {}, 'kog-lyd-gammel': {}, 'andet': {} });
  const { haendelser, VERSION, LYD_CACHE } = lavSw({ caches, fetch: async () => ok('') });
  await caches.open(VERSION);
  await (await caches.open(LYD_CACHE)).put(SCOPE + 'lyd/pandekager/1.mp3', ok('lyd'));
  const h = haendelse(null);
  haendelser.activate(h);
  await Promise.all(h.ventet);
  assert.deepEqual((await caches.keys()).sort(), ['andet', 'lego-v3', 'mat-2026-10-14-v163', VERSION, LYD_CACHE].sort());
  assert.ok(await (await caches.open(LYD_CACHE)).match(SCOPE + 'lyd/pandekager/1.mp3'), 'den gemte lyd skal være der endnu');
});

test('install gemmer alle filer — eller ingen, hvis én mangler', async () => {
  const caches = falskeCaches();
  const { haendelser, FILER, VERSION } = lavSw({ caches, fetch: async (req) => ok('indhold af ' + absolut(req)) });
  const h = haendelse(null);
  haendelser.install(h);
  await Promise.all(h.ventet);
  assert.equal(caches.lagre.get(VERSION).size, FILER.length);

  const caches2 = falskeCaches();
  const sw2 = lavSw({ caches: caches2, fetch: async (req) => (absolut(req).endsWith('app.css') ? new Response('', { status: 404 }) : ok('x')) });
  const h2 = haendelse(null);
  sw2.haendelser.install(h2);
  await assert.rejects(Promise.all(h2.ventet), /Mangler: app\.css/);
  assert.equal(caches2.lagre.size, 0);
});

// Code review M2 (19-11): med «reload» hentede installationen alle filer forfra (18,9 MB, ingen 304), og på 4G blev den
// aldrig færdig. «no-cache» spørger stadig serveren hver gang (ETag/Last-Modified), men en uændret fil kommer som 304
// fra browserens egen cache. e2e-delen «opdatering» tæller svarene fra serveren
test('install spørger serveren om hver fil med «no-cache», så uændrede filer kan komme som 304', async () => {
  const hentet = [];
  const { haendelser, FILER } = lavSw({ caches: falskeCaches(), fetch: async (req) => { hentet.push({ sti: absolut(req).slice(SCOPE.length), cache: req.cache }); return ok('x'); } });
  const h = haendelse(null);
  haendelser.install(h);
  await Promise.all(h.ventet);
  assert.equal(hentet.filter((x) => x.sti !== INDHOLD_FIL).length, FILER.length, 'uden en forrige udgave hentes alle filer');
  assert.deepEqual(hentet.filter((x) => x.sti === INDHOLD_FIL).length, 1, 'sw-indhold.json hentes én gang');
  assert.deepEqual([...new Set(hentet.map((x) => x.cache))], ['no-cache']);
});

// sw-indhold.json er hver fils sha256 (16 tegn), regnet af vaerktoej/sw-indhold.js (samme værktøj som INDHOLD). Passer den
// ikke til filerne, genbruger installationen en gammel fil, der er ændret, eller henter en uændret fil igen
test('sw-indhold.json passer til filerne og til INDHOLD', () => {
  const { FILER, INDHOLD } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const sti = path.join(ROD, INDHOLD_FIL);
  const raad = ': sæt INDHOLD i sw.js først (testen ovenfor viser den), og kør så «node vaerktoej/sw-indhold.js»';
  assert.ok(fs.existsSync(sti), 'sw-indhold.json mangler' + raad);
  const gemt = JSON.parse(fs.readFileSync(sti, 'utf8'));
  const nu = manifestAf(ROD, FILER, INDHOLD);
  assert.equal(gemt.indhold, INDHOLD, 'sw-indhold.json hører til en anden INDHOLD' + raad);
  const gemteFiler = gemt.filer && typeof gemt.filer === 'object' ? gemt.filer : {};
  const forkert = [...new Set([...Object.keys(nu.filer), ...Object.keys(gemteFiler)])].filter((f) => gemteFiler[f] !== nu.filer[f]);
  assert.deepEqual(forkert, [], 'disse filer har en forkert eller manglende hash i sw-indhold.json' + raad);
});

// Code review M2, andet review (19-11): GitHub Pages giver alle filer udgivelsens tid som ETag (målt med curl), så
// «no-cache» hentede hele appen (18,9 MB) ved hver udgivelse. Nu genbruger installationen en fil fra den forrige «kog-»-cache,
// når dens hash i sw-indhold.json er den samme i begge udgaver, og kun nye og ændrede filer hentes (med «no-cache»).
// En udgave på den falske server: hver fil indeholder «<sti> v1», undtagen de ændrede, og sw-indhold.json passer til dem.
// manifest: null giver 404 på sw-indhold.json, og en tekst sendes, som den er
function udgivelse(FILER, indhold, aendret = {}, manifest) {
  const fil = (f) => (Object.hasOwn(aendret, f) ? aendret[f] : f + ' v1');
  return { indhold, fil, manifest: manifest !== undefined ? manifest : { indhold, filer: Object.fromEntries(FILER.map((f) => [f, filHash(f, fil(f))])) } };
}
const swI = (indhold) => KILDE.replace(/const INDHOLD = '[^']*'/, "const INDHOLD = '" + indhold + "'");
const serverFor = (u, hentet) => async (req) => {
  const sti = absolut(req).slice(SCOPE.length) || './';
  hentet.push({ sti, cache: req.cache });
  if (sti !== INDHOLD_FIL) return ok(u.fil(sti));
  if (u.manifest === null) return new Response('', { status: 404 });
  return ok(typeof u.manifest === 'string' ? u.manifest : JSON.stringify(u.manifest));
};
async function installer(caches, u, hentet = []) {
  const sw = lavSw({ caches, kilde: swI(u.indhold), fetch: serverFor(u, hentet) });
  const h = haendelse(null);
  sw.haendelser.install(h);
  await Promise.all(h.ventet);
  return hentet.filter((x) => x.sti !== INDHOLD_FIL);
}
// To udgaver efter hinanden i samme caches (activate kører først bagefter, så den forrige cache er der endnu).
// mellem(cache) kan ændre den forrige udgaves cache før anden installation. Svar: stierne, anden installation hentede
async function toUdgaver(u1, u2, mellem = async () => {}) {
  const caches = falskeCaches();
  await installer(caches, u1);
  await mellem(await caches.open('kog-' + u1.indhold));
  const hentet = await installer(caches, u2);
  return { hentet, caches, cache: await caches.open('kog-' + u2.indhold) };
}
const FORRIGE = '1111111111111111';
const NY = '2222222222222222';

test('en ny udgave henter kun den ændrede fil og genbruger resten fra den forrige cache', async () => {
  const { FILER } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const caches = falskeCaches();
  assert.equal((await installer(caches, udgivelse(FILER, FORRIGE))).length, FILER.length, 'første installation henter alle filer');
  const ny = udgivelse(FILER, NY, { 'app.css': 'app.css v2' });
  const hentet = [];
  const filer = await installer(caches, ny, hentet);
  assert.deepEqual(filer, [{ sti: 'app.css', cache: 'no-cache' }], 'præcis én fetch for indholdsfilerne: den ændrede, med «no-cache»');
  assert.deepEqual(hentet.filter((x) => x.sti === INDHOLD_FIL), [{ sti: INDHOLD_FIL, cache: 'no-cache' }]);
  const cache = await caches.open('kog-' + NY);
  for (const f of FILER) assert.equal(await (await cache.match(f)).text(), ny.fil(f), f);
  assert.deepEqual(await (await cache.match(INDHOLD_FIL)).json(), ny.manifest, 'den nye udgaves sw-indhold.json gemmes til næste gang');
});

test('ved tvivl hentes filen: intet sw-indhold.json, en anden INDHOLD, en hash eller en fil, der mangler', async () => {
  const { FILER } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const u1 = udgivelse(FILER, FORRIGE);
  const ens = (manifest) => udgivelse(FILER, NY, {}, manifest);
  // Den forrige cache har intet sw-indhold.json (en udgave fra før, fx v13 fra 19-11): alt hentes
  let r = await toUdgaver(u1, ens(), async (c) => { await c.delete(INDHOLD_FIL); });
  assert.equal(r.hentet.length, FILER.length, 'den forrige cache har ingen sw-indhold.json');
  r = await toUdgaver(u1, ens(), async (c) => { await c.put(INDHOLD_FIL, ok('{ikke json')); });
  assert.equal(r.hentet.length, FILER.length, 'den forrige sw-indhold.json kan ikke læses');
  // Den nye kan ikke hentes (404) eller hører til en anden sw.js (fx et gammelt svar fra et mellemled): alt hentes, og
  // intet sw-indhold.json gemmes, så næste udgave heller ikke stoler på den
  for (const [hvad, manifest] of [['404', null], ['en anden INDHOLD', { indhold: FORRIGE, filer: u1.manifest.filer }], ['ikke json', '{x'], ['uden filer', { indhold: NY }]]) {
    r = await toUdgaver(u1, ens(manifest));
    assert.equal(r.hentet.length, FILER.length, hvad);
    assert.equal(await r.cache.match(INDHOLD_FIL), undefined, hvad + ': ingen sw-indhold.json i den nye cache');
    assert.equal(r.caches.lagre.get('kog-' + NY).size, FILER.length, hvad);
  }
  // Den forrige sw-indhold.json mangler en hash, og den forrige cache mangler en fil: kun de to hentes
  r = await toUdgaver(u1, ens(), async (c) => {
    const { 'app.js': _, ...uden } = u1.manifest.filer;
    await c.put(INDHOLD_FIL, ok(JSON.stringify({ indhold: FORRIGE, filer: uden })));
    await c.delete('app.css');
  });
  assert.deepEqual(r.hentet.map((x) => x.sti).sort(), ['app.css', 'app.js']);
  for (const f of FILER) assert.equal(await (await r.cache.match(f)).text(), f + ' v1', f);
});

// Code review M1 (v13b, 20-11): en forkert eller forældet fil fra nettet (en CDN-kant eller et mellemled, der svarer med den
// gamle udgave) blev gemt under den nye udgaves hash, og alle senere udgaver genbrugte den. Nu tjekkes hver hentet fil mod
// den nye sw-indhold.json, også når der ingen forrige udgave er. Afviger den, fejler installationen som ved en fil, der
// mangler, og intet sw-indhold.json gemmes, så den næste udgave ikke arver den
const harManifest = (caches, indhold) => Boolean(caches.lagre.get('kog-' + indhold)?.has(SCOPE + INDHOLD_FIL));
test('en hentet fil med en anden hash end sw-indhold.json: installationen fejler, også uden en forrige udgave', async () => {
  const { FILER } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  // Første installation: sw-indhold.json siger den nye app.css, men serveren sender den gamle
  const u1 = udgivelse(FILER, FORRIGE, { 'app.css': 'app.css v2' });
  let caches = falskeCaches();
  await assert.rejects(installer(caches, { ...u1, fil: (f) => (f === 'app.css' ? 'app.css v1' : u1.fil(f)) }), /Forkert indhold: app\.css/);
  assert.equal(caches.lagre.size, 0, 'uden en forrige udgave: intet gemmes');
  // De rigtige bytes giver en installation
  assert.equal((await installer(caches, u1)).length, FILER.length);
  assert.ok(harManifest(caches, FORRIGE), 'sw-indhold.json gemmes efter en hel installation');

  // Med en forrige udgave: den nye udgave ændrer app.css, men serveren sender den forrige. Installationen fejler, og den
  // halve cache har intet sw-indhold.json
  const u2 = udgivelse(FILER, NY, { 'app.css': 'app.css v3' });
  await assert.rejects(installer(caches, { ...u2, fil: (f) => (f === 'app.css' ? 'app.css v2' : u2.fil(f)) }), /Forkert indhold: app\.css/);
  assert.equal(harManifest(caches, NY), false, 'intet sw-indhold.json efter en fejlet installation');
  // Serveren er rettet: kun app.css hentes, og den rigtige gemmes
  const hentet = await installer(caches, u2);
  assert.deepEqual(hentet.map((x) => x.sti), ['app.css']);
  assert.equal(await (await (await caches.open('kog-' + NY)).match('app.css')).text(), 'app.css v3');
  assert.ok(harManifest(caches, NY));

  // Samme hash som værktøjet: CRLF i en tekstfil (git på Windows) er LF, og en binær fil regnes, som den er (\r\n bliver
  // stående), så en server med CRLF i arbejdsmappen og et billede med de bytes giver en installation
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x0d, 0x0a]);
  const u3 = udgivelse(FILER, FORRIGE, { 'app.css': 'a {}\nb {}\n', 'ikoner/ikon-180.png': png });
  caches = falskeCaches();
  await installer(caches, { ...u3, fil: (f) => (f === 'app.css' ? 'a {}\r\nb {}\r\n' : u3.fil(f)) });
  assert.ok(harManifest(caches, FORRIGE), 'CRLF i en tekstfil og \\r\\n i en binær fil giver en installation');
});

// Code review L1 (v13b, 20-11): netværk først gemmer nettets svar på en opskrift i den aktive udgaves cache, også en nyere
// udgave, der aldrig blev installeret. Ruller en senere udgivelse opskriften tilbage (samme hash som i den aktive udgave),
// genbrugte installationen den nyere, forkerte tekst. Nu tjekkes en genbrugt opskrift (små JSON-filer, erOpskrift) med
// samme hash som en hentet fil, og afviger den, hentes den
test('en genbrugt opskrift, som netværk først har skrevet om, tjekkes mod sin hash og hentes, når den afviger', async () => {
  const { FILER } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  const OPSKRIFT = 'opskrifter/pandekager.json';
  const caches = falskeCaches();
  await installer(caches, udgivelse(FILER, FORRIGE));
  // Den aktive udgave viser opskriften, mens en udgave med en ændret opskrift er live: netværk først gemmer dens tekst
  const aktiv = lavSw({ caches, kilde: swI(FORRIGE), fetch: async () => ok(OPSKRIFT + ' X') });
  const h = haendelse(new SwRequest(OPSKRIFT));
  aktiv.haendelser.fetch(h);
  await h.svar;
  await Promise.all(h.ventet);
  assert.equal(await (await (await caches.open('kog-' + FORRIGE)).match(OPSKRIFT)).text(), OPSKRIFT + ' X');
  // Den nye udgave ruller opskriften tilbage (samme hash som den forrige udgaves sw-indhold.json): opskriften hentes igen
  const ny = udgivelse(FILER, NY, { 'js/version.js': 'v ny' });
  const hentet = await installer(caches, ny);
  assert.deepEqual(hentet.map((x) => x.sti).sort(), ['js/version.js', OPSKRIFT].sort());
  assert.equal(await (await (await caches.open('kog-' + NY)).match(OPSKRIFT)).text(), OPSKRIFT + ' v1');
  // En opskrift, der passer til sin hash, genbruges stadig
  const tredje = udgivelse(FILER, '3333333333333333', { 'js/version.js': 'v tredje' });
  assert.deepEqual((await installer(caches, tredje)).map((x) => x.sti), ['js/version.js']);
});

// Hashen i sw.js og vaerktoej/sw-indhold.js skal være den samme for hver fil, ellers fejler hver installation (eller
// genbruget). Filerne læses fra disken som de er: på Windows har tekstfilerne CRLF, og billederne har tilfældige \r\n
test('service workerens hash er værktøjets for hver fil i FILER', async () => {
  const { FILER, hashAf } = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  assert.equal(typeof hashAf, 'function', 'sw.js skal have hashAf(f, svar)');
  const forskellige = [];
  for (const f of FILER) {
    const data = fs.readFileSync(path.join(ROD, f === './' ? 'index.html' : f));
    const sw = await hashAf(f, new Response(data));
    if (sw !== filHash(f, data)) forskellige.push(f + ': ' + sw + ' ≠ ' + filHash(f, data));
  }
  assert.deepEqual(forskellige, []);
  assert.ok(FILER.length > 700, 'alle filer er med (' + FILER.length + ')');
});

test('opskrifterne hentes netværk først og falder tilbage til cachen', async () => {
  const caches = falskeCaches();
  let net = 'ny';
  const sw = lavSw({ caches, fetch: async () => { if (net === null) throw new TypeError('offline'); return ok(net); } });
  await (await caches.open(sw.VERSION)).put(SCOPE + 'opskrifter/pandekager.json', ok('gammel'));

  let h = haendelse(new SwRequest('opskrifter/pandekager.json'));
  sw.haendelser.fetch(h);
  assert.equal(await (await h.svar).text(), 'ny');
  await Promise.all(h.ventet);
  const gemt = await (await caches.open(sw.VERSION)).match(SCOPE + 'opskrifter/pandekager.json');
  assert.equal(await gemt.text(), 'ny');

  net = null;
  h = haendelse(new SwRequest('opskrifter/pandekager.json'));
  sw.haendelser.fetch(h);
  assert.equal(await (await h.svar).text(), 'ny');
});

test('resten er cache først (også med ?hurtig=1)', async () => {
  const caches = falskeCaches();
  let kald = 0;
  const sw = lavSw({ caches, fetch: async () => { kald++; return ok('fra nettet'); } });
  const c = await caches.open(sw.VERSION);
  await c.put(SCOPE + 'app.js', ok('fra cachen'));
  await c.put(SCOPE + 'index.html', ok('forsiden'));

  let h = haendelse(new SwRequest('app.js'));
  sw.haendelser.fetch(h);
  assert.equal(await (await h.svar).text(), 'fra cachen');
  h = haendelse(new SwRequest('index.html?hurtig=1'));
  sw.haendelser.fetch(h);
  assert.equal(await (await h.svar).text(), 'forsiden');
  assert.equal(kald, 0);
});

test('andre apps på samme origin og andet end GET bliver ikke rørt', () => {
  const sw = lavSw({ caches: falskeCaches(), fetch: async () => ok('') });
  for (const req of [new SwRequest(ORIGIN + '/Lystaarnet/app.js'), new SwRequest('https://andet.test/Kogebog/app.js'), new SwRequest('app.js', { method: 'POST', body: 'x' })]) {
    const h = haendelse(req);
    sw.haendelser.fetch(h);
    assert.equal(h.svar, null, 'håndterede ' + req.method + ' ' + req.url);
  }
});

test('lydfilerne gemmes hele, når de spilles, og Safaris bidder (Range) skæres ud af dem', async () => {
  const fil = SCOPE + 'lyd/pandekager/1.mp3';
  const indhold = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3, 4, 5, 6, 7]); // 10 byte
  const hentet = [];
  let net = true;
  const caches = falskeCaches();
  const sw = lavSw({ caches, fetch: async (req, init = {}) => {
    hentet.push({ url: absolut(req), range: typeof req === 'string' ? null : req.headers.get('range'), cache: init.cache, signal: !!init.signal });
    if (!net) throw new TypeError('offline');
    return absolut(req) === fil ? new Response(indhold, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }) : new Response('', { status: 404 });
  } });
  const spil = async (range, sti = 'lyd/pandekager/1.mp3') => {
    const h = haendelse(new SwRequest(sti, range ? { headers: { Range: range } } : {}));
    sw.haendelser.fetch(h);
    assert.ok(h.svar, 'service workeren skal svare på ' + sti);
    const svar = await h.svar;
    await Promise.all(h.ventet);
    return { status: svar.status, range: svar.headers.get('content-range'), data: [...new Uint8Array(await svar.arrayBuffer())] };
  };

  // Første tryk: Safari beder om de første 2 byte. Nettet spørges om hele filen (uden HTTP-cachen), og den gemmes
  let s = await spil('bytes=0-1');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 0-1/10', [0x49, 0x44]]);
  assert.deepEqual(hentet, [{ url: fil, range: null, cache: 'no-cache', signal: true }], 'nettet skal spørges om hele filen, uden Range, uden HTTP-cachen og med en tidsgrænse');
  const gemt = await (await caches.open(sw.LYD_CACHE)).match(fil);
  assert.equal((await gemt.arrayBuffer()).byteLength, 10, 'hele filen skal ligge i lydens cache');
  assert.equal(await (await caches.open(sw.VERSION)).match(fil), undefined, 'lyden ligger ikke i appens cache (den slettes ved hver ny udgave)');

  // Resten kommer fra cachen, også uden net
  net = false;
  s = await spil('bytes=2-');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 2-9/10', [0x33, 1, 2, 3, 4, 5, 6, 7]]);
  s = await spil('bytes=-3');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 7-9/10', [5, 6, 7]]);
  s = await spil('bytes=-30');
  assert.deepEqual([s.status, s.range, s.data.length], [206, 'bytes 0-9/10', 10]);
  s = await spil('bytes=8-99');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 8-9/10', [6, 7]]);
  // RFC 9110, 14.1: enheden kendes uden forskel på store og små bogstaver
  s = await spil('Bytes=0-1');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 0-1/10', [0x49, 0x44]]);
  s = await spil(null);
  assert.deepEqual([s.status, s.data.length], [200, 10]);
  // Gyldig, men efter filens slutning: 416
  for (const r of ['bytes=10-', 'bytes=10-20', 'bytes=-0']) {
    s = await spil(r);
    assert.deepEqual([s.status, s.range], [416, 'bytes */10'], r);
  }
  // Kan ikke læses (anden enhed, flere intervaller, slut før start, ikke tal): hele filen som 200 (RFC 9110, 14.2)
  for (const r of ['items=0-1', 'bytes=0-1,4-5', 'bytes=5-2', 'bytes=abc', 'bytes=-', 'bytes 0-1', '']) {
    s = await spil(r || ' ');
    assert.deepEqual([s.status, s.range, s.data.length], [200, null, 10], JSON.stringify(r));
  }
  assert.equal(hentet.length, 1, 'kun det første tryk må gå til nettet');

  // En fil, der ikke findes (404), gemmes ikke
  net = true;
  s = await spil('bytes=0-1', 'lyd/pandekager/99.mp3');
  assert.equal(s.status, 404);
  assert.equal(await (await caches.open(sw.LYD_CACHE)).match(SCOPE + 'lyd/pandekager/99.mp3'), undefined);
});

// Wifi uden internet: nettet svarer aldrig. Efter HENT_MS afbrydes hentningen, så lydelementet får en fejl, og tale.js
// tager iPad-stemmen (før ventede den, til Safari selv gav op)
test('en lydfil, nettet ikke svarer på, afbrydes efter 4 sekunder', async () => {
  const ure = [];
  const ur = { setTimeout: (fn, ms) => { ure.push({ fn, ms, stoppet: false }); return ure.length; }, clearTimeout: (id) => { if (ure[id - 1]) ure[id - 1].stoppet = true; } };
  const sw = lavSw({ caches: falskeCaches(), ur, fetch: (req, init = {}) => new Promise((_, nej) => {
    init.signal.addEventListener('abort', () => nej(new DOMException('afbrudt', 'AbortError')));
  }) });
  const h = haendelse(new SwRequest('lyd/pandekager/1.mp3', { headers: { Range: 'bytes=0-1' } }));
  sw.haendelser.fetch(h);
  await new Promise((r) => setImmediate(r));
  assert.equal(ure.length, 1, 'der skal være et ur på hentningen');
  assert.equal(ure[0].ms, 4000);
  ure[0].fn();
  await assert.rejects(h.svar, /afbrudt/);
  assert.equal(ure[0].stoppet, true, 'uret skal stoppes bagefter');

  // Et svar i tide stopper uret, så resten af filen ikke skæres over
  const ure2 = [];
  const ur2 = { setTimeout: (fn, ms) => { ure2.push({ fn, ms, stoppet: false }); return ure2.length; }, clearTimeout: (id) => { if (ure2[id - 1]) ure2[id - 1].stoppet = true; } };
  const sw2 = lavSw({ caches: falskeCaches(), ur: ur2, fetch: async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }) });
  const h2 = haendelse(new SwRequest('lyd/pandekager/1.mp3'));
  sw2.haendelser.fetch(h2);
  assert.equal((await h2.svar).status, 200);
  assert.equal(ure2[0].stoppet, true, 'uret skal stoppes, når svaret er kommet');
});

// Svag 4G eller wifi uden internet: nettet tager imod, men svarer aldrig. Opskrifterne er netværk først, men efter
// HENT_MS kommer de fra cachen, og svarer nettet senere, gemmes det nye svar alligevel. Er intet gemt, ventes der på
// nettet (code review U3, 23-10: #/hent stod på «Henter indkøbslisten …», til Safari selv gav op)
test('en opskrift, nettet ikke svarer på, kommer fra cachen efter 4 sekunder', async () => {
  const lavUr = () => {
    const ure = [];
    return { ure, ur: { setTimeout: (fn, ms) => { ure.push({ fn, ms, stoppet: false }); return ure.length; }, clearTimeout: (id) => { if (ure[id - 1]) ure[id - 1].stoppet = true; } } };
  };
  const naeste = () => new Promise((r) => setImmediate(r));
  const { ure, ur } = lavUr();
  let svar = null;
  const caches = falskeCaches();
  const sw = lavSw({ caches, ur, fetch: () => new Promise((ok) => { svar = ok; }) });
  await (await caches.open(sw.VERSION)).put(SCOPE + 'opskrifter/pandekager.json', ok('gammel'));
  const h = haendelse(new SwRequest('opskrifter/pandekager.json'));
  sw.haendelser.fetch(h);
  await naeste();
  assert.equal(ure.length, 1, 'der skal være et ur på opskriften');
  assert.equal(ure[0].ms, 4000);
  ure[0].fn();
  assert.equal(await (await h.svar).text(), 'gammel', 'efter 4 s kommer opskriften fra cachen');
  // Nettet svarer til sidst: det nye svar gemmes til næste gang
  svar(ok('ny'));
  await Promise.all(h.ventet);
  assert.equal(await (await (await caches.open(sw.VERSION)).match(SCOPE + 'opskrifter/pandekager.json')).text(), 'ny');

  // Intet gemt: der ventes på nettet, også efter de 4 s
  const u2 = lavUr();
  let svar2 = null;
  const sw2 = lavSw({ caches: falskeCaches(), ur: u2.ur, fetch: () => new Promise((ok) => { svar2 = ok; }) });
  const h2 = haendelse(new SwRequest('opskrifter/pandekager.json'));
  sw2.haendelser.fetch(h2);
  let afgjort = false;
  h2.svar.then(() => { afgjort = true; }, () => { afgjort = true; });
  await naeste();
  u2.ure[0].fn();
  await naeste();
  await naeste();
  assert.equal(afgjort, false, 'uden noget i cachen ventes der på nettet');
  svar2(ok('fra nettet'));
  assert.equal(await (await h2.svar).text(), 'fra nettet');

  // Et svar i tide stopper uret
  const u3 = lavUr();
  const sw3 = lavSw({ caches: falskeCaches(), ur: u3.ur, fetch: async () => ok('hurtig') });
  const h3 = haendelse(new SwRequest('opskrifter/pandekager.json'));
  sw3.haendelser.fetch(h3);
  assert.equal(await (await h3.svar).text(), 'hurtig');
  assert.equal(u3.ure[0].stoppet, true, 'uret skal stoppes, når svaret er kommet');
});

// Nettet svarer aldrig: index.json venter HENT_MS og kommer så fra cachen. Det huskes i 30 s, så retterne, der hentes
// lige bagefter, kommer fra cachen med det samme, og hele hentningen venter ca. 4 s og ikke 8 (code review F2, 23-10).
// Nettet spørges stadig, og et svar, der kommer senere, gemmes. Efter de 30 s er det netværk først igen
test('når nettet ikke svarede, kommer de næste opskrifter fra cachen med det samme i 30 sekunder', async () => {
  const ure = [];
  const ur = { setTimeout: (fn, ms) => { ure.push({ fn, ms, stoppet: false }); return ure.length; }, clearTimeout: (id) => { if (ure[id - 1]) ure[id - 1].stoppet = true; } };
  const naeste = () => new Promise((r) => setImmediate(r));
  let tid = 1e12;
  let hurtig = false;
  const svar = [];
  const caches = falskeCaches();
  const sw = lavSw({ caches, ur, naa: () => tid,
    fetch: (req) => (hurtig ? Promise.resolve(ok('ny ' + absolut(req).split('/').pop())) : new Promise((ja) => { svar.push(ja); })) });
  const cache = await caches.open(sw.VERSION);
  await cache.put(SCOPE + 'opskrifter/index.json', ok('gammel index'));
  await cache.put(SCOPE + 'opskrifter/pandekager.json', ok('gammel pandekager'));
  const hent = async (fil) => {
    const h = haendelse(new SwRequest('opskrifter/' + fil));
    sw.haendelser.fetch(h);
    h.afgjort = false;
    h.svar.then(() => { h.afgjort = true; }, () => { h.afgjort = true; });
    await naeste();
    await naeste();
    return h;
  };

  // index.json: efter 4 s fra cachen
  const h1 = await hent('index.json');
  assert.equal(h1.afgjort, false, 'index.json venter på nettet til uret');
  ure[0].fn();
  assert.equal(await (await h1.svar).text(), 'gammel index');

  // Retten et sekund senere: fra cachen uden at vente på et nyt ur, men nettet spørges stadig
  tid += 1000;
  const h2 = await hent('pandekager.json');
  assert.equal(h2.afgjort, true, 'retten skal komme fra cachen uden at vente 4 s igen');
  assert.equal(await (await h2.svar).text(), 'gammel pandekager');
  assert.equal(svar.length, 2, 'nettet skal stadig spørges om retten');
  svar[1](ok('ny pandekager'));
  await Promise.all(h2.ventet);
  assert.equal(await (await cache.match(SCOPE + 'opskrifter/pandekager.json')).text(), 'ny pandekager', 'et sent svar gemmes');

  // En ret, der ikke er gemt: der ventes på nettet, også inden for de 30 s
  const h3 = await hent('tunfrikadeller.json');
  assert.equal(h3.afgjort, false, 'uden noget i cachen ventes der på nettet');
  svar[2](ok('tun fra nettet'));
  assert.equal(await (await h3.svar).text(), 'tun fra nettet');

  // Efter 30 s er det netværk først igen
  tid += 30000;
  hurtig = true;
  const h4 = await hent('pandekager.json');
  assert.equal(await (await h4.svar).text(), 'ny pandekager.json', 'efter 30 s skal opskriften komme fra nettet');
});
