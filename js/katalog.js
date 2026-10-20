// katalog.js — de faste id'er, som opskrifterne må bruge. Én kilde for appen og for test/test-opskrifter.js.
// Billederne ligger i grafik/ med præcis disse navne (verbum-<id>, ing-<id>, dyr-<navn>, ret-<id>).

// De 12 verber fra docs/gennemgang.md, 7 nye (18-10-2026), 6 nye (19-10-2026) og 2 til Halloween-retterne (20-10-2026):
// «pynte» (læg en oliven, en negl eller en stilk på) og «sproejte» (klem ketchup ud af flasken). Navnet bruges som alt-tekst.
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
  'smoere': 'smøre',
  'mose': 'mose',
  'bage': 'bage',
  'piske': 'piske',
  'drysse': 'drysse',
  'rive': 'rive',
  'pensle': 'pensle',
  'tage-ud': 'tage ud',
  'tage-ud-form': 'tage formen ud',
  'si': 'si',
  'kagerulle': 'rulle ud',
  'pakke-ind': 'pakke ind',
  'smuldre': 'smuldre',
  'pynte': 'pynte',
  'sproejte': 'sprøjte',
};

// Verber, der altid kræver en voksen, og hvilken slags hjælp. Rivejernet skærer, «bage» og «tage-ud» er altid ovnen
// («tage-ud» er en flad plade, «tage-ud-form» en dyb form), og «si» er kogende vand gennem dørslaget.
export const VOKSEN_KRAV = {
  'skaere': 'kniv',
  'rive': 'kniv',
  'stege': 'varme',
  'koge': 'varme',
  'vende': 'varme',
  'bage': 'varme',
  'tage-ud': 'varme',
  'tage-ud-form': 'varme',
  'si': 'varme',
};

// Verber, barnet kan selv, når der er koldt: piske dej, pensle boller, mose, drysse ost, pynte og sprøjte ketchup. Er der varme med
// (varmt fedt, en varm gryde eller pande), skal den voksne hjælpe, og så er det for varmens skyld, aldrig kniven.
// Validatoren kan ikke se, om der er varme; det skriver opskriften med «voksen». Den tjekker, at hjælpen er «varme».
export const KUN_VARME_HJAELP = ['piske', 'pensle', 'mose', 'drysse', 'pynte', 'sproejte'];

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
  'kartoffel': 'kartofler',
  'broed': 'brød',
  'chokolade': 'chokolade',
  'kakao': 'kakao',
  'rasp': 'rasp',
  'hytteost': 'hytteost',
  'kerner': 'kerner',
  'tun': 'tun på dåse',
  'yoghurt': 'yoghurt',
  'skinke': 'skinke (pålæg)',
  'bagepulver': 'bagepulver',
  'kokos': 'kokosmel',
  'pizzadej': 'pizzadej',
  'poelse': 'pølser',
  'ketchup': 'ketchup',
  'oliven': 'sorte oliven',
  'majs': 'majs',
  'peberfrugt': 'peberfrugt',
  'flodeost': 'flødeost',
  'spinat': 'spinat',
};

// Ikoner for råt kød og råt æg: efter dem skal der komme et trin med «vaske-haender».
// Tun på dåse, skinke (pålæg) og pølser (færdige) er ikke rå, så de står ikke her. Rå fisk og råt svinekød bruger «koed».
export const RAA_IKONER = ['koed', 'aeg'];

export const DYR = {
  bo: 'Bo, kok-bjørnen',
  rosa: 'Rosa, den lille ræv',
  pip: 'Pip, det lille pindsvin',
};

// Forsidens afsnit (opskrifter/index.json). Navnet er overskriften; billedet er grafik/gruppe-<id>.svg
// (en gryde, en ovn og en kage), og farven på kortenes cirkel står i app.css under [data-gruppe]
export const GRUPPER = {
  'aftensmad': 'Aftensmad',
  'bagning': 'Bagning',
  'soede-sager': 'Søde sager',
};

// Grafikken. Pladsholderne er SVG; skiftes de til PNG i fase 2, rettes det kun her.
export const GRAFIK_MAPPE = 'grafik/';
export const GRAFIK_ENDELSE = '.svg';
export const grafikVerbum = (id) => GRAFIK_MAPPE + 'verbum-' + id + GRAFIK_ENDELSE;
export const grafikIngrediens = (id) => GRAFIK_MAPPE + 'ing-' + id + GRAFIK_ENDELSE;
export const grafikDyr = (navn) => GRAFIK_MAPPE + 'dyr-' + navn + GRAFIK_ENDELSE;
export const grafikRet = (id) => GRAFIK_MAPPE + 'ret-' + id + GRAFIK_ENDELSE;
export const grafikGruppe = (id) => GRAFIK_MAPPE + 'gruppe-' + id + GRAFIK_ENDELSE;
export const GRAFIK_FAERDIG = GRAFIK_MAPPE + 'faerdig' + GRAFIK_ENDELSE;

// Højst så mange ord i en trin-tekst («højst ca. 8 ord»; 9 giver plads til «ca.»).
export const MAKS_ORD = 9;
