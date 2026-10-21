# STATUS – Tumbi Køkken

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
