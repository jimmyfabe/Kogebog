// soeg.js — søgningen i voksendelens lister (Katalog, Ugens udvalg og Favoritter i js/voksen-del.js). Ren logik: ingen
// DOM og intet lager. Hvert ord i søgningen skal findes et sted i retten (OG): i navnet, i en ingrediens' navn, i gruppens
// navn («Jul») eller i et mærkes navn («Vegetar»). Ordet må stå inde i et andet ord, så «jul» finder «julekage», og «is»
// finder både «flødeis» og «ris». Store og små bogstaver er ens, æ, ø og å er ens, uanset hvordan tastaturet har skrevet
// dem (NFC), og den bløde bindestreg i retternes navne (U+00AD, fx «Kyllinge|tærte») tæller ikke.

// Teksten, som der søges i og med: uden blød bindestreg, små bogstaver, NFC og ét mellemrum mellem ordene. NFC efter
// toLowerCase, for et stort bogstav kan blive til to tegn, når det gøres lille
export function normaliser(tekst) {
  return String(tekst ?? '').replace(/\u00ad/g, '').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Søgningens ord. Komma skiller også ord («kylling, ris»). En tom søgning giver []
export function soegeord(tekst) {
  return normaliser(tekst).split(/[ ,]+/).filter(Boolean);
}

// Alt, der kan søges i, for en ret: { navn, ingredienser: [{ navn }], gruppe, maerker: [navn] }. Felterne står på hver
// sin linje, så et søgeord (der aldrig har et linjeskift) ikke kan findes hen over to felter
export function soegeTekst(ret) {
  const r = ret || {};
  const ingredienser = Array.isArray(r.ingredienser) ? r.ingredienser.map((x) => x && x.navn) : [];
  const maerker = Array.isArray(r.maerker) ? r.maerker : [];
  return [r.navn, ...ingredienser, r.gruppe, ...maerker]
    .filter((d) => typeof d === 'string' && d)
    .map(normaliser)
    .join('\n');
}

// Retterne (i deres rækkefølge), hvor hvert ord i tekst findes. En tom søgning giver alle (en ny liste)
export function soeg(retter, tekst) {
  const ord = soegeord(tekst);
  if (!ord.length) return [...retter];
  return retter.filter((r) => {
    const t = soegeTekst(r);
    return ord.every((o) => t.includes(o));
  });
}
