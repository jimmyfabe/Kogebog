# Tumbi Køkken som forældrekogebog med børneopskrifter — research og forslag

> 10-11-2026 · uafhængig gennemgang af grenen `v9-madpakke` (arbejdskopi `D:/Claude/.claude/worktrees/kogebog-v9`, commit `7d616c7`). Intet er ændret i projektet. Appen er set i Playwright (Chromium) på 1180×820 og 390×844; skærmbillederne ligger i `skaerm/` ved siden af denne fil. Mærker: **[kode: fil:linje]** = set i koden, **[kilde: link]** = læst på nettet, **[vurdering]** = min egen vurdering.

## Anbefaling i én sætning

Vend appen om: forældredelen bliver et roligt værktøj med **tre faner i én fast rækkefølge — Uge → Indkøb → Retter (+ Mere)** — hvor *én* liste («Vores retter» med hjerter) erstatter de fire lister, der findes i dag (Ugens udvalg, Favoritter, Katalog og «Vælg ret til dagen»), og børnene får to ting: et **«I dag»-kort** på forsiden og **valget blandt højst 12 kort** (forældrenes hjerter + 2 nye) i stedet for 83.

## De 5 største problemer (hvorfor det føles forvirrende)

| # | Problem | Hvor |
|---|---|---|
| 1 | **Forældrenes værktøj er gemt bag børnenes forside.** Eneste vej er den lille «Voksne: hold» nederst. Efter holdet møder man en **menu med 7 lige store felter** (Ugeplan, Indkøbsliste, Husstand, Ugens udvalg, Favoritter, Katalog, Mere grønt) uden rækkefølge eller «hvad gør jeg nu». Det er indstillinger, ikke en arbejdsgang | [kode: app.js:313-319], [kode: js/voksen-del.js:549-566], skærmbillede `06-voksen-hub-ipad.png` |
| 2 | **Samme retter står i fire lister med hver sin knap og hver sin regel:** «Ugens udvalg» (knap «Med», filtre = mærker), «Katalog» (tre knapper pr. række: «Med i udvalget», hjerte, «Åbn»), «Favoritter» (hjerte) og «Vælg ret til mandag» (knap «Vælg», fem andre filtre, viser alle 83 og ignorerer udvalget). Forælderen skal forstå tre begreber — udvalg, favorit, plan — for at lave én uges mad | [kode: js/voksen-del.js:726-786, 790-806, 847-886], [kode: js/ugeplan.js:723-734, 744] |
| 3 | **Standarden er, at børnene vælger mellem alle 83 retter = 21 sider à 4 kort.** Udvalget er en undtagelse, man skal opdage, og reglen «efter det første ‹Med› ser de kun dem, der er med» står som hjælpetekst, fordi den ellers overrasker | [kode: js/ugeplan.js:821, 839-844], [kode: js/voksen-del.js:877-879] |
| 4 | **Låsen er usammenhængende.** `#/voksen…` kræver hold og låser, når man forlader den — også når man trykker «Ugeplan» i menuen. Ugeplanen (`#/uge`) kræver *ikke* hold (jeg åbnede den direkte i adressen), og dens topbar har kun «Hjem», så vejen tilbage til voksenmenuen er: forside → hold 2 s igen. Der findes fem forskellige hold-knapper (Voksne, Print, Ny uge, Alle retter, Ugeplan) | [kode: js/voksen-del.js:206-215], [kode: js/ugeplan.js:695, 669-679, 895-900], [kode: app.js:479], [kode: js/voksen-del.js:749-754] |
| 5 | **Portioner og indstillinger står to steder, og indkøbslisten har fire udgange.** «Portioner til nye retter» og «Retter pr. barn» ligger øverst på ugeplanen; «Husstand» (som også giver portioner) ligger i voksenmenuen. Ugeplanens bund har Indkøbsliste, Send til telefon, Del som tekst og Print; menuens «Indkøbsliste» laver listen om via `#/hent/<kode>` og kan spørge «Erstat listen?» | [kode: js/ugeplan.js:651-667, 684-692], [kode: js/voksen-del.js:483-488, 553-554], [kode: js/ugeplan.js:208] |

Mindre ting: iPhone-skærmen `#/indkoeb` uden plan er en tom side med «Sæt linket ind» (`10-indkoeb-iphone.png`) — telefonen kan ikke selv lave listen, selvom ugeplanen *kan* laves på telefonen (samme kode). Der er intet mørkt tema (`color-scheme: light`) [kode: index.html:7]. «Lukker efter 10 minutter uden tryk» står som undertitel og lyder som en advarsel [kode: js/voksen-del.js:562].

## Hvad research siger (kort)

- **Gode madplan-apps har én arbejdsgang: vælg retter → ugen → liste efter butikkens afdelinger → kryds af.** Mealime: vælg retter, «Checkout», listen samles pr. ret og grupperes efter butiksafdeling; det, man nok har i forvejen, ligger nederst [kilde: https://support.mealime.com/article/151-getting-started-guide]. Paprika: «Organized by aisle or recipe», «Combine matching groceries», genbrugelige menuer og et spisekammer [kilde: https://paprikaapp.com/]. Plan to Eat: listen laves af planens datoer, kategorierne følger ens butik, og en «Staples»-liste dækker faste varer [kilde: http://www.plantoeat.com/blog/2013/06/automatically-generate-your-shopping-list-from-your-meal-planner/]. AnyList: én liste, der genbruges, favoritter som faste varer, og «category sets», der ordner listen efter den enkelte butik [kilde: https://help.anylist.com/articles/weekly-shopping/]. Samsung Food: liste efter gang, delt i husstanden, favoritvarer (App Store-tekst, sekundær) [kilde: https://apps.apple.com/us/app/id1133637674]. **Tumbi har allerede afdelingerne, sammenlægningen, «Har vi» og basisvarerne** [kode: js/indkoeb.js, js/katalog.js:268-275] — det er strukturen omkring, der mangler [vurdering].
- **Danske apps:** Madopskrifter.nu «Madplanen» (liste uden dubletter i grupper), Maddie (delte planer og lister), Nem Madplan (lås en ret på en dag), Madplan.ai (REMA-tilbud) [kilde: App Store-sider, se bilag]. Jeg fandt ingen dansk app, hvor børnene vælger inden for forældrenes ramme [vurdering, én søgning].
- **Forælderen vælger rammen, barnet vælger i den** er præcis Satters «Division of Responsibility»: den voksne bestemmer hvad, hvornår og hvor; barnet om og hvor meget [kilde: https://www.ellynsatterinstitute.org/how-to-feed/the-division-of-responsibility-in-feeding/]. Børn, der laver mad med en forælder, spiste mere grønt i et forsøg (van der Horst m.fl., Appetite 2014; læst som resumé) [kilde: https://pmc.ncbi.nlm.nih.gov/articles/PMC6768385]. **Om selve valget får dem til at spise mere, er ikke afgjort:** et hollandsk RCT fandt ingen effekt af at vælge mellem to grøntsager (Zeinstra 2010), et spansk skoleforsøg med 4-6-årige fandt højere indtag (Domínguez 2013) [kilde: https://www.aprifel.com/fr/resume-scientifique/offering-choice-and-its-effect-on-dutch-children-s-liking-and/ og https://digibug.ugr.es/handle/10481/87131, begge kun resuméer]. Så valget er til ejerskab og ro ved bordet, ikke en garanti [vurdering].
- **Få valg pr. skærm.** Iyengar & Lepper (2000): 6 syltetøj solgte bedre end 24, men effekten er omstridt (metaanalyse ≈ 0) [kilde: https://www.psychologytoday.com/us/blog/pop-psych/201602/is-choice-overload-real-thing]. For børn, der ikke læser, er det alligevel sidetallet, der tæller: 83 retter er 21 sider [vurdering]. NN/g (2019): 3-5, 6-8 og 9-12 år skal designes forskelligt; «flere veje til det samme» er *meget* forvirrende for børn; lange tekster springes over; en stor Tilbage-knap på siden bruges, browserens ikke [kilde: https://www.nngroup.com/articles/childrens-websites-usability-issues/]. Det taler for én vej for børnene — og for forældrene [vurdering].
- **Børn i køkkenet:** Fødevarestyrelsens vejledning (2022) opfordrer til, at børn deltager, men ikke smager råt kød, fars eller dej med rå æg [kilde: https://foedevarestyrelsen.dk/Media/639174703281403238/Madaktiviteter_med_boern__red_august2022__webtil2.pdf]. Appens håndvask-regel dækker det allerede [kode: CLAUDE.md «Opskriftsformatet»].

## Den nye struktur

```
Forside (børn)                       Voksne (hold 2 s, én lås for hele delen, 10 min)
├─ «I dag: Månepasta» ─► retten       ├─ Uge      (planen: 7 dage, Børnene vælger, Fyld ugen)
├─ 11 billedknapper (som nu)          ├─ Indkøb   (listen fra planen, afdelinger, Har vi, Del ▾)
└─ Voksne: hold ──────────────────►   ├─ Retter   (ÉN liste: søg, grupper, mærker, ♥ Vores, Åbn)
                                      └─ Mere     (husstand, retter pr. barn, nye pr. uge, mere grønt, tema)
Børnene vælger (fra Uge, iPad gives videre)
   Hvem? (Bo · Rosa · Pip) ─► 4 kort pr. side, højst 12 (♥ + 2 ✨ nye) ─► Hvilken dag?
```

**Forælderens uge (søndag aften, 5 minutter):** Uge → «Børnene vælger» (iPad'en gives videre, kommer tilbage) → «Fyld ugen» med Vores retter eller vælg selv pr. dag → Indkøb (listen er der, intet link skal laves på samme enhed) → Del ▾ (Send til telefon / Noter / Print) → i butikken: kryds af → på dagen: forsidens «I dag»-kort.

**Børnenes del:** «I dag»-kortet (læser `kog-uge-v1` for dagens dato — ingen ny data) og valget som nu, men blandt højst 12 kort: forældrenes hjerter, sorteret så de mindst nyligt lavede kommer først, plus 2 ✨-kort, familien ikke har lavet (`lavet` findes allerede). Trin for trin med oplæsning er uændret.

**Fjernes eller gemmes væk:** siderne «Ugens udvalg», «Favoritter» og «Katalog» bliver til én («Retter»); begrebet *udvalg* forsvinder for forælderen (det bliver *Vores retter*); «Portioner til nye retter» og «Retter pr. barn» flytter til Mere; «Alle retter: hold» og «Erstat listen?» på samme enhed forsvinder; voksenmenuen (hub) erstattes af fanerne; «Lukker efter 10 minutter» bliver et lille ikon, ikke en undertitel. Ugeplanen kommer *ind under* låsen, så man ikke skal holde to gange.

**Udseende:** forældredelen i en rolig, voksen stil (hvid/grafit, samme runde skrift, tyndere streger, 48 px knapper, mørkt tema efter systemet), børnedelen beholder dugen, dyrene, de tykke streger og 64/88 px. Se `mockup.html` (lys/mørk, forælder/børn, 390×844 og iPad på langs).

## Faseplan

| Fase | Indhold | Str. | Risiko | Data |
|---|---|---|---|---|
| **1. Mindste trin, mest værdi** | (a) «I dag»-kort på forsiden. (b) Børnene ser hjerter + 2 nye, når intet udvalg er sat (ren ændring i `retterTilBoern`). (c) Låsen dækker `#/uge…`; topbar på ugeplanen får «Voksne» tilbage til menuen. (d) Menuen i rækkefølge Uge · Indkøb · Retter · Mere, husstand-status i ugeplanens hoved | S | Lav: ingen nye nøgler, e2e-delene `voksen` og `ugeplan` skal rettes | Ingen |
| **2. Én liste, fire faner** | Faneskal for voksendelen; «Retter» = kataloget med ♥ og Åbn; udvalg-siden og favorit-siden fjernes; «Mere» samler indstillinger; `kog-familie` v2 (udvalg → favoritter, `nyePrUge`) | M | Mellem: migrering + mange e2e-tjek | v2, se bilag B |
| **3. Indkøb som fane** | Listen laves af planen på samme enhed uden link; «Del ▾» (telefon, Noter, print); «Har vi»-varer huskes fra uge til uge; afdelingsrækkefølge kan vælges pr. butik (Rema/Netto/Lidl/365) | M | Mellem: `kog-liste` v2 | v2, se bilag B |
| **4. Telefon ↔ iPad** | Hjerter/plan fra telefon til iPad som kode-link (`tumbi.nr`, foraeldredel.md §6), evt. QR | L | Høj: nyt link-format, streng afkodning, review-workflow | Nye felter i opskrifterne |
| 5. Pynt | Mørkt tema for forældredelen, lydløs tilstand, «Lav igen»-forslag | S | Lav | Ingen |

Fase 1 kan laves og udgives alene og fjerner problem 3 og 4 helt og det meste af 1. Fase 2 fjerner problem 2 og 5.

---

# Bilag

## A. Flows i dag, skridt for skridt (målt i Playwright 10-11-2026)

1. **Forside → voksendel.** Forsiden viser 11 billedknapper og nederst «Voksne: hold» [kode: app.js:295-319]. Et hold på 2 s åbner `#/voksen` [kode: js/voksen-del.js:175-178]. Åbnes `#/voksen` direkte, kommer vagtskærmen med et nyt hold [kode: js/voksen-del.js:440-457]. Låsen ligger i en modulvariabel og lukker ved forlad, efter 10 min og med «Luk» [kode: js/voksen-del.js:130-183, 206-215].
2. **Voksenmenuen** har 7 punkter i rækkefølgen Ugeplan, Indkøbsliste, Husstand, Ugens udvalg, Favoritter, Katalog, Mere grønt [kode: js/voksen-del.js:549-561]. «Indkøbsliste» regner planens kode ud og går til `#/hent/<kode>` — samme vej som telefonen, med «Erstat listen?» når koden er ny [kode: js/voksen-del.js:483-488, js/ugeplan.js:208-235].
3. **Husstand** gemmer voksne + børn og regner `n` ud; status på menuen: «Ikke sat. Nye retter er til 4 portioner» [kode: js/voksen-del.js:553-554, 591-660]. Ugeplanen har sin egen stepper «Portioner til nye retter» (samme `p.n`) [kode: js/ugeplan.js:651-657].
4. **Ugens udvalg:** liste over de 83 ugeplan-retter med «Med», filtre i en foldet «Mærker»-boks, «Fyld op med nye» (8 første gang, så 4) og «Alle retter: hold» [kode: js/voksen-del.js:726-786, 30-31]. Hjælpeteksten forklarer, at børnene uden udvalg ser alle 83.
5. **Katalog:** alle 239 retter, tre knapper pr. række [kode: js/voksen-del.js:847-856], og hjælpeteksten om «det første ‹Med›» [kode: js/voksen-del.js:877-879]. **Favoritter:** samme liste med hjerte [kode: js/voksen-del.js:790-806]. Begge søger med `js/soeg.js`.
6. **Ugeplan** (`#/uge`, uden hold): indstillinger øverst, 7 rækker med «Vælg ret»/«Byt ret»/«Fjern»/stepper, bund med sum og fire udgange [kode: js/ugeplan.js:616-709]. «Vælg ret til mandag» viser alle 83 med fem chips (Højst 40 min, Vegetar, Masser af grønt, Billigst først, Mindst kniv først) og ignorerer udvalget [kode: js/ugeplan.js:723-745]. Topbaren har kun Hjem [kode: js/ugeplan.js:695].
7. **Børnenes valg** (`#/uge/vaelg`): Hvem (Bo, Rosa, Pip) → 4 retter pr. side → 7 dagbrikker, med stemme på hvert tryk; Rosa og Pip højst `prBarn` hver; «Ugeplan: hold» tilbage [kode: js/ugeplan.js:809-900, 921-954]. Uden udvalg: `retterTilBoern(alle, null)` = alle [kode: js/ugeplan.js:839-844].
8. **Indkøbsliste på telefonen** (`#/indkoeb`): tom side med «Sæt linket ind» [kode: js/ugeplan.js:98-130, 244-258]; med en liste: afdelinger i butiksrækkefølge, købt/«Har vi», basisvarer i «Tjek, at I har» [kode: js/ugeplan.js:273-425, js/katalog.js:268-275, docs/ugeplan-plan.md §1].

Tal: 239 retter i 11 grupper, 83 med `ugeplan: true` (talt af script på `opskrifter/`). 83 / 4 pr. side = 21 sider.

## B. Data og migreringer (regel 5)

Alle fire nøgler læses gennem `laesMedVagt`: højere `v` → tomt og låst, lavere `v` → `MIGRER_*`-kæden [kode: js/lager.js:80-91]. Kæderne er tomme i dag [kode: js/lager.js:65-66, 212]. Forslagene nedenfor bruger netop den mekanisme — ingen nøgle nulstilles.

| Nøgle | I dag | Forslag | Migrering |
|---|---|---|---|
| `kog-v1` | `{ v, sidste, timer }` | **Uændret** | Ingen |
| `kog-uge-v1` | `{ v:1, uge, dage[7]{ret,af,n}, n, prBarn, rettet }` | **Uændret** i fase 1-3. «I dag»-kortet læser `dage[idag]`; «Fyld ugen» skriver gennem `gemUge` | Ingen |
| `kog-familie-v1` | `{ v:1, voksne, boern, barnAndel, udvalg:{ids,rettet}|null, favoritter[], lavet{}, mereGroent }` | **v2:** `udvalg` fjernes; `favoritter` er «Vores retter»; nyt `nyePrUge` (heltal 0-4, standard 2); nyt `harVi` (liste af vare-id'er fra `VARER`, højst 50, til fase 3); `mereGroent` bliver et rigtigt felt i v2 | `MIGRER_FAMILIE[1] = (j) => ({ ...j, v: 2, favoritter: unik([...(j.favoritter||[]), ...(j.udvalg?.ids||[])]), nyePrUge: 2, harVi: [], udvalg: undefined })` — `rensFamilie` klipper til grænserne bagefter. Et udvalg på 8 bliver til 8 hjerter, så børnene ser det samme som før, plus 2 nye |
| `kog-liste-v1` | `{ v:1, kode, uge, varer[], koebt[], harVi[], hentet }` | **v2 (fase 3):** nyt `fra: 'plan'|'link'` og `butik: 'rema'|'netto'|'lidl'|'365'|null` (afdelingsrækkefølge). På samme enhed laves listen af planen, når `kode` ≠ planens kode, og `koebt` er tom; er noget krydset af, spørges som i dag | `MIGRER_LISTE[1] = (j) => ({ ...j, v: 2, fra: 'link', butik: null })` |

Kendte følger: (1) i vinduet, hvor service workeren endnu ikke har hentet den nye kode, ser den gamle kode v2 som «nyere udgave» og viser låseskærmene — det er by design og allerede håndteret [kode: js/voksen-del.js:469-477]. (2) Link-formatet `v1` i `plankode.js` røres ikke (foraeldredel.md §6 anbefaler det samme). (3) `test-familie.js`, `test-udvalg.js` og e2e-delen `voksen` (v3-migrering én gang) skal udvides med v1→v2.

## C. Fjernes, flyttes, bevares

| Element | I dag | Forslag |
|---|---|---|
| Voksenmenu (hub) | 7 felter | Fanelinje Uge · Indkøb · Retter · Mere |
| Ugens udvalg | egen side, «Med», «Fyld op», «Alle retter: hold» | Væk. «Vores retter» (♥) + «2 nye pr. uge» i Mere |
| Favoritter | egen side | Væk (er «Retter» med filter ♥) |
| Katalog | 3 knapper pr. række | «Retter»: ♥ + Åbn |
| Vælg ret til dag | alle 83, 5 chips | Samme skærm, men «Vores» først og chips genbrugt fra Retter |
| Portioner til nye retter, Retter pr. barn | øverst på ugeplanen | Mere; husstanden vises som chip i Uge-hovedet |
| Husstand | egen side | Mere |
| Mere grønt | kontakt i menuen | Mere |
| Indkøbsliste / Send / Del / Print | 4 knapper + menupunkt | Fanen Indkøb med «Del ▾» |
| Ny uge: hold | nederst på ugeplanen | Bliver (den tømmer data) |
| Print: hold på retten | bliver | Bliver |
| Ugeplan: hold på børnenes valg | bliver | Bliver (vejen tilbage fra børnene) |
| Lås | kun `#/voksen…` | Hele voksendelen (`#/voksen…` og `#/uge…`), ikke `#/indkoeb` på telefonen |
| Forsidens favoritknap | kun når der er favoritter | Væk — «I dag»-kortet tager pladsen |

## D. Udseende — principper til DESIGN

- **Forældre:** rolig flade (lys: hvid/creme-grå, mørk: grafit), én accentfarve (appens sennep) kun på den primære knap, tynde 1-2 px streger i stedet for 3 px + løft, 17 px brødtekst, 48 px knapper, en fast fanelinje i bunden på telefonen og til venstre på iPad på langs. Mørkt tema efter `prefers-color-scheme` kun i `familie.css` (app.css røres ikke, som i dag).
- **Børn:** uændret sprog: dugen, dyrene, 3 px kakao-streg, 64 px (88 px liggende telefon), én sætning pr. skærm, oplæsning. Nyt: «I dag»-kortet øverst på forsiden med billede og navn, så barnet selv kan starte.
- **Fælles:** samme runde skrift, samme ikoner, så de to dele tydeligt er én app.
- Reglerne er fulgt i mockuppen: dansk, store knapper, få valg pr. skærm (4 kort, 3 dyr, 7 dage), intet, der kræver læsning for børnene.

## E. Backend eller synk? (pris og ulempe)

Et delt lager (fx Supabase/Firebase gratisplan ≈ 0 kr/md, eller en lille VPS ≈ 40-60 kr/md) ville give telefon ↔ iPad uden links. Ulemper: en nøgle i den offentlige frontend (kun med regler på serveren), login for de voksne, GDPR (privatlivspolitik, databehandleraftale), drift og en ny fejlkilde uden net. Mit råd: ingen backend. Kode-linket (fase 4) løser 90 % for en familie med én iPad og én telefon [vurdering].

## F. Det jeg ikke nåede, og usikkerheder

- Zeinstra 2010 og Domínguez 2013 er læst som resuméer (PubMed og fuldtekst afviste hentning). Tallene stammer fra søgeresuméer.
- Jeg har ikke set indkøbslisten med varer i Playwright (kræver en plan på enheden); beskrivelsen bygger på koden og `docs/ugeplan-plan.md`.
- Mockuppen er set i Playwright **Chromium** på 390×844, 844×390 og 1180×820 i lys og mørk (`skaerm/m01…m14`). Den er **ikke afprøvet i WebKit/Safari** eller på en rigtig iPad.
- Om Jimmy planlægger på iPhonen eller iPad'en, afgør, om fase 4 er nødvendig. Det bør afklares før fase 3.
- Udvalgets loft (24) og hjerternes (200) er forskellige: i v2 bliver børnenes kort højst 12, uanset antal hjerter (rotation efter `lavet.sidst`). Grænsen er mit valg.

## G. Kilder

- Mealime, Getting Started Guide: https://support.mealime.com/article/151-getting-started-guide
- Paprika Recipe Manager: https://paprikaapp.com/
- AnyList, Weekly shopping: https://help.anylist.com/articles/weekly-shopping/
- Plan to Eat, shopping list from planner (2013): http://www.plantoeat.com/blog/2013/06/automatically-generate-your-shopping-list-from-your-meal-planner/ og FAQ https://learn.plantoeat.com/help/even-more-plan-to-eat-faqs
- Samsung Food (App Store): https://apps.apple.com/us/app/id1133637674
- Danske apps (App Store/udviklerside): Maddie https://apps.apple.com/dk/app/maddie-din-opskriftssamling/id6444921176 · Madopskrifter.nu Madplanen https://mwm.ai/apps/madopskrifter-nu-madplanen/767644564 · Nem Madplan https://apps.apple.com/dk/app/nem-madplan/id1549204670 · Madplan.ai (Trustpilot) https://ca.trustpilot.com/review/madplan.ai
- Ellyn Satter Institute, Division of Responsibility: https://www.ellynsatterinstitute.org/how-to-feed/the-division-of-responsibility-in-feeding/
- van der Horst, Ferrage & Rytz (2014), Appetite 79:18-24, DOI 10.1016/j.appet.2014.03.030; relateret: https://pmc.ncbi.nlm.nih.gov/articles/PMC6768385
- Zeinstra m.fl. (2010), resumé: https://www.aprifel.com/fr/resume-scientifique/offering-choice-and-its-effect-on-dutch-children-s-liking-and/
- Domínguez m.fl. (2013), «Providing choice increases children's vegetable intake»: https://digibug.ugr.es/handle/10481/87131
- Iyengar & Lepper (2000) og kritikken: https://www.psychologytoday.com/us/blog/pop-psych/201602/is-choice-overload-real-thing
- Sherwin & Nielsen, NN/g (2019), Children's UX: https://www.nngroup.com/articles/childrens-websites-usability-issues/
- Fødevarestyrelsen (2022), Madaktiviteter med børn: https://foedevarestyrelsen.dk/Media/639174703281403238/Madaktiviteter_med_boern__red_august2022__webtil2.pdf
- Projektets egne: `docs/foraeldredel.md`, `docs/ugeplan-plan.md`, `docs/gennemgang.md`, `CLAUDE.md` (regel 5 og 9).
