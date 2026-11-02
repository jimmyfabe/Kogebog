// groent.js — «Mere grønt i maden» (voksenindstillingen på voksendelens forside, js/voksen-del.js): retter med hakket kød
// får halvt kød og halvt røde linser. Opskriften har ændringen som en lille rettelse oven på grundretten, ikke en kopi:
//   "tumbi": { …, "mere_groent": {
//     "ingredienser":     [{ "i", "tekst", "antal" }],                                    linje i får ny tekst og mængde
//     "nye_ingredienser": [{ "efter", "tekst", "ikon", "maengde", "vare", "antal", "enhed" }],  ny linje efter linje «efter»
//     "trin":             [{ "i", "@type", "text", "tumbi" }],                            trin i skiftes helt ud (kan udelades)
//     "nye_trin":         [{ "efter", "@type", "text", "tumbi" }],                        nyt trin efter trin «efter»
//     "pris_kr", "groent_g" }}                                       heltal for retten med mere grønt (når grundretten har dem)
// i og efter er 0-baserede indeks i GRUNDRETTENS lister; efter: -1 er først. En skiftet linje beholder vare, ikon og enhed,
// og «antal» står der, når grundrettens linje har et. Mængden følger teksten: lige så mange ord som grundrettens «maengde»
// («500 g» → «250 g»). Nye trin er HowToStep som de andre. «lyd» skrives aldrig i opskriften: den sætter medMereGroent.
// patchFejl tjekker formen. Resten (mindre kød, røde linser, og at retten med mere grønt overholder alle reglerne for en
// ret) tjekker validatoren (test/test-opskrifter.js). Ren: ingen DOM og intet lager (test/test-groent.js)

// Den linje, voksendelen viser på en ret med mere grønt (retten i voksenvisningen og printet)
export const GROENT_TEKST = 'Mere grønt: halvt kød, halvt røde linser';

const NOEGLER = {
  top: ['ingredienser', 'nye_ingredienser', 'trin', 'nye_trin', 'pris_kr', 'groent_g'],
  ingredienser: ['i', 'tekst', 'antal'],
  nye_ingredienser: ['efter', 'tekst', 'ikon', 'maengde', 'vare', 'antal', 'enhed'],
  trin: ['i', '@type', 'text', 'tumbi'],
  nye_trin: ['efter', '@type', 'text', 'tumbi'],
};
// Felterne i grundretten, som retten med mere grønt skal have sin egen værdi af, når grundretten har dem
const TAL_FELTER = ['pris_kr', 'groent_g'];

const erObjekt = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const erTekst = (v) => typeof v === 'string' && v.trim().length > 0;
const erIndeks = (v, fra, til) => Number.isInteger(v) && v >= fra && v <= til;

// Har opskriften en udgave med mere grønt («tumbi.mere_groent» står der, gyldig eller ej)
export const harMereGroent = (json) => erObjekt(json) && erObjekt(json.tumbi) && 'mere_groent' in json.tumbi;

// Fejl i formen på én liste i rettelsen. n er længden af grundrettens liste, grund dens «tumbi.ingredienser»
// (kun til «ingredienser»). Et skift har «i», et nyt punkt «efter»
function listeFejl(p, navn, n, grund) {
  if (!(navn in p)) return [];
  if (!Array.isArray(p[navn])) return ['«' + navn + '» skal være en liste'];
  const fejl = [];
  const sete = new Set();
  p[navn].forEach((x, k) => {
    const hvor = navn + ' ' + (k + 1);
    if (!erObjekt(x)) { fejl.push(hvor + ': skal være et objekt'); return; }
    for (const k2 of Object.keys(x)) {
      if (k2 === 'lyd') fejl.push(hvor + ': «lyd» skrives ikke i opskriften (js/groent.js sætter den)');
      else if (!NOEGLER[navn].includes(k2)) fejl.push(hvor + ': ukendt felt «' + k2 + '»');
    }
    if (erObjekt(x.tumbi) && 'lyd' in x.tumbi) fejl.push(hvor + ': «tumbi.lyd» skrives ikke i opskriften (js/groent.js sætter den)');
    const skift = NOEGLER[navn].includes('i');
    const felt = skift ? 'i' : 'efter';
    const fra = skift ? 0 : -1;
    if (!erIndeks(x[felt], fra, n - 1)) fejl.push(hvor + ': «' + felt + '» skal være et heltal fra ' + fra + ' til ' + (n - 1) + ' (indeks i grundretten), fandt ' + JSON.stringify(x[felt]));
    else if (skift && sete.has(x.i)) fejl.push(hvor + ': linje ' + x.i + ' skiftes to gange');
    if (skift) sete.add(x.i);
    const tekstFelt = navn.endsWith('ingredienser') ? 'tekst' : 'text';
    if (!erTekst(x[tekstFelt])) fejl.push(hvor + ': «' + tekstFelt + '» skal være en tekst, der ikke er tom');
    if (navn === 'ingredienser' && erIndeks(x.i, 0, n - 1)) fejl.push(...antalFejl(x, grund[x.i], hvor));
  });
  return fejl;
}

// En skiftet ingrediens har «antal», præcis når grundrettens linje har et (ellers stod den gamle mængde på indkøbslisten)
function antalFejl(x, g, hvor) {
  const harGrund = erObjekt(g) && 'antal' in g;
  if (harGrund !== ('antal' in x)) return [hvor + ': «antal» skal stå der, præcis når grundrettens linje har et (' + (harGrund ? 'den har' : 'den har ikke') + ')'];
  if (harGrund && !(typeof x.antal === 'number' && Number.isFinite(x.antal) && x.antal > 0)) return [hvor + ': «antal» skal være et tal over 0, fandt ' + JSON.stringify(x.antal)];
  return [];
}

// Fejl i formen på «tumbi.mere_groent» (tom liste, når den er i orden, eller når opskriften ingen har). Bruges af
// medMereGroent og af validatoren
export function patchFejl(json) {
  if (!harMereGroent(json)) return [];
  const p = json.tumbi.mere_groent;
  if (!erObjekt(p)) return ['«tumbi.mere_groent» skal være et objekt'];
  const ingr = Array.isArray(json.recipeIngredient) ? json.recipeIngredient : [];
  const trin = Array.isArray(json.recipeInstructions) ? json.recipeInstructions : [];
  const grundIngr = Array.isArray(json.tumbi.ingredienser) ? json.tumbi.ingredienser : [];
  const fejl = Object.keys(p).filter((k) => !NOEGLER.top.includes(k)).map((k) => 'ukendt felt «' + k + '»');
  fejl.push(...listeFejl(p, 'ingredienser', ingr.length, grundIngr), ...listeFejl(p, 'nye_ingredienser', ingr.length),
    ...listeFejl(p, 'trin', trin.length), ...listeFejl(p, 'nye_trin', trin.length));
  for (const k of TAL_FELTER) {
    if ((k in json.tumbi) !== (k in p)) fejl.push('«' + k + '» skal stå der, præcis når grundretten har «tumbi.' + k + '»');
    else if (k in p && !erIndeks(p[k], 0, Number.MAX_SAFE_INTEGER)) fejl.push('«' + k + '» skal være et heltal fra 0, fandt ' + JSON.stringify(p[k]));
  }
  return fejl;
}

// Grundrettens liste flettet med de skiftede og de nye punkter, i rækkefølge: [{ g, x, i }]. g er grundrettens punkt
// (undefined for et nyt), x er rettelsens punkt (undefined for et uændret), i er indekset i grundretten (null for et nyt).
// Nye punkter med samme «efter» kommer i rettelsens rækkefølge
function flet(grund, skift = [], nye = []) {
  const skiftAf = new Map(skift.map((x) => [x.i, x]));
  const efter = (k) => nye.filter((x) => x.efter === k).map((x) => ({ g: undefined, x, i: null }));
  return [...efter(-1), ...grund.flatMap((g, i) => [{ g, x: skiftAf.get(i), i }, ...efter(i)])];
}

// Rettelsens punkt uden «i» og «efter» (de hører kun til rettelsen)
const udenIndeks = (x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'i' && k !== 'efter'));

// Mængden følger teksten: lige så mange ord som grundrettens mængde (tom, når grundrettens er tom)
const maengdeAf = (tekst, grundMaengde) => {
  const n = erTekst(grundMaengde) ? grundMaengde.trim().split(/\s+/).length : 0;
  return n ? tekst.trim().split(/\s+/).slice(0, n).join(' ') : '';
};

// Ingredienserne: [{ tekst, ekstra }], hvor ekstra er linjen i «tumbi.ingredienser» med «lyd»
function ingredienser(json, p) {
  const grund = (json.recipeIngredient || []).map((tekst, i) => ({ tekst, ekstra: (json.tumbi.ingredienser || [])[i] || {} }));
  return flet(grund, p.ingredienser, p.nye_ingredienser).map(({ g, x, i }, k) => {
    if (!x) return { tekst: g.tekst, ekstra: { ...g.ekstra, lyd: 'ingrediens-' + (i + 1) } };
    const lyd = 'groen-ingrediens-' + (k + 1);
    if (!g) {
      const { tekst, ...ekstra } = udenIndeks(x);
      return { tekst, ekstra: { ...ekstra, lyd } };
    }
    const ekstra = { ...g.ekstra, maengde: maengdeAf(x.tekst, g.ekstra.maengde), lyd };
    if ('antal' in x) ekstra.antal = x.antal;
    return { tekst: x.tekst, ekstra };
  });
}

// Trinene med «tumbi.lyd»
function trin(json, p) {
  return flet(json.recipeInstructions || [], p.trin, p.nye_trin).map(({ g, x, i }, k) => {
    const s = x ? udenIndeks(x) : g;
    const lyd = x ? 'groen-' + (k + 1) : String(i + 1);
    return { ...s, tumbi: { ...(erObjekt(s.tumbi) ? s.tumbi : {}), lyd } };
  });
}

// Retten med mere grønt som en ny opskrift (grundretten røres ikke), uden «mere_groent», og med «lyd» på hver ingrediens
// og hvert trin. null, når opskriften ingen har; en Error, når formen er forkert (patchFejl), så fejlen ses i stedet for
// at retten i stilhed vises med alt kødet. «lyd» er filen under lyd/<id>/ (uden .mp3): et uændret punkt har grundrettens
// fil (ingrediens-<n> og <nr>), et nyt eller skiftet sin egen (groen-ingrediens-<n> og groen-<nr>, n og nr i retten med
// mere grønt). tale.js afspiller filen uden at tjekke teksten, så et indsat trin ville ellers få de gamle filer til at
// sige det forkerte trin (vaerktoej/lav-taleliste.js fejler, hvis én fil får to tekster)
export function medMereGroent(json) {
  if (!harMereGroent(json)) return null;
  const fejl = patchFejl(json);
  if (fejl.length) throw new Error('«tumbi.mere_groent» i «' + json.tumbi.id + '»: ' + fejl.join('; '));
  const ud = JSON.parse(JSON.stringify(json));
  const p = ud.tumbi.mere_groent;
  delete ud.tumbi.mere_groent;
  const ingr = ingredienser(ud, p);
  ud.recipeIngredient = ingr.map((x) => x.tekst);
  ud.tumbi.ingredienser = ingr.map((x) => x.ekstra);
  ud.recipeInstructions = trin(ud, p);
  for (const k of TAL_FELTER) if (k in p) ud.tumbi[k] = p[k];
  return ud;
}

// Den udgave af retten, der vises og regnes med: den med mere grønt (m.groen fra js/model.js), når indstillingen er slået
// til, og retten har en. Ellers grundretten
export const valgt = (m, mereGroent) => (mereGroent === true && m && m.groen ? m.groen : m);
