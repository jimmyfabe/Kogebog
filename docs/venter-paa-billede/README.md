# Retter, der venter på deres billede

Validatoren kræver `grafik/ret-<id>.webp` for hver ret i `opskrifter/`, så en færdig opskrift uden billede kan ligge
her som `<id>.json` (med katalog, ikoner og varerne til indkøbslisten på plads), indtil billedet er tegnet. Skriv dens
gruppe her, og hvad billedet skal vise.

Der venter ingen retter nu (16-11-2026: de ni ris-, pasta- og karryretter fra v11 har fået billede og står i `opskrifter/`; de fem brød- og naanretter fik billede 15-11-2026).

Sådan kommer de tilbage (Git Bash i Kogebog). Det kan gøres for de retter, der har fået et billede, resten bliver her:

1. Lav PNG'erne ud fra prompterne (med den lokale billed-AI eller med Codex, se faldgruben om Codex i `CLAUDE.md`:
   prompten på stdin), og kør `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik <id> [<id> ...]`.
2. `git mv docs/venter-paa-billede/<id>.json opskrifter/`, og skriv id'et i sin gruppe i `opskrifter/index.json`.
3. Tilføj `opskrifter/<id>.json` og `grafik/ret-<id>.webp` i `FILER` i `sw.js`.
4. Har retten `ugeplan: true`, så skriv id'et i `UGEPLAN`-listen i `test/test-indkoeb.js` (alfabetisk).
   Hæv altid (også uden ugeplan) tallene i `test/test-forside.js`: `ANTAL_RETTER`, `ANTAL_PLANLAGTE` og retterne i «Aftensmad» (`/85/`) og
   testnavnene med de samme tal (16-11-2026: med alle ni v11-retter fejler fire tests der, til tallene er hævet).
5. Sæt den nye `UDGAVE_INDHOLD` først og derefter `INDHOLD` (`node test/test-version.js` og `node test/test-sw.js`
   viser dem; `js/version.js` ligger selv i `FILER`). Hæv `UDGAVE`, hvis udgaven allerede er udgivet.
6. Lav stemmen til retterne (`CLAUDE.md`, «Stemmen»). `node test/test-lyd.js` viser de manglende replikker.
7. Kør e2e med `E2E_DELE=former,hele` (kommandoen står i `CLAUDE.md`). Den tjekker blandt andet, at navnene bliver
   inde i forsidens kort på 360 px. Nogle navne har en blød bindestreg (U+00AD) i det lange ord (| herunder), fx «grøntsags|omeletter» og
   «Kartoffel|tortilla». Stikker et andet navn ud, så giv det en blød bindestreg på samme måde.

Billederne har samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede tallerken med
brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder, bestik eller spisepinde, ingen chili og ingen
nødder. Står der skål, pande, bradepande, fad eller madkasse, tegnes den i stedet for tallerkenen.
