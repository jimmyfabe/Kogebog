// replikker.js — alt, appen siger højt: teksten og lydfilen (lyd/<fil>) for hver replik. Ingen DOM.
// Én kilde for app.js og vaerktoej/lav-taleliste.js, så en lydfil altid siger præcis det, appen ellers ville sige
// med iPad-stemmen. Ny tekst, der skal læses op, skrives her (test/test-lyd.js fejler, hvis app.js går udenom).
import { GRUPPER } from './katalog.js';
import { voksenFarer } from './model.js';

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

// Også et voksen-trin siger kun trinnet: at en voksen hjælper, siger trekanten på skærmen (og voksenStart)
export const trin = (m, t) => r(t.tekst, m.id + '/' + t.nr + '.mp3');

// Hvor den anden timer kører: «trin 8» i samme ret (eller når retten ikke er hentet), ellers «Kødsovs, trin 8».
// timerRet er rettens model eller null. Bruges både til teksten på skærmen og til oplæsningen
export const timerHvor = (timerRet, nr, samme) => (samme || !timerRet ? 'trin ' + nr : timerRet.navn + ', trin ' + nr);

export const timerOptaget = (timerRet, nr, samme) => r(
  'Der kører allerede en timer på ' + timerHvor(timerRet, nr, samme) + '. Stop den først.',
  samme || !timerRet ? 'faelles/timer-optaget-' + nr + '.mp3' : timerRet.id + '/timer-optaget-' + nr + '.mp3');
