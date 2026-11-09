# Retter, der venter på deres billede

Validatoren kræver `grafik/ret-<id>.webp` for hver ret i `opskrifter/`, så en færdig opskrift uden billede kan ligge
her som `<id>.json` (med katalog, ikoner og varerne til indkøbslisten på plads), indtil billedet er tegnet. Skriv dens
gruppe her, og hvad billedet skal vise.

## Venter nu: 15 madpakke-retter (09-11-2026), gruppe `madpakke`

Den nye gruppe Madpakke (plan og princip: `docs/madpakke-plan-09-11-2026.md`). Gruppen står i `GRUPPER` i
`js/katalog.js`, og `grafik/gruppe-madpakke.svg` findes, men forsiden viser først knappen, når gruppen står i
`opskrifter/index.json`. Ingen af retterne har `ugeplan`. Alle er nøddefri.

| id | Billedet viser |
|---|---|
| `rugbroedsmadpakke` | Åben blå madkasse med rum: 2 rugbrødsmadder med ost og skinke, gulerods- og agurkestave, æblebåde og rosiner |
| `bolle-med-spegepoelse-og-pesto` | 2 grove boller med grøn pesto, salatblad og spegepølse, strimler af rød peberfrugt ved siden af |
| `tun-snurrer` | Ca. 9 tortillasnurrer set fra snitsiden (lys fyld, orange gulerod, grøn salat) og agurkestave |
| `pandekage-wraps-med-skinke` | 3 rullede grove pandekager skåret på skrå, så skinke, salat, peberfrugt og agurk ses |
| `tortilla-ruller-med-koedfyld` | 3 tortilla-ruller skåret over, med brunt kødfyld, majs, salat og agurk |
| `kartoffelmad-med-spegepoelse` | 2 rugbrødsmadder med groft moste kartofler, spegepølse og purløg, halve cherrytomater ved siden af |
| `pastasalat-med-squash` | Skål med fusilli, grønne squashtern, halve cherrytomater, majs og basilikumblade |
| `fiskefrikadeller-med-dilddip` | Ca. 7 små gyldne fiskefrikadeller, en lille skål hvid dip med dild og agurkestave |
| `spinattaerte` | Rund grøn spinattærte med gylden kant og halve cherrytomater, ét stykke skåret ud |
| `avocadodip-med-groentstave` | Lille skål grøn avocadodip omgivet af gulerods-, agurke- og peberfrugtstave og æblebåde |
| `farverig-raakost` | Skål med revet gulerod og æble, appelsinstykker, rosiner og grønne græskarkerner |
| `grove-sandwichboller` | 6 flade, grove boller med solsikkekerner på toppen, én skåret over |
| `havregroedsboller` | 6 runde, gyldne boller med solsikkekerner |
| `rug-pitabroed` | 4 små ovale rug-pitabrød, ét med en åben lomme |
| `skyrmuffins-med-abrikos` | 4 muffins i papirforme med orange abrikosstykker og grønne græskarkerner på toppen |

Prompterne (engelsk) står i `retter-v9.txt` i kladdemappen `kogebog-0911/v9` fra 09-11-2026. Kontrollér hvert billede:
der må ikke kunne ses mandler, nødder eller pinjekerner, og kernerne skal ligne solsikke- eller græskarkerner.

Når billederne kommer, er der disse ekstra trin ud over de almindelige nedenfor:

- Gruppen skrives i `opskrifter/index.json` efter `broed-og-pizza` (kun de retter, der har fået et billede):
  `{ "id": "madpakke", "retter": ["rugbroedsmadpakke", "bolle-med-spegepoelse-og-pesto", "tun-snurrer", "pandekage-wraps-med-skinke", "tortilla-ruller-med-koedfyld", "kartoffelmad-med-spegepoelse", "pastasalat-med-squash", "fiskefrikadeller-med-dilddip", "spinattaerte", "avocadodip-med-groentstave", "farverig-raakost", "grove-sandwichboller", "havregroedsboller", "rug-pitabroed", "skyrmuffins-med-abrikos"] },`
- I `test/test-forside.js` skal der stå `VENTER_PAA_BILLEDER = []`, og `ANTAL_RETTER` skal hæves med antallet af nye retter
  (223 + 15 = 238).
- Stemmen skal også lave `faelles/gruppe-madpakke.mp3` («Madpakke»).
- E2e: `E2E_DELE=former,hele`. Forsiden har så 11 knapper, og `former` måler gitteret til 11 knapper i 10 størrelser. Kør
  også `lyn` og `voksen`. «Rugbrødsmadpakke» og «fiskefrikadeller» har 16 bogstaver, lige så mange som
  «Gulerodssmoothie». Stikker de ud af kortet på 360 px, får de en blød bindestreg (se punkt 7).

Sådan kommer de tilbage (Git Bash i Kogebog). Det kan gøres for de retter, der har fået et billede, resten bliver her:

1. Lav PNG'erne ud fra prompterne (med den lokale billed-AI eller med Codex, se faldgruben om Codex i `CLAUDE.md`:
   prompten på stdin), og kør `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik <id> [<id> ...]`.
2. `git mv docs/venter-paa-billede/<id>.json opskrifter/`, og skriv id'et i sin gruppe i `opskrifter/index.json`.
3. Tilføj `opskrifter/<id>.json` og `grafik/ret-<id>.webp` i `FILER` i `sw.js`.
4. Har retten `ugeplan: true`, så skriv id'et i `UGEPLAN`-listen i `test/test-indkoeb.js` (alfabetisk).
5. Sæt den nye `UDGAVE_INDHOLD` først og derefter `INDHOLD` (`node test/test-version.js` og `node test/test-sw.js`
   viser dem; `js/version.js` ligger selv i `FILER`). Hæv `UDGAVE`, hvis udgaven allerede er udgivet.
6. Lav stemmen til retterne (`CLAUDE.md`, «Stemmen»). `node test/test-lyd.js` viser de manglende replikker.
7. Kør e2e med `E2E_DELE=former,hele` (kommandoen står i `CLAUDE.md`). Den tjekker blandt andet, at navnene bliver
   inde i forsidens kort på 360 px. Nogle navne har en blød bindestreg (U+00AD) i det lange ord (| herunder), fx «grøntsags|omeletter» og
   «Kartoffel|tortilla». Stikker et andet navn ud, så giv det en blød bindestreg på samme måde.

Billederne har samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede tallerken med
brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder, bestik eller spisepinde, ingen chili og ingen
nødder. Står der skål, pande, bradepande, fad eller madkasse, tegnes den i stedet for tallerkenen.
