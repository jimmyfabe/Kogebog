// test-tid.js — timerens tidslogik (js/tid.js), tekstfunktionerne (js/tekst.js), modellen (js/model.js) og index.json
// gennem hentIndex (js/data.js).
// Kør:  node test/test-tid.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nyTimer, timerStatus, formaterTid, varighed, varighedKort, varighedTale, HURTIG_SEK, planMandag, ugeNr, dagDato, dagIUgen, ugenErGaaet } from '../js/tid.js';
import { isoTilMinutter, minutterTekst, tilTale, talOrd, ukendtKoen, KOEN, antalOrd, delIngrediens, medBloede, utenBloede, ORD_MAKS, kortNavn, SAMLET_MAKS } from '../js/tekst.js';
import { medMereGroent } from '../js/groent.js';
import { faktorFor, skaleretIngrediens } from '../js/skaler.js';
import { lavModel, erLynhurtig, harTid, LYN_MIN } from '../js/model.js';
import { hentIndex } from '../js/data.js';
import { lavTaleliste, alleReplikker } from '../vaerktoej/lav-taleliste.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Alle retter i index.json med deres JSON, til testene af delingen på skærmen (medBloede og kortNavn)
const RETTER = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper.flatMap((g) => g.retter)
  .map((id) => ({ id, json: JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8')) }));
// Alle ingrediensnavne, som ingredienslisten kan vise dem: i alle retter, også skaleret og med mere grønt
function ingrediensNavne() {
  const navne = [];
  for (const { id, json } of RETTER) {
    for (const r of [json, medMereGroent(json)].filter(Boolean)) {
      const m = lavModel(r);
      m.ingredienser.forEach((x, i) => {
        navne.push({ id, navn: x.navn });
        if (faktorFor(m, 4)) for (const f of [0.5, 1.5, 2, 3]) navne.push({ id, navn: skaleretIngrediens(m, i, f).navn });
      });
    }
  }
  return navne;
}

test('timeren regner fra sluttidspunktet', () => {
  const t = nyTimer(1_000_000, 600);
  assert.equal(t.slut, 1_600_000);
  assert.deepEqual(timerStatus(t, 1_000_000), { restMs: 600_000, restSek: 600, andel: 1, faerdig: false });
  // Et halvt sekund inde vises stadig 10:00 (rundes op), ikke 9:59
  assert.equal(timerStatus(t, 1_000_500).restSek, 600);
  assert.equal(timerStatus(t, 1_001_000).restSek, 599);
  assert.equal(timerStatus(t, 1_300_000).andel, 0.5);
  // iPad'en sov i 20 minutter: timeren er færdig, ikke bagud
  const s = timerStatus(t, 1_000_000 + 20 * 60_000);
  assert.equal(s.faerdig, true);
  assert.equal(s.restMs, 0);
  assert.equal(s.andel, 0);
  // Uret er stillet tilbage: andelen bliver aldrig over 1
  assert.equal(timerStatus(t, 900_000).andel, 1);
});

test('timeren nægter forkerte varigheder', () => {
  assert.throws(() => nyTimer(0, 0));
  assert.throws(() => nyTimer(0, -1));
  assert.throws(() => nyTimer(0, 1.5));
});

test('hurtig-tilstand giver 2 sekunder', () => {
  assert.equal(varighed(600, true), HURTIG_SEK);
  assert.equal(varighed(600, false), 600);
});

test('tiden skrives som m:ss og h:mm:ss', () => {
  assert.equal(formaterTid(600), '10:00');
  assert.equal(formaterTid(5), '0:05');
  assert.equal(formaterTid(0), '0:00');
  assert.equal(formaterTid(3725), '1:02:05');
  assert.equal(varighedKort(600), '10 min');
  assert.equal(varighedKort(45), '45 sek');
  assert.equal(varighedKort(90), '1 min 30 sek');
  assert.equal(varighedKort(5400), '1 t 30 min');
  assert.equal(varighedTale(60), '1 minut');
  assert.equal(varighedTale(90), '1 minut og 30 sekunder');
  assert.equal(varighedTale(3661), '1 time, 1 minut og 1 sekund');
});

test('ISO 8601-varigheder', () => {
  assert.equal(isoTilMinutter('PT50M'), 50);
  assert.equal(isoTilMinutter('PT1H45M'), 105);
  assert.equal(isoTilMinutter('P1DT2H'), 1560);
  assert.equal(isoTilMinutter('50 min'), null);
  assert.equal(isoTilMinutter('PT'), null);
  // Hårde mellemrum: «2 t 30 min» brydes aldrig over to linjer (før stod «2 t 30» og «min» på hver sin linje på 901×800)
  assert.equal(minutterTekst(105), '1\u00a0t\u00a045\u00a0min');
  assert.equal(minutterTekst(30), '30\u00a0min');
  assert.equal(minutterTekst(60), '1\u00a0t');
  for (const min of [5, 30, 60, 105, 150, 600]) assert.ok(!/ /.test(minutterTekst(min)), minutterTekst(min) + ' har et almindeligt mellemrum');
});

test('enheder skrives ud til stemmen', () => {
  assert.equal(tilTale('Mål 2,5 dl mel.'), 'Mål to og en halv deciliter mel.');
  assert.equal(tilTale('1 spsk sukker'), 'en spiseskefuld sukker');
  assert.equal(tilTale('3 spsk olie'), 'tre spiseskefulde olie');
  assert.equal(tilTale('500 g hakket kød'), 'fem hundrede gram hakket kød');
  assert.equal(tilTale('1,25 l kogende vand'), 'en og en kvart liter kogende vand');
  assert.equal(tilTale('2,5 dl madlavningsfløde 15 %'), 'to og en halv deciliter madlavningsfløde femten procent');
  assert.equal(tilTale('Lad dejen hvile.'), 'Lad dejen hvile.');
  // æ, ø og å er bogstaver: «l» i «løg» og «g» i «gås» er ikke en enhed
  assert.equal(tilTale('1 løg'), 'et løg');
  assert.equal(tilTale('1 stort løg'), 'et stort løg');
  assert.equal(tilTale('2 gås'), 'to gås');
  assert.equal(tilTale('25 g gær'), 'femogtyve gram gær');
  assert.equal(tilTale('1 dlø'), 'en dlø');
  assert.equal(tilTale('2 kgå'), 'to kgå');
  assert.equal(tilTale('1 spskæ'), 'en spskæ');
  assert.equal(tilTale('1 tskø'), 'en tskø');
  assert.equal(tilTale('2 stkæ'), 'to stkæ');
  assert.equal(tilTale('ca. 16 stk.'), 'cirka seksten stykker');
  assert.equal(tilTale('1 kg kartofler'), 'et kilo kartofler');
  // Den bløde bindestreg i et kortnavn læses ikke op
  assert.equal(tilTale('Havregryns­kugler. Tryk igen for at starte.'), 'Havregrynskugler. Tryk igen for at starte.');
});

// Røst-stemmen læser teksten, som den står: brøker, «8-10» og forkortelser skrives ud (som i opskrifterne)
test('brøker, intervaller og forkortelser skrives ud til stemmen', () => {
  assert.equal(tilTale('½ tsk salt'), 'en halv teskefuld salt');
  assert.equal(tilTale('¾ tsk groft salt'), 'trekvart teskefuld groft salt');
  assert.equal(tilTale('¼ tsk salt'), 'en kvart teskefuld salt');
  assert.equal(tilTale('½ dl olivenolie'), 'en halv deciliter olivenolie');
  assert.equal(tilTale('4½ spsk kakao (ca. 25 g)'), 'fire og en halv spiseskefulde kakao (cirka femogtyve gram)');
  assert.equal(tilTale('175 g finvalsede havregryn (ca. 5¾ dl)'), 'hundrede og femoghalvfjerds gram finvalsede havregryn (cirka fem og trekvart deciliter)');
  assert.equal(tilTale('8-10 g salt'), 'otte til ti gram salt');
  assert.equal(tilTale('peber (og evt. salt)'), 'peber (og eventuelt salt)');
  assert.equal(tilTale('2 dl kerner, fx græskarkerner'), 'to deciliter kerner, for eksempel græskarkerner');
  // Kun hele ord: «ca» inde i et ord, «fx» i «fxo» og bindestregen i «hvede-, pizza-» røres ikke
  assert.equal(tilTale('Mexicansk sauce.'), 'Mexicansk sauce.');
  assert.equal(tilTale('fxo'), 'fxo');
  assert.equal(tilTale('500 g mel (hvede-, pizza- eller grahamsmel)'), 'fem hundrede gram mel (hvede-, pizza- eller grahamsmel)');
});

// Røst oversætter ikke cifre: «130 gram» blev «tretnulsnul…», «1,5 deciliter» «en kommer fem» (talegenkenderen, 19-10)
test('tal 0-9999 skrives som danske talord', () => {
  const tal = {
    0: 'nul', 1: 'en', 2: 'to', 7: 'syv', 10: 'ti', 11: 'elleve', 16: 'seksten', 19: 'nitten', 20: 'tyve', 21: 'enogtyve',
    22: 'toogtyve', 25: 'femogtyve', 30: 'tredive', 40: 'fyrre', 50: 'halvtreds', 60: 'tres', 70: 'halvfjerds', 75: 'femoghalvfjerds',
    80: 'firs', 90: 'halvfems', 99: 'nioghalvfems', 100: 'hundrede', 101: 'hundrede og en', 130: 'hundrede og tredive',
    150: 'hundrede og halvtreds', 175: 'hundrede og femoghalvfjerds', 185: 'hundrede og femogfirs', 200: 'to hundrede',
    250: 'to hundrede og halvtreds', 400: 'fire hundrede', 650: 'seks hundrede og halvtreds', 999: 'ni hundrede og nioghalvfems',
    1000: 'tusind', 1001: 'tusind og en', 1150: 'tusind et hundrede og halvtreds', 1200: 'tusind to hundrede',
    2000: 'to tusind', 2025: 'to tusind og femogtyve', 9999: 'ni tusind ni hundrede og nioghalvfems',
  };
  for (const [n, ord] of Object.entries(tal)) assert.equal(talOrd(Number(n)), ord, String(n));
  assert.equal(talOrd(1, 't'), 'et');
  assert.equal(talOrd(101, 't'), 'hundrede og et');
  assert.equal(talOrd(21, 't'), 'enogtyve', '«enogtyve» bøjes ikke');
  assert.equal(talOrd(12345), 'en to tre fire fem', 'over 9999: ciffer for ciffer');
  assert.throws(() => talOrd(-1));
  assert.throws(() => talOrd(1.5));
});

test('«en» eller «et» efter navneordets køn, og decimaler som man siger dem til børn', () => {
  const eks = {
    // 1 efter enhedens og navneordets køn
    '1 stort løg': 'et stort løg', '1 æg til pensling': 'et æg til pensling', '1 dl hvedemel': 'en deciliter hvedemel',
    '1 tsk salt': 'en teskefuld salt', '1 knivspids peber': 'en knivspids peber', '1 g gær': 'et gram gær', '1 l mælk': 'en liter mælk',
    '1 lille løg': 'et lille løg', '1 stk. citron': 'et stykke citron', '6 stk.': 'seks stykker', '1 fed hvidløg': 'et fed hvidløg',
    'i 1 minut': 'i et minut', '101 æg': 'hundrede og et æg',
    // Uden navneord efter tallet: kønnet på det sidst talte navneord
    '3 æg (2 til dejen og 1 til pensling)': 'tre æg (to til dejen og et til pensling)',
    // Timeren på trin 1: «trin et»
    'Der kører allerede en timer på trin 1. Stop den først.': 'Der kører allerede en timer på trin et. Stop den først.',
    // Decimaler
    '0,5 dl mælk': 'en halv deciliter mælk', '0,5 kg': 'et halvt kilo', '1,5 dl sødmælk': 'halvanden deciliter sødmælk',
    'Mål 1,5 dl mælk.': 'Mål halvanden deciliter mælk.', '1,5 kg': 'halvandet kilo', '1,5 tsk': 'halvanden teskefuld',
    '1,25 l kogende vand': 'en og en kvart liter kogende vand', '1,75 dl hvedemel': 'en og trekvart deciliter hvedemel',
    '1,2 kg melede kartofler': 'en komma to kilo melede kartofler', '2,5 dl': 'to og en halv deciliter', '2,35 l': 'to komma femogtredive liter',
    '1,05 l': 'en komma nul fem liter', '2,25 tsk': 'to og en kvart teskefulde',
    // Brøker efter køn (reviewets fund)
    '½ kg kartofler': 'et halvt kilo kartofler', '½ løg': 'et halvt løg', '1 ½ dl mælk': 'halvanden deciliter mælk',
    '1½ kg': 'halvandet kilo', '½-1 tsk salt': 'en halv til en teskefuld salt', '¼ kg smør': 'et kvart kilo smør',
    '¾ tsk groft salt': 'trekvart teskefuld groft salt', '5¾ dl': 'fem og trekvart deciliter', '2½ æg': 'to og et halvt æg',
    // Grader, procent, intervaller, regnestykker
    'Tænd ovnen på 180°C.': 'Tænd ovnen på hundrede og firs grader.', '200 °C': 'to hundrede grader', '1 °C': 'en grad',
    '15 %': 'femten procent', '8–10 g salt': 'otte til ti gram salt', '8 - 10 minutter': 'otte til ti minutter',
    '7 + 5 = 12': 'syv plus fem er tolv', '3 × 4 = 12': 'tre gange fire er tolv', '12 ÷ 4 = 3': 'tolv delt med fire er tre',
    // Forkortelser med stort forbogstav
    'Ca. 16 stk.': 'Cirka seksten stykker', 'ca. 650 g hvedemel': 'cirka seks hundrede og halvtreds gram hvedemel',
    'Evt. salt.': 'Eventuelt salt.', 'Fx persille.': 'For eksempel persille.',
    // Eksemplerne fra talegenkenderen 19-10
    '130 g revet ost': 'hundrede og tredive gram revet ost', '150 g blødt smør': 'hundrede og halvtreds gram blødt smør',
    '1 spsk olie': 'en spiseskefuld olie', 'Rul dejen til 16 kugler.': 'Rul dejen til seksten kugler.',
  };
  for (const [ind, ud] of Object.entries(eks)) assert.equal(tilTale(ind), ud, ind);
  // Kønnet kan ikke ses: stemmen siger «en», og test-tid.js melder ordet (så det skrives i KOEN)
  assert.deepEqual(ukendtKoen('1 dlø'), ['1 dlø']);
  assert.deepEqual(ukendtKoen('½ blomkål'), ['½ blomkål']);
  assert.deepEqual(ukendtKoen('2 blomkål og 3 gulerødder'), [], 'kønnet betyder kun noget efter 1, ½ og x,5');
  // Kønnet fra et tidligere navneord gælder kun, når intet ord følger efter tallet, eller ordet er til, og eller eller.
  // Følger et ukendt navneord, meldes det (før: «et æg og et banan», og ukendtKoen gav []). «banan» står i KOEN siden
  // isdesserterne (02-11-2026), så eksemplet bruger nu «blomkål», der ikke gør
  assert.equal(tilTale('1 æg og 1 blomkål'), 'et æg og en blomkål');
  assert.deepEqual(ukendtKoen('1 æg og 1 blomkål'), ['1 blomkål'], 'et ukendt navneord efter et kendt skal meldes');
  assert.deepEqual(ukendtKoen('1 æg og 1 lille blomkål'), ['1 lille blomkål']);
  assert.equal(tilTale('1 æg, gerne 1 eller 2'), 'et æg, gerne et eller to', 'intet navneord efter tallet: det sidste køn');
  assert.deepEqual(ukendtKoen('3 æg (2 til dejen og 1 til pensling)'), []);
  assert.deepEqual(ukendtKoen('1 æg og 1'), []);
});

// Alt, appen siger (lav-taleliste.js), uden et eneste ciffer eller tegn, som stemmen læser forkert eller slet ikke.
// En positivliste (bogstaver, mellemrum og almindelig tegnsætning), ikke en sortliste: sortlisten lod «3/4 dl»
// («tre/fire»), «&», «—», «x» og «10 min.» («ti min.») gå igennem. Forkortelser, stemmen ikke kender, er forbudt.
// «min» giver et falsk fund ved «min» (mit), det sikre fejlvalg: skriv så teksten om
const TALE_TEGN = /[^\p{L}\s.,!?;:()«»'-]/u;
const TALE_FORKORTET = /(?<!\p{L})(?:min|kl\.|f\.eks\.|fx\.|x)(?!\p{L})/iu;
const kanSiges = (t) => !TALE_TEGN.test(t) && !TALE_FORKORTET.test(t);

test('talformens positivliste fanger de tegn og forkortelser, sortlisten lod gå igennem', () => {
  for (const t of ['tre/fire deciliter', 'salt & peber', 'to x tre', 'otte — ti', 'ti min.', 'ti min', 'Kl. tolv', 'f.eks. mel',
    'fx. mel', 'B12', 'et halvt ½', 'hundrede °', 'tre + fire', 'otte–ti', 'en * to', 'rør "godt"']) assert.ok(!kanSiges(t), t);
  for (const t of ['Mål halvanden deciliter mælk.', 'Hent en voksen. Steg pandekagen!', 'Tumbi siger: «Smag» (forsigtigt); godt?',
    'Rør-rør', "kokkens'", 'Vent i ti minutter, til den er gylden.']) assert.ok(kanSiges(t), t);
});

test('talformen af alle replikker har kun bogstaver og almindelig tegnsætning (ingen cifre, tegn eller forkortelser)', () => {
  const liste = lavTaleliste();
  assert.ok(liste.length >= 377, 'fandt kun ' + liste.length + ' replikker');
  const tilbage = liste.filter((x) => !kanSiges(x.tekst)).map((x) => x.fil + ': ' + x.tekst);
  assert.deepEqual(tilbage, []);
});

test('kønnet efter 1, ½ og x,5 kan ses i alle replikker (navneordet står i KOEN)', () => {
  const ukendte = [...new Set(alleReplikker().flatMap((x) => ukendtKoen(x.tekst).map((u) => x.fil + ': «' + u + '»')))];
  assert.deepEqual(ukendte, [], 'skriv navneordets køn i KOEN i js/tekst.js');
  for (const [ord, k] of Object.entries(KOEN)) assert.ok(k === 't' || k === 'n' || k === null, ord + ': ' + k);
});

test('ord tælles uden tegnsætning', () => {
  assert.equal(antalOrd('Smag! Sukker eller syltetøj?'), 4);
  assert.equal(antalOrd('Rør, til dejen er glat.'), 5);
  assert.equal(antalOrd('Mål 2,5 dl mel.'), 4);
});

test('ingrediensen deles i mængde og navn', () => {
  assert.deepEqual(delIngrediens('2,5 dl hvedemel', '2,5 dl'), { maengde: '2,5 dl', navn: 'hvedemel' });
  assert.deepEqual(delIngrediens('smør til panden', ''), { maengde: '', navn: 'smør til panden' });
  assert.deepEqual(delIngrediens('3 æg', '4'), { maengde: '', navn: '3 æg' });
});

// Review V1 (17-11): ingrediensnavnene brød midt i ordet uden tegn i de smalle kolonner («grøntsagsbo|uillonternin|g»,
// «kyllingebr|yst», «gulerødde|r» i WebKit på 360-1280 px). medBloede deler de lange ord med bløde bindestreger, kun på
// skærmen: teksten uden dem er den samme
test('lange ord får bløde bindestreger til skærmen, og teksten uden dem er den samme (review V1)', () => {
  const vis = (t) => medBloede(t).replace(/\u00ad/g, '·');
  assert.equal(vis('1 grøntsagsbouillonterning'), '1 grønt·sags·bouillon·terning');
  assert.equal(vis('Kyllingebryst'), 'Kyllinge·bryst');
  assert.equal(vis('3 store gulerødder'), '3 store gule·rødder');
  assert.equal(vis('frisk appelsinjuice'), 'frisk appel·sin·juice');
  // Et led får kun en deling efter sig, når der er mindst ORD_REST bogstaver tilbage
  assert.equal(vis('appelsiner'), 'appel·siner');
  assert.equal(vis('spaghettien'), 'spaghet·tien');
  // Korte ord og ord, forfatteren allerede har delt, står urørte
  assert.equal(vis('1 gulerod'), '1 gulerod');
  assert.equal(vis('Grøntsags\u00adblanding'), 'Grøntsags·blanding');
  assert.equal(vis('Kikærteburger i fuld\u00adkornsbolle'), 'Kikærte·burger i fuld·kornsbolle');
  // Ord på højst ORD_MAKS bogstaver står urørte, og et ord på 9 med brede bogstaver deles («kokosmæl|k» på 360 px)
  assert.equal(vis('lasagne og kokosmælk'), 'lasagne og kokos·mælk');
  assert.equal(vis('chokoladeis'), 'chokolade·is');
  // «bouillon» og «chokolade» står hele (review V9 og V16): «bouil-/lon» og «choko-/lade» var svære at læse
  assert.equal(vis('2 bouillonterninger'), '2 bouillon·ternin·ger');
  assert.equal(vis('chokoladestykker og chokolade'), 'chokolade·stykker og chokolade');
  // … men ikke med et tegn lige efter: «chokolade,» var for bred til 360 px og blev brudt foran kommaet (e2e titler 17-11)
  assert.equal(vis('100 g chokolade, fx mørk'), '100 g choko·lade, fx mørk');
  assert.equal(vis('hvid Chokolade.'), 'hvid Choko·lade.');
  assert.equal(vis('Chokolade-milkshake og chokolade'), 'Chokolade-milkshake og chokolade');
  // Et ord, der begynder med et kort led uden at være sammensat med det, deles ikke forkert
  assert.equal(vis('Finskbrød'), 'Finskbrød');
  // Alle ingredienser i alle retter, også skaleret og med mere grønt: uden de bløde bindestreger er teksten den samme,
  // og intet stykke er længere end ORD_MAKS bogstaver. Fejler testen på et nyt ord, så skriv dets led i ORDLED.
  // Undtaget er «chokolade», der med vilje står hel (review V16)
  const HELE = new Set(['chokolade']);
  const lange = new Set();
  const navne = ingrediensNavne();
  for (const { id, navn } of navne) {
    const delt = medBloede(navn);
    assert.equal(utenBloede(delt), utenBloede(navn));
    for (const stykke of delt.split(/[^\p{L}]+/u)) if (stykke.length > ORD_MAKS && !HELE.has(stykke.toLowerCase())) lange.add(stykke + ' (' + id + ')');
  }
  assert.ok(navne.length > 3000, navne.length + ' navne');
  assert.deepEqual([...lange], [], 'stykker på over ' + ORD_MAKS + ' bogstaver i ingrediensnavnene');
});

// Review V3 (17-11): et kort ord alene på en linje i kortets navn på 360 px. kortNavn deler som medBloede, men navnet
// slutter aldrig med et stykke på højst 4 bogstaver efter en deling, og et kort sidste ord hænger sammen med ordet før
test('kortets navn: intet kort stykke til sidst, og et kort sidste ord hænger på ordet før (review V3)', () => {
  const vis = (t) => kortNavn(t).replace(/\u00ad/g, '·').replace(/\u00a0/g, '_');
  assert.equal(vis('Kikærteburger i fuldkornsbolle'), 'Kikærte·burger i fuld·korns·bolle');
  assert.equal(vis('Cowboybønner med pølser og majs'), 'Cowboybønner med pølser og_majs');
  assert.equal(vis('Fiskepinde med kartoffelbåde'), 'Fiske·pinde med kartof·felbåde');
  assert.equal(vis('Nytårstorsk med sennepssovs'), 'Nytårs·torsk med sennepssovs');
  assert.equal(vis('Brunede kartofler'), 'Brunede kartofler');
  assert.equal(vis('Pandekager'), 'Pandekager');
  // Alle retters navne: uden de bløde bindestreger og med almindelige mellemrum er teksten den samme
  for (const { id, json: { name: navn } } of RETTER) {
    assert.equal(utenBloede(kortNavn(navn)).replace(/\u00a0/g, ' '), utenBloede(navn).replace(/\u00a0/g, ' '), id);
  }
});

// Review K12 (17-11): kortNavn fjernede også forfatterens egen deling foran et kort sidste stykke, så «Lille
// kransekage|tårn» fik et ord på 14 bogstaver, der ikke kunne deles. Delingen fjernes kun, når stykket, de to bliver til,
// har højst SAMLET_MAKS bogstaver
test('kortets navn: forfatterens deling af et langt ord bliver stående (review K12)', () => {
  const vis = (t) => kortNavn(t).replace(/\u00ad/g, '·').replace(/\u00a0/g, '_');
  assert.equal(SAMLET_MAKS, ORD_MAKS + 4);
  assert.equal(vis('Lille kransekage\u00adtårn'), 'Lille kransekage·tårn');
  assert.equal(vis('Lille kranse\u00adkage\u00adtårn'), 'Lille kranse·kagetårn');
  // Et stykke på præcis SAMLET_MAKS bogstaver samles stadig (sennepssovs har 11)
  assert.equal(vis('Pasta med abcdefgh\u00adijkl'), 'Pasta med abcdefghijkl');
  assert.equal(vis('Pasta med abcdefghi\u00adjklm'), 'Pasta med abcdefghi·jklm');
  // Alle retters navne: et stykke, som kortNavn samler, har højst SAMLET_MAKS bogstaver, og kransekagetårnet deles
  // «kranse·kagetårn», så titlen ikke ender med «tårn» alene (review V11)
  const for_lange = [];
  for (const { id, json: { name: navn } } of RETTER) {
    const foer = new Set(medBloede(navn).split(/[^\p{L}]+/u));
    for (const s of kortNavn(navn).split(/[^\p{L}]+/u)) if (!foer.has(s) && s.length > SAMLET_MAKS) for_lange.push(s + ' (' + id + ')');
  }
  assert.deepEqual(for_lange, []);
  // En deling, kortNavn lader stå, fordi stykket ville blive for langt, er forfatterens egen. Efter V16 delte koden
  // «Banansplit med chokolade·sovs», og «chokoladesovs» (13 bogstaver) kunne ikke stå på linje med «med» på 360 px, så
  // «med» stod alene (e2e titler 17-11). Så deler forfatteren ordet i opskriften: «choko·lade·sovs» → «choko·ladesovs»
  const kortSidst = /\u00ad\p{L}{1,4}$/u;
  assert.deepEqual(RETTER.filter(({ json: { name: navn } }) => kortSidst.test(kortNavn(navn)) && !kortSidst.test(navn)).map((r) => r.id), []);
  const kransekage = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/lille-kransekagetaarn.json'), 'utf8')).name;
  assert.equal(vis(kransekage), 'Lille kranse·kagetårn');
});

// Review K14 (17-11): testene ovenfor ser kun på længden af stykkerne, ikke på, om ordet er delt det rigtige sted
// («val·nød·der»). Alle delte ord på skærmen (ingredienserne, også skaleret og med mere grønt, og kortenes navne) står
// derfor på en fast liste, som et menneske har læst igennem. Et nyt eller ændret ord fejler testen: se delingen efter,
// og skriv det på listen (eller ret ORDLED i js/tekst.js)
test('alle delte ord på skærmen står på den gennemlæste liste i test/delte-ord.txt (review K14)', () => {
  assert.equal(medBloede('valnødder').replace(/\u00ad/g, '·'), 'val·nødder');
  const nu = new Set();
  const tilfoej = (tekst) => {
    for (const o of tekst.split(/[^\p{L}\u00ad]+/u)) if (o.includes('\u00ad')) nu.add(o.replace(/\u00ad/g, '·').toLowerCase());
  };
  for (const { navn } of ingrediensNavne()) tilfoej(medBloede(navn));
  for (const { json } of RETTER) tilfoej(kortNavn(json.name));
  const liste = new Set(fs.readFileSync(path.join(ROD, 'test/delte-ord.txt'), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#')));
  const nye = [...nu].filter((o) => !liste.has(o));
  const vaek = [...liste].filter((o) => !nu.has(o));
  assert.deepEqual({ nye, vaek }, { nye: [], vaek: [] },
    'Nye delte ord: se delingen efter, og skriv dem i test/delte-ord.txt. Væk: fjern dem fra listen');
  assert.ok(liste.size > 200, liste.size + ' ord på listen');
});

test('modellen af pandekagerne', () => {
  const json = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/pandekager.json'), 'utf8'));
  const m = lavModel(json);
  assert.equal(m.id, 'pandekager');
  assert.equal(m.minutter, 35);
  assert.equal(m.trin.length, 11);
  assert.equal(m.ingredienser[0].ikon, 'mel');
  assert.equal(m.ingredienser[0].navn, 'hvedemel');
  assert.equal(m.trin[8].timerSek, 60);
  assert.equal(m.trin[9].voksen, true);
  assert.equal(m.trin[9].voksenSlags, 'varme');
  assert.equal(m.trin[0].voksen, false);
  assert.equal(m.trin[0].voksenSlags, null);
  assert.equal(m.afproevet, false);
});

// ⚡ på tallerkenen: højst 20 minutter i alt. Ingen tid (null), 0 minutter eller ingen model giver intet mærke
test('lynhurtig ret: højst 20 minutter i alt', () => {
  assert.equal(LYN_MIN, 20);
  assert.equal(erLynhurtig({ minutter: 19 }), true);
  assert.equal(erLynhurtig({ minutter: 20 }), true);
  assert.equal(erLynhurtig({ minutter: 21 }), false);
  assert.equal(erLynhurtig({ minutter: null }), false);
  assert.equal(erLynhurtig({ minutter: 0 }), false);
  assert.equal(erLynhurtig(null), false);
  // Fra opskriften: totalTime PT20M (wok-med-nudler) og PT35M (pandekager) gennem lavModel
  const laes = (id) => lavModel(JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8')));
  assert.equal(erLynhurtig(laes('wok-med-nudler')), true);
  assert.equal(erLynhurtig(laes('pandekager')), false);
});

// Minuttallet på forsidens kort: kun et positivt antal minutter. Uden totalTime, 0 minutter, et ugyldigt tal eller
// ingen model giver intet tal
test('minuttallet vises kun ved et positivt antal minutter', () => {
  assert.equal(harTid({ minutter: 1 }), true);
  assert.equal(harTid({ minutter: 150 }), true);
  for (const minutter of [null, undefined, 0, -5, NaN, Infinity, '25']) assert.equal(harTid({ minutter }), false, String(minutter));
  assert.equal(harTid(null), false);
  assert.equal(harTid(lavModel({ name: 'x', tumbi: { id: 'x' } })), false); // ingen totalTime
  assert.equal(harTid(lavModel({ name: 'x', totalTime: 'PT0M', tumbi: { id: 'x' } })), false);
  assert.equal(harTid(lavModel({ name: 'x', totalTime: 'PT1H45M', tumbi: { id: 'x' } })), true);
});

// Ugeplanen: kun retter med «tumbi.ugeplan» får uge-delen, med de felter, saml() i js/indkoeb.js læser
test('modellen har ugeplanens felter, når retten er i ugeplanen', () => {
  const laes = (id) => lavModel(JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8')));
  assert.equal(laes('pandekager').uge, null);
  const k = laes('koedsovs').uge;
  assert.deepEqual([k.portioner, k.prisKr, k.groentG, k.tumbi.ugeplan, k.tumbi.ingredienser.length], [4, 86, 1070, true, 12]);
});

// Ugerne regnes i UTC: sommertid (25-10-2026) flytter ikke en dag, og mandag er dagen selv
test('ugeplanens mandag, ugenummer og datoer', () => {
  assert.equal(planMandag(new Date(2026, 9, 22, 23, 30)), '2026-10-26', 'torsdag: næste mandag');
  assert.equal(planMandag(new Date(2026, 9, 26, 0, 5)), '2026-10-26', 'mandag: samme dag');
  assert.equal(planMandag(new Date(2026, 9, 25, 12)), '2026-10-26', 'søndag (sommertiden slutter)');
  assert.equal(planMandag(new Date(2026, 11, 30)), '2027-01-04', 'over nytår');
  for (const [dato, nr] of [['2026-10-26', 44], ['2026-12-28', 53], ['2027-01-04', 1], ['2025-12-29', 1], ['2026-01-05', 2], ['2027-12-27', 52]]) {
    assert.equal(ugeNr(dato), nr, dato);
  }
  assert.equal(dagDato('2026-10-26', 0), '26/10');
  assert.equal(dagDato('2026-10-26', 6), '1/11');
  assert.equal(dagDato('2026-12-28', 4), '1/1');
});

// Forsidens «I dag»-kort: dagen i planens uge, og -1 uden for ugen eller ved en dato, der ikke passer
test('dagIUgen: dagen i ugen eller -1', () => {
  assert.equal(dagIUgen('2026-10-26', '2026-10-26'), 0, 'mandag');
  assert.equal(dagIUgen('2026-10-26', '2026-11-01'), 6, 'søndag, over månedsskiftet og sommertiden');
  assert.equal(dagIUgen('2026-12-28', '2027-01-01'), 4, 'over nytår');
  assert.equal(dagIUgen('2026-10-26', '2026-10-25'), -1, 'dagen før planen');
  assert.equal(dagIUgen('2026-10-26', '2026-11-02'), -1, 'ugen efter');
  for (const [uge, dato] of [[null, '2026-10-26'], ['2026-10-26', undefined], ['26-10-2026', '2026-10-26'], ['2026-10-26', '2026-10-26T00:00'], ['', ''], [20261026, '2026-10-26']]) {
    assert.equal(dagIUgen(uge, dato), -1, JSON.stringify([uge, dato]));
  }
});

// Ugeplanens «Uge N er gået» (review F1, 15-11): først når ugens søndag er forbi. Om søndagen viste forsidens «I dag»-kort
// søndagens ret, mens ugeplanen sagde, at ugen var gået, og bad om «Ny uge», der tømte planen
test('ugenErGaaet: først mandagen efter, aldrig på en dag, hvor «I dag»-kortet kan vise ugens ret', () => {
  assert.equal(ugenErGaaet('2026-11-09', '2026-11-15'), false, 'søndag i ugen');
  assert.equal(ugenErGaaet('2026-11-09', '2026-11-16'), true, 'mandagen efter');
  assert.equal(ugenErGaaet('2026-11-09', '2026-11-09'), false, 'mandag i ugen');
  assert.equal(ugenErGaaet('2026-11-16', '2026-11-15'), false, 'planen til næste uge, lavet om søndagen');
  assert.equal(ugenErGaaet('2026-10-26', '2026-11-02'), true, 'over sommertiden');
  assert.equal(ugenErGaaet('2026-12-28', '2027-01-04'), true, 'over nytår');
  for (const uge of [null, undefined, '', '26-10-2026', 20261026]) assert.equal(ugenErGaaet(uge, '2026-11-16'), false, JSON.stringify(uge));
  for (let i = 0; i < 14; i++) {
    const dato = new Date(Date.UTC(2026, 10, 9 + i)).toISOString().slice(0, 10);
    assert.equal(ugenErGaaet('2026-11-09', dato), dagIUgen('2026-11-09', dato) < 0 && i >= 7, dato);
  }
});

// hentIndex (js/data.js) med en falsk fetch, der svarer med index.json
async function medIndex(index, fn) {
  const gammel = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(index), { status: 200, headers: { 'content-type': 'application/json' } });
  try { return await fn(); } finally { globalThis.fetch = gammel; }
}

test('hentIndex giver de rigtige retter i forsidens rækkefølge', async () => {
  const index = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8'));
  const ix = await medIndex(index, hentIndex);
  assert.deepEqual(ix.ids, index.grupper.flatMap((g) => g.retter));
  assert.deepEqual(ix.grupper.map((g) => g.id), ['pasta-og-nudler', 'kylling', 'fisk', 'gris', 'ko', 'groent', 'broed-og-pizza', 'madpakke', 'soede-sager', 'drikke', 'jul', 'halloween']);
});

// Validatoren tillader ingen dubletter, men står en ret to gange (også i samme gruppe), vises den kun første gang,
// og en gruppe, der står to gange, springes over anden gang (code review 19-10)
test('hentIndex viser hver ret og hver gruppe kun første gang', async () => {
  const ix = await medIndex({ version: 2, grupper: [
    { id: 'aftensmad', retter: ['frikadeller', 'koedsovs', 'frikadeller'] },
    { id: 'bagning', retter: ['boller', 'koedsovs', 'boller'] },
    { id: 'aftensmad', retter: ['chorizo-pasta'] },
  ] }, hentIndex);
  assert.deepEqual(ix.ids, ['frikadeller', 'koedsovs', 'boller']);
  assert.deepEqual(ix.grupper, [{ id: 'aftensmad', retter: ['frikadeller', 'koedsovs'] }, { id: 'bagning', retter: ['boller'] }]);
});
