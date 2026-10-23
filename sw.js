/* sw.js — service worker for Tumbi Køkken (scope './'), så kogebogen virker i køkkenet uden net.
   Samme origin som Lystårnet («mat-») og LEGO («lego-»): denne fil rører KUN caches, der starter med «kog-».
   Opskrifterne (opskrifter/*.json og lyd/liste.json) hentes netværk først, så en rettet opskrift slår igennem;
   alt andet er cache først, så en ændret fil kun når ud til enhederne, hvis cachens navn (VERSION) skifter.
   Derfor er VERSION bygget af INDHOLD: et tal for alle FILER. Lydfilerne ligger i deres egen cache (LYD_CACHE, bygget af
   LYD: et tal for lydfilerne), så en ændring i appen ikke sletter den lyd, iPad'en allerede har gemt.
   test/test-sw.js tjekker, at FILER er komplet, og fejler, når en fil er ændret. Fejlbeskeden viser den nye værdi;
   testen ændrer ikke sw.js, så den sættes her i hånden.
   Svarer nettet ikke inden for HENT_MS (4 s), kommer en opskrift (også index.json) fra cachen, og nettets svar gemmes
   til næste gang. De næste LANGSOM_MS (30 s) tager opskrifterne cachen med det samme (code review U3 og F2, 23-10). */
const PRAEFIKS = 'kog-';
const INDHOLD = '752148990dcc2390'; // sha256 (16 tegn) af FILER — sæt den værdi, test/test-sw.js viser i fejlbeskeden
const VERSION = PRAEFIKS + INDHOLD;
const LYD = '62514f04783c4e58'; // sha256 (16 tegn) af lydfilerne (lyd/*/*.mp3) — sæt den værdi, test/test-sw.js viser
const LYD_CACHE = PRAEFIKS + 'lyd-' + LYD;
const HENT_MS = 4000; // så længe venter en lydfil (før iPad-stemmen tager over) eller en opskrift (før cachen) på nettet
const LANGSOM_MS = 30000; // så længe tager opskrifterne cachen med det samme, efter at nettet ikke svarede inden for HENT_MS
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
  'js/print-uge.js',
  'js/indkoeb.js',
  'js/plankode.js',
  'js/ugeplan.js',
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
  'opskrifter/one-pot-tomatpasta.json',
  'opskrifter/linsebolognese.json',
  'opskrifter/halv-halv-koedsovs.json',
  'opskrifter/chili-con-carne.json',
  'opskrifter/taco-bradepande.json',
  'opskrifter/pladepizza.json',
  'opskrifter/fiskepinde-med-baade.json',
  'opskrifter/fiskefars-i-fad.json',
  'opskrifter/bradepandekylling.json',
  'opskrifter/kyllingekarry.json',
  'opskrifter/wok-med-nudler.json',
  'opskrifter/ovnaeggekage.json',
  'opskrifter/tomatsuppe-med-boenner.json',
  'opskrifter/minestrone.json',
  'opskrifter/koedboller-i-tomatsovs.json',
  'opskrifter/medister-i-ovn.json',
  'opskrifter/poelse-boennegryde.json',
  'opskrifter/kyllingefrikadeller.json',
  'opskrifter/wraps-med-boenner.json',
  'opskrifter/gryderis-med-kylling.json',
  'opskrifter/linse-dhal.json',
  'opskrifter/hyrdetaerte.json',
  'opskrifter/pastagratin.json',
  'opskrifter/one-pot-makaroni.json',
  'opskrifter/lun-tunpasta.json',
  'opskrifter/ovnpandekage.json',
  'opskrifter/kyllinge-nudelsuppe.json',
  'opskrifter/rugbroedsaften.json',
  'opskrifter/ovnbagt-blomkaal.json',
  'opskrifter/bradepande-fajitas.json',
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
  'grafik/ing-aerter.svg', 'grafik/ing-broccoli.svg', 'grafik/ing-linser.svg', 'grafik/ing-boenner.svg', 'grafik/ing-ris.svg',
  'grafik/ing-tortilla.svg',
  'grafik/ing-agurk.svg', 'grafik/ing-blomkaal.svg',
  'grafik/ing-soja.svg', 'grafik/ing-honning.svg',
  'grafik/ing-kaal.svg',
  'grafik/ing-makrel.svg', 'grafik/ing-kikaerter.svg', 'grafik/ing-bulgur.svg',
  'grafik/ret-boller.webp', 'grafik/ret-chorizo-pasta.webp', 'grafik/ret-frikadeller.webp', 'grafik/ret-koedsovs.webp', 'grafik/ret-pandekager.webp',
  'grafik/ret-kartoffelmos.webp', 'grafik/ret-hvidloegsflutes.webp', 'grafik/ret-brownie.webp', 'grafik/ret-blondie.webp',
  'grafik/ret-hytteostboller.webp', 'grafik/ret-havregrynskugler.webp', 'grafik/ret-tunfrikadeller.webp',
  'grafik/ret-pizzasnegle.webp',
  'grafik/ret-mumiepoelser.webp', 'grafik/ret-edderkoppeboller.webp', 'grafik/ret-oejeboller.webp', 'grafik/ret-graeskar-calzone.webp',
  'grafik/ret-heksefingre.webp', 'grafik/ret-slimsnegle.webp',
  'grafik/ret-bolognese-one-pot.webp', 'grafik/ret-cremet-koedsovs.webp',
  'grafik/ret-one-pot-tomatpasta.webp', 'grafik/ret-linsebolognese.webp', 'grafik/ret-halv-halv-koedsovs.webp',
  'grafik/ret-chili-con-carne.webp', 'grafik/ret-taco-bradepande.webp',
  'grafik/ret-pladepizza.webp', 'grafik/ret-fiskepinde-med-baade.webp', 'grafik/ret-fiskefars-i-fad.webp',
  'grafik/ret-bradepandekylling.webp', 'grafik/ret-kyllingekarry.webp',
  'grafik/ret-wok-med-nudler.webp', 'grafik/ret-ovnaeggekage.webp', 'grafik/ret-tomatsuppe-med-boenner.webp',
  'grafik/ret-minestrone.webp', 'grafik/ret-koedboller-i-tomatsovs.webp',
  'grafik/ret-medister-i-ovn.webp', 'grafik/ret-poelse-boennegryde.webp', 'grafik/ret-kyllingefrikadeller.webp',
  'grafik/ret-wraps-med-boenner.webp', 'grafik/ret-gryderis-med-kylling.webp',
  'grafik/ret-linse-dhal.webp', 'grafik/ret-hyrdetaerte.webp', 'grafik/ret-pastagratin.webp',
  'grafik/ret-one-pot-makaroni.webp', 'grafik/ret-lun-tunpasta.webp',
  'grafik/ret-ovnpandekage.webp', 'grafik/ret-kyllinge-nudelsuppe.webp', 'grafik/ret-rugbroedsaften.webp',
  'grafik/ret-ovnbagt-blomkaal.webp', 'grafik/ret-bradepande-fajitas.webp',
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

// Svarer nettet ikke inden for HENT_MS (svag 4G, wifi uden internet), kommer opskriften fra cachen, og nettets svar
// gemmes, hvis det kommer senere. Er intet gemt, ventes der på nettet (code review U3, 23-10: før ventede #/hent, til
// Safari selv gav op). Det huskes i LANGSOM_MS, så retterne, der hentes efter index.json, tager cachen med det samme:
// ellers ventede de HENT_MS mere, i alt ca. 8 s (code review F2, 23-10). Nettet spørges stadig, og svaret gemmes
let langsomTil = 0;
async function netvaerkFoerst(e, req) {
  const cache = await caches.open(VERSION);
  const fraNet = fetch(req, { cache: 'no-cache' });
  e.waitUntil(fraNet.then((svar) => (svar.ok ? cache.put(req, svar.clone()) : null)).catch(() => {}));
  if (Date.now() < langsomTil) {
    const gemt = await cache.match(req, { ignoreSearch: true });
    if (gemt) return gemt;
  }
  let ur;
  const forSent = new Promise((ok) => { ur = setTimeout(() => ok(null), HENT_MS); });
  try {
    let svar = await Promise.race([fraNet, forSent]);
    if (svar === null) {
      const gemt = await cache.match(req, { ignoreSearch: true });
      if (gemt) {
        langsomTil = Date.now() + LANGSOM_MS;
        return gemt;
      }
      svar = await fraNet;
    }
    if (svar.status >= 500) return (await cache.match(req, { ignoreSearch: true })) || svar;
    return svar;
  } catch (err) {
    const gemt = await cache.match(req, { ignoreSearch: true });
    if (gemt) return gemt;
    throw err;
  } finally {
    clearTimeout(ur);
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
