# Forsidens sortering (05-11-2026)

Hver ret står i præcis én gruppe i `opskrifter/index.json`. Vil du flytte en ret, så flyt dens id fra én liste til en anden dér. Intet andet skal ændres, og ugeplan, favoritter og gemte data påvirkes ikke, for de bruger rettens id.

Regel ved tvivl: hvad ville et barn kalde retten? Først pasta og nudler, så kylling, så fisk (også rejer og tun), så kød. Resten er Grønt. Kartoffelmos og æggeretter er Grønt. Bagning er Brød og pizza. Søde sager, Jul og nytår og Halloween er urørte.

## Antal pr. gruppe

Talt af en kommando fra `opskrifter/index.json`.

| Gruppe | Id | Retter |
|---|---|---|
| Pasta og nudler | `pasta-og-nudler` | 23 |
| Kylling | `kylling` | 12 |
| Fisk | `fisk` | 11 |
| Kød | `koed` | 11 |
| Grønt | `groent` | 24 |
| Brød og pizza | `broed-og-pizza` | 8 |
| Søde sager | `soede-sager` | 11 |
| Jul og nytår | `jul` | 45 |
| Halloween | `halloween` | 6 |
| **I alt** | | **151** |

De 89 retter fra de gamle grupper Aftensmad (85) og Bagning (4) er fordelt på de seks første grupper.

## Søgeordene «aftensmad» og «bagning»

«aftensmad» og chippen «Aftensmad» i voksendelen finder de fem grupper Pasta og nudler, Kylling, Fisk, Kød og Grønt: 81 retter. De 4 retter, der kom fra Aftensmad og nu står i Brød og pizza (Pladepizza med spinat og broccoli, Rugbrød med æg og makrel, Hvidløgsflutes, Foldet fladbrød med ost), findes af «bagning», ikke af «aftensmad». Står en af dem bedre i en af de fem grupper, så flyt den, og søgeordet følger med.

## Søgereglen for korte ord

Et ord på mindst 4 bogstaver må stå inde i et ord. Et ord på 3 bogstaver skal stå først eller sidst i et ord. Et ord på 1-2 bogstaver skal stå først. Undtagelser: «is» finder også ord, der slutter på «eis» (vaniljeis, flødeis), men ikke flormelis, gris eller ris. «ris» tæller ikke «gris» og «pris», «mel» ikke «krymmel» og «julekrymmel», «kål» ikke «skål» og «risskål», og «ost» ikke «frost» og «æblemost».

Træf på de 151 retter, med navn, ingredienser og gruppe som lupen (uden familiens egne mærker). Ingen ret er faldet fra. Tallene i kolonnen «Nu» er målt, før de falske træf på krymmel, skål og frost blev taget fra.

| Søgeord | Før | Nu | Det nye |
|---|---:|---:|---|
| is | 5 | 6 | vaniljeis |
| kål | 5 | 14 | blomkål, rødkål, rosenkål, hvidkål, kødkål; skål og risskål er falske |
| bær | 2 | 9 | tranebær, blåbær, kirsebær, hindbær |
| mos | 0 | 1 | kartoffelmos |
| ost | 29 | 33 | hytteost; frost og æblemost er falske |
| ris | 18 | 21 | jasminris, ostris, grødris |
| kød | 17 | 21 | grisekød, oksekød, svinekød |
| løg | 23 | 24 | hvidløg |
| mel | 3 | 48 | hvedemel, kokosmel, durummel; krymmel og julekrymmel er falske |

Enkelte falske træf er prisen for reglen: det er kun en ret for meget på listen, mens den gamle regel skjulte rigtige retter. De mest synlige står som undtagelser i `UNDTAGELSER` i `js/soeg.js`.

## «Fyld op med nye» og børnenes bladren

`index.json` står efter gruppe, så de 23 pastaretter står først. To steder afgør rækkefølgen, hvad der bliver valgt eller vist først, og dér blander `blandet` i `js/grupper.js` grupperne: skiftevis én fra hver gruppe, i fast rækkefølge og uden tilfældighed. De lister, der med vilje står efter gruppe (udvalget, kataloget), og den voksnes «Vælg ret» med filtrene er urørte. Gemte planer, favoritter og udvalg ændres ikke.

Målt på de 82 retter til ugeplanen (pasta 23, kylling 12, fisk 11, kød 10, grønt 23, brød og pizza 3):

| Første gang på børnenes sider | Pasta | Kylling | Fisk | Kød | Grønt | Brød og pizza |
|---|---|---|---|---|---|---|
| Før | 1 | 6 | 9 | 12 | 15 | 20 |
| Nu | 1 | 1 | 1 | 1 | 2 | 2 |

## Tvivlsretter

Det er her, Jimmy lettest kan være uenig. Begrundelsen er kort.

| Ret | Står i | Hvorfor |
|---|---|---|
| Kødboller i tomatsovs med spaghetti (`koedboller-i-tomatsovs`) | Pasta og nudler | spaghetti på tallerkenen |
| Kyllinge-nudelsuppe (`kyllinge-nudelsuppe`) | Pasta og nudler | nudler kommer før kylling |
| Fiskelasagne med spinat (`fiskelasagne`) | Pasta og nudler | lasagne er pasta |
| Gnocchi med tomat, spinat og mozzarella (`gnocchi-med-tomat-spinat-og-mozzarella`) | Pasta og nudler | barnet ser pasta |
| Kødkål med makaroni (`koedkaal-med-makaroni`) | Pasta og nudler | makaroni kommer før kød |
| Lun tunpasta med ærter og majs (`lun-tunpasta`) | Pasta og nudler | pasta kommer før fisk |
| Pasta med laks, spinat og citron (`pasta-med-laks-spinat-og-citron`) | Pasta og nudler | pasta kommer før fisk |
| Spaghetti chow mein med kylling (`spaghetti-chow-mein-med-kylling`) | Pasta og nudler | spaghetti i wok |
| Minestrone med suppehorn og bønner (`minestrone`) | Grønt | har suppehorn, men barnet siger suppe |
| Taco-bradepande (`taco-bradepande`) | Grønt | intet kød |
| Ovnæggekage med ærter, spinat og bacon (`ovnaeggekage`) | Grønt | æggeret, selv om der er bacon |
| Japansk kålpandekage med skinke (`okonomiyaki-med-spidskaal`) | Grønt | kålpandekage, selv om der er skinke |
| Grøn porre-kartoffelsuppe med bacondrys (`groen-porre-kartoffelsuppe-med-bacondrys`) | Grønt | bacon er kun drys |
| Ovnpandekage med spinat og hytteost (`ovnpandekage`) | Grønt | æggeret |
| Kinesiske grøntsagsomeletter (`egg-foo-young-med-ris`) | Grønt | æggeret |
| Bagte kartofler med bønner og majs (`bagte-kartofler-med-fyld`) | Grønt | kartofler |
| Flødekartofler i fad med skinke og broccoli (`floedekartofler-med-skinke-og-broccoli`) | Kød | skinken er det, barnet nævner |
| Koreansk risskål med kød og spejlæg (`mild-bibimbap-risskaal`) | Kød | risret med kød |
| Rugbrød med æg og makrel (`rugbroedsaften`) | Brød og pizza | rugbrød, selv om der er makrel |
| Foldet fladbrød med ost (`foldet-fladbroed-med-ost`) | Brød og pizza | brød, selv om der er skinke |
| Pizzasnegle (`pizzasnegle`) | Brød og pizza | barnet siger pizza, og den kom fra Bagning |

## Alle retter

### Pasta og nudler (23)

- Kødsovs med spaghetti (`koedsovs`)
- Chorizo-pasta (`chorizo-pasta`)
- One pot bolognese (`bolognese-one-pot`)
- Cremet kødsovs (`cremet-koedsovs`)
- One pot tomatpasta (`one-pot-tomatpasta`)
- Linsebolognese (`linsebolognese`)
- Halv-halv kødsovs (`halv-halv-koedsovs`)
- Wok med nudler og hakket gris (`wok-med-nudler`)
- Kødboller i tomatsovs med spaghetti (`koedboller-i-tomatsovs`)
- Pastagratin med kødsovs og spinat (`pastagratin`)
- One pot makaroni med ost (`one-pot-makaroni`)
- Lun tunpasta med ærter og majs (`lun-tunpasta`)
- Kyllinge-nudelsuppe (`kyllinge-nudelsuppe`)
- Fiskelasagne med spinat (`fiskelasagne`)
- Gyoza med nudler og wokgrøntsager (`gyoza-med-noedler-og-groent`)
- Orange pasta med hemmelig grøntsagssovs (`orange-pasta-med-hemmelig-groentsagssovs`)
- Cremet carbonara med ærter (`cremet-carbonara-med-aerter-uden-raa-aeg`)
- Gnocchi med tomat, spinat og mozzarella (`gnocchi-med-tomat-spinat-og-mozzarella`)
- Grøn pestopasta med broccoli (`groen-pesto-pasta-med-broccoli-og-aerter`)
- Pasta med laks, spinat og citron (`pasta-med-laks-spinat-og-citron`)
- Spaghetti chow mein med kylling (`spaghetti-chow-mein-med-kylling`)
- Kødkål med makaroni (`koedkaal-med-makaroni`)
- Jægergryde med pasta (`jaegergryde-med-pasta`)

### Kylling (12)

- Kylling i bradepande (`bradepandekylling`)
- Mild kyllingekarry med ris (`kyllingekarry`)
- Frikadeller af kylling (`kyllingefrikadeller`)
- Gryderis med kylling, ærter og majs (`gryderis-med-kylling`)
- Bradepande-fajitas med kylling (`bradepande-fajitas`)
- Bakkeret med kartofler og kylling (`bakkeret-knuste-kartofler-og-kylling`)
- Kylling-salatbåde med ris (`kylling-salatbaade-med-ris`)
- Sød-sur kylling med ananas og ris (`soed-sur-kylling-med-ananas`)
- Teriyaki-kylling med broccoli og ris (`teriyaki-kylling-med-broccoli`)
- Sprød kylling i rasp (`sproed-kylling-i-rasp`)
- Kyllingetærte med butterdej (`kyllingetaerte-med-butterdej`)
- Kylling med bønner og spinat (`kylling-med-boenner-og-spinat`)

### Fisk (11)

- Tunfrikadeller (`tunfrikadeller`)
- Fiskepinde med kartoffelbåde (`fiskepinde-med-baade`)
- Fiskefars i fad med spinat (`fiskefars-i-fad`)
- Laksepakker med broccoli og kartofler (`fiskepakker-med-laks`)
- Fisk i tomatfad med bønner og brune ris (`fisk-i-tomatfad`)
- Milde asiatiske fiskefrikadeller med ris (`milde-asiatiske-fiskefrikadeller`)
- Sushi-skål med tun, agurk og majs (`sushi-bowl-med-tun`)
- Fisketacos med majs (`fisketacos-med-majs`)
- Cremet fiskesuppe med majs (`cremet-fiskesuppe-med-majs`)
- Laks med sprød rasp (`laks-med-sproed-rasp`)
- Gul ris med laks, ærter og æg (`gul-ris-med-laks-aerter-og-aeg`)

### Kød (11)

- Frikadeller (`frikadeller`)
- Chili con carne med ris (`chili-con-carne`)
- Medister i ovn med rosenkål og kartofler (`medister-i-ovn`)
- Pølse-bønnegryde med ris (`poelse-boennegryde`)
- Hyrdetærte med kartoffelskiver (`hyrdetaerte`)
- Flødekartofler i fad med skinke og broccoli (`floedekartofler-med-skinke-og-broccoli`)
- Hoisin-gris med ris, agurk og ærter (`hoisin-gris-med-ris-og-agurk`)
- Honning-soja-kødboller med ris og agurk (`honning-soja-koedboller`)
- Koreansk risskål med kød og spejlæg (`mild-bibimbap-risskaal`)
- Smash-burgere med ost (`smash-burgere-med-ost`)
- Koteletter med æble (`koteletter-med-aeble`)

### Grønt (24)

- Taco-bradepande (`taco-bradepande`)
- Ovnæggekage med ærter, spinat og bacon (`ovnaeggekage`)
- Tomatsuppe med bønner (`tomatsuppe-med-boenner`)
- Minestrone med suppehorn og bønner (`minestrone`)
- Wraps med bønnefyld og kålsalat (`wraps-med-boenner`)
- Rød linse-dhal med spinat og naan (`linse-dhal`)
- Ovnpandekage med spinat og hytteost (`ovnpandekage`)
- Blomkål med bulgur (`ovnbagt-blomkaal`)
- Kartoffelmos (`kartoffelmos`)
- Mild shakshuka med bønner og æg (`shakshuka-med-boenner`)
- Gulerodssuppe med røde linser (`gulerodssuppe-med-linser`)
- Kikærteboller i karry med brune ris (`kikaerteboller-i-karry`)
- Kikærteburger i fuldkornsbolle (`kikaerteburger`)
- Bagte kartofler med bønner og majs (`bagte-kartofler-med-fyld`)
- Vegetarbiks med grønt og spejlæg (`vegetar-biks`)
- Kålpandekager med gulerod og majs (`kaalpandekager`)
- Japansk kålpandekage med skinke (`okonomiyaki-med-spidskaal`)
- Kinesiske grøntsagsomeletter (`egg-foo-young-med-ris`)
- Grøn porre-kartoffelsuppe med bacondrys (`groen-porre-kartoffelsuppe-med-bacondrys`)
- Kartoffel-gulerods-rösti med skyrdip (`kartoffel-gulerods-roesti-med-skyrdip`)
- Kartoffeltortilla med ærter og spinat (`kartoffeltortilla-med-aerter-og-spinat`)
- Mild kartoffelkarry med kokos og ærter (`mild-kartoffelkarry-med-kokos-og-aerter`)
- Stegte ris fra i går med æg, ærter og majs (`stegte-ris-med-aeg-aerter-og-majs`)
- Cremet ostris med ærter (`cremet-ostris-med-aerter`)

### Brød og pizza (8)

- Pladepizza med spinat og broccoli (`pladepizza`)
- Rugbrød med æg og makrel (`rugbroedsaften`)
- Hvidløgsflutes (`hvidloegsflutes`)
- Foldet fladbrød med ost (`foldet-fladbroed-med-ost`)
- Boller (`boller`), fra Bagning
- Hytteostboller (`hytteostboller`), fra Bagning
- Pizzasnegle (`pizzasnegle`), fra Bagning
- Grove gulerodsboller til madpakken (`gulerodsboller`), fra Bagning

### Søde sager (11)

Urørt: gruppen stod sådan før.

- Tynde pandekager (`pandekager`)
- Brownie (`brownie`)
- Blondie (`blondie`)
- Havregrynskugler (`havregrynskugler`)
- Havregrynsmuffins med æble og kanel (`havregrynsmuffins-med-aeble`)
- Frossen yoghurt med bær (`frossen-yoghurt-med-baer`)
- Islagkage med marengs og bær (`islagkage-med-marengs-og-baer`)
- Is-sandwich med småkager (`is-sandwich-med-smaakager`)
- Flødeis uden ismaskine (`floedeis-uden-ismaskine`)
- Banansplit med chokoladesovs (`banansplit-med-chokoladesovs`)
- Isbombe til nytår (`isbombe-til-nytaar`)

### Jul og nytår (45)

Urørt: gruppen stod sådan før.

- Pebernødder (`pebernoedder`)
- Jødekager (`joedekager`)
- Sirupskager til juletræet (`sirupskager-til-juletraeet`)
- Vrøvl (`vroevl`)
- Finskbrød (`finskbroed`)
- Flødekranse med kanelsukker (`floedekranse-med-kanelsukker`)
- Rullede vaniljekranse (`rullede-vaniljekranse`)
- Sneglekager (`sneglekager`)
- Honninghjerter (`honninghjerter`)
- Fedtebrød (`fedtebroed`)
- Små engelske juletærter (`smaa-engelske-juletaerter`)
- Julekage med gær og rosiner (`julekage-med-gaer-og-rosiner`)
- Marcipangrise (`marcipangrise`)
- Marcipankonfekt med dadler og valnødder (`marcipankonfekt-med-dadler-og-valnoedder`)
- Pebernøddekugler (`pebernoeddekugler`)
- Chokoladetaler med julepynt (`chokoladetaler-med-julepynt`)
- Rocky road til jul (`rocky-road-til-jul`)
- Kransekagestykker (`kransekagestykker`)
- Børnegløgg (`boernegloegg`)
- Risalamande med kirsebærsauce (`risalamande-med-kirsebaersauce`)
- Risengrød i ovn (`risengroed-i-ovn`)
- Juletrifli med pebernødder og kirsebær (`juletrifli-med-pebernoedder-og-kirsebaer`)
- Gammeldags æblekage i glas (`gammeldags-aeblekage`)
- Bagte juleæbler med marcipan (`bagte-juleaebler-med-marcipan`)
- Æg og rejer (`aeg-og-rejer`)
- Små julemedisterboller (`julemedisterboller`)
- Glaseret juleskinke (`glaseret-juleskinke-af-hamburgerryg`)
- Rødkålssalat med appelsin (`roedkaalssalat-med-appelsin`)
- Lun leverpostej med bacon og svampe (`lun-leverpostej-med-bacon-og-svampe`)
- Hjemmelavet rødkål (`hjemmelavet-roedkaal`)
- Flæskesteg med sprød svær (`flaeskesteg-med-sproed-svaer`)
- Æbleflæsk på bradepande (`aebleflaesk`)
- Brunede kartofler (`brunede-kartofler`)
- Små grise i dyner (`smaa-grise-i-dyner`)
- Andebryst med æbler og svesker (`andebryst-med-aebler-og-svesker`)
- Brun sovs til julemiddagen (`brun-sovs-til-julemiddagen`)
- Waldorfsalat (`waldorfsalat`)
- Tarteletter med høns i asparges (`tarteletter-med-hoens-i-asparges`)
- Æbleskiver med hindbærsauce (`aebleskiver-med-hindbaersauce`)
- Hasselbagte kartofler (`hasselbagte-kartofler`)
- Lille kransekagetårn (`lille-kransekagetaarn`)
- Børnebobler (`boernebobler`)
- Nytårstorsk med sennepssovs (`nytaarstorsk-med-sennepssovs`)
- Raket-frugtspyd (`raket-frugtspyd`)
- Fyrværkeri-muffins (`fyrvaerkeri-muffins`)

### Halloween (6)

Urørt: gruppen stod sådan før.

- Mumiepølser (`mumiepoelser`)
- Edderkoppeboller (`edderkoppeboller`)
- Øjeboller (`oejeboller`)
- Græskar-calzone (`graeskar-calzone`)
- Heksefingre (`heksefingre`)
- Slimsnegle (`slimsnegle`)
