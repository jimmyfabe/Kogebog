// indkoeb.js — indkøbslisten til ugeplanen (docs/ugeplan-plan.md, afsnit 4). Ren logik: ingen DOM og intet lager.
// saml() lægger ugens ingredienser sammen i hver vares enhed (VARER i katalog.js) og skalerer til de valgte portioner.
// Der rundes først op, når mængden vises, så to halve dåser bliver én dåse og ikke to.
// Retterne er opskrifternes JSON (schema.org/Recipe + «tumbi»), som validatoren læser dem: lavModel har ikke varerne.
import { VARER, AFDELINGER, ENHEDER } from './katalog.js';

export const MAKS_M = 100000; // højst så meget af én vare i varens enhed (samme grænse som listen i lager.js)

const AFD_ORDEN = Object.keys(AFDELINGER);
// Object.hasOwn: «constructor» og «toString» er ikke varer eller enheder
const har = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const erPortioner = (n) => Number.isInteger(n) && n >= 1 && n <= 12;

// Antal hele trin, rundet op. Kommatal fra regningen (1,1 × 100 = 110,00000000000001) giver ikke et trin mere
const antalTrin = (x, trin) => Math.ceil(Math.round((x / trin) * 1e6) / 1e6);
const rundOp = (x, trin) => antalTrin(x, trin) * trin;

// valg: [{ ret: opskriftens JSON, n: valgte portioner 1-12 }], én pr. dag; samme ret to gange lægges også sammen.
// Svar: [{ id, m }] i butikkens rækkefølge (AFDELINGER) og derefter efter navn. m er mængden i varens enhed, 0 for en
// basisvare. Retter uden for ugeplanen og linjer, der ikke kan lægges sammen, springes over (validatoren fanger dem)
export function saml(valg) {
  if (!Array.isArray(valg)) throw new TypeError('saml: valg skal være en liste');
  const sum = new Map();
  for (const v of valg) {
    const t = v && v.ret && v.ret.tumbi;
    if (!t || t.ugeplan !== true || !erPortioner(t.portioner) || !erPortioner(v.n) || !Array.isArray(t.ingredienser)) continue;
    for (const l of t.ingredienser) {
      if (!l || !har(VARER, l.vare)) continue;
      const vare = VARER[l.vare];
      if (vare.skjul) continue;
      if (vare.basis) {
        if (!sum.has(l.vare)) sum.set(l.vare, 0);
        continue;
      }
      if (!har(ENHEDER, l.enhed) || !Number.isFinite(l.antal) || l.antal <= 0) continue;
      const e = ENHEDER[l.enhed];
      if (e.dim !== ENHEDER[vare.enhed].dim) continue;
      sum.set(l.vare, (sum.get(l.vare) || 0) + (l.antal * e.faktor * v.n) / t.portioner);
    }
  }
  return [...sum].map(([id, m]) => ({ id, m: Math.min(MAKS_M, Math.round(m * 1000) / 1000) })).sort(orden);
}

function orden(a, b) {
  const va = VARER[a.id];
  const vb = VARER[b.id];
  return AFD_ORDEN.indexOf(va.afd) - AFD_ORDEN.indexOf(vb.afd) || va.navn.localeCompare(vb.navn, 'da');
}

const tal = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');

// Mængden uden afrunding: 800 g, 1,11 kg, ½ dl, 2,5 dl, 1,25 l, 3 stk, 5 fed
function eksakt(m, enhed) {
  if (enhed === 'g') return m < 1000 ? tal(m) + ' g' : tal(m / 1000) + ' kg';
  if (enhed === 'ml') return m < 1000 ? (m === 50 ? '½' : tal(m / 100)) + ' dl' : tal(m / 1000) + ' l';
  return tal(m) + ' ' + enhed;
}

// Mængden, som skærmen og printet viser den: tal og enhed holdes sammen med et hårdt mellemrum, så «500 g» og «1 pakke»
// ikke deles over to linjer (UI-review V2, 23-10). Mængden selv og teksten, der deles (tekst()), har almindelige mellemrum
export const holdSammen = (maengde) => String(maengde || '').replace(/([\d½]) (?=\S)/g, '$1\u00a0');

// Mængden på listen, rundet op. Med en pakke: «3 dåser (1,2 kg)», hvor parentesen er pakkernes indhold. Uden: stk og fed
// til hele, gram til 10 g (fra 1 kg til 100 g: «1,2 kg») og ml til ½ dl (fra 1 l til 1 dl: «1,5 l»). Tom tekst for 0
export function visMaengde(m, enhed, pakke = null) {
  if (!Number.isFinite(m) || m <= 0) return '';
  if (pakke) {
    const [indhold, ental, flertal] = pakke;
    const n = antalTrin(m, indhold);
    return n + ' ' + (n === 1 ? ental : flertal) + (indhold === 1 ? '' : ' (' + eksakt(n * indhold, enhed) + ')');
  }
  if (enhed === 'g') {
    const r = rundOp(m, 10);
    return eksakt(r < 1000 ? r : rundOp(m, 100), 'g');
  }
  if (enhed === 'ml') {
    const r = rundOp(m, 50);
    return eksakt(r < 1000 ? r : rundOp(m, 100), 'ml');
  }
  if (enhed === 'stk' || enhed === 'fed') return eksakt(rundOp(m, 1), enhed);
  return '';
}

// Mængden af en vare på listen; basisvarer står uden mængde
export function vareTekst(id, m) {
  if (!har(VARER, id)) return '';
  const v = VARER[id];
  return v.basis ? '' : visMaengde(m, v.enhed, v.pakke || null);
}

// Listen delt i afdelinger i butikkens rækkefølge: [{ afd, navn, varer: [{ id, navn, ikon, maengde }] }]. Tomme
// afdelinger er udeladt, og ukendte eller skjulte varer springes over
export function grupper(varer) {
  const ud = [];
  for (const { id, m } of varer) {
    if (!har(VARER, id) || VARER[id].skjul) continue;
    const v = VARER[id];
    let g = ud.find((x) => x.afd === v.afd);
    if (!g) {
      g = { afd: v.afd, navn: AFDELINGER[v.afd], varer: [] };
      ud.push(g);
    }
    g.varer.push({ id, navn: v.navn, ikon: v.ikon, maengde: vareTekst(id, m) });
  }
  return ud.sort((a, b) => AFD_ORDEN.indexOf(a.afd) - AFD_ORDEN.indexOf(b.afd));
}

// Dagene, der ikke kommer på listen, og hvorfor (til «Del som tekst» og printet): ikkeHentet er dage, hvis opskrift
// ikke kunne hentes, ikkeIPlanen dage med en ret, der ikke længere er i ugeplanen. Svar: en eller to sætninger, eller ''
// (code review U5 og U6, 23-10: dagene forsvandt i stilhed, og begge slags hed «kunne ikke hentes»)
export function manglerTekst(ikkeHentet, ikkeIPlanen) {
  const dage = (n) => (n === 1 ? 'Én dag mangler' : n + ' dage mangler');
  return [
    ikkeHentet > 0 ? dage(ikkeHentet) + ' på listen, fordi ' + (ikkeHentet === 1 ? 'opskriften' : 'opskrifterne') + ' ikke kunne hentes.' : '',
    ikkeIPlanen > 0 ? dage(ikkeIPlanen) + ' på listen, fordi ' + (ikkeIPlanen === 1 ? 'retten' : 'retterne') + ' ikke længere er i ugeplanen.' : '',
  ].filter(Boolean).join(' ');
}

// Tekstudgaven til «Del som tekst» (vej b): afdelingens navn som overskrift og én vare pr. linje, så Noter kan gøre
// linjerne til en tjekliste. «Tjek, at I har» står sidst. Bløde bindestreger (U+00AD i VARER) er kun til skærmen
export function tekst(varer) {
  return grupper(varer)
    .map((g) => [g.navn, ...g.varer.map((v) => (v.maengde ? v.navn + ': ' + v.maengde : v.navn))].join('\n'))
    .join('\n\n')
    .replace(/\u00ad/g, '');
}
