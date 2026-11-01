// tid.js — timerens rene tidslogik. Ingen DOM, så den kan testes i node (test/test-tid.js).
// Timeren regner altid fra sluttidspunktet, så den ikke går bagud, når iPad'en sover eller fanen er i baggrunden.

export const HURTIG_SEK = 2; // ?hurtig=1 (kun til test): alle timere varer 2 sekunder

// Hvor længe timeren skal køre (i sekunder)
export function varighed(sek, hurtig = false) {
  return hurtig ? HURTIG_SEK : sek;
}

export function nyTimer(nuMs, sek) {
  if (!Number.isInteger(sek) || sek <= 0) throw new Error('Timeren skal have et positivt helt antal sekunder, fik ' + sek);
  return { start: nuMs, slut: nuMs + sek * 1000, sek };
}

// Status lige nu: resten i ms og hele sekunder (rundet op, så «0:00» først vises, når tiden er gået),
// hvor stor en del der er tilbage (1 → 0), og om den er færdig.
export function timerStatus(timer, nuMs) {
  const restMs = Math.max(0, timer.slut - nuMs);
  const ialt = timer.sek * 1000;
  const andel = ialt > 0 ? Math.min(1, Math.max(0, restMs / ialt)) : 0;
  return { restMs, restSek: Math.ceil(restMs / 1000), andel, faerdig: restMs <= 0 };
}

// 605 → «10:05», 3725 → «1:02:05»
export function formaterTid(sek) {
  const s = Math.max(0, Math.round(sek));
  const t = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const to = (n) => String(n).padStart(2, '0');
  return t > 0 ? t + ':' + to(m) + ':' + to(r) : m + ':' + to(r);
}

// Til skærm og print: 600 → «10 min», 45 → «45 sek», 90 → «1 min 30 sek», 5400 → «1 t 30 min»
export function varighedKort(sek) {
  const t = Math.floor(sek / 3600);
  const m = Math.floor((sek % 3600) / 60);
  const s = sek % 60;
  const dele = [];
  if (t) dele.push(t + ' t');
  if (m) dele.push(m + ' min');
  if (s) dele.push(s + ' sek');
  return dele.join(' ') || '0 sek';
}

// Til oplæsning: 60 → «1 minut», 90 → «1 minut og 30 sekunder»
export function varighedTale(sek) {
  const t = Math.floor(sek / 3600);
  const m = Math.floor((sek % 3600) / 60);
  const s = sek % 60;
  const dele = [];
  if (t) dele.push(t + (t === 1 ? ' time' : ' timer'));
  if (m) dele.push(m + (m === 1 ? ' minut' : ' minutter'));
  if (s) dele.push(s + (s === 1 ? ' sekund' : ' sekunder'));
  if (!dele.length) return '0 sekunder';
  return dele.length === 1 ? dele[0] : dele.slice(0, -1).join(', ') + ' og ' + dele[dele.length - 1];
}

// ---------- Ugeplanens uger (docs/ugeplan-plan.md) ----------
// Datoerne er ÅÅÅÅ-MM-DD og regnes i UTC, så sommertid aldrig flytter en dag
const DAG_MS = 86400000;
const tilDato = (ms) => new Date(ms).toISOString().slice(0, 10);
const fraDato = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const ugedag = (ms) => (new Date(ms).getUTCDay() + 6) % 7; // mandag 0, søndag 6

// Dagens dato som 'ÅÅÅÅ-MM-DD' i enhedens tid («lavet» og udvalgets «rettet» i js/lager.js). d er en lokal Date
export function idag(d = new Date()) {
  const to = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + to(d.getMonth() + 1) + '-' + to(d.getDate());
}

// Ugens dage, mandag først (dage[0] i kog-uge-v1)
export const DAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

// Den mandag, en ny ugeplan gælder fra: i dag, hvis det er mandag, ellers den næste. idag er en lokal Date
export function planMandag(idag = new Date()) {
  const ms = Date.UTC(idag.getFullYear(), idag.getMonth(), idag.getDate());
  const d = ugedag(ms);
  return tilDato(ms + (d ? 7 - d : 0) * DAG_MS);
}

// ISO-ugenummeret (uge 1 har årets første torsdag): '2026-10-26' → 44, '2026-12-28' → 53, '2027-01-04' → 1
export function ugeNr(dato) {
  const ms = fraDato(dato);
  const torsdag = ms + (3 - ugedag(ms)) * DAG_MS;
  const jan1 = Date.UTC(new Date(torsdag).getUTCFullYear(), 0, 1);
  return 1 + Math.floor((torsdag - jan1) / DAG_MS / 7);
}

// Dag i (0 = mandag) i ugen, der starter mandag: «26/10»
export function dagDato(mandag, i) {
  const d = new Date(fraDato(mandag) + i * DAG_MS);
  return d.getUTCDate() + '/' + (d.getUTCMonth() + 1);
}
