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
  // De billige aftensretter (22-10-2026)
  'aerter': 'ærter',
  'broccoli': 'broccoli',
  'linser': 'røde linser',
  'boenner': 'bønner',
  'ris': 'ris',
  'tortilla': 'tortillas',
  'agurk': 'agurk',
  'blomkaal': 'blomkål',
  'soja': 'soja',
  'honning': 'honning',
  'kaal': 'kål',
  'makrel': 'makrel i tomat',
  'kikaerter': 'kikærter',
  'bulgur': 'bulgur',
  // De sunde hverdagsretter (31-10-2026): æbler i kikærteboller og muffins, syltede rødbeder til vegetarbiksen
  'aeble': 'æble',
  'roedbede': 'syltede rødbeder',
  // De hurtige hverdagsretter, runde 2 (31-10-2026): porrer i suppen, frosne gyoza, mayonnaise, citron til laksen og ananas
  'porre': 'porre',
  'gyoza': 'gyoza',
  'mayonnaise': 'mayonnaise',
  'citron': 'citron',
  'ananas': 'ananas',
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
// (en gryde, en ovn, en kage og et græskar), og farven på kortenes cirkel står i app.css under [data-gruppe].
// Halloween er sit eget afsnit fra 22-10-2026 (sidst, så forsiden ellers er som før). Skal retterne tilbage i
// Bagning, flyttes de i index.json, og 'halloween' kan blive stående her
export const GRUPPER = {
  'aftensmad': 'Aftensmad',
  'bagning': 'Bagning',
  'soede-sager': 'Søde sager',
  'halloween': 'Halloween',
};

// Grafikken. Pladsholderne er SVG; skiftes de til PNG i fase 2, rettes det kun her.
export const GRAFIK_MAPPE = 'grafik/';
export const GRAFIK_ENDELSE = '.svg';
// Retternes billeder er tegnet af Codex (21-10-2026): 640 px WebP med gennemsigtig bund (vaerktoej/ret-billede-til-webp.py)
export const GRAFIK_RET_ENDELSE = '.webp';
export const grafikVerbum = (id) => GRAFIK_MAPPE + 'verbum-' + id + GRAFIK_ENDELSE;
export const grafikIngrediens = (id) => GRAFIK_MAPPE + 'ing-' + id + GRAFIK_ENDELSE;
export const grafikDyr = (navn) => GRAFIK_MAPPE + 'dyr-' + navn + GRAFIK_ENDELSE;
export const grafikRet = (id) => GRAFIK_MAPPE + 'ret-' + id + GRAFIK_RET_ENDELSE;
export const grafikGruppe = (id) => GRAFIK_MAPPE + 'gruppe-' + id + GRAFIK_ENDELSE;
export const GRAFIK_FAERDIG = GRAFIK_MAPPE + 'faerdig' + GRAFIK_ENDELSE;

// Højst så mange ord i en trin-tekst («højst ca. 8 ord»; 9 giver plads til «ca.»).
export const MAKS_ORD = 9;

// Ugeplanen og indkøbslisten (docs/ugeplan-plan.md, afsnit 4). En ret i ugeplanen («tumbi.ugeplan»: true) har på hver
// ingredienslinje en «vare» herfra, og «antal» + «enhed» i en enhed med samme dimension som varens. js/indkoeb.js lægger
// mængderne sammen i varens enhed og runder op til sidst.

// Butikkens afdelinger i den rækkefølge, man går rundt: frosten sidst, så den er kold, når man kommer hjem. «basis» er
// ikke en afdeling, men blokken «Tjek, at I har» (salt, peber, olie og krydderier, som ikke lægges sammen)
export const AFDELINGER = {
  'groent': 'Frugt og grønt',
  'broed': 'Brød',
  'toer': 'Dåser og tørvarer',
  'koel': 'Køl',
  'frost': 'Frost',
  'basis': 'Tjek, at I har',
};

// Enhederne i en opskrifts «enhed»: dimensionen og hvor mange af grundenheden (faktor 1), én er. Kun samme dimension
// kan lægges sammen: «spsk» er rumfang (15 ml), aldrig gram
export const ENHEDER = {
  'g': { dim: 'vaegt', faktor: 1 },
  'kg': { dim: 'vaegt', faktor: 1000 },
  'ml': { dim: 'rumfang', faktor: 1 },
  'dl': { dim: 'rumfang', faktor: 100 },
  'l': { dim: 'rumfang', faktor: 1000 },
  'spsk': { dim: 'rumfang', faktor: 15 },
  'tsk': { dim: 'rumfang', faktor: 5 },
  'stk': { dim: 'stk', faktor: 1 },
  'fed': { dim: 'fed', faktor: 1 },
};

// Indkøbsvarerne. «enhed» er en grundenhed (faktor 1) i den dimension, butikken sælger i: tomatpuré sælges i gram, så en
// opskrift med «2 spsk» skriver 30 g. «ikon» er et af INGREDIENSER. «pakke»: [indhold i varens enhed, ental, flertal]
// giver «2 dåser (800 g)», og en pakke med indholdet 1 giver kun «1 bundt». «basis»: står kun under «Tjek, at I har» uden mængde (og må undlade «antal»). «skjul»: står
// ikke på listen (vand fra hanen). Pakkestørrelserne er almindelige størrelser i danske supermarkeder, ikke én butiks
export const VARER = {
  // Frugt og grønt
  'loeg': { navn: 'Løg', afd: 'groent', enhed: 'stk', ikon: 'loeg' },
  'hvidloeg': { navn: 'Hvidløg', afd: 'groent', enhed: 'fed', ikon: 'hvidloeg' },
  'gulerod': { navn: 'Gulerødder', afd: 'groent', enhed: 'stk', ikon: 'gulerod' },
  'persille': { navn: 'Persille', afd: 'groent', enhed: 'stk', ikon: 'krydderurt', pakke: [1, 'bundt', 'bundter'] },
  'agurk': { navn: 'Agurk', afd: 'groent', enhed: 'stk', ikon: 'agurk' },
  'smaa-kartofler': { navn: 'Små kartofler', afd: 'groent', enhed: 'g', ikon: 'kartoffel' },
  'revet-gulerod': { navn: 'Revne gulerødder', afd: 'groent', enhed: 'g', ikon: 'gulerod' },
  'snittet-kaal': { navn: 'Snittet kål', afd: 'groent', enhed: 'g', ikon: 'kaal' },
  'peberfrugt': { navn: 'Peberfrugt', afd: 'groent', enhed: 'stk', ikon: 'peberfrugt' },
  'kartofler': { navn: 'Kartofler', afd: 'groent', enhed: 'g', ikon: 'kartoffel' },
  'aebler': { navn: 'Æbler', afd: 'groent', enhed: 'stk', ikon: 'aeble' },
  'porre': { navn: 'Porrer', afd: 'groent', enhed: 'stk', ikon: 'porre' },
  'citron': { navn: 'Citron', afd: 'groent', enhed: 'stk', ikon: 'citron' },
  'icebergsalat': { navn: 'Icebergsalat', afd: 'groent', enhed: 'stk', ikon: 'kaal' },
  'spidskaal': { navn: 'Spidskål', afd: 'groent', enhed: 'g', ikon: 'kaal' },
  // Brød
  'tortillas': { navn: 'Tortillas', afd: 'broed', enhed: 'stk', ikon: 'tortilla' },
  'rugbroed': { navn: 'Rugbrød', afd: 'broed', enhed: 'g', ikon: 'broed' },
  'toastbroed': { navn: 'Toastbrød', afd: 'broed', enhed: 'g', ikon: 'broed' },
  'naan': { navn: 'Naanbrød', afd: 'broed', enhed: 'g', ikon: 'broed' },
  'burgerboller': { navn: 'Burgerboller (fuldkorn)', afd: 'broed', enhed: 'stk', ikon: 'broed', pakke: [4, 'pose', 'poser'] },
  // Dåser og tørvarer
  'hakkede-tomater': { navn: 'Hakkede tomater', afd: 'toer', enhed: 'g', ikon: 'tomat', pakke: [400, 'dåse', 'dåser'] },
  'passata': { navn: 'Tomatpassata', afd: 'toer', enhed: 'g', ikon: 'tomat', pakke: [500, 'flaske', 'flasker'] },
  'tomatpure': { navn: 'Tomatpuré', afd: 'toer', enhed: 'g', ikon: 'tomatpure', pakke: [140, 'tube', 'tuber'] },
  'spaghetti': { navn: 'Spaghetti', afd: 'toer', enhed: 'g', ikon: 'spaghetti', pakke: [500, 'pakke', 'pakker'] },
  'fuldkornspasta': { navn: 'Fuldkornspasta', afd: 'toer', enhed: 'g', ikon: 'spaghetti', pakke: [500, 'pakke', 'pakker'] },
  // Bløde bindestreger som ved «Grøntsagsblanding»: på 360 px brød e2e 29-10 dem som «Grøntsagsbouil|lon» og «Madlav|ningsfløde»
  'bouillonterninger': { navn: 'Grøntsags\u00adbouillon (terninger)', afd: 'toer', enhed: 'stk', ikon: 'bouillon', pakke: [8, 'pakke', 'pakker'] },
  'tun': { navn: 'Tun i vand', afd: 'toer', enhed: 'g', ikon: 'tun', pakke: [185, 'dåse', 'dåser'] },
  'havregryn': { navn: 'Havregryn', afd: 'toer', enhed: 'g', ikon: 'havregryn', pakke: [1000, 'pose', 'poser'] },
  'penne': { navn: 'Penne', afd: 'toer', enhed: 'g', ikon: 'spaghetti', pakke: [500, 'pakke', 'pakker'] },
  'roede-linser': { navn: 'Røde linser', afd: 'toer', enhed: 'g', ikon: 'linser' },
  'ris': { navn: 'Ris', afd: 'toer', enhed: 'g', ikon: 'ris' },
  // Egen vare, så indkøbslisten ikke lægger dem sammen med hvide ris (fuldkorn efter kostrådene; code review K8, 31-10)
  'brune-ris': { navn: 'Brune ris (fuldkorn)', afd: 'toer', enhed: 'g', ikon: 'ris' },
  'kidneyboenner': { navn: 'Kidneybønner', afd: 'toer', enhed: 'stk', ikon: 'boenner', pakke: [1, 'dåse', 'dåser'] },
  'sorte-boenner': { navn: 'Sorte bønner', afd: 'toer', enhed: 'stk', ikon: 'boenner', pakke: [1, 'dåse', 'dåser'] },
  'majs': { navn: 'Majs', afd: 'toer', enhed: 'stk', ikon: 'majs', pakke: [1, 'dåse', 'dåser'] },
  'tacokrydderi': { navn: 'Tacokrydderi (mildt)', afd: 'toer', enhed: 'stk', ikon: 'krydderurt', pakke: [1, 'pose', 'poser'] },
  'kokosmaelk': { navn: 'Kokosmælk', afd: 'toer', enhed: 'stk', ikon: 'kokos', pakke: [1, 'dåse', 'dåser'] },
  'nudler': { navn: 'Nudler', afd: 'toer', enhed: 'g', ikon: 'spaghetti' },
  'suppehorn': { navn: 'Suppehorn', afd: 'toer', enhed: 'g', ikon: 'spaghetti' },
  'makaroni': { navn: 'Makaroni', afd: 'toer', enhed: 'g', ikon: 'spaghetti' },
  'hvide-boenner-tomat': { navn: 'Hvide bønner i tomat', afd: 'toer', enhed: 'stk', ikon: 'boenner', pakke: [1, 'dåse', 'dåser'] },
  'mel': { navn: 'Hvedemel', afd: 'toer', enhed: 'g', ikon: 'mel' },
  'makrel-tomat': { navn: 'Makrel i tomat', afd: 'toer', enhed: 'stk', ikon: 'makrel', pakke: [1, 'dåse', 'dåser'] },
  'kikaerter': { navn: 'Kikærter', afd: 'toer', enhed: 'stk', ikon: 'kikaerter', pakke: [1, 'dåse', 'dåser'] },
  'bulgur': { navn: 'Bulgur', afd: 'toer', enhed: 'g', ikon: 'bulgur' },
  'fajitakrydderi': { navn: 'Fajitakrydderi (mildt)', afd: 'toer', enhed: 'stk', ikon: 'krydderurt', pakke: [1, 'pose', 'poser'] },
  'lasagneplader': { navn: 'Lasagneplader (fuldkorn)', afd: 'toer', enhed: 'g', ikon: 'spaghetti', pakke: [500, 'pakke', 'pakker'] },
  'roedbeder': { navn: 'Syltede rødbeder', afd: 'toer', enhed: 'g', ikon: 'roedbede' },
  'ananas': { navn: 'Ananasringe', afd: 'toer', enhed: 'stk', ikon: 'ananas', pakke: [1, 'dåse', 'dåser'] },
  // Uden pakke: hoisin sælges både i små poser og i flasker
  'hoisin': { navn: 'Hoisinsauce', afd: 'toer', enhed: 'g', ikon: 'soja' },
  // Køl
  'hakket-oksekoed': { navn: 'Hakket oksekød', afd: 'koel', enhed: 'g', ikon: 'koed', pakke: [500, 'bakke', 'bakker'] },
  'chorizo': { navn: 'Chorizo', afd: 'koel', enhed: 'g', ikon: 'chorizo', pakke: [250, 'pakke', 'pakker'] },
  'flodeost': { navn: 'Flødeost', afd: 'koel', enhed: 'g', ikon: 'flodeost', pakke: [200, 'bæger', 'bægre'] },
  'madlavningsflode': { navn: 'Madlavnings\u00adfløde', afd: 'koel', enhed: 'ml', ikon: 'flode', pakke: [250, 'bæger', 'bægre'] },
  'parmesan': { navn: 'Revet parmesan', afd: 'koel', enhed: 'g', ikon: 'ost', pakke: [100, 'pose', 'poser'] },
  'revet-ost': { navn: 'Revet ost', afd: 'koel', enhed: 'g', ikon: 'ost', pakke: [175, 'pose', 'poser'] },
  'graesk-yoghurt': { navn: 'Græsk yoghurt', afd: 'koel', enhed: 'g', ikon: 'yoghurt', pakke: [500, 'bæger', 'bægre'] },
  'aeg': { navn: 'Æg', afd: 'koel', enhed: 'stk', ikon: 'aeg', pakke: [10, 'bakke', 'bakker'] },
  'smoer': { navn: 'Smør', afd: 'koel', enhed: 'g', ikon: 'smoer', pakke: [250, 'pakke', 'pakker'] },
  'yoghurt': { navn: 'Yoghurt naturel', afd: 'koel', enhed: 'g', ikon: 'yoghurt', pakke: [1000, 'bæger', 'bægre'] },
  'pizzadej': { navn: 'Pizzadej (rulle)', afd: 'koel', enhed: 'stk', ikon: 'pizzadej', pakke: [1, 'rulle', 'ruller'] },
  'creme-fraiche': { navn: 'Creme fraiche', afd: 'koel', enhed: 'g', ikon: 'yoghurt' },
  'fiskefars': { navn: 'Fiskefars', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'kyllingebryst': { navn: 'Kyllingebryst', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'kyllingelaar': { navn: 'Kyllingelår', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'hakket-svinekoed': { navn: 'Hakket svinekød', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'bacon-tern': { navn: 'Bacon i tern', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'maelk': { navn: 'Mælk', afd: 'koel', enhed: 'ml', ikon: 'maelk', pakke: [1000, 'karton', 'kartoner'] },
  'hakket-kylling': { navn: 'Hakket kylling', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'hakket-oksekoed-groent': { navn: 'Hakket oksekød med grønt', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'medister': { navn: 'Medister', afd: 'koel', enhed: 'g', ikon: 'koed' },
  'partypoelser': { navn: 'Partypølser', afd: 'koel', enhed: 'g', ikon: 'poelse' },
  'hytteost': { navn: 'Hytteost', afd: 'koel', enhed: 'g', ikon: 'hytteost' },
  'skyr': { navn: 'Skyr naturel', afd: 'koel', enhed: 'g', ikon: 'yoghurt', pakke: [1000, 'bæger', 'bægre'] },
  'skinketern': { navn: 'Skinketern', afd: 'koel', enhed: 'g', ikon: 'skinke', pakke: [150, 'pakke', 'pakker'] },
  'gnocchi': { navn: 'Gnocchi', afd: 'koel', enhed: 'g', ikon: 'kartoffel', pakke: [500, 'pakke', 'pakker'] },
  // Frost. Uden pakke: posernes størrelse skifter mellem butikkerne, så listen viser gram
  'aerter': { navn: 'Ærter', afd: 'frost', enhed: 'g', ikon: 'aerter' },
  'broccoliblanding': { navn: 'Broccoli', afd: 'frost', enhed: 'g', ikon: 'broccoli' },
  'suppeurter': { navn: 'Suppeurter', afd: 'frost', enhed: 'g', ikon: 'gulerod' },
  // Den bløde bindestreg deler ordet mellem «Grøntsags» og «blanding»: på 360 px brød det som «Grøntsagsblan|ding»
  // (UI-review 27-10). Den fjernes i tekstudgaven (tekst() i js/indkoeb.js)
  'groentsagsblanding': { navn: 'Grøntsags\u00adblanding', afd: 'frost', enhed: 'g', ikon: 'aerter' },
  'hakket-spinat': { navn: 'Hakket spinat', afd: 'frost', enhed: 'g', ikon: 'spinat' },
  'aerter-gulerod': { navn: 'Ærter og gulerødder', afd: 'frost', enhed: 'g', ikon: 'aerter' },
  'blomkaalsblanding': { navn: 'Blomkål', afd: 'frost', enhed: 'g', ikon: 'blomkaal' },
  'rodfrugter': { navn: 'Rodfrugter', afd: 'frost', enhed: 'g', ikon: 'gulerod' },
  'kartoffelbaade': { navn: 'Kartoffelbåde', afd: 'frost', enhed: 'g', ikon: 'kartoffel' },
  'fiskepinde': { navn: 'Fiskepinde', afd: 'frost', enhed: 'g', ikon: 'koed' },
  'wokblanding': { navn: 'Wokblanding', afd: 'frost', enhed: 'g', ikon: 'broccoli' },
  'groenne-boenner': { navn: 'Grønne bønner', afd: 'frost', enhed: 'g', ikon: 'boenner' },
  'koedboller': { navn: 'Kødboller (færdige)', afd: 'frost', enhed: 'g', ikon: 'koed' },
  'rosenkaal': { navn: 'Rosenkål', afd: 'frost', enhed: 'g', ikon: 'kaal' },
  'kartoffelskiver': { navn: 'Kartoffelskiver', afd: 'frost', enhed: 'g', ikon: 'kartoffel' },
  'fiskefileter': { navn: 'Hvide fiskefileter', afd: 'frost', enhed: 'g', ikon: 'koed' },
  'laksefileter': { navn: 'Laksefileter', afd: 'frost', enhed: 'g', ikon: 'koed' },
  'gyoza': { navn: 'Gyoza med kylling', afd: 'frost', enhed: 'g', ikon: 'gyoza' },
  // Tjek, at I har
  'salt': { navn: 'Salt', afd: 'basis', enhed: 'g', ikon: 'salt', basis: true },
  'peber': { navn: 'Peber', afd: 'basis', enhed: 'g', ikon: 'peber', basis: true },
  'olie': { navn: 'Olie', afd: 'basis', enhed: 'ml', ikon: 'olie', basis: true },
  'oregano': { navn: 'Tørret oregano', afd: 'basis', enhed: 'ml', ikon: 'krydderurt', basis: true },
  'hvidloegspulver': { navn: 'Hvidløgspulver', afd: 'basis', enhed: 'ml', ikon: 'hvidloeg', basis: true },
  'paprika': { navn: 'Paprika', afd: 'basis', enhed: 'ml', ikon: 'krydderurt', basis: true },
  'spidskommen': { navn: 'Stødt spidskommen', afd: 'basis', enhed: 'ml', ikon: 'krydderurt', basis: true },
  'karry': { navn: 'Karry (mild)', afd: 'basis', enhed: 'ml', ikon: 'krydderurt', basis: true },
  'soja': { navn: 'Soja', afd: 'basis', enhed: 'ml', ikon: 'soja', basis: true },
  'honning': { navn: 'Honning', afd: 'basis', enhed: 'ml', ikon: 'honning', basis: true },
  'ketchup': { navn: 'Ketchup', afd: 'basis', enhed: 'ml', ikon: 'ketchup', basis: true },
  'mayonnaise': { navn: 'Mayonnaise', afd: 'basis', enhed: 'ml', ikon: 'mayonnaise', basis: true },
  'vand': { navn: 'Vand', afd: 'basis', enhed: 'ml', ikon: 'vand', basis: true, skjul: true },
};
