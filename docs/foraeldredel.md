# Forældredel til Tumbi Køkken — design

> 31-10-2026 · skrevet af en læse-agent i `kogebog-r2-3110` (gren `claude/nye-opskrifter-r2-31-10`, 87 retter, heraf 69 ugeplan-retter).
> **Ureviewet.** Intet er bygget eller afprøvet. Tal i tabellerne er målt med et engangsscript på opskrifternes JSON (`scratchpad/foraeldredel/maal.mjs`). Linjenumre er fra r2-worktree'en.
>
> **Bygges 31-10-2026** på grenen `claude/foraeldredel-31-10` (fra runde 3, 101 retter) med de anbefalede standardvalg i afsnit 9: «4 personer» = 4 voksenportioner, barn = 0,7, hold 2 s, udvalg 8 (maks. 24), «Fyld op» tilføjer 4, «Masser af grønt» 250 g og billig 12 kr, ingen filter på forsiden. Hvert valg er én konstant, så det er let at ændre. Den nye nøgle `kog-familie-v1` flettes først efter Jimmys ja.

## 0. Anbefaling i én sætning

**Én app, ingen konti:** en voksendel på `#/voksen` bag den eksisterende 2-sekunders holdeknap. Den samler fire ting: husstand (voksne + børn → portioner), ugens udvalg til børnene (med «prøv nye»), favoritter og de voksenknapper, der allerede findes (ugeplan, indkøb, print). Alt gemmes i én ny nøgle `kog-familie-v1` i `js/lager.js`. Telefonen får det samme som i dag gennem v1-linket, fordi portionerne allerede rejser med som `n`.

---

## 1. Hvad findes, og hvad mangler

| Ønske (Jimmy 31-10) | Findes i dag | Mangler |
|---|---|---|
| Forældre vælger et mindre udvalg, plads til nye | Intet udvalg. Børnenes valg viser **alle** ugeplan-retter: `iPlanen = () => K.S.ids.map(model).filter(m => m && m.uge)` (ugeplan.js:416), 4 pr. side (`PR_SIDE`, sider = `ceil(alle.length/4)`, ugeplan.js:897-901). Med 69 retter er det **18 sider** (13 ved ui-reviewet) | Udvalg, «prøv nye», og et mærke for «ny for os» |
| Grupper og filtre (sund, hurtig) | ⚡ ≤ 20 min (`LYN_MIN`, model.js:176). Voksenfiltre i «dagens valg»: ≤ 40 min / billigst / mindst kniv, kun i hukommelsen (ugeplan.js:693-713). Forsidens grupper er aftensmad/bagning/søde sager/halloween | Vegetar, fisk, «masser af grønt», ny, favorit. «Sund» kan ikke udledes (afsnit 5) |
| Antal voksne + børn → mængder | Kun ét heltal `n` (1-12): `p.n` som standard og `d.n` pr. dag i `kog-uge-v1` (lager.js `tomUge`). Stepper pr. dag (ugeplan.js:494). Indkøbslisten skalerer `antal*faktor*n/portioner` (indkoeb.js:39), og ugeprint gør det samme gennem `saml` | Fordeling i voksne og børn. Opskriftsskærmen viser `m.portioner` uskaleret (app.js:296), og det gør enkelt-print også (print.js:26) |
| Favoritter | Ingen (grep i hele repoet) | Det hele |
| Voksendel med «login» | Spredte holdeknapper: «Ugeplan» (app.js:239-244), print (app.js:319), «Ny uge» og «Til ugeplanen» (ugeplan.js:640, 826). Intet voksenhjørne | Et samlet sted og en vagt for dybe links |
| Indkøb på telefonen | **Findes:** link `#/hent/v1.…` → gemt liste `#/indkoeb` med købt / «Har vi» / del som tekst / print (ugeplan.js:158-262, `sendLink` 550) | Ikke noget i MVP. Udvalg fra telefon til iPad kommer senere (afsnit 6) |

## 2. Separat voksen-app eller samme app? «Login» uden backend

**Anbefaling: samme app og samme adresse, med en voksentilstand.**

- **Ingen separat app.** En web-app på hjemmeskærmen har sit eget lager, adskilt fra Safari (docs/ugeplan-plan.md, afsnit 2). En separat «voksen-app» ville derfor ikke kunne se børnenes data. Lystårnet har samme mønster: voksendelen ligger i appen, i en åben og en låst del.
- **«Login» = holdeknap**, en børnelås og ikke sikkerhed. `holdKnap` findes (js/hold.js, standard `ms=2000`). Forsidens «Ugeplan: hold» bliver til «Voksne: hold» → `#/voksen`.
  - Vagt: åbnes `#/voksen…` direkte (bogmærke på telefonen), vises først en holdeknap. Den kommer først, når opskrifterne er hentet («Henter opskrifterne …» imens), så den ikke tegnes om midt i et hold.
  - Låsen holdes kun i hukommelsen (en modulvariabel). Den lukker, når man forlader `#/voksen…`, efter 10 minutter uden tryk, og med knappen «Luk».
  - Ingen sessionStorage i MVP, så regel 5 ikke rammes.
- **Adgangskode/PIN fravalgt:** en PIN i en offentlig statisk app kan læses i koden og glemmes af forældrene. Holdet er nok mod 5-9-årige.
- **Konti og synk mellem enheder (kun fremtid).** Det kræver:
  - en backend med database og login (adgangskode eller e-mail-link). Nøgler må ikke ligge i den offentlige frontend;
  - **kun voksne har konti.** Data skal holdes på antal, favoritter og udvalg — aldrig børns navne, alder eller fødselsdag (regel 6);
  - GDPR: privatlivspolitik, databehandleraftale med hostingfirmaet, sletning og eksport;
  - drift og pris: hosting, domæne og vedligehold. **Prisen er ikke undersøgt;**
  - App Store: regler for børnekategorien («parental gate») skal undersøges, hvis appen skal den vej.

  Billigt mellemtrin uden backend: et kode-link til udvalg og favoritter (afsnit 6).

## 3. Datamodel og migrering (regel 5)

**Ny nøgle `kog-familie-v1`** i `js/lager.js`. Den læses med den eksisterende `laesMedVagt` (lager.js:74-85) og en tom `MIGRER_FAMILIE = {}`, i samme mønster som `hentUge`/`gemUge` (lager.js:128-146). Ingen anden fil rører localStorage.

```js
// kog-familie-v1 (foreslået)
{
  v: 1,
  voksne: null,      // null = ikke sat → appen opfører sig som i dag; ellers heltal 0-8
  boern: null,       // null | 0-8 — kun ANTAL, aldrig navn/alder (regel 6)
  barnAndel: 0.7,    // 0.4-1.0 i trin af 0.1
  udvalg: null,      // null = alle (som i dag) | { ids: [≤24 kendte id'er], rettet: 'YYYY-MM-DD' }
  favoritter: [],    // ≤200 kendte id'er, ingen dubletter
  lavet: {}          // { id: { gange: 1-999, sidst: 'YYYY-MM-DD' } }, ≤300 — bruges til «ny for os»
}
```

- **Rens** (`rensFamilie`, som `rensUge`):
  - ukendte id'er (ikke i `S.ids`) fjernes;
  - tal klemmes ind i grænserne;
  - forkerte typer giver standardværdien;
  - en højere `v` læses som tom og låses (`laast`), som de to andre nøgler gør. Voksendelens oversigt står stadig med vejen til ugeplanen og indkøbslisten, men husstand, udvalg og favoritter kan ikke åbnes, og færdig-skærmen siger, at hjertet ikke kunne gemmes, fordi en nyere udgave har gemt voksendelen.
- **Migrering:**
  - Den nye nøgle er rent additiv, så intet eksisterende ændres. `kog-v1` (`rens()` må ikke kopieres), `kog-uge-v1` og `kog-liste-v1` er uændrede.
  - En gammel udgave ignorerer nøglen.
  - En ny udgave uden nøglen bruger standardværdierne, hvor `voksne: null` betyder adfærd som i dag.
  - **Ingen tavs ændring:** når husstanden gemmes, skrives `p.n = portionerFraHusstand(...)` i `kog-uge-v1` gennem `gemUge`. Dage, der allerede er planlagt, beholder deres `d.n`, medmindre man trykker «Brug på hele ugen». Så virker link, `saml` og print uændret.
- **Hvor tingene registreres:**
  - `lavet` opdateres på færdig-skærmen (app.js:539);
  - favoritter sættes i voksendelen og med et hjerte på færdig-skærmen;
  - udvalget sættes i voksendelen og bevares ved «Ny uge».
- **Beslutning til Jimmy:** den nye nøgle er en ændring i datastrukturen (din regel «spørg før»).

## 4. Skalering af mængder

**Regel:** `n = clamp(ceil(voksne + barnAndel × børn), 1, 12)` og `faktor = n / tumbi.portioner`.

- **Dagens n før husstandens:** står retten i ugeplanen, bruger retten (og printet fra den) dagens `d.n` fra `kog-uge-v1`: dagen med dagens dato, hvis retten står dér, ellers den første dag med retten. Så passer retten til indkøbslisten. Husstanden er kun reserven for retter, der ikke står i planen.

- Man runder op til hele portioner, så indkøbsliste, link (`n` er et heltal 1-12, plankode.js) og opskriftsskærm altid viser det samme. Rester er bedre end for lidt.
- **Loftet siges:** skærer loftet husstanden ned (fx 8 + 8 = 13,6), står der «12 portioner (højst 12 — lav retten to gange til flere)» i husstandens sum og på oversigten (`husstandSum` i js/voksen-del.js).
- **Barn = 0,7 voksen som standard.** Nordiske Næringsstofanbefalinger 2023 (NNR2023, Tabel 7 og 11) angiver energibehovet:

  | Hvem | Energibehov | I forhold til en voksen |
  |---|---|---|
  | Børn 5-9 år, gennemsnitlig aktivitet | 5,8-7,8 MJ/d | ca. 0,59-0,74 |
  | Voksne 25-50 år (PAL 1,6) | 11,3 MJ/d (mænd), 9,0 MJ/d (kvinder) | 1 |

  NNR skriver selv, at tallene skal bruges med forsigtighed. Valgene i appen er 0,5 / 0,7 / 1 voksen.
- **Eksempel:** 2 voksne + 2 børn = 3,4 → n = 4 → faktor 1 for alle 69 retter. Den typiske familie får altså **præcis det samme som i dag**, også med Røst-oplæsningen.
- **Kræver Jimmys beslutning:** betyder opskrifternes «4 personer» 4 **voksenportioner**? Det er min anbefaling, men indholdet blev skrevet til en familie med børn (docs/research: «Mængderne er til 4 portioner», et skøn).

**Afrunding** i ny ren funktion `skalerMaengde(maengde, faktor, {vare})` (foreslået navn). `maengde`-strengene er regelmæssige (målt): «# g» 259, «#» 116, «# tsk» 98, «# spsk» 94, «# dåse(r)» 57, «# dl» 54, «# knivspids» 32, «# l» 23, «# rulle(r)» 7, «# kg» 6, «# fed» 5, 13 tomme og enkelte «ca. …», «pose», «skiver», «glas» og «stort».

| Enhed | Afrunding |
|---|---|
| g | < 50 g → nærmeste 5 g, ellers 10 g. Over 1000 g → kg med 1 decimal |
| kg | 0,1 kg |
| dl / l | ½ dl. Under 1 l vises i dl |
| tsk / spsk | ½, mindst ½ |
| knivspids | Uændret |
| fed | Hele, mindst 1 |
| stk (tal uden enhed) | ½ op til 3, ellers hele. Æg (`vare: 'aeg'`) altid hele, rundet op |
| dåse / pose / glas / pakke | ½ |
| rulle / plade (dej) | Hele, rundet op + `advarsel: 'form'` |
| tom, «stort», ukendt format | **Uændret** + `advarsel: 'ukendt'`. Aldrig gæt |

**Hvor det slår igennem:**

| Sted | I dag | Ændring |
|---|---|---|
| Indkøbsliste | Skalerer allerede (indkoeb.js:39) | Ingen |
| Ugeplan + ugeprint | Skalerer allerede gennem `d.n` og `saml` | Kun standard-`p.n` fra husstanden |
| Opskriftsskærm | `m.portioner` + uskalerede mængder (app.js:296-351) | «Til N» + skalerede mængder, når en ugeplan-ret har faktor ≠ 1 |
| Enkelt-print | Uskaleret (print.js:26) | `print.html?ret=<id>&n=<1-12>`, strengt tjekket |

**Kan ikke skaleres (vises uændret, med en voksenlinje når faktor ≠ 1):**
- ovntemperatur, bagetider og timere;
- fadets eller grydens størrelse: ved faktor > 1,5 vises «Brug to fade — tiden kan blive længere», og ved faktor < 0,5 «Hold øje med tiden»;
- de 18 bage- og søde retter uden `tumbi.portioner` (udbytte som «16 boller»): ingen skalering;
- **25 trintekster med mængder** (fx «Mål 300 g pasta.»). De læses op og har et loft på 9 ord, så de forbliver «til 4». I MVP kommer én voksenlinje: «Mængderne i trinene er til 4 — se ingredienslisten». Senere kan trinene få en struktureret mængde-henvisning.
- **Røst-oplæsning af ingredienser:**
  - Faktor 1 → Røst-mp3 som i dag (`R.ingrediens`).
  - Faktor ≠ 1 → der findes ingen lydfil, så iPad-stemmen læser den skalerede linje. Det sker gennem en ny replik-funktion i `js/replikker.js` uden fil; `tale.js` falder tilbage til `speechSynthesis` (tale.js:162).
  - **Ikke afprøvet:** om `test/test-lyd.js` godtager en replik uden fil uden for `alleReplikker()`. Hvis ikke, skal testen tillade en udtrykkeligt markeret dynamisk replik (del F).

## 5. Grupper og mærker

Målt på de 69 ugeplan-retter:

| Mærke | Regel | Data | Antal i dag |
|---|---|---|---|
| ⚡ Hurtig | `minutter ≤ LYN_MIN` (20) | Findes (model.js:176) | Findes allerede |
| 🥕 Masser af grønt | `groent_g / portioner ≥ 250 g` | Findes | 18 (≥ 200 g: 34, ≥ 300 g: 9). Median 196 g, maks. 400 g |
| 💰 Billig | `pris_kr / portioner ≤ 12 kr` | Findes | 13 (≤ 15 kr: 32). Median 15,5 kr |
| 🔪 Ingen kniv | 0 trin med `skaere`/`rive` | Findes | 30 |
| 🌱 Vegetar | Ingen vare med `slags: 'koed'\|'fisk'` | **Kræver felt** `slags` på ca. 19 VARER i js/katalog.js | **Foreløbigt 26** (skøn, se nedenfor) |
| 🐟 Fisk | Mindst én vare med `slags: 'fisk'` | Kræver samme felt | Ikke talt |
| ✨ Ny for os | `lavet[id]` mangler, og familien har lavet mindst én ret | Brugerdata | — |
| ❤️ Favorit | id i `favoritter` | Brugerdata | — |
| «Sund» | **Kan ikke udledes.** Brug «masser af grønt» i stedet | — | — |

- **Vegetar kan ikke udledes af ikonerne.** En ikon-regel (`koed`/`tun`/`skinke`/`poelse`/`gyoza`) missede chorizo (ikon `chorizo`) og makrel (ikon `makrel`). Derfor skal hver kød- og fiskevare have `slags`, og validatoren skal fejle, hvis en vare med et kød- eller fiskeikon mangler feltet.
  - `bouillonterninger` er grøntsagsbouillon og må ikke markeres.
  - De 26 skal efterprøves ret for ret, fx `pladepizza` og `taco-bradepande`.
- **✨ først, når familien er begyndt at registrere:** før den første ret er lavet (`lavet` er tom), er ingen ret «ny for os», for ellers ville alle retter være nye. «Fyld op med nye» vælger stadig retter uden `lavet`, og udvalgets ✨-chip viser 0, til den første ret er lavet.
- Børnene ser kun ikoner (⭐ favorit, ✨ ny) med `aria-label` til voksne. Der kommer ingen ny tale i MVP.
- Filterchips (⚡ 🥕 💰 🔪 🌱 🐟 ✨ ❤️) findes kun i voksendelens udvalgsliste. Om forsiden også skal filtrere, er Jimmys valg.

## 6. Indkøb på telefonen og koden i linket

- **I dag (virker uden backend):**
  - v1-linket `#/hent/v1.<mandag>.<7 × id_n>.<fnv1a>` (plankode.js) bærer hver dags ret og `n`;
  - telefonen viser derfor **samme portioner og mængder** som iPad'en, uden at kende husstanden;
  - `afkod` er streng, og et nyere format giver «Lavet med en nyere udgave».
- **Anbefaling: v1 bevares uændret.** Husstand og udvalg skal ikke i indkøbslinket. Ellers bryder gamle telefoner, og det giver intet ekstra, fordi `n` allerede er regnet ud.
- **Udvalg og favoritter fra telefon til iPad (efter MVP):**
  - Id'erne er for lange: gennemsnit 21,2 tegn og maks. 40, så de 12 længste fylder 463 tegn, over `MAKS_LAENGDE` 400.
  - Kræver derfor et stabilt kort nummer pr. ret (`tumbi.nr`, nyt felt, aldrig genbrugt) og en ny rute `#/udvalg/u1.<numre i base36>.<kontrolsum>`. 24 retter fylder ca. 70 tegn.
  - Mønsteret er det samme som v1: streng afkodning og en kontrolside, før noget gemmes.
- **Grænse:** uden backend er der ingen automatisk synk. Hver enhed og hver Safari- eller hjemmeskærmskopi har sit eget lager.

## 7. Salg eller offentlig fremvisning — belæg og huller

| Emne | Belæg (læst) | Skal undersøges |
|---|---|---|
| **Røst-stemmen** (D:/Stemmer, model fra Alexandra Instituttet) | Licensen er baseret på AI PUBS OPEN RAIL og giver en royaltyfri licens. §5: licensgiveren gør intet krav på output, og brugeren står til ansvar for det. Bilag A 4(b) kræver samtykke ved syntese af en virkelig persons stemme; 4(c) kræver oplysning om, at det ikke er et menneske. Appen har allerede «computerstemme»-linjen. README: trænet på bl.a. CoRal-tts, og vandmærket skal bevares | Licensen for **CoRal-tts-datasættet** til referenceklippet `nic_18706.wav` (navnet tyder på, at klippet stammer derfra; licensen er ikke læst); om erhvervsmæssig brug er i orden; om vandmærket bevares i vores mp3'er |
| **Codex/OpenAI-billeder** | — (vilkårssiden gav 403) | Ejerskab og erhvervsbrug efter OpenAIs vilkår; at figurerne ikke ligner eksisterende figurer |
| **Opskrifter** | «Al tekst er vores egen, og vi låner kun ingredienslister, som er fakta» (docs/gennemgang.md). Kilden står i `tumbi.kilde` | **4 retter skal skrives om eller kontrolleres:** `bolognese-one-pot` og `cremet-koedsovs` («En slankeapp …, ganget med 4»), `frikadeller` (DR Mad, Brdr. Price) og `tunfrikadeller` (Arla). Om «Idé fra …» er nok efter dansk ophavsret. Ingen ret er prøvet i et rigtigt køkken (`afproevet: false`) |
| **Kode og repo** | Repoet er offentligt (github.com/jimmyfabe/Kogebog) og har ingen LICENSE-fil. En statisk app kan ikke håndhæve betaling, fordi al kode og alle filer kan hentes | GitHub Pages fra et privat repo og erhvervsbrug (dokumentationen gav ikke svaret). Valg af licens |
| **Navnet «Tumbi»** | Åbent spørgsmål om domænet tumbi.dk (docs/gennemgang.md) | Varemærke og domæne |
| **Persondata** | Ingen konti, ingen sporing, kun localStorage. Intet sendes nogen steder hen | En kort privatlivserklæring alligevel. App Store-regler, hvis den vej vælges |
| **Love** | — | EU's AI-forordning: oplysningspligt for syntetisk lyd. Regler for ernærings- og sundhedsanprisninger, hvis ordet «sund» bruges |

**Realistisk første skridt:** brug appen som udstillingsvindue (portfolio). Salg først, når rækkerne ovenfor er afklaret.

## 8. MVP — én runde, 6 agenter, ingen fil deles

Kontrakterne nedenfor er **forslag** (nye navne), og agenterne bygger mod dem. Alle arbejder i hver sin worktree-gren fra samme base.

| Agent | Del | Filer (ejer alene) | Bølge |
|---|---|---|---|
| **A** | Lager | `js/lager.js` (`tomFamilie`, `rensFamilie`, `hentFamilie(retter)`, `gemFamilie(aendring, retter)` med samme returkontrakt som `gemUge`), ny `test/test-familie.js` | 1 |
| **B** | Skalering (ren) | Ny `js/skaler.js` (`portionerFraHusstand`, `faktorFor(model, n)` → tal eller `null`, `skalerMaengde`), ny `test/test-skaler.js` | 1 |
| **C** | Mærker | Ny `js/maerker.js` (`maerkerFor(model, {familie})` + konstanterne `GROENT_G = 250`, `BILLIG_KR = 12`), `js/katalog.js` (`slags` på kød- og fiskevarer), validatoren som `test/test-validator.js` tester, ny `test/test-maerker.js` | 1 |
| **D** | Voksendel | Ny `js/voksen-del.js` (`init(K)` og `rute(hash)` i samme mønster som `Ugeplan.init`, app.js:622; skærmene hub/husstand/udvalg/favoritter, vagt og 10-minutters-lås). Ny `familie.css` med **al ny CSS**, også klasserne til E og F (fx `.maerke-ny`, `.maerke-fav`, `.hjerte-knap`, `.skaleret`, `.voksen-linje`) | 2 |
| **E** | Børnenes valg | `js/ugeplan.js`: `iPlanen` filtreret af udvalget (`null` = alle); ⭐/✨ på kortene; vegetar og grønt i `FILTRE`. **Ingen** ændring i app.css og ingen nye replikker | 2 |
| **F** | Integration | `app.js` (forside «Voksne: hold», route til D, skalering på `retSkaerm`, `lavet` + hjerte på færdig-skærmen), `js/replikker.js` (dynamisk ingrediens-replik), `index.html` (`<link>` til familie.css), `js/print.js` (`&n=`), `sw.js` (FILER + INDHOLD), `js/version.js` (UDGAVE), `test/koer-alle.js`, `test/test-lyd.js` (kun hvis nødvendigt), ny `test/e2e-voksen.js` + tilmelding i `test/test-e2e.js` | 3 |

- **Rækkefølge:** bølge 1 (A, B og C parallelt) → flet → bølge 2 (D og E) → flet → bølge 3 (F). Kun F kører den fulde suite og e2e gennem `tung-koersel.sh`. Ingen push uden Jimmys ja (regel 7).
- **Uden for MVP:** udvalgslink fra telefon til iPad (`tumbi.nr`), struktureret skalering af trintekster, filter på forsiden, Røst-lyd til nye replikker og konti.
- **Kendte risici:**
  - `test-lyd` er allerede rød (523 af 1.946 replikker mangler lyd, plus 3 forældreløse filer). Kravet er, at tallet ikke stiger.
  - app.js og ugeplan.js har hver præcis én ejer.
  - app.css (71 KB) røres ikke.

### Testplan

**Node** (`node test/koer-alle.js`):
- **test-familie:**
  - standardværdier: med `voksne: null` sker intet med `p.n`;
  - grænser og forkerte typer;
  - ukendte id'er fjernes;
  - højere `v` → låst;
  - gem og hent giver det samme;
  - `kog-v1`, `kog-uge-v1` og `kog-liste-v1` er byte-uændrede efter `gemFamilie`.
- **test-skaler:**
  - alle 648 ingredienslinjer giver ved faktor 1 nøjagtig den oprindelige tekst;
  - alle formater ved faktor 0,5 / 1,5 / 3 giver enten en skaleret tekst eller den uændrede tekst med en advarsel — aldrig `NaN`, aldrig tom;
  - afrundingstabellen;
  - husstand: 2+2 ved 0,7 → 4; 1+0 → 1; 0+1 → 1; 8+8 → 12.
- **test-maerker:**
  - tærsklerne;
  - chorizo og makrel er markeret;
  - validatoren fejler på en kød- eller fiskevare uden `slags`.
- **Test, der skal fejle mod den gamle kode:** et udvalg på 8 retter giver 2 sider i børnenes valg (i dag 18).
- test-sw (FILER og INDHOLD), test-version, og test-lyd uden flere fejl end før.

**E2E i WebKit** (`E2E_SKAERME` 390×844, 1180×820 og 1280×800):
1. Hold på forsiden → hub. Et dybt link til `#/voksen` uden hold viser holdeskærmen.
2. Husstand 2+2 → «4 portioner». En ny dag i ugeplanen får n = 4, og planlagte dage er uændrede.
3. Udvalg på 8 → børnenes valg har 2 sider med kun de 8 retter. «Fyld op med nye» vælger kun retter uden `lavet`.
4. Opskrift ved n = 6: «300 g» → «450 g» og «Til 6». `print.html?ret=…&n=6` viser det samme.
5. «Send til telefon» → `#/hent/v1…` → indkøbslisten har de samme mængder (linket er uændret).
6. Hjerte på færdig-skærmen → retten står under favoritter og får ⭐ i børnenes valg.
7. Genindlæsning bevarer alt.
8. **Migrering:** med v3-data (kun `kog-uge-v1` og `kog-liste-v1`) lagt i localStorage indlæses alt uden tab.
9. Knapper: børn ≥ 64 px, voksne ≥ 48 px (målt med bounding box). Ingen vandret rulning ved 390 px.

**Jimmys testliste** (rigtig iPad og iPhone): Røst ved faktor 1, iPad-stemmen ved faktor ≠ 1, og holdeknappen med en barnehånd.

## 9. Valg, Jimmy selv skal træffe

1. Betyder opskrifternes «4 personer» 4 voksenportioner? (Anbefalet: ja.)
2. Hvor meget spiser et barn? Standard 0,7 voksen. Valgene 0,5 / 0,7 / 1, eller kun en fast værdi?
3. Lås: 2 s som resten af Kogebogen (anbefalet) eller 3 s som Lystårnet?
4. Den nye nøgle `kog-familie-v1` (en ændring i datastrukturen: «spørg før»).
5. Udvalgets standardstørrelse (anbefalet 8 = 2 sider, maks. 24), og om «Fyld op med nye» tilføjer 2 eller 4.
6. «Masser af grønt» frem for «sund»? Og tærsklerne 250 g grønt og 12 kr pr. portion?
7. Skal forsiden også filtrere efter udvalg og mærker, eller kun børnenes valg?
8. Salg eller udstillingsvindue? Før salg: CoRal-tts-licensen, OpenAIs billedvilkår, de 4 kilde-retter, licens for repoet, varemærket «Tumbi» og en prøvelavning af retterne.

## 10. Kilder og forbehold

- **Kode:** r2-worktree'en (læst, intet ændret). **Målinger:** `scratchpad/foraeldredel/maal.mjs`, kørt 31-10. Dækning: alle 69 ugeplan-retter. Vegetar-tallet er et skøn.
- **NNR2023:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10710868/ (Tabel 7 og 11). Kopien på pub.norden.org (nord2023-003) gav 403.
- **Røst:** LICENSE og README i hf-cachen under D:/Stemmer. Heimdal/docs/stemmer/roest-proeve.md om referenceklippet.
- **Ikke kontrolleret:** OpenAIs vilkår (403), GitHub Pages' planer og erhvervsbrug, priser på backend, dansk ophavsret til opskrifter, AI-forordningen og regler for anprisninger.
