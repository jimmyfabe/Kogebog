# Ugeplan og indkøbsliste – byggeplan (22-10-2026, ingen kode)

Børnene vælger retter på iPad'en, den voksne vælger resten, og telefonen får en indkøbsliste, man kan krydse af på. Listen gemmes på telefonen første gang, den åbnes, så linket ikke skal bruges igen. Der er ingen server, ingen afhængigheder og ingen ændring i `kog-v1`.

## 1. Skærmene

| Rute | Enhed | Indhold |
|---|---|---|
| `#/uge/vaelg` | iPad, landskab | **Barnets valg.** (1) «Hvem vælger?»: tre store dyr (`DYR`: Bo = voksen, Rosa og Pip = børn). (2) Fire store retbilleder pr. skærm + pil til «flere»; første tryk læser navnet op, «Vælg» bekræfter. (3) «Hvilken dag?»: syv dagbrikker med fast farve og navn, læses op ved tryk; optagne dage viser rettens billede og dyret. 1 eller 2 retter pr. barn (den voksne bestemmer). Knapper ≥ 64 px |
| `#/uge` | iPad og desktop | **Den voksnes oversigt.** Syv rækker: billede, navn, dyr, tid, «ca. kr.», grønt, knivtrin, portioner (−/+, 1–12), «Byt», «Fjern», «Fri aften». Tomme dage: «Vælg ret» med filtrene ≤ 40 min, billigst, mindst kniv. Bund: «Ca. 240 kr. · grønt 6 af 7 dage». Knapper: Indkøbsliste, **Send til telefon**, Del som tekst, Print, Ny uge (bag holdet på 2 s). ≥ 48 px |
| `#/indkoeb` | iPhone 390×844 | **Listen.** Afdelinger i butiksrækkefølge: Frugt og grønt, Brød, Dåser og tørvarer, Køl, **Frost sidst** (koldt hjem). Rækker ≥ 48 px med ikon (`ing-*.svg`), navn og mængde («2 dåser (800 g)»). Tryk = købt (streges over, glider ned); «Har vi» flytter varen til «Har vi allerede». Basisvarer (salt, peber, olie, krydderier) i en lukket blok «Tjek, at I har», uden for «8 af 23 købt». Bund: «Ugens retter» med links |
| `#/hent/<kode>` | telefon | Gemmer planen (afsnit 2-3), skifter adressen til `#/indkoeb` med `history.replaceState` og viser listen |

Mængderne lægges sammen på tværs af retterne og ganges med *valgte portioner / opskriftens `portioner`*. Der rundes først op til sidst (afsnit 4).

## 2. Sådan kommer listen fast på telefonen uden en server

**Kilder (Apple/WebKit):**

| Fakta | Status |
|---|---|
| Safari sletter et websteds lager (`localStorage`, IndexedDB, service worker) efter 7 dages Safari-brug uden interaktion med webstedet. Hjemmeskærm-apps har egen tæller, og der forventes ingen sletning (WebKit 2020) | Dokumenteret |
| En hjemmeskærm-app deler **ikke** lager med Safari (Bugzilla 181849: «by design», 2022) | Kommentar, ikke formel dok. |
| Et link eller en QR-kode åbner i Safari, ikke i hjemmeskærm-appen | Sluttet, ikke testet |
| iOS 26: slår man «Open as Web App» fra, bliver hjemmeskærm-ikonet et bogmærke, der åbner i Safari (WebKit, Safari 26) | Dokumenteret; dansk menutekst ikke set |
| `persist()` fra Safari 17, givet efter heuristik, «fx hjemmeskærm-app» (WebKit 2023) | Dokumenteret |
| Bugzilla 237350: en hjemmeskærm-app mistede data efter ca. 7 dage trods brug (iOS 15.3, uløst) | En brugers rapport |
| Noter: markér linjerne, tryk på tjeklisteknappen | Dokumenteret (Apples iCloud-guide) |
| Påmindelser: bliver hver indsat linje en påmindelse? Indkøbslistens afdelinger (iOS 17) findes kun på nogle sprog, dansk er ikke nævnt | Ikke afprøvet / dansk ukendt |

| Vej | Sådan | + | − |
|---|---|---|---|
| **(a) Link → Safari-lager** | iPad'en sender et link (AirDrop eller Beskeder via delearket; senere evt. en QR-kode). Første åbning gemmer listen i telefonens `localStorage` og fjerner koden fra adressen. Bagefter åbnes listen fra et ikon på hjemmeskærmen **med «Open as Web App» slået fra**, eller fra en Safari-favorit | Ét tryk. Linket kan forsvinde. Vores egne afdelinger, ikoner og «har vi». Virker uden net, når siden har været åbnet én gang | 7-dages-reglen: den rammer kun en liste, der ikke er rørt i 7 dages Safari-brug, og det skader ikke ugentlig brug. Ryd historik sletter listen. Lægges siden ind som *web-app*, er listen væk (separat lager) |
| (a2) Hjemmeskærm-app + «Sæt ind» | Man kopierer linket i Beskeder, åbner appen og sætter det ind i et felt (langt tryk → Sæt ind) | Beskyttet lager, `persist()` | Tre-fire tryk hver uge |
| **(b) Del som tekst → Noter** | «Del som tekst» (`navigator.share` eller kopiér) med én vare pr. linje under afdelingernes overskrifter. I Noter markeres alt, og man trykker på tjeklisten | Apples egen app, ligger fast, deles med den anden voksne via iCloud | Ingen «har vi» og ingen ikoner. Et ekstra trin i Noter |
| (c) Papir | `print.html?uge`, side 2: listen med □ | Kræver ingenting | Ikke på telefonen |

**Anbefaling:** **(a) er den primære vej.** Skærmen `#/indkoeb` har (a2) indbygget som nødudgang: kører siden som web-app og er listen tom, viser den feltet «Sæt linket ind». **(b) er reserven.** Den koster kun tekstudgaven og en knap. Jimmy skal ikke bruge server, nøgler eller iCloud-API'er (de ville lægge nøgler i offentlig kode, regel 7).

## 3. Data, nøgler og linket

| Nøgle | Hvor | Indhold |
|---|---|---|
| `kog-v1` | alle | **Uændret** `{ v, sidste, timer }`. Ingen migrering |
| `kog-uge-v1` | iPad | `{ v:1, uge:'2026-10-26', dage:[{ ret, af, n } eller null ×7], n:4, prBarn:1, rettet }` |
| `kog-liste-v1` | telefon (og iPad) | `{ v:1, kode, uge, varer:[{ id, m }], koebt:[id], harVi:[id], hentet }` |

- **`js/lager.js` er stadig den eneste fil, der rører `localStorage`.** Den får de nye funktioner `hentUge/gemUge/hentListe/gemListe`, og koden for `kog-v1` røres ikke. Rens alt ved læsning: id'erne skal findes i index eller `VARER` (`Object.hasOwn`), og grænserne er `n` 1–12, `m` 0–100.000 og højst 200 varer. `af` ∈ `bo|rosa|pip`, aldrig børnenes navne (regel 6).
- **Versionsvagt for de nye nøgler:** et lavere `v` migreres i en kæde. Et højere `v` læses som tomt **og skrivebeskyttes**, så gammel kode fra service worker-cachen aldrig overskriver data fra en nyere udgave. `rens()` i `kog-v1` nulstiller i dag, og den må ikke kopieres.
- Kalder iPad'en `navigator.storage.persist()`, når en plan gemmes. Åbnes den samme kode igen, beholdes afkrydsningerne. En ny kode giver knappen «Erstat listen for uge 43?».
- **Listen er et øjebliksbillede:** varerne regnes ud, når listen hentes, og gemmes. Så skifter listen ikke under indkøbet, hvis en opskrift bliver rettet.

**Linket:** `…/Kogebog/#/hent/v1.20261026.koedsovs_4~~bolognese-one-pot_6~~~~.a3f9`
(version . mandag . syv dage adskilt af `~`, hvor en tom dag er en fri aften og en dag er `id_portioner` . kontrolsum). Koden står efter `#`, så den aldrig sendes til GitHub. Den har kun tegn uden URL-kodning, så link-genkendelse i Beskeder ikke skærer den over. Kontrolsummen (FNV-1a, 4 hex) fanger et afskåret link. Den er ikke sikkerhed. Linket fylder ca. 260 tegn, og en QR-kode bliver version 10-11.

**Streng validering** (ren funktion i `js/plankode.js`, ingen DOM):
1. Længden skal være højst 400 tegn, før noget deles op. `%`, store bogstaver og alt andet uden for `[a-z0-9._~-]` afvises.
2. Hele koden skal matche ét regulært udtryk: `v1`, 8 cifre, præcis 7 felter og 4 hex. `v2` og nyere giver «Lavet med en nyere udgave. Opdatér appen». Alt andet giver «Linket kan ikke læses». Ingen delvis indlæsning.
3. Datoen skal være en rigtig mandag, højst 8 uger fra i dag. Portionerne er `[1-9]|1[0-2]`. Id'et matcher `ID_RE`, er højst 40 tegn og står i `index.json` (`includes`, aldrig `obj[id]`: `constructor` er en kendt faldgrube). Retten skal have `ugeplan: true`. Et ukendt id, der ellers er gyldigt, giver en tom dag og teksten «1 ret kunne ikke findes» (kun et tal).
4. **Ingen tekst fra adressen vises.** Navnene kommer fra vores egen JSON, fejlbeskederne er faste, og koden gemmes kun i normaliseret form (genskrevet fra de tal og id'er, der blev godkendt). Alt bruger `textContent` (regel 2).

## 4. Fra ingrediens til indkøbsvare, og hvad en ny opskrift skal have

Nyt i `js/katalog.js` (én kilde for appen og validatoren):
- `VARER`, fx `'hakkede-tomater': { navn, afd:'toer', enhed:'g', ikon:'tomat', pakke:[400,'dåse','dåser'] }`. `basis:true` gælder salt, peber, olie og krydderier: de lægges ikke sammen og står under «Tjek, at I har». Vand har `skjul:true`.
- `AFDELINGER` i butiksrækkefølge: `groent, broed, toer, koel, frost, basis`.
- `ENHEDER` med dimension og faktor: g og kg; ml, dl, l, spsk (15 ml) og tsk (5 ml); stk; fed.
- Den rene funktion `js/indkoeb.js` lægger sammen i varens grundenhed og runder op til sidst. Stk og fed rundes til hele, g til 10 g (fra 1 kg: «1,2 kg») og ml til ½ dl (fra 1 l: «1,5 l»). Har varen en pakke, vises «3 dåser (1,2 kg)». Den laver også tekstudgaven til (b).

**Felter i hver opskrift i ugeplanen** (validatoren kræver dem kun, når `ugeplan: true`):

| Felt | Krav | Hvorfor |
|---|---|---|
| `tumbi.ugeplan` | `true` | Med i barnets valg og i oversigten |
| `tumbi.portioner` | heltal 1–12 | `recipeYield` er fritekst («10-12 frikadeller») |
| `totalTime` | højst PT60M (helst 45) | En time fra hjemkomst til aftensmad |
| knivtrin | højst 2 `skaere`/`rive` (regnes ud) | Skånsomt for hænderne: frosne hakkede grøntsager, dåser, revet ost |
| `tumbi.pris_kr`, `tumbi.pris_dato` | heltal for hele retten, `ÅÅÅÅ-MM`. Butik og metode står i `tumbi.ugeplan_kilde` (ikke i `kilde`, som printet viser; 23-10) | «Ca. kr.» pr. uge og pr. person |
| `tumbi.groent_g` | heltal, gram grønt i hele retten | «Grønt pr. person» |
| `tumbi.ugeplan_kilde` | tekst, der slutter med punktum: butik og metode for pris og grønt, og at de er et skøn | Ingen side viser den; printets fod viser kun `kilde`, som ikke må nævne pris og grønt (23-10) |
| `ingredienser[i].vare/antal/enhed` | `vare` ∈ `VARER`; `enhed` ∈ `ENHEDER` med samme dimension som varen; `antal` > 0. Basisvarer må undlade `antal` | Sammenlægningen. En ny vare kræver en linje i `VARER` (ikon fra `INGREDIENSER`) |
| `grafik/ret-<id>.webp` + Røst-navnet | findes | Barnet vælger ud fra billedet og stemmen |

Alle de nuværende regler gælder stadig: verber, ordvagten, håndvask, `afproevet:false` og `kilde` («skøn» må kun stå i `kilde` og `ugeplan_kilde`). Felterne lægges også på 4-5 af de nuværende aftensretter (koedsovs, bolognese-one-pot, cremet-koedsovs, chorizo-pasta, tunfrikadeller). Frikadeller tager 2 timer og kommer derfor ikke med.

## 5. Offline, print og tests

- **`sw.js`:** de nye filer kommer i `FILER` (`js/ugeplan.js`, `js/indkoeb.js`, `js/plankode.js`, nye opskrifter, billeder og ikoner), og `INDHOLD` sættes (regel 3). `#/hent/…` er et fragment, så `index.html` kommer fra cachen. Første åbning på en telefon skal være med net, og Legos service worker med scope `/` kan svare dér (STATUS, ikke testet).
- **Print:** `print.html?uge` læser `kog-uge-v1` (planen står ikke i adressen). Side 1 er ugeplanen på A4 med syv rækker: billede, navn, tid og dyr. Side 2 er indkøbslisten med □ efter afdeling. Den er også vej (c).
- **Node:** den nye `test/test-indkoeb.js` kommer i `koer-alle.js`. Den tester sammenlægning, skalering, afrunding, enheder, pakker og basisvarer; at koden kodes og afkodes tilbage til det samme; en tabel med fjendtlige koder (`<script>`, `%3C`, `constructor_4`, 8 dage, `_0`, `_13`, `_04`, 10.000 tegn, 30-02, `v2`, forkert kontrolsum); og `rens` med et falsk `localStorage`, hvor et højere `v` ikke overskrives. Validatorens negative eksempler ligger i `test-validator.js`.
- **E2E:** en ny del, `E2E_DELE=ugeplan`. **iPad 1180×820:** barnets valg (64 px, `tjekLayout`, oplæsning), oversigten, og «Send» med en falsk `navigator.share`, der fanger URL'en. **iPhone 390×844 i en ny kontekst** (eget lager = egen enhed): åbn URL'en → listen vises, adressen er `#/indkoeb`, kryds 3 af, genindlæs, og de er stadig krydset af. Fjendtlige URL'er giver en fast tekst, og den indsprøjtede tekst står ikke i `body.textContent`. **Uden net: stop serveren** (`setOffline` stopper også svarene fra service workeren i WebKit, målt 22-10). **Desktop 1280×800:** oversigt og print. `former` på listen i 360 px og på langs.

## 6. Rækkefølgen (hvert skridt: test → commit)

1. `VARER`, `AFDELINGER` og `ENHEDER` + validatorregler for `ugeplan` (test-opskrifter/validator).
2. Felterne på 4-5 nuværende aftensretter (validatoren er grøn; `INDHOLD`).
3. `js/indkoeb.js` sammenlægger (test-indkoeb).
4. `js/plankode.js` koder og validerer (fjendtlige koder). **Review-workflow** (input fra adressen og gemte data).
5. `lager.js`: de nye nøgler og versionsvagten (falsk `localStorage`).
6. `#/hent` og `#/indkoeb` på iPhone, med nødudgangen «Sæt linket ind» (e2e iphone).
7. `#/uge`: den voksnes oversigt, Send og Del som tekst (e2e ipad og desktop).
8. `#/uge/vaelg`: barnets valg og replikker. iPad-stemmen bruges, til Røst-lyden er lavet (e2e, `test-lyd` fejler indtil da).
9. `print.html?uge` (e2e print).
10. `sw.js` og offline-e2e. Derefter `ui-reviewer` og `code-reviewer`.
11. De ca. 30 nye retter kommer ind i hold på 5 (validator, billede, Røst).
12. (Valgfrit) QR på iPad'en med egen koder (ca. 300 linjer, ingen afhængighed), testet mod faste vektorer og Jimmys iPhone-kamera.

## Ukendt eller afventer Jimmy

- **iOS-version på telefonen:** findes «Open as Web App»-kontakten (iOS 26), og hvad hedder den på dansk? Uden den bruges en Safari-favorit.
- Om brug af Lystårnet/LEGO i Safari tæller som interaktion med samme websted (jimmyfabe.github.io) for 7-dages-reglen. Sluttet, ikke testet.
- At AirDrop af et link åbner det direkte i Safari, og at Påmindelser laver én påmindelse pr. linje: ikke afprøvet.
- Forstår børn på 5-9 år dagbrikker med farve og oplæsning? Test det med børnene.
- **Skal de ca. 30 nye retter i et nyt afsnit «Hverdag» eller i «Aftensmad»?** En ny gruppe kræver `GRUPPER`, svg, farve og stemme, og den gamle `data.js` skal kunne læse `index.json`.
- Priserne bliver forældede. Hvor ofte skal `pris_dato` fornyes?
- Rigtig iPad og iPhone: hele kæden (send, åbn, kryds af, uden net) er ikke afprøvet.

## Kilder

- WebKit, *Full Third-Party Cookie Blocking and More* (2020): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- WebKit, *Updates to Storage Policy* (2023): https://webkit.org/blog/14403/updates-to-storage-policy/
- WebKit, *News from WWDC25: Safari 26 beta*: https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- WebKit Bugzilla 181849 og 237350: https://bugs.webkit.org/show_bug.cgi?id=181849 · https://bugs.webkit.org/show_bug.cgi?id=237350
- Apple, *Create grocery lists in Reminders* og *Add more languages…*: https://support.apple.com/HT213830 · https://support.apple.com/120616
- Apple, Noter på iCloud (tjekliste fra markerede linjer): https://support.apple.com/guide/icloud/mmcd9c9e9b71/icloud
- MDN, `Navigator.share()` (kræver et brugertryk og HTTPS): https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
