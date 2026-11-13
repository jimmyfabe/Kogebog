# Forsiden: genre, tid eller slags mad? (04-11-2026)

Jimmys spørgsmål: man mister overblikket i opskrifterne. Skal de deles efter genre eller tid, med piktogrammer og en søgning på forsiden? **Intet er bygget.** Beslutningen er Jimmys.

## Svaret

Del efter **slags mad**: otte store billedknapper på første skærm. Et tryk viser kun den gruppes retter.

- **Tid** bliver, hvor den er: minuttal og lyn på hvert kort.
- **Genre** kun i søgningen.
- **Søgning:** en lup til den voksne øverst på forsiden.
- **Favoritter, voksendelen og ugeplanen** bliver. Ugeplanen findes allerede bag «Voksne: hold» og skal bare være lettere at finde.

## Forsiden i dag

151 retter på én lang side. Pixeltallene er beregnet for iPad 1180×820 med 3 kolonner, ikke målt.

| Gruppe | Retter | Rækker | Højde |
|---|---:|---:|---:|
| Jul og nytår | 45 | 15 | 4.800 px |
| Aftensmad | 85 | 29 | 9.500 px |
| Bagning | 4 | 2 | 600 px |
| Søde sager | 11 | 4 | 1.200 px |
| Halloween | 6 | 2 | 600 px |
| **I alt** | **151** | **52** | **ca. 17.300 px, 21 skærme** |

iPhone: 2 kolonner, 77 rækker (beregnet). Hop-knapperne følger ikke med ned, tilbage fra en ret ruller til toppen (`app.js:678`), «Voksne: hold» står efter alle kortene, og forsiden har ingen søgning.

## De tre måder at dele på

| Måde | Passer ikke | Problem | Kilde til tallet |
|---|---:|---|---|
| **Genre** | 57 af 151 (38 %) | Dansk/nordisk 52 (37 er jul), Italiensk 18, Asiatisk 14, Andet land 13, Mexicansk 5, Indisk/Mellemøsten 5, intet tydeligt køkken 44. Feltet `recipeCuisine` findes på 0 retter | Håndsorteret skøn |
| **Tid** | 0 | 67 af 85 aftensretter (79 %) ligger i 21-45 min, så den store gruppe bliver ikke delt. 99 retter skriver selv «Tiden er et skøn» | **Talt fra filerne** |
| **Slags mad** | 1 (kartoffelmos) | Pasta og nudler 18, Fisk 15, Kød 15, Kylling 14, Grønt uden kød 20, Søde sager 11, Brød og pizza 6, Jul 45, Halloween 6. Tvivl: 5 under Kød har kun lidt kød, 4 er også pasta | Håndsorteret skøn |

Tid i alle grupper (talt 04-11 kl. 19:07):

| Minutter | ≤20 | 21-30 | 31-45 | 46-60 | 61-120 | >120 |
|---|---:|---:|---:|---:|---:|---:|
| Aftensmad (85) | 4 | 33 | 34 | 13 | 1 | 0 |
| Alle (151) | 7 | 36 | 46 | 27 | 24 | 11 |

## Forslag til de otte knapper

| Knap | Retter | Billede |
|---|---:|---|
| Pasta og nudler | 18 | `ing-spaghetti` findes |
| Kylling | 14 | Ny tegning |
| Fisk | 15 | Ny tegning (`ing-tun`, `ing-makrel` findes) |
| Kød | 15 | `ing-koed` findes |
| Grønt med kartoffelmos | 21 | `ing-broccoli` findes |
| Brød og pizza | 6 | `ing-broed` findes |
| Søde sager | 11 | `gruppe-soede-sager` findes |
| Fest (Jul 45 + Halloween 6) | 51 | `gruppe-jul`, græskar i oktober |

Listen falder fra ca. 21 skærme til højst ca. 3 (beregnet), undtagen Fest. Alle 151 retter nås med 3 tryk. Knappen siger sit navn med Røst, én fil pr. navn.

Vil Jimmy have Jul for sig selv: 9 knapper. En hjerteknap kommer oveni, når der findes en favorit. «Voksne: hold» flyttes op under knapperne, samme hold på 2 s.

## Hvad det kræver

1. Del Aftensmad i fem i `index.json`, og sorter resten.
2. Knapskærm og én ny rute til en gruppe, hvor tilbage fører til gruppen.
3. 5-6 billeder, farver, Røst-lyd, `GRUPPER`, `sw.js`, version.

Ingen nye felter og intet nyt lager, så længe forsiden ikke husker et valg. Pas på: søgeordet «aftensmad» (85 træf) forsvinder, og voksendelens chips følger med (`voksen-del.js:814`).

**Luppen:** mindst 48 px, med `soeg()` fra `js/soeg.js`. Den leder også inde i ord: «is» giver 62 træf (fanger «ris» og «fisk»), så det skal ses på. Andre træf: pasta 10, suppe 8, kylling 20, jul 45, kinesisk 1, italiensk 0, mexicansk 0. Beskrivelsen søges ikke i dag.

**Ugeplanen:** bag «Voksne: hold», `#/uge` i `js/ugeplan.js`, med børnenes valg, indkøbsliste og print. 82 af 151 retter kan planlægges (talt). Resten mangler felterne: jul 45, søde sager 11, halloween 6, bagning 4, aftensmad 3.

## Hvad jeg fraråder

- **Genre som knapper:** 57 passer ikke, og resten er mest dansk.
- **Tid som knapper:** tiden er et skøn, og 79 % af aftensmaden falder i to grupper.
- **Genre, tid og slags side om side:** NN/g kalder parallel navigation «Very confusing» for børn.
- **Filterchips eller søgning som børnenes indgang:** børn ca. 5-9 år kan næsten ikke læse.
- **Temaer og nyt lager nu** (mulighed B i `docs/jul-plan-01-11-2026.md`).

## Kilder og hvad de er værd

- NN/g om børn (Sherwin og Nielsen 2019, 35 børn 3-12 år): rulning «Avoid (young children)», billeder fra virkeligheden «Very helpful for pre-readers». NN/g om ikoner (Harley 2014, voksne): test ved at spørge, hvad de betyder. NN/g om facetter (Whitenton 2014).
- Baymard-blog (e-handel, ikke opskrifter): ca. 10 valg, mindst 10 varer pr. kategori. Jones 1993. Elsweiler 2017.
- Apps set: Valdemarsro, Arla, Tasty, NYT Cooking, Paprika, Mealime. Ingen af de seks har tid som hovedinddeling (en agents læsning, ikke efterprøvet).
- **Ikke fundet:** en undersøgelse af genre mod tid og forskning i børn + opskrifter + piktogrammer. Anbefalingen hviler altså på regler for børn og på vores egne tal, ikke på en test af netop dette.

## Efterprøvet, og hvad der ikke er

| Tal | Status |
|---|---|
| Gruppernes størrelse, tid i alle grupper, felter, 82 kan planlægges, ugeplanens rute | Talt af kommando på `v7-0411` (f7a05a3) |
| Genre- og slags-fordelingen | Håndsorteret skøn fra en agent, ikke efterprøvet ret for ret |
| Søgetræffene, pixeltal, skærmtal | En agents kørsel eller beregning, ikke efterprøvet |
| Forstår børnene de otte billeder? | **Ikke testet.** Vis dem billederne, og spørg, hvad der er bag hver |

Kortene mangler stadig 26 billeder i v7, men knapskærmen afhænger ikke af dem.
