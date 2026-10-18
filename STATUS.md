# STATUS – Tumbi Køkken

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
- Google Chirp 3 HD er udelukket for børneapps (Googles vilkår 20(d), Heimdal 18-10). Ifølge Heimdal-dokumentet bruger Lystårnet den samme stemme. Det er ikke set i Matematik-koden, og det er ikke rettet her.
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
