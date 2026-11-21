# Appen åbner hos de voksne (idé 21-11-2026, venter på Jimmys «ja»)

Jimmy 21-11 kl. 14:36: «voksne loggede ind på voksensiden, og så kunne man vise børnene opskrifterne den vej». I dag åbner appen altid på børnenes forside, og de voksne skal holde «Voksne» i 2 s.

## Hvad der er gjort, og hvad der mangler

| Dato | Hvad | Udgave |
|---|---|---|
| 31-10 | Jimmy ønsker en forældredel med «login» | v3 (01-11) |
| 10-11 | Fables plan «vend appen om» (`fable-foraeldrekogebog-2026-11-10.md`). Planen beholder børnenes forside som start | — |
| 14-11 | Jimmys «ja» → fase 1: «I dag laver vi …», én lås, menuen Uge · Indkøb · Retter | v10 |
| 15-11 | Voksendelens forside er ugeplanen | v11 |
| — | Fase 2 (én liste, faner, `kog-familie` v2): venter på «ja» siden 14-11 | — |
| — | **Appen åbner hos de voksne:** aldrig planlagt før i dag | — |

## Forslag: appen husker, hvem enheden er til

- **Første start:** et spørgsmål med to store billeder: «Voksen» eller «Børn».
- **Voksen-enhed (Jimmys telefon):** appen åbner på ugeplanen. Der er intet hold.
- **Ny knap «Børnenes køkken»** øverst i voksendelen. Den skifter til børnenes forside, og enheden bliver i børnetilstand, til en voksen holder «Voksne» i 2 s (som nu).
- **«Vis børnene»** på en dag i ugeplanen åbner retten trin for trin med oplæsning, og enheden står i børnetilstand bagefter.
- **Pigernes iPads** står i børnetilstand og åbner som i dag. Låsen vender samme vej som nu: børnene kan ikke komme ind i voksendelen.

## Data (regel 5)

- Ny lille nøgle `kog-enhed-v1` = `{ v:1, tilstand:'voksen'|'boern' }`. Ingen eksisterende nøgle ændres.
- Mangler nøglen (alle, der har appen i dag), åbner appen som nu på børnenes forside, til nogen vælger. Intet forsvinder.
- Nøglen følger ikke med links (fase 4), for den hører til enheden.

## Hvordan og hvornår

- Kan bygges alene (S–M) eller sammen med fase 2 som v15 «forældreappen». Fase 2's faner Uge · Indkøb · Retter · Mere bliver så appens hovedmenu.
- Review: ny nøgle = brugerdata → review-workflowet. Det kører først efter ugekvotens nulstilling og kun, når Jimmy er til stede.
- Kræver: Jimmys «ja» til den nye nøgle (og til fase 2, hvis de tages sammen) og hans push af v14 først.

## Åbne spørgsmål

1. Åbner pigerne selv Tumbi på deres egne iPads, eller kun når du giver dem din?
2. Fase 2 med i samme omgang?
