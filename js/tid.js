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
