// test-opskrifter.js — tjekker alle opskrifter, index.json, lydlisten og grafikken. Kun Node's standardbibliotek.
// Kør:  node test/test-opskrifter.js [rodmappe]      (standard: repoets rod)
// Exit 0 = alt i orden. Exit 1 = mindst én fejl; hver fejl står på sin egen linje med fil og trin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  VERBER, VOKSEN_KRAV, KUN_VARME_HJAELP, VOKSEN_HJAELP, INGREDIENSER, RAA_IKONER, DYR, GRUPPER, MAKS_ORD,
  grafikVerbum, grafikIngrediens, grafikDyr, grafikRet, grafikGruppe, GRAFIK_FAERDIG,
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
const BLANDER = ['roere', 'haelde', 'piske']; // verber, der blander en ingrediens i dejen eller farsen
const HAENDER_I_DEJ = ['aelte', 'rulle', 'kagerulle']; // verber, hvor hænderne rører dejen eller farsen
const TAGE_UD = ['tage-ud', 'tage-ud-form']; // efter ovnen: en flad plade eller en dyb form
// Ordvagten går efter stammen: hvert ord, der begynder med stammen (eller har den inde i sig, hvor det står), fanges med
// alle bøjninger («smelte», «skære», «æggeblommer»). En liste over tilladte former mangler altid en form, og så slipper
// den igennem i stilhed. De få ord, der ikke er kniv, varme eller råt, står som hele ord i UNDTAGELSER. Mangler et ord
// dér, giver det et falsk fund, som man ser og retter: skriv ordet i UNDTAGELSER med grunden.
// Kniv og rivejern i trinteksten. «kniv» også inde i ord (brødkniven, køkkenkniven)
const KNIV_ORD = /(?<!\p{L})(?:riv|hak|skær|skræl)\p{L}*|\p{L}*kniv\p{L}*/giu;
// Varme i trinteksten. «kog» dækker også «kogeplade». «steg», «kog», «smelt», «komfur» og «ovn» også inde i ord
// (småkoge, gennemstegt, gaskomfur, bageovnen), «bag» kun forrest (ikke «tilbage»). Ikke «varm» og «brun»: de står i
// «en varm skive» og «brun farin»
const VARME_ORD = /(?<!\p{L})bag\p{L}*|\p{L}*(?:steg|kog|smelt|komfur|ovn)\p{L}*/giu;
// Redaktionelle noter («Kilden siger …», «(skøn)») står i «tumbi.kilde», ikke i det, der vises og læses op i køkkenet.
// Hele ord: «kildevand», «skønt» og «skønne» tæller ikke
const REDAKTION = /(?<!\p{L})(kild(?:e|en|es|ens|er|erne)|skøn(?:net|nes|smæssigt)?)(?!\p{L})/iu;
// Råt kød og æg i en ingredienslinje. Så skal ikonet være et af RAA_IKONER, ellers kræver validatoren ingen håndvask.
// «æg» kun forrest (ikke «læg» og «vægt»), resten også inde i ord (oksekød, oksefars, stegeflæsk, tigerrejer).
// Tun (på dåse) og skinke (pålæg) er ikke rå og står ikke her
const RAA_ORD = /(?<!\p{L})æg\p{L}*|\p{L}*(?:kød|fars|flæsk|kylling|bacon|laks|torsk|fisk|reje|medister)\p{L}*/giu;
// Hele ord (små bogstaver), som stammerne rammer, men som ikke er kniv, varme eller råt
const UNDTAGELSER = new Set([
  // Kniv
  'knivspids', 'knivspidsen', 'knivspidser', // et mål: «en knivspids salt»
  'skærebræt', 'skærebrættet', 'hakkebræt', 'hakkebrættet', // brættet skærer ikke
  'rivejern', 'rivejernet', // redskabet nævnt for sig («Læg rivejernet frem»). At rive er «riv», «river», «rive»
  'smørekniv', 'smørekniven', // sløv: barnet smører selv (verbet «smoere» har intet krav)
  'paletkniv', 'paletkniven', // flad og sløv. Vendes der på panden, er det varmen, og den kræver verbet «vende»
  'hakket', 'hakkede', // allerede hakket («de hakkede tomater»), ligesom «skåret» og «revet», som stammerne ikke rammer
  'hakkebøf', 'hakkebøffen', 'hakkebøffer', 'hakkebøfferne', // en ret af fars, ikke en kniv
  // Varme. Ikke «bageplade»: pladen kan være varm
  'bagepapir', 'bagepapiret', // papiret, ikke ovnen
  'bagepulver', 'bagepulveret', // en ingrediens («Rør mel og bagepulver forsigtigt i.», blondie trin 10)
  'baguette', 'baguetten', 'baguetter', 'bagel', 'bagels', // brød, ikke ovnen
  'kogebog', 'kogebogen', // bogen
  'bagefter', 'bagved', // tid og sted. «bag» alene (forholdsordet) kan ikke skelnes fra «Bag bollerne.»: falsk fund med vilje
  'hovne', 'hovner', 'hovnet', 'dovne', 'sovne', // «ovn» inde i ordet: «Lad rosinerne hovne op.»
  // Råt
  'ægte', // «ægte vanilje»
  'kyllingebouillon', 'kyllingefond', 'kødbouillon', 'fiskebouillon', 'fiskefond', 'fiskesauce', // kogt og færdig: ikonet «bouillon»
]);
// Det første ord i teksten, som stammen rammer, og som ikke er en undtagelse. Ellers null
function fund(re, tekst) {
  if (typeof tekst !== 'string') return null;
  for (const m of tekst.matchAll(re)) if (!UNDTAGELSER.has(m[0].toLowerCase())) return m;
  return null;
}
const LYD_RE =/^([a-z0-9]+(?:-[a-z0-9]+)*)\/(\d+|navn)\.mp3$/;

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
  // Forsidens afsnit: hver ret står i præcis én kendt gruppe (js/katalog.js GRUPPER), og grupperne har billeder
  for (const g of Object.keys(GRUPPER)) if (!findes(grafikGruppe(g))) fejlI(grafikGruppe(g), 'billedet mangler (gruppen «' + g + '»)');
  const index = laesJson('opskrifter/index.json');
  const IX = 'opskrifter/index.json';
  if (index) {
    if (index.version !== 2) fejlI(IX, '«version» skal være 2, fandt ' + JSON.stringify(index.version));
    for (const k of Object.keys(index)) if (k !== 'version' && k !== 'grupper') fejlI(IX, 'ukendt felt «' + k + '» (retterne står i «grupper»)');
    if (!Array.isArray(index.grupper) || !index.grupper.length) fejlI(IX, '«grupper» skal være en liste med mindst én gruppe');
    else {
      const gruppeAf = new Map(); // ret → gruppe
      const grupper = new Set();
      for (const g of index.grupper) {
        const gid = g && g.id;
        if (typeof gid !== 'string' || !Object.hasOwn(GRUPPER, gid)) { fejlI(IX, 'ukendt gruppe ' + (typeof gid === 'string' ? '«' + gid + '»' : JSON.stringify(gid)) + ' (lovlige: ' + liste(Object.keys(GRUPPER)) + ')'); continue; }
        if (grupper.has(gid)) fejlI(IX, 'gruppen «' + gid + '» står der to gange');
        grupper.add(gid);
        for (const k of Object.keys(g)) if (k !== 'id' && k !== 'retter') fejlI(IX, 'gruppen «' + gid + '»: ukendt felt «' + k + '»');
        if (!Array.isArray(g.retter) || !g.retter.length) { fejlI(IX, 'gruppen «' + gid + '» skal have mindst én ret i «retter»'); continue; }
        for (const id of g.retter) {
          if (typeof id !== 'string' || !ID_RE.test(id)) fejlI(IX, 'ugyldigt id ' + JSON.stringify(id));
          else if (gruppeAf.get(id) === gid) fejlI(IX, 'id «' + id + '» står der to gange');
          else if (gruppeAf.has(id)) fejlI(IX, '«' + id + '» står i to grupper (' + gruppeAf.get(id) + ' og ' + gid + '); en ret står i præcis én');
          else {
            if (!filer.includes(id + '.json')) fejlI(IX, 'retten «' + id + '» findes ikke (mangler opskrifter/' + id + '.json)');
            gruppeAf.set(id, gid);
          }
        }
      }
      for (const fil of filer) {
        if (!gruppeAf.has(fil.slice(0, -5))) fejlI('opskrifter/' + fil, 'står ikke i opskrifter/index.json');
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
    const redaktion = (hvor, v) => {
      const m = typeof v === 'string' && v.match(REDAKTION);
      if (m) f(hvor + ': «' + m[0] + '» er en redaktionel note: den hører til i «tumbi.kilde», ikke i teksten, der vises: «' + v + '»');
    };
    if (typeof r !== 'object' || Array.isArray(r)) { f('skal være ét JSON-objekt'); continue; }

    for (const k of PAAKRAEVET) if (!(k in r)) f('mangler «' + k + '»');
    for (const k of Object.keys(r)) if (!TOP_NOEGLER.has(k)) f('ukendt felt «' + k + '»');
    if ('@context' in r && r['@context'] !== 'https://schema.org') f('«@context» skal være "https://schema.org"');
    if ('@type' in r && r['@type'] !== 'Recipe') f('«@type» skal være "Recipe", fandt ' + JSON.stringify(r['@type']));
    for (const k of ['name', 'description', 'recipeYield']) if (k in r && !erTekst(r[k])) f('«' + k + '» skal være en tekst, der ikke er tom');
    for (const k of ['name', 'description', 'recipeYield']) redaktion('«' + k + '»', r[k]);
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
      // Punktum + mellemrum + stort bogstav er en ny sætning («ca. 3 dl» er det ikke)
      else if (/\.\s+\p{Lu}/u.test(t.kilde) && !/[.!?]$/.test(t.kilde.trim())) f('«tumbi.kilde» har flere sætninger og skal slutte med punktum');
    } else if ('tumbi' in r) f('«tumbi» skal være et objekt');

    if ('image' in r && r.image !== grafikRet(filId)) f('«image» skal være "' + grafikRet(filId) + '", fandt ' + JSON.stringify(r.image));
    if (!findes(grafikRet(filId))) fejlI(grafikRet(filId), 'billedet mangler (retten «' + filId + '»)');

    // Ingredienserne og deres ikoner
    const ingr = r.recipeIngredient;
    const retIkoner = new Set();
    if ('recipeIngredient' in r && (!Array.isArray(ingr) || !ingr.length || !ingr.every(erTekst))) f('«recipeIngredient» skal være en liste med tekster');
    if (Array.isArray(ingr)) ingr.forEach((x, i) => redaktion('ingrediens ' + (i + 1), x));
    if ('tool' in r && (!Array.isArray(r.tool) || !r.tool.every(erTekst))) f('«tool» skal være en liste med tekster');
    if (Array.isArray(r.tool)) r.tool.forEach((x, i) => redaktion('redskab ' + (i + 1), x)); // printet viser dem under «Redskaber»
    if (t && typeof t === 'object' && Array.isArray(ingr)) {
      const ti = t.ingredienser;
      if (!Array.isArray(ti)) f('«tumbi.ingredienser» mangler: én { "ikon", "maengde" } pr. linje i recipeIngredient');
      else {
        if (ti.length !== ingr.length) f('«tumbi.ingredienser» har ' + ti.length + ' linjer, men recipeIngredient har ' + ingr.length);
        ti.forEach((x, i) => {
          const hvor = 'ingrediens ' + (i + 1);
          if (!x || typeof x !== 'object') { f(hvor + ': skal være { "ikon", "maengde" }'); return; }
          if (!Object.hasOwn(INGREDIENSER, x.ikon)) f(hvor + ': ukendt ikon ' + JSON.stringify(x.ikon) + ' — brug et af: ' + liste(Object.keys(INGREDIENSER)));
          else retIkoner.add(x.ikon);
          const raaOrd = fund(RAA_ORD, ingr[i]);
          if (raaOrd && !RAA_IKONER.includes(x.ikon)) f(hvor + ': «' + raaOrd[0] + '» er råt kød eller æg, så ikonet skal være ' + RAA_IKONER.map((r) => '"' + r + '"').join(' eller ') + ', fandt ' + JSON.stringify(x.ikon));
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
      const forurenet = new Set(); // trin, der allerede er meldt for at røre andet efter det rå
      let raaDej = null; // { trin, ikoner }: det seneste trin, der blandede noget råt i dejen, indtil der æltes
      trin.forEach((s, i) => {
        const hvor = 'trin ' + (i + 1);
        tal.trin++;
        if (!s || s['@type'] !== 'HowToStep') f(hvor + ': «@type» skal være "HowToStep"');
        if (!s || !erTekst(s.text)) { f(hvor + ': mangler «text»'); return; }
        const ord = antalOrd(s.text);
        if (ord > MAKS_ORD) f(hvor + ': teksten er for lang (' + ord + ' ord, højst ' + MAKS_ORD + '): «' + s.text + '»');
        redaktion(hvor, s.text);
        const st = s.tumbi;
        if (!st || typeof st !== 'object') { f(hvor + ': mangler «tumbi» med et verbum'); return; }
        for (const k of Object.keys(st)) if (!TRIN_NOEGLER.has(k)) f(hvor + ': ukendt felt «tumbi.' + k + '»');
        if (!Object.hasOwn(VERBER, st.verbum)) f(hvor + ': ukendt verbum ' + JSON.stringify(st.verbum) + ' — brug et af: ' + liste(Object.keys(VERBER)));
        if ('voksen_hjaelp' in st && !Object.hasOwn(VOKSEN_HJAELP, st.voksen_hjaelp)) f(hvor + ': «voksen_hjaelp» skal være ' + liste(Object.keys(VOKSEN_HJAELP).map((x) => '"' + x + '"')) + ', fandt ' + JSON.stringify(st.voksen_hjaelp));
        // «voksen: true» viser «Hent en voksen»; «voksen_hjaelp» siger hvorfor. De to følges ad.
        if ('voksen' in st && st.voksen !== true) f(hvor + ': «voksen» skal være true (udelad feltet, når barnet kan selv), fandt ' + JSON.stringify(st.voksen));
        else if (st.voksen === true && !('voksen_hjaelp' in st)) f(hvor + ': "voksen": true kræver også «voksen_hjaelp» ("kniv" eller "varme")');
        if ('voksen_hjaelp' in st && st.voksen !== true) f(hvor + ': «voksen_hjaelp» kræver også "voksen": true');
        const krav = Object.hasOwn(VOKSEN_KRAV, st.verbum) ? VOKSEN_KRAV[st.verbum] : undefined;
        if (krav && (st.voksen !== true || st.voksen_hjaelp !== krav)) f(hvor + ': verbet «' + st.verbum + '» skal have "voksen": true og "voksen_hjaelp": "' + krav + '"');
        // Piske, pensle, mose og drysse kan barnet selv; hjælper den voksne, er det for varmens skyld (varmt fedt, gryde, pande)
        if (KUN_VARME_HJAELP.includes(st.verbum) && 'voksen_hjaelp' in st && st.voksen_hjaelp !== 'varme') f(hvor + ': verbet «' + st.verbum + '» kan barnet selv. Hjælper den voksne, er det for varmens skyld: brug "voksen_hjaelp": "varme", fandt ' + JSON.stringify(st.voksen_hjaelp));
        // Ordvagten: nævner teksten kniv, rivejern eller varme, er det den voksnes trin, uanset verbet, og hjælpen passer
        // til ordet. «voksen_hjaelp» er én værdi, så et trin med både kniv og varme skal deles i to
        const kniv = fund(KNIV_ORD, s.text);
        const varme = fund(VARME_ORD, s.text);
        const farlig = kniv || varme;
        if (farlig && st.voksen !== true) f(hvor + ': teksten nævner «' + farlig[0] + '» (kniv, rivejern eller varme), så trinnet skal have "voksen": true og «voksen_hjaelp»: «' + s.text + '»');
        else if (kniv && varme) f(hvor + ': teksten nævner både «' + kniv[0] + '» (kniv) og «' + varme[0] + '» (varme), men «voksen_hjaelp» kan kun være én af dem: del trinnet i to: «' + s.text + '»');
        else if (farlig && Object.hasOwn(VOKSEN_HJAELP, st.voksen_hjaelp)) {
          const skal = kniv ? 'kniv' : 'varme';
          if (st.voksen_hjaelp !== skal) f(hvor + ': teksten nævner «' + farlig[0] + '» (' + (kniv ? 'kniv eller rivejern' : 'varme') + '), så «voksen_hjaelp» skal være "' + skal + '", fandt ' + JSON.stringify(st.voksen_hjaelp) + ': «' + s.text + '»');
        }
        if (st.voksen === true) tal.voksentrin++;
        if ('timer_sek' in st) {
          if (!Number.isInteger(st.timer_sek) || st.timer_sek <= 0) f(hvor + ': «timer_sek» skal være et positivt heltal (sekunder), fandt ' + JSON.stringify(st.timer_sek));
          else if (st.timer_sek > MAKS_TIMER_SEK) f(hvor + ': «timer_sek» er over 4 timer (' + st.timer_sek + ')');
          else { timerSek += st.timer_sek; tal.timere++; }
        }
        if ('note' in st && !erTekst(st.note)) f(hvor + ': «note» skal være en tekst, der ikke er tom');
        redaktion(hvor + ' (noten)', st.note);
        if ('ikoner' in st) {
          if (!Array.isArray(st.ikoner) || !st.ikoner.length) f(hvor + ': «ikoner» skal være en liste med mindst ét ikon');
          else for (const ik of st.ikoner) {
            if (!Object.hasOwn(INGREDIENSER, ik)) f(hvor + ': ukendt ikon ' + JSON.stringify(ik));
            else if (!retIkoner.has(ik)) f(hvor + ': ikonet «' + ik + '» er ikke blandt rettens ingredienser');
          }
        }
        // Råt kød og æg. Dej eller fars med noget råt i er først indarbejdet efter æltningen: et trin, der ælter, former eller
        // ruller dejen ud efter et trin, der rører, hælder eller pisker det rå i, rører det rå igen, også selvom hænderne er
        // vasket imellem
        const egneRaa = (Array.isArray(st.ikoner) ? st.ikoner : []).filter((ik) => RAA_IKONER.includes(ik));
        let raa = egneRaa;
        let hvorfra = '';
        if (HAENDER_I_DEJ.includes(st.verbum) && raaDej) {
          raa = [...new Set([...egneRaa, ...raaDej.ikoner])];
          hvorfra = ' (dejen med ' + liste(raaDej.ikoner) + ' fra trin ' + raaDej.trin + ' er stadig rå)';
        }
        if (st.verbum === 'aelte') raaDej = null;
        if (BLANDER.includes(st.verbum) && egneRaa.length) raaDej = { trin: i + 1, ikoner: [...new Set([...(raaDej?.ikoner ?? []), ...egneRaa])] };
        const vask = trin.findIndex((x, k) => k > i && x && x.tumbi && x.tumbi.verbum === 'vaske-haender');
        if (raa.length && vask < 0) {
          f(hvor + ': rører råt kød eller æg (' + liste(raa) + ')' + hvorfra + ', men der kommer ikke et «vaske-haender»-trin bagefter');
        } else if (raa.length) {
          // Indtil hænderne er vasket, må barnet kun røre det rå (ellers kommer kødet over på mælkekartonen og saltet),
          // og der må ikke være en pause: så går barnet fra køkkenet med råt på hænderne
          for (let k = i + 1; k < vask; k++) {
            if (trin[k] && trin[k].tumbi && trin[k].tumbi.verbum === 'vente' && !forurenet.has(k)) {
              forurenet.add(k);
              f('trin ' + (k + 1) + ': en pause med råt kød eller æg på hænderne fra trin ' + (i + 1) + hvorfra + '. Vask hænderne før pausen');
              continue;
            }
            const ik = trin[k] && trin[k].tumbi && Array.isArray(trin[k].tumbi.ikoner) ? trin[k].tumbi.ikoner : [];
            const andre = ik.filter((x) => !RAA_IKONER.includes(x));
            if (andre.length && !forurenet.has(k)) {
              forurenet.add(k);
              f('trin ' + (k + 1) + ': rører ' + liste(andre) + ' med hænder, der har rørt råt kød eller æg i trin ' + (i + 1) + hvorfra + '. Flyt trinnet, så det rå kommer sidst før «vaske-haender»');
            }
          }
        }
      });
      // Råt kød og æg skal stå på det trin, hvor de røres: ellers kan validatoren ikke se, hvornår hænderne skal vaskes
      const raaITrin = new Set(trin.flatMap((s) => (s && s.tumbi && Array.isArray(s.tumbi.ikoner) ? s.tumbi.ikoner : [])));
      for (const ik of RAA_IKONER) {
        if (retIkoner.has(ik) && !raaITrin.has(ik)) f('«' + ik + '» står i ingredienserne, men intet trin har ikonet, så det kan ikke ses, hvornår hænderne skal vaskes');
      }
      // Når tiden i ovnen er gået, er pladen eller formen varm: efter et bage-trin (med eller uden timer) tager den voksne
      // det ud («tage-ud» med pladen eller «tage-ud-form» med en dyb form, begge altid voksen og varme). Bages der videre
      // (flutes uden staniol), kommer udtagningen efter det sidste bage-trin
      const verbum = (s) => s && s.tumbi && s.tumbi.verbum;
      trin.forEach((s, i) => {
        if (verbum(s) !== 'bage' || verbum(trin[i + 1]) === 'bage') return;
        if (!TAGE_UD.includes(verbum(trin[i + 1]))) {
          f('trin ' + (i + 1) + ': når tiden i ovnen er gået, tager en voksen det ud: trinnet efter skal have verbet "tage-ud" (fx «Tag pladen ud af ovnen.») eller "tage-ud-form" (fx «Tag formen ud af ovnen.»)');
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
