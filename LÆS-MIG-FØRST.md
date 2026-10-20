# LÆS MIG FØRST – Tumbi Køkken

**Hvad:** en lille kogebog til iPad, hvor et barn (ca. 5-9 år) og en voksen laver mad sammen. Udgives fra `main` på https://jimmyfabe.github.io/Kogebog/. Repoet ligger i `D:\Claude\Kogebog`.

## Hvor du starter

1. `STATUS.md`: hvad der er gjort, hvad der mangler, og hvad der afventer Jimmy.
2. `CLAUDE.md`: kommandoer, filer, opskriftsformatet og reglerne.
3. `docs/gennemgang.md`: plan og begrundelser. Læs den, når du skal træffe et designvalg, ikke ved hver opgave.

## Hvad du ikke må uden at spørge Jimmy

- Push, GitHub Pages, domæne eller anden udgivelse.
- Nye afhængigheder (`npm install`, pip).
- Google-stemme i børneappen. Chirp 3 HD er udelukket.
- Ændre formatet i `kog-v1` uden en migrering.
- Skrive børns navn, alder, skole, by eller fødselsdag i filer, prompter eller commit-beskeder. Skriv «børn ca. 5-9 år».
- Lægge fotos af børn i repoet.

## Hvad du skal gøre

- Kør tunge kørsler (e2e og skærmbilleder) gennem `~/.claude/tung-koersel.sh`. Er den låst, skriver du «ikke kørt: låst».
- Skriv «ikke afprøvet», hvis du ikke har kørt det. Node-tests er ikke det samme som en test i WebKit.
- Læs `CLAUDE.md` før du ændrer `sw.js` (INDHOLD) eller `js/lager.js` (gemte data).
