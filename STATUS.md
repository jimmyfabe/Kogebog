# STATUS – Tumbi Køkken

## 01-11-2026 kl. 12:47: v3 · 01-11-2026 med forældredelen, Saga har truffet valgene (Saga)

Jimmy 01-11 (talebesked): «tage de bedste beslutninger på alt det, vi har … lavet. Og så lave det færdigt». Om favoritten: «Det skal være et hjerte, helt klart».
- **Valgene** (Saga på Jimmys vegne, kan laves om):

  | Spørgsmål | Valg | Commit |
  |---|---|---|
  | Ny nøgle `kog-familie-v1` (gemmer kun ANTAL børn) | Ja | — |
  | Standardvalgene (`docs/foraeldredel.md` afsnit 9) | Beholdt | — |
  | Favorit | ❤️ | 381444d |
  | «Ingen kniv» | A: intet trin med voksen-kniv, heller ikke dåseåbneren (14 af 82 ugeplan-retter) | 9bd33cf |
  | Knivloftet for ugeplanens retter | Dåseåbneren tæller ikke med i loftet (højst 2 trin med skære/rive), men appen viser den som et knivtrin | 03046fd |
  | Navneord | Bøjes nu («1 gulerod», «3 store løg») | d5bf015 |
  | Aftensretterne i `opskrifter/index.json` | README-rækkefølgen beholdes | — |
  | De 7 kortede navne, ⚡ og minuttal, dubletterne | Beholdt | — |
  | De 3 forældreløse mp3 | Slettes ved næste Røst-kørsel (`indsaet-lyd.js --ryd`) | — |
  | Udtalen af Halloween | Beholdt | — |
  | ui-reviewets punkter: emoji-hjerte, kontrast, gul markering, «1,5 løg», 🔪-chip, «1 stort» regnes nu om | Accepteret | — |
  | Lange ord uden bindestreg | Testes på en rigtig iPhone. Ingen kode nu | — |

- **Rettet efter code-review 01-11.** Hver rettelse har en test, der fejler mod den gamle kode:
  - tal i navnet for hele linjen regnes om, fx «(ca. 1 kg)» og «(4 stk.)» (31a0054);
  - en tom mængde tælles ikke som «kunne ikke regnes om» (3bba004);
  - stemmen finder kønnet efter et tillægsord og efter enheder i flertal (c5cfc02);
  - «Mindst kniv først» er en ren funktion med test (e2a8456);
  - reglen om ental ved 1,5 står ét sted (e060181).
  
  En anden code-reviewer fandt ingen fejl i logikken. Dens 3 værn er lagt ind (d695321): en mængde pr. stk. («à ca. 150 g», «pr. stk.», «hver») regnes ikke om, og en linje med tal, men tom «maengde», fanges af `test-opskrifter`.
- **Version** v3 · 01-11-2026 (1e87f2a). Fingeraftrykket er sat igen.
- **Test:** node 13 af 14 grønne (`test-lyd` er rød, fordi Røst-lyden mangler). Hele e2e i WebKit på 1e87f2a: 71.741 tjek. I den fulde kørsel fejlede skærmformer (134) og berøring (1) forbigående. Det er ikke koden: samme dele var grønne ved omkørsel på både 40c1052 og 1e87f2a (4.074 + 33 tjek, 0 fejl). Resten gav 0 fejl.
- **Ikke rettet** (står i backlog):
  - «3½ dl» × 3 vises som «1,05 l»: `rumfang` i `js/skaler.js` runder liter til 2 decimaler.
  - `'plade'` mangler i `KOEN`. Testen fanger det, hvis en ugeplan-ret får en plade.

**Afventer Jimmy:**
- (01-11) Test på iPad og iPhone: testlisten i Sagas lydbesked 01-11. Tjek også lange ord på en iPhone på langs.
- ~~(01-11) To usporede mapper i `opskrifter/`~~ **Lukket 01-11 kl. 16:19:** slettet efter Jimmys «ja slet dem begge» sammen med de fire midlertidige kopier `val-A/B/C/alle` (alle deres filer findes i `main`). `test-sw` er grøn i `D:\Claude\Kogebog` (13/0).
- **Udgivet:** flettet i `main` og pushet 01-11 kl. 14:07 (e2b140f) efter Jimmys «du må altså gerne push selv». Den live `js/version.js` viste «v3 · 01-11-2026» kl. 14:07 (læst med curl).
- **Lukket:** de 7 punkter fra kl. 03:11 og README-spørgsmålet fra kl. 02:40 (se tabellen). Røst-lyden laver Saga (se kl. 02:40).

## 01-11-2026 kl. 03:11: forældredelen er bygget og reviewet, ikke flettet (Saga)

Jimmy 31-10 (talebesked): «så kan vi jo lige så godt få bygget det med det samme». Ønskerne var ugens udvalg til børnene, grupper («meget sunde»), voksne og børn, der skalerer mængderne, favoritter, «prøv nye», et voksen-«login» og indkøb på forældrenes telefon.
- **Grenen:** `claude/foraeldredel-31-10` (worktree `D:\Claude\.claude\worktrees\kogebog-foraeldre-3110`). Den indeholder runde 3 (og dermed runde 1 og 2), så **den kan flettes alene**. Designet står i `docs/foraeldredel.md`. Version stadig v3 · 31-10-2026.
- **Det kan den:**
  - «Voksne: hold» (2 s) på forsiden åbner voksendelen (`#/voksen`). Den lukker, når man går ud, efter 10 min uden tryk og med «Luk».
  - Husstand: voksne og børn giver portioner (et barn = 0,7 voksen, højst 12 portioner, og den siger det, når loftet skærer ned).
  - Ugens udvalg: 8 retter, højst 24, og «Fyld op med nye» tilføjer 4.
  - Favoritter (⭐).
  - Børnenes valg i ugeplanen viser kun udvalget, med ✨ (ny for os, først når familien har lavet en ret) og ⭐. Nye filtre: Vegetar og Masser af grønt.
  - Opskriftsskærmen og printet regnes om til dagens antal fra ugeplanen (ellers husstandens), med gul markering. Voksen-linjer om fade, mængder, der ikke kunne regnes om, og dej, der er rundet op.
  - Hjerte på færdig-skærmen og en tæller for «lavet».
- **Data:** ny nøgle `kog-familie-v1`. Den gemmer kun ANTAL børn. De gamle nøgler er uændrede, og uden den nye nøgle opfører appen sig som før.
- **Bygget** af 6 agenter (5279704..dc5f084), og runde 3 er flettet ind (f03066a, c681d77).
- **Review:** code-reviewer, security-auditor og ui-reviewer i WebKit, derefter Fable som dommer. 24 fund og 6 kendte punkter; 18 holdt. 15 er rettet med test og commit (632f57a..5dbcb60), og CLAUDE.md er opdateret (40c1052).
- **Test (Saga 01-11):** node-tests 13 af 14 grønne (`test-lyd` er rød som på runde 3). Hele e2e i WebKit på 40c1052: 71.737 tjek, 0 fejl (3.075 s), heraf `voksen` 438 og `ugeplan` 688. De nye tests fejler mod den gamle kode (28 fejl), undtagen e2e for husstandens loft og holdet, som aldrig nåede at køre mod den gamle kode.
- **Ikke rettet:**
  - Navneord bøjes ikke, fx «2 grøntsagsbouillonterning» og «1 gulerødder». Det kræver nye felter på ca. 58 linjer.
  - «Ingen kniv»: 16 af de 30 retter har et dåsetrin med voksen-kniv (Jimmys valg).
  - Afvist af dommeren: voksendelens lås dækker ikke ugeplanens oversigt (den har aldrig været låst).
- **Usikkert:**
  - Husstandens knapper ved 0 og 8 og de låste knapper på oversigten kan ikke få fokus. VoiceOver læser dem som nedtonede.
  - Gemte data med 0 voksne og ingen børn sat læses som «ikke sat».
  - De rettede skærme (hjertet i topbaren, voksen-linjerne) er kun set af e2e, ikke af ui-revieweren igen.

**Afventer Jimmy:**
- (01-11) Ja eller nej til den nye nøgle `kog-familie-v1`, før grenen flettes i `main` (ændring i datastrukturen).
- (01-11) Standardvalgene (`docs/foraeldredel.md` afsnit 9):
  - et barn = 0,7 voksen, holdeknappen 2 s, udvalget 8 af højst 24, «Fyld op» +4;
  - grønt 250 g og billig 12 kr pr. portion, intet filter på forsiden;
  - ✨ først, når familien har lavet en ret.
- (01-11) ⭐ eller ❤️ til favorit?
- (01-11) «Ingen kniv»: A = kun retter helt uden kniv, også hos den voksne (14 retter, anbefalet), eller B = behold reglen og omdøb til «Ingen skæring»?
- (01-11) Skal navneordene bøjes nu eller senere?
- (01-11) Test på iPad og iPhone (testlisten i Sagas lydbesked 01-11).
- (01-11) Flet og push: forældredelen (indeholder runde 3), eller kun runde 3 først.

## 01-11-2026 kl. 02:40: runde 3 — 14 nye retter i bogen (101 i alt), ikke flettet (Saga)

Jimmy 31-10: «kører du bare hele lortet helt færdigt til i morgen» (kødkål, jægergryde og Jamie-retterne).
- **Grenen:** `claude/nye-opskrifter-r3-31-10` oven på runde 2 (worktree `D:\Claude\.claude\worktrees\kogebog-r3-3110`). **Runde 3 erstatter runde 2 som den gren, der skal flettes** (den indeholder runde 1 og 2). Forældredelen (`claude/foraeldredel-31-10`) indeholder igen runde 3. Version stadig v3 · 31-10-2026.
- **Nye retter:** kødkål med makaroni, jægergryde med pasta, cremet fiskesuppe med majs, cremet ostris med ærter, fisketacos med majs, foldet fladbrød med ost, gul ris med laks, ærter og æg, koteletter med æble, kylling med bønner og spinat, kyllingetærte med butterdej, laks med sprød rasp, smash-burgere med ost, sprød kylling i rasp (aftensmad, sidst i README-rækkefølge, med i ugeplanen) og frossen yoghurt med bær (søde sager). Egne mængder; ingen er lavet i et rigtigt køkken.
- **Commits:** a8bb492 (de 14 skrevet), 2abced8 (rettelser efter review af retterne, 18 filer), 01ffdeb (flyttet ind med Codex-billeder, tjekket på et kontaktark). «Fuldkornstortillas» har fået en blød bindestreg (e2e fandt den på smal skærm).
- **Test:** node-tests 8 af 9 grønne (`test-lyd` rød: 1.504 af 2.927 replikker mangler Røst-lyd, før 1.043 af 2.466, plus de 3 forældreløse mp3). e2e i WebKit: `hele`, `former`, `lyn` og `ugeplan` grønne.
- **4 billeder tegnet om** af Codex 01-11 kl. 05:20-05:23, fordi de første var tegnet efter beskrivelserne før reviewet: laks (mos med ærter, ikke broccoli), frossen yoghurt (kun blåbær), fisketacos (2, ikke 3) og smash-burgere (fuldkornsboller). Tjekket på et kontaktark af Saga.

**Afventer Jimmy:**
- (01-11) Smag på listen over de 14 retter. Skal de 13 aftensretter stå i README-rækkefølge eller alfabetisk i `opskrifter/index.json`?
- (01-11) Røst-lyd til de ca. 461 nye replikker (trin 1-5 under «Stemmen» i `CLAUDE.md`).
- Punkterne fra 31-10 nedenfor gælder stadig, men «flet runde 2» er nu «flet runde 3 (eller forældredelen, som indeholder den)».

## 31-10-2026 kl. 19:53: 36 nye hverdagsretter i bogen (87 i alt), ⚡ og minuttal på forsiden, ikke flettet (Saga)

Jimmy 31-10: flere hverdagsretter i stil med Jamie Olivers 5 ingredienser og 20 minutter, «Ja du giver den bare gas», og (talebesked) et lille minuttal nede i hjørnet af forsidens kort, så forældrene kan se tiden.
- **Grenene:** runde 1 `claude/nye-opskrifter-31-10` (HEAD e64a11c, worktree `D:\Claude\.claude\worktrees\kogebog-nye-3110`). Runde 2 `claude/nye-opskrifter-r2-31-10` oven på runde 1 (worktree `D:\Claude\.claude\worktrees\kogebog-r2-3110`). **Runde 2 er den, der skal flettes.** Den indeholder runde 1. Version v3 · 31-10-2026 (ikke udgivet, derfor ikke hævet).
- **I bogen nu:** 87 retter (før 51), og ingen venter på billede. Runde 1 gav 10 med Codex-billeder. Runde 2 flyttede 7 ind (0e30e83) og derefter de sidste 19 (2daa7f3, Codex-billeder fra 19:08-19:20, tjekket på et kontaktark). De 24 aftensretter fra runde 2 står sidst i `aftensmad` og er med i ugeplanen.
- **7 navne er kortet ned af agenterne**, fordi de fyldte 4 linjer på iPhone på langs (667×375), og e2e fejlede: «Bakkeret med kartofler og kylling», «Japansk kålpandekage med skinke», «Kinesiske grøntsagsomeletter» (før «… med ris»), «Gnocchi med tomat, spinat og mozzarella» (før «Gnocchi på panden med …»), «Grøn pestopasta med broccoli» (før «… og ærter»), «Kartoffel-gulerods-rösti med skyrdip» (før «… agurke-skyrdip») og «Koreansk risskål med kød og spejlæg» (før «… kød, spinat og spejlæg»). To fik i stedet en blød bindestreg: «Mild kartoffelkarry …» og «Grøn porre-kartoffelsuppe …». Id'erne er de samme.
- **Minuttal** (6643868): en creme-pille nederst til venstre på forsidens kort, fx «35 min» eller «1 t 45 min». Skærmlæseren siger fx «Tynde pandekager. 35 minutter.». Ikke i børnenes valg, dagens valg eller printet. Tiden er opskriftens samlede tid, så hævning og køl tæller med (frikadeller og gulerodsboller viser «2 t»).
- **⚡** (dce4ea9, a65829f): retter på højst 20 min får et lyn nederst til højre. Saga slog det til, fordi Jimmy ikke svarede. Det er let at fjerne (`LYN_MIN` i `js/model.js`). Forslaget lovede 7 nye, og de ærlige tider giver 3 (gnocchi, gyoza og stegte ris). Med wok-med-nudler har 4 retter ⚡ nu.
- **Review:** kost og sikkerhed 1 HØJ, 17 MELLEM, 18 LAV, rettet i 17 commits. Code review af koden og af minuttallet: 0 blokerende.
- **Test:** node-tests 8 af 9 grønne (`test-lyd` er rød: Røst-lyd mangler til 523 af 1.946 replikker, og der er 3 forældreløse mp3). e2e i WebKit på 0e30e83: 42.169 tjek, 0 fejl (agentens kørsel). ui-reviewer i WebKit på 0e30e83 (6 formater fra 360 px til desktop): 0 blokerende. Minuttallet kan læses (13-15 px), skæres aldrig af og rører aldrig ⚡ (tættest 10 px på 667×375). Fundet «Tæl gyozaerne ud» viste et målebæger og er rettet (d26fd9b, verbet `pynte`). Efter de 19 (2daa7f3): node-tests grønne (Saga kørte dem selv), e2e `former,hele,lyn,ugeplan` 53.384 tjek med 13 fejl (navnene ovenfor), derefter `former,lyn,ugeplan` 4.594 tjek, 0 fejl (agentens kørsler). De 19 nye kort er ikke set af ui-revieweren, kun af e2e og kontaktarket.
- **Ikke rettet (lav, Jimmys valg):** `svgEl` går uden om `attr()`. `UDEN_OM`-regexen kan omgås. e2e-tjekket af ⚡-titlen springes stille over, hvis ingen ret har blød bindestreg og timer. UGEPLAN-testens titel er forældet. Gyozabilledet har rødligt støv, der kan ligne chili. Dubletter: okonomiyaki og kålpandekager, bakkeret og bradepandekylling, og tortilla, egg foo young og rösti. Soja-honning går igen i 6 retter. Fra ui-reviewet: de 5 nye aftensretter står bagerst i børnenes valg (side 12 og 13 af 13, 11 tryk på pilen; rækkefølgen kommer fra `opskrifter/index.json`). «fiske-» står alene på en linje i fiskefrikadellernes navn på 360 px (4 linjer), og «Japansk» står alene på iPad og desktop. En lang pille («1 t 45 min») dækker 17 % af billedet på 667×375.
- **Mangler:** Røst-lyd til 1.043 replikker (`test-lyd` viser dem). Ingen af retterne er lavet i et rigtigt køkken.
- **Jamie Oliver-research** (Jimmys talebesked 31-10): rapport på Drev `Claude/Kogebog/Jamie-Oliver-research-31-10.md` med 12 forslag til nye retter. De skrives først efter Jimmys «ja».
- **Kødkål og jægergryde** (Jimmys talebesked 31-10 om aftenen: «billigt, simpelt, nemt»). Navnet «kødkål» findes ikke på nettet. Det nærmeste er «karrykål» (mariasilje.dk: hakket oksekød, hvidkål, gulerod, løg og karry, ca. 30 min, uden pasta og tomat). Pasta og tomat er Jimmys erindring. Klassisk jægergryde (madensverden.dk) er svinekød i tern med bacon, champignon, paprika, fløde, ribsgelé og cocktailpølser. Den simrer ca. 1 time og spises med ris eller mos. Ingen fundne opskrifter bruger hakket kød. Forslag med egne mængder, ikke afprøvet i et køkken: (1) **Kødkål med makaroni**, én gryde, ca. 30 min: 400 g hakket oksekød, 1 løg, ca. 600 g hvidkål i strimler, 2 gulerødder, 2 tsk mild karry, 1 dåse hakkede tomater, 5 dl vand med bouillon og 200 g makaroni, der koger med de sidste 12-15 min. (2) **Jægergryde med hakket kød**, ca. 30 min: 400 g hakket svinekød, 100 g bacon, 250 g champignon, 1 løg, 1 spsk sød paprika, 1 spsk tomatpuré, 2 dl madlavningsfløde, 2 dl vand med bouillon og 1 tsk ribsgelé, med pasta eller ris. Cocktailpølser kan komme i til børnene. Ingen af dem har ⚡ (over 20 min). Jægergryden ligner «Cremet kødsovs» lidt. De skrives sammen med Jamie-retterne efter Jimmys «ja».

**Afventer Jimmy** (ført op fra 29-10):
- (31-10) Kig på retterne og de 7 nedkortede navne. Skal ⚡ og minuttallet blive? Skal en af dubletterne skiftes ud?
- (31-10) Ja eller nej til de 12 Jamie-retter (rapporten på Drev) og til kødkål og jægergryde (punktet ovenfor).
- (31-10) Flet og push runde 2-grenen, når billederne og testene er færdige. Grenene er ikke flettet ind i `main`.
- (31-10) Røst-lyd til de nye replikker: trin 1-5 under «Stemmen» i `CLAUDE.md` (trin 2 køres igen og igen i Git Bash, ca. 20 replikker på 7 minutter).
- (29-10) Lyt til de 9 lydfiler i 29-10-afsnittet.
- (23-10) Ja til at slette de 3 forældreløse mp3 (`--ryd`). Indtil da er `test-lyd` rød.
- (27-10) Udtalen af «Halloween»: behold, «Hælovin» eller «Hæloviin».
- (23-10) Halloween-tegningerne.

## 30-10-2026 kl. 23:05: v2 er live (Saga)

- Jimmy pushede `main` 29-10 kl. 17:20 (7de8cdf; `origin/main` = lokal `main`). Live `js/version.js` viser `v2 · 28-10-2026` (læst med curl 30-10). Push-punktet nedenfor er dermed lukket.

**Afventer Jimmy:** ført op til 31-10.

## 29-10-2026 kl. 06:11: bogen gjort færdig, v2 · 28-10-2026 (gren `claude/faerdig-28-10`, spolet frem i lokal `main` til 4b7dcfe, ikke pushet)

Jimmy 28-10: «byg videre, så vi bliver færdige» og ja til push.
1. **Bygget** (frontend-dev, 962b4e1..3b04b45): «Fjern» ved «Byt ret» på telefonen · intet hop, når «Vælg ✓» dukker op · tallerkenerne 3 + 3 · Bo kan kun tage de dage, de andre børn ikke mangler (så Pip altid får en tur) · V8: fast bund med «Indkøbsliste» og «Send til telefon» på iPad på højkant og desktop · sidste side centreret, «uge 45» kun én gang, «Tumbi Køkken» på én linje, dyrene skjules under 380 px · «Grøntsags-/blanding» med blød bindestreg. Ikke rettet: ny grafik til naan, grøntsagsblanding og karry.
2. **Code review:** 0 kritiske og 4 fund, alle rettet (364c523, f02040c, 5f9e212, 229ad7b). `main` er flettet ind i grenen (a2ceccf), så udgivelsen bliver en fast-forward.
3. **Timer-blokken på 360×780 er sandsynligvis ikke en fejl** (Chromium, 28-10): i et skjult browserpanel kører `scrollIntoView` med `smooth` slet ikke. e2e tjekker det nu i WebKit med rigtige tryk (`w360` i `TIMER_PAA`, a9166f3).
4. **Røst-stemmen (83845e0):** 61 lydfiler er valgt efter ASR, og Bo har fået sin replik («Bo har valgt. Nu er det en andens tur.», seed 44). Af de 54 fra ASR-listen 27-10 er 46 nu uden ASR-fejl (før 6), og alle 36 filer, der var ældre i `lyd/` end i `D:/Stemmer`, er uden fejl (før 32). **Valget sker i de færdige mp3, ikke i wav:** ASR'en hører samme lyd forskelligt i wav og mp3 (korrelation 0,99+). ASR-reglen (`asr_maal.py`) er ureviewet.
5. **Validatoren** kender Bos replik (8973a22). Node-tests: 8 af 9 grønne, og `test-lyd` er kun rød på de 3 forældreløse mp3.
6. **Fuld e2e i WebKit på acfa7ee:** 36.580 tjek på 1.524 s og 5 fejl, alle i tjek fra 28-10, der aldrig havde kørt i WebKit. Rettet én ad gangen:
   - «Grøntsagsbouillon» og «Madlavningsfløde» brød midt i ordet på 360 px: bløde bindestreger (59d0256).
   - «Tumbi Køkken» stod på to linjer på 744×1133 (der manglede 0,3 px): `nowrap` fra 701 til 900 px, målt på én linje og inden for skærmen (7cd7240).
   - Fokus over ugeplanens faste bund (3 skærme): tjekket brugte `focus()` fra et script, som ikke ruller i WebKit. Med en rigtig Tab står knappen over bunden; modprøve uden margen er rød (0724a73).
   - Bagefter: delene `ugeplan` og `former` (med forsidens top) 4.026 tjek grønne på 274 s. De øvrige dele var grønne i den fulde kørsel, og rettelserne rører dem ikke.
7. **Code review 29-10:** 0 kritiske og 8 advarsler. Repoet: et tjek af den tomme oversigts margen (rødt med app.css fra før 5f9e212) og målinger, der er sprunget over, vises altid (0724a73, 4fb5258). `D:/Stemmer` (uden for repoet): fund 1 står i CLAUDE.md (854a1b6), og 2, 4, 5 og 6 er rettet i scriptene og prøvet uden at ændre filer. Fund 3 (`valgt` passer ikke til appens fil i `kvalitet.json`) er latent: `behold-app.py` stopper nu, hvis teksten er ændret.
8. **ui-reviewer 29-10 i WebKit** (iPad begge veje, 390×844, 360×780, 1280×800 og printene på skærm; appen har intet mørkt tema): 0 ødelagt, og rettelserne fra 28-10 og 29-10 holder. Rettet: skærmlæseren sagde den bløde bindestreg i varernes knapnavne og i «Købt: …» (ugeplan.js; e2e-tjekket af knapnavnene er rødt mod den gamle kode med alle 3 varer på begge telefoner, annonceringerne er kun læst i koden). e2e ventede ikke på billederne i «ipad uden net: retter» (rød i én af to kørsler, og billedet stod på skærmbilledet lige efter): den venter nu som de andre steder. Delen `ugeplan` bagefter: 666 tjek grønne på 126 s. Ikke rettet: pilen «Flere retter» står 15 px under den faste bund på 360×780 (kan rulles frem, og den smalle telefon er ikke målet) · «Behold den gamle liste» brydes på 360 (et hårdt mellemrum ville bryde e2e-søgningen på teksten) · «·» sidst på linjen i rettens metalinje · søndag alene på sidste linje i «Hvilken dag?». Ikke set: printene på rigtigt A4-papir og rigtige fingertryk på en iPad.
- **Kører `efterbehandl_kogebog.py --mp3` igen,** laver den alle mp3 om, og ASR-valget går tabt. Trinnet, der lægger det tilbage, står nu i CLAUDE.md under «Stemmen». `asr_maal.py` bruger kopier af `ranger.py` og ordkontrollen i `asr-28-10/` (før en anden sessions kladdemappe i Temp), og `behold-app.py` rører ikke de 3 filer, der er valgt i mp3, og tjekker alt før den første kopi (code review 29-10).
- 28-10 kl. 11-19:29 stod alt stille på RAM (under 4 GB fri): en forældreløs `find /` fra Git Bash holdt kernens paged pool, og Claude startede ved en fejl en til (backticks i en bash-streng i dobbelte anførselstegn). Jimmy stoppede begge.
- Worktree: `C:/Users/Jimmy/AppData/Local/Temp/claude/D--Claude-Kogebog/aadbdf69-100c-469b-9996-f2e3bdd09dcd/scratchpad/wt`. Stopper sessionen, så fortsæt derfra (`git -C D:/Claude/Kogebog worktree list`).

**Mangler:** kun push. Lokal `main` = 4b7dcfe (126 commits foran `origin/main` = 956b33b, som er live). Node-tests i `main`: 8 af 9 grønne (`test-lyd` kun rød på de 3 forældreløse).

**Afventer Jimmy** (lukket: V8 og Pips tur er bygget, de 3 skæve fra ui-reviewet er rettet):
- (29-10) **Push v2** (går live på GitHub Pages med det samme; Claude pushede ikke, fordi push til Pages-grenen kræver dit ja hver gang). I **PowerShell**: `cd D:\Claude\Kogebog; git push origin main`. Se bagefter versionen «v2 · 28-10-2026» på https://jimmyfabe.github.io/Kogebog/ (en iPad kan skulle åbne appen to gange).
- (29-10) **Lyt til disse 9** (`D:\Claude\Kogebog\`, ASR hører stadig noget forkert; de andre 79 af de 88 lød rigtigt for ASR'en):
  - «Stop den først» høres ikke til sidst: `lyd\chorizo-pasta\timer-optaget-10.mp3`, `lyd\havregrynskugler\timer-optaget-10.mp3`, `lyd\kyllingekarry\timer-optaget-10.mp3`, `lyd\oejeboller\timer-optaget-10.mp3`, `lyd\one-pot-tomatpasta\timer-optaget-10.mp3`.
  - «den» mangler: `lyd\bradepande-fajitas\timer-optaget-10.mp3`, `lyd\pizzasnegle\timer-optaget-9.mp3`.
  - «tolv» hørt som «o»: `lyd\tomatsuppe-med-boenner\timer-optaget-12.mp3`.
  - For lang til «Rør osten i.»: `lyd\one-pot-makaroni\7.mp3`.
- (23-10) Ja til at slette de 3 forældreløse mp3 (`bolognese-one-pot/timer-optaget-5`, `cremet-koedsovs/timer-optaget-5`, `koedsovs/timer-optaget-4`): `node vaerktoej/indsaet-lyd.js D:/Stemmer/kogebog-500m --ryd`. Indtil da er `test-lyd` rød.
- (27-10) Udtalen af «Halloween» efter lytning: behold, «Hælovin» eller «Hæloviin» (`G:\Mit drev\Claude\Kogebog\lyt-27-10-halloween\`).
- (23-10) Halloween-tegningerne.

## 27-10-2026 kl. 03:59: e2e grøn, ASR-lytteliste, ui-review efter fletningen og «Hælovin»-prøver (Saga; gren `claude/ugeplan-22-10`, ikke flettet, ikke pushet, ingen kode ændret)

- **Fuld e2e i WebKit på 4ecad7f:** 36.462 tjek grønne på 1.256 s (03:09–03:30, gennem låsen med en ydre vagthund; ingen hæng).
- **ASR af de 191 mistænkelige** (roest-wav2vec2-315m uden sprogmodel; tal skrevet ud, mellemrum tæller ikke): lyttelisten er `D:/Stemmer/kogebog-500m/lyt-foerst-asr-27-10.txt`. De 191 replikker er 163 forskellige lydfiler, fordi ens tekster deler fil. Lyt i denne rækkefølge:
  1. Hale med tale: `lyd\chorizo-pasta\13.mp3` (hørt «… over pe»).
  2. 29 af de 116 `timer-optaget`, hvor «først» ikke høres til sidst (fx «stop en»). De andre 87 ender rigtigt.
  3. Resten efter cer: ingen over 0,40, 20 over 0,25. «Hæld … si» høres næsten altid som «hel … ti» — sandsynligvis ASR'ens svaghed, ikke stemmens.
  - Scriptet (`scratchpad/asr-191/ranger.py`) er ikke reviewet. Listen er en rækkefølge at lytte i, ikke en dom, og en stille hale kan ASR ikke høre.
- **ui-reviewer efter fletningen** (browserpanelet = Chromium, ikke WebKit; 1180×820, 820×1180, 390, 360, 1440): 0 ødelagt, 3 skæve og 9 detaljer. Intet er rettet:
  1. `#/uge` på 390/360: «Fjern» brydes alene ned på sin egen linje i hver dagsrække (`app.css:685`, `722-729`).
  2. Børnenes ret- og dagvalg på iPad (begge veje): indholdet hopper ca. 10 px op, når «Vælg ✓» dukker op (`app.css:740`).
  3. «Hvem skal vælge?»: 6 tallerkener står som 5 + 1 (`app.css:756`, `760`).
  - Detaljer: retvalgets sidste side med 3 kort er venstrestillet · Erstat-skærmen siger «uge 45» to gange · «Grøntsagsblan/ding» på 360 · genbrugte indkøbsikoner (naan = rugbrød, grøntsagsblanding = ærter, karry = oregano) · «Der kører allerede en timer …» skjult bag bundbjælken på 360×780 · «Tumbi / Køkken» på to linjer på 820×1180 · dyrene i toppen kun 22 px på 360. V8 er uændret.
- **«Hælovin»-prøver** (Røst 500m, seed 42–44, ikke efterbehandlet, så de er svagere end appens lyd): `G:\Mit drev\Claude\Kogebog\lyt-27-10-halloween\` (6 mp3). ASR hører appens «Halloween» som «halvuvin», «Hælovin» som «hellovin»/«hellogwin» og «Hæloviin» som «hellovi in».

**Afventer Jimmy** (nye 27-10, de gamle står i afsnittet nedenfor):
- (27-10) Ja til at rette de 3 skæve fra ui-reviewet på grenen (én rettelse pr. commit med en test, der fejler før; version v2)?
- (27-10) Pips tur: når Bo har valgt 6 retter, er der kun én dag tilbage, og Pip får ingen tur (`js/ugeplan.js:830-834`, kun læst i koden). Skal hvert dyr have et loft?
- (27-10) Vælg udtalen af «Halloween» efter lytning: behold, «Hælovin» eller «Hæloviin».
- (24-10) Lyttetesten, nu efter `lyt-foerst-asr-27-10.txt`.

## 24-10-2026 kl. 05:37: Røst-lyden er færdig (gren `claude/ugeplan-22-10`, ikke flettet, ikke pushet)

- **Alle 1.422 replikker har Røst-lyd** (8 bidder, 437a23c..bd1b108, 23-10 kl. 20:10 til 24-10 kl. 05:32). Lyden fylder 28,4 MB. Hver bid har fået nye LYD, UDGAVE_INDHOLD og INDHOLD.
- **Bør lyttes til:** 191 replikker er stadig mistænkelige efter seed 43 og 44: 179 «lang hale» og 12 «for lang». 116 af dem er timer-optaget-replikker, og 42 er ingredienser. Listen ligger i `D:/Stemmer/kogebog-500m/boer-lyttes-24-10.txt`.
- **Tests på bd1b108:**
  - Node-tests: 8 af 9 grønne. `test-lyd` er kun rød på de 3 forældreløse `timer-optaget`-mp3.
  - E2e i WebKit, delene «fejl» og «ugeplan»: 605 tjek grønne på 119 s.
- Røst-løkken stoppede én gang, kl. 19:35, fordi låsen var optaget i 90 min af Lystårnets e2e før udgivelse. Den blev genstartet fra mp3-trinnet kl. 19:37, og intet gik tabt.

**Afventer Jimmy** (som i afsnittet nedenfor): V8 (22-10), ja til fletning og push til `main` (23-10), ja til at slette de 3 forældreløse mp3 (23-10), lyttetesten (nu 191 replikker, 24-10) og `main`s åbne punkter.

## 23-10-2026 kl. 16:31: ugeplanen, UI-rettelser, versionsnummer v1 og Røst-lyd (gren `claude/ugeplan-22-10`, ikke flettet, ikke pushet)

**Gjort** (83 commits oven på `main`s 55ac5b2, heraf 2 fletninger; `main` er ikke rørt):
- **Ugeplanen, trin 1-10** (5327a9c..94212cd): katalog og regler, indkøbslisten (`js/indkoeb.js`), koden i linket (`js/plankode.js`), lageret `kog-uge-v1`/`kog-liste-v1`, telefonens `#/hent/<kode>` og `#/indkoeb`, den voksnes oversigt `#/uge`, børnenes valg `#/uge/vaelg`, `print.html?uge` (ugen på side 1, listen på side 2) og e2e uden net. Plan: `docs/ugeplan-plan.md`.
- **35 billige aftensretter i ugeplanen** (hold 1-6 og 1a3b580) med mængder, prisskøn og grønt. Researchen ligger i `docs/research`.
- **Review:** U1-U10, F1-F6 og UI V1-V10 er rettet, undtagen V8, som venter (se nedenfor). UI-review 2 gav 6 rettelser. Bevis: den gamle app gav 169 fejl, de nye 4.706 tjek er grønne. Code review af versionen og UI-rettelserne gav 0 kritiske fund. Fund 1-6 er rettet, fund 7 er fravalgt (se nedenfor).
- **Versionsnummer v1 · 23-10-2026** står på forsiden og i begge print (`js/version.js`). `test/test-version.js` fejler, hvis en fil ændres uden et nyt nummer, og skriver den linje, der skal sættes ind. Fletningen c809681 tog grenen `claude/version-23-10` ind.
- **x-land stod i 30 s i e2e** (babe880). Rodårsag:
  - Testen genindlæste siden 96 gange pr. skærmform, og service workeren hentede hver gang de 52 opskrifter.
  - `py -m http.server` taler HTTP/1.0, så hver forespørgsel fik sin egen forbindelse.
  - Windows har 16.384 porte og holder en lukket forbindelse i ca. 120 s. Målt top: 16.368 i TIME_WAIT. Tcpip-hændelse 4227 kom kl. 05:57, 08:04 og 10:21, samtidig med stoppene.
  - Nu skifter testen adresse i stedet for at genindlæse: 3.341 tjek grønne på 139 s, og ingen ny 4227.
- **Validatoren kendte ikke ugeplanens lydnavne** (3b23661): `faelles/uge-*` og `<ret>/uge.mp3`. `test-opskrifter` har været rød siden Røst-commit 27747c8. Mod den gamle validator fejler 3 af 45 tests, nu er alle grønne.
- **Stemmen:** 675 af 1.422 replikker har Røst-lyd. Røst kører videre i bidder gennem låsen og holder 90 s pause mellem kaldene, så andre kan nå låsen. Faldgruben står i `CLAUDE.md` «Stemmen»: en ny taleliste kan vælge andre udgaver af uændrede replikker, og de sættes tilbage før commit.
- **Forsidens billeder i e2e** (b4ce381): den fulde e2e på 3b23661 gav 2 fejl ved det allerførste iPad-besøg, nemlig «billeder ikke indlæst» og «Halloween» uden ikon.
  - Årsagen er testens timing, ikke appen. `goto` venter på sidens `load`, men kommer opskrifterne efter `load`, tegnes kortene bagefter, og billederne er stadig på vej.
  - Nu venter testen på billederne, som formernes forside allerede gjorde.
  - Bevis med langsomme opskrifter og billeder: før 51 af 112 billeder ikke indlæst, nu 0.
- **Tests:**
  - Node-tests på b4ce381: 8 af 9 grønne. `test-lyd` er rød, fordi 747 replikker mangler lyd, og på grund af de 3 forældreløse mp3.
  - Fuld e2e i WebKit på 3b23661: 36.462 tjek på 1.246 s, 2 fejl (forsidens billeder, se ovenfor).
  - Delen «hele» med rettelsen: 28.270 tjek grønne på 174 s.

**Afventer Jimmy:**
- (22-10) V8: på iPad'en på langs står «Indkøbsliste» og «Send til telefon» under skærmkanten (820 px). Skal bunden være fast, eller skal dag-rækkerne være lavere?
- (23-10) Fletning til `main` og push sker kun med Jimmys ja. `main` har 5153d01 (11 Røst-replikker) og to STATUS-commits, som grenen ikke har. Ved fletningen skal `lyd/liste.json`, `lyd/tekster.json`, `sw.js` (LYD/INDHOLD), `js/version.js` (UDGAVE_INDHOLD) og `STATUS.md` løses.
- (23-10, fra `main`) Ja til at slette de 3 forældreløse `timer-optaget` mp3? Indtil da er `test-lyd` rød på dem.
- Stadig åbne fra `main`s STATUS (23-10 kl. 03:04): Halloween-tegningerne, udtalen af «Halloween», de 27 ældre replikker med en anden udgave, og lyttetesten af `timer-optaget`.

**Testliste til Jimmy (iPad og iPhone):**
1. Forsiden og begge print viser «Version v1 · 23-10-2026».
2. På iPad'en: åbn ugeplanen fra forsiden (holdknappen) og lad børnene vælge. Vælg dyr, ret og dag; stemmen læser hvert tryk. På telefonen skal bunden med «Vælg» stå fast.
3. På iPad'en: «Send til telefon». Åbn linket på iPhone. Indkøbslisten vises; kryds af, og prøv «Erstat listen».
4. Print ugen: ugen står på side 1 og listen på side 2. Foden nævner ikke pris eller grønt.
5. Slå flytilstand til efter første besøg. Appen og opskrifterne virker stadig.
6. Lyt til nogle af de nye ugeplan-replikker (dagene og «Hvem skal vælge mad?»).

**Ikke lavet / usikkert:**
- Efter b4ce381 er kun delen «hele» kørt igen. De andre dele var grønne på 3b23661, og rettelsen rører kun «hele vejen».
- ui-reviewer er ikke kørt igen efter fletningen: ugekvoten var på 86 %. Hver rettelse har sit eget e2e-tjek.
- Code review fund 7: versionslinjens dato står ikke i `span.dato`, så den kan knække på en meget smal skærm. Det er ufarligt, og en rettelse kræver `medDatoer` i `dom.js` og nye fingeraftryk.
- `kuge/e2e-inde.sh:12` skriver HEAD i loggens etiket i stedet for den testede revision. Det påvirker kun loggen.
- Forslag, ikke afprøvet: `py -m http.server -p HTTP/1.1` i e2e, så forbindelserne genbruges.
- Ingen har lyttet til den nye Røst-lyd. Kontrollen er den, «Stemmen» beskriver: de mistænkelige laves igen med seed 43 og 44. Der er ikke kørt talegenkender (ASR).

## 23-10-2026 kl. 03:04: Halloween-afsnit, fund 5 og 6, «Start timer», pilletesten og stemmen (gren `claude/kogebog-22-10`, ikke flettet)

**Gjort** (12 commits oven på `main` 5942b76, den sidste er denne STATUS; `main` er ikke rørt og er stadig 4 commits foran `origin/main`):
- **Halloween** (92bd110): de seks retter står i et eget afsnit sidst på forsiden, med en græskar-tegning og en lys lilla cirkel. Fortrydes ét sted: `opskrifter/index.json`.
- **Fund 6** (6436425, 7523ac5): «Læs op» på ret-skærmen siger navnet og derefter «Sammen med en voksen». Knappen står som talende, til begge replikker er sagt.
- **Fund 5** (24753e9, 578baa6, 55ac5b2): i kødsovs, bolognese og cremet kødsovs lægges kødet i uden timer. Så vaskes hænderne, og timeren startes på trinnet efter. Validatoren afviser en timer med råt på hænderne. Æltningen undtages kun, når det rå er i dejen. Hver regel har en test, der fejler mod den gamle validator.
- **«Start timer» tabte trykket** (2ba24cc, 137f274). Rodårsag: løb en anden timer ud midt i trykket, forsvandt «Der kører allerede en timer», og knappen hoppede ca. 195 px. Slippet landede ved siden af knappen, så WebKit sendte intet click. Nu tegnes blokken ikke om, mens knappen trykkes: til click, ellers 600 ms efter slip, højst 10 s.

  | Playwright WebKit 1180×820, tryk 600 ms | timeren startede |
  |---|---|
  | `main` | 0/6 |
  | første forsøg (knappen blev i DOM'en) | 0/6 |
  | rettelsen | 6/6 |
  | kontrol uden anden timer (alle tre) | 6/6 |

  Ny e2e-test: rød mod den gamle kode 3/3 (900 ms tryk), grøn på grenen.
- **Pilletesten «pillen skal stoppe oplæsningen»** (4030961). Rodårsagen lå i testen, ikke i appen. Den falske lyd varede 1,5 s, og under last kom trykket først efter navnet, så «sammen med en voksen» startede med rette før trykket. Nu tæller kun det, der starter efter trykket, og navnet varer 4 s.
  - Målt med 16 travle processer: det gamle tjek fejlede 1/20 (4/20 kl. 07 22-10), det nye 0/20.
  - Mod en app uden `Tale.stop()` ved skærmskift er det nye tjek stadig rødt.
- **Stemmen** (5153d01): 11 Røst-replikker, lavet i ét aftalt slot 23-10 kl. 02:50-03:00, i 582 s gennem `tung-koersel.sh`. Replikkerne er «Halloween», de 7 ændrede kødtrin og 3 timer-optaget. `LYD` og `INDHOLD` er fulgt med. Lyttefiler: Drev `Claude/Kogebog/lyt-23-10/`.
- **Tests:**
  - Fuld e2e i WebKit på 55ac5b2: 17.320 tjek grønne (676 s).
  - Timer-afsnittet: 84 tjek grønne.
  - Mutanten (gammel app uden frysning og uden `Tale.stop()`): 7 fejl, som forventet.
  - Node-tests på 5153d01: 6/7. `test-lyd` fejler kun på de 3 forældreløse mp3 (se nedenfor).
  - Efter 55ac5b2 er kun lyd og hashes skiftet. E2e er ikke kørt igen for det.
- **Review:** code-reviewer to gange (rettet i 578baa6, 7523ac5, 137f274 og 55ac5b2) og ui-reviewer i WebKit (390×844, 1180×820, 1280×800). Forslagene nedenfor er ikke lavet.

**Afventer Jimmy:**
- (22-10) Godkend Halloween-tegningerne: `G:\Mit drev\Claude\Kogebog\halloween-tegninger-22-10.png`. UI-review: græskarret er tungt og kan skaleres til ca. 85 %.
- (23-10) Udtalen af «Halloween»: lyt til `faelles-gruppe-halloween.mp3` i `lyt-23-10`. Prøverne «Hælovin»/«Hæloviin» blev ikke lavet, fordi der ikke var tid i slottet. De laves med `koer-kogebog.sh 5 42 "" <taleliste> <udmappe>` gennem låsen.
- (22-10) De valg, Claude har truffet, er alle lette at fortryde:
  - Halloween ligger sidst og er lilla.
  - «Læs op» siger også voksen-replikken.
  - Kødet lægges i uden timer, og timeren kommer på næste trin.
  - Kødsovs trin 7 samler tomater, puré og krydderier, så trinnumrene og lyden ikke flytter sig. Code review foreslog at dele trinnet.
  - De genbrugte tegninger er uændrede.
- (23-10) Ja til at slette de 3 forældreløse `timer-optaget` mp3 (kødsovs 4, bolognese 5, cremet kødsovs 5)? Kommandoen er `node vaerktoej/indsaet-lyd.js D:/Stemmer/kogebog-500m --ryd`. Indtil da er `test-lyd` rød.
- (23-10) 27 ældre replikker har en anden udgave klar i `D:\Stemmer\kogebog-500m\mp3`. Efterbehandlingen valgte seed 43/44 til dem 21-10 (og pandekager/ingrediens-3 23-10), men de kom aldrig i `lyd/`. Claude har ikke lagt dem ind (uden for opgaven). Den næste `indsaet-lyd.js` tager dem med: ja eller nej? De dukker op som ændrede filer i `lyd/`, når `indsaet-lyd.js` køres.
- (23-10) Lyt til de 3 nye `timer-optaget` (lang hale, som de 70 andre). Ingen ordkontrol (ASR) er kørt.
- (22-10) UI-review, ikke lavet og ikke målt:
  - Rosa og Bo skrumper til 22/37 px ved 360/390 px bredde (`app.css:682-694`).
  - Titlen knækker på en iPad på højkant (768/744).
- (21-10) Lyt til `lyd/tunfrikadeller/4.mp3` og `lyd/pizzasnegle/10.mp3`.
- (22-10) Flet og udgiv, i PowerShell: `cd D:\Claude\Kogebog; git checkout main; git merge claude/kogebog-22-10; git push`. `main` har i forvejen 4 commits, der ikke er pushet.

**Lukket:** (21-10) code review fund 5 og 6, løst med valgene ovenfor.

**Ikke afprøvet:** fingertryk på en rigtig iPad; «Start timer» med tastaturet (mellemrum); UI-forslagene.

## 22-10-2026 kl. 07:36: `grafik-ai` er flettet og live; gamle filer slettet (venter på push)

- **Jimmy flettede og pushede selv kl. 07:22** (`main` = `origin/main` = 2a1da5d): AI-billederne, advarselstrekanten, de to aftensretter og timer-rettelsen er live.
- **Jimmys ja 22-10 («ja slet»):** de 19 gamle `grafik/ret-*.svg` og `lyd/faelles/voksen-hold.mp3` er slettet, og `sw.js` gemmer dem ikke længere offline. Ny `INDHOLD` og `LYD`, så iPads henter lyden igen, når den spilles (f736956, kun lokalt).
- **Tests på f736956:** alle 7 node-tests grønne (også `test-lyd`), fuld e2e i WebKit 17.129 tjek grønne (662 s).
- **Afventer Jimmy:**
  - (22-10) Push f736956: i PowerShell `cd D:\Claude\Kogebog; git push`.
  - (21-10) Code review fund 5 (timer på trinnet med råt kød?) og fund 6 («Læs op» på ret-skærmen siger kun navnet).
  - (21-10) Lyt til `lyd/tunfrikadeller/4.mp3` og `lyd/pizzasnegle/10.mp3`.
- **Lukket:** (21-10) «squash før fletning» — overhalet: «Jimmys slankeapp» (ed6b63a) ligger nu i den offentlige historik på GitHub. Skal den ud, kræver det en omskrivning og `git push --force` (spørg først).

## 22-10-2026 kl. 07:16: timer-pillen mistede klikket i WebKit (rettet på `grafik-ai`, ikke flettet)

- **Fejlen:** fuld e2e på `grafik-ai` (2fd8a04 + 08a001d) fejlede 1 gang i «timere»: pillen på forsiden førte ikke til trin 8. Rodårsag (test-runner, gentaget af Saga): pillens tal skrives hvert kvarte sekund (ny tekstnode), og WebKit sender intet `click`, når noden under musen skiftes ud før slip. Målt: tryk på 600 ms på tallet gav 0/6 klik med den gamle CSS og 6/6 med den nye; tryk på 5 ms gav 6/6 med begge.
- **Rettet (8843060):** `.pille > * { pointer-events: none; }`, nyt e2e-tjek med langt tryk (rødt 3/3 mod den gamle CSS), en vagt, hvis pillen er skjult (code review), faldgruben i `CLAUDE.md`, ny `INDHOLD`. Code review: ingen kritiske fund, fund 1 og 3 rettet.
- **Tests:** timer-afsnittet 3 gange grønt (90 tjek); test-runnerens fulde e2e med rettelsen: 17.129 tjek grønne (671 s, før vagten og kommentaren kom til). Node-tests 6/7 (`test-lyd` rød på `voksen-hold.mp3` som før). Fingertryk på en rigtig iPad er ikke afprøvet.
- **Ikke rettet (lavt, ikke målt):** «Start timer» (`app.js:396-401`) bliver flyttet ud og ind med `replaceChildren` i det tik, hvor en anden timer løber ud. Et tryk lige dér kan måske tabes (forslag i code review). E2e-tjekket «pillen skal stoppe oplæsningen» fejlede 4 af 20 gange ved 16 travle processer: den falske lyd varer kun 1,5 s, så tjekket bør kun se på det, der startede efter klikket. Det er testens antagelse, ikke en fejl i appen.
- **Afventer Jimmy (21-10, stadig åbne):** sletning af de 19 gamle `grafik/ret-*.svg` og `voksen-hold.mp3` (`--ryd`); code review fund 5 og 6; «Jimmys slankeapp» ud af historikken?; lyt til de to markerede mp3; flet og push (se afsnittet nedenfor).

## 21-10-2026 kl. 23:08: gren `grafik-ai` – AI-billeder, advarselstrekant, to nye aftensretter (ikke flettet)

**Gjort (alt på `grafik-ai`, 16 commits oven på `main` 5c3a90c; `main` er pushet og står lige med origin):**
- **To aftensretter:** One pot bolognese og Cremet kødsovs (ed6b63a). Pastavandet står på en bagerste plade, og der skrues ned, før barnet hælder pastaen i (90385ff). Kilden hedder «En slankeapp» (e380597), men ed6b63a har stadig den gamle tekst i historikken.
- **Advarselstrekant:** voksen-trin viser en gul trekant med kniv eller flamme i stedet for «Hent en voksen», og topbaren viser trekanterne + «Sammen med en voksen» (fc0234a, 7cc373b). Ny kokkekniv og hårdt mellemrum (6771e7d), kraftigere glød ved «mindre bevægelse» (cec480b).
- **Lyd:** 108 voksen-trin læst op igen uden «Hent en voksen» + tre start-replikker (7cc373b). Skærmskift stopper nu oplæsningen (557f3e7, test der fejler mod den gamle kode).
- **Billeder:** alle 21 retter har Codex-tegninger som 640 px WebP (`vaerktoej/ret-billede-til-webp.py`; 825666f, 967e4e9, e67b3a4, 2fd8a04). Tre er tegnet om, så de passer til opskriften: chorizo-pasta med spaghetti og hele panden (var penne, håndtaget skåret over), cremet kødsovs uden basilikum og med cremet sovs, havregrynskugler med kokosmel (lignede ris). Oversigt: Drev `Claude/Kogebog/retbilleder-21-10.jpg`. Cremet kødsovs viser penne, mens opskriften siger «fx spaghetti»; Claude lod den stå, så den ikke ligner «Kødsovs med spaghetti» (Jimmy afgør). Codex-prompterne skrives fra opskriftens ingredienser (task-observer 0078).
- **Review:** code-reviewer (12 fund: 7 rettet, 1 fravalgt, 3 til Jimmy) og ui-reviewer (9 fund: 4 rettet, 3 kun nævnt, chorizo + offline løst med billederne). UI-review 2 af rettelserne kl. 23: alle fire OK; kun kosmetisk: kniven i topbaren er ca. 18 px på en desktop med skala 1, og ingredienser knækker midt i ordet i WebKit på Windows (se iPad-testen 20-10 punkt 4).
- **Tests:** fuld e2e i WebKit kl. 22:55 på d4eb3ee: 17.129 tjek grønne (665 s). Bagefter er kun to billeder (samme størrelse) og INDHOLD skiftet (2fd8a04); e2e er ikke kørt igen for det. Node-tests grønne undtagen `test-lyd` (den forældreløse `voksen-hold.mp3`, se nedenfor).

**Afventer Jimmy (21-10):**
- Ja til at slette de 19 gamle `grafik/ret-*.svg` og `lyd/faelles/voksen-hold.mp3` (`--ryd`)? Indtil da fejler `test-lyd` på grenen (den forældreløse mp3).
- Code review fund 5: en timer på trinnet med råt kød (som i kødsovsen)? Fund 6: «Læs op» på ret-skærmen siger kun navnet – skal den sige mere?
- Skal «Jimmys slankeapp» ud af historikken (squash før fletning)?
- Lyt til `lyd/tunfrikadeller/4.mp3` og `lyd/pizzasnegle/10.mp3` (markeret til lyttetest 21-10).
- Fletning og udgivelse (billederne er inde, e2e grøn; afgør først sletningen ovenfor, så `test-lyd` er grøn): i PowerShell `cd D:\Claude\Kogebog; git checkout main; git merge grafik-ai; git push`.

## 21-10-2026 kl. 11:04: «Bagning» siges «Bæining»; første AI-billede prøvet

- Jimmy valgte lydprøve 4 («Bæining»). `UDTALE` i `vaerktoej/lav-taleliste.js` retter kun teksten til Røst. Kun `lyd/faelles/gruppe-bagning.mp3` er ny (byte for byte prøve 4), plus ny `LYD` i `sw.js` og en test. Commit d566b56 på `main`, alle 7 node-tests grønne. **Ikke pushet:** Jimmy kører `cd D:\Claude\Kogebog; git push` (main er 2 foran).
- Grafik: `codex exec` kan lave billeder (gpt-image, ikke kun interaktivt). Ét prøvebillede (kartoffelmos, 1024 px, hvid bund) brugte ca. 83.000 Codex-tokens. Før/efter ligger på Drev `Claude/Kogebog/grafik-proeve-21-10/`. **Afventer Jimmy:** ja/nej til frikadeller og chorizo-pasta. Plan og stopregel: `D:\Claude\Heimdal\docs\grafik-vurdering-21-10.md`, afsnit 3. Stilen er mere malet end de tegnede dyr.

## 21-10-2026 kl. 09:31: udgivet på https://jimmyfabe.github.io/Kogebog/

- Jimmy oprettede det offentlige repo `jimmyfabe/Kogebog`, pushede `main` (ea22eb5) og slog Pages til (main, / (root)). Claude tjekkede kl. 09:30: siden svarer 200, og den live `sw.js` og `index.html` er byte for byte som `main`. Linket er sendt til Jimmys mail.
- Kun `main` er pushet. Grenene `halloween`, `opskrifter-2` og `stemme-roest` ligger kun lokalt.
- Næste udgivelse: commit på `main`, og Jimmy kører `cd D:\Claude\Kogebog; git push` i PowerShell (Claudes filter afviser push).
- Stien `/Kogebog/` følger repoets navn. Omdøbes repoet, skifter adressen, og genvejen på iPad'ens hjemmeskærm virker ikke mere.

## 20-10-2026 kl. 18:24: seks Halloween-retter + Røst flettet ind i `main` (fast-forward fra 8feea15)

**Gjort:**
- **Retterne:** mumiepølser, edderkoppeboller, øjeboller, græskar-calzone, heksefingre og slimsnegle ligger i Bagning med `"afproevet": false`. Teksten er skrevet om fra Sagas opskrifter: korte trin, og den voksne tager kniv og ovn. Pynten kommer før æg-penslingen. «Bos pandekager efter Rasmus Klump» hedder nu «Tynde pandekager», og kilden nævner stadig bogen.
- **Grafik:** 16 nye tegninger (6 retter, 2 verber og 8 ingredienser). Hver er set ved hvert trin, der bruger den (task-observer 0078). De 6 ret-tegninger har damp, en lille flagermus og glans. Oversigten og trin-arket ligger på Drev (se testlisten).
- **Validatoren:** pynt, pakke ind, smuldre, rulle, kagerulle og ælte efter en pensling med æg kræver en ny håndvask, indtil der bages eller steges. En pensling, der aldrig bliver bagt, giver en fejl. Hver regel har en test, der fejler mod den gamle validator. Kyllingepølser → `poelse` og kyllingepålæg → `skinke` er undtaget med en grund. `kyllingetern` er med vilje ikke undtaget.
- **Lyd:** alle 520 replikker har Røst-lyd (10,75 MB, -24,5 til -23,3 LUFS). Pandekagerne siger «Tynde pandekager» (navn, valgt og timer-optaget 9 og 10 er lavet igen). 70 replikker er stadig mistænkelige (mest «lang hale» på timer-optaget) og bør lyttes til.
- **Udgivelse:** `.nojekyll`. Alle stier er relative, og sw-scope er `./`. Testet under en understi (`http://127.0.0.1:8092/Kogebog/`). Forsiden og README siger nu, at stemmen er en computerstemme, som Røsts licens kræver.
- **Lækscan** af hele historikken (alle grene, diffs, commit-beskeder og forfattere) efter børnenes data, nøgler og tokens: 0 fund. security-auditor fandt heller intet.
- **Review:**
  - code-reviewer 1 (13 fund) og 2 (6), security-auditor (7) og en dommer (Fable). Dommeren fandt, at alt holder, undtagen det gamle navn i 4 mp3-filer. Det er løst med den nye lyd, og `test-lyd` bekræfter det.
  - ui-reviewer: 0 blokerende og 5 andre fund. 2 er rettet: «Edderkoppeboller» stak ud af kortet på 360 px, og fodens parentes blev delt. 3 venter (se nedenfor).
  - Commits 7af62c2 → 9268c58.
- **Tests:** `koer-alle` 7/7 grønne. Hele e2e i WebKit under `/Kogebog/` kl. 18:24: 15.812 tjek grønne. Kørslen før (17:55) fandt 1 fejl («Edderkoppeboller» på 360 px), som nu er rettet.

**Jimmys testliste:**
1. Godkend tegningerne: `G:\Mit drev\Claude\Kogebog\halloween-tegninger-20-10.png` (alle 16) og `halloween-trin-20-10.pdf` (hvert trin med sit billede, 12 sider).
2. Lyttetest af Røst på den udgivne app (iPad):
   - Tryk Læs op på et par trin i to af Halloween-retterne og på pandekagerne.
   - Lyt også til de fem fra 19-10: chorizo-pasta ingrediens 1, kartoffelmos trin 8 og pizzasnegle ingrediens 7, 8 og 14.
   - Prøv et voksen-hold som første tryk efter en genindlæsning.
   - Brug den rigtige adresse uden `?hurtig=1`: den gør alle timere 2 sekunder lange.
3. Uden wifi: åbn appen én gang med net, slå wifi fra, og åbn en ret.
4. Orddeling på iPad: deler ret-siden lange ingredienser med en bindestreg? Fx «mozzarellakugler» i Øjeboller og «grøntsagsbouillonterninger» i Chorizo-pasta. På pc'en (WebKit på Windows) deles de midt i ordet uden bindestreg.
5. Bag én af Halloween-retterne, og sæt `afproevet` til `true`, når den virker.

**Afventer Jimmy (20-10):**
- Skal Halloween-retterne have deres egen gruppe (ny hop-knap og mærke)? De ligger nu i Bagning.
- Genbrugte tegninger, som ui-revieweren også peger på:
  - `pakke-ind` (staniol om en flute) ved «rul strimlerne om pølsen», «saml hjørnerne» og «fold dejen over».
  - `rulle` (kugler mellem hænderne) ved «rul til en finger» og «rul dejen sammen».
  - `pynte` (en oliven på en bolle) ved «tryk en negl fast» og «stik en grøn stilk i».
  - Mozzarellakugler vises med ost-ikonet (en gul trekant).
  - Skal de have deres egne tegninger?
- Computerstemme-linjen står nederst på forsiden. Dommeren foreslog den øverst. Den er lille med vilje, så den ikke tager børnenes opmærksomhed.
- Repoet bliver offentligt med `CLAUDE.md`, `STATUS.md`, `docs/` og lokale stier (D:\Stemmer, Drev-mapper og navne på chats). Der er ingen nøgler og ingen persondata. Det gamle pandekagenavn står i historikken. At omskrive historikken kræver dit ja, og det anbefales ikke.

**Kan vente (fra reviewene):**
- En gemt timer kan pege på et trin eller en ret, der ikke findes mere, efter en opskrift er ændret (`js/lager.js:19`).
- En lydfil følger trinnummeret. Pushes en rettet opskrift uden ny lyd, siger stemmen den gamle tekst. `test-lyd` fanger det, men intet hook eller CI tvinger testene før et push.
- `?hurtig=1` virker også på den udgivne app.
- Lego-appen (`jimmyfabe.github.io/`) har en service worker med scope `/`. Den svarer på det allerførste besøg på `/Kogebog/` på en iPad, der har Lego-appen, til Kogebogens egen tager over. Online gør det ingen skade. Offline ved det allerførste besøg vises Legos fejlside. Sluttet ud fra koden, ikke testet.
- Alle apps på `jimmyfabe.github.io` deler origin. Præfikserne `kog-`, `mat-` og `lego-` er en aftale, ikke en grænse. Hold fast i `textContent` og den stramme CSP.
- UI (390×844): noten «Til den voksne» ligger delvist under den faste bund på 10 trin. Det gælder fx mumiepølser trin 2 og øjeboller trin 6. Den kan rulles frem, og trinteksten og billedet er altid fri. Det er samme layout som de gamle retter med lange noter.
- UI: ingrediensnavne deles midt i ordet på pc'en (se testliste 4, og «grahamsm|el» fra 19-10). Deler iPad'en dem heller ikke, så brug bløde bindestreger som i «Havregrynskugler» og «Edderkoppeboller». `tilTale` fjerner dem fra talen.

## 19-10-2026 kl. 16:45: Røst-stemmen på grenen `stemme-roest`, reviewet, ikke flettet (venter på Jimmys lytning og iPad)

**Gjort:** alle 377 replikker har Røst-lyd. Tal, brøker og tegn skrives ud som ord (`tilTale`), og 176 replikker er lavet igen. Lyden har sin egen cache, en tidsgrænse på 4 s og Range efter RFC 9110. Der er ét fælles lydelement, og iPad-stemmen tager over efter 6 s uden `playing`. Ingrediensen bliver lyseblå, mens den læses op.
- **ASR (cer2, 377 filer):** over 0,25: 39 → 27; over 0,40: 12 → 0; snit for replikker med tal: 0,162 → 0,105. Seks filer er blevet værre. Sammenligningsscriptet er ikke reviewet.
- **Review:** code-review (15 fund, 3 rettet) og to UI-reviews (1 + 1 fund rettet). Hver rettelse blev bevist med en test, der fejlede mod den gamle kode. Seneste commit er e13de51.
- **Tests:** `koer-alle` 7/7. Hele e2e: 12.002 tjek grønne kl. 16:21. Den forrige kørsel på samme kode (15:57) havde 2 fejl ved timer-pillen på iPad, og den del var grøn alene. Den kendes som ustabil, men årsagen er ikke fundet.

**Jimmys testliste (før fletning i main):**
1. Lyt: `lyd\chorizo-pasta\ingrediens-1.mp3`, `lyd\kartoffelmos\8.mp3`, `lyd\pizzasnegle\ingrediens-14.mp3`, `ingrediens-7.mp3`, `ingrediens-8.mp3`.
2. På iPad: tryk Læs op på et trin og en ingrediens. Prøv et voksen-hold som første tryk efter genindlæsning, og prøv uden wifi.

**Kan vente (fra reviewene):**
- sw: dobbelt hentning ved `bytes=0-1` + `bytes=0-`; intet ur på selve filens krop; ny `LYD` sletter alle gemte lydfiler; intet tjek af Content-Type.
- tekst.js: «nul grad», «1.000 g» og «10000 g». `LYD_RE` tager «ingrediens-x1». `indsaet-lyd --ryd` med en ufuldstændig `kvalitet.json`. test-lyd læser kildeteksten.
- UI: kun ca. 2 px luft over ikonet ved skala 1,15. Lyseblå mod hvid er kun ca. 1,2:1. «grahamsm|el» deles midt i ordet (`overflow-wrap: anywhere`).
- `D:\Stemmer\efterbehandl_kogebog.py`: kandidater med en anden tekst end den seneste måling bør ikke tælle (gammel seed 43/44).

## 19-10-2026 kl. 05:36: 13 retter, ny grafik og fire reviews flettet ind i main (6bbe740 → 344e580, 65 commits, ikke pushet)

**Gjort (grenen `opskrifter-2`, Saga og agenter 18.–19-10):**
- 13 retter. Forsiden er delt i Aftensmad, Bagning og Søde sager med tre hop-knapper i dugen (gryde, ovn, kage) og et gruppemærke på hvert kort (farveblinde).
- Grafik: 25 verber. Nye er tage-ud (flad plade), tage-ud-form (dyb form), si, kagerulle, pakke-ind og smuldre. Skinken er tegnet om. Hver tegning er godkendt ved siden af hvert trin, der bruger den (task-observer 0078).
- Sikkerhed i opskrifterne: håndvask efter æltning og formning, og den voksne tager ud af ovnen. Validatoren tjekker nu:
  - kniv-, varme- og rå-ord efter stammen, med en liste over undtagelser;
  - at æg og kød i ingredienserne har det rigtige ikon;
  - at hjælpen passer til ordet (kniv eller varme).
- Timer: ringen, «Stop» og «Ok» rulles frem over bunden, og fokus bliver i timeren.
- Print: det sidste trin og foden står i én blok (`break-inside: avoid`). Ikke afprøvet i Safari-print.
- e2e åbner en ny side pr. ret (WebKit-grænsen for navigationer). Den ustabile `timerFrem` er rettet: testen målte den gamle skærm. Den fejlede i 9 af 30 kørsler og fejler nu i 0 af 30.
- De to åbne punkter fra 18-10 er lukket: (a) 11d446d og (b) ceff126.

**Tests 19-10 kl. 05:26–05:35:**
- e2e i WebKit på 344e580: 11.925 tjek grønne (514 s).
- `node test/koer-alle.js`: 5/5 grønne, også efter fletningen i main.
- Code review 2 og 3 og UI-review 5 og 6: alle fund er rettet med en test, der fejlede før rettelsen. Undtagelserne står herunder.

**Åbne småting (lav):**
- Flutes vises som runde boller ved «Tag ud».
- «maale» viser et målebæger, hvor noten siger «køkkenvægten» (hytteostboller 3, pandekager 2).
- Drys-billedet viser en rund pizza (pizzasnegle 14).
- Spaghetti-ikonet er tyndt.
- Kortene er 384 px brede på 844×390.
- Færdig-ringens spor er svagt.
- Ingrediensnavne brydes uden bindestreg på 390 px (tjek på iPhone).
- Printets note har ingen «Til den voksne».
- e2e `fejltilstande` (ca. linje 1046) har samme gamle-skærm-mønster.
- `stege`/`bage` af noget andet nulstiller den rå dej i validatoren.
- `docs/chatgpt-app-prompt.md` nævner 12 verber, og kommentaren øverst i `katalog.js` er forældet.

**Ikke afprøvet:**
- Rigtig iPad og iPhone.
- Safari-print.
- Hop med «mindre bevægelse».
- Oplæsningen ved hop er ikke hørt.

**Afventer Jimmy (18-10, stadig åbne):**
- Må kogebogen ligge offentligt på GitHub Pages? Intet er pushet (regel 7).
- Navnet «Bos pandekager efter Rasmus Klump»: rettigheder til navnet?
- Stemmen: i dag iPad-stemmen (`lyd/liste.json` er tom). Røst (Nic) kræver dit ja til licensen.
- Dit «ja» til opskrifterne og grafikrunde 2 kom 18-10 («du forsætter bare»).

**Jimmys testliste** (pc: `py -m http.server 8091 --bind 127.0.0.1 --directory D:/Claude/Kogebog` → http://127.0.0.1:8091/?hurtig=1, eller på iPad efter dit ja til Pages):
1. Forsiden: gryde, ovn og kage hopper hver til sit afsnit.
2. Pizzasnegle: billede, navn og tid ses uden at rulle.
3. Start en timer (2 s med `?hurtig=1`): når tiden er gået, ses «Ok» over bunden.
4. Boller: «Tag pladen ud af ovnen» viser pladen og en pil ud mod dig.
5. Brownie: «Tag formen ud» viser formen.
6. Print af frikadeller: det sidste trin og foden står sammen.
7. Kartoffelmos trin 6: dørslaget passer til kartofler.

## 18-10-2026 kl. 16:50: grafik og rettelser efter review 2 (e82d280 → 5e66251)

**Gjort:**
- e82d280: 14 nye SVG'er fra Codex (5 ret-billeder, 9 verber).
- Review 2 gav 9 punkter. De er rettet i 11 commits med en test først:
  - et hold stopper, når skærmen skiftes;
  - på iPhone får fremskridtet sin egen række, når timer-pillen vises (mindste streg før 4 px, nu 17,7 px);
  - verbum-billedet er 100 % bredt;
  - rettens knapper står fast i bunden på iPhone og på 844×390;
  - på iPad på højkant står «Fortsæt» først;
  - fokus havner ikke under bunden (`scroll-padding-bottom`);
  - forsiden med «Tiden er gået» på iPad;
  - Bo står på tom- og fejlskærmen, og fejlteksten er neutral;
  - «Hent en voksen» står på én linje;
  - «Start timer» er bleg, når en anden timer kører;
  - konfettien holder sig væk fra teksten;
  - hele code review-listen er taget.
- Diffen er læst af Saga.

**Tests 18-10 kl. 16:47:**
- E2E i WebKit: 5e66251 er grøn med 3283 tjek på 128 s.
- De nye tests mod e82d280 giver 238 fejl. Hvert nyt tjek fejler.
- Node-testene: 4/4 grønne. `INDHOLD = '911f176f0b75c623'`.

**Efter kl. 16:50:**
- UI-review 3 gav 11 fund. Fund 1–10 er rettet (cf715f7..1b95271, e2e 3890 grøn). Fund 11 er billedet og venter på grafikrunde 2.
- Code review gav 7 fund (0d256dd..99eea68, e2e 4120 grøn på 99eea68):
  - rettet: safe-area i `--bund`, `:has`-fallback og mindTid;
  - fund 3 (Tab-rækkefølgen) er valgt med vilje og står i CLAUDE.md;
  - fund 6 (bunden står tre gange) er sprunget over, fordi det er oprydning;
  - fund 1 og 4 holdt ikke ved måling i WebKit.
- To åbne punkter tages ved næste sammenlægning:
  - (a) Fjern `and (max-width: 800px)` i app.css ca. linje 658 som forsikring. På 812×375 er der kun 11 px luft, og WebKit på Windows bruger Trebuchet MS, ikke iPhonens ui-rounded. Med Verdana brækker bunden.
  - (b) I et desktopvindue på 901–979 × 800 ligger kødsovs' bund under kanten. Bunden står kun fast op til 900 px.
- Arbejder nu:
  - de nye opskrifter på grenen `opskrifter-2` (worktree i kladdemappen);
  - grafikrunde 2 med Codex (49 SVG'er).

**Ikke gjort eller ikke afprøvet:**
- iPhone SE på langs (667×375): bunden står på to rækker (174 px).
- Gamle iPads uden `:has` (Safari under 15.4).
- Rigtig iPad og iPhone.
- 5 billeder passer ikke til trinet, fx en stegepande ved «Bag bollerne i ovnen». De rettes i grafikrunde 2.

**Afventer Jimmy (18-10):**
- dit «ja» til de nye opskrifter: Bos pandekager efter Rasmus Klump, Price-frikadeller, kartoffelmos, hvidløgsflutes, brownie, blondie, hytteostboller, havregrynskugler, pizzasnegle og tunfrikadeller. Kandidaterne står på Drev i `Claude/Kogebog/opskrift-kandidater-18-10.md`;
- dit «ja» til grafikrunde 2;
- om kogebogen må ligge offentligt på GitHub Pages.
- Intet er pushet.

## 18-10-2026 kl. 14:28: rettelser efter reviewet (29737f9 → fb5ba9c, 21 commits)

**Gjort:**
- Alle fund fra kode- og UI-reviewet er behandlet, ét fund pr. commit, undtagen U12 (pladsholderbilleder; grafikken laves separat).
- Nyt i denne runde: Tilbage er kun en pil på iPhone (U13), en hvid tallerken på det valgte kort (U14), større ingrediensnavne og -ikoner og større noter på printets skærmudgave (U15), hover med mus (U16), «Fortsæt ved trin N» som stor knap og «Start forfra» (U17), en tom liste uden udviklertekst (U18) og e2e-delen `beroering` (K10).
- Fundet i e2e: på iPhone lå timer-pillen ind over fremskridtet, fordi `1fr` brugte knappernes `min-width` som mindstemål. Rettet med `minmax(max-content, 1fr)`.
- CSP-konsolfejlen ved skærmbilleder kommer fra Playwright: WebKit indsætter altid `<style>body {}</style>`. `caret: 'initial'` hjalp ikke. Testen springer nu kun den besked over, og kun mens der tages et foto.

**E2E i WebKit 18-10 (gennem låsen):** fb5ba9c er grøn, med 2836 tjek på 117 s. De samme tests mod 29737f9 fejler på hvert fund, der er rettet i denne runde (341 fejl). En mutant uden de tre berøringslinjer i `js/hold.js` får de tre `beroering`-tjek til at fejle.

**Ikke afprøvet:** rigtig iPad og iPhone (berøring er syntetiske PointerEvents), `hyphens: auto` i Safari og visuelt review efter rettelserne (`ui-reviewer` mangler). På iPhone er fremskridtets prikker smalle ved siden af en færdig timer.

## 18-10-2026: fase 1

**Gjort (kontrolleret i koden og i node-testene):**
- 5 retter som JSON: pandekager, frikadeller, koedsovs, boller, chorizo-pasta. I alt 67 trin, 27 voksen-trin og 18 timere. Chorizo-pastaens ingredienser stemmer med Jimmys udgave på Drev (`Chorizo-pasta.html`). Stikprøve, og fremgangsmåden er ikke tjekket.
- Validatoren har 16 tests. Den tjekker voksen-trin, råt kød og æg, `Object.hasOwn` og ordgrænsen.
- Skærmene: forside, ret, ét trin pr. skærm og færdig. Voksen-trin med 2 s hold («Hent en voksen», Bo). Print A4 bag samme hold.
- Timer: sluttid, lyd, skærm-lås, pille på forsiden, «Der kører allerede en timer på …», og «Tiden er gået» i op til 2 timer efter genindlæsning.
- Oplæsning med iPad-stemmen (`da-DK`). Enheder og forkortelser læses som ord (fx «2,5 dl» → deciliter), og «1 løg» læses rigtigt.
- Tastatur: mellemrum og piletaster. En holdt tast gentager ikke handlingen.
- Service worker: `VERSION = kog-` + `INDHOLD` (sha256), og `test-sw` er grøn.
- 6 SVG-billeder fra Codex er lagt ind: dyr-bo, dyr-rosa, dyr-pip, verbum-stege, verbum-koge og verbum-maale.

**Node-tests 18-10 (`node test/koer-alle.js`):** 4 af 4 grønne. Opskrifter: 5 retter, 67 trin, 27 voksen-trin. Validator: 16 bestået, 0 fejlet. Tid: 9 bestået, 0 fejlet. Service worker: 7 bestået, 0 fejlet.

**Ikke gjort eller ikke afprøvet:**
- ~~E2E (WebKit) er ikke kørt i denne runde.~~ Kørt og grøn 18-10 kl. 14:25 (se afsnittet ovenfor).
- **Billeder:** appen bruger 22 billeder, og 6 er lagt ind. 16 mangler. Dertil kommer 39 SVG-pladsholdere i `grafik/`. De 24 ingrediens-ikoner (`ing-*.svg`) står ikke på ChatGPT-listen.
- **Ikke afprøvet på iPad:** lyd efter genindlæsning, Wake Lock, offline-tilstand og A4-print.
- Ingen af de 5 retter er lavet i praksis (`afproevet: false`).
- `lyd/liste.json` er tom, så der er ingen MP3-filer. Al oplæsning sker med iPad-stemmen.
- Stemmen er ikke valgt, og der er ikke lyttet.
- Ikke udgivet: intet GitHub-repo, ingen Pages og intet domæne. Mørkt tema er ikke med i fase 1.

**Ting, der IKKE virkede:**
- Codex kan ikke lave billeder. Den skrev SVG-tekst, og ChatGPT-kvoten løb tør efter 6 af 20 filer.
- Google Chirp 3 HD er udelukket for børneapps (Googles vilkår 20(d), Heimdal 18-10).
- Piper-mandestemmen er afvist.
- `scrollWidth`-tjekket i e2e fangede ikke indhold uden for skærmen, fordi `body` har `overflow-x: hidden`. Testen er rettet og kørt 18-10.

**Afvigelser fra planen i `docs/gennemgang.md` (ikke rettet, kun noteret):**
- Knapperne på trin-skærmen hedder «Læs op», «Næste» og «Tilbage». Der er ingen «igen»-knap.
- Børneknapper er mindst 64 px, ikke 52 px.
- Rækkefølgen ligger i `opskrifter/index.json`, ikke `liste.json`.
- Ordgrænsen er 9 ord, ikke 8.
- `kog-v1` gemmer også `sidste` (hvor man slap), ikke kun indstillinger.

**Afventer Jimmy:**
1. **Billeder:** ChatGPT-billeder efter `docs/chatgpt-grafik-prompt.md`. Godkend dyrenes navne (Bo, Rosa og Pip) først. Filerne skal ligge i Drev-mappen `Claude/Kogebog/billeder`. Afgør også, om ingrediens-ikonerne skal laves.
2. **Stemme:** lyttetest af Røst v3, en Piper-kvinde (langsigtet) og Azure Christel, og dit valg. Google er udelukket, medmindre Google bekræfter skriftligt.
3. **GitHub-repo og Pages:** må `Kogebog` være et offentligt repo med Pages på `/Kogebog/`? Stien kan ikke skiftes senere uden at ikoner og gemte data på iPad'erne forsvinder. Hvordan iPad'en åbner appen før udgivelse, er ikke undersøgt.
4. **Domænet tumbi.dk:** skal det købes nu? Et eget domæne skifter origin, og så forsvinder gemte data, hvis det ikke planlægges.

**Testliste til Jimmy (iPad i landskab, når appen kan åbnes):**
1. Forsiden: fem store kort. Første tryk siger navnet, og andet tryk åbner retten.
2. Pandekager: gå gennem alle trin med «Næste» og «Tilbage». «Læs op» læser trinnet igen.
3. Voksen-trin: «Hent en voksen» med orange ramme og Bo. «Næste» kræver et hold i 2 s.
4. Timer: start en timer, luk appen og kom tilbage. Start en ny timer, mens den første kører. Der må ikke være to.
5. Print: hold «Print» i 2 s. Tjek, at A4 er læsbar.
6. Timer med skærmen tændt: lad skærmen slukke og tænde igen, og se om tiden passer.
