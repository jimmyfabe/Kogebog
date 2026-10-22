/* sw.js — service worker for Tumbi Køkken (scope './'), så kogebogen virker i køkkenet uden net.
   Samme origin som Lystårnet («mat-») og LEGO («lego-»): denne fil rører KUN caches, der starter med «kog-».
   Opskrifterne (opskrifter/*.json og lyd/liste.json) hentes netværk først, så en rettet opskrift slår igennem;
   alt andet er cache først, så en ændret fil kun når ud til enhederne, hvis cachens navn (VERSION) skifter.
   Derfor er VERSION bygget af INDHOLD: et tal for alle FILER. Lydfilerne ligger i deres egen cache (LYD_CACHE, bygget af
   LYD: et tal for lydfilerne), så en ændring i appen ikke sletter den lyd, iPad'en allerede har gemt.
   test/test-sw.js tjekker, at FILER er komplet, og fejler, når en fil er ændret. Fejlbeskeden viser den nye værdi;
   testen ændrer ikke sw.js, så den sættes her i hånden. */
const PRAEFIKS = 'kog-';
const INDHOLD = '3fcb67f221285921'; // sha256 (16 tegn) af FILER — sæt den værdi, test/test-sw.js viser i fejlbeskeden
const VERSION = PRAEFIKS + INDHOLD;
const LYD = '62514f04783c4e58'; // sha256 (16 tegn) af lydfilerne (lyd/*/*.mp3) — sæt den værdi, test/test-sw.js viser
const LYD_CACHE = PRAEFIKS + 'lyd-' + LYD;
const HENT_MS = 4000; // så længe venter en lydfil på svar fra nettet (wifi uden internet), før iPad-stemmen tager over
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
  'js/voksen.js',
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
  'opskrifter/mumiepoelser.json',
  'opskrifter/edderkoppeboller.json',
  'opskrifter/oejeboller.json',
  'opskrifter/graeskar-calzone.json',
  'opskrifter/heksefingre.json',
  'opskrifter/slimsnegle.json',
  'opskrifter/bolognese-one-pot.json',
  'opskrifter/cremet-koedsovs.json',
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
  'grafik/ing-pizzadej.svg', 'grafik/ing-poelse.svg', 'grafik/ing-ketchup.svg', 'grafik/ing-oliven.svg', 'grafik/ing-majs.svg',
  'grafik/ing-peberfrugt.svg', 'grafik/ing-flodeost.svg', 'grafik/ing-spinat.svg',
  'grafik/ret-boller.webp', 'grafik/ret-chorizo-pasta.webp', 'grafik/ret-frikadeller.webp', 'grafik/ret-koedsovs.webp', 'grafik/ret-pandekager.webp',
  'grafik/ret-kartoffelmos.webp', 'grafik/ret-hvidloegsflutes.webp', 'grafik/ret-brownie.webp', 'grafik/ret-blondie.webp',
  'grafik/ret-hytteostboller.webp', 'grafik/ret-havregrynskugler.webp', 'grafik/ret-tunfrikadeller.webp',
  'grafik/ret-pizzasnegle.webp',
  'grafik/ret-mumiepoelser.webp', 'grafik/ret-edderkoppeboller.webp', 'grafik/ret-oejeboller.webp', 'grafik/ret-graeskar-calzone.webp',
  'grafik/ret-heksefingre.webp', 'grafik/ret-slimsnegle.webp',
  'grafik/ret-bolognese-one-pot.webp', 'grafik/ret-cremet-koedsovs.webp',
  'grafik/gruppe-aftensmad.svg', 'grafik/gruppe-bagning.svg', 'grafik/gruppe-soede-sager.svg', 'grafik/gruppe-halloween.svg',
  'grafik/verbum-aelte.svg', 'grafik/verbum-haelde.svg', 'grafik/verbum-koge.svg', 'grafik/verbum-maale.svg', 'grafik/verbum-roere.svg',
  'grafik/verbum-rulle.svg', 'grafik/verbum-skaere.svg', 'grafik/verbum-smage.svg', 'grafik/verbum-stege.svg',
  'grafik/verbum-vaske-haender.svg', 'grafik/verbum-vende.svg', 'grafik/verbum-vente.svg',
  'grafik/verbum-bage.svg', 'grafik/verbum-drysse.svg', 'grafik/verbum-mose.svg', 'grafik/verbum-pensle.svg', 'grafik/verbum-piske.svg',
  'grafik/verbum-rive.svg', 'grafik/verbum-smoere.svg',
  'grafik/verbum-tage-ud.svg', 'grafik/verbum-tage-ud-form.svg', 'grafik/verbum-si.svg', 'grafik/verbum-kagerulle.svg', 'grafik/verbum-pakke-ind.svg', 'grafik/verbum-smuldre.svg',
  'grafik/verbum-pynte.svg', 'grafik/verbum-sproejte.svg',
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
    // Kun vores egne, gamle udgaver. Lystårnets «mat-…» og LEGO's «lego-…» lader vi være, og lyden beholdes,
    // så længe lydfilerne er de samme (LYD_CACHE).
    const navne = await caches.keys();
    await Promise.all(navne.filter((n) => n.startsWith(PRAEFIKS) && n !== VERSION && n !== LYD_CACHE).map((n) => caches.delete(n)));
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

// Lydfilerne (Røst-stemmen, lyd/<ret>/<navn>.mp3) står ikke i FILER: de er ca. 8 MB, 18 gange resten af appen, og
// hentes derfor først, når de spilles (cache først som resten). De gemmes i LYD_CACHE, som kun skifter navn, når
// lydfilerne ændres (LYD, test/test-sw.js), så en ny udgave af appen ikke sletter lyden. Safari beder om lyd i bidder
// (Range: bytes=0-1), og et svar med en bid (206) kan ikke gemmes i en cache. Derfor hentes og gemmes altid hele filen,
// og bidden skæres ud af den.
async function lyd(e, req) {
  const cache = await caches.open(LYD_CACHE);
  let svar = await cache.match(req.url, { ignoreSearch: true });
  if (!svar) {
    // Uden Range: hele filen. «no-cache»: en ny udgave tages ikke fra browserens HTTP-cache. Svarer nettet ikke inden for
    // HENT_MS (wifi uden internet), afbrydes hentningen, og tale.js tager iPad-stemmen. Uret stopper ved svarets
    // første del, så en langsom, men levende forbindelse ikke skærer filen over
    const afbryd = new AbortController();
    const ur = setTimeout(() => afbryd.abort(), HENT_MS);
    try {
      svar = await fetch(req.url, { cache: 'no-cache', signal: afbryd.signal });
    } finally {
      clearTimeout(ur);
    }
    if (svar.status !== 200) return svar;
    e.waitUntil(cache.put(req.url, svar.clone()).catch(() => {}));
  }
  const omraade = req.headers.get('range');
  return omraade ? bid(svar, omraade) : svar;
}

// RFC 9110, afsnit 14: en Range, der ikke kan læses (en anden enhed end bytes, flere intervaller, «bytes=5-2»), ignoreres,
// og hele filen sendes (200). Enheden kendes uden forskel på store og små bogstaver («Bytes=0-1» er en bid).
// En gyldig bid, der ligger efter filens slutning («bytes=10-» af 10 byte, «bytes=-0»), giver 416
async function bid(svar, omraade) {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(omraade.trim());
  if (!m || (m[1] === '' && m[2] === '') || (m[1] !== '' && m[2] !== '' && Number(m[2]) < Number(m[1]))) return svar;
  const data = await svar.arrayBuffer();
  const n = data.byteLength;
  let fra;
  let til = n - 1;
  if (m[1] !== '') { fra = Number(m[1]); if (m[2] !== '') til = Math.min(Number(m[2]), n - 1); }
  else fra = Number(m[2]) > 0 ? Math.max(0, n - Number(m[2])) : n; // «bytes=-500»: de sidste 500
  if (fra >= n) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
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
