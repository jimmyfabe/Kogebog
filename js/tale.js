// tale.js — oplæsning. Kun når nogen trykker (kaldes altid fra et tryk).
// 1) lyd/<ret>/<trin>.mp3, hvis filen står i lyd/liste.json (så spørger vi aldrig efter filer, der ikke findes).
// 2) Ellers enhedens egen stemme (speechSynthesis) på dansk, lang 'da-DK', og en dansk stemme, hvis der er en.
import { tilTale } from './tekst.js';

let filer = new Set();
let lyd = null;
let aktuel = null; // holdes fast, ellers kan nogle browsere glemme onend
let knap = null;

export function hentLydListe() {
  return fetch('lyd/liste.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { filer = new Set(j && Array.isArray(j.filer) ? j.filer.filter((f) => typeof f === 'string') : []); })
    .catch(() => { filer = new Set(); });
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

// sig('Hæld melet i skålen.', { fil: 'pandekager/3.mp3', knap })
export function sig(tekst, { fil, knap: b } = {}) {
  stop();
  markerKnap(b);
  if (fil && filer.has(fil)) {
    const a = new Audio('lyd/' + fil);
    lyd = a;
    a.addEventListener('ended', () => { if (lyd === a) { lyd = null; markerKnap(null); } });
    a.play().catch(() => { if (lyd === a) { lyd = null; syntese(tekst); } });
    return;
  }
  syntese(tekst);
}

export function stop() {
  if (lyd) { lyd.pause(); lyd = null; }
  aktuel = null;
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (e) { /* ingen stemme */ }
  markerKnap(null);
}

// Stemmerne hentes lidt efter start i Safari og Chrome: spørg én gang nu, så listen er klar ved første tryk
try {
  if (window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function') window.speechSynthesis.getVoices();
} catch (e) { /* ingen stemme */ }
