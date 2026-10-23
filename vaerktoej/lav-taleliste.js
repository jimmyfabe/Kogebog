// lav-taleliste.js — listen over alt, appen læser op: [{ fil, tekst }]. «tekst» er det, iPad-stemmen ellers ville få
// (tilTale), med ordene i UDTALE skrevet, som Røst skal sige dem, og «fil» er stien under lyd/. Bygger på appens egne funktioner (js/replikker.js, js/model.js og
// js/tekst.js), så der ikke er en kopi af tekstreglerne her. Bruges af D:/Stemmer/lav_kogebog.py (Røst-stemmen),
// vaerktoej/indsaet-lyd.js og test/test-lyd.js.
// Kør:  node vaerktoej/lav-taleliste.js [udfil.json]     (uden udfil skrives listen på skærmen)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lavModel } from '../js/model.js';
import { tilTale } from '../js/tekst.js';
import { GRUPPER, DYR } from '../js/katalog.js';
import * as R from '../js/replikker.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const laesJson = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));

export function alleRetter() {
  const ids = [...new Set(laesJson('opskrifter/index.json').grupper.flatMap((g) => g.retter))];
  return ids.map((id) => lavModel(laesJson('opskrifter/' + id + '.json')));
}

// Alle replikker ({ tekst, fil }), som de står på skærmen (før tilTale). Samme fil kan stå flere gange
export function alleReplikker(retter = alleRetter()) {
  // Alle tre udgaver af R.voksenStart, også dem ingen ret bruger endnu (i dag har ingen ret kun kniv)
  const replikker = [R.FAERDIG, R.PRINT_HOLD, ...Object.values(R.VOKSEN_START), ...Object.keys(GRUPPER).map(R.gruppe)];
  for (const m of retter) {
    replikker.push(R.retValgt(m), R.retAaben(m));
    if (R.voksenStart(m)) replikker.push(R.voksenStart(m));
    m.ingredienser.forEach((_, i) => replikker.push(R.ingrediens(m, i)));
    for (const t of m.trin) replikker.push(R.trin(m, t));
  }
  // «Der kører allerede en timer på …»: en timer kan køre på hvert trin med timer, set fra samme ret («trin 8») eller
  // fra en anden ret («Kødsovs, trin 8»)
  for (const m of retter) {
    for (const t of m.trin) if (t.timerSek) replikker.push(R.timerOptaget(m, t.nr, false), R.timerOptaget(m, t.nr, true));
  }
  // Børnenes valg af ugens mad (js/ugeplan.js): alle tre dyr kan vælge, men kun Rosa og Pip bliver færdige (Bo er den
  // voksne), alle syv dage, og navnet på hver ret i ugeplanen (tumbi.ugeplan)
  replikker.push(R.UGE_HVEM, R.HVILKEN_DAG, R.DAG_OPTAGET, R.UGE_TAK, R.ALLE_VALGT, R.UGE_FULD, R.GEM_FEJL,
    ...Object.keys(DYR).map(R.dyrVaelger), ...['rosa', 'pip'].map(R.dyrFaerdig), ...[0, 1, 2, 3, 4, 5, 6].map(R.dag));
  for (const m of retter) if (m.uge) replikker.push(R.ugeRet(m));
  return replikker;
}

// Ord, Røst udtaler forkert, skrevet som de lyder. Kun til Røst: skærmen og iPad-stemmen får det rigtige ord.
// «Bagning» blev til «bau-ning» (agn → [ɑwn]); Jimmy valgte «Bæining» efter at have lyttet (21-10-2026)
export const UDTALE = { bagning: 'bæining' };

export function tilRoest(tekst) {
  return tekst.replace(/\p{L}+/gu, (ord) => {
    const lille = ord.toLowerCase();
    if (!Object.hasOwn(UDTALE, lille)) return ord;
    const ny = UDTALE[lille];
    return ord[0] === lille[0] ? ny : ny[0].toUpperCase() + ny.slice(1);
  });
}

export function lavTaleliste(retter = alleRetter()) {
  const liste = new Map();
  for (const x of alleReplikker(retter)) {
    const tekst = tilRoest(tilTale(x.tekst));
    const foer = liste.get(x.fil);
    if (foer && foer.tekst !== tekst) throw new Error(x.fil + ' bruges til to tekster: «' + foer.tekst + '» og «' + tekst + '»');
    if (!foer) liste.set(x.fil, { fil: x.fil, tekst });
  }
  return [...liste.values()];
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const liste = lavTaleliste();
  const json = JSON.stringify({ version: 1, antal: liste.length, liste }, null, 1) + '\n';
  if (process.argv[2]) {
    fs.writeFileSync(process.argv[2], json);
    console.log(liste.length + ' replikker skrevet til ' + process.argv[2]);
  } else process.stdout.write(json);
}
