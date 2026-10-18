# Tumbi Køkken — beskrivelse til ChatGPT

Til Jimmy: Kopiér alt under stregen ind i en ny ChatGPT-samtale. Gem de opskrifter, ChatGPT skriver som JSON, i Drev-mappen `Claude/Kogebog`, så tjekker Claude dem og lægger dem ind i appen.

---

Hej ChatGPT. Jeg vil gerne have din hjælp til «Tumbi Køkken». Det er en lille kogebogsapp, som jeg laver til børn på ca. 5-9 år og deres voksne. Læs beskrivelsen, og svar på dansk.

## Appen

- Appen er en webapp til iPad (helst i landskab) og virker også på iPhone. Den hører under brandet «Tumbi» sammen med et lære-spil.
- Et barn og en voksen laver mad sammen. Barnet kan næsten ikke læse, så hvert trin vises på sin egen skærm med et stort billede og en kort sætning, og stemmen læser sætningen op.
- **Skærmene:** På forsiden er der højst 5 store billedkort. Trykker man på en ret, vises den med et billede og «det skal I bruge». Derefter kommer retten trin for trin med knapperne igen, tilbage og næste, og til sidst en fejring med appens dyr. Den voksne kan også printe opskriften som en A4-side.
- **Voksen-hjælp:** Når der skal bruges kniv eller varme, får trinnet en orange ramme, og kok-bjørnen Bo siger «Nu hjælper den voksne».
- **Timer:** Et trin kan have en timer, som vises som en stor cirkel, og skærmen holdes tændt imens.
- **Dyre-hjælperne:** Bo er en kok-bjørn og den voksnes hjælper. Rosa er en lille ræv og barnets hjælper. Pip er et lille pindsvin, barnets hjælper nr. 2 og den, der venter.
- **De første 5 retter:** pandekager, frikadeller, kødsovs med spaghetti, boller og one pot chorizo-pasta.
- **Allergier står ikke i appen.** Der er ingen allergimærker og intet filter. Den voksne tjekker selv pakkerne.

## Hvem gør hvad

- **Claude (Anthropic) skriver al koden** og tester og udgiver appen. Du skal ikke skrive kode til appen.
- **Du leverer billeder og opskriftstekster.** Billederne laves efter en særskilt stilbibel, som jeg indsætter i en anden samtale. Opskrifterne skrives som JSON i præcis formatet nedenfor.
- Jeg (den voksne) beslutter, hvad der kommer med.

## Det vil jeg gerne have hjælp til

1. **Kommentér idéen ærligt.** Hvad ville gøre den bedre for barn og voksen sammen? Hvad er svært eller risikabelt for børn på ca. 5-9 år? Sig det også, hvis noget ikke holder.
2. **Foreslå 10 flere retter:** dansk hverdagsmad med mange trin, som barnet selv kan klare (måle, hælde, røre, ælte, forme og smage). Skriv én linje pr. ret om, hvad barnet laver, og hvad den voksne laver.
3. **Skriv nye opskrifter som JSON** i præcis formatet nedenfor, når jeg beder om en ret.

## Regler for opskrifterne

- Skriv 8-16 trin med én handling pr. trin og højst ca. 8 ord pr. sætning. Brug enkle ord og bydeform, fx «Hæld melet i skålen.».
- Det første trin er altid «Vask hænderne.». Efter rå kød eller rå æg kommer der også altid et trin med «Vask hænderne.».
- Hvert trin har præcis ét `verbum` fra denne liste, og andre verber findes ikke:
  `roere` (røre), `haelde` (hælde), `skaere` (skære), `aelte` (ælte), `rulle` (rulle til kugler), `vende` (vende på panden), `stege`, `koge`, `maale` (måle), `vaske-haender` (vaske hænder), `vente`, `smage`.
  Passer intet verbum, så vælg det nærmeste, og skriv et forslag til et nyt verbum under JSON-blokken.
- `skaere` skal have `"voksen_hjaelp": "kniv"`, og `stege`, `koge` og `vende` skal have `"voksen_hjaelp": "varme"`. Alt andet ved komfuret eller ovnen får også `"varme"`, også når barnet rører i en varm gryde.
- `timer_sek` bruges ved ventetid, stegning og kogning og er et heltal i sekunder.
- `note` er detaljer, den voksne har brug for (varme, tid, hvordan det skal se ud). Noten vises småt og på printet, men læses ikke op.
- Tal skrives med cifre og dansk komma, fx «2,5 dl». Enhederne er g, kg, dl, l, spsk, tsk, knivspids og stk.
- Tider skrives som ISO 8601, fx `PT15M` eller `PT1H10M`.
- `id` skrives med små bogstaver, tal og bindestreg, og æ, ø og å bliver til ae, oe og aa (fx `koedsovs`). `image` er altid `billeder/ret-<id>.png`.
- Skriv med dine egne ord, og kopiér aldrig tekst fra kogebøger eller hjemmesider. En ingrediensliste er fakta og må gerne ligne andres.
- Skriv ingen allergimærker, intet om «allergivenlig» og intet om helbred.
- `afproevet` er altid `false`, og `kilde` er «Egen tekst» (eller «Egen tekst, idé fra …»).
- Skriv ingen personoplysninger.

## Formatet

Formatet er schema.org/Recipe, og appens egne felter ligger under `"tumbi"`. Alle felter i eksemplet skal med, undtagen `note`, `voksen_hjaelp` og `timer_sek`, som kun bruges, hvor de passer. Her er eksemplet (det er ikke afprøvet):

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Pandekager",
  "description": "Tynde pandekager med sukker eller syltetøj.",
  "image": "billeder/ret-pandekager.png",
  "inLanguage": "da",
  "recipeYield": "4 personer (ca. 12 stk.)",
  "prepTime": "PT15M",
  "cookTime": "PT25M",
  "totalTime": "PT50M",
  "recipeIngredient": [
    "2,5 dl hvedemel",
    "1 spsk sukker",
    "1 knivspids salt",
    "3 æg",
    "4 dl mælk",
    "smør til panden"
  ],
  "tool": ["stor skål", "piskeris", "dl-mål", "kop", "pande", "paletkniv"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Vask hænderne.", "tumbi": { "verbum": "vaske-haender" } },
    { "@type": "HowToStep", "text": "Mål 2,5 dl mel.", "tumbi": { "verbum": "maale" } },
    { "@type": "HowToStep", "text": "Hæld melet i skålen.", "tumbi": { "verbum": "haelde" } },
    { "@type": "HowToStep", "text": "Hæld sukker og salt i.", "tumbi": { "verbum": "haelde" } },
    { "@type": "HowToStep", "text": "Hæld halvdelen af mælken i.", "tumbi": { "verbum": "haelde" } },
    { "@type": "HowToStep", "text": "Rør, til dejen er glat.", "tumbi": { "verbum": "roere", "note": "Brug piskeriset, så bliver der ingen klumper." } },
    { "@type": "HowToStep", "text": "Rør æggene og resten af mælken i.", "tumbi": { "verbum": "roere", "note": "Slå æggene ud i en kop først, så er det let at fiske skaller op." } },
    { "@type": "HowToStep", "text": "Vask hænderne igen.", "tumbi": { "verbum": "vaske-haender" } },
    { "@type": "HowToStep", "text": "Lad dejen hvile i 10 minutter.", "tumbi": { "verbum": "vente", "timer_sek": 600 } },
    { "@type": "HowToStep", "text": "Steg pandekagen.", "tumbi": { "verbum": "stege", "voksen_hjaelp": "varme", "timer_sek": 60, "note": "Middel varme og lidt smør på panden. Ca. 1/2 dl dej pr. pandekage." } },
    { "@type": "HowToStep", "text": "Vend pandekagen.", "tumbi": { "verbum": "vende", "voksen_hjaelp": "varme", "timer_sek": 45, "note": "Vend, når kanten slipper. Gentag med resten af dejen." } },
    { "@type": "HowToStep", "text": "Smag! Sukker eller syltetøj?", "tumbi": { "verbum": "smage" } }
  ],
  "tumbi": { "id": "pandekager", "version": 1, "afproevet": false, "kilde": "Egen tekst" }
}
```

## Sådan svarer du med en opskrift

1. Skriv én kodeblok med JSON pr. ret. Blokken indeholder kun JSON: ingen kommentarer og intet komma efter det sidste element. Skriv filnavnet `<id>.json` lige over blokken.
2. Skriv under blokken en billedprompt på engelsk til `ret-<id>.png`. Billedet skal vise retten på appens faste tallerken (rund, cremefarvet med blå kant, set skråt ovenfra) i flad vektorstil, med gennemsigtig baggrund og uden tekst.
3. Hvis du har dem, kommer derefter dine forslag til nye verber og dine spørgsmål til mig.

Tjek før du svarer, at JSON'en er gyldig, at alle felter fra eksemplet er med, at hvert verbum er fra listen, og at kniv- og varmetrinnene har `voksen_hjaelp`. Er du i tvivl om noget i appen, så spørg hellere end at gætte.
