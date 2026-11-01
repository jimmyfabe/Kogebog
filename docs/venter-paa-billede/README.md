# Retter, der venter på deres billede

Validatoren kræver `grafik/ret-<id>.webp` for hver ret i `opskrifter/`, så en færdig opskrift uden billede kan ligge
her som `<id>.json` (med katalog, ikoner og varerne til indkøbslisten på plads), indtil Codex har tegnet den. Skriv dens
gruppe her, og hvad billedet skal vise.

## Venter nu: 11 julebordsretter (01-11-2026), gruppe `jul`

Codex-kvoten løb tør kl. 21:07, før julebordsretterne var tegnet. De skal stå sidst i gruppen `jul` i `index.json`, i
denne rækkefølge (efter `bagte-juleaebler-med-marcipan`). Ingen af dem har `ugeplan`.

| id | Billedet viser |
|---|---|
| `aeg-og-rejer` | 3 skiver rugbrød med skiver af hårdkogt æg, lidt mayonnaise, pillede rejer, dild og en citronbåd |
| `julemedisterboller` | Ca. 14 små gyldenbrune medisterboller |
| `glaseret-juleskinke-af-hamburgerryg` | Hamburgerryg med fedtet ridset i ruder, en nellike i hver rude, blank appelsinglasur, et par skiver skåret ud |
| `roedkaalssalat-med-appelsin` | Skål med fintsnittet rå rødkål, appelsinstykker og tranebær |
| `lun-leverpostej-med-bacon-og-svampe` | Leverpostej i alubakke med sprød bacon og svampe, en skive rugbrød og rødbeder ved siden af |
| `hjemmelavet-roedkaal` | Gryde med blank rødkål, to laurbærblade og en kanelstang (begge hanke inde i billedet) |
| `flaeskesteg-med-sproed-svaer` | Flæskesteg med sprød svær i striber, laurbær og nelliker i rillerne, et par skiver skåret ud |
| `aebleflaesk` | Sprøde skiver stegeflæsk ved en bunke bløde gyldne æblestykker og en skive rugbrød |
| `brunede-kartofler` | Pande med små pillede kartofler i blank gyldenbrun karamel (hele panden og skaftet inde i billedet) |
| `smaa-grise-i-dyner` | Ca. 12 cocktailpølser rullet ind i bacon, gyldne og blanke |
| `andebryst-med-aebler-og-svesker` | 2 andebryster i skiver (lyserødt kød, sprødt skind) på bagte æblebåde og svesker |

Codex-prompterne (engelsk) står i `retter.txt` i kladdemappen `jul-billeder` fra 01-11-2026.

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

Billederne har samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede tallerken med
brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder, bestik eller spisepinde, ingen chili og ingen
nødder. Står der skål, pande, bradepande eller fad, tegnes den i stedet for tallerkenen.
