# CLAUDE.md – Tumbi Køkken (D:\Claude\Kogebog)

Kogebog til et barn (ca. 5-9 år) og en voksen, der laver mad sammen på iPad i landskab. Ét trin pr. skærm, billeder, oplæsning, timer og et A4-print til den voksne. Statisk PWA uden byggetrin og uden afhængigheder. **Ikke udgivet.** Eget git-repo, gren `main`.

Hvor man starter: `LÆS-MIG-FØRST.md`. Status: `STATUS.md`. Plan og begrundelser: `docs/gennemgang.md`.

## Kommandoer

Kør i Git Bash i `D:/Claude/Kogebog`.

| Hvad | Kommando |
|---|---|
| Alle node-tests (4 filer, ingen browser) | `node test/koer-alle.js` eller `npm.cmd test` |
| Én testfil | `node test/test-opskrifter.js` (også grafik og index.json), `test-validator.js`, `test-tid.js`, `test-sw.js` |
| Lokal server | `py -m http.server 8091 --bind 127.0.0.1 --directory D:/Claude/Kogebog`, og åbn http://127.0.0.1:8091/. Aldrig `file://` |
| E2E i WebKit (TUNG) | `NODE_PATH=C:/Users/Jimmy/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules bash ~/.claude/tung-koersel.sh "kogebog: e2e" node test/test-e2e.js http://127.0.0.1:8091` |
| Kun dele af e2e | sæt foran kommandoen: `E2E_DELE=tastatur,timer` og/eller `E2E_SKAERME=ipad,iphone,desktop`. Dele: `hele,print,tastatur,timer,fejl,beroering,former` (`former` = 360 px, 768×1024 og 844×390) |
| Hjemmeskærm-ikoner (PNG) | `NODE_PATH=C:/Users/Jimmy/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules bash ~/.claude/tung-koersel.sh "kogebog: ikoner" node vaerktoej/lav-ikoner.js` |

- E2E er tung og kører kun gennem `tung-koersel.sh`. Exit 75 = låst af en anden kørsel (Lystårnets e2e kan tage 30-60 min). Exit 76 = under 4 GB fri RAM. Prøv igen senere med pauser, og skriv «ikke kørt: låst», hvis det ikke lykkes.
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
| `js/tekst.js`, `js/tid.js` | Rene funktioner, uden DOM: enheder og forkortelser til stemmen, ordtælling, timerens tid |
| `js/timer.js` | Én timer ad gangen: sluttid, lyd, skærm-lås |
| `js/tale.js` | Oplæsning: `lyd/<fil>` hvis den står i `lyd/liste.json` (listen er tom), ellers iPad-stemmen (`speechSynthesis`, `da-DK`) |
| `js/hold.js` | Knap, der skal holdes inde i 2 s (voksen-trin og print) |
| `js/lager.js` | Det eneste, appen gemmer i `localStorage`: nøglen `kog-v1` |
| `js/dom.js` | Bygger elementer. Tekst sættes som tekst |
| `sw.js`, `manifest.webmanifest` | Offline: service worker med `kog-`-caches |
| `opskrifter/` | `<id>.json` pr. ret og `index.json` (rækkefølgen på forsiden) |
| `grafik/`, `ikoner/` | SVG-billeder i fase 1 og ikoner til hjemmeskærmen |
| `test/`, `vaerktoej/lav-ikoner.js` | Node-tests og `test-e2e.js`. Ikon-scriptet laver PNG-ikonerne |
| `docs/` | `gennemgang.md` (plan), `chatgpt-app-prompt.md` og `chatgpt-grafik-prompt.md` (prompter til ChatGPT) |

## Opskriftsformatet

Standard schema.org/Recipe med egne felter under `tumbi`. Den fulde tabel står i `docs/gennemgang.md`. Validatoren (`test/test-opskrifter.js`) tjekker:

- `tumbi.id` er filnavnet, og id'et står i `opskrifter/index.json`.
- Hvert trin har `tumbi.verbum` fra de 12 verber: `roere haelde skaere aelte rulle vende stege koge maale vaske-haender vente smage`.
- Trinteksten (`text`, den der læses op) er højst 9 ord.
- Kniv (`skaere`) og varme (`stege`, `koge`, `vende`) kræver `"voksen": true` og `voksen_hjaelp` (`"kniv"` eller `"varme"`). De to følges ad.
- Et trin med råt kød (`koed`) eller æg (`aeg`) i `ikoner` skal efterfølges af et `vaske-haender`-trin. Andre ingredienser må ikke røres før det.
- `timer_sek` er et heltal, højst 4 timer. Billedfilerne findes.
- En ny ret skrives med `"afproevet": false`, indtil den er lavet.

## Ny opskrift

1. Kopiér en af de fem `opskrifter/<id>.json`, og skriv id'et i `opskrifter/index.json`.
2. Kør `node test/test-opskrifter.js`. Den siger præcis, hvad der er galt.
3. Læg `grafik/ret-<id>.svg` (og nye verbum- eller ingrediens-billeder). Tilføj filerne i `FILER` i `sw.js`.
4. Kør `node test/test-sw.js`, og sæt den nye `INDHOLD` (se regel 3 nedenfor).

## Regler

1. **Ingen afhængigheder i appen.** Playwright er kun testværktøj, og `NODE_PATH` peger på den globale installation. Ingen `npm install` uden at spørge Jimmy.
2. **Kun `textContent`.** Ingen `innerHTML`. CSP i `index.html` og `print.html` tillader kun egne filer (`default-src 'self'`).
3. **Ændres en fil i `FILER` i `sw.js`** (kode, css, json eller grafik), skal `INDHOLD` følge med. `test/test-sw.js` fejler og viser den nye værdi, men skriver den ikke selv. Sæt den i `sw.js`. Ellers henter iPads ikke den nye udgave. `INDHOLD` er sha256 over stier og indhold, med LF i tekstfiler, så CRLF fra Git på Windows ikke ændrer tallet.
4. **Cache-præfiks `kog-`.** `sw.js` rører kun `kog-`-caches. Lystårnet (`mat-`) og LEGO (`lego-`) ligger på samme origin.
5. **`kog-v1` i `localStorage`** er `{ v, sidste, timer }`. Ændres formatet, skal der skrives en migrering, så gemte data ikke forsvinder (Jimmys regel). Koden nulstiller i dag ved en anden version (`rens()` i `lager.js`). Det er ikke en migrering, så afklar det før første formatændring.
6. **Ingen persondata om børn** i filer, prompter eller commit-beskeder. Skriv «børn ca. 5-9 år». Ingen fotos af børn.
7. **Ingen push og ingen udgivelse** uden Jimmys ja. Udgivelse på GitHub Pages er offentlig, så der må ikke ligge nøgler i koden.
8. **Ingen Google-stemme.** Chirp 3 HD er udelukket, medmindre Google bekræfter skriftligt (`docs/gennemgang.md`).
9. **Knapper:** børnenes knapper mindst 64 px, de voksnes mindst 48 px. `test-e2e.js` tjekker det.
10. **Test i WebKit** (Safaris motor) i 1180×820 (iPad), 390×844 (iPhone) og 1280×800 (desktop). Statiske sider testes over HTTP, aldrig `file://`.

## Faldgruber (set i praksis)

- **`\b` i regex kender kun a-z.** «1 løg» blev til «1 literøg». Brug `\p{L}` med `u`-flaget (`tekst.js`). Testen ligger i `test-tid.js`.
- **`obj[navn]` finder også arvede egenskaber.** Et opslag i `VERBER` med `constructor` eller `toString` gav et objekt og slap igennem. Brug `Object.hasOwn` (validatoren).
- **Skærm-låsen kan forsvinde uden `release`**, fx når fanen skjules. Tjek `released` ved næste tryk, og bed om låsen igen (`timer.js`).
- **Lyd på iPad:** brugeraktivering tæller ved `pointerup`, `touchend`, `click` og `keydown`, ikke ved `pointerdown` med en finger. Lyden klargøres ved første tryk efter en genindlæsning (`timer.js`). Ikke afprøvet på iPad.
- **`scrollWidth` fanger ikke overløb,** fordi `body` har `overflow-x: hidden`. e2e måler elementernes placering i stedet (`tjekLayout`).
- **En holdt tast gentager handlingen,** medmindre der tjekkes `e.repeat` (`app.js`).
- **Safari fjerner listesemantik,** når `list-style: none` er sat. Print-listen har derfor `role="list"`.
- **Codex laver ikke billeder.** Den skriver SVG-tekst. Billederne laves i ChatGPT.
