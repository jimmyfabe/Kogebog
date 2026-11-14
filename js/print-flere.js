// print-flere.js — flere retter på papir, én pr. A4-side: print.html?retter=<id>,<id>… (i den rækkefølge) og
// print.html?alle (hele kogebogen i forsidens rækkefølge). Linkene laves af «Retter» i voksendelen (js/voksen-del.js),
// men adressen kommer udefra: retterTilPrint afviser alt, der ikke er præcis kendte id'er fra index.json, og intet fra
// adressen kommer i DOM'en (fejlene er faste tekster, og retterne tegnes af deres egne opskrifter). n og groen gælder
// hver ret, som i print.html?ret=<id> (js/print.js læser dem og giver retArk og groen med).
import { el, sideTitel } from './dom.js';
import { hentIndex, hentRet, ID_RE } from './data.js';
import { valgt } from './groent.js';

export const MAKS_TEGN = 12000; // tegn i retter=: alle index.json's id'er med komma fylder 4.960 (14-11-2026)

// Hvad adressen beder om. params: URLSearchParams, kendte: id'erne fra index.json i forsidens rækkefølge.
// Svar: { ids } (mindst én, hver kun én gang), eller { fejl } med 'tom' (retter= uden id'er), 'ukendt' (et id, der ligner
// et id, men ikke står i index.json) eller 'forkert' (alt andet: flere retter=, både alle og retter, ret= eller uge= med,
// alle med en værdi, tegn, der ikke må stå i et id, dubletter, for lang adresse). Ren funktion (test/test-print-flere.js)
export function retterTilPrint(params, kendte) {
  const retter = params.getAll('retter');
  const alle = params.getAll('alle');
  if (retter.length + alle.length !== 1 || params.has('ret') || params.has('uge')) return { fejl: 'forkert' };
  if (alle.length) return alle[0] === '' && kendte.length ? { ids: [...kendte] } : { fejl: alle[0] === '' ? 'tom' : 'forkert' };
  const raa = retter[0];
  if (raa === '') return { fejl: 'tom' };
  if (raa.length > MAKS_TEGN) return { fejl: 'forkert' };
  const ids = raa.split(',');
  if (!ids.every((id) => ID_RE.test(id)) || new Set(ids).size !== ids.length) return { fejl: 'forkert' };
  if (!ids.every((id) => kendte.includes(id))) return { fejl: 'ukendt' };
  return { ids };
}

const FEJL = {
  tom: ['Der er ingen retter at printe', 'Åbn printet igen fra «Retter» i voksendelen.'],
  ukendt: ['En af retterne findes ikke i kogebogen', 'Linket passer ikke til denne udgave. Åbn printet igen fra «Retter» i voksendelen.'],
  forkert: ['Linket til printet passer ikke', 'Åbn printet igen fra «Retter» i voksendelen.'],
};

// ark, printKnap, tilbage og besked(titel, tekst) er print.html's elementer og print.js' fejlside, som i js/print-uge.js.
// retArk(m, nr) tegner én ret som en side (js/print.js). groen: retterne med mere grønt, hvor de har en udgave med det
export async function printFlere({ ark, printKnap, tilbage, besked, params, retArk, groen }) {
  tilbage.href = 'index.html#/voksen/katalog';
  tilbage.textContent = 'Tilbage til retterne';
  printKnap.textContent = 'Print retterne';
  sideTitel('Retter til print · Tumbi Køkken');
  besked('Retter til print', 'Henter opskrifterne …');
  let kendte;
  try {
    kendte = (await hentIndex()).ids;
  } catch {
    besked('Opskrifterne kunne ikke hentes', 'Tjek, at enheden er på nettet, og genindlæs siden.');
    return;
  }
  const svar = retterTilPrint(params, kendte);
  if (svar.fejl) {
    besked(...FEJL[svar.fejl]);
    return;
  }
  const hentet = await Promise.all(svar.ids.map((id) => hentRet(id).then((m) => valgt(m, groen), (e) => e)));
  const retter = hentet.filter((m) => !(m instanceof Error));
  const mangler = hentet.length - retter.length;
  if (!retter.length) {
    besked('Opskrifterne kunne ikke hentes', 'Tjek, at enheden er på nettet, og genindlæs siden.');
    return;
  }
  sideTitel((retter.length === 1 ? retter[0].navn : retter.length + ' retter') + ' · Tumbi Køkken');
  printKnap.textContent = retter.length === 1 ? 'Print retten' : 'Print de ' + retter.length + ' retter';
  // Hele kogebogen er over 200 retter: skærmlæseren skal ikke læse dem alle op, fordi arket skifter (aria-live i print.html)
  ark.removeAttribute('aria-live');
  // replaceChildren laver null om til teksten «null», så advarslen kommer kun med, når der er en
  const advarsel = mangler ? [el('p', { class: 'besked print-advarsel', role: 'status', tekst: (mangler === 1 ? 'Én opskrift' : mangler + ' opskrifter') + ' kunne ikke hentes og er ikke med. Genindlæs siden for at prøve igen.' })] : [];
  ark.replaceChildren(...advarsel, ...retter.map((m, nr) => retArk(m, nr)));
  printKnap.disabled = false;
}
