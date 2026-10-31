# Retter, der venter på deres billede

14 færdige opskrifter fra runde 3 (31-10-2026), som ligger her, indtil Codex har tegnet deres retbillede: 12 hurtige
hverdagsretter med Jamie Olivers retter som inspiration og Jimmys kødkål og jægergryde. Validatoren kræver
`grafik/ret-<id>.webp` for hver ret i `opskrifter/`. Katalog, ikoner (`ing-champignon.svg` og `ing-baer.svg`) og
varerne til indkøbslisten er allerede på plads, så retterne består alle tests, når de flyttes ind (prøvet samlet i en
valideringskopi 31-10-2026). Ingen af dem er lavet i et køkken endnu (`afproevet: false`).

| Opskrift | Gruppe |
|---|---|
| `frossen-yoghurt-med-baer.json` | søde sager (sidst i gruppen) |
| de 13 andre | aftensmad (sidst i gruppen), alle med `ugeplan: true` |

Aftensmad: `sproed-kylling-i-rasp`, `foldet-fladbroed-med-ost`, `kyllingetaerte-med-butterdej`, `fisketacos-med-majs`,
`smash-burgere-med-ost`, `kylling-med-boenner-og-spinat`, `cremet-fiskesuppe-med-majs`, `laks-med-sproed-rasp`,
`gul-ris-med-laks-aerter-og-aeg`, `koteletter-med-aeble`, `cremet-ostris-med-aerter`, `koedkaal-med-makaroni`,
`jaegergryde-med-pasta`.

Sådan kommer de tilbage (Git Bash i Kogebog). Det kan gøres for de retter, der har fået et billede, resten bliver her:

1. Lav PNG'erne med Codex (faldgruben om Codex i `CLAUDE.md`: prompten på stdin), og kør
   `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik <id> [<id> ...]`.
2. `git mv docs/venter-paa-billede/<id>.json opskrifter/`, og skriv id'et i sin gruppe i `opskrifter/index.json`.
3. Tilføj `opskrifter/<id>.json` og `grafik/ret-<id>.webp` i `FILER` i `sw.js`.
4. Har retten `ugeplan: true`, så skriv id'et i `UGEPLAN`-listen i `test/test-indkoeb.js` (alfabetisk).
5. Sæt den nye `UDGAVE_INDHOLD` først og derefter `INDHOLD` (`node test/test-version.js` og `node test/test-sw.js`
   viser dem; `js/version.js` ligger selv i `FILER`). Hæv `UDGAVE`, hvis udgaven allerede er udgivet.
6. Lav stemmen til retterne (`CLAUDE.md`, «Stemmen»). `node test/test-lyd.js` viser de manglende replikker.
7. Kør e2e med `E2E_DELE=former,hele` (kommandoen står i `CLAUDE.md`). Den tjekker blandt andet, at navnene bliver
   inde i forsidens kort på 360 px. Nogle navne har en blød bindestreg (U+00AD) i det lange ord (| herunder), fx «grøntsags|omeletter» og
   «Kartoffel|tortilla». Stikker et andet navn ud, så giv det en blød bindestreg på samme måde.

Hvad billederne skal vise (samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede
tallerken med brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder, bestik eller spisepinde, ingen chili
og ingen nødder). Står der skål, pande, bradepande eller fad, tegnes den i stedet for tallerkenen:

- `sproed-kylling-i-rasp`: tre gyldne kyllingestykker i sprød rasp (ét skåret over, så det hvide kød ses), små kogte
  kartofler, ærter og agurkeskiver.
- `foldet-fladbroed-med-ost`: to foldede fuldkornstortillas ristet gyldne; den ene skåret i to, så smeltet ost,
  skinke, majs og spinat ses; gulerods- og agurkestave ved siden af.
- `kyllingetaerte-med-butterdej`: rundt cremefarvet tærtefad med to små hanke og pustet gyldent butterdejslåg; ét
  stykke taget ud, så det cremede fyld med kylling, ærter, gulerodstern og champignon ses.
- `fisketacos-med-majs`: to bløde hvedetortillas foldet som tacos med gyldne stykker stegt hvid fisk, strimlet
  salat, majs og agurketern under en stribe hvid yoghurtdressing.
- `smash-burgere-med-ost`: to burgere i fuldkornsboller uden sesam med tynd, sprød bøf, smeltet ost, salat, tomat og agurk; den
  ene åben med toppen ved siden af; et par gulerodsstave.
- `kylling-med-boenner-og-spinat`: grå pande med gyldne kyllingestykker, hvide bønner og spinat i let cremet sovs med
  halve cherrytomater.
- `cremet-fiskesuppe-med-majs`: dyb tallerken med cremet, lysegul suppe med hvid fisk, majs, kartoffel- og
  gulerodstern; to skiver grovbrød på kanten.
- `laks-med-sproed-rasp`: to laksefileter med gylden rasp på toppen, groft moste kartofler med grønne ærter og en
  citronbåd.
- `gul-ris-med-laks-aerter-og-aeg`: grå pande med mild gul ris, flager af varmrøget laks, mange ærter og otte halve
  kogte æg på toppen.
- `koteletter-med-aeble`: to gyldne svinekoteletter med tynd fedtkant, bløde æblebåde med rød skræl, små kogte
  kartofler, grønne bønner og lidt lysebrun pandesovs.
- `cremet-ostris-med-aerter`: rund cremefarvet skål med cremet, blank ris med ærter og revet ost på toppen.
- `frossen-yoghurt-med-baer`: rund cremefarvet skål med tre kugler lyserød frossen yoghurt med mørkerøde bærstriber og
  hele blåbær omkring; ingen vaffel, krymmel eller nødder.
- `koedkaal-med-makaroni`: makaroni med hvidkålsstrimler, gulerodsstykker og brunet hakket oksekød i mild gul-orange
  karry-tomatsovs.
- `jaegergryde-med-pasta`: penne i den ene side og cremet, lys orange paprikasovs med hakket svinekød,
  champignonskiver, bløde baconstykker og et par cocktailpølser i den anden.
