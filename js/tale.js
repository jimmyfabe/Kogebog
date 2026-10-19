// tale.js — oplæsning. Kaldes fra et tryk, men også lige efter et voksen-hold (fra requestAnimationFrame, uden tryk).
// Hvad der siges, og hvilken lydfil der hører til, står i js/replikker.js ({ tekst, fil }).
// 1) lyd/<fil> (Røst, en forud lavet computerstemme), hvis filen står i lyd/liste.json (så spørger vi aldrig efter filer,
//    der ikke findes). vaerktoej/lav-taleliste.js laver listen over tekster til lydfilerne.
// 2) Ellers enhedens egen stemme (speechSynthesis) på dansk, lang 'da-DK', og en dansk stemme, hvis der er en.
// iPad: et lydelement må først spille, når det har fået et tryk (WebKit fjerner kravet for netop det element, når
// load() eller play() kaldes i et tryk), og speechSynthesis skal også tale første gang i et tryk. Derfor ét fælles
// lydelement, der låses op ved første tryk og genbruges (ny src pr. replik), og en tavs ytring i samme tryk.
// Ikke afprøvet på iPad.
import { tilTale } from './tekst.js';

const LYD_CACHE = 'kog-lyd-'; // sw.js gemmer lydfilerne i «kog-lyd-<LYD>»
const TRYK = ['pointerup', 'touchend', 'click', 'keydown']; // brugeraktivering (som i timer.js)

let filer = new Set();
const gemte = new Set(); // lydfiler, der ligger i service workerens cache (kan spilles uden net)
let lyd = null; // det fælles lydelement
let nr = 0; // løbenummer: en gammel replik's catch/fejl må ikke ramme den, der spiller nu
let spiller = null; // { nr, tekst, fil, knap } mens en lydfil spiller
let aktuel = null; // ytringen, der tales nu (holdes fast, ellers kan nogle browsere glemme onend)
let knap = null;

export function hentLydListe() {
  hentGemte();
  return fetch('lyd/liste.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { filer = new Set(j && Array.isArray(j.filer) ? j.filer.filter((f) => typeof f === 'string') : []); })
    .catch(() => { filer = new Set(); });
}

// Uden net kan kun de gemte filer spilles. Listen læses af cachen ved start og vokser, når en fil er spillet færdig
async function hentGemte() {
  try {
    if (typeof caches === 'undefined') return;
    for (const navn of await caches.keys()) {
      if (!navn.startsWith(LYD_CACHE)) continue;
      for (const r of await (await caches.open(navn)).keys()) {
        const i = r.url.indexOf('/lyd/');
        if (i >= 0) gemte.add(r.url.slice(i + 5).replace(/[?#].*$/, ''));
      }
    }
  } catch (e) { /* ingen cache: uden net tager iPad-stemmen over */ }
}

function danskStemme() {
  const ss = window.speechSynthesis;
  const alle = (ss && typeof ss.getVoices === 'function' && ss.getVoices()) || [];
  const da = alle.filter((v) => /^da(?:[-_]|$)/i.test(v.lang || ''));
  return da.find((v) => /^da[-_]DK$/i.test(v.lang)) || da[0] || null;
}

function markerKnap(b) {
  if (knap) knap.classList.remove('taler');
  knap = b || null;
  if (knap) knap.classList.add('taler');
}

function syntese(tekst) {
  const ss = window.speechSynthesis;
  const Ytring = window.SpeechSynthesisUtterance;
  if (!ss || !Ytring) { markerKnap(null); return false; }
  try {
    const u = new Ytring(tilTale(tekst));
    u.lang = 'da-DK';
    const v = danskStemme();
    if (v) u.voice = v;
    u.rate = 0.92;
    u.onend = () => { if (aktuel === u) { aktuel = null; markerKnap(null); } };
    u.onerror = u.onend;
    aktuel = u;
    ss.speak(u);
    return true;
  } catch (e) {
    markerKnap(null);
    return false;
  }
}

// Lydfilen kunne ikke spilles (afvist, fejl ved hentningen): iPad-stemmen siger det samme
function reserve(mit) {
  if (!spiller || spiller.nr !== mit) return;
  const { tekst, knap: b } = spiller;
  spiller = null;
  markerKnap(b);
  syntese(tekst);
}

function lydElement() {
  if (lyd || typeof Audio !== 'function') return lyd;
  const a = new Audio();
  a.preload = 'auto';
  // Hændelserne kommer bagefter (en opgave senere). Tjekket på a.ended/a.paused/a.error sikrer, at en hændelse fra
  // den forrige replik ikke slutter den nye: efter en ny src og play() er a.paused false og a.error null
  a.addEventListener('ended', () => {
    if (!spiller || !a.ended) return;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) gemte.add(spiller.fil);
    spiller = null;
    markerKnap(null);
  });
  // Sat på pause udefra (fx et opkald eller låseskærmen): knappens markering må ikke sidde fast
  a.addEventListener('pause', () => {
    if (!spiller || !a.paused || a.ended) return;
    spiller = null;
    markerKnap(null);
  });
  a.addEventListener('error', () => { if (spiller && a.error) reserve(spiller.nr); });
  lyd = a;
  return a;
}

// Første tryk: lydelementet og speechSynthesis låses op, så de også kan tale lige efter et hold.
// WebKit regner ikke altid pointerup som et tryk (som i timer.js): lytterne bliver derfor, til der er kommet et
// touchend, click eller keydown, ellers er et senere voksen-hold uden tryk tavst
function laasOp(e) {
  if (e && (e.isTrusted === false || (e.type === 'keydown' && e.key === 'Escape'))) return;
  if (!e || e.type !== 'pointerup') for (const type of TRYK) document.removeEventListener(type, laasOp, true);
  const a = lydElement();
  if (a && !spiller) {
    try { a.load(); } catch (err) { /* intet lydelement */ }
  }
  const ss = window.speechSynthesis;
  const Ytring = window.SpeechSynthesisUtterance;
  if (ss && Ytring && !aktuel) {
    try {
      const u = new Ytring(' ');
      u.volume = 0;
      u.lang = 'da-DK';
      ss.speak(u);
    } catch (err) { /* ingen stemme */ }
  }
}
for (const type of TRYK) document.addEventListener(type, laasOp, true);

// Uden net kan en fil, der ikke er gemt, ikke hentes. Så tager iPad-stemmen over med det samme (i trykket),
// i stedet for at vente på fejlen bagefter
const kanSpilles = (fil) => filer.has(fil) && (navigator.onLine !== false || gemte.has(fil));

// sig(R.trin(m, t), { knap }) — replikken er { tekst, fil } fra js/replikker.js
export function sig({ tekst, fil }, { knap: b } = {}) {
  stop();
  markerKnap(b);
  const a = fil && kanSpilles(fil) ? lydElement() : null;
  if (!a) { syntese(tekst); return; }
  const mit = ++nr;
  spiller = { nr: mit, tekst, fil, knap: b || null };
  try {
    a.src = 'lyd/' + fil;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => reserve(mit));
  } catch (e) {
    reserve(mit);
  }
}

export function stop() {
  nr++;
  if (spiller) {
    spiller = null;
    try { lyd.pause(); } catch (e) { /* intet lydelement */ }
  }
  // Kun en rigtig ytring stoppes: den tavse fra første tryk (laasOp) skal have lov at blive talt færdig
  if (aktuel) {
    aktuel = null;
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) { /* ingen stemme */ }
  }
  markerKnap(null);
}

// Stemmerne hentes lidt efter start i Safari og Chrome: spørg én gang nu, så listen er klar ved første tryk
try {
  if (window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function') window.speechSynthesis.getVoices();
} catch (e) { /* ingen stemme */ }
