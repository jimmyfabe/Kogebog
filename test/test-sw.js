// test-sw.js — kører sw.js i en sandkasse (node:vm) med falske caches og fetch.
// Tjekker: FILER er komplet og findes, kun «kog-»-caches slettes, netværk først for opskrifterne, cache først for resten.
// Kør:  node test/test-sw.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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
  vm.runInContext(KILDE + '\n;globalThis.__FILER = FILER; globalThis.__VERSION = VERSION;', ctx);
  return { haendelser, FILER: ctx.__FILER, VERSION: ctx.__VERSION };
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
