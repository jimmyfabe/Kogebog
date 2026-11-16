# Voksendelens forside er ugeplanen (v11, 16-11-2026)

Jimmys ønske 15-11: forældredelen skal være lettere. Forsiden viser ugen, og alt andet ligger i bobler øverst. Retterne vælges i kataloget og lægges på en dag.

## Skærmene og ruterne

| Adresse | Skærm |
|---|---|
| `#/voksen` | **Forsiden:** ugens 7 dage. Udfyldt dag = billede, navn, portioner; tom dag = «+ Vælg ret». Hele ugen tom: kort hjælp og «Lad børnene vælge» (`#/uge/vaelg`). Øverst tre bobler: **Indkøbsliste** (med antal varer), **Retter**, **Mere** |
| `#/voksen/dag/<1-7>` | **Vælg-tilstand:** kataloget med søgning og filtre, kun retter fra ugeplanen. «Vælg ret til tirsdag» og Tilbage. Et tryk på «Vælg» gemmer gennem `gemPlan` og går tilbage til forsiden. Alt andet end 1-7 giver en fast fejltekst |
| `#/voksen/mere` | **Mere:** Send til telefon, Del som tekst, Print, Ny uge (hold), Børnene vælger, portioner til nye retter, retter pr. barn — og husstand, ugens udvalg, favoritter og «Mere grønt i maden» |
| `#/voksen/katalog`, `/husstand`, `/udvalg`, `/favoritter` | Uændrede |
| `#/uge` → `#/voksen`, `#/uge/dag/<n>` → `#/voksen/dag/<n>` | Gamle links sendes videre med `history.replaceState` |

**Tryk på en udfyldt dag** folder et lille ark ud under dagen (kun én ad gangen, Escape lukker): portioner −/+, «Byt ret» (vælg-tilstand), «Fjern» og «Åbn retten». Et ark i flowet frem for et modalt vindue: ingen fokusfælde at bygge, og det virker ens på iPhone og iPad.

## Det, der ikke ændres

- Gemte data: samme `kog-uge-v1`, `kog-liste-v1`, `kog-familie-v1`. Kun nye ruter og skærme.
- Låsen: alt under `#/voksen/…` er bag låsen (`laasFor`), også vælg-tilstanden og Mere. `#/indkoeb` og `#/hent` kræver den ikke.
- Børnenes del og `#/uge/vaelg…`. Voksendelen taler ikke.
- Den gamle hub og ugeoversigten (`#/uge`) forsvinder som skærme; deres knapper står på forsiden eller under Mere.
