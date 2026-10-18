// katalog.js — de faste id'er, som opskrifterne må bruge. Én kilde for appen og for test/test-opskrifter.js.
// Billederne ligger i grafik/ med præcis disse navne (verbum-<id>, ing-<id>, dyr-<navn>, ret-<id>).

// De 12 verber fra docs/gennemgang.md. Navnet bruges som alt-tekst.
export const VERBER = {
  'roere': 'røre',
  'haelde': 'hælde',
  'skaere': 'skære',
  'aelte': 'ælte',
  'rulle': 'rulle',
  'vende': 'vende',
  'stege': 'stege',
  'koge': 'koge',
  'maale': 'måle',
  'vaske-haender': 'vaske hænder',
  'vente': 'vente',
  'smage': 'smage',
};

// Verber, der altid kræver en voksen, og hvilken slags hjælp.
export const VOKSEN_KRAV = {
  'skaere': 'kniv',
  'stege': 'varme',
  'koge': 'varme',
  'vende': 'varme',
};

export const VOKSEN_HJAELP = {
  kniv: 'Kniv',
  varme: 'Varmt',
};

// Ingrediens-ikonerne (grafik/ing-<id>.svg). Navnet bruges som alt-tekst.
export const INGREDIENSER = {
  'mel': 'mel',
  'sukker': 'sukker',
  'salt': 'salt',
  'peber': 'peber',
  'aeg': 'æg',
  'maelk': 'mælk',
  'smoer': 'smør',
  'olie': 'olie',
  'vand': 'vand',
  'gaer': 'gær',
  'koed': 'hakket kød',
  'loeg': 'løg',
  'hvidloeg': 'hvidløg',
  'gulerod': 'gulerod',
  'tomat': 'hakkede tomater',
  'tomatpure': 'tomatpuré',
  'krydderurt': 'krydderurter',
  'spaghetti': 'spaghetti',
  'ost': 'ost',
  'chorizo': 'chorizo',
  'flode': 'fløde',
  'bouillon': 'bouillon',
  'havregryn': 'havregryn',
  'syltetoej': 'syltetøj',
};

// Ikoner for råt kød og råt æg: efter dem skal der komme et trin med «vaske-haender».
export const RAA_IKONER = ['koed', 'aeg'];

export const DYR = {
  bo: 'Bo, kok-bjørnen',
  rosa: 'Rosa, den lille ræv',
  pip: 'Pip, det lille pindsvin',
};

// Grafikken. Pladsholderne er SVG; skiftes de til PNG i fase 2, rettes det kun her.
export const GRAFIK_MAPPE = 'grafik/';
export const GRAFIK_ENDELSE = '.svg';
export const grafikVerbum = (id) => GRAFIK_MAPPE + 'verbum-' + id + GRAFIK_ENDELSE;
export const grafikIngrediens = (id) => GRAFIK_MAPPE + 'ing-' + id + GRAFIK_ENDELSE;
export const grafikDyr = (navn) => GRAFIK_MAPPE + 'dyr-' + navn + GRAFIK_ENDELSE;
export const grafikRet = (id) => GRAFIK_MAPPE + 'ret-' + id + GRAFIK_ENDELSE;
export const GRAFIK_FAERDIG = GRAFIK_MAPPE + 'faerdig' + GRAFIK_ENDELSE;

// Højst så mange ord i en trin-tekst («højst ca. 8 ord»; 9 giver plads til «ca.»).
export const MAKS_ORD = 9;
