// maerker.js — mærkerne på en ret (docs/foraeldredel.md, afsnit 5): hurtig, masser af grønt, billig, ingen kniv, vegetar,
// fisk og familiens egne (ny for os, favorit). Ren logik: ingen DOM og intet lager. Voksendelen viser dem som filterchips,
// og børnenes kort får kun ikonet med «navn» som aria-label.
// Grønt, pris, vegetar og fisk kræver rettens tal og varer fra ugeplanen (model.uge), så en ret uden for ugeplanen kan
// kun få hurtig, ingen kniv, ny og favorit.
import { VARER, VOKSEN_KRAV } from './katalog.js';
import { erLynhurtig } from './model.js';

// Masser af grønt: mindst så mange gram grønt pr. portion. Billig: højst så mange kroner pr. portion
export const GROENT_G = 250;
export const BILLIG_KR = 12;

// I den rækkefølge, maerkerFor giver dem. «navn» vises til voksne og er aria-label på børnenes kort
export const MAERKER = {
  hurtig: { ikon: '⚡', navn: 'Hurtig' },
  groent: { ikon: '🥕', navn: 'Masser af grønt' },
  billig: { ikon: '💰', navn: 'Billig' },
  ingenKniv: { ikon: '🔪', navn: 'Ingen kniv' },
  vegetar: { ikon: '🌱', navn: 'Vegetar' },
  fisk: { ikon: '🐟', navn: 'Fisk' },
  ny: { ikon: '✨', navn: 'Ny for os' },
  favorit: { ikon: '⭐', navn: 'Favorit' },
};

// Kniven er verberne skaere og rive. Et voksen-trin med «kniv» og et andet verbum er dåseåbneren («Hæld majsen i en si.»)
const KNIV_VERBER = Object.keys(VOKSEN_KRAV).filter((v) => VOKSEN_KRAV[v] === 'kniv');
// Object.hasOwn: «constructor» og «toString» er ikke varer eller retter
const har = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const erObjekt = (o) => Boolean(o) && typeof o === 'object' && !Array.isArray(o);

// Portionerne fra ugeplanen (et heltal over 0), ellers 0
const portionerAf = (uge) => (Number.isInteger(uge.portioner) && uge.portioner > 0 ? uge.portioner : 0);
// Der ganges med portionerne i stedet for at dele, så grænsen selv (1000 g eller 48 kr til 4) rammes præcist
const harGroent = (uge, p) => p > 0 && Number.isFinite(uge.groentG) && uge.groentG >= GROENT_G * p;
const erBillig = (uge, p) => p > 0 && Number.isFinite(uge.prisKr) && uge.prisKr > 0 && uge.prisKr <= BILLIG_KR * p;

// Hver ingredienslinjes slags: 'koed', 'fisk', '' (hverken kød eller fisk) eller null (ingen kendt vare)
function slagsPaaLinjer(uge) {
  const linjer = erObjekt(uge.tumbi) && Array.isArray(uge.tumbi.ingredienser) ? uge.tumbi.ingredienser : [];
  return linjer.map((l) => (l && har(VARER, l.vare) ? VARER[l.vare].slags || '' : null));
}

const udenKniv = (m) => Array.isArray(m.trin) && !m.trin.some((t) => t && KNIV_VERBER.includes(t.verbum));

// model: en ret fra lavModel. familie: fra hentFamilie i js/lager.js; uden den (eller med null) kommer ny og favorit
// ikke med. Svar: nøgler fra MAERKER i MAERKERs rækkefølge
export function maerkerFor(model, { familie } = {}) {
  if (!erObjekt(model)) throw new TypeError('maerkerFor: model skal være en ret fra lavModel');
  if (familie != null && !erObjekt(familie)) throw new TypeError('maerkerFor: familie skal være et objekt fra hentFamilie');
  const uge = erObjekt(model.uge) ? model.uge : null;
  const p = uge ? portionerAf(uge) : 0;
  const slags = uge ? slagsPaaLinjer(uge) : [];
  const lavet = familie && erObjekt(familie.lavet) ? familie.lavet : {};
  const favoritter = familie && Array.isArray(familie.favoritter) ? familie.favoritter : [];
  const gaelder = {
    hurtig: erLynhurtig(model),
    groent: uge !== null && harGroent(uge, p),
    billig: uge !== null && erBillig(uge, p),
    ingenKniv: udenKniv(model),
    // Vegetar kun, når hver linje har en kendt vare: en ukendt linje kunne være kød
    vegetar: slags.length > 0 && slags.every((s) => s === ''),
    fisk: slags.includes('fisk'),
    // Ny for os først, når familien er begyndt at registrere: før den første ret er lavet, er alle retter «nye»
    ny: familie != null && Object.keys(lavet).length > 0 && !har(lavet, model.id),
    favorit: familie != null && favoritter.includes(model.id),
  };
  return Object.keys(MAERKER).filter((k) => gaelder[k]);
}
