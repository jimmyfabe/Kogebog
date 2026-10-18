// test-opskrifter.js — tjekker alle opskrifter, index.json, lydlisten og grafikken. Kun Node's standardbibliotek.
// Kør:  node test/test-opskrifter.js [rodmappe]      (standard: repoets rod)
// Exit 0 = alt i orden. Exit 1 = mindst én fejl; hver fejl står på sin egen linje med fil og trin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  VERBER, VOKSEN_KRAV, VOKSEN_HJAELP, INGREDIENSER, RAA_IKONER, DYR, MAKS_ORD,
  grafikVerbum, grafikIngrediens, grafikDyr, grafikRet, GRAFIK_FAERDIG,
} from '../js/katalog.js';
import { isoTilMinutter, antalOrd } from '../js/tekst.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TOP_NOEGLER = new Set([
  '@context', '@type', 'name', 'description', 'image', 'inLanguage', 'recipeYield', 'prepTime', 'cookTime',
  'totalTime', 'recipeIngredient', 'tool', 'recipeInstructions', 'tumbi', 'recipeCategory', 'recipeCuisine', 'keywords',
]);
const PAAKRAEVET = [
  '@context', '@type', 'name', 'description', 'image', 'inLanguage', 'recipeYield', 'totalTime',
  'recipeIngredient', 'tool', 'recipeInstructions', 'tumbi',
];
const TRIN_NOEGLER = new Set(['verbum', 'voksen', 'voksen_hjaelp', 'timer_sek', 'note', 'ikoner']);
const RET_TUMBI = new Set(['id', 'version', 'afproevet', 'kilde', 'ingredienser']);
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_RE = /^P(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/;
const MAKS_TIMER_SEK = 4 * 3600;
const LYD_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\/(\d+|navn)\.mp3$/;

const erTekst = (v) => typeof v === 'string' && v.trim().length > 0;
const liste = (a) => a.join(', ');

export function valider(rod = ROD) {
  const fejl = [];
  const fejlI = (fil, besked) => fejl.push(fil + ': ' + besked);
  const findes = (rel) => fs.existsSync(path.join(rod, rel));
  const tal = { retter: 0, trin: 0, timere: 0, voksentrin: 0 };

  function laesJson(rel) {
    let tekst;
    try {
      tekst = fs.readFileSync(path.join(rod, rel), 'utf8');
    } catch (e) {
      fejlI(rel, 'filen kan ikke læses (' + e.code + ')');
      return null;
    }
    try {
      return JSON.parse(tekst.replace(/^﻿/, ''));
    } catch (e) {
      fejlI(rel, 'er ikke gyldig JSON: ' + e.message);
      return null;
    }
  }

  // Grafikken: ét billede pr. verbum, pr. ingrediens-ikon, pr. dyr og fejringen
  for (const v of Object.keys(VERBER)) if (!findes(grafikVerbum(v))) fejlI(grafikVerbum(v), 'billedet mangler (verbum «' + v + '»)');
  for (const i of Object.keys(INGREDIENSER)) if (!findes(grafikIngrediens(i))) fejlI(grafikIngrediens(i), 'billedet mangler (ingrediens «' + i + '»)');
  for (const d of Object.keys(DYR)) if (!findes(grafikDyr(d))) fejlI(grafikDyr(d), 'billedet mangler (dyret «' + d + '»)');
  if (!findes(GRAFIK_FAERDIG)) fejlI(GRAFIK_FAERDIG, 'billedet mangler (fejringen)');

  // index.json og filerne skal passe sammen
  let filer = [];
  try {
    filer = fs.readdirSync(path.join(rod, 'opskrifter')).filter((n) => n.endsWith('.json') && n !== 'index.json').sort();
  } catch (e) {
    fejlI('opskrifter/', 'mappen kan ikke læses (' + e.code + ')');
  }
  const index = laesJson('opskrifter/index.json');
  let indexIds = [];
  if (index) {
    if (index.version !== 1) fejlI('opskrifter/index.json', '«version» skal være 1, fandt ' + JSON.stringify(index.version));
    if (!Array.isArray(index.retter) || !index.retter.length) fejlI('opskrifter/index.json', '«retter» skal være en liste med mindst én ret');
    else {
      indexIds = index.retter;
      const set = new Set();
      for (const id of indexIds) {
        if (typeof id !== 'string' || !ID_RE.test(id)) fejlI('opskrifter/index.json', 'ugyldigt id ' + JSON.stringify(id));
        else if (set.has(id)) fejlI('opskrifter/index.json', 'id «' + id + '» står der to gange');
        else if (!filer.includes(id + '.json')) fejlI('opskrifter/index.json', 'retten «' + id + '» findes ikke (mangler opskrifter/' + id + '.json)');
        set.add(id);
      }
      for (const fil of filer) {
        if (!set.has(fil.slice(0, -5))) fejlI('opskrifter/' + fil, 'står ikke i opskrifter/index.json');
      }
    }
  }

  const trinAntal = new Map(); // id → antal trin (til lydlisten)
  const sete = new Set();
  for (const fil of filer) {
    const rel = 'opskrifter/' + fil;
    const r = laesJson(rel);
    if (!r) continue;
    tal.retter++;
    const filId = fil.slice(0, -5);
    const f = (besked) => fejlI(rel, besked);
    if (typeof r !== 'object' || Array.isArray(r)) { f('skal være ét JSON-objekt'); continue; }

    for (const k of PAAKRAEVET) if (!(k in r)) f('mangler «' + k + '»');
    for (const k of Object.keys(r)) if (!TOP_NOEGLER.has(k)) f('ukendt felt «' + k + '»');
    if ('@context' in r && r['@context'] !== 'https://schema.org') f('«@context» skal være "https://schema.org"');
    if ('@type' in r && r['@type'] !== 'Recipe') f('«@type» skal være "Recipe", fandt ' + JSON.stringify(r['@type']));
    for (const k of ['name', 'description', 'recipeYield']) if (k in r && !erTekst(r[k])) f('«' + k + '» skal være en tekst, der ikke er tom');
    if ('inLanguage' in r && r.inLanguage !== 'da') f('«inLanguage» skal være "da"');
    for (const k of ['prepTime', 'cookTime', 'totalTime']) {
      if (k in r && (typeof r[k] !== 'string' || !ISO_RE.test(r[k]) || isoTilMinutter(r[k]) == null)) f('«' + k + '» skal være en ISO 8601-varighed som "PT15M" eller "PT1H10M", fandt ' + JSON.stringify(r[k]));
    }

    // Retten: tumbi-objektet
    const t = r.tumbi;
    let id = filId;
    if (t && typeof t === 'object') {
      for (const k of Object.keys(t)) if (!RET_TUMBI.has(k)) f('ukendt felt «tumbi.' + k + '»');
      if (t.id !== filId) f('tumbi.id ' + JSON.stringify(t.id) + ' passer ikke til filnavnet «' + filId + '»');
      if (typeof t.id === 'string') id = t.id;
      if (!ID_RE.test(filId)) f('filnavnet skal være små bogstaver, tal og bindestreg (æ, ø og å skrives ae, oe og aa)');
      if (sete.has(id)) f('id «' + id + '» bruges også af en anden opskrift');
      sete.add(id);
      if (t.version !== 1) f('«tumbi.version» skal være 1');
      if (typeof t.afproevet !== 'boolean') f('«tumbi.afproevet» skal være true eller false');
      if (!erTekst(t.kilde)) f('«tumbi.kilde» skal være en tekst, fx "Egen tekst"');
    } else if ('tumbi' in r) f('«tumbi» skal være et objekt');

    if ('image' in r && r.image !== grafikRet(filId)) f('«image» skal være "' + grafikRet(filId) + '", fandt ' + JSON.stringify(r.image));
    if (!findes(grafikRet(filId))) fejlI(grafikRet(filId), 'billedet mangler (retten «' + filId + '»)');

    // Ingredienserne og deres ikoner
    const ingr = r.recipeIngredient;
    const retIkoner = new Set();
    if ('recipeIngredient' in r && (!Array.isArray(ingr) || !ingr.length || !ingr.every(erTekst))) f('«recipeIngredient» skal være en liste med tekster');
    if ('tool' in r && (!Array.isArray(r.tool) || !r.tool.every(erTekst))) f('«tool» skal være en liste med tekster');
    if (t && typeof t === 'object' && Array.isArray(ingr)) {
      const ti = t.ingredienser;
      if (!Array.isArray(ti)) f('«tumbi.ingredienser» mangler: én { "ikon", "maengde" } pr. linje i recipeIngredient');
      else {
        if (ti.length !== ingr.length) f('«tumbi.ingredienser» har ' + ti.length + ' linjer, men recipeIngredient har ' + ingr.length);
        ti.forEach((x, i) => {
          const hvor = 'ingrediens ' + (i + 1);
          if (!x || typeof x !== 'object') { f(hvor + ': skal være { "ikon", "maengde" }'); return; }
          if (!(x.ikon in INGREDIENSER)) f(hvor + ': ukendt ikon ' + JSON.stringify(x.ikon) + ' — brug et af: ' + liste(Object.keys(INGREDIENSER)));
          else retIkoner.add(x.ikon);
          if (typeof x.maengde !== 'string') f(hvor + ': «maengde» skal være en tekst (tom, hvis der ingen mængde er)');
          else if (x.maengde && typeof ingr[i] === 'string' && !ingr[i].startsWith(x.maengde + ' ')) f(hvor + ': mængden «' + x.maengde + '» passer ikke til «' + ingr[i] + '»');
        });
      }
    }

    // Trinene
    const trin = r.recipeInstructions;
    if (!('recipeInstructions' in r)) { /* allerede meldt */ } else if (!Array.isArray(trin) || trin.length < 3) f('«recipeInstructions» skal være en liste med mindst 3 trin');
    else {
      trinAntal.set(filId, trin.length);
      let timerSek = 0;
      trin.forEach((s, i) => {
        const hvor = 'trin ' + (i + 1);
        tal.trin++;
        if (!s || s['@type'] !== 'HowToStep') f(hvor + ': «@type» skal være "HowToStep"');
        if (!s || !erTekst(s.text)) { f(hvor + ': mangler «text»'); return; }
        const ord = antalOrd(s.text);
        if (ord > MAKS_ORD) f(hvor + ': teksten er for lang (' + ord + ' ord, højst ' + MAKS_ORD + '): «' + s.text + '»');
        const st = s.tumbi;
        if (!st || typeof st !== 'object') { f(hvor + ': mangler «tumbi» med et verbum'); return; }
        for (const k of Object.keys(st)) if (!TRIN_NOEGLER.has(k)) f(hvor + ': ukendt felt «tumbi.' + k + '»');
        if (!(st.verbum in VERBER)) f(hvor + ': ukendt verbum ' + JSON.stringify(st.verbum) + ' — brug et af: ' + liste(Object.keys(VERBER)));
        if ('voksen_hjaelp' in st && !(st.voksen_hjaelp in VOKSEN_HJAELP)) f(hvor + ': «voksen_hjaelp» skal være ' + liste(Object.keys(VOKSEN_HJAELP).map((x) => '"' + x + '"')) + ', fandt ' + JSON.stringify(st.voksen_hjaelp));
        // «voksen: true» viser «Hent en voksen»; «voksen_hjaelp» siger hvorfor. De to følges ad.
        if ('voksen' in st && st.voksen !== true) f(hvor + ': «voksen» skal være true (udelad feltet, når barnet kan selv), fandt ' + JSON.stringify(st.voksen));
        else if (st.voksen === true && !('voksen_hjaelp' in st)) f(hvor + ': "voksen": true kræver også «voksen_hjaelp» ("kniv" eller "varme")');
        if ('voksen_hjaelp' in st && st.voksen !== true) f(hvor + ': «voksen_hjaelp» kræver også "voksen": true');
        const krav = VOKSEN_KRAV[st.verbum];
        if (krav && (st.voksen !== true || st.voksen_hjaelp !== krav)) f(hvor + ': verbet «' + st.verbum + '» skal have "voksen": true og "voksen_hjaelp": "' + krav + '"');
        if (st.voksen === true) tal.voksentrin++;
        if ('timer_sek' in st) {
          if (!Number.isInteger(st.timer_sek) || st.timer_sek <= 0) f(hvor + ': «timer_sek» skal være et positivt heltal (sekunder), fandt ' + JSON.stringify(st.timer_sek));
          else if (st.timer_sek > MAKS_TIMER_SEK) f(hvor + ': «timer_sek» er over 4 timer (' + st.timer_sek + ')');
          else { timerSek += st.timer_sek; tal.timere++; }
        }
        if ('note' in st && !erTekst(st.note)) f(hvor + ': «note» skal være en tekst, der ikke er tom');
        if ('ikoner' in st) {
          if (!Array.isArray(st.ikoner) || !st.ikoner.length) f(hvor + ': «ikoner» skal være en liste med mindst ét ikon');
          else for (const ik of st.ikoner) {
            if (!(ik in INGREDIENSER)) f(hvor + ': ukendt ikon ' + JSON.stringify(ik));
            else if (!retIkoner.has(ik)) f(hvor + ': ikonet «' + ik + '» er ikke blandt rettens ingredienser');
          }
          const raa = (Array.isArray(st.ikoner) ? st.ikoner : []).filter((ik) => RAA_IKONER.includes(ik));
          if (raa.length && !trin.slice(i + 1).some((x) => x && x.tumbi && x.tumbi.verbum === 'vaske-haender')) {
            f(hvor + ': rører råt kød eller æg (' + liste(raa) + '), men der kommer ikke et «vaske-haender»-trin bagefter');
          }
        }
      });
      if (trin[0] && trin[0].tumbi && trin[0].tumbi.verbum !== 'vaske-haender') f('trin 1 skal være «Vask hænderne.» (verbum "vaske-haender")');
      const total = isoTilMinutter(r.totalTime);
      if (total != null && timerSek / 60 > total) f('«totalTime» (' + total + ' min) er kortere end timerne tilsammen (' + Math.ceil(timerSek / 60) + ' min)');
    }
  }

  // Lydlisten: hver fil skal findes og høre til en rigtig ret og et rigtigt trin
  if (findes('lyd/liste.json')) {
    const lyd = laesJson('lyd/liste.json');
    if (lyd) {
      if (lyd.version !== 1) fejlI('lyd/liste.json', '«version» skal være 1');
      if (!Array.isArray(lyd.filer)) fejlI('lyd/liste.json', '«filer» skal være en liste');
      else for (const fil of lyd.filer) {
        const m = LYD_RE.exec(String(fil));
        if (!m) { fejlI('lyd/liste.json', 'ugyldigt filnavn ' + JSON.stringify(fil) + ' (forventer "<ret>/<trin>.mp3" eller "<ret>/navn.mp3")'); continue; }
        if (!trinAntal.has(m[1])) fejlI('lyd/liste.json', '«' + fil + '»: retten «' + m[1] + '» findes ikke');
        else if (m[2] !== 'navn' && (Number(m[2]) < 1 || Number(m[2]) > trinAntal.get(m[1]))) fejlI('lyd/liste.json', '«' + fil + '»: retten har kun ' + trinAntal.get(m[1]) + ' trin');
        if (!findes('lyd/' + fil)) fejlI('lyd/liste.json', '«' + fil + '» står på listen, men filen lyd/' + fil + ' findes ikke');
      }
    }
  }

  return { fejl, tal };
}

// Kørt direkte (ikke importeret af test-validator.js)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const rod = path.resolve(process.argv[2] || ROD);
  const { fejl, tal } = valider(rod);
  if (fejl.length) {
    console.error('FEJL i opskrifterne (' + fejl.length + '):');
    for (const x of fejl) console.error('  - ' + x);
    process.exit(1);
  }
  console.log('OK: ' + tal.retter + ' retter, ' + tal.trin + ' trin, ' + tal.voksentrin + ' voksen-trin, ' + tal.timere + ' timere — grafik og index.json passer.');
}
