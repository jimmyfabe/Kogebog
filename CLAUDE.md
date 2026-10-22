# CLAUDE.md – Tumbi Køkken (D:\Claude\Kogebog)

Kogebog til et barn (ca. 5-9 år) og en voksen, der laver mad sammen på iPad i landskab. Ét trin pr. skærm, billeder, oplæsning, timer og et A4-print til den voksne. Statisk PWA uden byggetrin og uden afhængigheder. **Udgives fra `main` på GitHub Pages (https://jimmyfabe.github.io/Kogebog/), når Jimmy har pushet.** Eget git-repo, gren `main`.

Hvor man starter: `LÆS-MIG-FØRST.md`. Status: `STATUS.md`. Plan og begrundelser: `docs/gennemgang.md`.

## Kommandoer

Kør i Git Bash i `D:/Claude/Kogebog`.

| Hvad | Kommando |
|---|---|
| Alle node-tests (8 filer, ingen browser) | `node test/koer-alle.js` eller `npm.cmd test` |
| Én testfil | `node test/test-opskrifter.js` (også grafik og index.json), `test-validator.js`, `test-tid.js`, `test-sw.js`, `test-css.js` (regler i `app.css`, som browseren ikke kan se, fx safe-area), `test-lyd.js` (lydfilerne passer til det, appen siger), `test-tale.js` (oplæsningen med en falsk iPad: lyd efter et voksen-hold, reserven, uden net), `test-indkoeb.js` (ugeplanen: indkøbslisten, koden i linket og lageret med et falsk `localStorage`) |
| Lokal server | `py -m http.server 8091 --bind 127.0.0.1 --directory D:/Claude/Kogebog`, og åbn http://127.0.0.1:8091/. Aldrig `file://` |
| E2E i WebKit (TUNG) | `NODE_PATH=C:/Users/Jimmy/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules bash ~/.claude/tung-koersel.sh "kogebog: e2e" node test/test-e2e.js http://127.0.0.1:8091` |
| Kun dele af e2e | sæt foran kommandoen: `E2E_DELE=tastatur,timer` og/eller `E2E_SKAERME=ipad,iphone,desktop`. Dele: `hele,print,tastatur,timer,fejl,beroering,former` (`former` = 360 px, 390×844, 744×1133, 768×1024 og iPhones på langs: 844×390, 667×375, 736×414, 812×375, 932×430, og tre smalle desktopvinduer: 901×800, 960×800 og 1024×800). `E2E_FORMER=se-land,land` begrænser `former` til nogle af dem (navnene står i `FORMER` i `test-e2e.js`) |
| Hjemmeskærm-ikoner (PNG) | `NODE_PATH=C:/Users/Jimmy/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules bash ~/.claude/tung-koersel.sh "kogebog: ikoner" node vaerktoej/lav-ikoner.js` |

- E2E er tung og kører kun gennem `tung-koersel.sh`. Exit 75 = låst af en anden kørsel (Lystårnets e2e kan tage 30-90 min; 18-10 holdt den låsen i 85 min). Exit 76 = under 4 GB fri RAM. Prøv igen senere med pauser, og skriv «ikke kørt: låst», hvis det ikke lykkes.
- Skærmbilleder fra e2e går til `test-resultater/`, som er gitignored.
- `?hurtig=1` i adressen gør alle timere 2 sekunder. Kun til test.

## Filer

| Fil | Hvad |
|---|---|
| `index.html`, `app.js`, `app.css` | Skærmene. Ruter i adressen: `#/ret/<id>`, `#/ret/<id>/trin/<nr>`, `#/ret/<id>/faerdig` |
| `print.html`, `print.css`, `js/print.js` | A4 til den voksne: `print.html?ret=<id>` |
| `js/model.js` | Gør en opskrift til det skærmene og printet bruger. Ingen DOM |
| `js/data.js` | Henter `opskrifter/index.json` og `opskrifter/<id>.json` |
| `js/katalog.js` | Faste navne: verber, voksen-krav, ingredienser, `MAKS_ORD = 9`, grafik-stier. Nyt verbum eller ingrediens kræver også et billede i `grafik/` |
| `js/tekst.js`, `js/tid.js` | Rene funktioner, uden DOM: talformen til stemmen (tal som ord, «en»/«et» efter `KOEN`, enheder, brøker, forkortelser), ordtælling, timerens tid |
| `js/timer.js` | Én timer ad gangen: sluttid, lyd, skærm-lås |
| `js/replikker.js` | Alt, appen siger, med sin lydfil (`{ tekst, fil }`). `app.js` læser kun op gennem den (`test-lyd.js` tjekker det) |
| `js/tale.js` | Oplæsning: `lyd/<fil>` (Røst), hvis den står i `lyd/liste.json`, ellers iPad-stemmen (`speechSynthesis`, `da-DK`). Afviser `play()`, er filen ikke gemt uden net, eller kommer der ingen `playing` inden 6 s, tager iPad-stemmen over. Ét fælles lydelement, der låses op ved første tryk (touchend, click eller keydown; pointerup alene slipper ikke lytterne) |
| `lyd/` | Røst-stemmens mp3 (`lyd/<ret>/<navn>.mp3` og `lyd/faelles/`), `liste.json` (filerne, appen spiller) og `tekster.json` (teksten, hver fil er lavet af; kun til tests) |
| `vaerktoej/lav-taleliste.js`, `vaerktoej/indsaet-lyd.js` | Listen over alt, appen siger (til Røst), og indsætning af de færdige mp3-filer i `lyd/`. Se «Stemmen» |
| `js/hold.js` | Knap, der skal holdes inde i 2 s (voksen-trin og print) |
| `js/voksen.js` | Voksen-trinets gule advarselstrekant (kniv eller flamme) og «Næste» bag et hold. Siger intet: at retten laves med en voksen, siges én gang, når retten åbnes (`R.voksenStart`), og et kort tryk vipper trekanten |
| `js/lager.js` | Den eneste fil, der rører `localStorage`: `kog-v1` (`hent`/`gem`), ugeplanen `kog-uge-v1` (`hentUge`/`gemUge`) og indkøbslisten `kog-liste-v1` (`hentListe`/`gemListe`). Se regel 5 |
| `js/indkoeb.js` | Indkøbslisten til ugeplanen (`docs/ugeplan-plan.md`, afsnit 4): lægger ugens varer sammen i hver vares enhed (`VARER`, `AFDELINGER`, `ENHEDER` i `katalog.js`) og runder først op, når mængden vises. Ingen DOM og intet lager |
| `js/plankode.js` | Ugeplanen som kode i linket `#/hent/<kode>` (`kod`/`afkod`, afsnit 3). Koden kommer udefra: `afkod` afviser alt, der ikke passer præcis, og kun id'er fra «retter» kommer videre. Ingen DOM og intet lager |
| `js/dom.js` | Bygger elementer. Tekst sættes som tekst |
| `sw.js`, `manifest.webmanifest` | Offline: service worker med `kog-`-caches |
| `opskrifter/` | `<id>.json` pr. ret og `index.json` (forsidens afsnit og rækkefølgen) |
| `grafik/`, `ikoner/` | Retternes billeder som WebP (`ret-<id>.webp`, tegnet af Codex 21-10-2026), resten som SVG, og ikoner til hjemmeskærmen |
| `test/`, `vaerktoej/lav-ikoner.js` | Node-tests og `test-e2e.js`. Ikon-scriptet laver PNG-ikonerne |
| `docs/` | `gennemgang.md` (plan), `chatgpt-app-prompt.md` og `chatgpt-grafik-prompt.md` (prompter til ChatGPT) |

## Opskriftsformatet

Standard schema.org/Recipe med egne felter under `tumbi`. Den fulde tabel står i `docs/gennemgang.md`. Validatoren (`test/test-opskrifter.js`) tjekker:

- `tumbi.id` er filnavnet, og id'et står i præcis én gruppe i `opskrifter/index.json` (version 2: `grupper` med `id` og `retter`). Grupperne er `aftensmad`, `bagning`, `soede-sager` og `halloween` (`GRUPPER` i `js/katalog.js`, billedet `grafik/gruppe-<id>.svg`, farven `[data-gruppe]` i `app.css`, og stemmen `lyd/faelles/gruppe-<id>.mp3`).
- Hvert trin har `tumbi.verbum` fra de 27 verber i `js/katalog.js`: `roere haelde skaere aelte rulle vende stege koge maale vaske-haender vente smage smoere mose bage piske drysse rive pensle tage-ud tage-ud-form si kagerulle pakke-ind smuldre pynte sproejte`.
- Trinteksten (`text`, den der læses op) er højst 9 ord.
- Kniv (`skaere`, `rive`) og varme (`stege`, `koge`, `vende`, `bage`, `tage-ud`, `tage-ud-form`, `si`) kræver `"voksen": true` og `voksen_hjaelp` (`"kniv"` eller `"varme"`). De to følges ad. `kagerulle`, `pakke-ind` og `smuldre` kan barnet selv.
- **Ordene går efter stammen + undtagelser** (`KNIV_ORD`, `VARME_ORD`, `RAA_ORD`, `REDAKTION` og `UNDTAGELSER` i `test/test-opskrifter.js`). Hvert ord med stammen fanges med alle bøjninger. En liste over tilladte former manglede altid en form («koge», så «smelte», «skære» og «æggeblommer»). Ord, der ikke er kniv, varme, råt eller en redaktionel note, står som hele ord i `UNDTAGELSER` med grunden. Mangler et ord dér, giver det et falsk fund (det sikre fejlvalg): skriv ordet på listen, gør ikke stammen snævrere.
- **Ordvagten i trinene** (kun `text`, uanset verbet): nævner teksten kniv eller rivejern (`riv…`, `hak…`, `skær…`, `skræl…`, og `kniv` også inde i ord: «brødkniven»), skal trinnet have `"voksen": true` og `"voksen_hjaelp": "kniv"`. Nævner den varme (`bag…`, og `steg`, `kog`, `smelt`, `komfur` og `ovn` også inde i ord: «småkoge», «bageovnen»), skal hjælpen være `"varme"`. Står der begge slags, afvises trinnet: `voksen_hjaelp` er én værdi, så trinnet deles i to. Undtaget er fx «knivspids», «skærebræt», «rivejern», «smørekniv», «hakkede», «bagepapir», «bagepulver», «kogebog», «bagefter» og «hovne», men ikke «bageplade» (pladen kan være varm). **«bag» som forholdsord («bag gryden») giver et falsk fund med vilje:** det kan ikke skelnes fra «og bag dem», så skriv «bagved». «varm» og «brun» er ikke med («en varm skive», «brun farin»).
- Efter hvert `bage`-trin (med eller uden timer) kommer et `tage-ud`-trin («Tag pladen ud af ovnen.») eller, når der bages i en dyb form, et `tage-ud-form`-trin («Tag formen ud af ovnen.»). Bages der videre i et nyt `bage`-trin, kommer det efter det sidste.
- `piske`, `pensle`, `mose`, `drysse`, `pynte` (læg en oliven eller en negl på) og `sproejte` (klem ketchup ud) kan barnet selv. Er der varme med, skriver opskriften `"voksen": true`, og så skal hjælpen være `"varme"` (validatoren kan ikke selv se varmen).
- Et trin med råt kød (`koed`) eller æg (`aeg`) i `ikoner` skal efterfølges af et `vaske-haender`-trin. Andre ingredienser må ikke røres før det, og der må ikke være en `vente`-pause eller en timer imellem eller på selve trinnet (så står barnet og venter med råt på hænderne; code review fund 5, 22-10: kødet lægges i uden timer, og timeren startes på trinnet efter vasken). Undtaget er `aelte` med timer, når det rå er i dejen (det rå trin rører, hælder, pisker, ælter eller ruller: `BLANDER` og `HAENDER_I_DEJ`): timeren måler barnets eget arbejde i dejen. Efter kødet i gryden er en æltning med timer ikke undtaget. Validatoren ser kun på verbet, så «Hæld kødet i gryden» (`haelde`) efterfulgt af en æltning med timer slipper igennem (urealistisk, kendt).
- Råt kød og æg i ingredienserne skal stå i `ikoner` på mindst ét trin. Ellers kan validatoren ikke se, hvornår hænderne skal vaskes.
- Nævner en ingredienslinje æg eller kød (`æg…` forrest, og `kød`, `fars`, `flæsk`, `kylling`, `bacon`, `laks`, `torsk`, `fisk`, `reje` og `medister` også inde i ord: «æggeblommer», «oksefars», «tigerrejer»), skal ikonet være `koed` eller `aeg`. Ellers slipper «3 æg» med mælke-ikonet uden håndvask. Undtaget er «ægte» og det kogte og færdige med ikonet `bouillon` («kyllingebouillon», «kyllingefond», «kødbouillon», «fiskebouillon», «fiskefond», «fiskesauce»), og færdige pølser og pålæg: «kyllingepølser» (ikonet `poelse`) og «kyllingepålæg» (`skinke`). «kyllingetern» er med vilje ikke undtaget, for de kan være rå. Et sammensat ord, der ikke står på listen (fx «kyllingebouillonterning»), giver et falsk fund.
- Rå fisk og råt svinekød bruger også ikonet `koed`, så validatoren kræver håndvask. `tun` (på dåse) og `skinke` (pålæg) er ikke rå. `poelse` er kun færdige pølser (wiener-, hotdog- og kyllingepølser). Rå pølser (medister, salsiccia) bruger `koed`: stammen fanger kun «medister», så de andre skal man selv give det rigtige ikon.
- Æg til pensling er råt, til der bages: `pynte`, `pakke-ind`, `smuldre`, `rulle`, `kagerulle` og `aelte` efter en `pensle` med `aeg` kræver en ny håndvask. Pynt derfor før penslingen. Et `bage`- eller `stege`-trin (eller en `vente` med `"voksen_hjaelp": "varme"`) gør ægget færdigt, og en pensling med æg, der aldrig bliver bagt eller stegt, giver en fejl (code review 1 og 2, 20-10).
- Dej eller fars med råt æg (eller kød) regnes først som indarbejdet efter æltningen: et `aelte`-, `rulle`- eller `kagerulle`-trin efter et `roere`-, `haelde`- eller `piske`-trin med et råt ikon tæller som råt (med de rå ikoner fra alle blandetrinene), så vasken kommer efter æltningen eller formningen, ikke før. Efter `aelte` er det rå indarbejdet, og efter `stege` og `bage` er dejen ikke rå længere («Rul pandekagen sammen.» efter stegningen). `koge` tæller med vilje ikke: det er ofte noget andet, der varmes (smør eller mælk i en lille gryde), mens dejen er rå.
- `timer_sek` er et heltal, højst 4 timer. Billedfilerne findes.
- Hvad kilden siger, og hvad der er et skøn, står i `tumbi.kilde` (vises kun i printets fod), ikke i navn, beskrivelse, antal, ingredienser, redskaber, trin eller noter. Validatoren afviser dér hvert ord, der begynder med `kild` eller `skøn` («Kilden», «Kildeteksten», «skøn», «skønsmæssig», `REDAKTION`). Undtaget er «kildevand», «skønt» (selvom) og «skønne» og «skønneste» (smukke). Har kildenoten flere sætninger, slutter den med punktum, ! eller ? («Egen tekst» står uden).
- En ny ret skrives med `"afproevet": false`, indtil den er lavet.

## Ny opskrift

1. Kopiér en af `opskrifter/<id>.json`, og skriv id'et i den rigtige gruppe i `opskrifter/index.json` (aftensmad, bagning, søde sager eller halloween).
2. Kør `node test/test-opskrifter.js`. Den siger præcis, hvad der er galt.
3. Læg retbilledet `grafik/ret-<id>.webp` (Codex-PNG gjort til 640 px WebP med `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik <id>`, se faldgruben om Codex) og nye verbum- eller ingrediens-billeder (SVG). Tilføj filerne i `FILER` i `sw.js`.
4. Kør `node test/test-sw.js`, og sæt den nye `INDHOLD` (se regel 3 nedenfor).
5. Lav stemmen til den nye ret (se «Stemmen»). Indtil da læser iPad-stemmen den, og `test/test-lyd.js` fejler.

## Stemmen

Al oplæsning er Røst v3 500m fra Alexandra Instituttet (referencestemmen «Nic»), lavet på forhånd på pc'en med scripts i `D:\Stemmer` (uden for repoet, kører på cpu: 14-25 s pr. replik). Printets fod siger det til de voksne. Ændres en tekst, appen siger (en opskrift, `js/replikker.js` eller `js/tekst.js`), fejler `test/test-lyd.js` og siger hvilke. Sådan laves lyden igen (Git Bash):

1. `node vaerktoej/lav-taleliste.js D:/Stemmer/kogebog-500m/taleliste.json` (i `D:/Claude/Kogebog`).
2. `bash ~/.claude/tung-koersel.sh "stemmer/roest: kogebog" bash /d/Stemmer/koer-kogebog.sh 25`, igen og igen, til loggen (`D:/Stemmer/kogebog-500m/koersel-log.txt`) siger «ALT LAVET». Et kald laver ca. 20 replikker på 7 minutter og kan altid genoptages. Kun nye og ændrede tekster laves.
3. `D:/Stemmer/roest-venv/Scripts/python.exe -I D:/Stemmer/efterbehandl_kogebog.py D:/Stemmer/kogebog-500m/taleliste.json D:/Stemmer/kogebog-500m` finder de mistænkelige (varighed pr. tegn, clipping, lange pauser, modellens tvungne slut) og skriver dem i `mistaenkelige.txt`. Lav dem igen med seed 43 og 44: `… koer-kogebog.sh 25 43 D:/Stemmer/kogebog-500m/mistaenkelige.txt` og samme med `44`.
4. Samme efterbehandling med `--mp3` til sidst: vælger den bedste udgave, skærer stilheden til 0,15 s, sætter lydstyrken til -23 LUFS (spidser højst -1,5 dBFS) og laver mono mp3 24 kHz 64 kbit/s. Den skriver hvilke filer, der stadig bør lyttes til.
5. `node vaerktoej/indsaet-lyd.js D:/Stemmer/kogebog-500m` kopierer kun mp3-filer, der er lavet af den tekst, appen siger nu, og skriver `lyd/liste.json` og `lyd/tekster.json`. Den nævner gamle mp3-filer i `lyd/`, som ingen replik bruger nu; `--ryd` sletter dem. Sæt så den nye `INDHOLD` og `LYD` i `sw.js` (regel 3).

- **Efter en tekstændring kan trin 4 vælge en gammel seed 43/44-udgave**, lavet af den gamle tekst (`efterbehandl_kogebog.py` tjekker ikke teksten, og `mistaenkelige.txt` springer filer over, der har 43/44). `indsaet-lyd.js` afviser dem («lavet af en anden tekst»). Skriv de filer i en kun-fil, lav seed 43 og 44 igen med den, og kør trin 4 og 5 igen (19-10-2026: 23 filer).
- **Røst læser cifre og tegn forkert** («130 gram» → «tretnulsnul», «7 + 5 = 12» → «syv procent fem simpel tolv»; talegenkenderen 19-10-2026). `tilTale` i `js/tekst.js` skriver derfor alt ud som ord, og `test-tid.js` fejler, hvis en replik stadig har et ciffer eller et tegn, eller hvis ordet efter 1, ½ eller x,5 ikke står i `KOEN` (så skrives det på listen).
- Lydfilerne gemmes på iPad'en, første gang de spilles (ikke ved installationen: 520 filer på ca. 11 MB 20-10-2026, mange gange resten af appen), i deres egen cache `kog-lyd-<LYD>`, som en ny udgave af appen ikke sletter. Uden net læses en replik, der ikke er spillet før, af iPad-stemmen med det samme. Svarer nettet ikke inden for 4 s (wifi uden internet), afbryder `sw.js` hentningen, og iPad-stemmen tager over.
- Safari beder om lyd i bidder (`Range`). `sw.js` gemmer hele filen og skærer bidden ud (en 206 kan ikke gemmes i en cache).

## Regler

1. **Ingen afhængigheder i appen.** Playwright er kun testværktøj, og `NODE_PATH` peger på den globale installation. Ingen `npm install` uden at spørge Jimmy.
2. **Kun `textContent`.** Ingen `innerHTML`. CSP i `index.html` og `print.html` tillader kun egne filer (`default-src 'self'`).
3. **Ændres en fil i `FILER` i `sw.js`** (kode, css, json eller grafik), skal `INDHOLD` følge med. `test/test-sw.js` fejler og viser den nye værdi, men skriver den ikke selv. Sæt den i `sw.js`. Ellers henter iPads ikke den nye udgave. `INDHOLD` er sha256 over stier og indhold, med LF i tekstfiler, så CRLF fra Git på Windows ikke ændrer tallet. Lydfilerne i `lyd/` har deres eget tal, `LYD` (de står ikke i `FILER`, men gemmes, når de spilles), så nye mp3-filer kræver en ny `LYD`; testen viser også den.
4. **Cache-præfiks `kog-`.** `sw.js` rører kun `kog-`-caches. Lystårnet (`mat-`) og LEGO (`lego-`) ligger på samme origin.
5. **`kog-v1` i `localStorage`** er `{ v, sidste, timer }`. Ændres formatet, skal der skrives en migrering, så gemte data ikke forsvinder (Jimmys regel). Koden nulstiller i dag ved en anden version (`rens()` i `lager.js`). Det er ikke en migrering, så afklar det før første formatændring. **`kog-uge-v1` og `kog-liste-v1`** har en versionsvagt i stedet: et højere `v` (en nyere udgave) læses som tomt og skrives aldrig over (`laast`), og et lavere `v` løftes ét trin ad gangen af kæden i `MIGRER_UGE`/`MIGRER_LISTE`. Ny gemt data får en nøgle der, aldrig en egen nøgle i en anden fil, og `rens()` må ikke kopieres til de nye nøgler. `gemUge` renser den gemte plan kun for form og grænser; «retter» filtrerer kun det, der vises, og nye dage (code review M1, 22-10).
6. **Ingen persondata om børn** i filer, prompter eller commit-beskeder. Skriv «børn ca. 5-9 år». Ingen fotos af børn.
7. **Ingen push og ingen udgivelse** uden Jimmys ja. Udgivelse på GitHub Pages er offentlig, så der må ikke ligge nøgler i koden.
8. **Ingen Google-stemme.** Chirp 3 HD er udelukket, medmindre Google bekræfter skriftligt (`docs/gennemgang.md`).
9. **Knapper:** børnenes knapper mindst 64 px, de voksnes mindst 48 px. `test-e2e.js` tjekker det.
10. **Test i WebKit** (Safaris motor) i 1180×820 (iPad), 390×844 (iPhone) og 1280×800 (desktop). Statiske sider testes over HTTP, aldrig `file://`.

## Faldgruber (set i praksis)

- **`\b` i regex kender kun a-z.** «1 løg» blev til «1 literøg». Brug `\p{L}` med `u`-flaget (`tekst.js`). Testen ligger i `test-tid.js`.
- **`obj[navn]` finder også arvede egenskaber.** Et opslag i `VERBER` med `constructor` eller `toString` gav et objekt og slap igennem. Brug `Object.hasOwn` (validatoren).
- **Skærm-låsen kan forsvinde uden `release`**, fx når fanen skjules. Tjek `released` ved næste tryk, og bed om låsen igen (`timer.js`).
- **Lyd på iPad:** brugeraktivering tæller ved `pointerup`, `touchend`, `click` og `keydown`, ikke ved `pointerdown` med en finger. Lyden klargøres ved første tryk efter en genindlæsning (`timer.js`). Et nyt lydelement kræver sit eget tryk, så `tale.js` genbruger ét element, der låses op (`load()`) ved første tryk, og siger en tavs ytring, så iPad-stemmen også kan tale efter et voksen-hold (det lykkes i `requestAnimationFrame`, uden tryk). Er det allerførste tryk efter en genindlæsning et voksen-hold, er det trin tavst. Ikke afprøvet på iPad.
- **`scrollWidth` fanger ikke overløb,** fordi `body` har `overflow-x: hidden`. e2e måler elementernes placering i stedet (`tjekLayout`).
- **En holdt tast gentager handlingen,** medmindre der tjekkes `e.repeat` (`app.js`).
- **Tab i rettens bund følger med vilje ikke skærmen** fra 901 px og på lave skærme på langs: man ser print, Start forfra, Fortsæt, men Tab går Fortsæt → print → Start forfra, så den vigtigste knap nås først (`order` i `app.css`). Ikke en fejl, der skal rettes.
- **WebKit på Windows tegner med Trebuchet MS,** ikke iPhonens/iPadens `ui-rounded` (første skrift i `--skrift`, der findes på pc'en). Tekstbredder i e2e er derfor kun omtrentlige, så hold luft i knaprækker.
- **WebKit afviser adresseskift ud over ca. 200 pr. 10 s i samme dokument** («Excessive navigation attempts blocked.», målt i Playwright WebKit). e2e åbner derfor hver ret i et nyt dokument, og et afvist skift meldes for sig. En test, der går gennem mange trin med `location.hash`, skal gøre det samme.
- **WebKit sender intet `click`, når tekstnoden under musen skiftes ud mellem mousedown og mouseup** (`textContent` hvert tik; målt 22-10-2026: et tryk på 600 ms på timer-pillens tal gav 0/6 klik). Børn af en knap med skiftende tekst får `pointer-events: none` (`.pille`, `.hold-indhold`). Det samme, når knappen flytter sig under musen: «Start timer» hoppede ca. 200 px mod midten, når en anden timer løb ud midt i trykket, og forklaringen forsvandt (0/6 klik, også når knappen blev stående i DOM'en). `timerBlok` tegner derfor ikke om, mens knappen trykkes (`trykkes` i `app.js`). Fingertryk på en rigtig iPad er ikke afprøvet.
- **Safari fjerner listesemantik,** når `list-style: none` er sat. Print-listen har derfor `role="list"`.
- **Codex kan lave billeder** (målt 21-10-2026, codex-cli 0.160.0): `codex.cmd exec --skip-git-repo-check -C <mappe> -c sandbox_mode="workspace-write" "Use your image generation tool … save it as <navn>.png"` gav en PNG på 1024 px med hvid bund. Ét billede brugte ca. 83.000 Codex-tokens. Før 21-10 skrev Codex kun SVG-tekst. **Send prompten på stdin** (`… exec … -`): `codex.cmd` skærer et argument af ved første linjeskift, så en liste over flere billeder blev til «send listen». Plus-kvoten kan løbe tør midt i en serie (21-10: stop kl. 16:53, ny kvote kl. 21:37).
- **`note` vises med «Til den voksne:» foran** (`trinSkaerm` i `app.js`). Derfor gælder ordvagten kun `text`: noten må gerne nævne kniven og ovnen. Printet (`js/print.js:29`) viser noten uden den etiket. Kendt, ikke rettet.
- **`sw.js` henter `index.json` netværk først, men koden, der læser den (`js/data.js`), cache først.** Efter en formatændring kan en iPad derfor køre den gamle `data.js` mod den nye `index.json`, indtil den nye service worker er installeret. En formatændring i `index.json` skal derfor kunne læses af både den gamle og den nye `data.js`. Der er ingen brugere endnu.
- **Tunfrikadellernes «Hæld vandet fra tunen.» har `haelde`, ikke `si`** (en kendt skævhed). Si-billedet viser en varm gryde over dørslaget, og tunen er kold og står i en dåse. `si` bruges kun ved kogende vand (kartoffelmos og kødsovs).
