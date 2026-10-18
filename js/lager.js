// lager.js — det eneste, appen gemmer: én nøgle «kog-v1» i localStorage med et versionsfelt.
// Indhold: { v: 1, sidste: { ret, nr, tid } | null, timer: { ret, nr, start, slut, sek } | null }
// Der er ingen fremskridt eller børnedata her; mister vi det, mister man kun «Fortsæt» og en kørende timer.

const NOEGLE = 'kog-v1';
const VERSION = 1;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const tomt = () => ({ v: VERSION, sidste: null, timer: null });
const erNr = (n) => Number.isInteger(n) && n > 0;

function rens(j) {
  const ud = tomt();
  if (!j || typeof j !== 'object' || j.v !== VERSION) return ud; // ukendt eller ældre udgave: start forfra
  const s = j.sidste;
  if (s && ID_RE.test(String(s.ret)) && erNr(s.nr) && Number.isFinite(s.tid)) ud.sidste = { ret: s.ret, nr: s.nr, tid: s.tid };
  const t = j.timer;
  if (t && ID_RE.test(String(t.ret)) && erNr(t.nr) && Number.isFinite(t.start) && Number.isFinite(t.slut) && erNr(t.sek)) {
    ud.timer = { ret: t.ret, nr: t.nr, start: t.start, slut: t.slut, sek: t.sek };
  }
  return ud;
}

export function hent() {
  try {
    return rens(JSON.parse(localStorage.getItem(NOEGLE) || 'null'));
  } catch (e) {
    return tomt(); // privat browsing eller ødelagt JSON
  }
}

export function gem(aendring) {
  const ny = rens({ ...hent(), ...aendring, v: VERSION });
  try {
    localStorage.setItem(NOEGLE, JSON.stringify(ny));
  } catch (e) {
    /* lageret er fuldt eller slået fra: appen virker stadig, den husker bare ikke */
  }
  return ny;
}
