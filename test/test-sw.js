// test-sw.js — kører sw.js i en sandkasse (node:vm) med falske caches og fetch.
// Tjekker: FILER er komplet og findes, INDHOLD passer til filerne (så VERSION skifter ved hver ændring),
// kun «kog-»-caches slettes, netværk først for opskrifterne, cache først for resten.
// Kør:  node test/test-sw.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

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

function lavSw({ caches, fetch }) {
  const haendelser = {};
  const self = {
    addEventListener: (type, fn) => { haendelser[type] = fn; },
    registration: { scope: SCOPE },
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
  };
  const ctx = vm.createContext({ self, caches, fetch, Request: SwRequest, Response, URL, console });
  vm.runInContext(KILDE + '\n;globalThis.__FILER = FILER; globalThis.__VERSION = VERSION; globalThis.__INDHOLD = typeof INDHOLD === \'undefined\' ? undefined : INDHOLD;', ctx);
  return { haendelser, FILER: ctx.__FILER, VERSION: ctx.__VERSION, INDHOLD: ctx.__INDHOLD };
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

// sha256 (16 tegn) over stierne og indholdet i FILER-rækkefølge. Tekstfiler regnes med LF, for git på Windows
// kan give CRLF i arbejdsmappen, og samme indhold skal give samme tal på alle maskiner.
const TEKSTFIL = /\.(html|js|css|json|svg|webmanifest)$/;
function indholdAf(filer) {
  const h = crypto.createHash('sha256');
  for (const f of filer) {
    const fil = f === './' ? 'index.html' : f;
    let data = fs.readFileSync(path.join(ROD, fil));
    if (TEKSTFIL.test(fil)) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    h.update(f + '\n').update(data).update('\n');
  }
  return h.digest('hex').slice(0, 16);
}

// Lydfilerne (lyd/<ret>/<navn>.mp3) står ikke i FILER (de gemmes, når de spilles), men de er også cache først.
// Derfor tæller de med i INDHOLD: en ny udgave af en lydfil skal også give en ny VERSION
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
  const nu = indholdAf([...FILER, ...lydfiler()]);
  assert.equal(INDHOLD, nu, 'filerne er ændret: sæt INDHOLD i sw.js til \'' + nu + '\' (så skifter VERSION, og enhederne henter den nye udgave)');
  assert.equal(VERSION, 'kog-' + INDHOLD, 'VERSION skal være \'kog-\' + INDHOLD');
});

test('activate sletter kun gamle «kog-»-caches', async () => {
  const caches = falskeCaches({ 'mat-2026-10-14-v163': {}, 'lego-v3': {}, 'kog-2026-01-01-v0': {}, 'andet': {} });
  const { haendelser, VERSION } = lavSw({ caches, fetch: async () => ok('') });
  await caches.open(VERSION);
  const h = haendelse(null);
  haendelser.activate(h);
  await Promise.all(h.ventet);
  assert.deepEqual((await caches.keys()).sort(), ['andet', 'lego-v3', 'mat-2026-10-14-v163', VERSION].sort());
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
  const sw = lavSw({ caches, fetch: async (req) => {
    hentet.push({ url: absolut(req), range: typeof req === 'string' ? null : req.headers.get('range') });
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

  // Første tryk: Safari beder om de første 2 byte. Nettet spørges om hele filen, og den gemmes
  let s = await spil('bytes=0-1');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 0-1/10', [0x49, 0x44]]);
  assert.deepEqual(hentet, [{ url: fil, range: null }], 'nettet skal spørges om hele filen, uden Range');
  const gemt = await (await caches.open(sw.VERSION)).match(fil);
  assert.equal((await gemt.arrayBuffer()).byteLength, 10, 'hele filen skal ligge i cachen');

  // Resten kommer fra cachen, også uden net
  net = false;
  s = await spil('bytes=2-');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 2-9/10', [0x33, 1, 2, 3, 4, 5, 6, 7]]);
  s = await spil('bytes=-3');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 7-9/10', [5, 6, 7]]);
  s = await spil('bytes=8-99');
  assert.deepEqual([s.status, s.range, s.data], [206, 'bytes 8-9/10', [6, 7]]);
  s = await spil(null);
  assert.deepEqual([s.status, s.data.length], [200, 10]);
  s = await spil('bytes=10-');
  assert.deepEqual([s.status, s.range], [416, 'bytes */10']);
  assert.equal(hentet.length, 1, 'kun det første tryk må gå til nettet');

  // En fil, der ikke findes (404), gemmes ikke
  net = true;
  s = await spil('bytes=0-1', 'lyd/pandekager/99.mp3');
  assert.equal(s.status, 404);
  assert.equal(await (await caches.open(sw.VERSION)).match(SCOPE + 'lyd/pandekager/99.mp3'), undefined);
});
