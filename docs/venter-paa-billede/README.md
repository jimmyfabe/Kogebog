# Retter, der venter på deres billede

To færdige opskrifter fra 31-10-2026, som ligger her, indtil Codex har tegnet deres retbillede. Validatoren kræver
`grafik/ret-<id>.webp`, og Codex-kvoten slap op midt i serien 31-10-2026.

| Opskrift | Gruppe |
|---|---|
| `gulerodsboller.json` | bagning (efter `pizzasnegle`) |
| `havregrynsmuffins-med-aeble.json` | søde sager (efter `havregrynskugler`) |

Sådan kommer de tilbage (Git Bash i Kogebog):

1. Lav PNG'erne med Codex (faldgruben om Codex i `CLAUDE.md`), og kør `py -I vaerktoej/ret-billede-til-webp.py <png-mappe> grafik gulerodsboller havregrynsmuffins-med-aeble`.
2. `git mv docs/venter-paa-billede/<id>.json opskrifter/`, og skriv id'et i sin gruppe i `opskrifter/index.json`.
3. Tilføj `opskrifter/<id>.json` og `grafik/ret-<id>.webp` i `FILER` i `sw.js`, og sæt den nye `INDHOLD` og `UDGAVE_INDHOLD` (`node test/test-sw.js` og `node test/test-version.js` viser dem).
4. Lav stemmen til de to retter (`CLAUDE.md`, «Stemmen»).

Hvad billederne skal vise (samme stil som de andre retbilleder: hvid bund, set lige oppefra, husets cremefarvede
tallerken med brun kant, mørkebrune konturer, flade farver, ingen tekst, hænder eller bestik):

- `gulerodsboller.png`: seks runde, grove boller, gyldenbrune med små orange gulerodsstykker og havregryn i skorpen og
  hvide sesamfrø på toppen. Én bolle er skåret over og viser den bløde, lysebrune krumme med orange prikker.
- `havregrynsmuffins-med-aeble.png`: fem havregrynsmuffins i hvide papirforme, gyldenbrune og rustikke med synlige
  havregryn, hver med en tynd æbleskive med rød skræl på toppen og et let drys kanel.
