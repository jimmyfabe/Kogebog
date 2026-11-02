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

## Venter nu: 15 retter til julemiddag, nytår og is (02-11-2026)

De 10 første skal stå i gruppen `jul` efter `andebryst-med-aebler-og-svesker` i denne rækkefølge, og de 5 isdesserter
sidst i `soede-sager`. Ingen af dem har `ugeplan`. Gruppen `jul` skal hedde «Jul og nytår», når de kommer ind (ny
replik `faelles/gruppe-jul`, så det kræver Røst).

| id | Gruppe | Billedet viser |
|---|---|---|
| `brun-sovs-til-julemiddagen` | jul | Sovseskål med blank, mellembrun sovs og en lille hvirvel af fløde |
| `waldorfsalat` | jul | Skål med æbletern, halve grønne vindruer og bladselleri i cremet dressing (ingen nødder) |
| `tarteletter-med-hoens-i-asparges` | jul | 3 tarteletter med cremet fyld, kylling og hvide asparges |
| `aebleskiver-med-hindbaersauce` | jul | 5 æbleskiver med lidt flormelis og en lille skål hindbærsauce |
| `hasselbagte-kartofler` | jul | 4 hasselbagte kartofler med viftede skiver og gylden rasp |
| `lille-kransekagetaarn` | jul | Kransekagetårn oppefra: 8 ringe som cirkler, hvide glasurzigzag, to røde flag uden tekst |
| `boernebobler` | jul | 2 glas lysegul boblende drik med isterninger med frosne bær |
| `nytaarstorsk-med-sennepssovs` | jul | Bagte torskestykker, små kartofler, skål sennepssovs og rødbedeskiver |
| `raket-frugtspyd` | jul | 4 frugtspyd som raketter ved en lille skål yoghurt med krymmel |
| `fyrvaerkeri-muffins` | jul | 3 muffins med hvid glasur og farvet krymmel som fyrværkeri |
| `islagkage-med-marengs-og-baer` | soede-sager | Aflang islagkage i skiver: vanilje, rødt bærlag, marengs og blåbær |
| `is-sandwich-med-smaakager` | soede-sager | 3 is-sandwiches: cookie øverst, ring af vaniljeis og krymmel |
| `floedeis-uden-ismaskine` | soede-sager | 3 kugler vaniljeflødeis med chokoladestykker i en skål |
| `banansplit-med-chokoladesovs` | soede-sager | Aflang skål med 2 bananhalvdele, 2 kugler is, chokoladesovs og flødeskum |
| `isbombe-til-nytaar` | soede-sager | Rund isbombe med flødeskum og krymmel, et stykke skåret ud (vanilje udenpå, chokolade inden i) |

Codex-prompterne står sidst i samme `retter.txt` (`koer-codex.sh` springer færdige billeder over). Åbne valg fra
reviewet: tarteletternes antal stk. i Remas pakke er ikke bekræftet, og navnene med lange ord (fx «Æbleskiver med
hindbærsauce») tjekkes i e2e (punkt 7).

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
