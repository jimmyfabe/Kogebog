// replikker.js — alt, appen siger højt: teksten og lydfilen (lyd/<fil>) for hver replik. Ingen DOM.
// Én kilde for app.js og vaerktoej/lav-taleliste.js, så en lydfil altid siger præcis det, appen ellers ville sige
// med iPad-stemmen. Ny tekst, der skal læses op, skrives her (test/test-lyd.js fejler, hvis app.js går udenom).
import { GRUPPER, DYR } from './katalog.js';
import { voksenFarer } from './model.js';
import { DAGE } from './tid.js';

const r = (tekst, fil) => ({ tekst, fil });

export const FAERDIG = r('Færdig! Godt gået. Velbekomme.', 'faelles/faerdig.mp3');
export const PRINT_HOLD = r('Den voksne holder knappen inde for at printe.', 'faelles/print-hold.mp3');

// Forsidens afsnit (hop-knapperne): «Aftensmad», «Bagning», «Søde sager»
export const gruppe = (id) => r(GRUPPER[id], 'faelles/gruppe-' + id + '.mp3');

// Forsiden: første tryk på et kort. Retten: andet tryk og højttaleren
export const retValgt = (m) => r(m.navn + '. Tryk igen for at starte.', m.id + '/valgt.mp3');
export const retAaben = (m) => r(m.navn + '. Det skal I bruge.', m.id + '/navn.mp3');

// Når retten åbnes, lige efter navnet: har den trin med kniv eller varme, siges det her, én gang. Før sagde hvert
// voksen-trin og hvert kort tryk på «Næste» «Hent en voksen», og det blev man træt af at høre på (Jimmy 21-10-2026).
// Trinene viser i stedet en gul trekant. Tre udgaver efter js/model.js' voksenFarer
const FARE = { begge: 'Der er varme og skarpe ting.', varme: 'Der er varme ting.', kniv: 'Der er skarpe ting.' };
export const VOKSEN_START = Object.fromEntries(Object.entries(FARE).map(([slags, fare]) => [slags,
  r('Den her ret laver du sammen med en voksen. ' + fare + ' Når du ser trekanten, holder den voksne knappen inde.',
    'faelles/voksen-start-' + slags + '.mp3')]));
// null, når barnet kan lave hele retten selv
export const voksenStart = (m) => {
  const f = voksenFarer(m);
  return f.length ? VOKSEN_START[f.length > 1 ? 'begge' : f[0]] : null;
};

// i tæller fra 0 (som m.ingredienser), filen fra 1
export const ingrediens = (m, i) => r(m.ingredienser[i].tekst, m.id + '/ingrediens-' + (i + 1) + '.mp3');

// Replikker uden lydfil: teksten afhænger af husstanden i voksendelen, så Røst kan ikke lave lyden på forhånd. fil er null,
// og tale.js lader iPad-stemmen sige teksten. Kun replikkerne i UDEN_LYD må mangle på talelisten (test/test-lyd.js)
export const UDEN_LYD = ['ingrediensSkaleret'];
// En ingredienslinje regnet om til husstandens portioner (js/skaler.js), fx «450 g pasta» i stedet for «300 g pasta»
export const ingrediensSkaleret = (tekst) => r(tekst, null);

// Også et voksen-trin siger kun trinnet: at en voksen hjælper, siger trekanten på skærmen (og voksenStart)
export const trin = (m, t) => r(t.tekst, m.id + '/' + t.nr + '.mp3');

// Hvor den anden timer kører: «trin 8» i samme ret (eller når retten ikke er hentet), ellers «Kødsovs, trin 8».
// timerRet er rettens model eller null. Bruges både til teksten på skærmen og til oplæsningen
export const timerHvor = (timerRet, nr, samme) => (samme || !timerRet ? 'trin ' + nr : timerRet.navn + ', trin ' + nr);

export const timerOptaget = (timerRet, nr, samme) => r(
  'Der kører allerede en timer på ' + timerHvor(timerRet, nr, samme) + '. Stop den først.',
  samme || !timerRet ? 'faelles/timer-optaget-' + nr + '.mp3' : timerRet.id + '/timer-optaget-' + nr + '.mp3');

// ---------- Børnene vælger ugens mad (#/uge/vaelg i js/ugeplan.js) ----------
// Børnene kan næsten ikke læse: hvert trin siger, hvad man skal, og hvert tryk siger, hvad man trykkede på.
// Dyrene hedder kun deres fornavn her (Bo, Rosa, Pip)
const dyrNavn = (id) => DYR[id].split(',')[0];
export const UGE_HVEM = r('Hvem skal vælge mad?', 'faelles/uge-hvem.mp3');
export const dyrVaelger = (id) => r(dyrNavn(id) + ' vælger. Tryk på den mad, du har lyst til.', 'faelles/uge-vaelger-' + id + '.mp3');
// Rosa og Pip har valgt så mange retter, som den voksne har sagt (1 eller 2). Bo (den voksne) har ingen grænse
export const dyrFaerdig = (id) => r(dyrNavn(id) + ' har valgt. Nu er det en andens tur.', 'faelles/uge-faerdig-' + id + '.mp3');
export const ugeRet = (m) => r(m.navn + '. Tryk på fluebenet for at vælge.', m.id + '/uge.mp3');
export const HVILKEN_DAG = r('Hvilken dag skal I spise det?', 'faelles/uge-hvilken-dag.mp3');
// i tæller fra 0 (mandag), filen fra 1
export const dag = (i) => r(DAGE[i] + '. Tryk på fluebenet for at vælge.', 'faelles/uge-dag-' + (i + 1) + '.mp3');
export const DAG_OPTAGET = r('Der er allerede mad på den dag. Tryk på en anden dag.', 'faelles/uge-dag-optaget.mp3');
export const UGE_TAK = r('Tak! Nu står det på ugeplanen. Hvem skal vælge nu?', 'faelles/uge-tak.mp3');
export const ALLE_VALGT = r('Tak! Nu har I begge valgt. Vis ugeplanen til en voksen.', 'faelles/uge-alle-valgt.mp3');
export const UGE_FULD = r('Nu er hele ugen fuld. Godt gået! Vis ugeplanen til en voksen.', 'faelles/uge-fuld.mp3');
// Valget kunne ikke gemmes (lageret er fuldt eller slået fra): barnet viser skærmen til en voksen (code review U7,
// 23-10). Ikke «Hent en voksen»: den sætning er taget ud af alle replikker (Jimmy 21-10, test-lyd.js)
export const GEM_FEJL = r('Det virkede ikke. Vis skærmen til en voksen.', 'faelles/uge-gem-fejl.mp3');
// Pilene mellem siderne med retter siger, hvad der skete (code review U8, 23-10)
export const SIDE_FLERE = r('Her er mere mad.', 'faelles/uge-side-flere.mp3');
export const SIDE_FORRIGE = r('Her er maden fra før.', 'faelles/uge-side-forrige.mp3');
