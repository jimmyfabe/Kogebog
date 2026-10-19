/* sw.js — service worker for Tumbi Køkken (scope './'), så kogebogen virker i køkkenet uden net.
   Samme origin som Lystårnet («mat-») og LEGO («lego-»): denne fil rører KUN caches, der starter med «kog-».
   Opskrifterne (opskrifter/*.json og lyd/liste.json) hentes netværk først, så en rettet opskrift slår igennem;
   alt andet er cache først, så en ændret fil kun når ud til enhederne, hvis cachens navn (VERSION) skifter.
   Derfor er VERSION bygget af INDHOLD: et tal for alle FILER og lydfilerne. test/test-sw.js tjekker, at FILER er komplet,
   og fejler, når en fil er ændret. Fejlbeskeden viser den nye værdi; testen ændrer ikke sw.js, så den sættes her i hånden. */
const PRAEFIKS = 'kog-';
const INDHOLD = '1229695116a56b6a'; // sha256 (16 tegn) af FILER og lydfilerne (lyd/*/*.mp3) — sæt den værdi, test/test-sw.js viser i fejlbeskeden
const VERSION = PRAEFIKS + INDHOLD;
const FILER = [
  './',
  'index.html',
  'print.html',
  'app.js',
  'app.css',
  'print.css',
  'manifest.webmanifest',
  'js/katalog.js',
  'js/tid.js',
  'js/tekst.js',
  'js/model.js',
  'js/dom.js',
  'js/lager.js',
  'js/replikker.js',
  'js/tale.js',
  'js/timer.js',
  'js/hold.js',
  'js/data.js',
  'js/print.js',
  'opskrifter/index.json',
  'opskrifter/pandekager.json',
  'opskrifter/frikadeller.json',
  'opskrifter/koedsovs.json',
  'opskrifter/boller.json',
  'opskrifter/chorizo-pasta.json',
  'opskrifter/kartoffelmos.json',
  'opskrifter/hvidloegsflutes.json',
  'opskrifter/brownie.json',
  'opskrifter/blondie.json',
  'opskrifter/hytteostboller.json',
  'opskrifter/havregrynskugler.json',
  'opskrifter/tunfrikadeller.json',
  'opskrifter/pizzasnegle.json',
  'lyd/liste.json',
  'ikoner/ikon.svg',
  'ikoner/ikon-180.png',
  'ikoner/ikon-192.png',
  'ikoner/ikon-512.png',
  'grafik/dyr-bo.svg', 'grafik/dyr-pip.svg', 'grafik/dyr-rosa.svg', 'grafik/faerdig.svg',
  'grafik/ing-aeg.svg', 'grafik/ing-bouillon.svg', 'grafik/ing-chorizo.svg', 'grafik/ing-flode.svg', 'grafik/ing-gaer.svg',
  'grafik/ing-gulerod.svg', 'grafik/ing-havregryn.svg', 'grafik/ing-hvidloeg.svg', 'grafik/ing-koed.svg', 'grafik/ing-krydderurt.svg',
  'grafik/ing-loeg.svg', 'grafik/ing-maelk.svg', 'grafik/ing-mel.svg', 'grafik/ing-olie.svg', 'grafik/ing-ost.svg',
  'grafik/ing-peber.svg', 'grafik/ing-salt.svg', 'grafik/ing-smoer.svg', 'grafik/ing-spaghetti.svg', 'grafik/ing-sukker.svg',
  'grafik/ing-syltetoej.svg', 'grafik/ing-tomat.svg', 'grafik/ing-tomatpure.svg', 'grafik/ing-vand.svg',
  'grafik/ing-bagepulver.svg', 'grafik/ing-broed.svg', 'grafik/ing-chokolade.svg', 'grafik/ing-hytteost.svg', 'grafik/ing-kakao.svg',
  'grafik/ing-kartoffel.svg', 'grafik/ing-kerner.svg', 'grafik/ing-kokos.svg', 'grafik/ing-rasp.svg', 'grafik/ing-skinke.svg',
  'grafik/ing-tun.svg', 'grafik/ing-yoghurt.svg',
  'grafik/ret-boller.svg', 'grafik/ret-chorizo-pasta.svg', 'grafik/ret-frikadeller.svg', 'grafik/ret-koedsovs.svg', 'grafik/ret-pandekager.svg',
  'grafik/ret-kartoffelmos.svg', 'grafik/ret-hvidloegsflutes.svg', 'grafik/ret-brownie.svg', 'grafik/ret-blondie.svg',
  'grafik/ret-hytteostboller.svg', 'grafik/ret-havregrynskugler.svg', 'grafik/ret-tunfrikadeller.svg',
  'grafik/ret-pizzasnegle.svg',
  'grafik/gruppe-aftensmad.svg', 'grafik/gruppe-bagning.svg', 'grafik/gruppe-soede-sager.svg',
  'grafik/verbum-aelte.svg', 'grafik/verbum-haelde.svg', 'grafik/verbum-koge.svg', 'grafik/verbum-maale.svg', 'grafik/verbum-roere.svg',
  'grafik/verbum-rulle.svg', 'grafik/verbum-skaere.svg', 'grafik/verbum-smage.svg', 'grafik/verbum-stege.svg',
  'grafik/verbum-vaske-haender.svg', 'grafik/verbum-vende.svg', 'grafik/verbum-vente.svg',
  'grafik/verbum-bage.svg', 'grafik/verbum-drysse.svg', 'grafik/verbum-mose.svg', 'grafik/verbum-pensle.svg', 'grafik/verbum-piske.svg',
  'grafik/verbum-rive.svg', 'grafik/verbum-smoere.svg',
  'grafik/verbum-tage-ud.svg', 'grafik/verbum-tage-ud-form.svg', 'grafik/verbum-si.svg', 'grafik/verbum-kagerulle.svg', 'grafik/verbum-pakke-ind.svg', 'grafik/verbum-smuldre.svg',
];

const iScope = (url) => url.href.startsWith(self.registration.scope);
const erOpskrift = (url) => /\/opskrifter\/[a-z0-9-]+\.json$/.test(url.pathname) || /\/lyd\/liste\.json$/.test(url.pathname);

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    // Alt eller intet: mangler én fil, beholder enheden den gamle, hele udgave og prøver igen næste gang
    const svar = await Promise.all(FILER.map((f) => fetch(new Request(f, { cache: 'reload' }))));
    const mangler = FILER.filter((f, i) => !svar[i].ok);
    if (mangler.length) throw new Error('Mangler: ' + mangler.join(', '));
    const cache = await caches.open(VERSION);
    await Promise.all(svar.map((r, i) => cache.put(FILER[i], r)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Kun vores egne, gamle udgaver. Lystårnets «mat-…» og LEGO's «lego-…» lader vi være.
    const navne = await caches.keys();
    await Promise.all(navne.filter((n) => n.startsWith(PRAEFIKS) && n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function netvaerkFoerst(e, req) {
  const cache = await caches.open(VERSION);
  try {
    const svar = await fetch(req, { cache: 'no-cache' });
    if (svar.ok) {
      e.waitUntil(cache.put(req, svar.clone()).catch(() => {}));
      return svar;
    }
    if (svar.status >= 500) return (await cache.match(req, { ignoreSearch: true })) || svar;
    return svar;
  } catch (err) {
    const gemt = await cache.match(req, { ignoreSearch: true });
    if (gemt) return gemt;
    throw err;
  }
}

async function cacheFoerst(e, req) {
  const cache = await caches.open(VERSION);
  const gemt = await cache.match(req, { ignoreSearch: true });
  if (gemt) return gemt;
  try {
    const svar = await fetch(req);
    if (svar.ok && svar.type === 'basic') e.waitUntil(cache.put(req, svar.clone()).catch(() => {}));
    return svar;
  } catch (err) {
    if (req.mode === 'navigate') {
      const forside = await cache.match('index.html');
      if (forside) return forside;
    }
    throw err;
  }
}

// Lydfilerne (Røst-stemmen, lyd/<ret>/<navn>.mp3) står ikke i FILER: de er ca. 5 MB, over ti gange resten af appen, og
// hentes derfor først, når de spilles (cache først som resten). INDHOLD regnes også af dem (test/test-sw.js), så en ny
// udgave af en lydfil giver en ny VERSION. Safari beder om lyd i bidder (Range: bytes=0-1), og et svar med en bid (206)
// kan ikke gemmes i en cache. Derfor hentes og gemmes altid hele filen, og bidden skæres ud af den.
async function lyd(e, req) {
  const cache = await caches.open(VERSION);
  let svar = await cache.match(req.url, { ignoreSearch: true });
  if (!svar) {
    svar = await fetch(req.url); // uden Range: hele filen. Uden net: fejl, og tale.js tager iPad-stemmen
    if (svar.status !== 200) return svar;
    e.waitUntil(cache.put(req.url, svar.clone()).catch(() => {}));
  }
  const omraade = req.headers.get('range');
  return omraade ? bid(svar, omraade) : svar;
}

async function bid(svar, omraade) {
  const data = await svar.arrayBuffer();
  const n = data.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(omraade.trim());
  let fra = -1;
  let til = -1;
  if (m && m[1] !== '') { fra = Number(m[1]); til = m[2] === '' ? n - 1 : Math.min(Number(m[2]), n - 1); }
  else if (m && m[2] !== '') { fra = Math.max(0, n - Number(m[2])); til = n - 1; } // «bytes=-500»: de sidste 500
  if (fra < 0 || fra >= n || fra > til) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
  return new Response(data.slice(fra, til + 1), {
    status: 206,
    headers: {
      'Content-Type': svar.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + fra + '-' + til + '/' + n,
      'Content-Length': String(til - fra + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

const erLyd = (url) => /\/lyd\/[a-z0-9-]+\/[a-z0-9-]+\.mp3$/.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !iScope(url)) return; // andre apps på samme origin: ikke vores sag
  e.respondWith(erOpskrift(url) ? netvaerkFoerst(e, req) : erLyd(url) ? lyd(e, req) : cacheFoerst(e, req));
});
