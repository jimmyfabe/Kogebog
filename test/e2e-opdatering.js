// e2e-opdatering.js — en ny udgave når frem til en app, der allerede er åben (v13, 19-11-2026). Køres af test-e2e.js
// med E2E_DELE=opdatering, som giver sine hjælpere med (H).
// Baggrund: Jimmys iPhone viste v9 19-11, selvom v12 var live. sw.js installerede den nye udgave og tog over, men den
// åbne side kørte videre med den gamle kode, og en app på hjemmeskærmen har ingen genindlæs-knap. Nu spørger app.js
// efter en ny sw.js, når appen kommer frem igen (visibilitychange), og genindlæser selv, når den nye udgave har taget
// over (controllerchange), men kun på børnenes forside.
// Testen har sin egen server (Node), der kan skifte sw.js og js/version.js til en ny udgave uden at røre filerne på
// disken, og en rigtig WebKit-profil under %TEMP%\swm\ (højst 62 tegn, se udenNet i e2e-ugeplan.js): de andre dele
// blokerer service workeren. Serveren sender «Cache-Control: max-age=600» som GitHub Pages, så testen også ser, at den
// nye sw.js ikke bliver hængende i browserens cache.
//   1. Første besøg: siden bliver styret og genindlæses ikke.
//   2. På forsiden: ny udgave på serveren, og appen kommer frem igen. Siden genindlæser selv og viser den nye udgave.
//   3. Midt i en ret: ny udgave. Skærmen står stille (adresse og overskrift, ingen genindlæsning), til man går til
//      forsiden. Så genindlæses den og viser den nye udgave.
//   4. En timer kører, og forsiden vises: ingen genindlæsning, for lyden og skærmlåsen kræver et nyt tryk efter en
//      genindlæsning på iPad. Først når timeren er stoppet, og forsiden vises igen.
// Siderne tælles i sessionStorage (taelIndlaesning), som overlever en genindlæsning i samme fane.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { hentPlaywright } from '../vaerktoej/lav-ikoner.js';
import { ledigPort, nyFane, swFiler } from './e2e-ugeplan.js';
import { UDGAVE } from '../js/version.js';

const NY_MS = 30000;        // så længe må det tage, fra appen kommer frem, til den nye udgave står på skærmen
const STILLE_MS = 2000;     // så længe ventes der efter overtagelsen, før det tjekkes, at intet er genindlæst
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const TYPER = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
};

// sw.js og js/version.js, som de ville se ud i udgaven «navn»: et andet INDHOLD (så cachen får et nyt navn, og alle FILER
// hentes igen) og UDGAVE = navn (forsidens fod viser den)
function nyUdgave(rod, navn) {
  const sw = fs.readFileSync(path.join(rod, 'sw.js'), 'utf8');
  const version = fs.readFileSync(path.join(rod, 'js/version.js'), 'utf8');
  const nySw = sw.replace(/const INDHOLD = '[^']*'/, "const INDHOLD = '" + navn + "'");
  const nyVersion = version.replace(/export const UDGAVE = '[^']*'/, "export const UDGAVE = '" + navn + "'");
  if (nySw === sw || nyVersion === version) throw new Error('INDHOLD eller UDGAVE blev ikke fundet i sw.js eller js/version.js');
  return new Map([['/sw.js', nySw], ['/js/version.js', nyVersion]]);
}

// Serverer mappen rod som GitHub Pages (filerne og max-age=600). skift(navn) giver de næste svar en ny sw.js og
// js/version.js; filerne på disken røres ikke. Node holder forbindelserne åbne (HTTP/1.1), så porte ikke løber tør
async function udgaveServer(rod, port) {
  let nyt = new Map();
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let sti;
    try {
      sti = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch (e) {
      res.writeHead(400).end();
      return;
    }
    if (sti.endsWith('/')) sti += 'index.html';
    const fil = path.resolve(rod, '.' + sti);
    if (!fil.startsWith(rod + path.sep)) { res.writeHead(403).end(); return; }
    const hoved = { 'Content-Type': TYPER[path.extname(fil).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=600' };
    if (nyt.has(sti)) { res.writeHead(200, hoved).end(nyt.get(sti)); return; }
    fs.readFile(fil, (fejl, data) => {
      if (fejl) res.writeHead(404).end();
      else res.writeHead(200, hoved).end(data);
    });
  });
  await new Promise((ok, fejl) => { server.once('error', fejl); server.listen(port, '127.0.0.1', ok); });
  return {
    skift: (navn) => { nyt = nyUdgave(rod, navn); },
    stop: () => new Promise((ok) => { server.closeAllConnections(); server.close(() => ok()); }),
  };
}

// Init-script: tæller fanens indlæsninger af appen. sessionStorage overlever en genindlæsning, men ikke en ny fane
function taelIndlaesning() {
  if (location.protocol !== 'http:') return; // about:blank har intet lager
  const n = Number(sessionStorage.getItem('e2e-indlaest') || 0) + 1;
  sessionStorage.setItem('e2e-indlaest', String(n));
}
const indlaest = (side) => side.evaluate(() => Number(sessionStorage.getItem('e2e-indlaest') || 0));
const fod = (side) => side.evaluate(() => document.querySelector('.forside-version')?.textContent ?? null);
const overskrift = (side) => side.evaluate(() => document.querySelector('#app h1')?.textContent ?? null);
const kogCacher = (side) => side.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('kog-') && !k.startsWith('kog-lyd-')));
// Appen kommer frem igen (iOS sender visibilitychange, når appen hentes frem fra baggrunden)
const fremIgen = (side) => side.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

// Venter, til fn er sand i siden. En genindlæsning midt i et kald ødelægger sidens kontekst: så prøves igen i den nye.
// Svar: { ok, fejl } med den sidste fejl, hvis tiden løb ud
async function indtil(side, fn, arg, ms) {
  const slut = Date.now() + ms;
  let sidste = null;
  for (;;) {
    try {
      if (await side.evaluate(fn, arg)) return { ok: true, fejl: null };
      sidste = null;
    } catch (e) {
      sidste = e.message.split('\n')[0];
    }
    if (Date.now() >= slut) return { ok: false, fejl: sidste };
    await pause(100);
  }
}

// Den nye udgave er installeret og har taget over: dens cache er den eneste «kog-», og testens egen lytter (sat før
// skiftet) har set controllerchange. Er siden genindlæst, er lytteren væk; det tjekker kalderen med indlaest
async function overtaget(side, navn) {
  return indtil(side, (n) => (window.__e2eSkift === undefined ? true : window.__e2eSkift > 0 && caches.keys().then((k) =>
    k.includes('kog-' + n) && k.filter((x) => x.startsWith('kog-') && !x.startsWith('kog-lyd-')).length === 1)), navn, NY_MS);
}
const lytEfterSkift = (side) => side.evaluate(() => {
  window.__e2eSkift = 0;
  navigator.serviceWorker.addEventListener('controllerchange', () => { window.__e2eSkift++; });
});

export async function opdatering(H) {
  const { ROD, SKAERME, tjek, maal } = H;
  const ipad = SKAERME[0];
  console.log('[ipad] opdatering: en ny udgave når frem til en åben app (egen server, rigtig profil)');
  const mappe = path.join(os.tmpdir(), 'swm', 'o' + Date.now().toString(36));
  const profil = path.join(mappe, 'p');
  if (profil.length > 62) {
    tjek(false, 'opdatering: profilstien er for lang til WebKits cache (' + profil.length + ' tegn, højst 62): ' + profil);
    return;
  }
  const port = await ledigPort();
  const base = 'http://127.0.0.1:' + port;
  const server = await udgaveServer(ROD, port);
  const ctx = await hentPlaywright().webkit.launchPersistentContext(profil, { viewport: ipad.viewport, hasTouch: true, deviceScaleFactor: 1, locale: 'da-DK' });
  try {
    await ctx.addInitScript(H.forfalskninger, H.LYD_TEKSTER);
    await ctx.addInitScript(taelIndlaesning);
    // Profilens egen første fane lukkes, når testens fane er åben (så profilen aldrig står uden en fane)
    const foerste = ctx.pages();
    const side = await nyFane(ctx, ipad);
    for (const s of foerste) await s.close();
    if (!await foersteBesoeg(H, side, base)) return;
    await paaForsiden(H, side, server);
    await midtIRet(H, side, server);
    await underTimer(H, side, server);
    tjek(side.fejl.length === 0, 'opdatering: ' + side.fejl.join(' | '));
    await side.close();
  } finally {
    await ctx.close();
    await server.stop();
    try {
      fs.rmSync(mappe, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (e) {
      maal.push('opdatering: profilen ' + mappe + ' kunne ikke slettes (' + e.code + ')');
    }
  }
}

// 1. Første besøg: service workeren installeres og tager siden (clients.claim), men siden har allerede den nyeste kode
async function foersteBesoeg(H, side, base) {
  const { ROD, tjek } = H;
  const { filer, indhold } = swFiler(ROD);
  await side.goto(base + '/index.html#/');
  await side.waitForSelector('.gruppe-knap', { timeout: 15000 });
  const sw = await side.evaluate(async (antal) => {
    if (!('serviceWorker' in navigator) || !window.caches) return { mangler: true };
    await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 10000))]);
    let ud = {};
    for (let i = 0; i < 80; i++) {
      const navne = (await caches.keys()).filter((k) => k.startsWith('kog-') && !k.startsWith('kog-lyd-'));
      const gemt = navne.length === 1 ? (await (await caches.open(navne[0])).keys()).length : 0;
      ud = { navne, gemt, styret: Boolean(navigator.serviceWorker.controller) };
      if (ud.styret && gemt >= antal) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    return ud;
  }, filer.length);
  if (sw.mangler) {
    tjek(false, 'opdatering: WebKit har ingen service worker eller Cache API i en rigtig profil');
    return false;
  }
  tjek(sw.styret, 'opdatering, første besøg: siden skal blive styret af service workeren');
  tjek(sw.navne.join() === 'kog-' + indhold && sw.gemt === filer.length,
    'opdatering, første besøg: cachen «kog-' + indhold + '» skal have alle ' + filer.length + ' FILER (fik ' + sw.gemt + ' i ' + sw.navne.join(', ') + ')');
  await pause(STILLE_MS); // en genindlæsning efter clients.claim ville være sket nu
  const n = await indlaest(side);
  tjek(n === 1, 'opdatering, første besøg: siden må ikke genindlæses, når service workeren tager den første gang (indlæst ' + n + ' gange)');
  tjek(await fod(side) === 'Version ' + UDGAVE, 'opdatering, første besøg: forsiden viser «Version ' + UDGAVE + '» (' + await fod(side) + ')');
  return sw.styret;
}

// 2. På børnenes forside: appen kommer frem, spørger efter en ny sw.js, og når den har taget over, genindlæses siden én gang
async function paaForsiden(H, side, server) {
  const { tjek, maal, foto } = H;
  server.skift('e2e-ny');
  const foer = await indlaest(side);
  const t0 = Date.now();
  await fremIgen(side);
  const r = await indtil(side, () => document.querySelector('.forside-version')?.textContent === 'Version e2e-ny', null, NY_MS);
  const sek = ((Date.now() - t0) / 1000).toFixed(1);
  tjek(r.ok, 'opdatering, forsiden: den nye udgave skal stå i forsidens fod inden for ' + NY_MS / 1000 + ' s, efter at appen kom frem (står: ' +
    await fod(side) + (r.fejl ? '; ' + r.fejl : '') + ')');
  maal.push('opdatering, forsiden: ' + (r.ok ? '«Version e2e-ny» stod på skærmen ' + sek + ' s efter visibilitychange' : 'den nye udgave kom ikke inden for ' + NY_MS / 1000 + ' s'));
  console.log('  MÅL ' + maal.at(-1));
  if (!r.ok) return;
  await pause(STILLE_MS); // ingen løkke: siden må ikke genindlæses igen
  const n = await indlaest(side);
  tjek(n === foer + 1, 'opdatering, forsiden: præcis én genindlæsning (' + (n - foer) + ')');
  tjek(await side.evaluate(() => location.hash) === '#/', 'opdatering, forsiden: adressen er stadig forsiden');
  tjek((await kogCacher(side)).join() === 'kog-e2e-ny', 'opdatering, forsiden: kun den nye udgaves cache er tilbage (' + (await kogCacher(side)).join(', ') + ')');
  await foto(side, 'opdatering-forsiden-ny-udgave');
}

// 3. Midt i en ret: skærmen må ikke skifte under barnet. Den nye udgave vises, næste gang børnenes forside vises
async function midtIRet(H, side, server) {
  const { tjek, tryk } = H;
  await side.evaluate(() => { location.hash = '#/ret/pandekager/trin/2'; });
  await indtil(side, () => location.hash === '#/ret/pandekager/trin/2' && document.querySelector('#trin-tekst'), null, 10000);
  const foer = { hash: await side.evaluate(() => location.hash), h1: await overskrift(side), n: await indlaest(side) };
  await lytEfterSkift(side);
  server.skift('e2e-ny-2');
  await fremIgen(side);
  const r = await overtaget(side, 'e2e-ny-2');
  const skift = await side.evaluate(() => window.__e2eSkift ?? null);
  tjek(r.ok && skift === 1, 'opdatering, midt i en ret: den nye udgave skal installeres og tage over, mens trinnet vises (controllerchange: ' +
    skift + (r.fejl ? '; ' + r.fejl : '') + ')');
  await pause(STILLE_MS);
  const nu = { hash: await side.evaluate(() => location.hash), h1: await overskrift(side), n: await indlaest(side) };
  tjek(nu.n === foer.n && await side.evaluate(() => window.__e2eSkift !== undefined), 'opdatering, midt i en ret: siden må ikke genindlæses (' + (nu.n - foer.n) + ' gange)');
  tjek(nu.hash === foer.hash && nu.h1 === foer.h1, 'opdatering, midt i en ret: adressen og overskriften står stille (' + JSON.stringify(foer) + ' → ' + JSON.stringify(nu) + ')');
  // Huset i topbaren: børnenes forside, og nu genindlæses den
  await tryk(side, 'button[aria-label="Til forsiden"]');
  const ny = await indtil(side, () => document.querySelector('.forside-version')?.textContent === 'Version e2e-ny-2', null, 10000);
  tjek(ny.ok, 'opdatering, midt i en ret: tilbage på forsiden skal den nye udgave vises (står: ' + await fod(side) + (ny.fejl ? '; ' + ny.fejl : '') + ')');
  await pause(STILLE_MS);
  const n = await indlaest(side);
  tjek(n === foer.n + 1, 'opdatering, midt i en ret: præcis én genindlæsning, da forsiden blev vist (' + (n - foer.n) + ')');
  tjek(await side.evaluate(() => location.hash) === '#/', 'opdatering, midt i en ret: adressen er forsiden efter genindlæsningen');
}

// 4. En timer kører (kødsovs trin 8, 20 min), og barnet går til forsiden: ingen genindlæsning, før timeren er stoppet
async function underTimer(H, side, server) {
  const { tjek, tryk } = H;
  await side.evaluate(() => { location.hash = '#/ret/koedsovs/trin/8'; });
  await indtil(side, () => location.hash === '#/ret/koedsovs/trin/8' && document.querySelector('.timer-start'), null, 10000);
  await tryk(side, '.timer-start');
  await tryk(side, 'button[aria-label="Til forsiden"]');
  await indtil(side, () => location.hash === '#/' && document.querySelector('.pille:not([hidden])'), null, 10000);
  const foer = await indlaest(side);
  await lytEfterSkift(side);
  server.skift('e2e-ny-3');
  await fremIgen(side);
  const r = await overtaget(side, 'e2e-ny-3');
  const skift = await side.evaluate(() => window.__e2eSkift ?? null);
  tjek(r.ok && skift === 1, 'opdatering, timer: den nye udgave skal tage over, mens timeren kører (controllerchange: ' + skift + (r.fejl ? '; ' + r.fejl : '') + ')');
  await pause(STILLE_MS);
  tjek(await indlaest(side) === foer && await fod(side) === 'Version e2e-ny-2',
    'opdatering, timer: forsiden må ikke genindlæses, mens timeren kører (indlæst ' + (await indlaest(side) - foer) + ' gange, fod: ' + await fod(side) + ')');
  tjek(await side.locator('.pille:not([hidden])').count() === 1, 'opdatering, timer: pillen står stadig på forsiden');
  // Pillen fører til trinnet. Stop timeren, og gå til forsiden: nu genindlæses den
  await tryk(side, '.pille');
  await indtil(side, () => location.hash === '#/ret/koedsovs/trin/8' && document.querySelector('button[aria-label="Stop timeren"]'), null, 10000);
  await tryk(side, 'button[aria-label="Stop timeren"]');
  await tryk(side, 'button[aria-label="Til forsiden"]');
  const ny = await indtil(side, () => document.querySelector('.forside-version')?.textContent === 'Version e2e-ny-3', null, 10000);
  tjek(ny.ok, 'opdatering, timer: efter «Stop» og tilbage på forsiden skal den nye udgave vises (står: ' + await fod(side) + (ny.fejl ? '; ' + ny.fejl : '') + ')');
  await pause(STILLE_MS);
  const n = await indlaest(side);
  tjek(n === foer + 1, 'opdatering, timer: præcis én genindlæsning (' + (n - foer) + ')');
  const gemt = await side.evaluate(() => JSON.parse(localStorage.getItem('kog-v1') || 'null'));
  tjek(gemt && gemt.timer === null, 'opdatering, timer: den stoppede timer kommer ikke igen efter genindlæsningen (' + JSON.stringify(gemt) + ')');
}
