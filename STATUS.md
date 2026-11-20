# STATUS – Tumbi Køkken

> Ældre afsnit står i `STATUS-arkiv.md` i samme mappe (nyeste øverst).

## 19-11-2026 kl. 18:39: v12 er live (første automatiske udgivelse)

Jimmy 19-11: «gør det automatisk … du forsætter bare». Det står nu som regel 7 i `CLAUDE.md` (`9cc63c5`). v12 er udgivet efter den regel, uden at Jimmy så den først.
- **Betingelserne var opfyldt:**
  - code-reviewer: 9 fund rettet;
  - ui-reviewer i WebKit: 1 fund på mellem rettet med test;
  - node: 17 af 18 grønne (de 3 gamle mp3);
  - e2e på v12 (alle dele undtagen `timer`, gennem låsen) gav rc 0 og «Alle tjek er grønne»;
  - `test-sw` 13/13 og `test-version` 5/5 på spidsen.
- **Push:** `git push origin 9cc63c5:main` (`7e88273..9cc63c5`). Den lokale `main` er flyttet med.
- **Pages kl. 18:39:**
  - forsiden svarer 200;
  - `UDGAVE = 'v12 · 18-11-2026'`;
  - `INDHOLD = 'a1a2a17a2a0bf480'` som spidsen.
- Ikke afprøvet på en rigtig iPad.

**Afventer Jimmy** (ført op fra 18-11; punkt 1 og 2 dér er lukket)
1. (18-11) To grænsetilfælde i v12:
   - «Pil druerne af stilkene» beholder `pille`.
   - «Hæld mosen i en si over kanden» får rådet `si-daase`.
   
   Er de i orden?
2. (15-11) Må de 3 gamle gruppe-mp3 slettes? I **PowerShell**: `cd D:\Claude\Kogebog; git rm lyd/faelles/gruppe-aftensmad.mp3 lyd/faelles/gruppe-bagning.mp3 lyd/faelles/gruppe-koed.mp3`
3. (17-11) `drysse` i kander, kopper og glas: skal de have deres eget billede?
4. (15-11) Lam senere?
5. (14-11) Fase 2 (`kog-familie` v1 → v2, står i v10-afsnittet) er en migrering af gemte data. Den kræver stadig dit ja.

**Lave UI-fund, ladet ligge:**
- si-daase vipper vasken 6°;
- den blå stråle er lille;
- sien viser altid de samme kugler, og dåsen viser altid majs;
- si-daase og si ligner hinanden i printets 34 px.

## 19-11-2026 kl. 17:27: v11 er live

Jimmy skrev «Kan du ikke punch den». Claude pushede `7e88273` til `main` (`2785747..7e88273`), og den lokale `main` er flyttet med.
- https://jimmyfabe.github.io/Kogebog/ svarer 200.
- `js/version.js` viser `v11 · 17-11-2026`, og `sw.js` har `INDHOLD = '11fcf614af1912f3'` som spidsen.
- Ikke afprøvet på en rigtig iPad. (Rettet 20-11: det var en antagelse, ikke målt. iPhonen stod på v9 længe efter. Se v13 om genindlæsning og fejlede installationer.)

Punkt 1 under «Afventer Jimmy» nedenfor er dermed lukket. v12 (`v12-rester`) er ikke udgivet og venter på Jimmys ja (punkt 2).

## 18-11-2026 kl. 18:58: v11 klar til udgivelse (push afvist, kommandoen ligger hos Jimmy) · v12 på grenen `v12-rester`

Jimmy skrev 18-11 «Du puncher bare det hele og forsætter». Claude læste det som: udgiv v11, og fortsæt med resten.

**Udgivelsen af v11**
- Auto-mode-filteret afviste `git push`. Det blev ikke omgået.
- Live på Pages er stadig `v9 · 13-11-2026` (målt kl. 18:58). GitHubs `main` er `2785747`.
- Spidsen `7e88273` (v11) bygger direkte oven på `2785747`, og den lokale `main` (`7adced4`) ligger før den. Pushet er derfor en ren fremspoling.
- Kommandoen til **PowerShell**: `cd .\Kogebog; git push origin 7e88273:main; if ($?) { git branch -f main 7e88273 }`

**v12 på grenen `v12-rester`** (16 commits oven på v11, spids `7a16a74`, `UDGAVE = 'v12 · 18-11-2026'`). Ingen ændring af gemte data. Ikke flettet og ikke udgivet.
- Tre nye trin-billeder:
  - `si-daase`: en åben dåse over en si i vasken.
  - `skylle`: en si under vandhanen.
  - `plukke`: blade plukkes ned i en skål.
- 72 trin har fået det billede, der passer til teksten. Kun `verbum` er ændret, ikke `text`, så ingen lyd er lavet om.
- Det lukker U7 og V7 fra v11-reviewet.
- Validatoren vogter nu valget mellem `haelde`, `si-daase` og `skylle` og mellem `plukke`, `pille` og `smuldre`. Reglen og de kendte valg står i `CLAUDE.md`.
- Kyllingekarry og mild kartoffelkarry har fået den faste allergentekst (`4982e58`).
- code-reviewer: 9 fund, alle rettet med test i hver sin commit.
- ui-reviewer i WebKit (390×844, 1180×820 og 1440×900):
  - Billederne er skarpe og har samme streg som de gamle. Ingen vandret rulning, ingen fejl i konsollen, og «mindre bevægelse» holder dem stille.
  - **Rettet** (`7a16a74`): skylle-animationen gav en hvid stribe ved rammens venstre kant hver 1,6 s. Armen er skåret af ved billedets kant, og `gnid` flyttede den +4 px. Den nye `skyl` går fra -4 px til 0. Testen fejlede mod den gamle CSS, og rettelsen er målt i browserpanelet. Den lille UI-rettelse er lavet i hovedsessionen.
  - **Lav, ladet ligge:**
    - Si-daase vipper 6° som `haelde`, så vasken også vipper.
    - Den blå stråle er lille.
    - Sien viser altid de samme kugler (også ved blåbær), og dåsen viser altid majs.
    - Si-daase og si ligner hinanden i printets 34 px i gråtone. Teksten står ved siden af.

**Tests**

| Kørsel | Resultat |
|---|---|
| E2e `timer` på v11 (18-11) | 169 tjek, 0 fejl |
| Node, 18 filer på v12 (`7a16a74`, gennem låsen, kl. 19:14) | 17 grønne. `test-lyd` fejler kun på de 3 gamle gruppe-mp3 (Afventer, punkt 4). Validatoren har 72 tests, og `test-css` har 32 |
| E2e på v12 | Ikke kørt. Kun CSS, SVG og `verbum` er ændret. UI-reviewet så de tre trin i WebKit |

**Afventer Jimmy**
1. (18-11) Kør push-kommandoen ovenfor (v11). Bagefter kan Claude tjekke Pages.
2. (18-11) v12: se de tre nye billeder (testlisten nedenfor). Sig til, før den flettes og udgives. v12 kræver, at v11 er udgivet først.
3. (18-11) To grænsetilfælde i v12:
   - «Pil druerne af stilkene» (waldorfsalat) beholder `pille`.
   - «Hæld mosen i en si over kanden» får rådet `si-daase`.
   
   Er de i orden?
4. (15-11) Må de 3 gamle gruppe-mp3 slettes? Kommandoen står i v11-afsnittet, punkt 2. Det er dem, `test-lyd` fejler på.
5. (17-11) `drysse` i kander, kopper og glas: skal de have deres eget billede?
6. (15-11) Lam senere?
7. (14-11) Fase 2 (`kog-familie` v1 → v2) står i v10-afsnittet.

**Testliste til Jimmy (v12, på pc'en).** Først `cd D:\Claude\Kogebog; git switch v12-rester` i **PowerShell**. Serveren på 8091 kører allerede. Åbn så http://127.0.0.1:8091/.
1. Forsiden: der står «Version v12 · 18-11-2026» nederst.
2. Bedste venners pizza, trinet «Hæld majsen i en si.»: billedet er en dåse over en si, ikke en varm gryde.
3. Blåbær-skyr-smoothie, skylle-trinet: billedet er en si under vandhanen.
4. Mynte-lime-boble, trin 3: billedet er blade, der plukkes ned i en skål.

## 18-11-2026 kl. 16:26: v11 færdig på grenen `v10-foraeldre`, ikke flettet og ikke udgivet

Bygget efter Jimmys «kør den helt færdig» (16-11) og «fortsæt til 100 %» (17-11). Grenen ligger 112 commits over `main` før denne STATUS-commit (den sidste er `ad93067`). `UDGAVE = 'v11 · 17-11-2026'`. Ingen ændring af gemte data.

**Hvad v11 indeholder (oven på v10)**
- **Voksendelens forside er ugeplanen** (`#/voksen`): ugens 7 dage og boblerne Indkøbsliste · Retter · Mere. Et tryk på en dag åbner kataloget som «Vælg ret til …».
- **Gris og Ko** i stedet for Kød, så forsiden har 12 knapper.
- **14 nye retter** med billede (FLUX.2 klein) og Røst-stemme, alle `afproevet: false`:
  - Brød: lynpizza med yoghurtdej, pizzabrød med hvidløg og ost, naan på panden, hvidløgsnaan og ostenaan.
  - Ris og pasta: honningkylling med sesam og ris, japansk keema-karry, risboller med tun og majs, tomatris fra riskogeren, cremet kyllingepasta med broccoli, tortellini i cremet tomatsovs og pizzapasta i fad.
  - Karry: boller i karry og kylling i karry.
- **Tre runder review** (code-reviewer + ui-reviewer i WebKit) med 56 commits 17-11, rettelserne hver med test og egen commit:
  - Allergentekster i karryretterne: fast tekst plus «tjek pakken, fx …».
  - Lange ord deles med bløde bindestreger (`ORD_MAKS = 8`), og intet kort ord står alene på kortenes navne.
  - Skærmlæseren får hele navnet.
  - «Prøv igen» på indkøbslistens tomme skærme.
  - Seks retbilleder er tegnet om, så de kan genkendes: risboller, tortellini (to gange), tomatris (to gange) og pizzapasta.

**Tests**

| Kørsel | Resultat |
|---|---|
| Node, 18 filer (18-11) | 17 grønne. `test-lyd` fejler kun på de 3 gamle gruppe-mp3 uden for listen (se Afventer, punkt 2) |
| E2e alt undtagen `timer` (17-11 kl. 17:17–18:23, på `701542e`) | ca. 217.000 tjek, 1 fejl: `skærmformer` ventede 30 s på «Fortsæt» på 667×375. Det samme skete i den forrige fulde kørsel (17-11 kl. 12, på 960×800) |
| Årsagen (18-11) | En fejl i testen, ikke i appen. Løkken over alle retter lavede 504 adresseskift i samme dokument, og WebKit afviser over ca. 200 pr. 10 s. Målt med samme løkke: 15 afviste skift i 14 kørsler før rettelsen, 0 efter (`ad93067`: nyt dokument for hver 150 skift) |
| E2e `former` på de 7 formater med løkken (18-11, efter `ad93067`) | 10.120 tjek, 0 fejl |
| E2e `timer` | Ikke kørt på v11. Intet i timerne er ændret siden v10 |

**Ikke gjort / usikkert**
- Intet er afprøvet på en rigtig iPad eller iPhone. Det gælder især delingen af lange ord: `ORD_MAKS = 8` er kun målt med Trebuchet i WebKit på Windows.
- 6 mp3 bør lyttes til (talegenkendelsen hørte noget andet; `lyt=true` i `D:/Stemmer/kogebog-v11-retter2/kvalitet.json`):
  - boller i karry: ingrediens 3 og timer-optaget-20;
  - kylling i karry: ingrediens 10 og timer-optaget-9;
  - tomatris: ingrediens 2;
  - kyllingepasta: ingrediens 4.
  
  Pizzabrødets stemme er valgt alene efter talegenkendelsen.
- Ladet ligge fra reviewet:
  - **U7:** «Hæld majsen i en si» bruger si-billedet med den varme gryde.
  - **U9:** delingen af lange ingrediensnavne skal tjekkes på en rigtig iPad.
  - **V7:** der findes ingen tegning af blade, der plukkes (`smuldre` viser små stykker i en skål).
- Kyllingekarry og mild kartoffelkarry har stadig den gamle allergentekst («tjek karryen (den kan have …)»). Validatoren godtager den, men den følger ikke de 8 andre karryretters faste mønster.

**Afventer Jimmy**
1. (18-11) Se v11 på grenen (testlisten nedenfor), og sig til, før den flettes til `main` og udgives (regel 7).
2. (15-11) Må de 3 gamle gruppe-mp3 slettes? Kommandoen til **PowerShell** er `cd .\Kogebog; git rm lyd/faelles/gruppe-aftensmad.mp3 lyd/faelles/gruppe-bagning.mp3 lyd/faelles/gruppe-koed.mp3`.
3. (17-11) `drysse` i kander, kopper og glas: skal de have deres eget billede?
4. (15-11) Lam senere?
5. (14-11) Fase 2 (`kog-familie` v1 → v2) står stadig i v10-afsnittet nedenfor.

**Testliste til Jimmy (v11).** Grenen kan først ses på iPad og iPhone efter udgivelsen (eller via Tailscale, som kræver dit ja). Indtil da på pc'en, i **PowerShell**: `cd D:\Claude\Kogebog; py -m http.server 8091 --bind 127.0.0.1 --protocol HTTP/1.1 --directory D:\Claude\Kogebog`, og åbn http://127.0.0.1:8091/. (I dag kører der allerede en server på 8091. Står siden der, så spring kommandoen over.)

*iPad på langs (eller et bredt vindue):*
1. Forsiden: der står «Version v11 · 17-11-2026» nederst, og der er 12 knapper, også Gris og Ko.
2. Hold «Voksne» i 2 s. Ugeplanen er forsiden: 7 dage og boblerne Indkøbsliste, Retter og Mere.
3. Tryk på en tom dag. Der står «Vælg ret til …». Vælg «Tortellini i cremet tomatsovs». Dagen viser retten, og billedet er foldede pastaringe i orange sovs.
4. Tryk på Indkøbsliste-boblen. Listen har «Til ugeplanen» i stedet for huset, og den knap fører tilbage uden et nyt hold.
5. Søg «tomatris» og åbn retten. Billedet er ris med revet ost i strimler, ikke en osteterning.
6. Åbn «Kylling i karry med ris», trin 1. Noten «Til den voksne: Retten indeholder mælk og gluten …» sender den voksne videre til bouillonens og karryens pakke.

*iPhone (eller et smalt vindue):*
7. Forsiden: i lange retnavne står intet kort ord («med», «i») alene på en linje, og intet ord er delt uden en bindestreg.
8. Åbn en ret med et langt ingrediensnavn (fx en bouillonterning). Ordet deles med en bindestreg, der ser rigtig ud.
9. Lyt til de 6 mp3-filer under «Ikke gjort / usikkert», når appen siger dem.

## 16-11-2026 kl. 02:23: v11 halvvejs på grenen `v10-foraeldre` (Saga)

**Gjort (15-11, efter Jimmys «ja» til v11):** v10-reviewets R1–R6 og U1–U8 er rettet med test (`ace1807`…`0a1f2ae`). «Kød» er delt i **Gris** (8) og **Ko** (6) på forsiden, så der nu er 12 knapper (`762f368`). Der er ingen Lam, fordi appen har 0 retter med lam. 5 nye brødretter med billede og Røst: lynpizza med yoghurtdej, pizzabrød med hvidløg og ost, naan på panden, hvidløgsnaan og ostenaan (`6760fbb`…`b248f95`, `afproevet: false`). `UDGAVE = 'v11 · 15-11-2026'`. Planen ligger i Saga-sessionens scratchpad (`tumbi-v11/plan.md`).
**Tests 16-11 kl. 02:13:** 17 af 18 node-filer er grønne. `test-lyd` fejler kun på mp3-filer uden for listen (de gamle gruppelyde, nu også `gruppe-koed.mp3`). E2e er ikke kørt efter brødretterne.
**Mangler:** de 7 ris- og pastaretter fra planen (honningkylling, japansk keema-karry, onigiri, tomatris, kyllingepasta, tortellini, pizzapasta) med billede og stemme, review + rettelser, og fuld e2e. Workflowet stoppede to gange ved 5-timers-loftet, og to kørsler arbejdede samtidig (to commits med samme titel, 848245c/7d97f93; README er ryddet i 1a73f0f).
**Afventer Jimmy (15-11):** (1) Lam senere? (2) Må `gruppe-koed.mp3` slettes sammen med de to gamle gruppelyde? (3) Nyt ønske 15-11 kl. 17: voksendelens forside skal være selve ugeplanen, med bobler øverst (Indkøbsliste · Retter · Mere), og et tryk på en dag skal åbne kataloget som «Vælg ret til …». Venter på «ja». (4) Resten fordeles over ugen, så ugekvoten (66 %) ikke tømmes.

## 15-11-2026 kl. 07:31: v10 er klar på grenen `v10-foraeldre`, ikke flettet og ikke udgivet (Saga)

Bygget efter Jimmys «ja» 14-11 kl. 20:18 (`docs/brief-2026-11-13.md`, «Startet 14-11-2026»). 22 commits over `main` før denne STATUS-commit (den sidste er `9c34fa9`). `UDGAVE = 'v10 · 14-11-2026'`. Ingen ændring af gemte data (ingen nye nøgler eller felter).

**Hvad v10 indeholder**
- **Fase 1 fra Fables plan:** forsiden viser «I dag laver vi …» (dagens ret fra ugeplanen, et tryk åbner den). Uden ugens udvalg ser børnene hjerterne + nye retter, højst 12. Låsen dækker også ugeplanen (`#/uge`, `#/uge/dag/<n>`), og ugeplanen har «Voksne» i topbaren tilbage til menuen. Menuen er Ugeplan · Indkøbsliste · Retter, og under «Mere» Husstand, Ugens udvalg, Favoritter og «Mere grønt i maden». Husstanden står i ugeplanens hoved.
- **Print fra «Retter»:** Print pr. ret, «Print hele kogebogen» (241 retter) og «Print de N viste» efter en søgning, én ret pr. A4-side (`print.html?alle` og `?retter=<id,id>`).
- **To nye retter** med billede (FLUX.2 klein) og Røst-stemme: Kyllingenuggets i rispapir (Kylling) og Hjemmelavet kebab i ovnen (Kød), begge `afproevet: false`. De er ikke i ugeplanen: kebab har 4 knivtrin (loftet er 2), og nuggets er en snack uden grønt.

**Review** (code-reviewer + ui-reviewer i WebKit på 390×844, 1180×820 og 1280×800): 18 fund.
- Rettet med test og egen commit: K1 (nuggets: ny håndvask efter penslingen af de rå bidder, og validatoren fanger det nu), T1, L2 (indkøbslisten lukker låsen), L3, L4, F1 (om søndagen siger ugeplanen først «Uge N er gået» mandag), F2 (Print kan nås med Tab i Safari), F3, F4, F5 og F6.
- Ikke rettet: **L1** (tilbage fra et print kræver holdet igen, og søgningen i «Retter» er glemt; valgt med vilje, står i `docs/foraeldredel.md`, kræver ellers gemt data). **F7** (fokus på overskriften efter «Voksne»: sådan gør alle tilbage-knapper i voksendelen; reviewets påstand om det modsatte holdt ikke i koden). **F8** (de nye retter er ikke i ugeplanen, se ovenfor).
- **Nyt fund fra e2e:** «Voksne: hold» rykkede væk midt i holdet, når statusskærmens dyr kom sent (første start). Genskabt 2 af 2, rettet med `aspect-ratio` (`d3ea820`), 2 af 2 efter.

**Tests (15-11):**

| Kørsel | Resultat |
|---|---|
| Node, 18 filer | 17 grønne. `test-lyd` fejler kun på 3 mp3-filer uden for listen: de 2 gamle gruppe-mp3 og nuggets' `timer-optaget-16.mp3` (overflødig efter K1) |
| E2e hele, former, voksen, ugeplan, lyn (06:57–07:25) | 148.242 tjek, 0 fejl |

**Ikke gjort:**
- E2e-delene print, tastatur, timer, trinbund, titler, skaermfund, fejl, beroering og mindre er ikke kørt på v10.
- Intet er afprøvet på en rigtig iPad eller iPhone.
- Røst: `lyd/kyllingenuggets-i-rispapir/timer-optaget-17.mp3` er lavet med seed 44 og bør lyttes til.
- F3: på desktop med både «I dag» og en timer står et langt navn med «…» på én linje (skærmlæseren får hele navnet).

**Testliste til Jimmy.** Grenen kan ikke ses på iPad og iPhone før udgivelsen (eller via Tailscale, som kræver dit ja). Indtil da på pc'en, i **PowerShell**: `cd D:\Claude\Kogebog; py -m http.server 8091 --bind 127.0.0.1 --protocol HTTP/1.1 --directory D:\Claude\Kogebog`, og åbn http://127.0.0.1:8091/.

*iPad på langs:*
1. Forsiden: «Version v10 · 14-11-2026» står nederst.
2. Hold «Voksne» i 2 s. Menuen viser Ugeplan, Indkøbsliste og Retter øverst, og under «Mere» fire kort, der er lige høje.
3. På en hverdag (om søndagen viser ugeplanen den næste uge): Ugeplan → «Vælg ret» på i dag → vælg en ret. Tryk «Voksne» øverst: menuen kommer uden nyt hold. Tryk «Luk»: forsiden viser «I dag laver vi …». Tryk på kortet: retten åbner.
4. Start en timer i en ret, og gå til forsiden: «I dag»-kortet, timeren og alle 11 knapper kan ses uden at rulle.
5. Lad ugeplanen stå i 10 min uden tryk: den bliver til «Til de voksne».
6. Hold «Voksne» → Indkøbsliste → swipe tilbage (eller Safaris tilbagepil): «Til de voksne» kommer (holdet kræves igen).
7. Uden ugens udvalg: Ugeplan → «Børnene vælger» → Rosa: hjerterne og nye retter, højst 12, på højst 3 sider.
8. Retter → søg «kylling» → «Print de N viste»: én ret pr. side. «Tilbage til retterne»: holdet kommer igen (valgt sådan).
9. Kylling → Kyllingenuggets i rispapir: trin 15 «Pensl bidderne med olie.» følges af trin 16 «Vask hænderne igen.». Kød → Hjemmelavet kebab i ovnen: stemmen læser alle trin.
10. Start timeren på nuggets trin 17, åbn en anden ret, og tryk «Start timer»: lyt til «Der kører allerede en timer på Kyllingenuggets i rispapir, trin 17 …».

*iPhone:*
11. Hold «Voksne» → Retter: Med, hjertet, Åbn og printikonet står på én linje i hver række.
12. Menuen: Ugeplan, Indkøbsliste og Retter er højere end de fire under «Mere».
13. Med en plan lavet tidligere på ugen, om søndagen: forsiden viser søndagens ret, og ugeplanen siger ikke «Uge N er gået» før mandag.

**Afventer Jimmy (14-11):**
1. Se v10 på grenen (testlisten ovenfor), og sig til, før den flettes til `main` og udgives. Ved fletningen: ok til at slette `lyd/kyllingenuggets-i-rispapir/timer-optaget-16.mp3` (kun lavet på grenen og ikke brugt mere)?
2. Ja til fase 2 (`kog-familie` v1 → v2, bilag B i `docs/fable-foraeldrekogebog-2026-11-10.md`). Spørgsmålet: må iPad'en flytte «Ugens udvalg» over i hjerterne og fjerne udvalget som eget punkt (et udvalg på 8 retter bliver til 8 hjerter, og børnene ser det samme + 2 nye), og få to nye felter: `nyePrUge` (0-4 nye retter om ugen, standard 2) og `harVi` (varer, I altid har, til fase 3)? Migreringen sker selv og testes, og intet gemt forsvinder.

De ældre «Afventer Jimmy»-punkter længere nede er ikke gennemgået i denne runde.

## 13-11-2026 kl. 16:09: Jimmy vil vende appen om (forældreapp, der er børnevenlig)

Ønsket og planen står i `docs/brief-2026-11-13.md`. Den bygger på Fables redesign fra 10-11 (`docs/fable-foraeldrekogebog-2026-11-10.md`), plus print af alle retter fra computeren og nye retter fra Jimmys reels (kyllingebid i rispapir; kebab venter på skærmbilleder). Intet er bygget endnu.

~~**Afventer Jimmy (13-11):** «ja» til Fables plan med fase 1 først.~~ Lukket: Jimmy sagde ja 14-11 kl. 20:18 (se afsnittet 15-11 ovenfor).

## 13-11-2026 kl. 13:30: v9 er live igen

Jimmy pushede main (`df3e125..2785747`) og slog GitHub Pages til (main, / root). Claude tjekkede kl. 13:30, ca. 30 s efter: https://jimmyfabe.github.io/Kogebog/ svarer 200, `js/version.js` siger `v9 · 13-11-2026` og `v9:eaba115fe45c41bd`, og `sw.js` har `INDHOLD = '795750507c2054b4'`. Punkterne 1-3 nedenfor er lukket. Ikke afprøvet på en rigtig iPad. (Rettet 20-11: det var en antagelse, ikke målt. iPhonen stod på v9 længe efter. Se v13 om genindlæsning og fejlede installationer.)

## 13-11-2026 kl. 11:40: v9 er flettet til main og klar til udgivelse

Jimmy (13-11): «godkender det hele», så v9 udgives, og de 3 gamle filer bliver liggende (ingen `--ryd`).
- `6616a57`: v9-madpakke flettet til main (main havde kun docs og STATUS ud over v9).
- `1948055`: `UDGAVE = 'v9 · 13-11-2026'`, ny `UDGAVE_INDHOLD` og `INDHOLD`. Navnet v9 følger grenen (v7 og v8 er med), ikke løbenummeret +1.
- Node-tests: 16 af 17 filer grønne. `test-lyd` fejler kun på de 2 gamle gruppe-mp3 (forventet).
- E2e er ikke kørt igen: koden er den samme som v9 10-11 (201.983 tjek, 0 fejl). Kun versionsfilen og `sw.js` er ændret.

**Hvorfor kogebogen var væk:** GitHub Pages blev slået fra på repoet 09-11 kl. 16:38 dansk tid (`has_pages=false`, siden giver 404). Ingen chat forklarer det.

**Afventer Jimmy (13-11):**
1. Push main: `cd D:\Claude\Kogebog; git push origin main` (PowerShell).
2. Slå Pages til igen: repo → Settings → Pages → Deploy from a branch → `main` og `/ (root)` → Save.
3. Bagefter tjekker Claude, at https://jimmyfabe.github.io/Kogebog/ svarer og viser v9.

## 10-11-2026 kl. 13:26: v9 madpakker har Røst-stemmen, og hele e2e er grøn (Saga)

**Stemmen** (`67e3a4e`): Røst har indtalt de 453 replikker til de 16 madpakker. `sw.js` (INDHOLD og LYD) og `js/version.js` (UDGAVE_INDHOLD) har nye fingeraftryk. Backuppen ligger i `D:\Stemmer\kogebog-500m\foer-trin4-1011\`. Logs: `trin4-1011.log` og `overstyr-1011.log` samme sted. Seed 42 gav 1.108 mistænkelige; efter seed 43–47 er **878 «stadig mistænkelige»**. De fleste har en for lang hale, så de er ikke nødvendigvis forkerte.

**Fuld e2e efter stemmen**, 14 dele hver for sig gennem låsen, 10-11 kl. 11:00–13:26: **201.983 tjek, 0 fejl**.

| Del | Tjek | | Del | Tjek |
|---|---|---|---|---|
| hele | 136.269 | | titler | 2.145 |
| trinbund | 33.385 | | voksen | 1.041 |
| print | 19.363 | | ugeplan | 697 |
| former | 8.409 | | skaermfund | 420 |
| timer | 164 | | de 5 små (lyn, fejl, tastatur, beroering, mindre) | 90 |

**Kendt rødt indtil udgivelsen:**
- `test-version` («nummeret er hævet siden main»).
- `test-lyd` for 2 gamle gruppe-mp3, der ikke længere bruges. De fjernes kun med `--ryd`, og det kræver dit ok, fordi det sletter filer.

**Afventer Jimmy** (10-11):
- Lyt til et udvalg af de 878 mistænkelige replikker, især ordene «squashen», «basilikummen» og «spegepølse». Listen står i `D:\Stemmer\kogebog-500m\trin4-1011.log`.
- Ok til `--ryd` for de 2 gamle gruppe-mp3.
- Udgivelsen: versionsnummeret hæves (UDGAVE står stadig på v6), og v9 flettes til main. Det går live på GitHub Pages, så du får kommandoen.

## 10-11-2026 kl. 00:33: UI-review af v9 gav 9 fund; de 2 layoutfund rettes nu (Saga)

ui-reviewer så 65 skærmbilleder (5 skærme) og målte 17 retter × 4 skærme (246 trin). Der var ingen JS-fejl og ingen vandret rulning. Fund og mål ligger i kladdemappen `kogebog-0911/v9/ui-review-agent/` (`maal.txt`).

**Rettes nu af frontend-dev** (CSS, ikke tekst, fordi stemmen indtales af de nuværende tekster). Hver rettelse får en e2e-test, der først er rød, og sin egen commit:
- **A (høj):** voksen-noten (også sikkerhedsteksten) ligger under den faste bund på trinsider. På 390×844 gælder det 4 trin (14–60 px), og på 360×780 53 af 246 trin. Værst er gulerodssmoothie trin 6 med «hold hånden på låget». Billedet skal give efter, ikke teksten.
- **B (mellem):** rettens titel knækker midt i ordet på iPad på højkant 768×1024 («Cowboybønn|er», «fiskefrikadell|er»).

**Rettet 10-11** (frontend-dev, fuld e2e 0 FEJL i 190.695 tjek):
- `db2b2ad` A: trinets billede giver efter (mindst 140 px). Trin med teksten under bunden: 390×826 92 → 0 af 3327; 360×780 486 → 4 (dino-vulkan 10, sushi-bowl 3, medister 2, stegte ris 2), som ruller som før.
- `024581a` B: navne, der knækker midt i ordet: 768×1024 24 → 0, 820×1180 8 → 0, 744×1133 34 → 0.

**Review af A+B** (code-reviewer + ui-reviewer): intet ødelagt, men to tests kunne bestå uden at teste noget. Det er rettet (se nedenfor).
- **Rettet efter reviewet 10-11** (frontend-dev, 8 commits `8ac8d29`…`de44df1`, hver med et rødt bevis før og et grønt efter, kun `test/test-e2e.js`, `app.css`, `js/version.js` og `sw.js`; kontrolleret med `git diff --stat` kl. 06:48):
  - `trinbund` skriver sine målinger straks, fejler højlydt, hvis `.trin-tekst` mangler, og måler nu også trinene i «Mere grønt» (3338 trin pr. skærm).
  - 360×780 har et loft på 4 trin under bunden. 390×779 (iPhonen med statuslinjen) måles også, med et loft på 1 trin (sushi-bowl 3, 18 px).
  - `titler` måler også iPad mini (744×1133), med 0 delte navne.
  - Tjekket for «mindre bevægelse» testede intet på højkant (siden ruller 0 px). Det er nu sin egen del, `mindre`, på 667×375, hvor siden ruller.
  - CSS: billedets største mål står ét sted (`--billede-max`), og målingerne er de samme før og efter.
  - Ikke kørt: den fulde e2e, hele `timer`-delen og `hele` (efter omskrivningen til `gaaTil`). De kører i den samlede e2e efter stemmen.
  - Kogebogs CLAUDE.md har fået de nye dele og faldgruben med trykspærren på 350 ms (`96b3ad3`).
- **Valg (Saga):** B forbliver, som den er. Højttaleren står i midten under navnet på 207 af 239 retter på iPad på højkant.
  - Alternativet var at flytte den kun ved for lange ord. ui-reviewer målte, at 32 navne så stod på 4–5 linjer i en kolonne på 192 px, og at højttaleren hoppede fra ret til ret.
- **Kendt pris ved A:**
  - Når «Start timer» trykkes på telefon, krymper billedet i ét hug, fx fra 281 til 140 px på fiskefrikadeller 15. Ringen er højere end knappen, og «Læs op» ryger ned på sin egen række.
  - På sushi-bowl 3 glider noten ind under bunden igen, mens timeren kører.
  - Billedets størrelse skifter også fra trin til trin.
  - Roligere kræver, at «Læs op» bliver på rækken ved timeren. Det er ikke bygget.
- **Ikke afprøvet:**
  - rigtig iPhone (statuslinjen kan tage ca. 47 px; safe-area tælles måske dobbelt);
  - ældre Safari (iOS 15/16: billedets bredde regnes nu ud fra højden).

**Ikke rettet** (med grund):
- Ingrediensnavne knækker uden bindestreg på 360–390 px («grahamsme|l»). WebKit på Windows deler ikke dansk med bindestreg, men Safari på iPhone gør det måske selv. Prøv først på en rigtig iPhone.
- Versionsnummeret står stadig på v6. Det hæves ved udgivelsen, som planlagt.
- Når et navn fylder to linjer, står forsidens tallerkener 12–15 px skævt. Med en timer på iPad på langs og desktop er der et hul på ca. 55 px. Begge dele er lavt og kan tages senere.
- Fiskefars, laks og fiskepinde har ikonet «kød» (rødt hakket kød, `js/katalog.js:385` og 401–422). Et `ing-fisk`-ikon skal tegnes.
- «45 / minutter» deles over to linjer. Et hårdt mellemrum ændrer teksten og dermed muligvis stemmen, så det venter til efter stemmen.

**Kører nu:**
- Røst seed 42: 143 replikker tilbage kl. 06:38, så den er færdig ca. kl. 08. Den stod stille 02:41–04:45, mens den fulde e2e havde låsen.
- Derefter trin 3-5 i CLAUDE.md «Stemmen», fingeraftrykkene `LYD`/`UDGAVE_INDHOLD`/`INDHOLD` og én samlet fuld e2e (ca. 2 t).
- Lyt efter: squashen, basilikummen, spegepølse.

**Afventer Jimmy** (alle spørgsmål samlet her):
- (10-11) Din iPhone viser stadig v6, så v9 kan først ses der efter udgivelsen eller via Tailscale (kræver dit ja). Åbn Kogebogen som app fra hjemmeskærmen, gå til et trin med en lang note (fx Gulerodssmoothie trin 6), og se, om hele noten står over knapperne i bunden. Billedet bliver mindre på de trin. Er det i orden?
- (10-11) Billederne, som et barn kan forveksle (dit øje, ikke målt):
  - Små rug-pitabrød ligner bagte kartofler eller æg.
  - Spinattærtens midte ligner et spejlæg.
  - Havregrødsboller, fiskefrikadeller og grove sandwichboller er alle brune kugler.
  - Rugbrødsmadpakken viser bart rugbrød uden pålæg.
  - Rugbrød og burgerboller har samme ikon (en baguette).

  Skal nogle af dem laves om (FLUX, ca. 6 min pr. billede)?
- (09-11) «Grove gulerodsboller til madpakken» står i Brød og pizza. Skal de flyttes til Madpakke? Reglen i `docs/forside-sortering-05-11-2026.md` nævner ikke Madpakke endnu (review-fund 4). Flytningen er én linje i `index.json`.
- (09-11) Nødder: købte kerner, tørret frugt, boller og rugbrød kan være mærket «kan indeholde spor af nødder». Er spor også forbudt på skolen? (ikke tjekket pr. vare)
- (09-11) Madpakkerne skal prøves i et køkken, før `afproevet` sættes til true.
- (08-11) Kæmpesmåkagerne skal smages og bages i en rigtig ovn.
- (06-11) Udgivelse: v7, v8 og v9 venter på dit «ja». v7 skal ud før eller sammen med v8, og v9 indeholder v8. **Anbefaling 09-11:** udgiv v9 i ét hug, når stemmen er færdig. v8 alene har en layoutfejl på iPhone på langs (se 09-11 kl. 23:29).
- (05-11) Må de 2 gamle gruppe-mp3 og `grafik/gruppe-bagning.svg` slettes? `test-lyd` er rød, til de er væk.

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

- E2e på **v8 alene** (09-11 kl. 23:56) har 26 fejl, og ingen af dem findes i v9:
  - 6 skyldes en forældet test: «ti knapper» kloner en 10. knap oven i v8's 10 rigtige;
  - 20 er en ægte layoutfejl: 10 knapper i 5 kolonner bliver 123–138 px brede på iPhone på langs (736×414 og 812×375), og mindstemålet er 140. v9's regel for 11 knapper giver 3 kolonner der.
  - **Valg (Saga):** v8 er ikke rettet, for anbefalingen er at udgive v9 i ét hug (den indeholder v7 og v8). Alternativet er, at v8 skal ud alene. Så skal reglen fra v9 genbruges for 10 knapper, og testen rettes (ca. 30 min plus review).

**Kørte (afløst af afsnittet 10-11 kl. 00:33):** Røst, ui-reviewer og e2e på v8 alene. «Afventer Jimmy» er ført op.

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

## 06-11-2026 kl. 03:38: v7 er bygget, reviewet og grøn på grenen, men ikke flettet og ikke udgivet (Saga)

- **Afventer Jimmy (06-11):**
  - Se v7 på iPad og iPhone, og sig ja til udgivelsen. Så flettes grenen ind i `main`, `UDGAVE` bliver v7 og `INDHOLD` sættes, og du pusher.
  - Ja til at slette `grafik/gruppe-bagning.svg` og `lyd/faelles/gruppe-aftensmad.mp3` + `gruppe-bagning.mp3`. Ingen bruger dem længere.
  - Skal luppen og «Ryd søgningen» være børneknapper?
- **Grenen `v7-0411`** (arbejdskopi `D:\Claude\.claude\worktrees\kogebog-v7`, 54 commits fra febe44b til a977bb3):
  - Ny forside med billedknapper efter slags mad, grupper og en lup til den voksne.
  - De 26 jule- og nytårsretter har billeder, tegnet lokalt.
  - Søgningen er rettet.
  - Liggende telefon med 88 px knapper.
  - Røst-lyd til de nye replikker.
- **Review:**
  - UI-gennemgang 05-11. Fundene er rettet og står som e2e-delen `skaermfund`.
  - `code-reviewer`: 9 rettelser (2d1b62f til a093bc3).
  - `ui-reviewer` på fotos og tal i WebKit: de 5 rettelser holder ved genmålingen.
- **Test på a093bc3:**
  - Hele e2e i WebKit, del for del gennem låsen: 110.410 tjek og 0 fejl i 11 dele (87 min, heraf timer-delen 48 min).
  - Node: 15 af 17 filer grønne. `test-lyd` fejler på de to gamle gruppe-mp3'er, og `test-version` på det uændrede nummer v6. Begge venter på dit ja ovenfor.
- **Ikke rettet (lave fund):**
  - Trekanten stikker 14 px ud som et mærke (med vilje).
  - «Til den voksne» ligger under den faste bund på lave skærme på langs (fandtes før v7).
  - Reglen for liggende skærme under 700 px er ikke målt på 568×320, og 320×568 mangler i timer-gennemgangen.
- **Ikke afprøvet:**
  - Rigtig iPad og iPhone, VoiceOver, iOS før 15.4 og safe-area.
  - Ingen har lyttet til de 650 nye replikker eller de 7 nye knapper. 77 af replikkerne er mærket «lyt».
  - Ingen af de nye retter er lavet i et køkken.
- **Ud af huset:** intet pushet, intet udgivet. `main` har kun dette STATUS-afsnit.

## 05-11-2026 kl. 04:33: stemmen til v7 er færdig på grenen, billederne mangler stadig (Saga)

- **Afventer Jimmy (04-11):** vælg billedvej (30 billeder) · ja til forsiden, Jul som egen knap, og om alle opskrifter må nås gennem knapperne.
- **Lavet:** seed 43 og 44 lavede de 474 mistænkelige (474 + 474 i `koersel-log.txt`, intet lavet om efter genstarten). Trin 4: 4303 mp3. ASR-valget er lagt oven på (49 + 3 andre udgaver, 27 fra appen, 0 stop på ændret tekst). Trin 5: 4303 lydfiler, 87,89 MB. 276 mp3 med uændret tekst er gendannet fra HEAD, tilbage er 650 nye og `gruppe-jul`. `LYD` er sat. Commit febe44b på `v7-0411`.
- **Målt:** `test-lyd` 11 bestået, 0 fejlet. `test-sw` 11 bestået, 2 fejlet (`FILER` og `INDHOLD`). `test-version` fejler også. Alle tre fejl skyldes de manglende billeder. `test-opskrifter` melder de samme 26 billeder.
- **Ikke gjort:** ingen har lyttet, og talegenkenderen er ikke kørt på de 650 nye. 77 af dem er mærket «lyt» i `kvalitet.json` (74 lang hale, 3 for lang). `UDGAVE`, `UDGAVE_INDHOLD` og `INDHOLD` venter på billederne. Hele e2e er ikke kørt.
- **Kopi:** den forrige `mp3/` og `kvalitet.json` ligger i `D:/Stemmer/kogebog-500m/foer-trin4-0511/` (83 MB).
- **Ud af huset:** intet pushet, intet udgivet.

## 04-11-2026 kl. 19:08: undersøgelse af forsiden, intet bygget (Saga)

- **Afventer Jimmy (04-11):** ja til forsiden, Jul som egen knap, og om alle opskrifter må nås gennem knapperne. Beslutningen står i `docs/forside-undersoegelse-04-11-2026.md` på grenen `v7-0411` (72daa60).
- **Anbefaling:** del efter slags mad med otte billedknapper; tid på kortet; genre kun i søgningen; lup til den voksne; ugeplanen findes og skal være lettere at finde.
- **Talt af kommando:** gruppernes størrelse, tiden (67 af 85 aftensretter i 21-45 min), 82 retter kan planlægges. **Skøn eller ikke efterprøvet:** genre- og slags-fordelingen, søgetræffene, pixeltal. **Ikke testet:** om børnene forstår billederne.
- **Ud af huset:** intet pushet, intet udgivet.

## 04-11-2026 kl. 11:24: billederne til v7 kunne ikke laves, Codex står som gratis (Saga)

- **Afventer Jimmy (04-11):** vælg billedvej (`D:\Claude\STATUS.md`). Jimmy 04-11: «Den er gratis chatgpt», så Codex-vejen er lukket.
- **Set med den rigtige klient kl. 11:14-11:18:** Codex' sessionsfil siger `plan_type: free` (02-11: `plus`). `gpt-6-astra` fra `config.toml` afvises (400). `gpt-6-luna` prøvede en Adobe-forbindelse (`Mcp error -32603`, 0 af 6 billeder), og `gpt-5.6-terra` svarede, at den indbyggede generator ikke findes i sessionen (0 af 1). Forsøgene kostede 14 % af gratisplanens 30-dages kvote, og jeg stoppede dér. `config.toml` er ikke rørt.
- **Mangler stadig:** 26 retbilleder og 4 pladsholdere (`retter.txt` og `koer-codex2.sh` i kladdemappen `jul-billeder`). 20 er færdige.
- **Ud af huset:** intet pushet, intet udgivet. `main` er uændret.
- **Forarbejde uden billeder:** grenen `v7-0411` (arbejdskopi `D:\Claude\.claude\worktrees\kogebog-v7`, commit f7a05a3) har de 26 retter i `opskrifter/`, `index.json`, `FILER` i `sw.js` og gruppen «Jul og nytår». `test-soeg.js` er rettet: tarteletterne er den første juleret med kylling.
- **Målt på grenen:** `test-opskrifter` melder kun de 26 manglende billeder. Med midlertidige billeder (fjernet igen, ikke committet): «OK: 151 retter», `test-validator` 52 bestået, 0 fejlet. Uden billeder fejler også `test-validator`, `test-sw`, `test-lyd` og `test-version`, så grenen flettes først, når billederne findes. `UDGAVE`, `INDHOLD` og `LYD` er ikke sat. Hele e2e er ikke kørt.
- **Stemmen:** talelisten er 650 nye og 1 ændret replik (`gruppe-jul`), 0 fjernet. Røst er startet i baggrunden 04-11 inden kl. 11:32 (trin 2 i «Stemmen»); trin 3-5 mangler, og forrige liste er gemt som `D:\Stemmer\kogebog-500m\taleliste-v6-02-11.json`.

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

