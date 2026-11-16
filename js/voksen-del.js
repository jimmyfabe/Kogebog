// voksen-del.js — voksendelen (docs/foraeldredel.md, afsnit 2-5, og docs/voksen-forside-plan-16-11-2026.md): den voksnes
// hjørne bag et hold på 2 s.
//   #/voksen             forsiden er ugeplanen: tre bobler øverst (Indkøbsliste med antal varer, Retter, Mere), ugens
//                        syv dage (ugeIndhold i js/ugeplan.js) og nederst «Luk»
//   #/voksen/dag/<1-7>   vælg en ret til dagen: kataloget i vælg-tilstand, kun retter fra ugeplanen. Andet end 1-7 giver
//                        en fast fejltekst. #/uge og #/uge/dag/<n> sendes hertil med history.replaceState (nyAdresse)
//   #/voksen/mere        ugens handlinger (Send til telefon, Del som tekst, Print, Ny uge, portioner, retter pr. barn,
//                        børnene vælger: ugeHandlinger i js/ugeplan.js) og familien: husstand, ugens udvalg, favoritter
//                        og kontakten «Mere grønt i maden» (js/groent.js)
//   #/voksen/husstand    antal voksne og børn → portioner til nye retter i ugeplanen (eller til hele ugen)
//   #/voksen/udvalg      ugens udvalg: de retter, børnene vælger imellem i ugeplanen (højst 24; intet udvalg =
//                        favoritterne og nye retter, højst 12: retterTilBoern i js/ugeplan.js)
//   #/voksen/favoritter  hjerterne
//   #/voksen/katalog     «Retter»: alle retter med søgning, grupper og mærker: hjertet, «Med» i udvalget, «Åbn» og
//                        «Print» pr. ret, og «Print hele kogebogen» eller de viste retter (print.html?alle / ?retter=)
// Udvalget, favoritterne og kataloget har samme søgefelt (js/soeg.js). Det tegnes aldrig om, mens der skrives: kun listen
// og tallet under det (et nyt input-element lukker tastaturet i Safari på iPad og iPhone).
// Låsen er en børnelås, ikke sikkerhed. Den ligger kun i hukommelsen (en modulvariabel, ingen sessionStorage) og dækker
// #/voksen… (også vælg-tilstanden og «Mere») og ugeplanens gamle adresser (#/uge og #/uge/dag/<n>, laasFor). Den lukker
// på børnenes adresser (også #/uge/vaelg…), efter 10 minutter uden tryk og med «Luk». Indkøbslisten (#/indkoeb,
// #/hent/…) kræver den ikke, men lukker den. Åbnes en adresse bag låsen uden låsen (et bogmærke, eller tilbage fra
// printet), kommer holdet først. Kun ANTAL voksne og børn gemmes, aldrig hvem (regel 6). Lageret røres kun gennem
// js/lager.js, og al tekst sættes som tekst (js/dom.js). Udseendet står i familie.css.
import { el, ikon, svgEl, printLink as printLinkDom } from './dom.js';
import * as Lager from './lager.js';
import { MAKS_PERSONER, MAKS_PORTIONER, MAKS_UDVALG as UDVALG_MAKS } from './lager.js';
import { holdKnap } from './hold.js';
import { portionerFraHusstand } from './skaler.js';
import { MAERKER, maerkerFor } from './maerker.js';
import { kod, afkod } from './plankode.js';
import { grafikRet, grafikGruppe, GRUPPER, AFTENSMAD, AFTENSMAD_NAVN, AFTENSMAD_GRUPPER, gruppeSoegeord } from './katalog.js';
import { planMandag, idag, ugeNr, dagDato, DAGE } from './tid.js';
import { soeg, soegeord } from './soeg.js';
import { valgt } from './groent.js';
import { blandet } from './grupper.js';
import { rute as ugeRute, retterTilBoern, BOERN_KORT, glemVisning, ugeIndhold, ugeHandlinger, antalVarer, saetDag, metaLinje, sorterValg,
  laastPlanSkaerm } from './ugeplan.js';

export const LUK_MS = 10 * 60 * 1000;   // voksendelen lukker efter 10 minutter uden tryk
export { MAKS_PERSONER, UDVALG_MAKS };   // voksne og børn hver, og retter i udvalget: grænserne fra js/lager.js
export const BARN_VALG = [0.5, 0.7, 1];  // et barn spiser som … voksen (standarden BARN_ANDEL står i js/lager.js)
export const UDVALG_STANDARD = 8;        // «Fyld op med nye» uden et udvalg: 8 retter (to sider i børnenes valg)
export const FYLD_OP = 4;                // «Fyld op med nye» med et udvalg: 4 retter mere
const SIDER = ['husstand', 'udvalg', 'favoritter', 'katalog', 'mere'];
export const SOEG_MAKS = 60;             // tegn i søgefeltet
const SOEG_EKSEMPEL = 'fx kylling eller jul';
const LAGER_FEJL = 'Måske er privat browsing slået til, eller lageret er fuldt.';
const NYERE = 'Lavet med en nyere udgave';

// app.js: { S, knap, klik, billede, lynMaerke, lynTekst, topbar, statusSkaerm, naviger, annoncer, indlaes, vis, visSkaerm,
// huskFra }.
// vis() kalder rute(location.hash) først og stopper, når den svarer true. visSkaerm(skaerm) viser en færdig skærm, som
// vis() selv gør det (vistHash, tastatur, spærretid, rul op og fokus på h1 ved en ny adresse)
let K = null;
export function init(k) {
  K = k;
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, tryk, true);
}

// ---------- Ren logik (test/test-voksen-del.js) ----------

// Siden i voksendelen, som adressen peger på ('hub' = forsiden med ugeplanen, 'dag', 'mere', 'husstand', 'udvalg',
// 'favoritter' eller 'katalog'), eller null, når adressen ikke er voksendelens. En ukendt side herinde er forsiden. 'dag'
// er alt under #/voksen/dag: om dagen findes, siger voksenDag
export function voksenSide(hash) {
  const raa = String(hash).replace(/^#\/?/, '');
  if (raa !== 'voksen' && !raa.startsWith('voksen/')) return null;
  const side = raa.slice('voksen/'.length);
  if (side === 'dag' || side.startsWith('dag/')) return 'dag';
  return SIDER.includes(side) ? side : 'hub';
}

// Dagen i vælg-tilstanden: #/voksen/dag/1 (mandag) til #/voksen/dag/7 (søndag) giver 0-6. Alt andet (0, 8, 01, 3x, en
// tom dag) giver null, og skærmen viser en fast tekst: intet fra adressen kommer i DOM'en
export function voksenDag(hash) {
  const m = /^voksen\/dag\/([1-7])$/.exec(String(hash).replace(/^#\/?/, ''));
  return m ? Number(m[1]) - 1 : null;
}

// Ugeplanens gamle adresser til den voksne, som links på telefoner og bogmærker kan have: #/uge (og en ukendt #/uge/…)
// er nu forsiden, og #/uge/dag/<n> vælg-tilstanden. Dagen læses af ugeplanens egen rute(), der kun kender 1-7.
// Svar: den nye adresse, eller null, når adressen ikke er en af dem (også #/uge/vaelg…, børnenes valg)
export function nyAdresse(hash) {
  const u = ugeRute(String(hash));
  if (!u) return null;
  if (u.side === 'oversigt') return '#/voksen';
  if (u.side === 'dag') return '#/voksen/dag/' + (u.i + 1);
  return null;
}

// Hvad adressen gør ved låsen. 'bag': voksendelen (også vælg-tilstanden og «Mere») og ugeplanens gamle adresser til den
// voksne (#/uge og #/uge/dag/<n>, som rute sender videre), der kræver holdet. 'fri': indkøbslisten og linket til den
// (#/indkoeb, #/hent/…), som telefonen også åbner, og som ikke kræver låsen. 'luk': resten, også børnenes valg
// (#/uge/vaelg…), så iPad'en kan gives videre. Både 'fri' og 'luk' lukker låsen (rute): en åben lås gav et barn vejen
// ind med browserens «tilbage» (review L2, 15-11). Undtagelsen er listen, åbnet med boblen på voksendelens forside
// (fraVoksne, review U2, 16-11): den har «Til ugeplanen», og låsen bliver åben. De to navne står for at vise, hvilke
// adresser telefonen må åbne uden hold (review R4, 15-11).
// Ugeplanens adresser læses af dens egen rute(), så låsen og skærmen aldrig er uenige om, hvad adressen er
export function laasFor(hash) {
  if (voksenSide(hash)) return 'bag';
  const u = ugeRute(String(hash));
  if (!u) return 'luk';
  if (u.side === 'oversigt' || u.side === 'dag') return 'bag';
  return u.side === 'vaelg' ? 'luk' : 'fri';
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

// Husstandens portioner (portionerFraHusstand), og om loftet på MAKS_PORTIONER har skåret dem ned. 1e-6: kommatal som
// 0,8 × 5 må ikke ramme loftet
export function husstandSum(voksne, boern, barnAndel) {
  const n = portionerFraHusstand(voksne, boern, barnAndel);
  return { n, loft: n !== null && (voksne || 0) + barnAndel * (boern || 0) > MAKS_PORTIONER + 1e-6 };
}
// «12 portioner (højst 12 — lav retten to gange til flere)»
const sumTekst = ({ n, loft }) => portionerTekst(n) + (loft ? ' (højst ' + MAKS_PORTIONER + ' — lav retten to gange til flere)' : '');

// En ret, som søgningen og filtrene ser den: modellen, gruppen (id fra index.json og navnet fra GRUPPER) og mærkerne
// (nøglerne fra maerkerFor og deres navne). soeg() i js/soeg.js søger i navn, ingredienser, gruppe, gruppens gamle navn
// (gruppeOrd, fx «Aftensmad») og maerker. Posten findes kun i hukommelsen
export function soegePost(m, gruppeId, noegler) {
  return {
    m, gruppeId, noegler,
    navn: m.navn,
    ingredienser: m.ingredienser,
    gruppe: typeof gruppeId === 'string' && Object.hasOwn(GRUPPER, gruppeId) ? GRUPPER[gruppeId] : null,
    gruppeOrd: gruppeSoegeord(gruppeId),
    maerker: noegler.map((k) => MAERKER[k].navn),
  };
}

// Står posten i gruppen? Chippen «Aftensmad» (AFTENSMAD) er de seks grupper, Aftensmad blev delt i
const iGruppe = (p, gruppe) => p.gruppeId === gruppe || (gruppe === AFTENSMAD && AFTENSMAD_GRUPPER.includes(p.gruppeId));

// Listen efter filtrene: gruppen (null = alle), alle de valgte mærker og søgeteksten, i postenes rækkefølge
export function filtrer(poster, { gruppe = null, maerker = [], tekst = '' } = {}) {
  return soeg(medMaerker(poster.filter((p) => !gruppe || iGruppe(p, gruppe)), maerker, (p) => p.noegler), tekst);
}

// Linjen over listen: «Viser alle 125 retter» eller «Viser 12 af 125 retter» (hårdt mellemrum før «retter», som flertal)
export function visTekst(n, iAlt) {
  const retter = flertal(iAlt, 'ret', 'retter');
  if (n === iAlt) return iAlt === 1 ? 'Viser ' + retter : 'Viser alle ' + retter;
  return 'Viser ' + n + ' af ' + retter;
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
  listeFraVoksen = false;
  clearTimeout(lukTid);
  glemSoegning();
}

// Indkøbslisten, åbnet med boblen på voksendelens forside, hører til den voksnes vej: låsen bliver åben på listen
// (#/hent/… og #/indkoeb), og listen får «Til ugeplanen» i stedet for huset til børnenes forside (review U2, 16-11).
// Glemt, så snart man går et andet sted hen, og når låsen lukker. Åbnes listen på anden vis (telefonens link, browserens
// «tilbage»), lukker den låsen som før (review L2)
let listeFraVoksen = false;
export const fraVoksne = () => listeFraVoksen && erLaastOp();

// Er tiden gået, lukker voksendelen, og står den (eller ugeplanen) fremme, bliver skærmen til holdet
function lukOgVis() {
  laas();
  if (laasFor(location.hash) === 'bag') K.vis();
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

// Et hold (forsidens «Voksne», børnenes «Ugeplan»): lås op, og gå til forsiden eller til hash, når den ligger bag låsen
// (en gammel adresse som dens nye)
export function aabn(hash = '#/voksen') {
  laasOp();
  K.naviger(laasFor(hash) === 'bag' ? nyAdresse(hash) || hash : '#/voksen');
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
// Søgefeltets tekst pr. side ('udvalg', 'favoritter', 'katalog') og katalogets valg (gruppen, null = alle, og mærkerne).
// Kun i hukommelsen, og glemt, når voksendelen låses
const soegning = new Map();
const katalogValg = { gruppe: null, maerker: new Set() };
// Vælg-tilstandens filtre, «Højst 40 min» og rækkefølgen (sorterValg i js/ugeplan.js). Huskes fra dag til dag, til
// voksendelen låses, så «Vegetar» gælder hele ugen; søgningen glemmes, når en ret er valgt
const vaelgValg = { gruppe: null, maerker: new Set(), hverdag: false, billig: false, kniv: false };
// Om filtrene er foldet ud ('udvalg', 'katalog'; ingen værdi = efter skærmen). Glemt, når man går til en anden side, så
// en kompakt skærm (KOMPAKT) altid starter med listen lige under søgefeltet
const filterAaben = new Map();
function glemSoegning() {
  soegning.clear();
  for (const v of [katalogValg, vaelgValg]) {
    v.gruppe = null;
    v.maerker.clear();
  }
  vaelgValg.hverdag = vaelgValg.billig = vaelgValg.kniv = false;
  filterAaben.clear();
}

// Viser voksendelens skærm og svarer true, når adressen er voksendelens. En gammel adresse til ugeplanen (#/uge,
// #/uge/dag/<n>) skiftes først til den nye med history.replaceState (intet nyt punkt i historikken, og ingen hashchange).
// Børnenes adresser og indkøbslisten lukker låsen og svarer false: app.js og js/ugeplan.js tegner dem
export function rute(hash) {
  const ny = nyAdresse(hash);
  if (ny) {
    history.replaceState(null, '', ny);
    hash = ny;
  }
  const zone = laasFor(hash);
  const fraListe = zone === 'fri' && fraVoksne();
  if (zone !== 'fri') listeFraVoksen = false;
  if (zone !== 'bag' && !fraListe) laas();
  const side = zone === 'bag' ? voksenSide(hash) : null;
  if (!side) sidsteSide = null;
  if (side) {
    K.visSkaerm(skaerm(side, hash));
    return true;
  }
  if (zone !== 'bag' || erLaastOp()) return false;
  K.visSkaerm(vagtFoerst());
  return true;
}

function skaerm(side, hash) {
  const dag = side === 'dag' ? voksenDag(hash) : null;
  // Beskeden, husstandens kladde, filtrenes foldning og ugeplanens besked og ark hører til den side (og dag), de kom på
  const noegle = side === 'dag' ? 'dag-' + dag : side;
  if (noegle !== sidsteSide) { besked = null; kladde = null; filterAaben.clear(); glemVisning(); }
  sidsteSide = noegle;
  if (!erLaastOp() || !klar()) return vagtFoerst();
  const f = Lager.hentFamilie(K.S.ids);
  if (side === 'hub') return forsideSkaerm();
  if (side === 'dag') return dag === null ? ukendtDag() : vaelgSkaerm(f, dag);
  if (side === 'mere') return mereSkaerm(f);
  // En nyere udgave har gemt familien: ugeplanen (forsiden, vælg-tilstanden og «Mere») står stadig, siderne med familien ikke
  if (f.laast) return laastSkaerm();
  if (side === 'husstand') return husstandSkaerm(f);
  if (side === 'udvalg') return udvalgSkaerm(f);
  if (side === 'favoritter') return favoritSkaerm(f);
  return katalogSkaerm(f);
}

// ---------- Fælles ----------

// Opskrifterne er hentet (også dem, der fejlede)
const klar = () => Boolean(K.S.ids) && K.S.ids.every((id) => K.S.retter.has(id));
const model = (id) => {
  const m = K.S.retter.get(id);
  return m && !(m instanceof Error) ? m : null;
};
// Grundretterne, som opskrifterne står. alleRetter() er dem i den udgave, retten vises i: med mere grønt, når kontakten er
// slået til, og retten har en (js/groent.js). Så finder søgningen linserne i retten med mere grønt, og pris og tid er dem,
// ugeplanen regner med (code review kode-4)
const grundRetter = () => K.S.ids.map(model).filter(Boolean);
const alleRetter = () => {
  const mereGroent = Lager.mereGroentPaa(K.S.ids);
  return grundRetter().map((m) => valgt(m, mereGroent));
};
const iPlanen = () => alleRetter().filter((m) => m.uge);
const fejlede = () => K.S.ids.filter((id) => K.S.retter.get(id) instanceof Error).length;

function medFokus(b, noegle) {
  b.dataset.fokus = noegle;
  return b;
}

// Tegner skærmen igen uden at skifte adresse, og giver fokus tilbage til knappen med data-fokus. Kan knappen ikke få
// fokus (et hjerte, der ikke er favorit længere, under filteret «Favorit», eller en chip i de sammenfoldede filtre), får
// overskriften det, så fokus ikke forsvinder
function tegnIgen(fokus) {
  K.vis();
  if (!fokus) return;
  const maal = document.querySelector('[data-fokus="' + fokus + '"]');
  maal?.focus({ preventScroll: true });
  if (!maal || document.activeElement !== maal) document.querySelector('main h1')?.focus({ preventScroll: true });
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

// «Tilbage» til forsiden (kataloget, vælg-tilstanden og «Mere») eller til «Mere» (husstand, udvalg og favoritter, som står dér)
const tilbage = (til = '#/voksen') => K.knap('Tilbage', { klasse: 'lille', ikonNavn: 'tilbage', label: til === '#/voksen' ? 'Tilbage til voksendelen' : 'Tilbage til Mere', onclick: () => K.naviger(til) });

const fejlLinje = () => {
  const n = fejlede();
  return n ? el('p', { class: 'fejl-linje', role: 'status', tekst: (n === 1 ? 'Én opskrift' : n + ' opskrifter') + ' kunne ikke hentes og står ikke her. Prøv at genindlæse siden.' }) : null;
};

// En ret i en liste: billedet, navnet, en linje under (mærkerne) og knappen. En besked til netop den ret står i rækken.
// lyn: ⚡ på billedets hjørne, som på børnenes kort (vælg-tilstanden), i en ramme, som mærket kan sidde i
function raekke(m, { valgt = false, under = null, knap, lyn = false }) {
  const billede = K.billede(grafikRet(m.id), '', 'voksen-raekke-billede');
  return el('li', { class: 'voksen-raekke' + (valgt ? ' valgt' : ''), 'data-ret': m.id },
    lyn ? el('span', { class: 'voksen-raekke-ramme' }, billede, K.lynMaerke(m)) : billede,
    el('div', { class: 'voksen-raekke-tekst' }, el('span', { class: 'voksen-raekke-navn', tekst: m.navn }), under),
    knap,
    besked && besked.ret === m.id ? beskedEl(besked) : null);
}

// ---------- Søgningen (udvalget, favoritterne og kataloget) ----------

// Retterne som søgeposter (soegePost) med gruppen fra forsidens afsnit og mærkerne med familiens egne (ny, favorit)
function poster(retter, f) {
  const gruppe = new Map(K.S.grupper.flatMap((g) => g.retter.map((id) => [id, g.id])));
  return retter.map((m) => soegePost(m, gruppe.get(m.id) ?? null, maerkerFor(m, { familie: f })));
}
const soegeTekstFor = (side) => soegning.get(side) || '';

// Alle retter som søgeposter, til lupen på forsiden (app.js)
export const soegePoster = () => poster(alleRetter(), Lager.hentFamilie(K.S.ids));

// Søgefeltet med lupen og «Ryd søgningen» (×). Ved hvert tegn kaldes naarSkrevet(tekst), der husker teksten (kun i
// hukommelsen) og tegner listen og tallet om. Selve feltet tegnes ikke om, så fokus, markøren og tastaturet bliver, hvor
// de er. Svar: formen og ryd(), der tømmer feltet og giver det fokus (også knappen «Ryd søgningen», når intet passer).
// Tallet under feltet skal have id'et id + '-tal' (aria-describedby)
export function soegeForm({ id, vaerdi, naarSkrevet }) {
  const felt = el('input', {
    id, class: 'soeg-felt', type: 'search', placeholder: SOEG_EKSEMPEL, maxlength: String(SOEG_MAKS), autocomplete: 'off',
    autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-describedby': id + '-tal',
  });
  felt.value = vaerdi;
  const kryds = K.knap('', { klasse: 'rund soeg-ryd', ikonNavn: 'kryds', label: 'Ryd søgningen', onclick: () => ryd() });
  kryds.hidden = !felt.value;
  function saet(tekst) {
    kryds.hidden = !tekst;
    naarSkrevet(tekst);
  }
  function ryd() {
    felt.value = '';
    saet('');
    felt.focus();
  }
  felt.addEventListener('input', () => saet(felt.value));
  const form = el('form', { class: 'soeg', role: 'search', novalidate: true, onsubmit: (e) => {
    e.preventDefault();
    // «Søg» på skærmtastaturet lukker tastaturet, så listen kan ses. Med mus og tastatur bliver fokus i feltet
    if (matchMedia('(pointer: coarse)').matches) felt.blur();
  } },
  el('label', { for: id, class: 'soeg-navn', tekst: 'Søg i retterne' }),
  el('div', { class: 'soeg-raekke' }, ikon('lup'), felt, kryds));
  return { form, ryd };
}

// Søgefeltet i voksendelens lister: teksten huskes pr. side (soegning), til voksendelen lukker
function soegeFelt(side, opdater) {
  return soegeForm({ id: 'soeg-' + side, vaerdi: soegeTekstFor(side), naarSkrevet: (tekst) => {
    if (tekst) soegning.set(side, tekst);
    else soegning.delete(side);
    opdater();
  } });
}

// «Viser 12 af 125 retter» under søgefeltet og filtrene. En statuslinje, så skærmlæseren siger tallet, når listen skifter
const soegeTal = (side) => el('p', { id: 'soeg-' + side + '-tal', class: 'soeg-tal', role: 'status' });

// Intet passer: hvad der blev søgt efter, og vejen tilbage (søgningen og/eller filtrene)
export function ingenTraef(tekst, { ryd, fjernFiltre = null, filterTekst = 'Ingen retter passer til de valgte filtre.' }) {
  const t = tekst.trim();
  return el('div', { class: 'voksen-tom' },
    el('p', { tekst: t ? 'Ingen retter passer til «' + t + '»' + (fjernFiltre ? ' med de valgte filtre.' : '.') : filterTekst }),
    el('div', { class: 'voksen-knapper' },
      t ? medFokus(K.knap('Ryd søgningen', { klasse: 'lille', ikonNavn: 'kryds', onclick: ryd }), 'ryd-soegning') : null,
      fjernFiltre ? medFokus(K.knap('Fjern filtrene', { klasse: 'lille', onclick: fjernFiltre }), 'fjern-filtre') : null));
}

// Søgefeltet, tallet og listen under dem (udvalget, favoritterne og kataloget). passer(tekst): de poster, søgningen og
// filtrene viser nu. tom: teksten, når der slet ingen retter er. ingen(tekst, ryd): det, der står, når intet passer.
// liste(vist): listen med rækkerne. naarSkrevet(): kaldes ved hvert tegn, før listen tegnes. Ved hvert tegn tegnes kun
// tallet og listen om (soegeFelt). Svar: { form, tal, boks }
function soegeListe(side, alle, { passer, tom = 'Der er ingen retter at vise.', ingen, liste, naarSkrevet = null }) {
  const tal = soegeTal(side);
  const boks = el('div', { class: 'soeg-resultat' });
  const felt = soegeFelt(side, () => { naarSkrevet?.(); tegn(); });
  function tegn() {
    const tekst = soegeTekstFor(side);
    const vist = passer(tekst);
    tal.textContent = alle.length ? visTekst(vist.length, alle.length) : '';
    if (!alle.length) boks.replaceChildren(el('p', { class: 'voksen-tom', tekst: tom }));
    else if (!vist.length) boks.replaceChildren(ingen(tekst, felt.ryd));
    else boks.replaceChildren(liste(vist));
  }
  tegn();
  return { form: felt.form, tal, boks };
}

// ---------- Rækkernes knapper (udvalget, favoritterne og kataloget) ----------

function skiftFavorit(m) {
  const ny = Lager.skiftFavorit(m.id, K.S.ids);
  besked = ny ? null : gemFejl('Favoritten', m.id);
  tegnIgen('fav-' + m.id);
  if (ny) K.annoncer((ny.favoritter.includes(m.id) ? 'Favorit: ' : 'Ikke favorit: ') + m.navn + '.');
}

function hjerteKnap(m, f) {
  const b = medFokus(K.knap('', { klasse: 'rund hjerte-knap', label: 'Favorit: ' + m.navn, onclick: () => skiftFavorit(m) }), 'fav-' + m.id);
  b.append(hjerteIkon());
  b.setAttribute('aria-pressed', String(f.favoritter.includes(m.id)));
  return b;
}

// Retten ind i eller ud af udvalget. Er det fuldt, siges grænsen i rækken med retten
function skiftUdvalg(m, ids) {
  const ny = skiftIUdvalg(ids, m.id);
  if (!ny) {
    besked = { fejl: true, ret: m.id, tekst: 'Udvalget er fuldt: højst ' + UDVALG_MAKS + ' retter. Fjern en ret først.' };
    tegnIgen('ret-' + m.id);
    return;
  }
  gemUdvalg(ny, (ny.length > ids.length ? 'Med i udvalget: ' : 'Ikke med: ') + m.navn + '. ' + valgtTekst(ny.length) + '.', 'ret-' + m.id, m.id);
}

// «Med» i udvalget. Fuldt: aria-disabled, ikke disabled, så fokus bliver, og et tryk siger grænsen. lang: «Med i udvalget»
// i kataloget, hvor «Med» alene ikke siger hvad (på telefonen står kun «Med», .kun-bred i familie.css). .voksen-med: i
// kataloget står den i venstre side af knaprækken på telefonen (review U7)
function medKnap(m, ids, fuldt, { lang = false } = {}) {
  const valgt = ids.includes(m.id);
  const b = medFokus(K.knap(lang ? '' : 'Med', { klasse: 'lille valg' + (lang ? ' voksen-med' : ''), ikonNavn: valgt ? 'tjek' : 'plus', label: 'Med i udvalget: ' + m.navn, onclick: () => skiftUdvalg(m, ids) }), 'ret-' + m.id);
  if (lang) b.append(el('span', {}, 'Med', el('span', { class: 'kun-bred', tekst: ' i udvalget' })));
  b.setAttribute('aria-pressed', String(valgt));
  if (!valgt && fuldt) b.setAttribute('aria-disabled', 'true');
  return b;
}

// ---------- Vagten og fejlene ----------

// Opskrifterne først: ellers tegnes holdet om, når de er hentet, og et hold, der er i gang, starter forfra
function vagtFoerst() {
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return K.statusSkaerm({ titel: 'Henter opskrifterne …', laeser: true });
  return vagtSkaerm();
}

// Adressen er åbnet uden låsen (et bogmærke, eller tiden er gået): holdet først, som på forsiden
function vagtSkaerm() {
  return K.statusSkaerm({
    titel: 'Til de voksne',
    tekst: 'Hold knappen inde i 2 sekunder for at åbne.',
    handling: el('div', { class: 'status-knapper' },
      holdKnap({
        klasse: 'voksen-hold voksen-vagt',
        label: 'Voksne: hold knappen inde i 2 sekunder for at åbne voksendelen.',
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

// #/voksen/dag/<andet end 1-7>: en fast tekst, intet fra adressen
function ukendtDag() {
  return K.statusSkaerm({
    titel: 'Den dag findes ikke',
    tekst: 'Adressen peger ikke på en af ugens syv dage. Vælg dagen på ugeplanen.',
    handling: el('div', { class: 'status-knapper' },
      K.knap('Til ugeplanen', { klasse: 'primaer', ikonNavn: 'kalender', onclick: () => K.naviger('#/voksen') })),
  });
}

// Planen er gemt med en nyere udgave: vælg-tilstanden kan ikke lægge en ret på den (skærmen står i js/ugeplan.js)
const ugeLaastSkaerm = () => laastPlanSkaerm(el('div', { class: 'status-knapper' },
  K.knap('Tilbage', { ikonNavn: 'tilbage', label: 'Tilbage til voksendelen', onclick: () => K.naviger('#/voksen') })));

function laastSkaerm() {
  return K.statusSkaerm({
    titel: 'Voksendelen er gemt med en nyere udgave',
    tekst: 'Denne enhed har en ældre udgave af Tumbi Køkken, som ikke må ændre husstand, udvalg og favoritter. Genindlæs siden, så hentes den nye udgave.',
    handling: el('div', { class: 'status-knapper' },
      K.knap('Tilbage', { ikonNavn: 'tilbage', label: 'Tilbage til voksendelen', onclick: () => K.naviger('#/voksen') }),
      K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })),
  });
}

// ---------- Forsidens og «Mere»s dele ----------

// Indkøbslisten til ugens plan (#/hent/<kode>), som boblen «Indkøbsliste» åbner. Uden en plan, eller når linket
// ikke kan læses (ugen er mere end 8 uger væk), den gemte liste
function listeHash() {
  const p = Lager.hentUge(K.S.ids);
  if (p.laast || !p.dage.some(Boolean)) return '#/indkoeb';
  const mereGroent = Lager.mereGroentPaa(K.S.ids);
  const kode = kod(p.uge || planMandag(), p.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null)), { mereGroent });
  return afkod(kode, { retter: K.S.ids, idag: new Date() }).ok ? '#/hent/' + kode : '#/indkoeb';
}

// «Mere grønt i maden» (js/groent.js): én kontakt under «Mere». Slået til får retter med hakket kød halvt kød og halvt
// røde linser i retten, ugeplanen, indkøbslisten og printet. Valget gemmes i familien på denne enhed (js/lager.js). En
// indkøbsliste, telefonen allerede har hentet, bliver, som den er: kun et nyt link giver en ny liste
const GROENT_NAVN = 'Mere grønt i maden';
function groentStatus(f) {
  if (f.laast) return NYERE;
  if (f.mereGroent !== true) return 'Slået fra';
  const n = grundRetter().filter((m) => m.groen).length;
  return n ? 'Halvt kød og halvt røde linser i ' + flertal(n, 'ret', 'retter') : 'Slået til, men ingen af retterne har det endnu';
}

function groentKontakt(f) {
  const til = f.mereGroent === true;
  return el('div', { class: 'voksen-groent' },
    medFokus(el('button', {
      type: 'button',
      class: 'knap voksen-kontakt',
      role: 'switch',
      'aria-checked': String(til),
      'aria-labelledby': 'groent-navn',
      'aria-describedby': 'groent-status',
      disabled: f.laast,
      onclick: K.klik(() => skiftGroent(!til)),
    }, el('span', { class: 'voksen-kontakt-spor', 'aria-hidden': 'true' }, el('span', { class: 'voksen-kontakt-prik' })),
    el('span', { class: 'voksen-punkt-tekst' },
      el('span', { id: 'groent-navn', class: 'voksen-punkt-navn', tekst: GROENT_NAVN }),
      el('span', { id: 'groent-status', class: 'voksen-punkt-status', tekst: groentStatus(f) }))), 'groent'),
    besked && besked.groent ? beskedEl(besked) : null);
}

// Gemmer valget. Kan det ikke gemmes, siger en besked under kontakten det, og kontakten står, som den stod
function skiftGroent(til) {
  const ny = Lager.gemFamilie({ mereGroent: til }, K.S.ids);
  besked = ny ? null : { ...gemFejl('Valget'), groent: true };
  tegnIgen('groent');
  if (ny) K.annoncer(GROENT_NAVN + ' er slået ' + (til ? 'til.' : 'fra.'));
}

function punkt({ navn, status, ikonEl, til, fokus, laast = false }) {
  return el('li', {}, medFokus(el('button', {
    type: 'button',
    class: 'knap voksen-punkt',
    disabled: laast,
    onclick: K.klik(() => K.naviger(typeof til === 'function' ? til() : til)),
  }, ikonEl, el('span', { class: 'voksen-punkt-tekst' },
    el('span', { class: 'voksen-punkt-navn', tekst: navn }),
    el('span', { class: 'voksen-punkt-status', tekst: status }))), fokus));
}

// Husstanden som kort tekst på «Mere»: «2 voksne og 1 barn = 3 portioner», eller hvad nye retter er til, når den ikke er sat
function husstandStatus(f, p) {
  const sum = husstandSum(f.voksne, f.boern, f.barnAndel);
  return sum.n ? husstandTekst(f.voksne, f.boern) + ' = ' + sumTekst(sum) : 'Ikke sat. Nye retter er til ' + portionerTekst(p.n);
}

// ---------- #/voksen: forsiden er ugeplanen ----------

// Boblerne øverst: Indkøbsliste (med antal varer, når linket til planen kan laves), Retter og Mere. Indkøbslisten regnes
// først ved trykket (listeHash), så den altid følger planen. Er ugen tom, er der ingen liste at vise: boblen er hvid som de
// andre, og et tryk siger, hvad man gør, i stedet for at åbne telefonens tomme liste «Sæt linket ind» (review U3, 16-11)
const TOM_LISTE = 'Der er ingen varer endnu. Vælg en ret til en dag, så kommer varerne på listen.';
function bobler() {
  const p = Lager.hentUge(K.S.ids);
  const tom = !p.laast && !p.dage.some(Boolean);
  const n = !tom && listeHash().startsWith('#/hent/') ? antalVarer() : 0;
  const tilListe = () => {
    listeFraVoksen = true;
    K.naviger(listeHash());
  };
  const tomTryk = () => {
    besked = { liste: true, tekst: TOM_LISTE };
    tegnIgen('indkoeb');
    K.annoncer(TOM_LISTE);
  };
  const liste = medFokus(K.knap('Indkøbsliste', { klasse: 'voksen-boble voksen-boble-liste' + (tom ? ' voksen-boble-tom' : ''), ikonNavn: 'kurv', onclick: tom ? tomTryk : tilListe }), 'indkoeb');
  if (n) liste.append(el('span', { class: 'voksen-boble-tal', tekst: flertal(n, 'vare', 'varer') }));
  return [el('nav', { class: 'voksen-bobler', 'aria-label': 'Voksendelen' },
    liste,
    medFokus(K.knap('Retter', { klasse: 'voksen-boble', ikonNavn: 'lup', onclick: () => K.naviger('#/voksen/katalog') }), 'katalog'),
    medFokus(K.knap('Mere', { klasse: 'voksen-boble', ikonNavn: 'mere', onclick: () => K.naviger('#/voksen/mere') }), 'mere')),
  tom && besked && besked.liste ? beskedEl(besked) : null];
}

function forsideSkaerm() {
  const p = Lager.hentUge(K.S.ids);
  const uge = (!p.laast && p.uge) || planMandag();
  return voksenSkaerm('voksen-forside', 'Ugeplan', 'Uge\u00a0' + ugeNr(uge) + ' · ' + dagDato(uge, 0) + '–' + dagDato(uge, 6),
    ...bobler(),
    ...ugeIndhold(),
    fejlLinje(),
    el('div', { class: 'voksen-bund' },
      el('p', { class: 'voksen-luk-tekst', tekst: 'Lukker efter ' + LUK_MS / 60000 + ' minutter uden tryk' }),
      medFokus(K.knap('Luk', { klasse: 'lille', ikonNavn: 'kryds', label: 'Luk voksendelen', onclick: luk }), 'luk')));
}

// ---------- #/voksen/mere ----------

// Ugeplanens handlinger (js/ugeplan.js) og familien: det, man sætter én gang og sjældent ændrer
function mereSkaerm(f) {
  const p = Lager.hentUge(K.S.ids);
  const alle = iPlanen();
  const valgt = f.udvalg ? alle.filter((m) => f.udvalg.ids.includes(m.id)).length : 0;
  // Familien er gemt med en nyere udgave: husstand, udvalg og favoritter kan ikke åbnes, ugeplanens handlinger kan
  const nyere = f.laast ? { status: NYERE, laast: true } : {};
  const familie = [
    { navn: 'Husstand', ikonEl: stregIkon(PERSONER), til: '#/voksen/husstand', fokus: 'husstand', status: husstandStatus(f, p), ...nyere },
    { navn: 'Ugens udvalg', ikonEl: ikon('liste'), til: '#/voksen/udvalg', fokus: 'udvalg',
      status: f.udvalg ? flertal(valgt, 'ret', 'retter') + ' at vælge mellem'
        : 'Ikke sat: børnene vælger mellem ' + flertal(retterTilBoern(alle, f, K.S.grupper).length, 'ret', 'retter'), ...nyere },
    { navn: 'Favoritter', ikonEl: hjerteIkon(), til: '#/voksen/favoritter', fokus: 'favoritter',
      status: f.favoritter.length ? flertal(f.favoritter.length, 'ret', 'retter') : 'Ingen endnu', ...nyere },
  ];
  return voksenSkaerm('voksen-mere-side', 'Mere', null,
    el('div', { class: 'voksen-knapper' }, tilbage()),
    el('section', { class: 'voksen-sektion', 'aria-labelledby': 'mere-uge' },
      el('h2', { class: 'voksen-afsnit', id: 'mere-uge', tekst: 'Ugeplanen' }),
      ugeHandlinger()),
    el('section', { class: 'voksen-sektion', 'aria-labelledby': 'mere-familie' },
      el('h2', { class: 'voksen-afsnit', id: 'mere-familie', tekst: 'Familien' }),
      el('ul', { class: 'voksen-menu voksen-mere', 'aria-labelledby': 'mere-familie' }, familie.map(punkt)),
      groentKontakt(f)));
}

// ---------- #/voksen/husstand ----------

// Portionerne til kladden, eller null, når der hverken er voksne eller børn (så kan den ikke gemmes)
const kladdePortioner = (k) => (k.voksne + k.boern > 0 ? portionerFraHusstand(k.voksne, k.boern, k.barnAndel) : null);
const kladdeTekst = (k) => {
  const n = kladdePortioner(k);
  return n ? husstandTekst(k.voksne, k.boern) + ' = ' + sumTekst(husstandSum(k.voksne, k.boern, k.barnAndel)) : 'Vælg mindst én voksen eller ét barn.';
};

// Ved grænsen (0 og MAKS_PERSONER) er knappen aria-disabled, ikke disabled, så fokus bliver på den, og et tryk siger grænsen
function stepper({ vaerdi, navn, tekst, fokus, saet }) {
  const minus = medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'minus', label: 'Færre ' + navn,
    onclick: () => (vaerdi > 0 ? saet(vaerdi - 1, fokus + '-minus') : K.annoncer('Mindst 0 ' + navn)) }), fokus + '-minus');
  const plus = medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'plus', label: 'Flere ' + navn,
    onclick: () => (vaerdi < MAKS_PERSONER ? saet(vaerdi + 1, fokus + '-plus') : K.annoncer('Højst ' + MAKS_PERSONER + ' ' + navn)) }), fokus + '-plus');
  if (vaerdi <= 0) minus.setAttribute('aria-disabled', 'true');
  if (vaerdi >= MAKS_PERSONER) plus.setAttribute('aria-disabled', 'true');
  return el('div', { class: 'stepper', role: 'group', 'aria-label': navn }, minus, el('output', { class: 'stepper-tal', tekst }), plus);
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
    el('div', { class: 'voksen-knapper' }, tilbage('#/voksen/mere')),
    el('div', { class: 'husstand' },
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', tekst: 'Voksne' }),
        stepper({ vaerdi: k.voksne, navn: 'voksne', tekst: flertal(k.voksne, 'voksen', 'voksne'), fokus: 'voksne', saet: saet('voksne') })),
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', tekst: 'Børn' }),
        stepper({ vaerdi: k.boern, navn: 'børn', tekst: flertal(k.boern, 'barn', 'børn'), fokus: 'boern', saet: saet('boern') })),
      el('div', { class: 'husstand-raekke' }, el('span', { class: 'husstand-navn', id: 'barn-andel', tekst: 'Et barn spiser som' }),
        el('div', { class: 'valg-par', role: 'group', 'aria-labelledby': 'barn-andel' }, andele,
          el('span', { class: 'husstand-enhed', 'aria-hidden': 'true', tekst: 'voksen' }))),
      el('p', { class: 'husstand-sum', tekst: n ? '= ' + sumTekst(husstandSum(k.voksne, k.boern, k.barnAndel)) : 'Vælg mindst én voksen eller ét barn.' })),
    el('div', { class: 'voksen-knapper' }, gem, heleUgen),
    forklaring ? el('p', { class: 'voksen-hjaelp', tekst: forklaring }) : null,
    besked ? beskedEl(besked) : null);
}

// ---------- #/voksen/udvalg ----------

const valgtTekst = (n) => n + ' af ' + UDVALG_MAKS + ' valgt';

// Gemmer udvalget (ingen id'er = intet udvalg: børnene ser favoritterne og nye retter, retterTilBoern). ret: afkrydsningen i rækken med den ret. Den
// siges kun; et tryk på «Fyld op» eller «Fjern udvalget» får også beskeden under knapperne
function gemUdvalg(ids, tekst, fokus, ret) {
  const f = Lager.gemFamilie({ udvalg: ids.length ? { ids, rettet: idag() } : null }, K.S.ids);
  besked = !f ? gemFejl('Udvalget', ret) : ret ? null : { tekst };
  tegnIgen(fokus);
  if (f) K.annoncer(tekst);
}

// En mærke-chip (udvalget og kataloget): valgte er sættet, den slår mærket til og fra i, og side er filtrenes side
function filterChip(k, antal, valgte = filtre, side = 'udvalg') {
  const b = medFokus(K.knap(MAERKER[k].navn + ' (' + antal + ')', { klasse: 'filter-chip', onclick: () => {
    if (valgte.has(k)) valgte.delete(k);
    else valgte.add(k);
    efterFilterValg(side, 'filter-' + k);
  } }), 'filter-' + k);
  b.prepend(el('span', { 'aria-hidden': 'true', tekst: MAERKER[k].ikon }));
  b.setAttribute('aria-pressed', String(valgte.has(k)));
  return b;
}

// Filtrene (udvalgets mærker, katalogets grupper og mærker) under én linje, der kan foldes sammen og siger, hvad der er
// valgt. Foldet sammen på en smal eller lav skærm (telefonen, iPad på langs og en bærbar: KOMPAKT), så listen står lige
// under søgefeltet, også mens tastaturet er fremme. Foldet ud på en stor skærm (iPad på højkant). Hvad den voksne har
// foldet ud, huskes, mens siden står (filterAaben). side: 'udvalg' eller 'katalog'
const KOMPAKT = '(max-width: 700px), (max-height: 900px)';
const kompakt = () => matchMedia(KOMPAKT).matches;
function filterBoks(side, navn, valgte, ...chips) {
  const boks = el('details', { class: 'voksen-filtre', open: filterAaben.get(side) ?? !kompakt() },
    medFokus(el('summary', {},
      el('span', { class: 'voksen-filtre-navn', tekst: navn }),
      valgte.length ? el('span', { class: 'voksen-filtre-valgt', tekst: valgte.join(', ') }) : null), 'filtre-' + side),
    chips);
  boks.addEventListener('toggle', () => { filterAaben.set(side, boks.open); });
  return boks;
}

// Et valg i filtrene. På en kompakt skærm fylder de udfoldede filtre det meste, så de foldes sammen, og tallet og listen
// står lige under linjen, der siger, hvad der er valgt (den får fokus). Ellers bliver de stående, og fokus bliver på chippen
function efterFilterValg(side, fokus) {
  const fold = kompakt();
  if (fold) filterAaben.set(side, false);
  tegnIgen(fold ? 'filtre-' + side : fokus);
}

// Et tegn i søgefeltet på en kompakt skærm folder filtrene sammen, så træffene står lige under feltet. Skærmen tegnes ikke
// om (tastaturet bliver fremme)
function foldVedSoegning(side, boks) {
  if (!boks.open || !kompakt()) return;
  boks.open = false;
  filterAaben.set(side, false);
}

// Linjen under navnet: gruppen (kun i kataloget) og mærkerne
function maerkeLinje(noegler, gruppe = null) {
  if (!noegler.length && !gruppe) return null;
  return el('span', { class: 'voksen-raekke-maerker' },
    gruppe ? el('span', { class: 'voksen-maerke', tekst: gruppe }) : null,
    noegler.map((k) => el('span', { class: 'voksen-maerke' }, el('span', { 'aria-hidden': 'true', tekst: MAERKER[k].ikon + ' ' }), MAERKER[k].navn)));
}

function udvalgSkaerm(f) {
  const alle = poster(iPlanen(), f);
  const ids = f.udvalg ? f.udvalg.ids : [];
  const fuldt = ids.length >= UDVALG_MAKS;
  // Læses ved hvert tryk og hvert tegn: søgefeltet tegner kun listen om, ikke skærmen
  const passer = (tekst) => filtrer(alle, { maerker: [...filtre], tekst });

  // Kun blandt de viste retter, så filtrene og søgningen også gælder her (fx kun nye vegetarretter). Blandet, så udvalget
  // ikke kun bliver pasta: selve listen på skærmen står efter gruppe
  const fyld = () => {
    const kandidater = blandet(passer(soegeTekstFor('udvalg')), K.S.grupper, (p) => p.m.id).map((p) => p.m.id);
    const ny = fyldOp(ids, kandidater, f.lavet, { antal: f.udvalg ? FYLD_OP : UDVALG_STANDARD });
    const flere = ny.length - ids.length;
    if (!flere) {
      besked = { tekst: fuldt
        ? 'Udvalget er fuldt: højst ' + UDVALG_MAKS + ' retter.'
        : 'Der er ingen nye retter at fylde op med' + (filtre.size || soegeTekstFor('udvalg').trim() ? ' blandt de viste' : '') + ': de er lavet før eller allerede valgt.' };
      tegnIgen('fyld-op');
      return;
    }
    gemUdvalg(ny, flertal(flere, 'ny ret', 'nye retter') + ' er med i udvalget. ' + valgtTekst(ny.length) + '.', 'fyld-op');
  };

  const alleKnap = f.udvalg ? medFokus(holdKnap({
    klasse: 'lille voksen-hold',
    label: 'Fjern udvalget, så børnene vælger mellem favoritterne og nye retter. Hold knappen inde i 2 sekunder.',
    indhold: [ikon('igen'), el('span', { tekst: 'Fjern udvalget: hold' })],
    naarFaerdig: () => gemUdvalg([], 'Intet udvalg: børnene vælger mellem favoritterne og nye retter, højst ' + BOERN_KORT + '.', 'fyld-op'),
  }), 'alle-retter') : null;

  const filtreEl = filterBoks('udvalg', 'Mærker', [...filtre].map((k) => MAERKER[k].navn),
    el('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Mærker' },
      Object.keys(MAERKER).map((k) => filterChip(k, alle.filter((p) => p.noegler.includes(k)).length))));

  const s = soegeListe('udvalg', alle, {
    passer,
    naarSkrevet: () => foldVedSoegning('udvalg', filtreEl),
    tom: 'Der er ingen retter i ugeplanen endnu.',
    ingen: (tekst, ryd) => ingenTraef(tekst, {
      ryd,
      fjernFiltre: filtre.size ? () => { filtre.clear(); tegnIgen('fyld-op'); } : null,
      filterTekst: 'Ingen retter har alle de valgte mærker.',
    }),
    liste: (vist) => el('ul', { class: 'voksen-liste', 'aria-label': 'Retter i ugeplanen' },
      vist.map((p) => raekke(p.m, { valgt: ids.includes(p.m.id), under: maerkeLinje(p.noegler), knap: medKnap(p.m, ids, fuldt) }))),
  });

  return voksenSkaerm('voksen-udvalg', 'Ugens udvalg', null,
    el('p', { class: 'voksen-hjaelp', tekst: 'Når børnene vælger ugens mad, ser de kun retterne i udvalget. Uden et udvalg ser de favoritterne og nye retter, højst ' + BOERN_KORT + '.' }),
    el('div', { class: 'voksen-knapper' },
      tilbage('#/voksen/mere'),
      medFokus(K.knap('Fyld op med nye', { klasse: 'lille', ikonNavn: 'plus', onclick: fyld }), 'fyld-op'),
      alleKnap),
    besked && !besked.ret ? beskedEl(besked) : null,
    s.form,
    filtreEl,
    s.tal,
    el('p', { class: 'udvalg-tal', tekst: f.udvalg ? valgtTekst(ids.length) : 'Intet udvalg: børnene ser favoritterne og nye retter' }),
    s.boks,
    fejlLinje());
}

// ---------- #/voksen/favoritter ----------

function favoritSkaerm(f) {
  const alle = poster(alleRetter(), f);
  const s = soegeListe('favoritter', alle, {
    passer: (tekst) => filtrer(alle, { tekst }),
    ingen: (tekst, ryd) => ingenTraef(tekst, { ryd }),
    liste: (vist) => el('ul', { class: 'voksen-liste', 'aria-label': 'Retter' },
      vist.map((p) => raekke(p.m, { valgt: f.favoritter.includes(p.m.id), knap: hjerteKnap(p.m, f) }))),
  });
  return voksenSkaerm('voksen-favoritter', 'Favoritter',
    f.favoritter.length ? flertal(f.favoritter.length, 'favorit', 'favoritter') : 'Ingen endnu',
    el('p', { class: 'voksen-hjaelp', tekst: 'Tryk på hjertet ved de retter, familien er glad for. Favoritterne får et ' + MAERKER.favorit.ikon + ', når børnene vælger ugens mad.' }),
    el('div', { class: 'voksen-knapper' }, tilbage('#/voksen/mere')),
    s.form,
    s.tal,
    s.boks,
    fejlLinje());
}

// ---------- #/voksen/katalog ----------

// En gruppe-chip i kataloget og vælg-tilstanden (v: deres valg, side: filtrenes side): én gruppe ad gangen, og «Alle»
// (id null) er ingen gruppe. Et tryk på den valgte gruppe viser alle igen. Gruppens billede fra forsiden står foran navnet
function gruppeChip(id, navn, antal, v, side) {
  const valgt = v.gruppe === id;
  const fokus = 'gruppe-' + (id || 'alle');
  const b = medFokus(K.knap(navn + ' (' + antal + ')', { klasse: 'filter-chip', onclick: () => {
    v.gruppe = valgt ? null : id;
    efterFilterValg(side, fokus);
  } }), fokus);
  if (id) b.prepend(K.billede(grafikGruppe(id), '', 'filter-chip-billede'));
  b.setAttribute('aria-pressed', String(valgt));
  return b;
}

// Vælg-tilstandens tid og rækkefølge, som før på #/uge/dag/<n>: «Højst 40 min» fjerner de lange retter (en hverdag;
// mærket «Hurtig» er kun ⚡ op til 20 min, og det har kun få retter i ugeplanen, review F1 16-11), og de to andre sorterer
// (sorterValg i js/ugeplan.js)
export const HVERDAG_MIN = 40;
const TID = [['hverdag', 'Højst ' + HVERDAG_MIN + ' min']];
const RAEKKEFOELGE = [['billig', 'Billigst først'], ['kniv', 'Mindst kniv først']];
// En ret til en hverdag: tiden i alt er kendt og højst HVERDAG_MIN minutter
export const tilHverdag = (m) => Number.isFinite(m.minutter) && m.minutter > 0 && m.minutter <= HVERDAG_MIN;
function sorterChip(k, navn, v, side) {
  const fokus = 'sorter-' + k;
  const b = medFokus(K.knap(navn, { klasse: 'filter-chip', onclick: () => {
    v[k] = !v[k];
    efterFilterValg(side, fokus);
  } }), fokus);
  b.setAttribute('aria-pressed', String(v[k]));
  return b;
}

// Grupper og mærker i filterBoks. «Aftensmad» samler de seks grupper, Aftensmad blev delt i, og står kun, når den har
// retter. I vælg-tilstanden (side 'vaelg') står kun grupper med retter fra ugeplanen, og rækkefølgen kommer til sidst
function katalogFiltre(alle, v = katalogValg, side = 'katalog') {
  const vaelg = side === 'vaelg';
  const gruppeNavn = v.gruppe === AFTENSMAD ? AFTENSMAD_NAVN : GRUPPER[v.gruppe];
  const sorter = vaelg ? [...TID, ...RAEKKEFOELGE].filter(([k]) => v[k]).map(([, navn]) => navn) : [];
  const valgte = [v.gruppe ? gruppeNavn : null, ...[...v.maerker].map((k) => MAERKER[k].navn), ...sorter].filter(Boolean);
  const aftensmad = alle.filter((p) => iGruppe(p, AFTENSMAD)).length;
  const grupper = K.S.grupper.filter((g) => Object.hasOwn(GRUPPER, g.id))
    .map((g) => [g.id, alle.filter((p) => p.gruppeId === g.id).length]).filter(([, n]) => n || !vaelg);
  return filterBoks(side, vaelg ? 'Grupper, mærker og rækkefølge' : 'Grupper og mærker', valgte,
    el('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Grupper' },
      gruppeChip(null, 'Alle', alle.length, v, side),
      aftensmad ? gruppeChip(AFTENSMAD, AFTENSMAD_NAVN, aftensmad, v, side) : null,
      grupper.map(([id, n]) => gruppeChip(id, GRUPPER[id], n, v, side))),
    el('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Mærker' },
      Object.keys(MAERKER).map((k) => filterChip(k, alle.filter((p) => p.noegler.includes(k)).length, v.maerker, side))),
    vaelg ? el('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Tid og rækkefølge' },
      [...TID, ...RAEKKEFOELGE].map(([k, navn]) => sorterChip(k, navn, v, side))) : null);
}

// Viser kataloget kun en del af retterne? Låsen glemmer søgning og filtre, når en ret åbnes (laas), så listen efter holdet
// er en anden, og pladsen i den filtrerede liste passer ikke længere. Kun mellemrum i feltet er ingen søgning
const katalogFiltreret = () => soegeord(soegeTekstFor('katalog')).length > 0 || katalogValg.gruppe !== null || katalogValg.maerker.size > 0;
// Efter holdet står filtrene, som de står fra start. Står de anderledes nu, flytter listen sig, og en gemt plads rammer forbi
const filtreFlytterListen = () => (filterAaben.get('katalog') ?? !kompakt()) !== !kompakt();

// Adressen til printet fra «Retter» (js/print.js og js/print-flere.js): én ret (ret), flere (retter, i listens
// rækkefølge) eller hele kogebogen. Til husstandens portioner, og med mere grønt, når kontakten er slået til (som
// retten på skærmen uden en dag i ugeplanen). Uden husstand står mængderne som i opskriften
function printAdresse(f, { ret = null, retter = null } = {}) {
  const n = husstandSum(f.voksne, f.boern, f.barnAndel).n;
  const hvad = ret ? 'ret=' + encodeURIComponent(ret) : retter ? 'retter=' + retter.map(encodeURIComponent).join(',') : 'alle';
  return 'print.html?' + hvad + (n ? '&n=' + n : '') + (f.mereGroent === true ? '&groen=1' : '');
}

// Et link til printet (det åbner en ny side), der ligner en knap som ugeplanens «Print». tabindex="0": Safari springer
// et link uden tabindex over med Tab (målt i WebKit 26.6, review F2 15-11), og knappen skal kunne nås med tastaturet.
// kunIkonSmal: på telefonen står kun ikonet (.kun-bred i familie.css); navnet til skærmlæseren er det samme (label).
// Selve linket bygger printLink i dom.js, som ugeplanen også bruger (review R5, 15-11)
function printLink(tekst, href, label, fokus, { kunIkonSmal = false } = {}) {
  return medFokus(printLinkDom(tekst, href, label, { klasse: 'lille', kunIkonSmal }), fokus);
}

// Over listen: hele kogebogen, eller de retter, søgningen og filtrene viser. Står i listens boks, så den følger med ved
// hvert tegn (soegeListe tegner kun tallet og listen om)
// Navnet til skærmlæseren begynder med den tekst, man ser, så stemmestyring finder knappen (review L4). Mange retter fylder
// mere end én A4-side, så teksten lover kun, at hver ret begynder på en ny side (print.css, review U4)
function printFlere(vist, iAlt, f) {
  const tekst = vist.length === 1 ? 'Print den viste ret' : 'Print de ' + vist.length + ' viste';
  const link = vist.length === iAlt
    ? printLink('Print hele kogebogen', printAdresse(f), 'Print hele kogebogen: ' + flertal(iAlt, 'ret', 'retter') + ', hver på en ny side', 'print-flere')
    : printLink(tekst, printAdresse(f, { retter: vist.map((p) => p.m.id) }), vist.length === 1 ? tekst : tekst + ' retter, hver på en ny side', 'print-flere');
  return el('div', { class: 'voksen-print' }, link,
    el('p', { class: 'voksen-print-hjaelp', tekst: 'Hver ret begynder på en ny side. Vælg «Gem som PDF» i printet for at få en PDF.' }));
}

// En ret i kataloget: «Med» (kun retter til ugeplanen) først, så hjertet, «Åbn» og «Print» altid står samme sted. På
// telefonen får knapperne en linje for sig under billedet og navnet (familie.css), så navnet har plads
function katalogRaekke(p, f, ids, fuldt) {
  const m = p.m;
  return raekke(m, {
    under: maerkeLinje(p.noegler, p.gruppe),
    knap: el('div', { class: 'voksen-raekke-knapper' },
      m.uge ? medKnap(m, ids, fuldt, { lang: true }) : null,
      hjerteKnap(m, f),
      medFokus(K.knap('Åbn', { klasse: 'lille', label: 'Åbn ' + m.navn, onclick: () => { K.huskFra(m.id, katalogFiltreret() || filtreFlytterListen() ? 0 : undefined); K.naviger('#/ret/' + m.id); } }), 'aabn-' + m.id),
      // Kun ikonet på telefonen: med teksten stod de fire knapper på to linjer (review F4)
      printLink('Print', printAdresse(f, { ret: m.id }), 'Print ' + m.navn, 'print-' + m.id, { kunIkonSmal: true })),
  });
}

function katalogSkaerm(f) {
  const alle = poster(alleRetter(), f);
  const ids = f.udvalg ? f.udvalg.ids : [];
  const fuldt = ids.length >= UDVALG_MAKS;
  const v = katalogValg;
  const fjernFiltre = () => {
    v.gruppe = null;
    v.maerker.clear();
    tegnIgen(kompakt() ? 'filtre-katalog' : 'gruppe-alle'); // på en kompakt skærm står «Alle» i den lukkede boks
  };
  const filtreEl = katalogFiltre(alle);
  const s = soegeListe('katalog', alle, {
    passer: (tekst) => filtrer(alle, { gruppe: v.gruppe, maerker: [...v.maerker], tekst }),
    naarSkrevet: () => foldVedSoegning('katalog', filtreEl),
    ingen: (tekst, ryd) => ingenTraef(tekst, { ryd, fjernFiltre: v.gruppe || v.maerker.size ? fjernFiltre : null }),
    liste: (vist) => el('div', { class: 'voksen-liste-boks' }, printFlere(vist, alle.length, f),
      el('ul', { class: 'voksen-liste', 'aria-label': 'Retter' }, vist.map((p) => katalogRaekke(p, f, ids, fuldt)))),
  });
  return voksenSkaerm('voksen-katalog', 'Retter', 'Ugens udvalg: ' + (f.udvalg ? ids.length + ' af ' + UDVALG_MAKS : 'ingen valgt'),
    // Uden et udvalg gør det første «Med» børnenes valg mindre: fra favoritterne og nye retter til én (review-fund 5)
    el('p', { class: 'voksen-hjaelp', tekst: 'Hjertet gør en ret til favorit. «Med» sætter en ret til ugeplanen i ugens udvalg. ' + (f.udvalg
      ? 'Børnene vælger kun mellem de retter, der er med.'
      : 'Nu vælger børnene mellem favoritterne og nye retter, højst ' + BOERN_KORT + '. Efter det første «Med» vælger de kun mellem dem, der er med.') }),
    el('div', { class: 'voksen-knapper' }, tilbage()),
    s.form,
    filtreEl,
    s.tal,
    s.boks,
    fejlLinje());
}

// ---------- #/voksen/dag/<1-7>: vælg en ret til dagen ----------
// Kataloget i vælg-tilstand: kun retter fra ugeplanen, med søgning, grupper, mærker og rækkefølge. Hver række har tid,
// pris, grønt og kniv (metaLinje i js/ugeplan.js) og «Vælg». Retten lægges på dagen gennem saetDag (gemPlan, der læser
// hele planen lige før, M1), og så går det tilbage til forsiden med fokus på dagen. Kunne den ikke gemmes, bliver man
// her, og beskeden står ved retten

// Posterne i den rækkefølge, de to kontakter siger (ellers som filtrer gav dem)
function sorterPoster(vist, v) {
  if (!v.billig && !v.kniv) return vist;
  const post = new Map(vist.map((p) => [p.m, p]));
  return sorterValg(vist.map((p) => p.m), { billig: v.billig, kniv: v.kniv }).map((m) => post.get(m));
}

function vaelgRet(m, i) {
  const dag = DAGE[i].toLowerCase();
  if (!saetDag(i, m.id)) {
    // Er planen låst af en nyere udgave imens, bliver skærmen til ugeLaastSkaerm, og den siger det. Ellers står beskeden
    // ved retten (review F6, 16-11: før stod en tredje udgave af teksten her, som skærmen aldrig viste)
    if (!Lager.hentUge(K.S.ids).laast) besked = gemFejl('Planen', m.id);
    tegnIgen('vaelg-' + m.id);
    return;
  }
  soegning.delete('vaelg');
  K.annoncer(m.navn + ' står nu på ' + dag + '.');
  K.naviger('#/voksen', () => {
    const b = document.querySelector('[data-fokus="dag-' + i + '"]');
    b?.focus({ preventScroll: true });
    b?.scrollIntoView({ block: 'nearest' });
  });
}

function vaelgRaekke(p, i, nu, n) {
  const m = p.m;
  const dag = DAGE[i].toLowerCase();
  const valgt = Boolean(nu) && nu.ret === m.id;
  return raekke(m, {
    valgt,
    lyn: true,
    under: [K.lynTekst(m), metaLinje(m, n), valgt ? el('span', { class: 'voksen-raekke-nu', tekst: 'Står på ' + dag + ' nu' }) : null],
    knap: medFokus(K.knap(valgt ? 'Behold' : 'Vælg', { klasse: 'lille vaelg-ret', ikonNavn: 'tjek', label: (valgt ? 'Behold ' : 'Vælg ') + m.navn + ' til ' + dag,
      onclick: () => vaelgRet(m, i) }), 'vaelg-' + m.id),
  });
}

function vaelgSkaerm(f, i) {
  const p = Lager.hentUge(K.S.ids);
  if (p.laast) return ugeLaastSkaerm();
  const nu = p.dage[i];
  const n = nu ? nu.n : p.n;
  const alle = poster(iPlanen(), f);
  const v = vaelgValg;
  const fjernFiltre = () => {
    v.gruppe = null;
    v.maerker.clear();
    v.hverdag = false;
    tegnIgen(kompakt() ? 'filtre-vaelg' : 'gruppe-alle');
  };
  const filtreEl = katalogFiltre(alle, v, 'vaelg');
  const s = soegeListe('vaelg', alle, {
    passer: (tekst) => sorterPoster(filtrer(alle, { gruppe: v.gruppe, maerker: [...v.maerker], tekst }).filter((p) => !v.hverdag || tilHverdag(p.m)), v),
    naarSkrevet: () => foldVedSoegning('vaelg', filtreEl),
    tom: 'Der er ingen retter i ugeplanen endnu.',
    ingen: (tekst, ryd) => ingenTraef(tekst, { ryd, fjernFiltre: v.gruppe || v.maerker.size || v.hverdag ? fjernFiltre : null }),
    liste: (vist) => el('ul', { class: 'voksen-liste', 'aria-label': 'Retter i ugeplanen' }, vist.map((x) => vaelgRaekke(x, i, nu, n))),
  });
  return voksenSkaerm('voksen-vaelg', 'Vælg ret til ' + DAGE[i].toLowerCase(),
    DAGE[i] + ' ' + dagDato(p.uge || planMandag(), i) + ' · ' + portionerTekst(n),
    el('div', { class: 'voksen-knapper' }, tilbage()),
    s.form,
    filtreEl,
    s.tal,
    s.boks,
    fejlLinje());
}
