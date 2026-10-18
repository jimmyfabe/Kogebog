// timer.js — én timer ad gangen for hele appen, så den overlever skift mellem skærme (og en genindlæsning).
// Tiden regnes fra sluttidspunktet (js/tid.js). Skærmen holdes tændt med Screen Wake Lock, mens timeren kører,
// og ved slut spiller WebAudio tre toner (ingen lydfiler).
import { nyTimer, timerStatus } from './tid.js';
import * as Lager from './lager.js';

let aktiv = null; // { ret, nr, start, slut, sek, faerdig }
let interval = 0;
let gentag = 0;
const lyttere = new Set();

// ---------- Lyd (WebAudio) ----------
let lydKontekst = null;

// Kaldes fra trykket, der starter timeren: iPad'en kræver et tryk, før der må komme lyd
function klargoerLyd() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!lydKontekst) lydKontekst = new AC();
    if (lydKontekst.state === 'suspended') lydKontekst.resume().catch(() => {});
  } catch (e) {
    lydKontekst = null;
  }
}

function bip() {
  const k = lydKontekst;
  if (!k) return;
  try {
    if (k.state === 'suspended') k.resume().catch(() => {});
    const t0 = k.currentTime + 0.05;
    [784, 988, 1175].forEach((hz, i) => {
      const t = t0 + i * 0.32;
      const osc = k.createOscillator();
      const g = k.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g);
      g.connect(k.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (e) { /* ingen lyd: skærmen viser stadig, at tiden er gået */ }
}

// ---------- Skærmen tændt (Screen Wake Lock) ----------
let laas = null;
let laasForsoeg = 0;

async function bedOmLaas() {
  if (!('wakeLock' in navigator) || !navigator.wakeLock || laas || document.visibilityState !== 'visible') return;
  const mit = ++laasForsoeg;
  try {
    const l = await navigator.wakeLock.request('screen');
    // Er timeren slut (eller en ny anmodning på vej), mens vi ventede, så slip den igen med det samme
    if (mit !== laasForsoeg || !koerer()) { l.release().catch(() => {}); return; }
    laas = l;
    if (typeof l.addEventListener === 'function') l.addEventListener('release', () => { if (laas === l) laas = null; });
  } catch (e) {
    laas = null; // ikke tilladt (fx strømbesparelse): timeren viser stadig den rigtige tid
  }
}

function slipLaas() {
  laasForsoeg++;
  const l = laas;
  laas = null;
  if (l) l.release().catch(() => {});
}

// ---------- Timeren ----------
const koerer = () => !!aktiv && !aktiv.faerdig;

function meld() {
  for (const fn of lyttere) {
    try { fn(); } catch (e) { console.error(e); }
  }
}

function gemTimer() {
  Lager.gem({ timer: aktiv && !aktiv.faerdig ? { ret: aktiv.ret, nr: aktiv.nr, start: aktiv.start, slut: aktiv.slut, sek: aktiv.sek } : null });
}

function stopUr() {
  clearInterval(interval);
  interval = 0;
}

function tik() {
  if (!aktiv) return;
  if (!aktiv.faerdig && timerStatus(aktiv, Date.now()).faerdig) {
    aktiv.faerdig = true;
    stopUr();
    slipLaas();
    gemTimer();
    bip();
    gentag = setTimeout(() => { if (aktiv && aktiv.faerdig) bip(); }, 4000);
  }
  meld();
}

function startUr() {
  stopUr();
  interval = setInterval(tik, 250);
}

export function start(ret, nr, sek) {
  klargoerLyd();
  clearTimeout(gentag);
  aktiv = { ret, nr, ...nyTimer(Date.now(), sek), faerdig: false };
  gemTimer();
  startUr();
  bedOmLaas();
  meld();
}

// Stop en kørende timer, eller kvittér for en, der er færdig
export function stop() {
  aktiv = null;
  clearTimeout(gentag);
  stopUr();
  slipLaas();
  gemTimer();
  meld();
}

export function aktuel() {
  return aktiv;
}

export function status() {
  return aktiv ? timerStatus(aktiv, Date.now()) : null;
}

export function lyt(fn) {
  lyttere.add(fn);
  return () => lyttere.delete(fn);
}

// En timer, der kørte før en genindlæsning, fortsætter (en, der løb ud imens, glemmes)
export function gendan() {
  const t = Lager.hent().timer;
  if (!t || t.slut <= Date.now()) {
    if (t) Lager.gem({ timer: null });
    return;
  }
  aktiv = { ...t, faerdig: false };
  startUr();
  bedOmLaas();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (koerer()) bedOmLaas(); // låsen slippes af sig selv, når fanen skjules
  tik();
});
