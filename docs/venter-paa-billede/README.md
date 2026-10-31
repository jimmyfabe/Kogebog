# Retter, der venter på deres billede

26 færdige opskrifter fra 31-10-2026, som ligger her, indtil Codex har tegnet deres retbillede. Validatoren kræver
`grafik/ret-<id>.webp` for hver ret i `opskrifter/`, og Codex-kvoten slap op midt i serien 31-10-2026. Katalog, ikoner
og kønsordet i `KOEN` (`js/tekst.js`) er allerede på plads, så retterne består alle tests, når de flyttes ind.

| Opskrift | Gruppe |
|---|---|
| `gulerodsboller.json` (runde 1) | bagning (efter `pizzasnegle`) |
| `havregrynsmuffins-med-aeble.json` (runde 1) | søde sager (efter `havregrynskugler`) |
| de 24 andre (runde 2, hurtige hverdagsretter) | aftensmad (sidst i gruppen), alle med `ugeplan: true` |

Runde 2: `bakkeret-knuste-kartofler-og-kylling`, `cremet-carbonara-med-aerter-uden-raa-aeg`, `egg-foo-young-med-ris`,
`floedekartofler-med-skinke-og-broccoli`, `gnocchi-med-tomat-spinat-og-mozzarella`,
`groen-pesto-pasta-med-broccoli-og-aerter`, `groen-porre-kartoffelsuppe-med-bacondrys`, `gyoza-med-noedler-og-groent`,
`hoisin-gris-med-ris-og-agurk`, `honning-soja-koedboller`, `kartoffel-gulerods-roesti-med-skyrdip`,
`kartoffeltortilla-med-aerter-og-spinat`, `kylling-salatbaade-med-ris`, `mild-bibimbap-risskaal`,
`mild-kartoffelkarry-med-kokos-og-aerter`, `milde-asiatiske-fiskefrikadeller`, `okonomiyaki-med-spidskaal`,
`orange-pasta-med-hemmelig-groentsagssovs`, `pasta-med-laks-spinat-og-citron`, `soed-sur-kylling-med-ananas`,
`spaghetti-chow-mein-med-kylling`, `stegte-ris-med-aeg-aerter-og-majs`, `sushi-bowl-med-tun`,
`teriyaki-kylling-med-broccoli`.

Sådan kommer de tilbage (Git Bash i Kogebog). Det kan gøres for de retter, der har fået et billede, resten bliver her:

1. Lav PNG'erne med Codex (faldgruben om Codex i `CLAUDE.md`: prompten på stdin), og kør
   `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik <id> [<id> ...]`.
2. `git mv docs/venter-paa-billede/<id>.json opskrifter/`, og skriv id'et i sin gruppe i `opskrifter/index.json`.
3. Tilføj `opskrifter/<id>.json` og `grafik/ret-<id>.webp` i `FILER` i `sw.js`.
4. Skriv runde 2-id'erne i `UGEPLAN`-listen i `test/test-indkoeb.js` (alfabetisk), da de alle er med i ugeplanen.
5. Sæt den nye `UDGAVE_INDHOLD` først og derefter `INDHOLD` (`node test/test-version.js` og `node test/test-sw.js`
   viser dem; `js/version.js` ligger selv i `FILER`). Hæv `UDGAVE`, hvis udgaven allerede er udgivet.
6. Lav stemmen til retterne (`CLAUDE.md`, «Stemmen»). `node test/test-lyd.js` viser de manglende replikker.
7. Kør e2e med `E2E_DELE=former,hele` (kommandoen står i `CLAUDE.md`). Den tjekker blandt andet, at navnene bliver
   inde i forsidens kort på 360 px. Tre navne har en blød bindestreg (U+00AD) i det lange ord (| herunder): «grøntsags|omeletter»,
   «Kartoffel|tortilla» og «fiske|frikadeller». Stikker et andet navn ud, så giv det en blød bindestreg på samme måde.

Hvad billederne skal vise (samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede
tallerken med brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder, bestik eller spisepinde, ingen chili
og ingen nødder). Står der skål, pande, bradepande eller fad, tegnes den i stedet for tallerkenen:

- `gulerodsboller`: seks runde, grove boller med orange gulerodsstykker, havregryn og sesamfrø; én er skåret over.
- `havregrynsmuffins-med-aeble`: fem havregrynsmuffins i hvide papirforme, hver med en tynd æbleskive og lidt kanel.
- `bakkeret-knuste-kartofler-og-kylling`: grå bradepande med sprøde, flade kartofler, paprikakylling, broccoli,
  gulerodsstave og en lille skål hvid skyrdip.
- `cremet-carbonara-med-aerter-uden-raa-aeg`: fuldkornsspaghetti i hvid, cremet sovs med sprød bacon, ærter, ost og peber.
- `egg-foo-young-med-ris`: ris og tre små gyldne omeletter med kål, gulerod og ærter, et par dråber soja.
- `floedekartofler-med-skinke-og-broccoli`: cremefarvet fad med kartoffelskiver, skinketern og broccoli under gylden
  ost, ét hjørne taget ud; en lille skål revet gulerod ved siden af.
- `gnocchi-med-tomat-spinat-og-mozzarella`: grå pande med gnocchi i mild tomatsovs med spinat og smeltet mozzarella.
- `groen-pesto-pasta-med-broccoli-og-aerter`: fuldkornsspaghetti i klar grøn sovs med broccoli, ærter og ost.
- `groen-porre-kartoffelsuppe-med-bacondrys`: dyb tallerken med lysegrøn, jævn suppe, sprøde baconstykker og to skiver
  rugbrød på kanten (tydeligt grøn, ikke orange).
- `gyoza-med-noedler-og-groent`: fem foldede dumplings med gylden bund, fuldkornsnudler med wokgrøntsager,
  agurkestave og en lille skål soja.
- `hoisin-gris-med-ris-og-agurk`: skål med ris, hakket svinekød i mørk, blank hoisinsovs med ærter, revet gulerod og
  agurkeskiver.
- `honning-soja-koedboller`: ti små blanke kødboller, brune ris og agurkestave.
- `kartoffel-gulerods-roesti-med-skyrdip`: seks små sprøde röstier med gulerodsstrimler, skål med skyr-agurkedip og
  ærter.
- `kartoffeltortilla-med-aerter-og-spinat`: tyk, rund kartoffelomelet skåret i trekanter med ærter og spinat,
  agurkestave ved siden af.
- `kylling-salatbaade-med-ris`: fire icebergblade som små både med ris, hakket kylling, majs og revet gulerod.
- `mild-bibimbap-risskaal`: skål med ris, oksekød, spinat og revet gulerod i felter og et spejlæg i midten.
- `mild-kartoffelkarry-med-kokos-og-aerter`: skål med mild, cremet gul karry med kartoffel, kikærter, ærter og tomat;
  ingen ris.
- `milde-asiatiske-fiskefrikadeller`: seks små gyldne fiskefrikadeller med gulerodsprikker, ris, agurkestave og en
  lille skål soja-honningdip.
- `okonomiyaki-med-spidskaal`: én stor, tyk kålpandekage med gulerod og skinke, krydsede striber af ketchup og mayo,
  ét stykke trukket ud.
- `orange-pasta-med-hemmelig-groentsagssovs`: fuldkornsspaghetti i jævn, klart orange sovs med lidt ost; ingen synlige
  grøntsager.
- `pasta-med-laks-spinat-og-citron`: fuldkornsspaghetti i hvid sovs med lyserød laks, spinat og ærter, to
  citronbåde.
- `soed-sur-kylling-med-ananas`: ris og kylling i blank, mild orangerød sød-sur sovs med ananas og peberfrugt.
- `spaghetti-chow-mein-med-kylling`: fuldkornsspaghetti i lysebrun soja-honningsovs med kyllingestrimler, snittet kål og
  revet gulerod (ingen dumplings).
- `stegte-ris-med-aeg-aerter-og-majs`: en bunke gyldne stegte ris med æg, ærter og majs.
- `sushi-bowl-med-tun`: skål med ris, tun fra dåse, agurketern, revet gulerod og majs i felter og en tynd stribe
  dressing; ingen rå fisk, ingen tang.
- `teriyaki-kylling-med-broccoli`: ris og kyllingestrimler i blank, gyldenbrun glasur med broccoli og gulerodsskiver.
