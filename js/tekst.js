// tekst.js — rene tekstfunktioner (ingen DOM), testes i node.

// ISO 8601-varighed (PT1H45M) → minutter. Ugyldig → null.
export function isoTilMinutter(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ''));
  if (!m || iso === 'P' || iso === 'PT') return null;
  const [, d, t, min, s] = m.map((x) => (x === undefined ? 0 : Number(x)));
  return d * 1440 + t * 60 + min + Math.round(s / 60);
}

// 105 → «1 t 45 min», 30 → «30 min». Hårde mellemrum (U+00A0), så tiden aldrig brydes over to linjer
const H = '\u00a0';
export function minutterTekst(min) {
  if (min == null) return '';
  const t = Math.floor(min / 60);
  const r = min % 60;
  if (!t) return r + H + 'min';
  return r ? t + H + 't' + H + r + H + 'min' : t + H + 't';
}

// Teksten uden bløde bindestreger (U+00AD). De står i retternes og varernes navne (Grøntsags|blanding), så et langt ord
// kan deles på en smal skærm. Stemmen, skærmlæseren og en delt tekst skal ikke have dem (UI-review 29-10)
export const utenBloede = (t) => String(t).replace(/\u00ad/g, '');

// ---------- Teksten til stemmen ----------
// Røst-stemmen (lyd/) læser teksten, som den står, og oversætter ikke cifre og tegn: «130 gram» blev til «tretnulsnul»,
// og «7 + 5 = 12» til «syv procent fem simpel tolv» (målt med talegenkenderen 19-10-2026: fejlrate 0,57 med cifre,
// 0,12 med ordene skrevet ud). Derfor skrives alle tal, enheder, brøker, tegn og forkortelser ud her.
// Skærmen viser stadig teksten med cifre; kun stemmen får ordene.
// Grænserne er Unicode (\p{L}), ikke \b: \b kender kun a-z, så «l» i «1 løg» og «g» i «2 gås» lignede en enhed.

const EN = ['nul', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten',
  'femten', 'seksten', 'sytten', 'atten', 'nitten'];
const TIERE = ['', '', 'tyve', 'tredive', 'fyrre', 'halvtreds', 'tres', 'halvfjerds', 'firs', 'halvfems'];

// 0-9999 som dansk talord: 21 «enogtyve», 130 «hundrede og tredive», 250 «to hundrede og halvtreds», 1000 «tusind».
// koen 't' (intetkøn) giver «et» for 1 («et æg»), ellers «en» («en deciliter»). Større tal læses ciffer for ciffer
export function talOrd(n, koen = 'n') {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('talOrd: ' + n);
  if (n > 9999) return [...String(n)].map((c) => EN[Number(c)]).join(' ');
  if (n === 1) return koen === 't' ? 'et' : 'en';
  if (n < 20) return EN[n];
  if (n < 100) return (n % 10 ? EN[n % 10] + 'og' : '') + TIERE[Math.floor(n / 10)];
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const s = h === 1 ? 'hundrede' : EN[h] + ' hundrede';
    return n % 100 ? s + ' og ' + talOrd(n % 100, koen) : s;
  }
  const r = n % 1000;
  const s = n < 2000 ? 'tusind' : EN[Math.floor(n / 1000)] + ' tusind';
  if (!r) return s;
  return s + (r < 100 ? ' og ' : r < 200 ? ' et ' : ' ') + talOrd(r, koen); // 1150 «tusind et hundrede og halvtreds»
}

// Enhederne efter et tal: [ental, flertal, køn]. «1 tsk» er «en teskefuld», «2 tsk» «to teskefulde», «1 g» «et gram»
const ENHED = {
  dl: ['deciliter', 'deciliter', 'n'],
  l: ['liter', 'liter', 'n'],
  g: ['gram', 'gram', 't'],
  kg: ['kilo', 'kilo', 't'],
  tsk: ['teskefuld', 'teskefulde', 'n'],
  spsk: ['spiseskefuld', 'spiseskefulde', 'n'],
  stk: ['stykke', 'stykker', 't'],
  '%': ['procent', 'procent', 'n'],
  '°': ['grad', 'grader', 'n'],
};

// Navneordets køn, når der ikke står en enhed: «1 stort løg» er «et stort løg», «½ løg» «et halvt løg».
// Kun ord, der står (eller kan stå) efter et tal i opskrifterne. null = et tillægsord uden køn («lille»): se på næste ord.
// Står et ord, der ikke er her, efter 1, ½ eller x,5, fejler test-tid.js og nævner ordet (så skrives det på listen)
export const KOEN = Object.freeze({
  'løg': 't', 'æg': 't', 'fed': 't', 'minut': 't', 'sekund': 't', 'stykke': 't', 'trin': 't', 'glas': 't', 'æble': 't', 'bæger': 't',
  'stort': 't', 'helt': 't', 'mildt': 't', 'rødt': 't', 'grønt': 't',
  'knivspids': 'n', 'dåse': 'n', 'gulerod': 'n', 'flute': 'n', 'bouillonterning': 'n', 'grøntsagsbouillonterning': 'n',
  'kugle': 'n', 'bolle': 'n', 'snegl': 'n', 'skive': 'n', 'time': 'n', 'citron': 'n', 'tomat': 'n', 'kartoffel': 'n',
  'pakke': 'n', 'pose': 'n', 'portion': 'n', 'kage': 'n', 'chorizo': 'n', 'rulle': 'n', 'mozzarella': 'n', 'peberfrugt': 'n',
  'stor': 'n', 'hel': 'n', 'mild': 'n', 'rød': 'n', 'grøn': 'n',
  'agurk': 'n', 'icebergsalat': 'n',
  // Kan stå efter et tal, når mængden er regnet om til husstanden (NAVNEORD nedenfor): «1 laksefilet», «1 pølse»
  'tortilla': 'n', 'fuldkornstortilla': 'n', 'porre': 'n', 'fuldkornsburgerbolle': 'n', 'laksefilet': 'n', 'pølse': 'n',
  'mozzarellakugle': 'n', 'oliven': 'n', 'pære': 'n',
  // Enhederne i flertal, som skaler.js giver med et halvt («2,5 dåser» er «to og en halv»)
  'dåser': 'n', 'poser': 'n', 'pakker': 'n', 'blad': 't', // «1 blad icebergsalat» ved 1 portion
  'lille': null, 'sort': null, 'orange': null,
});

// Navneord, der står efter et antal uden enhed, i ental og flertal: «1 gulerod», «2 gulerødder». js/skaler.js bøjer dem
// med boejNavn, når en mængde regnes om til husstanden. Står samme ord to gange (æg, løg, oliven), bøjes det udtrykkeligt
// ikke. Kønnet står kun i KOEN. Står et ord efter et antal uden enhed i en opskrift, men ikke her, fejler test-skaler.js
// og nævner ordet: skriv det her med begge former og dets køn i KOEN
export const NAVNEORD = Object.freeze({
  'agurk': 'agurker', 'bouillonterning': 'bouillonterninger', 'citron': 'citroner', 'flute': 'flutes',
  'fuldkornsburgerbolle': 'fuldkornsburgerboller', 'fuldkornstortilla': 'fuldkornstortillas',
  'grøntsagsbouillonterning': 'grøntsagsbouillonterninger', 'gulerod': 'gulerødder', 'icebergsalat': 'icebergsalater',
  'kartoffel': 'kartofler', 'laksefilet': 'laksefileter', 'mozzarellakugle': 'mozzarellakugler', 'peberfrugt': 'peberfrugter',
  'porre': 'porrer', 'pølse': 'pølser', 'pære': 'pærer', 'tomat': 'tomater', 'tortilla': 'tortillas', 'æble': 'æbler',
  // Uændret i flertal
  'løg': 'løg', 'oliven': 'oliven', 'æg': 'æg',
});

// Tillægsord foran navneordet: [en-ord, et-ord, flertal] («en stor kartoffel», «et stort løg», «store kartofler»)
export const TILLAEGSORD = Object.freeze([
  ['stor', 'stort', 'store'], ['lille', 'lille', 'små'], ['rød', 'rødt', 'røde'], ['grøn', 'grønt', 'grønne'],
  ['sort', 'sort', 'sorte'], ['orange', 'orange', 'orange'],
].map((t) => Object.freeze(t)));

// Hver form (ental og flertal) → [ental, flertal], og hver form af et tillægsord → dets tre former
const NAVNEORD_FORM = new Map(Object.entries(NAVNEORD).flatMap(([e, f]) => [[e, [e, f]], [f, [e, f]]]));
const TILLAEG_FORM = new Map(TILLAEGSORD.flatMap((t) => t.map((form) => [form, t])));

// Navnet efter et antal uden enhed bøjet i ental eller flertal: «gulerødder» → «gulerod», «store kartofler (ca. 1 kg)» →
// «stor kartoffel (ca. 1 kg)». Et tillægsord foran følger med og bøjes efter navneordets køn i KOEN («et stort løg»), og
// et navneord efter «eller» bøjes også («æble eller pære»). Resten (komma, parentes, «til pensling») står som før.
// null, når navneordet ikke står i NAVNEORD
export function boejNavn(navn, flertal) {
  if (typeof navn !== 'string') throw new TypeError('boejNavn: navnet skal være en tekst, ikke ' + navn);
  if (typeof flertal !== 'boolean') throw new TypeError('boejNavn: flertal skal være true eller false, ikke ' + flertal);
  const m = /^(\p{L}+)(?: (\p{L}+))?/u.exec(navn);
  if (!m) return null;
  const tillaeg = m[2] !== undefined && TILLAEG_FORM.has(m[1]) ? TILLAEG_FORM.get(m[1]) : null;
  const ord = NAVNEORD_FORM.get(tillaeg ? m[2] : m[1]);
  if (!ord) return null;
  const foran = tillaeg ? tillaeg[flertal ? 2 : KOEN[ord[0]] === 't' ? 1 : 0] + ' ' : '';
  return foran + ord[flertal ? 1 : 0] + ellerBoejet(navn.slice(tillaeg ? m[0].length : m[1].length), flertal);
}

// «… eller pærer»: et navneord efter «eller» bøjes med. Et ukendt ord efter «eller» står som før
function ellerBoejet(rest, flertal) {
  if (!rest.startsWith(' eller ')) return rest;
  const b = boejNavn(rest.slice(' eller '.length), flertal);
  return b === null ? rest : ' eller ' + b;
}

const BROEK = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
const TAL = '\\d+(?:,\\d+)?[½¼¾]?|[½¼¾]';
const MAENGDE = new RegExp('(?<![\\p{L}\\p{N}])(' + TAL + ')(?:\\s*-\\s*(' + TAL + '))?(?:\\s*(kg|dl|spsk|tsk|stk\\.?|g|l|%|°C|°)(?![\\p{L}\\p{N}]))?', 'gu');

// «1,5» → { hel: 1, rest: 0.5 }, «4½» → { hel: 4, rest: 0.5 }, «1,2» → { hel: 1, rest: 0.2, decimaler: '2' }
function delMaengde(a) {
  const [, hel, dec, b] = /^(\d*)(?:,(\d+))?([½¼¾])?$/.exec(a);
  const h = hel === '' ? 0 : Number(hel);
  if (b) return { hel: h, rest: BROEK[b] };
  if (dec && /^(?:50?|25|75)$/.test(dec)) return { hel: h, rest: Number('0.' + dec) };
  return { hel: h, rest: dec ? Number('0.' + dec) : 0, decimaler: dec };
}

// Mængden som ord, som man siger det til et barn: 0,5 «en halv» (intetkøn «et halvt»), 1,5 «halvanden» («halvandet kilo»),
// 1,25 «en og en kvart», 1,75 «en og trekvart», 2,5 «to og en halv», ellers «en komma to»
function maengdeOrd(a, koen) {
  const { hel, rest, decimaler } = delMaengde(a);
  if (decimaler) return talOrd(hel) + ' komma ' + (decimaler.startsWith('0') ? [...decimaler].map((c) => EN[Number(c)]).join(' ') : talOrd(Number(decimaler)));
  const t = koen === 't';
  const broek = rest === 0.5 ? (t ? 'et halvt' : 'en halv') : rest === 0.25 ? (t ? 'et kvart' : 'en kvart') : rest === 0.75 ? 'trekvart' : '';
  if (!broek) return talOrd(hel, koen);
  if (!hel) return broek;
  if (hel === 1 && rest === 0.5) return t ? 'halvandet' : 'halvanden';
  return talOrd(hel, koen) + ' og ' + broek;
}

// Ental efter højst 1 og efter «halvanden» («halvanden teskefuld»), ellers flertal
function flertal(a) {
  const { hel, rest } = delMaengde(a);
  return hel + rest > 1 && !(hel === 1 && rest === 0.5);
}

// Hvor ordet efter tallet afgør, om det er «en» eller «et»: 1 (også 1,75), ½, ¼ og x,5/x,25 (ikke 2, 3 … eller ¾)
function koenBetyder(a) {
  const { hel, rest, decimaler } = delMaengde(a);
  return !decimaler && (rest === 0.5 || rest === 0.25 || hel % 100 === 1);
}

// Køn fra ordene efter tallet (højst to: «1 lille løg»). Et navneord i flertal slås op i ental, og et tillægsord uden køn
// («lille», «store») springes over, for en mængde regnet om til husstanden kan stå foran flertal: «2,5 store løg» er «to
// og et halvt», ikke «to og en halv» (js/skaler.js). undefined = ukendt
function koenEfter(rest) {
  const ord = rest.match(/^(?:\s+\p{L}+){1,2}/u);
  if (!ord) return undefined;
  for (const o of ord[0].trim().split(/\s+/)) {
    const lav = o.toLowerCase();
    const ental = NAVNEORD_FORM.has(lav) ? NAVNEORD_FORM.get(lav)[0] : lav;
    const k = Object.hasOwn(KOEN, ental) ? KOEN[ental] : TILLAEG_FORM.has(lav) ? null : undefined;
    if (k !== null) return k;
  }
  return undefined;
}

// Intet ord efter tallet, eller til/og/eller: tallet står for det sidst talte navneord («og 1 til pensling»)
const UDEN_NAVNEORD = /^(?:\s+(?:til|og|eller)(?!\p{L})|(?!\s+\p{L}))/iu;

function talTilOrd(tekst, ukendte) {
  // Kønnet på det sidst talte navneord: «3 æg (2 til dejen og 1 til pensling)» → «et til pensling». Kun når intet
  // navneord følger efter tallet: i «1 æg og 1 banan» er «banan» ukendt og meldes, ikke «et banan»
  let sidste = null;
  return tekst.replace(MAENGDE, (hele, a, b, enhed, pos, alt) => {
    let koen;
    let efter = '';
    if (enhed) {
      const [ental, flere, k] = ENHED[enhed.replace(/\.$/, '').replace('°C', '°')];
      koen = k;
      efter = ' ' + (flertal(b || a) ? flere : ental);
    } else if (/(?<!\p{L})trin\s+$/iu.test(alt.slice(0, pos))) koen = 't'; // «trin 1» er «trin et»
    else {
      const rest = alt.slice(pos + hele.length);
      koen = koenEfter(rest);
      if (koen) sidste = koen;
      else {
        const forrige = UDEN_NAVNEORD.test(rest) ? sidste : null;
        if (ukendte && (koenBetyder(a) || (b && koenBetyder(b))) && !forrige) ukendte.push(hele + rest.split(/[.,;:!?)]/)[0]);
        koen = forrige || 'n';
      }
    }
    return maengdeOrd(a, koen) + (b ? ' til ' + maengdeOrd(b, koen) : '') + efter;
  });
}

const FORKORTELSER = [
  [/(?<!\p{L})([Cc])a\.(?![\p{L}\p{N}])/gu, (_, c) => (c === 'C' ? 'Cirka' : 'cirka')],
  [/(?<!\p{L})([Ee])vt\.(?![\p{L}\p{N}])/gu, (_, e) => (e === 'E' ? 'Eventuelt' : 'eventuelt')],
  [/(?<!\p{L})([Ff])x(?![\p{L}\p{N}])/gu, (_, f) => (f === 'F' ? 'For eksempel' : 'for eksempel')],
];
// Enheder uden tal foran («Mål mel i dl»)
const ENHEDER_ALENE = [
  [/(?<!\p{L})dl(?![\p{L}\p{N}])/gu, 'deciliter'],
  [/(?<!\p{L})spsk(?![\p{L}\p{N}])/gu, 'spiseskefulde'],
  [/(?<!\p{L})tsk(?![\p{L}\p{N}])/gu, 'teskefulde'],
  [/(?<!\p{L})kg(?![\p{L}\p{N}])/gu, 'kilo'],
  [/(?<!\p{L})stk\.?(?=\s|$)/gu, 'stykker'],
  [/\s*%/g, ' procent'],
  [/\s*°C?/g, ' grader'],
];

function talegrund(tekst, ukendte) {
  let t = utenBloede(tekst) // den bløde bindestreg i «Havregryns|kugler» er kun til skærmen
    .replace(/([\d½¼¾])\s*[–—]\s*(?=[\d½¼¾])/g, '$1-') // tankestreg i «8–10» som bindestreg
    .replace(/(\d)\s+([½¼¾])/g, '$1$2') // «1 ½ dl» er «1½ dl»
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*=\s*/g, ' er ')
    .replace(/\s*×\s*/g, ' gange ')
    .replace(/\s*÷\s*/g, ' delt med ');
  for (const [re, ud] of FORKORTELSER) t = t.replace(re, ud);
  t = talTilOrd(t, ukendte);
  for (const [re, ud] of ENHEDER_ALENE) t = t.replace(re, ud);
  t = t.replace(/\d+/g, (n) => talOrd(Number(n))); // cifre inde i et ord («B12»)
  return t.replace(/\s+/g, ' ').trim();
}

// Teksten, som stemmen siger den: «Mål 1,5 dl mælk.» → «Mål halvanden deciliter mælk.»
export function tilTale(tekst) {
  return talegrund(tekst, null);
}

// Til test-tid.js: tal (1, ½, x,5), hvor kønnet ikke kunne ses (ordet efter står ikke i KOEN), så stemmen gætter «en»
export function ukendtKoen(tekst) {
  const ukendte = [];
  talegrund(tekst, ukendte);
  return ukendte;
}

// Antal ord i en sætning (tegnsætning tæller ikke)
export function antalOrd(tekst) {
  return String(tekst).split(/\s+/).filter((o) => /[\p{L}\p{N}]/u.test(o)).length;
}

// «2,5 dl hvedemel» + mængden «2,5 dl» → { maengde: '2,5 dl', navn: 'hvedemel' }
export function delIngrediens(tekst, maengde) {
  const m = String(maengde || '');
  if (m && tekst.startsWith(m)) return { maengde: m, navn: tekst.slice(m.length).trim() };
  return { maengde: '', navn: tekst };
}
