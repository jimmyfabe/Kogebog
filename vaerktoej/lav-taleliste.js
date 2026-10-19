// lav-taleliste.js — listen over alt, appen læser op: [{ fil, tekst }]. «tekst» er præcis det, iPad-stemmen ellers
// ville få (tilTale), og «fil» er stien under lyd/. Bygger på appens egne funktioner (js/replikker.js, js/model.js og
// js/tekst.js), så der ikke er en kopi af tekstreglerne her. Bruges af D:/Stemmer/lav_kogebog.py (Røst-stemmen),
// vaerktoej/indsaet-lyd.js og test/test-lyd.js.
// Kør:  node vaerktoej/lav-taleliste.js [udfil.json]     (uden udfil skrives listen på skærmen)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lavModel } from '../js/model.js';
import { tilTale } from '../js/tekst.js';
import { GRUPPER } from '../js/katalog.js';
import * as R from '../js/replikker.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const laesJson = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));

export function alleRetter() {
  const ids = [...new Set(laesJson('opskrifter/index.json').grupper.flatMap((g) => g.retter))];
  return ids.map((id) => lavModel(laesJson('opskrifter/' + id + '.json')));
}

// Alle replikker ({ tekst, fil }), som de står på skærmen (før tilTale). Samme fil kan stå flere gange
export function alleReplikker(retter = alleRetter()) {
  const replikker = [R.FAERDIG, R.PRINT_HOLD, R.VOKSEN_HOLD, ...Object.keys(GRUPPER).map(R.gruppe)];
  for (const m of retter) {
    replikker.push(R.retValgt(m), R.retAaben(m));
    m.ingredienser.forEach((_, i) => replikker.push(R.ingrediens(m, i)));
    for (const t of m.trin) replikker.push(R.trin(m, t));
  }
  // «Der kører allerede en timer på …»: en timer kan køre på hvert trin med timer, set fra samme ret («trin 8») eller
  // fra en anden ret («Kødsovs, trin 8»)
  for (const m of retter) {
    for (const t of m.trin) if (t.timerSek) replikker.push(R.timerOptaget(m, t.nr, false), R.timerOptaget(m, t.nr, true));
  }
  return replikker;
}

export function lavTaleliste(retter = alleRetter()) {
  const liste = new Map();
  for (const x of alleReplikker(retter)) {
    const tekst = tilTale(x.tekst);
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
