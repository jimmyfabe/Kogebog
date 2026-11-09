# STATUS – Tumbi Køkken

> Ældre afsnit står i `STATUS-arkiv.md` i samme mappe (nyeste øverst).

## 09-11-2026 kl. 23:29: v9 har billeder, review-rettelser og grøn e2e; stemmen kører (Saga)

Intet er pushet eller flettet til main. v8 er flettet ind i v9 (`84cb394`).

**Lavet i aften:**
- `7906232` + `650c8c4`: billeder til de 16 retter (FLUX.2 klein), og retterne er flyttet fra ventemappen ind i `index.json`. `74c135d`: ordbogen kender madpakkernes ord.
- `cd51243`: rettelser efter code- og indholdsreview i 13 retter:
  - rå fisk kom ikke længere i dip-skålen (det alvorlige fund);
  - eget trin «Skær citronen over.» i 5 retter;
  - køleelement i madpakkerne;
  - havregrødsbollerne køler 30 min;
  - spinaten tøs op natten over;
  - paprika har ikonet krydderurt, som i resten af kogebogen.
  - **Rettelse til commit-beskeden:** der står «Afvist: fund 16 (krydderi-ikonet)», men fund 16 *blev* rettet (tortilla-ruller).
- `4d1e031` (v9) og `6be3c67` (v8): blød bindestreg i «Rugbrødsmadpakke» og «Gulerodssmoothie», som stak ud af kortet på iPhone og 360 px.
- Tests:
  - node-testene er grønne, undtagen `test-lyd` (453 replikker mangler, til Røst er færdig, plus de 2 gamle gruppe-mp3) og `test-version` (nummeret hæves ved udgivelsen);
  - e2e i v9 (`former`, `hele`, `lyn`, `voksen`) er grøn efter bindestregen.
- Review-fund 1 (iPad 768×1024 med en kørende timer) er målt i WebKit. Siden kan rulle 1 px (og 3 px på 901×800), ikke ~30 px, og alle 11 knapper og «Voksne: hold» kan ses. Ingen rettelse.

**Kører nu:** Røst seed 42 på v9's 453 replikker (lukkes ca. kl. 03). Derefter trin 3-5 i CLAUDE.md «Stemmen», så `LYD`/`UDGAVE_INDHOLD`/`INDHOLD`. Lyt efter: squashen, basilikummen, spegepølse.

**Næste:** ui-reviewer på v9 (skærmbilleder på 5 skærme) og e2e på v8 alene, begge gennem låsen.

**Afventer Jimmy** (alle spørgsmål samlet her):
- (09-11) «Grove gulerodsboller til madpakken» står i Brød og pizza. Skal de flyttes til Madpakke? Reglen i `docs/forside-sortering-05-11-2026.md` nævner ikke Madpakke endnu (review-fund 4). Flytningen er én linje i `index.json`.
- (09-11) Nødder: købte kerner, tørret frugt, boller og rugbrød kan være mærket «kan indeholde spor af nødder». Er spor også forbudt på skolen? (ikke tjekket pr. vare)
- (09-11) Madpakkerne skal prøves i et køkken, før `afproevet` sættes til true.
- (08-11) Kæmpesmåkagerne skal smages og bages i en rigtig ovn.
- (06-11) Udgivelse: v7, v8 og v9 venter på dit «ja». v7 skal ud før eller sammen med v8, og v9 indeholder v8.
- (05-11) Må de 2 gamle gruppe-mp3 og `grafik/gruppe-bagning.svg` slettes? `test-lyd` er rød, til de er væk.

## 09-11-2026 kl. 13:49: v9 «Madpakke» er bygget, billederne venter (hovedsessionen)

Jimmy 09-11: «ja, lav madpakkerne». Gren `v9-madpakke` fra `v8-drikke` (worktree `D:/Claude/.claude/worktrees/kogebog-v9`). Plan: `docs/madpakke-plan-09-11-2026.md`. Intet er pushet eller flettet.

- `b951d94`: gruppen Madpakke i `GRUPPER`, gitter til 11 knapper, ikonerne squash og spegepølse. `00fc1ba`: planen. `06b1520` og `1cded18`: 15 nøddefri retter i `docs/venter-paa-billede/` (`afproevet: false`, pris og grønt er skøn). `f11ed31`: ventemappens README med trinene, når billederne kommer.
- Tests: `test-opskrifter` grøn (223 + 15 venter). `koer-alle.js` 15 af 17; `test-lyd` og `test-version` var røde i forvejen. **E2e er ikke kørt**, og 11-knaps-gitteret er ikke set i en browser.
- Billederne: prompter, stilbillede, `lav-billede.py` (v8's stil) og løkken ligger varigt i `D:/Stemmer/kogebog-v9-billeder/`. Kør `bash D:/Stemmer/kogebog-v9-billeder/billed-loekke.sh` (ét billede pr. låsekald; stop med filen `billed-stop`).

**Næste:** afløst af afsnittet 23:29 ovenfor (billeder, flytning og e2e er gjort).

- 09-11 kl. 16:00: **Cowboybønner** (`b03b158`) er ret nr. 16 i ventemappen: gruppe `koed`, i ugeplanen (70 kr., Rema-priser 09-11), billedprompten står som linje 16 i `retter-v9.txt`, så løkken tegner den med. Ekstra trin står i ventemappens README. Jimmys ønske efter Trinity-bønnerne (PDF på Drev).

**Afventer Jimmy:** retterne skal prøves i et køkken, før `afproevet` sættes til true.

## 08-11-2026 kl. 10:47: ny ret «Bedste venners kæmpesmåkager» i v8, stemmen kører igen (Saga)

Jimmy 08-11: pigerne savnede de store småkager fra deres YouTube-favoritter (navnene står ikke i repoet, for det er offentligt). De må ikke lave dem, så Saga finder et alternativ.

- `18b4401`: retten ligger i Søde sager med 21 trin, ovntrinnene er voksentrin, der er billede, og `afproevet: false`. Mængder og bagetid er et skøn og ikke smagt til. Validator, sw og 14 andre tests er grønne; `test-lyd` og `test-version` var røde i forvejen.
- Rettens 35 replikker er lagt i Røsts aktive taleliste (`D:/Stemmer/kogebog-500m/taleliste.json`, nu 5882; den gamle er gemt som `taleliste-foer-smaakager-0811.json`). Løkken kører, og ved bid 6 kl. 10:29 manglede 223 + 35 replikker.
- Ikke kørt: e2e, ui-reviewer og `koer-alle.js` gennem låsen. Det sker sammen med «Næste» nedenfor.

**Afventer Jimmy:** smag og bagetid skal prøves i en rigtig ovn, før `afproevet` sættes til true.

## 06-11-2026 kl. 14:07: v8 (drikke, smoothies, kager, cupcakes) har alle billeder, stemmen laves nu (Saga)

Gren `v8-drikke` (worktree `D:/Claude/.claude/worktrees/kogebog-v8`). Plan: `docs/drikke-plan-05-11-2026.md`. Intet er pushet.

**Afventer Jimmy:**
- (06-11) v7 skal udgives før eller sammen med v8. Begge grene står stadig på nummeret v6, så nummeret sættes ved udgivelsen.
- (05-11) Må `grafik/gruppe-bagning.svg`, `lyd/faelles/gruppe-aftensmad.mp3` og `lyd/faelles/gruppe-bagning.mp3` slettes? Ingen bruger dem, og `test-lyd` er rød, til de er væk.

**Lavet 06-11:**
- `66c30e3`: 71 billeder tegnet lokalt (FLUX.2 klein 4B) og tjekket på mørk bund. Fire blev tegnet om: sommerkagen, isbjørnens milkshake, regnbue-drikken og kanelkagen (to gange).
- `4c88a1b`: v7 flettet ind igen, så juleretternes 18 billeder er med. `test-opskrifter` er grøn: 222 retter, 0 venter på billede.

**Stoppet 06-11 kl. 15:11** (pc'en skulle slukkes): Røst seed 42 nåede 97 af 1539 replikker (1442 tilbage). Løkken og Python-kørslen er stoppet, og låsen er fri. Fortsæt sådan: slet `scratchpad/kogebog-v8/lyd/roest-stop` og kør `bash scratchpad/kogebog-v8/lyd/roest-loekke.sh 42`. Replikker, der allerede er lavet, springes over. Ligger kladdemappen der ikke længere, så kør trin 2 i CLAUDE.md «Stemmen» direkte. Den gamle taleliste er gemt ved siden af.

**Næste:**
1. Kør trin 3-5 i CLAUDE.md «Stemmen»: seed 43/44 på de mistænkelige, efterbehandling med `--mp3`, og `indsaet-lyd.js`. Gendan uændrede replikkers mp3 fra HEAD.
2. Sæt `INDHOLD` og `LYD` i sw.js.
3. Kør e2e og ui-reviewer.

## Stadig åbent (ført op fra arkivet 03-11-2026)

- (29-10) Lyt til de 9 lydfiler, hvor ASR stadig hører noget forkert (listen står i arkivet under 29-10 kl. 06:11).
- (20-10) Godkend Halloween-tegningerne (`halloween-tegninger-22-10.png` på Drev; græskarret kan skaleres til ca. 85 %). Stod senest som «(23-10) Halloween-tegningerne» i listen 31-10.
- (18-10) Domænet tumbi.dk: skal det købes? Et eget domæne skifter origin, så gemte data på iPad'erne forsvinder, hvis det ikke planlægges.

## 02-11-2026 kl. 23:34: v6 · 02-11-2026 «Mere grønt i maden» er færdig og grøn, men IKKE pushet (Saga)

Jimmy svarede «ja, til den» 02-11 kl. 15 og senere «Du tak bare og gør alt færdig». Det er læst som ja til at udgive v6, når alt er grønt. Fortolkningen er ikke bekræftet.
- **Ud af huset:** push gjort af Jimmy 03-11 kl. 08:54 (filteret afviste mit forsøg 02-11 kl. 23:33). Live-tjek 03-11: `js/version.js` siger `v6 · 02-11-2026`, `js/groent.js` giver 200. Lokale commits efter det er kun tekst i STATUS.
- **v6 indeholder:**
  - En kontakt i voksendelen, «Mere grønt i maden». Den giver halvt kød og halvt røde linser i 8 retter med hakket kød: kødsovs, cremet kødsovs, one pot bolognese, chili con carne, hyrdetærte, pastagratin, kødkål med makaroni og jægergryde.
  - Den slår igennem på retten, forsidekortet, ugeplanen, indkøbslisten, print og linket til telefonen. En kørende timer holder sin udgave.
  - Teknik: `tumbi.mere_groent` og `js/groent.js`, feltet `mereGroent` i `kog-familie-v1` uden versionsløft, plankode v2, ruterne `#/ret/<id>/groen` og `print.html?ret=<id>&groen=1`.
  - Røst-lyd til de 49 nye replikker.
- **Review:**
  - Workflow `wf_14045647-16a` med Fable som dommer: 11 fund dømt, 7 rettet, opskrifter-2 rettet bagefter (linsetrinnet i one pot bolognese har nu 5 min timer), data-2 er udgivelsesnoten nedenfor.
  - ui-reviewer: 4 rettet (print «Tilbage» bliver i udgaven, forsidens tid følger udgaven, ugeplanen siger «mere grønt», kontakten hopper ikke).
  - code-reviewer på rettelserne (477324b..0a7663a): 0 høje, 0 middel, 2 lave.
- **Test @ce649bd:** 16 node-testfiler grønne. Hele e2e i WebKit: 90.189 tjek og 0 fejl (3813 s). Ikke afprøvet på rigtig iPad/iPhone, og ingen af retterne er lavet i et køkken (`afproevet: false`).
- **Udgivelsesnote:** en åben side fra v5 kan slå «Mere grønt i maden» fra igen. Genindlæs alle åbne faner efter opdateringen.
- **Ikke rettet (lave fund):**
  - Print af kødsovs og hyrdetærte går fra 1 til 2 A4-ark med mere grønt (6 af de 8 fylder allerede 2).
  - Kødsovs har 14 kort: på 1180×820 ligger 4. række bag foden, til man ruller (virker; 6 basisopskrifter har allerede 13-17 ingredienser).
  - «Mere grønt i / maden» brydes på nogle bredder. `print.html?uge` på 390 px skærm bryder «mere / grønt» (A4 er fint).
  - Den låste kontakt ser mere aktiv ud, end den er.
  - «Røde linser 270 g» står uden pakke, og ikonerne for havregryn, ris og linser ligner hinanden. Linsetrinnet har det generelle «hælde»-billede.
  - «madlavningsflø/de» på jægergryde (nok ikke nyt).
  - Ingen e2e for forsidekortet med en timer på basisopskriften.
  - Ordvalg: «mere grønt» står ved et uændret grammetal, fordi linser ikke tæller som grønt (alternativ: «halvt linser»).
  - 9 nye `timer-optaget`-linjer er stadig på listen «bør lyttes til» med lang hale: koedsovs 9, bolognese-one-pot 10 og 12, cremet-koedsovs 11, chili-con-carne 14, hyrdetaerte 11, pastagratin 10 og 14, koedkaal-med-makaroni 14.
  - Usikkert: statusteksten har plads til to linjer, men `ui-rounded` på en rigtig iPad kan ikke måles her (plads til 14,6-22,3 % bredere skrift).
- **Næste (v7):**
  - Codex-kvoten åbner **04-11 kl. 11:13**. Kør så `jul-billeder/koer-codex.sh`: 26 retbilleder og 4 pladsholdere.
  - Flyt de 26 retter ind efter README'en i `docs/venter-paa-billede/`, og omdøb «Jul» til «Jul og nytår» (kræver Røst).
  - Derefter Røst til de nye replikker, og v7 efter Jimmys ja.
- **Afventer Jimmy:**
  - Fra 02-11: bekræft at «ja, til den» + «gør alt færdig» dækkede udgivelsen · er «mere grønt» det rigtige ord, eller «halvt linser»?
  - Fra 01-11, stadig åbne: Rosa og Bo skjult på højkant · temaer og forsidevalg kræver lager v2 · scenarie A · varemærkesøgning på «Tumbi» · licens og offentligt/privat repo.
- **Testliste til Jimmy (rigtig iPad/iPhone):**
  1. v6 i foden.
  2. Kontakten i voksendelen hopper ikke, og statusteksten er højst to linjer.
  3. Kødsovs med kontakten slået til: 250 g kød + linser, Røst læser de nye linjer.
  4. Forsiden: hyrdetærte viser «1 t».
  5. Ugeplanen siger «mere grønt», og indkøbslisten har røde linser.
  6. Link til telefon holder udgaven, og print med «Tilbage» bliver i udgaven.
  7. Lyt til de 9 `timer-optaget`-linjer.
  8. Lav én af retterne i et rigtigt køkken.

## 02-11-2026 kl. 11:38: v5 · 02-11-2026 er live på Pages efter Jimmys «Ja, udgiv v5» (Saga)

Jimmy 02-11 (talebesked): mere julemad, nytår (kransekage, isdesserter), et katalog med søgning i voksendelen, og «computerstemmen» på forsiden. Han svarede «Ja, du kører bare det hele ind, fuld fart».
- **v5 indeholder:**
  - **Røst-stemmen** til alle 3604 replikker. Alle 125 retter har nu `valgt.mp3` på forsiden (før kun 51).
  - **Kataloget med søgning** i voksendelen: søgefelt, filtre (foldes sammen på telefonen), udvalg og favoritter med samme søgning (`js/soeg.js`, `test-soeg.js`).
  - **15 nye retter i `docs/venter-paa-billede/`** (endnu ikke synlige i appen): 10 til julemiddag og nytår, fx brun sovs, waldorfsalat, tarteletter, kransekagetårn og nytårstorsk, og 5 isdesserter. Dertil 6 nye ikoner (is, banan, småkager, selleri, asparges, sennep).
- **Udgivet:**
  - Vejen: lyd-0211 + nytaar-0211 + katalog-0211 → `v5-0211` → rettelserne på `v5-ret`. Main er spolet frem til 8db814e og pushet.
  - Live-tjek kl. 11:38: `js/version.js` siger v5, og `js/soeg.js` og juleretternes `valgt.mp3` svarer 200.
- **Jimmy 02-11 ved middagstid:** han vil have en knap «sundt» i voksendelen, der giver halvt kød og halvt røde linser i retter med hakket kød. Den får sit eget afsnit, når den er bygget. Havregrynskugler findes allerede, så der laves ingen juleudgave.
- **Review:**
  - Workflow `wopgognjj`: 46 opskrift-fund, de 3 høje handlede alle om forsidelyden, som Røst-kørslen har løst. Katalog: 17 fund, 9 bekræftet af dommeren og rettet (10 commits).
  - Code-reviewer bagefter: app.css' `.filtre` (flex) ramte voksendelens filtre. De hedder nu `voksen-filtre`, og test-css afviser genbrugte app.css-klasser (59be3e4). «Fjern filtrene» giver fokus til filterlinjen på telefonen (fcc4509).
  - Fanget af hovedsessionen: test-validator brugte «banan» som ukendt ikon (observation 0132).
  - ui-reviewer i WebKit (390, 360, 1024×1366, 1280×800): filterlinjen fylder hele bredden, fokus efter «Fjern filtrene» er rigtig og synlig med tastatur, ingen konsolfejl. 0 høje og 0 middel fund.
- **Test:**
  - `v5-0211` @62d028a: 15 node-testfiler grønne, og hele e2e i WebKit gav 90.036 tjek og 0 fejl.
  - `v5-ret` @371465c: 15 node-testfiler grønne. e2e skærmformer + forsidens top + voksen gav 5.510 tjek og 0 fejl.
  - Det spring over lukkede `<details>` i e2e, som workflowet lagde ind (c1431b4), er rullet tilbage (86692fa). Testen er grøn uden det, så de falske layoutfejl kom fra `.filtre`-kollisionen.
- **Ikke rettet (lave fund):** åben/lukket gemmes ved første klik (ikke en regression) · KOMPAKT-medieforespørgslen står to steder i e2e · e2e har ingen høj skærm, der ikke er kompakt · tarteletternes antal i Remas pakke er ikke bekræftet · lange navne tjekkes i e2e, når de 15 retter kommer ind · på telefonen brydes en lang filtertekst («Aftensmad, Hurtig, …») ud under pilen i stedet for at være rykket ind (familie.css:115/120) · på 360 px deles «Gulerodssup/pe» uden bindestreg i udvalget (familie.css:92, fandtes før v5; tjekkes på rigtig iPhone) · tallene på chipsene følger ikke søgningen («Halloween (6)» ved 0 træf).
- **Næste og Afventer Jimmy:** ført op i afsnittet for v6.
- **Testliste til Jimmy (rigtig iPad/iPhone):** v5 i foden · forsiden lyder med den pæne stemme (også juleretterne) · voksendelen: søg «kartofler», fold filtrene ud og ind på iPhone, «Fjern filtrene» · udvalget og favoritterne med søgning.

## 02-11-2026 kl. 03:36: v4 · 01-11-2026 med 24 juleretter er pushet til Pages efter Jimmys «ja, udgiv den» (Saga)

- **Udgivet:** `jul-0111` flettet i main (ed21a10) og pushet. 125 retter, gruppen «Jul» først. Review-workflow `wf_63c46d17-2a7`: 31 fund, 7 bekræftet af dommeren og rettet (bl.a. håndvask efter rå dej i 8 julebagværker, chorizo-pakken 80 g, julekagens lune mælk, æblekagens vente-trin, Rosa og Bo skjules på iPhone på højkant og iPad på højkant, fordi den 5. afsnitsknap tager pladsen). Fuld e2e: 89.574 tjek, 2 fejl rettet (marcipankonfekt på 667×375). Efter-review (code-reviewer + ui-reviewer i WebKit): vrøvl-vasken flyttet, knapperne på 360 px inden for kanten, test-css kan ikke længere blive grøn uden at måle, forsideTop måler 901/1100/1112 px. e2e former + forside: 4.562 tjek, 0 fejl. 13 node-tests grønne på main.
- **Røst:** talelisten er skiftet til v4's 3604 replikker (to gange i nat, sidst efter vrøvl-rettelsen 6ca0ed5; backup af den forrige i kladdemappen `roest-0111/taleliste-0111-2130.json`). Kun **337 mangler** (de ca. 2180 var appens mp3, ikke Røsts wav) ≈ 2 t. Derefter trinene i CLAUDE.md «Stemmen» (efterbehandl, seed 43/44, mp3, ASR, `indsaet-lyd.js --ryd`, gendan uændrede mp3) og udgivelse v5 med lyden. Til da læser iPad'ens stemme juleretterne op.
- **11 julebordsretter** i `docs/venter-paa-billede/`: Codex-kvoten er brugt op til **04-11 kl. 11:13**. Kør derefter `jul-billeder/koer-codex.sh` (15 billeder: 11 nye + 4 pladsholdere, der ikke passer: jødekager, julekage, kransekagestykker, chokoladetaler) og flyt retterne tilbage efter README'en i mappen.
- **Ikke rettet (lave fund):** sneglekager har en ekstra håndvask (trin 7, harmløs) · næste række kort kigger næsten ikke frem på 430×932 og 744×1133 (tjekkes på rigtig enhed) · 812×375 har kun 5 px luft over bunden på retten · 320 px (Slide Over) er ikke understøttet · discount-tilgængeligheden er ikke bekræftet i butikkerne.
- **Afventer Jimmy (01-11, stadig åbne):** Rosa og Bo er nu skjult på iPhone og iPad på højkant — i orden? (UI-reviewet anbefaler at lade det være) · temaer og forsidevalg kræver lager v2 (migrering af `kog-familie-v1`) · salg: scenarie A (gratis + portfolio) anbefales · varemærkesøgning på «Tumbi» · licens og offentligt/privat repo.
- **Testliste til Jimmy (rigtig iPad/iPhone):** v4 i foden/voksenhjørnet · Jul-afsnittet og -knappen · en julesmåkage hele vejen igennem · forsiden på iPhone på højkant og langs · indkøbslisten for chorizo-pasta (3 pakker à 80 g).

## 01-11-2026 kl. 21:28: 24 juleretter bygget på grenen jul-0111, review og e2e kører (Saga)

- **Gren `jul-0111`** (worktree `D:/Claude/.claude/worktrees/kogebog-jul-0111`, ikke flettet, ikke pushet): gruppen «Jul» først, 24 juleretter med billeder, 4 nye verber (stikke-ud, forme, pille, smelte = voksen varme), 10 ikoner, discount-bytninger i 11 gamle retter (parmesan → revet hård ost m.m.), reglen «køb i Rema/Netto/365/Lidl» i CLAUDE.md. Alle node-tests grønne undtagen test-lyd (mangler Røst).
- **11 julebordsretter venter på billeder** i `docs/venter-paa-billede/` (Codex-kvoten løb tør, åbner 02-11 kl. 01:52). 4 retbilleder er pladsholdere, der ikke passer: jødekager, julekage, kransekagestykker, chokoladetaler. Kør `jul-billeder/koer-codex.sh` i kladdemappen igen.
- **Røst:** talelisten er skiftet til grenens 3603 replikker kl. 21:30 (backup `D:/Stemmer/kogebog-500m/taleliste-foer-jul-0111.json`), så løkken laver juleretternes lyd med. ca. 2180 mangler ≈ 12 t.
- **Salgsrapporten** er efterprøvet af en Fable-dommer (0 påstande væltet, 3 rettet) og ligger som Google Doc i Drev `Claude/Kogebog`: https://docs.google.com/document/d/1-iDvMfDBgsl7eiGYxV1hKQHXXjMpRUFMzOHAG2LLUxA/edit
- **Review-workflow** `wf_63c46d17-2a7` kører: kendte rettelser (jul-farve, gamle mp3 til ændrede tekster fjernes fra liste.json, v4, risalamande fra kold grød), kode-, opskrift- og UI-review med dommer, rettelser og fuld e2e.
- **Afventer Jimmy (01-11):** temaer og forsidevalg kræver lager v2 (migrering af `kog-familie-v1`) · salg: scenarie A (gratis + portfolio) anbefales · varemærkesøgning på «Tumbi» · licens og offentligt/privat repo.

## 01-11-2026 kl. 19:55: jul, discount og salgsrapport er i gang (Saga)

Jimmy 01-11 aften (talebesked): mange danske juleopskrifter (småkager, julekager, konfekt og nemt slik, julebordsmad: medister, æbleflæsk, leverpostej, rullepølse og en skinke à la Jamie Oliver), britiske tærter og fish and chips i airfryer. **Alt skal kunne købes i Rema 1000, Netto, 365discount og Lidl**, ingen specialvarer. Temaer i forældredelen («Jul»), så børnene kun ser det valgte, og et forslag til en voksen- og en børneudgave. Desuden en fuld rapport om salg og professionalisering. «Det skal bare spille til næste weekend.» Han svarede **«Ja ♥️»** kl. 19:5x på Sagas forståelse i 3 linjer, så appen må ændres.
- **Research-workflow** `wf_0ef8676a-44e` (8 emner + 2 synteser). Rapporterne skrives i scratchpad `jul-0111/<emne>/rapport.md`, og planen og salgsrapporten i `jul-0111/samlet/`.
- **Næste skridt:** byg bølge 1 (jul) efter `samlet/plan.md`, og læg salgsrapporten på Drev. Undervejs udgives v4 med Røst-lyden, når løkken siger «ALT LAVET» (01-11 kl. 19:5x manglede 539 af 2927 replikker).
- **Ny regel fra Jimmy:** en pushbesked, når han skal gøre noget, eller når noget stort er færdigt.

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

