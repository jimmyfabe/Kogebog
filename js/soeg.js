// soeg.js — søgningen i voksendelens lister (Katalog, Ugens udvalg og Favoritter i js/voksen-del.js) og bag lupen på
// forsiden. Ren logik: ingen DOM og intet lager. Hvert ord i søgningen skal findes et sted i retten (OG): i navnet, i en
// ingrediens' navn, i gruppens navn («Jul»), i gruppens gamle navn («Aftensmad», gruppeOrd) eller i et mærkes navn
// («Vegetar»). Et ord på mindst 4 bogstaver må stå inde i et andet ord, så «kage» finder «julekage». Et ord på 3 bogstaver
// skal stå først eller sidst i et ord, så «mos» finder «kartoffelmos» og «kål» finder «blomkål». Et ord på 1-2 bogstaver
// skal stå først i et ord, så «æg» finder «æggekage», men ikke «spejlæg», med undtagelserne i UNDTAGELSER. Store og små
// bogstaver er ens, æ, ø og å er ens, uanset hvordan tastaturet har skrevet dem (NFC), og den bløde bindestreg i retternes
// navne (U+00AD, fx «Kyllinge|tærte») tæller ikke.

const KORT_ORD = 3; // så mange bogstaver: først eller sidst i et ord. Færre: kun først. Flere: hvor som helst

// Søgeordene, hvor reglen rammer forbi. «slutning»: den slutning, ordet også må findes på, i stedet for ordet selv.
// «ikke»: hele ord, der ikke tæller
const UNDTAGELSER = new Map([
  ['is', { slutning: 'eis' }], // vaniljeis og flødeis, men ikke flormelis, gris eller ris
  ['ris', { ikke: ['gris', 'pris'] }], // grødris og jasminris, men ikke gris og pris
  ['mel', { ikke: ['krymmel', 'julekrymmel'] }], // hvedemel, men ikke krymmel på kager
  ['kål', { ikke: ['skål', 'risskål'] }], // blomkål, men ikke en sushi-skål
  ['ost', { ikke: ['frost', 'æblemost'] }], // hytteost, men ikke bær på frost
]);

// Teksten, som der søges i og med: uden blød bindestreg, små bogstaver, NFC og ét mellemrum mellem ordene. NFC efter
// toLowerCase, for et stort bogstav kan blive til to tegn, når det gøres lille
export function normaliser(tekst) {
  return String(tekst ?? '').replace(/\u00ad/g, '').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Søgningens ord. Komma skiller også ord («kylling, ris»). En tom søgning giver []
export function soegeord(tekst) {
  return normaliser(tekst).split(/[ ,]+/).filter(Boolean);
}

// Alt, der kan søges i, for en ret: { navn, ingredienser: [{ navn }], gruppe, gruppeOrd, maerker: [navn] }. Felterne står
// på hver sin linje, så et søgeord (der aldrig har et linjeskift) ikke kan findes hen over to felter
export function soegeTekst(ret) {
  const r = ret || {};
  const ingredienser = Array.isArray(r.ingredienser) ? r.ingredienser.map((x) => x && x.navn) : [];
  const maerker = Array.isArray(r.maerker) ? r.maerker : [];
  return [r.navn, ...ingredienser, r.gruppe, r.gruppeOrd, ...maerker]
    .filter((d) => typeof d === 'string' && d)
    .map(normaliser)
    .join('\n');
}

// Findes ordet i teksten? [...ord]: et bogstav uden for BMP tæller som ét. Søgeordet bruges aldrig som et regulært udtryk,
// så «(» og «.*» bare ikke findes. \p{L}: \b kender kun a-z i WebKit, og «æg» står også først i et ord
function ordFindes(o, t) {
  const bogstaver = [...o].length;
  if (bogstaver > KORT_ORD) return t.includes(o);
  const undtagelse = UNDTAGELSER.get(o) ?? {};
  const slutning = undtagelse.slutning ?? (bogstaver === KORT_ORD ? o : null);
  const ikke = undtagelse.ikke ?? [];
  return t.split(/[^\p{L}\p{N}]+/u).some((d) => !ikke.includes(d) && (d.startsWith(o) || (slutning !== null && d.endsWith(slutning))));
}

// Retterne (i deres rækkefølge), hvor hvert ord i tekst findes. En tom søgning giver alle (en ny liste)
export function soeg(retter, tekst) {
  const ord = soegeord(tekst);
  if (!ord.length) return [...retter];
  return retter.filter((r) => {
    const t = soegeTekst(r);
    return ord.every((o) => ordFindes(o, t));
  });
}
