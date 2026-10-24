// version.js — Tumbi Køkkens versionsnummer. Står lille nederst på forsiden og i printenes fod, så den voksne kan se på
// iPad'en eller papiret, om det er den nye udgave. Det styrer IKKE opdateringen: det gør cachens navn (VERSION i sw.js).
// Hæves ved hver udgivelse, der ændrer en fil i FILER, sw.js eller lyden: løbenummeret +1 og dagens dato.
// UDGAVE_INDHOLD er filernes fingeraftryk for nummeret. test/test-version.js fejler, når en fil ændres uden et nyt
// nummer, og skriver de to nye linjer i fejlbeskeden.
export const UDGAVE = 'v1 · 23-10-2026';
export const UDGAVE_INDHOLD = 'v1:371d747705f06443';
