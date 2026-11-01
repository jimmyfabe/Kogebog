// voksen-del.js — voksendelen (docs/foraeldredel.md, afsnit 2-5): den voksnes hjørne bag et hold på 2 s.
//   #/voksen             husstand, ugens udvalg og favoritter, vejen til ugeplanen og indkøbslisten, og «Luk»
//   #/voksen/husstand    antal voksne og børn → portioner til nye retter i ugeplanen (eller til hele ugen)
//   #/voksen/udvalg      ugens udvalg: de retter, børnene vælger imellem i ugeplanen (højst 24; intet udvalg = alle)
//   #/voksen/favoritter  hjerterne
// Låsen er en børnelås, ikke sikkerhed. Den ligger kun i hukommelsen (en modulvariabel, ingen sessionStorage) og lukker,
// når man forlader #/voksen…, efter 10 minutter uden tryk og med «Luk». Åbnes en adresse herinde uden låsen (et
// bogmærke), kommer holdet først. Kun ANTAL voksne og børn gemmes, aldrig hvem (regel 6). Lageret røres kun gennem
// js/lager.js, og al tekst sættes som tekst (js/dom.js). Udseendet står i familie.css.
import { el, ikon, svgEl } from './dom.js';
import * as Lager from './lager.js';
import { MAKS_PERSONER, MAKS_UDVALG as UDVALG_MAKS } from './lager.js';
import { holdKnap } from './hold.js';
import { portionerFraHusstand } from './skaler.js';
import { MAERKER, maerkerFor } from './maerker.js';
import { kod, afkod } from './plankode.js';
import { grafikRet } from './katalog.js';
import { planMandag, idag } from './tid.js';

export const LUK_MS = 10 * 60 * 1000;   // voksendelen lukker efter 10 minutter uden tryk
export { MAKS_PERSONER, UDVALG_MAKS };   // voksne og børn hver, og retter i udvalget: grænserne fra js/lager.js
export const BARN_VALG = [0.5, 0.7, 1];  // et barn spiser som … voksen (standarden BARN_ANDEL står i js/lager.js)
export const UDVALG_STANDARD = 8;        // «Fyld op med nye» uden et udvalg: 8 retter (to sider i børnenes valg)
export const FYLD_OP = 4;                // «Fyld op med nye» med et udvalg: 4 retter mere
const SIDER = ['husstand', 'udvalg', 'favoritter'];
const LAGER_FEJL = 'Måske er privat browsing slået til, eller lageret er fuldt.';

// app.js: { S, knap, klik, billede, topbar, statusSkaerm, naviger, annoncer, indlaes, vis, visSkaerm }.
// vis() kalder rute(location.hash) først og stopper, når den svarer true. visSkaerm(skaerm) viser en færdig skærm, som
// vis() selv gør det (vistHash, tastatur, spærretid, rul op og fokus på h1 ved en ny adresse)
let K = null;
export function init(k) {
  K = k;
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, tryk, true);
}

// ---------- Ren logik (test/test-voksen-del.js) ----------

// Siden i voksendelen, som adressen peger på ('hub', 'husstand', 'udvalg' eller 'favoritter'), eller null, når adressen
// ikke er voksendelens. En ukendt side herinde er oversigten
export function voksenSide(hash) {
  const raa = String(hash).replace(/^#\/?/, '');
  if (raa !== 'voksen' && !raa.startsWith('voksen/')) return null;
  const side = raa.slice('voksen/'.length);
  return SIDER.includes(side) ? side : 'hub';
}

// «Fyld op med nye»: op til «antal» af kandidaterne (i deres rækkefølge), som ikke er i udvalget og aldrig er lavet
// («lavet» fra familien), og aldrig flere end «maks» i alt. Svar: de nye id'er (de gamle først)
export function fyldOp(ids, kandidater, lavet, { antal = FYLD_OP, maks = UDVALG_MAKS } = {}) {
  const ud = [...ids];
  for (const id of kandidater) {
    if (ud.length >= maks || ud.length - ids.length >= antal) break;
    if (!ud.includes(id) && !Object.hasOwn(lavet, id)) ud.push(id);
  }
  return ud;
}

// Retten id ind i eller ud af udvalget. Svar: de nye id'er, eller null, når udvalget er fuldt
export function skiftIUdvalg(ids, id, maks = UDVALG_MAKS) {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length < maks ? [...ids, id] : null;
}

// Retterne, der har alle de valgte mærker. maerkerAf(m): rettens mærker (maerkerFor i js/maerker.js)
export function medMaerker(retter, valgte, maerkerAf) {
  return retter.filter((m) => valgte.every((k) => maerkerAf(m).includes(k)));
}

// Hårdt mellemrum mellem tallet og ordet, så «2 voksne» ikke deles over to linjer
const flertal = (n, en, flere) => n + ' ' + (n === 1 ? en : flere);
const portionerTekst = (n) => flertal(n, 'portion', 'portioner');
const andelTekst = (x) => String(x).replace('.', ',');

// «2 voksne og 1 barn». Et antal på 0 eller null står ikke med; begge tomme giver ''
export function husstandTekst(voksne, boern) {
  return [voksne ? flertal(voksne, 'voksen', 'voksne') : '', boern ? flertal(boern, 'barn', 'børn') : ''].filter(Boolean).join(' og ');
}

// ---------- Låsen ----------

let aaben = false;
let sidstTryk = 0; // Date.now() og ikke performance.now(): uret skal gå, også mens iPad'en sover
let lukTid = 0;

const udloebet = () => Date.now() - sidstTryk >= LUK_MS;

export function erLaastOp() {
  return aaben && !udloebet();
}

function laasOp() {
  aaben = true;
  sidstTryk = Date.now();
  clearTimeout(lukTid);
  lukTid = setTimeout(vagt, LUK_MS);
}

function laas() {
  aaben = false;
  clearTimeout(lukTid);
}

// Er tiden gået, lukker voksendelen, og står den fremme, bliver skærmen til holdet
function lukOgVis() {
  laas();
  if (voksenSide(location.hash)) K.vis();
}

// Timeren: er der trykket imens, venter den resten af tiden
function vagt() {
  if (!aaben) return;
  if (udloebet()) lukOgVis();
  else lukTid = setTimeout(vagt, sidstTryk + LUK_MS - Date.now());
}

// Hvert tryk og hver tast holder voksendelen åben. Er tiden gået, før timeren nåede at komme (iPad'en sov), lukker
// trykket den i stedet for at forlænge den
function tryk() {
  if (!aaben) return;
  if (udloebet()) lukOgVis();
  else sidstTryk = Date.now();
}

// Forsidens hold: lås op, og gå til oversigten
export function aabn() {
  laasOp();
  K.naviger('#/voksen');
}

function luk() {
  laas();
  K.naviger('#/');
}

// ---------- Ruten og skærmene ----------

let sidsteSide = null;
let besked = null;  // { tekst, fejl?, ret? } under knapperne (ret: i rækken med den ret)
let kladde = null;  // husstanden, til den gemmes: { voksne, boern, barnAndel } (kun i hukommelsen)
const filtre = new Set(); // udvalgets filterchips (nøgler fra MAERKER): huskes, til siden lukkes

// Viser voksendelens skærm og svarer true, når adressen er voksendelens. Ellers lukker låsen, og svaret er false
export function rute(hash) {
  const side = voksenSide(hash);
  if (!side) {
    laas();
    sidsteSide = null;
    return false;
  }
  K.visSkaerm(skaerm(side));
  return true;
}

function skaerm(side) {
  // Beskeden og husstandens kladde hører til den side, de kom på
  if (side !== sidsteSide) { besked = null; kladde = null; }
  sidsteSide = side;
  if (!erLaastOp()) return vagtSkaerm();
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return K.statusSkaerm({ titel: 'Henter opskrifterne …', laeser: true });
  const f = Lager.hentFamilie(K.S.ids);
  if (f.laast) return laastSkaerm();
  if (side === 'husstand') return husstandSkaerm(f);
  if (side === 'udvalg') return udvalgSkaerm(f);
  if (side === 'favoritter') return favoritSkaerm(f);
  return hubSkaerm(f);
}

// ---------- Fælles ----------

// Opskrifterne er hentet (også dem, der fejlede)
const klar = () => Boolean(K.S.ids) && K.S.ids.every((id) => K.S.retter.has(id));
const model = (id) => {
  const m = K.S.retter.get(id);
  return m && !(m instanceof Error) ? m : null;
};
const alleRetter = () => K.S.ids.map(model).filter(Boolean);
const iPlanen = () => alleRetter().filter((m) => m.uge);
const fejlede = () => K.S.ids.filter((id) => K.S.retter.get(id) instanceof Error).length;

function medFokus(b, noegle) {
  b.dataset.fokus = noegle;
  return b;
}

// Tegner skærmen igen uden at skifte adresse, og giver fokus tilbage til knappen med data-fokus
function tegnIgen(fokus) {
  K.vis();
  if (fokus) document.querySelector('[data-fokus="' + fokus + '"]')?.focus({ preventScroll: true });
}

const gemFejl = (hvad, ret) => ({ fejl: true, ret, tekst: hvad + ' kunne ikke gemmes på denne enhed. ' + LAGER_FEJL });

function beskedEl(b) {
  return el('div', { class: 'uge-besked' + (b.fejl ? ' fejl' : ''), role: b.fejl ? 'alert' : 'status' }, el('p', { tekst: b.tekst }));
}

// Ikoner, som js/dom.js ikke har, i samme form (24 × 24, streg i tekstens farve gennem .ikon i app.css)
const PERSONER = ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3.5 19.5a5.5 5.5 0 0 1 11 0', 'M16 11a2.5 2.5 0 1 0 0-5', 'M16.5 14.2c2.3.4 4 2.6 4 5.3'];
const HJERTE = ['M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'];
function stregIkon(stier) {
  const s = svgEl('svg', { viewBox: '0 0 24 24', class: 'ikon', 'aria-hidden': 'true', focusable: 'false' });
  for (const d of stier) s.append(svgEl('path', { d }));
  return s;
}
// Hjertet til .hjerte-knap i familie.css (også færdig-skærmen kan bruge det): tomt, og rødt med aria-pressed="true"
export const hjerteIkon = () => stregIkon(HJERTE);

function voksenSkaerm(klasse, titel, undertitel, ...indhold) {
  return el('main', { class: 'skaerm voksen-del ' + klasse },
    K.topbar(),
    el('div', { class: 'voksen-indhold' },
      el('header', { class: 'voksen-hoved' },
        el('h1', { tabindex: '-1', tekst: titel }),
        undertitel ? el('p', { class: 'voksen-undertitel', tekst: undertitel }) : null),
      indhold));
}

const tilbage = () => K.knap('Tilbage', { klasse: 'lille', ikonNavn: 'tilbage', label: 'Tilbage til voksendelen', onclick: () => K.naviger('#/voksen') });

const fejlLinje = () => {
  const n = fejlede();
  return n ? el('p', { class: 'fejl-linje', role: 'status', tekst: (n === 1 ? 'Én opskrift' : n + ' opskrifter') + ' kunne ikke hentes og står ikke her. Prøv at genindlæse siden.' }) : null;
};

// En ret i en liste: billedet, navnet, en linje under (mærkerne) og knappen. En besked til netop den ret står i rækken
function raekke(m, { valgt = false, under = null, knap }) {
  return el('li', { class: 'voksen-raekke' + (valgt ? ' valgt' : ''), 'data-ret': m.id },
    K.billede(grafikRet(m.id), '', 'voksen-raekke-billede'),
    el('div', { class: 'voksen-raekke-tekst' }, el('span', { class: 'voksen-raekke-navn', tekst: m.navn }), under),
    knap,
    besked && besked.ret === m.id ? beskedEl(besked) : null);
}

// ---------- Vagten og fejlene ----------

// Adressen er åbnet uden låsen (et bogmærke, eller tiden er gået): holdet først, som på forsiden
function vagtSkaerm() {
  return K.statusSkaerm({
    titel: 'Til de voksne',
    tekst: 'Hold knappen inde i 2 sekunder for at åbne.',
    handling: el('div', { class: 'status-knapper' },
      holdKnap({
        klasse: 'voksen-hold voksen-vagt',
        label: 'Åbn voksendelen. Hold knappen inde i 2 sekunder.',
        indhold: [el('span', { tekst: 'Voksne: hold' })],
        naarFaerdig: () => {
          laasOp();
          K.vis();
          document.querySelector('main h1')?.focus({ preventScroll: true });
        },
      }),
      K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })),
  });
}

function hentFejl() {
  return K.statusSkaerm({
    titel: 'Opskrifterne kunne ikke hentes',
    tekst: 'Tjek internetforbindelsen, og prøv igen.',
    handling: el('div', { class: 'status-knapper' },
      K.knap('Prøv igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => K.indlaes() }),
      K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })),
  });
}

function laastSkaerm() {
  return K.statusSkaerm({
    titel: 'Voksendelen er gemt med en nyere udgave',
    tekst: 'Denne enhed har en ældre udgave af Tumbi Køkken, som ikke må ændre husstand, udvalg og favoritter. Genindlæs siden, så hentes den nye udgave.',
    handling: K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') }),
  });
}

// ---------- #/voksen: oversigten ----------

// Indkøbslisten til ugens plan, som ugeplanens «Indkøbsliste» laver den (#/hent/<kode>). Uden en plan, eller når linket
// ikke kan læses (ugen er mere end 8 uger væk), den gemte liste
function listeHash() {
  const p = Lager.hentUge(K.S.ids);
  if (p.laast || !p.dage.some(Boolean)) return '#/indkoeb';
  const kode = kod(p.uge || planMandag(), p.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null)));
  return afkod(kode, { retter: K.S.ids, idag: new Date() }).ok ? '#/hent/' + kode : '#/indkoeb';
}

function punkt({ navn, status, ikonEl, til, fokus }) {
  return el('li', {}, medFokus(el('button', {
    type: 'button',
    class: 'knap voksen-punkt',
    onclick: K.klik(() => K.naviger(typeof til === 'function' ? til() : til)),
  }, ikonEl, el('span', { class: 'voksen-punkt-tekst' },
    el('span', { class: 'voksen-punkt-navn', tekst: navn }),
    el('span', { class: 'voksen-punkt-status', tekst: status }))), fokus));
}

function hubSkaerm(f) {
  const p = Lager.hentUge(K.S.ids);
  const alle = iPlanen();
  const n = portionerFraHusstand(f.voksne, f.boern, f.barnAndel);
  const valgt = f.udvalg ? alle.filter((m) => f.udvalg.ids.includes(m.id)).length : 0;
  const punkter = [
    { navn: 'Husstand', ikonEl: stregIkon(PERSONER), til: '#/voksen/husstand', fokus: 'husstand',
      status: n ? husstandTekst(f.voksne, f.boern) + ' = ' + portionerTekst(n) : 'Ikke sat. Nye retter er til ' + portionerTekst(p.n) },
    { navn: 'Ugens udvalg', ikonEl: ikon('liste'), til: '#/voksen/udvalg', fokus: 'udvalg',
      status: f.udvalg ? flertal(valgt, 'ret', 'retter') + ' at vælge mellem' : 'Alle ' + alle.length + ' retter' },
    { navn: 'Favoritter', ikonEl: hjerteIkon(), til: '#/voksen/favoritter', fokus: 'favoritter',
      status: f.favoritter.length ? flertal(f.favoritter.length, 'ret', 'retter') : 'Ingen endnu' },
    { navn: 'Ugeplan', ikonEl: ikon('kalender'), til: '#/uge', fokus: 'ugeplan',
      status: p.laast ? 'Lavet med en nyere udgave' : p.dage.filter(Boolean).length + ' af 7 dage har en ret' },
    { navn: 'Indkøbsliste', ikonEl: ikon('kurv'), til: listeHash, fokus: 'indkoeb', status: 'Listen til butikken og telefonen' },
  ];
  return voksenSkaerm('voksen-hub', 'Voksne', 'Lukker efter ' + LUK_MS / 60000 + ' minutter uden tryk',
    el('nav', { 'aria-label': 'Voksendelen' }, el('ul', { class: 'voksen-menu' }, punkter.map(punkt))),
    el('div', { class: 'voksen-knapper voksen-bund' },
      medFokus(K.knap('Luk', { ikonNavn: 'kryds', label: 'Luk voksendelen', onclick: luk }), 'luk')));
}

// ---------- #/voksen/husstand ----------

// Portionerne til kladden, eller null, når der hverken er voksne eller børn (så kan den ikke gemmes)
const kladdePortioner = (k) => (k.voksne + k.boern > 0 ? portionerFraHusstand(k.voksne, k.boern, k.barnAndel) : null);
const kladdeTekst = (k) => {
  const n = kladdePortioner(k);
  return n ? husstandTekst(k.voksne, k.boern) + ' = ' + portionerTekst(n) : 'Vælg mindst én voksen eller ét barn.';
};

function stepper({ vaerdi, navn, tekst, fokus, saet }) {
  return el('div', { class: 'stepper', role: 'group', 'aria-label': navn },
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'minus', label: 'Færre ' + navn, onclick: () => saet(vaerdi - 1, fokus + '-minus') }), fokus + '-minus'),
    el('output', { class: 'stepper-tal', tekst }),
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'plus', label: 'Flere ' + navn, onclick: () => saet(vaerdi + 1, fokus + '-plus') }), fokus + '-plus'));
}

// Gemmer husstanden og portionerne i ugeplanen: som standard til nye dage (planlagte dage beholder deres antal), og med
// «Brug på hele ugen» også på de planlagte dage. Kunne familien gemmes, men ikke ugeplanen, siger beskeden det
function gemHusstand(helUge) {
  const fokus = helUge ? 'hele-ugen' : 'gem';
  const k = kladde;
  const n = k && kladdePortioner(k);
  if (!n) return;
  if (!Lager.gemFamilie({ voksne: k.voksne, boern: k.boern, barnAndel: k.barnAndel }, K.S.ids)) {
    besked = gemFejl('Husstanden');
    tegnIgen(fokus);
    return;
  }
  kladde = null;
  const p = Lager.hentUge(K.S.ids);
  const aendring = { n, rettet: Date.now() };
  if (helUge) aendring.dage = p.dage.map((d) => (d ? { ...d, n } : null));
  if (Lager.gemUge(aendring, K.S.ids)) {
    besked = { tekst: helUge ? 'Gemt. Hele ugen er nu til ' + portionerTekst(n) + '.' : 'Gemt. Nye retter i ugeplanen laves til ' + portionerTekst(n) + '.' };
    K.annoncer(besked.tekst);
  } else {
    besked = { fejl: true, tekst: 'Husstanden er gemt, men ugeplanen kunne ikke gemmes. ' + (p.laast
      ? 'Den er lavet med en nyere udgave af Tumbi Køkken. Genindlæs siden.' : LAGER_FEJL) };
  }
  tegnIgen(fokus);
}

function husstandSkaerm(f) {
  if (!kladde) kladde = { voksne: f.voksne ?? 0, boern: f.boern ?? 0, barnAndel: f.barnAndel };
  const k = kladde;
  const n = kladdePortioner(k);
  const p = Lager.hentUge(K.S.ids);
  const saet = (felt) => (vaerdi, fokus) => {
    if (vaerdi < 0 || vaerdi > MAKS_PERSONER) return;
    k[felt] = vaerdi;
    besked = null; // beskeden hørte til det, der blev gemt
    tegnIgen(fokus);
    K.annoncer(kladdeTekst(k));
  };
  const andele = BARN_VALG.map((x) => {
    const b = medFokus(K.knap(andelTekst(x), { klasse: 'lille valg', label: andelTekst(x) + ' voksen', onclick: () => {
      k.barnAndel = x;
      besked = null;
      tegnIgen('andel-' + x);
      K.annoncer(kladdeTekst(k));
    } }), 'andel-' + x);
    b.setAttribute('aria-pressed', String(k.barnAndel === x));
    return b;
  });
  const gem = medFokus(K.knap('Gem', { klasse: 'primaer', ikonNavn: 'tjek', onclick: () => gemHusstand(false) }), 'gem');
  const heleUgen = medFokus(K.knap('Brug på hele ugen', { ikonNavn: 'kalender', onclick: () => gemHusstand(true) }), 'hele-ugen');
  gem.disabled = heleUgen.disabled = !n;
  const forklaring = n
    ? '«Gem»: nye retter i ugeplanen laves til ' + portionerTekst(n) + ' (nu ' + portionerTekst(p.n) + '). Dage, der allerede har en ret, beholder deres antal. «Brug på hele ugen»: de dage får også ' + portionerTekst(n) + '.'
    : null;

  return voksenSkaerm('voksen-husstand', 'Husstand', null,
    el('p', { class: 'voksen-hjaelp', tekst: 'Kun antallet gemmes. Det bestemmer, hvor mange portioner ugeplanen og indkøbslisten regner med.' }),
    el('div', { class: 'voksen-knapper' }, tilbage()),
    el('div', { class: 'husstand' },
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', tekst: 'Voksne' }),
        stepper({ vaerdi: k.voksne, navn: 'voksne', tekst: flertal(k.voksne, 'voksen', 'voksne'), fokus: 'voksne', saet: saet('voksne') })),
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', tekst: 'Børn' }),
        stepper({ vaerdi: k.boern, navn: 'børn', tekst: flertal(k.boern, 'barn', 'børn'), fokus: 'boern', saet: saet('boern') })),
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', id: 'barn-andel', tekst: 'Et barn spiser som' }),
        el('div', { class: 'valg-par', role: 'group', 'aria-labelledby': 'barn-andel' }, andele,
          el('span', { class: 'husstand-enhed', 'aria-hidden': 'true', tekst: 'voksen' }))),
      el('p', { class: 'husstand-sum', tekst: n ? '= ' + portionerTekst(n) : 'Vælg mindst én voksen eller ét barn.' })),
    el('div', { class: 'voksen-knapper' }, gem, heleUgen),
    forklaring ? el('p', { class: 'voksen-hjaelp', tekst: forklaring }) : null,
    besked ? beskedEl(besked) : null);
}

// ---------- #/voksen/udvalg ----------

const valgtTekst = (n) => n + ' af ' + UDVALG_MAKS + ' valgt';

// Gemmer udvalget (ingen id'er = intet udvalg: børnene ser alle retter). ret: afkrydsningen i rækken med den ret. Den
// siges kun; et tryk på «Fyld op» eller «Alle retter» får også beskeden under knapperne
function gemUdvalg(ids, tekst, fokus, ret) {
  const f = Lager.gemFamilie({ udvalg: ids.length ? { ids, rettet: idag() } : null }, K.S.ids);
  besked = !f ? gemFejl('Udvalget', ret) : ret ? null : { tekst };
  tegnIgen(fokus);
  if (f) K.annoncer(tekst);
}

function filterChip(k, antal) {
  const b = medFokus(K.knap(MAERKER[k].navn + ' (' + antal + ')', { klasse: 'filter-chip', onclick: () => {
    if (filtre.has(k)) filtre.delete(k);
    else filtre.add(k);
    tegnIgen('filter-' + k);
  } }), 'filter-' + k);
  b.prepend(el('span', { 'aria-hidden': 'true', tekst: MAERKER[k].ikon }));
  b.setAttribute('aria-pressed', String(filtre.has(k)));
  return b;
}

function maerkeLinje(noegler) {
  if (!noegler.length) return null;
  return el('span', { class: 'voksen-raekke-maerker' }, noegler.map((k) => el('span', { class: 'voksen-maerke' },
    el('span', { 'aria-hidden': 'true', tekst: MAERKER[k].ikon + ' ' }), MAERKER[k].navn)));
}

function udvalgSkaerm(f) {
  const alle = iPlanen();
  const maerker = new Map(alle.map((m) => [m.id, maerkerFor(m, { familie: f })]));
  const maerkerAf = (m) => maerker.get(m.id);
  const vist = medMaerker(alle, [...filtre], maerkerAf);
  const ids = f.udvalg ? f.udvalg.ids : [];
  const fuldt = ids.length >= UDVALG_MAKS;

  const skift = (m) => {
    const ny = skiftIUdvalg(ids, m.id);
    if (!ny) {
      besked = { fejl: true, ret: m.id, tekst: 'Udvalget er fuldt: højst ' + UDVALG_MAKS + ' retter. Fjern en ret først.' };
      tegnIgen('ret-' + m.id);
      return;
    }
    gemUdvalg(ny, (ny.length > ids.length ? 'Med i udvalget: ' : 'Ikke med: ') + m.navn + '. ' + valgtTekst(ny.length) + '.', 'ret-' + m.id, m.id);
  };

  // Kun blandt de viste retter, så filtrene også gælder her (fx kun nye vegetarretter)
  const fyld = () => {
    const ny = fyldOp(ids, vist.map((m) => m.id), f.lavet, { antal: f.udvalg ? FYLD_OP : UDVALG_STANDARD });
    const flere = ny.length - ids.length;
    if (!flere) {
      besked = { tekst: fuldt
        ? 'Udvalget er fuldt: højst ' + UDVALG_MAKS + ' retter.'
        : 'Der er ingen nye retter at fylde op med' + (filtre.size ? ' blandt de viste' : '') + ': de er lavet før eller allerede valgt.' };
      tegnIgen('fyld-op');
      return;
    }
    gemUdvalg(ny, flertal(flere, 'ny ret', 'nye retter') + ' er med i udvalget. ' + valgtTekst(ny.length) + '.', 'fyld-op');
  };

  const alleKnap = f.udvalg ? medFokus(holdKnap({
    klasse: 'lille voksen-hold',
    label: 'Alle retter: fjerner udvalget, så børnene kan vælge alle retter. Hold knappen inde i 2 sekunder.',
    indhold: [ikon('igen'), el('span', { tekst: 'Alle retter: hold' })],
    naarFaerdig: () => gemUdvalg([], 'Intet udvalg: børnene kan vælge alle ' + alle.length + ' retter.', 'fyld-op'),
  }), 'alle-retter') : null;

  const chips = el('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Filtre' },
    Object.keys(MAERKER).map((k) => filterChip(k, alle.filter((m) => maerkerAf(m).includes(k)).length)));

  let liste;
  if (!alle.length) {
    liste = el('p', { class: 'voksen-tom', tekst: 'Der er ingen retter i ugeplanen endnu.' });
  } else if (!vist.length) {
    liste = el('div', { class: 'voksen-tom' },
      el('p', { tekst: 'Ingen retter har alle de valgte mærker.' }),
      medFokus(K.knap('Fjern filtrene', { klasse: 'lille', onclick: () => { filtre.clear(); tegnIgen('fyld-op'); } }), 'fjern-filtre'));
  } else {
    liste = el('ul', { class: 'voksen-liste', 'aria-label': 'Retter i ugeplanen' }, vist.map((m) => {
      const valgt = ids.includes(m.id);
      const b = medFokus(K.knap('Med', { klasse: 'lille valg', ikonNavn: valgt ? 'tjek' : 'plus', label: 'Med i udvalget: ' + m.navn, onclick: () => skift(m) }), 'ret-' + m.id);
      b.setAttribute('aria-pressed', String(valgt));
      if (!valgt && fuldt) b.setAttribute('aria-disabled', 'true');
      return raekke(m, { valgt, under: maerkeLinje(maerkerAf(m)), knap: b });
    }));
  }

  return voksenSkaerm('voksen-udvalg', 'Ugens udvalg', null,
    el('p', { class: 'voksen-hjaelp', tekst: 'Når børnene vælger ugens mad, ser de kun retterne i udvalget. Uden et udvalg ser de alle ' + alle.length + ' retter.' }),
    el('div', { class: 'voksen-knapper' },
      tilbage(),
      medFokus(K.knap('Fyld op med nye', { klasse: 'lille', ikonNavn: 'plus', onclick: fyld }), 'fyld-op'),
      alleKnap),
    besked && !besked.ret ? beskedEl(besked) : null,
    chips,
    el('p', { class: 'udvalg-tal', tekst: f.udvalg ? valgtTekst(ids.length) : 'Intet udvalg: børnene ser alle retter' }),
    liste,
    fejlLinje());
}

// ---------- #/voksen/favoritter ----------

function favoritSkaerm(f) {
  const skift = (m) => {
    const ny = Lager.skiftFavorit(m.id, K.S.ids);
    besked = ny ? null : gemFejl('Favoritten', m.id);
    tegnIgen('fav-' + m.id);
    if (ny) K.annoncer((ny.favoritter.includes(m.id) ? 'Favorit: ' : 'Ikke favorit: ') + m.navn + '.');
  };
  const liste = el('ul', { class: 'voksen-liste', 'aria-label': 'Retter' }, alleRetter().map((m) => {
    const valgt = f.favoritter.includes(m.id);
    const b = medFokus(K.knap('', { klasse: 'rund hjerte-knap', label: 'Favorit: ' + m.navn, onclick: () => skift(m) }), 'fav-' + m.id);
    b.append(hjerteIkon());
    b.setAttribute('aria-pressed', String(valgt));
    return raekke(m, { valgt, knap: b });
  }));
  return voksenSkaerm('voksen-favoritter', 'Favoritter',
    f.favoritter.length ? flertal(f.favoritter.length, 'favorit', 'favoritter') : 'Ingen endnu',
    el('p', { class: 'voksen-hjaelp', tekst: 'Tryk på hjertet ved de retter, familien er glad for. Favoritterne får en ⭐, når børnene vælger ugens mad.' }),
    el('div', { class: 'voksen-knapper' }, tilbage()),
    liste,
    fejlLinje());
}
