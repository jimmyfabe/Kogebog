/* sw.js — service worker for Tumbi Køkken (scope './'), så kogebogen virker i køkkenet uden net.
   Samme origin som Lystårnet («mat-») og LEGO («lego-»): denne fil rører KUN caches, der starter med «kog-».
   Opskrifterne (opskrifter/*.json og lyd/liste.json) hentes netværk først, så en rettet opskrift slår igennem;
   alt andet er cache først, så en ændret fil kun når ud til enhederne, hvis cachens navn (VERSION) skifter.
   Derfor er VERSION bygget af INDHOLD: et tal for alle FILER. Lydfilerne ligger i deres egen cache (LYD_CACHE, bygget af
   LYD: et tal for lydfilerne), så en ændring i appen ikke sletter den lyd, iPad'en allerede har gemt.
   test/test-sw.js tjekker, at FILER er komplet, og fejler, når en fil er ændret. Fejlbeskeden viser den nye værdi;
   testen ændrer ikke sw.js, så den sættes her i hånden.
   Svarer nettet ikke inden for HENT_MS (4 s), kommer en opskrift (også index.json) fra cachen, og nettets svar gemmes
   til næste gang. De næste LANGSOM_MS (30 s) tager opskrifterne cachen med det samme (code review U3 og F2, 23-10). */
const PRAEFIKS = 'kog-';
const INDHOLD = 'b45f701197639e3d'; // sha256 (16 tegn) af FILER — sæt den værdi, test/test-sw.js viser i fejlbeskeden
const VERSION = PRAEFIKS + INDHOLD;
const LYD = '7b503e0be6847e32'; // sha256 (16 tegn) af lydfilerne (lyd/*/*.mp3) — sæt den værdi, test/test-sw.js viser
const LYD_CACHE = PRAEFIKS + 'lyd-' + LYD;
const HENT_MS = 4000; // så længe venter en lydfil (før iPad-stemmen tager over) eller en opskrift (før cachen) på nettet
const LANGSOM_MS = 30000; // så længe tager opskrifterne cachen med det samme, efter at nettet ikke svarede inden for HENT_MS
const FILER = [
  './',
  'index.html',
  'print.html',
  'app.js',
  'app.css',
  'familie.css',
  'print.css',
  'manifest.webmanifest',
  'js/katalog.js',
  'js/tid.js',
  'js/tekst.js',
  'js/model.js',
  'js/groent.js',
  'js/dom.js',
  'js/lager.js',
  'js/replikker.js',
  'js/tale.js',
  'js/timer.js',
  'js/hold.js',
  'js/voksen.js',
  'js/data.js',
  'js/print.js',
  'js/print-uge.js',
  'js/print-flere.js',
  'js/indkoeb.js',
  'js/plankode.js',
  'js/ugeplan.js',
  'js/skaler.js',
  'js/maerker.js',
  'js/soeg.js',
  'js/grupper.js',
  'js/voksen-del.js',
  'js/version.js',
  'opskrifter/index.json',
  'opskrifter/pandekager.json',
  'opskrifter/frikadeller.json',
  'opskrifter/koedsovs.json',
  'opskrifter/boller.json',
  'opskrifter/chorizo-pasta.json',
  'opskrifter/kartoffelmos.json',
  'opskrifter/hvidloegsflutes.json',
  'opskrifter/brownie.json',
  'opskrifter/blondie.json',
  'opskrifter/hytteostboller.json',
  'opskrifter/havregrynskugler.json',
  'opskrifter/tunfrikadeller.json',
  'opskrifter/pizzasnegle.json',
  'opskrifter/mumiepoelser.json',
  'opskrifter/edderkoppeboller.json',
  'opskrifter/oejeboller.json',
  'opskrifter/graeskar-calzone.json',
  'opskrifter/heksefingre.json',
  'opskrifter/slimsnegle.json',
  'opskrifter/bolognese-one-pot.json',
  'opskrifter/cremet-koedsovs.json',
  'opskrifter/one-pot-tomatpasta.json',
  'opskrifter/linsebolognese.json',
  'opskrifter/halv-halv-koedsovs.json',
  'opskrifter/chili-con-carne.json',
  'opskrifter/taco-bradepande.json',
  'opskrifter/pladepizza.json',
  'opskrifter/fiskepinde-med-baade.json',
  'opskrifter/fiskefars-i-fad.json',
  'opskrifter/bradepandekylling.json',
  'opskrifter/kyllingekarry.json',
  'opskrifter/wok-med-nudler.json',
  'opskrifter/ovnaeggekage.json',
  'opskrifter/tomatsuppe-med-boenner.json',
  'opskrifter/minestrone.json',
  'opskrifter/koedboller-i-tomatsovs.json',
  'opskrifter/medister-i-ovn.json',
  'opskrifter/poelse-boennegryde.json',
  'opskrifter/kyllingefrikadeller.json',
  'opskrifter/wraps-med-boenner.json',
  'opskrifter/gryderis-med-kylling.json',
  'opskrifter/linse-dhal.json',
  'opskrifter/hyrdetaerte.json',
  'opskrifter/pastagratin.json',
  'opskrifter/one-pot-makaroni.json',
  'opskrifter/lun-tunpasta.json',
  'opskrifter/ovnpandekage.json',
  'opskrifter/kyllinge-nudelsuppe.json',
  'opskrifter/rugbroedsaften.json',
  'opskrifter/ovnbagt-blomkaal.json',
  'opskrifter/bradepande-fajitas.json',
  'opskrifter/fiskepakker-med-laks.json',
  'opskrifter/fisk-i-tomatfad.json',
  'opskrifter/fiskelasagne.json',
  'opskrifter/shakshuka-med-boenner.json',
  'opskrifter/gulerodssuppe-med-linser.json',
  'opskrifter/kikaerteboller-i-karry.json',
  'opskrifter/kikaerteburger.json',
  'opskrifter/bagte-kartofler-med-fyld.json',
  'opskrifter/vegetar-biks.json',
  'opskrifter/kaalpandekager.json',
  'opskrifter/gulerodsboller.json',
  'opskrifter/havregrynsmuffins-med-aeble.json',
  'opskrifter/bakkeret-knuste-kartofler-og-kylling.json',
  'opskrifter/gyoza-med-noedler-og-groent.json',
  'opskrifter/milde-asiatiske-fiskefrikadeller.json',
  'opskrifter/okonomiyaki-med-spidskaal.json',
  'opskrifter/orange-pasta-med-hemmelig-groentsagssovs.json',
  'opskrifter/cremet-carbonara-med-aerter-uden-raa-aeg.json',
  'opskrifter/egg-foo-young-med-ris.json',
  'opskrifter/floedekartofler-med-skinke-og-broccoli.json',
  'opskrifter/gnocchi-med-tomat-spinat-og-mozzarella.json',
  'opskrifter/groen-pesto-pasta-med-broccoli-og-aerter.json',
  'opskrifter/groen-porre-kartoffelsuppe-med-bacondrys.json',
  'opskrifter/hoisin-gris-med-ris-og-agurk.json',
  'opskrifter/honning-soja-koedboller.json',
  'opskrifter/kartoffel-gulerods-roesti-med-skyrdip.json',
  'opskrifter/kartoffeltortilla-med-aerter-og-spinat.json',
  'opskrifter/kylling-salatbaade-med-ris.json',
  'opskrifter/mild-bibimbap-risskaal.json',
  'opskrifter/mild-kartoffelkarry-med-kokos-og-aerter.json',
  'opskrifter/pasta-med-laks-spinat-og-citron.json',
  'opskrifter/soed-sur-kylling-med-ananas.json',
  'opskrifter/spaghetti-chow-mein-med-kylling.json',
  'opskrifter/stegte-ris-med-aeg-aerter-og-majs.json',
  'opskrifter/sushi-bowl-med-tun.json',
  'opskrifter/teriyaki-kylling-med-broccoli.json',
  'opskrifter/sproed-kylling-i-rasp.json',
  'opskrifter/foldet-fladbroed-med-ost.json',
  'opskrifter/kyllingetaerte-med-butterdej.json',
  'opskrifter/fisketacos-med-majs.json',
  'opskrifter/smash-burgere-med-ost.json',
  'opskrifter/kylling-med-boenner-og-spinat.json',
  'opskrifter/cremet-fiskesuppe-med-majs.json',
  'opskrifter/laks-med-sproed-rasp.json',
  'opskrifter/gul-ris-med-laks-aerter-og-aeg.json',
  'opskrifter/koteletter-med-aeble.json',
  'opskrifter/cremet-ostris-med-aerter.json',
  'opskrifter/koedkaal-med-makaroni.json',
  'opskrifter/jaegergryde-med-pasta.json',
  'opskrifter/frossen-yoghurt-med-baer.json',
  'opskrifter/islagkage-med-marengs-og-baer.json',
  'opskrifter/is-sandwich-med-smaakager.json',
  'opskrifter/floedeis-uden-ismaskine.json',
  'opskrifter/banansplit-med-chokoladesovs.json',
  'opskrifter/isbombe-til-nytaar.json',
  'opskrifter/pebernoedder.json',
  'opskrifter/joedekager.json',
  'opskrifter/sirupskager-til-juletraeet.json',
  'opskrifter/vroevl.json',
  'opskrifter/finskbroed.json',
  'opskrifter/floedekranse-med-kanelsukker.json',
  'opskrifter/rullede-vaniljekranse.json',
  'opskrifter/sneglekager.json',
  'opskrifter/honninghjerter.json',
  'opskrifter/fedtebroed.json',
  'opskrifter/smaa-engelske-juletaerter.json',
  'opskrifter/julekage-med-gaer-og-rosiner.json',
  'opskrifter/marcipangrise.json',
  'opskrifter/marcipankonfekt-med-dadler-og-valnoedder.json',
  'opskrifter/pebernoeddekugler.json',
  'opskrifter/chokoladetaler-med-julepynt.json',
  'opskrifter/rocky-road-til-jul.json',
  'opskrifter/kransekagestykker.json',
  'opskrifter/boernegloegg.json',
  'opskrifter/risalamande-med-kirsebaersauce.json',
  'opskrifter/risengroed-i-ovn.json',
  'opskrifter/juletrifli-med-pebernoedder-og-kirsebaer.json',
  'opskrifter/gammeldags-aeblekage.json',
  'opskrifter/bagte-juleaebler-med-marcipan.json',
  'opskrifter/aeg-og-rejer.json',
  'opskrifter/julemedisterboller.json',
  'opskrifter/glaseret-juleskinke-af-hamburgerryg.json',
  'opskrifter/roedkaalssalat-med-appelsin.json',
  'opskrifter/lun-leverpostej-med-bacon-og-svampe.json',
  'opskrifter/hjemmelavet-roedkaal.json',
  'opskrifter/flaeskesteg-med-sproed-svaer.json',
  'opskrifter/aebleflaesk.json',
  'opskrifter/brunede-kartofler.json',
  'opskrifter/smaa-grise-i-dyner.json',
  'opskrifter/andebryst-med-aebler-og-svesker.json',
  'opskrifter/brun-sovs-til-julemiddagen.json',
  'opskrifter/waldorfsalat.json',
  'opskrifter/tarteletter-med-hoens-i-asparges.json',
  'opskrifter/aebleskiver-med-hindbaersauce.json',
  'opskrifter/hasselbagte-kartofler.json',
  'opskrifter/lille-kransekagetaarn.json',
  'opskrifter/boernebobler.json',
  'opskrifter/nytaarstorsk-med-sennepssovs.json',
  'opskrifter/raket-frugtspyd.json',
  'opskrifter/fyrvaerkeri-muffins.json',
  'lyd/liste.json',
  'ikoner/ikon.svg',
  'ikoner/ikon-180.png',
  'ikoner/ikon-192.png',
  'ikoner/ikon-512.png',
  'grafik/dyr-bo.svg', 'grafik/dyr-pip.svg', 'grafik/dyr-rosa.svg', 'grafik/faerdig.svg',
  'grafik/ing-aeg.svg', 'grafik/ing-bouillon.svg', 'grafik/ing-chorizo.svg', 'grafik/ing-flode.svg', 'grafik/ing-gaer.svg',
  'grafik/ing-gulerod.svg', 'grafik/ing-havregryn.svg', 'grafik/ing-hvidloeg.svg', 'grafik/ing-koed.svg', 'grafik/ing-krydderurt.svg',
  'grafik/ing-loeg.svg', 'grafik/ing-maelk.svg', 'grafik/ing-mel.svg', 'grafik/ing-olie.svg', 'grafik/ing-ost.svg',
  'grafik/ing-peber.svg', 'grafik/ing-salt.svg', 'grafik/ing-smoer.svg', 'grafik/ing-spaghetti.svg', 'grafik/ing-sukker.svg',
  'grafik/ing-syltetoej.svg', 'grafik/ing-tomat.svg', 'grafik/ing-tomatpure.svg', 'grafik/ing-vand.svg',
  'grafik/ing-bagepulver.svg', 'grafik/ing-broed.svg', 'grafik/ing-chokolade.svg', 'grafik/ing-hytteost.svg', 'grafik/ing-kakao.svg',
  'grafik/ing-kartoffel.svg', 'grafik/ing-kerner.svg', 'grafik/ing-kokos.svg', 'grafik/ing-rasp.svg', 'grafik/ing-skinke.svg',
  'grafik/ing-tun.svg', 'grafik/ing-yoghurt.svg',
  'grafik/ing-pizzadej.svg', 'grafik/ing-poelse.svg', 'grafik/ing-ketchup.svg', 'grafik/ing-oliven.svg', 'grafik/ing-majs.svg',
  'grafik/ing-peberfrugt.svg', 'grafik/ing-flodeost.svg', 'grafik/ing-spinat.svg',
  'grafik/ing-aerter.svg', 'grafik/ing-broccoli.svg', 'grafik/ing-linser.svg', 'grafik/ing-boenner.svg', 'grafik/ing-ris.svg',
  'grafik/ing-tortilla.svg',
  'grafik/ing-agurk.svg', 'grafik/ing-blomkaal.svg',
  'grafik/ing-soja.svg', 'grafik/ing-honning.svg',
  'grafik/ing-kaal.svg',
  'grafik/ing-makrel.svg', 'grafik/ing-kikaerter.svg', 'grafik/ing-bulgur.svg',
  'grafik/ing-aeble.svg', 'grafik/ing-roedbede.svg',
  'grafik/ing-porre.svg', 'grafik/ing-gyoza.svg', 'grafik/ing-mayonnaise.svg', 'grafik/ing-citron.svg', 'grafik/ing-ananas.svg',
  'grafik/ing-champignon.svg', 'grafik/ing-baer.svg',
  'grafik/ing-marcipan.svg', 'grafik/ing-mandler.svg', 'grafik/ing-krydderi.svg', 'grafik/ing-sirup.svg', 'grafik/ing-appelsin.svg',
  'grafik/ing-rosiner.svg', 'grafik/ing-krymmel.svg', 'grafik/ing-pebernoedder.svg', 'grafik/ing-noedder.svg', 'grafik/ing-eddike.svg',
  'grafik/ing-is.svg', 'grafik/ing-banan.svg', 'grafik/ing-smaakager.svg', 'grafik/ing-selleri.svg', 'grafik/ing-asparges.svg',
  'grafik/ing-sennep.svg',
  'grafik/ret-boller.webp', 'grafik/ret-chorizo-pasta.webp', 'grafik/ret-frikadeller.webp', 'grafik/ret-koedsovs.webp', 'grafik/ret-pandekager.webp',
  'grafik/ret-kartoffelmos.webp', 'grafik/ret-hvidloegsflutes.webp', 'grafik/ret-brownie.webp', 'grafik/ret-blondie.webp',
  'grafik/ret-hytteostboller.webp', 'grafik/ret-havregrynskugler.webp', 'grafik/ret-tunfrikadeller.webp',
  'grafik/ret-pizzasnegle.webp',
  'grafik/ret-mumiepoelser.webp', 'grafik/ret-edderkoppeboller.webp', 'grafik/ret-oejeboller.webp', 'grafik/ret-graeskar-calzone.webp',
  'grafik/ret-heksefingre.webp', 'grafik/ret-slimsnegle.webp',
  'grafik/ret-bolognese-one-pot.webp', 'grafik/ret-cremet-koedsovs.webp',
  'grafik/ret-one-pot-tomatpasta.webp', 'grafik/ret-linsebolognese.webp', 'grafik/ret-halv-halv-koedsovs.webp',
  'grafik/ret-chili-con-carne.webp', 'grafik/ret-taco-bradepande.webp',
  'grafik/ret-pladepizza.webp', 'grafik/ret-fiskepinde-med-baade.webp', 'grafik/ret-fiskefars-i-fad.webp',
  'grafik/ret-bradepandekylling.webp', 'grafik/ret-kyllingekarry.webp',
  'grafik/ret-wok-med-nudler.webp', 'grafik/ret-ovnaeggekage.webp', 'grafik/ret-tomatsuppe-med-boenner.webp',
  'grafik/ret-minestrone.webp', 'grafik/ret-koedboller-i-tomatsovs.webp',
  'grafik/ret-medister-i-ovn.webp', 'grafik/ret-poelse-boennegryde.webp', 'grafik/ret-kyllingefrikadeller.webp',
  'grafik/ret-wraps-med-boenner.webp', 'grafik/ret-gryderis-med-kylling.webp',
  'grafik/ret-linse-dhal.webp', 'grafik/ret-hyrdetaerte.webp', 'grafik/ret-pastagratin.webp',
  'grafik/ret-one-pot-makaroni.webp', 'grafik/ret-lun-tunpasta.webp',
  'grafik/ret-ovnpandekage.webp', 'grafik/ret-kyllinge-nudelsuppe.webp', 'grafik/ret-rugbroedsaften.webp',
  'grafik/ret-ovnbagt-blomkaal.webp', 'grafik/ret-bradepande-fajitas.webp',
  'grafik/ret-fiskepakker-med-laks.webp', 'grafik/ret-fisk-i-tomatfad.webp', 'grafik/ret-fiskelasagne.webp',
  'grafik/ret-shakshuka-med-boenner.webp', 'grafik/ret-gulerodssuppe-med-linser.webp',
  'grafik/ret-kikaerteboller-i-karry.webp', 'grafik/ret-kikaerteburger.webp',
  'grafik/ret-bagte-kartofler-med-fyld.webp', 'grafik/ret-vegetar-biks.webp', 'grafik/ret-kaalpandekager.webp',
  'grafik/ret-gulerodsboller.webp', 'grafik/ret-havregrynsmuffins-med-aeble.webp',
  'grafik/ret-bakkeret-knuste-kartofler-og-kylling.webp', 'grafik/ret-gyoza-med-noedler-og-groent.webp',
  'grafik/ret-milde-asiatiske-fiskefrikadeller.webp', 'grafik/ret-okonomiyaki-med-spidskaal.webp',
  'grafik/ret-orange-pasta-med-hemmelig-groentsagssovs.webp',
  'grafik/ret-cremet-carbonara-med-aerter-uden-raa-aeg.webp', 'grafik/ret-egg-foo-young-med-ris.webp',
  'grafik/ret-floedekartofler-med-skinke-og-broccoli.webp', 'grafik/ret-gnocchi-med-tomat-spinat-og-mozzarella.webp',
  'grafik/ret-groen-pesto-pasta-med-broccoli-og-aerter.webp', 'grafik/ret-groen-porre-kartoffelsuppe-med-bacondrys.webp',
  'grafik/ret-hoisin-gris-med-ris-og-agurk.webp', 'grafik/ret-honning-soja-koedboller.webp',
  'grafik/ret-kartoffel-gulerods-roesti-med-skyrdip.webp', 'grafik/ret-kartoffeltortilla-med-aerter-og-spinat.webp',
  'grafik/ret-kylling-salatbaade-med-ris.webp', 'grafik/ret-mild-bibimbap-risskaal.webp',
  'grafik/ret-mild-kartoffelkarry-med-kokos-og-aerter.webp', 'grafik/ret-pasta-med-laks-spinat-og-citron.webp',
  'grafik/ret-soed-sur-kylling-med-ananas.webp', 'grafik/ret-spaghetti-chow-mein-med-kylling.webp',
  'grafik/ret-stegte-ris-med-aeg-aerter-og-majs.webp', 'grafik/ret-sushi-bowl-med-tun.webp',
  'grafik/ret-teriyaki-kylling-med-broccoli.webp',
  'grafik/ret-sproed-kylling-i-rasp.webp', 'grafik/ret-foldet-fladbroed-med-ost.webp',
  'grafik/ret-kyllingetaerte-med-butterdej.webp', 'grafik/ret-fisketacos-med-majs.webp',
  'grafik/ret-smash-burgere-med-ost.webp', 'grafik/ret-kylling-med-boenner-og-spinat.webp',
  'grafik/ret-cremet-fiskesuppe-med-majs.webp', 'grafik/ret-laks-med-sproed-rasp.webp',
  'grafik/ret-gul-ris-med-laks-aerter-og-aeg.webp', 'grafik/ret-koteletter-med-aeble.webp',
  'grafik/ret-cremet-ostris-med-aerter.webp', 'grafik/ret-koedkaal-med-makaroni.webp',
  'grafik/ret-jaegergryde-med-pasta.webp', 'grafik/ret-frossen-yoghurt-med-baer.webp',
  'grafik/ret-islagkage-med-marengs-og-baer.webp',
  'grafik/ret-is-sandwich-med-smaakager.webp',
  'grafik/ret-floedeis-uden-ismaskine.webp',
  'grafik/ret-banansplit-med-chokoladesovs.webp',
  'grafik/ret-isbombe-til-nytaar.webp',
  'grafik/ret-pebernoedder.webp', 'grafik/ret-joedekager.webp',
  'grafik/ret-sirupskager-til-juletraeet.webp', 'grafik/ret-vroevl.webp',
  'grafik/ret-finskbroed.webp', 'grafik/ret-floedekranse-med-kanelsukker.webp',
  'grafik/ret-rullede-vaniljekranse.webp', 'grafik/ret-sneglekager.webp',
  'grafik/ret-honninghjerter.webp', 'grafik/ret-fedtebroed.webp',
  'grafik/ret-smaa-engelske-juletaerter.webp', 'grafik/ret-julekage-med-gaer-og-rosiner.webp',
  'grafik/ret-marcipangrise.webp', 'grafik/ret-marcipankonfekt-med-dadler-og-valnoedder.webp',
  'grafik/ret-pebernoeddekugler.webp', 'grafik/ret-chokoladetaler-med-julepynt.webp',
  'grafik/ret-rocky-road-til-jul.webp', 'grafik/ret-kransekagestykker.webp',
  'grafik/ret-boernegloegg.webp', 'grafik/ret-risalamande-med-kirsebaersauce.webp',
  'grafik/ret-risengroed-i-ovn.webp', 'grafik/ret-juletrifli-med-pebernoedder-og-kirsebaer.webp',
  'grafik/ret-gammeldags-aeblekage.webp', 'grafik/ret-bagte-juleaebler-med-marcipan.webp',
  'grafik/ret-aeg-og-rejer.webp',
  'grafik/ret-julemedisterboller.webp',
  'grafik/ret-glaseret-juleskinke-af-hamburgerryg.webp',
  'grafik/ret-roedkaalssalat-med-appelsin.webp',
  'grafik/ret-lun-leverpostej-med-bacon-og-svampe.webp',
  'grafik/ret-hjemmelavet-roedkaal.webp',
  'grafik/ret-flaeskesteg-med-sproed-svaer.webp',
  'grafik/ret-aebleflaesk.webp',
  'grafik/ret-brunede-kartofler.webp',
  'grafik/ret-smaa-grise-i-dyner.webp',
  'grafik/ret-andebryst-med-aebler-og-svesker.webp',
  'grafik/ret-brun-sovs-til-julemiddagen.webp',
  'grafik/ret-waldorfsalat.webp',
  'grafik/ret-tarteletter-med-hoens-i-asparges.webp',
  'grafik/ret-aebleskiver-med-hindbaersauce.webp',
  'grafik/ret-hasselbagte-kartofler.webp',
  'grafik/ret-lille-kransekagetaarn.webp',
  'grafik/ret-boernebobler.webp',
  'grafik/ret-nytaarstorsk-med-sennepssovs.webp',
  'grafik/ret-raket-frugtspyd.webp',
  'grafik/ret-fyrvaerkeri-muffins.webp',
  'grafik/gruppe-aftensmad.svg', 'grafik/gruppe-bagning.svg', 'grafik/gruppe-soede-sager.svg', 'grafik/gruppe-halloween.svg',
  'grafik/gruppe-jul.svg', 'grafik/gruppe-kylling.svg', 'grafik/gruppe-fisk.svg',
  'grafik/verbum-aelte.svg', 'grafik/verbum-haelde.svg', 'grafik/verbum-koge.svg', 'grafik/verbum-maale.svg', 'grafik/verbum-roere.svg',
  'grafik/verbum-rulle.svg', 'grafik/verbum-skaere.svg', 'grafik/verbum-smage.svg', 'grafik/verbum-stege.svg',
  'grafik/verbum-vaske-haender.svg', 'grafik/verbum-vende.svg', 'grafik/verbum-vente.svg',
  'grafik/verbum-bage.svg', 'grafik/verbum-drysse.svg', 'grafik/verbum-mose.svg', 'grafik/verbum-pensle.svg', 'grafik/verbum-piske.svg',
  'grafik/verbum-rive.svg', 'grafik/verbum-smoere.svg',
  'grafik/verbum-tage-ud.svg', 'grafik/verbum-tage-ud-form.svg', 'grafik/verbum-si.svg', 'grafik/verbum-kagerulle.svg', 'grafik/verbum-pakke-ind.svg', 'grafik/verbum-smuldre.svg',
  'grafik/verbum-pynte.svg', 'grafik/verbum-sproejte.svg',
  'grafik/verbum-stikke-ud.svg', 'grafik/verbum-forme.svg', 'grafik/verbum-pille.svg', 'grafik/verbum-smelte.svg',
  'opskrifter/aeble-ingefaer-boble.json', 'opskrifter/aeble-kanel-smoothie.json', 'opskrifter/aeble-kanel-te.json',
  'opskrifter/aeblekage.json', 'opskrifter/agurk-lime-vand.json', 'opskrifter/ananas-kokos-smoothie.json',
  'opskrifter/appelsin-frugt-te.json', 'opskrifter/appelsin-gulerod-boble.json', 'opskrifter/avocado-banan-smoothie.json',
  'opskrifter/banan-chokolade-milkshake.json', 'opskrifter/banankage.json', 'opskrifter/blaabaer-skyr-smoothie.json',
  'opskrifter/bedste-venners-pizza.json', 'opskrifter/bedste-venners-kaempesmaakager.json',
  'opskrifter/blomme-banan-smoothie.json', 'opskrifter/chokolade-cupcakes.json', 'opskrifter/chokolade-milkshake.json',
  'opskrifter/chokoladekage-med-krymmel.json', 'opskrifter/citron-honning-drik.json', 'opskrifter/citronkage.json',
  'opskrifter/dino-cupcakes.json', 'opskrifter/dino-smoothie.json', 'opskrifter/dino-sump-drik.json',
  'opskrifter/dino-vulkan.json',
  'opskrifter/droemmekage.json', 'opskrifter/enhjoerning-cupcakes.json', 'opskrifter/enhjoerning-drik.json',
  'opskrifter/enhjoerning-milkshake.json', 'opskrifter/fersken-yoghurt-smoothie.json', 'opskrifter/groen-agurk-smoothie.json',
  'opskrifter/groenkaal-ananas-smoothie.json', 'opskrifter/gulerodskage.json', 'opskrifter/gulerodssmoothie.json',
  'opskrifter/hindbaer-havre-smoothie.json', 'opskrifter/hyldeblomst-lemonade.json', 'opskrifter/is-te-med-fersken.json',
  'opskrifter/isbjoernen-thea-cupcakes.json', 'opskrifter/isbjoernen-theas-hvide-kakao.json', 'opskrifter/isbjoernen-theas-milkshake.json',
  'opskrifter/jeg-elsker-dig-cupcakes.json', 'opskrifter/jeg-elsker-dig-hjerter.json', 'opskrifter/jordbaer-banan-smoothie.json',
  'opskrifter/jordbaer-boble.json', 'opskrifter/jordbaer-milkshake.json', 'opskrifter/kakao-banan-smoothie.json',
  'opskrifter/kakao-med-skumfiduser.json', 'opskrifter/kanelkage.json', 'opskrifter/kiwi-aeble-smoothie.json',
  'opskrifter/lyseroed-limonade.json', 'opskrifter/mango-appelsin-smoothie.json', 'opskrifter/morgen-havre-smoothie.json',
  'opskrifter/mynte-lime-boble.json', 'opskrifter/paere-vanilje-smoothie.json', 'opskrifter/regnbue-cupcakes.json',
  'opskrifter/regnbue-drik.json', 'opskrifter/regnbue-smoothie.json', 'opskrifter/sandkage.json',
  'opskrifter/smaakage-milkshake.json', 'opskrifter/solopgang.json', 'opskrifter/sommer-cupcakes.json',
  'opskrifter/sommer-ispinde.json', 'opskrifter/sommerkage-med-jordbaer.json', 'opskrifter/spinat-paere-smoothie.json',
  'opskrifter/strand-drik.json', 'opskrifter/tomat-gulerod-smoothie.json', 'opskrifter/trolde-drik.json',
  'opskrifter/troldesaft-smoothie.json', 'opskrifter/vandmelon-jordbaer-smoothie.json', 'opskrifter/vandmelon-koeler.json',
  'opskrifter/vanilje-cupcakes.json', 'opskrifter/vanilje-milkshake.json', 'opskrifter/yndlingskakao.json',
  'grafik/ret-dino-cupcakes.webp', 'grafik/ret-enhjoerning-cupcakes.webp',
  'grafik/ret-isbjoernen-thea-cupcakes.webp', 'grafik/ret-jeg-elsker-dig-cupcakes.webp',
  'grafik/ret-vanilje-cupcakes.webp', 'grafik/ret-chokolade-cupcakes.webp',
  'grafik/ret-sommer-cupcakes.webp', 'grafik/ret-regnbue-cupcakes.webp',
  'grafik/ret-jeg-elsker-dig-hjerter.webp', 'grafik/ret-sommer-ispinde.webp',
  'grafik/ret-sommerkage-med-jordbaer.webp', 'grafik/ret-gulerodskage.webp',
  'grafik/ret-banankage.webp', 'grafik/ret-sandkage.webp',
  'grafik/ret-droemmekage.webp', 'grafik/ret-citronkage.webp',
  'grafik/ret-chokoladekage-med-krymmel.webp', 'grafik/ret-aeblekage.webp',
  'grafik/ret-kanelkage.webp', 'grafik/ret-enhjoerning-drik.webp',
  'grafik/ret-dino-sump-drik.webp', 'grafik/ret-jordbaer-boble.webp',
  'grafik/ret-hyldeblomst-lemonade.webp', 'grafik/ret-lyseroed-limonade.webp',
  'grafik/ret-solopgang.webp', 'grafik/ret-mynte-lime-boble.webp',
  'grafik/ret-strand-drik.webp', 'grafik/ret-vandmelon-koeler.webp',
  'grafik/ret-aeble-ingefaer-boble.webp', 'grafik/ret-trolde-drik.webp',
  'grafik/ret-regnbue-drik.webp', 'grafik/ret-is-te-med-fersken.webp',
  'grafik/ret-agurk-lime-vand.webp', 'grafik/ret-appelsin-gulerod-boble.webp',
  'grafik/ret-gulerodssmoothie.webp', 'grafik/ret-dino-smoothie.webp',
  'grafik/ret-morgen-havre-smoothie.webp', 'grafik/ret-jordbaer-banan-smoothie.webp',
  'grafik/ret-blaabaer-skyr-smoothie.webp', 'grafik/ret-mango-appelsin-smoothie.webp',
  'grafik/ret-aeble-kanel-smoothie.webp', 'grafik/ret-kakao-banan-smoothie.webp',
  'grafik/ret-hindbaer-havre-smoothie.webp', 'grafik/ret-paere-vanilje-smoothie.webp',
  'grafik/ret-groen-agurk-smoothie.webp', 'grafik/ret-troldesaft-smoothie.webp',
  'grafik/ret-tomat-gulerod-smoothie.webp', 'grafik/ret-groenkaal-ananas-smoothie.webp',
  'grafik/ret-avocado-banan-smoothie.webp', 'grafik/ret-spinat-paere-smoothie.webp',
  'grafik/ret-vandmelon-jordbaer-smoothie.webp', 'grafik/ret-ananas-kokos-smoothie.webp',
  'grafik/ret-kiwi-aeble-smoothie.webp', 'grafik/ret-fersken-yoghurt-smoothie.webp',
  'grafik/ret-blomme-banan-smoothie.webp', 'grafik/ret-regnbue-smoothie.webp',
  'grafik/ret-enhjoerning-milkshake.webp', 'grafik/ret-isbjoernen-theas-milkshake.webp',
  'grafik/ret-vanilje-milkshake.webp', 'grafik/ret-chokolade-milkshake.webp',
  'grafik/ret-jordbaer-milkshake.webp', 'grafik/ret-banan-chokolade-milkshake.webp',
  'grafik/ret-smaakage-milkshake.webp', 'grafik/ret-yndlingskakao.webp',
  'grafik/ret-kakao-med-skumfiduser.webp', 'grafik/ret-isbjoernen-theas-hvide-kakao.webp',
  'grafik/ret-aeble-kanel-te.webp', 'grafik/ret-appelsin-frugt-te.webp',
  'grafik/ret-citron-honning-drik.webp',
  'grafik/ret-dino-vulkan.webp',
  'grafik/ret-bedste-venners-pizza.webp', 'grafik/ret-bedste-venners-kaempesmaakager.webp',
  'grafik/gruppe-drikke.svg', 'grafik/ing-avocado.svg', 'grafik/ing-blomme.svg', 'grafik/ing-chokoladeknapper.svg',
  'grafik/ing-danskvand.svg', 'grafik/ing-fersken.svg', 'grafik/ing-flormelis.svg', 'grafik/ing-frugt-te.svg',
  'grafik/ing-groenkaal.svg', 'grafik/ing-hvid-chokolade.svg', 'grafik/ing-hyldeblomst.svg', 'grafik/ing-ingefaer.svg',
  'grafik/ing-isterninger.svg', 'grafik/ing-isvaffel.svg', 'grafik/ing-jordbaer.svg', 'grafik/ing-karamelsauce.svg',
  'grafik/ing-kiwi.svg', 'grafik/ing-kokosmaelk.svg', 'grafik/ing-konditorfarve.svg', 'grafik/ing-lime.svg',
  'grafik/ing-mango.svg', 'grafik/ing-muffinforme.svg', 'grafik/ing-mynte.svg', 'grafik/ing-paere.svg',
  'grafik/ing-rooibos.svg', 'grafik/ing-saft.svg', 'grafik/ing-skumfiduser.svg', 'grafik/ing-slik.svg',
  'grafik/ing-vandmelon.svg', 'grafik/verbum-blende.svg', 'grafik/verbum-dyppe.svg', 'grafik/verbum-klemme.svg',
  'grafik/verbum-ryste.svg',
  'grafik/gruppe-madpakke.svg', 'grafik/ing-spegepoelse.svg', 'grafik/ing-squash.svg',
  'opskrifter/rugbroedsmadpakke.json', 'opskrifter/bolle-med-spegepoelse-og-pesto.json', 'opskrifter/tun-snurrer.json',
  'opskrifter/pandekage-wraps-med-skinke.json', 'opskrifter/tortilla-ruller-med-koedfyld.json',
  'opskrifter/kartoffelmad-med-spegepoelse.json', 'opskrifter/pastasalat-med-squash.json',
  'opskrifter/fiskefrikadeller-med-dilddip.json', 'opskrifter/spinattaerte.json',
  'opskrifter/avocadodip-med-groentstave.json', 'opskrifter/farverig-raakost.json',
  'opskrifter/grove-sandwichboller.json', 'opskrifter/havregroedsboller.json', 'opskrifter/rug-pitabroed.json',
  'opskrifter/skyrmuffins-med-abrikos.json', 'opskrifter/cowboyboenner.json',
  'grafik/ret-rugbroedsmadpakke.webp', 'grafik/ret-bolle-med-spegepoelse-og-pesto.webp', 'grafik/ret-tun-snurrer.webp',
  'grafik/ret-pandekage-wraps-med-skinke.webp', 'grafik/ret-tortilla-ruller-med-koedfyld.webp',
  'grafik/ret-kartoffelmad-med-spegepoelse.webp', 'grafik/ret-pastasalat-med-squash.webp',
  'grafik/ret-fiskefrikadeller-med-dilddip.webp', 'grafik/ret-spinattaerte.webp',
  'grafik/ret-avocadodip-med-groentstave.webp', 'grafik/ret-farverig-raakost.webp',
  'grafik/ret-grove-sandwichboller.webp', 'grafik/ret-havregroedsboller.webp', 'grafik/ret-rug-pitabroed.webp',
  'grafik/ret-skyrmuffins-med-abrikos.webp', 'grafik/ret-cowboyboenner.webp',
  'grafik/ing-rispapir.svg',
  'opskrifter/kyllingenuggets-i-rispapir.json', 'opskrifter/hjemmelavet-kebab.json',
  'grafik/ret-kyllingenuggets-i-rispapir.webp', 'grafik/ret-hjemmelavet-kebab.webp',
  'grafik/verbum-dyppe-vand.svg', 'grafik/verbum-drysse-skaal.svg',
  'grafik/gruppe-gris.svg', 'grafik/gruppe-ko.svg',
  'opskrifter/lynpizza-med-yoghurtdej.json', 'opskrifter/pizzabroed-med-hvidloeg-og-ost.json',
  'opskrifter/naan-paa-panden.json', 'opskrifter/hvidloegsnaan.json', 'opskrifter/ostenaan.json',
  'grafik/ret-lynpizza-med-yoghurtdej.webp', 'grafik/ret-pizzabroed-med-hvidloeg-og-ost.webp',
  'grafik/ret-naan-paa-panden.webp', 'grafik/ret-hvidloegsnaan.webp', 'grafik/ret-ostenaan.webp',
  'grafik/ing-tortellini.svg',
  'opskrifter/honningkylling-med-sesam-og-ris.json', 'grafik/ret-honningkylling-med-sesam-og-ris.webp',
  'opskrifter/kylling-i-karry.json', 'grafik/ret-kylling-i-karry.webp',
  'opskrifter/japansk-keema-karry.json', 'grafik/ret-japansk-keema-karry.webp',
  'opskrifter/risboller-med-tun-og-majs.json', 'grafik/ret-risboller-med-tun-og-majs.webp',
  'opskrifter/tomatris-fra-riskogeren.json', 'grafik/ret-tomatris-fra-riskogeren.webp',
  'opskrifter/cremet-kyllingepasta-med-broccoli.json', 'grafik/ret-cremet-kyllingepasta-med-broccoli.webp',
  'opskrifter/tortellini-i-cremet-tomatsovs.json', 'grafik/ret-tortellini-i-cremet-tomatsovs.webp',
  'opskrifter/pizzapasta-i-fad.json', 'grafik/ret-pizzapasta-i-fad.webp',
  'opskrifter/boller-i-karry.json', 'grafik/ret-boller-i-karry.webp',
];

const iScope = (url) => url.href.startsWith(self.registration.scope);
const erOpskrift = (url) => /\/opskrifter\/[a-z0-9-]+\.json$/.test(url.pathname) || /\/lyd\/liste\.json$/.test(url.pathname);

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    // Alt eller intet: mangler én fil, beholder enheden den gamle, hele udgave og prøver igen næste gang
    const svar = await Promise.all(FILER.map((f) => fetch(new Request(f, { cache: 'reload' }))));
    const mangler = FILER.filter((f, i) => !svar[i].ok);
    if (mangler.length) throw new Error('Mangler: ' + mangler.join(', '));
    const cache = await caches.open(VERSION);
    await Promise.all(svar.map((r, i) => cache.put(FILER[i], r)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Kun vores egne, gamle udgaver. Lystårnets «mat-…» og LEGO's «lego-…» lader vi være, og lyden beholdes,
    // så længe lydfilerne er de samme (LYD_CACHE).
    const navne = await caches.keys();
    await Promise.all(navne.filter((n) => n.startsWith(PRAEFIKS) && n !== VERSION && n !== LYD_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Svarer nettet ikke inden for HENT_MS (svag 4G, wifi uden internet), kommer opskriften fra cachen, og nettets svar
// gemmes, hvis det kommer senere. Er intet gemt, ventes der på nettet (code review U3, 23-10: før ventede #/hent, til
// Safari selv gav op). Det huskes i LANGSOM_MS, så retterne, der hentes efter index.json, tager cachen med det samme:
// ellers ventede de HENT_MS mere, i alt ca. 8 s (code review F2, 23-10). Nettet spørges stadig, og svaret gemmes
let langsomTil = 0;
async function netvaerkFoerst(e, req) {
  const cache = await caches.open(VERSION);
  const fraNet = fetch(req, { cache: 'no-cache' });
  e.waitUntil(fraNet.then((svar) => (svar.ok ? cache.put(req, svar.clone()) : null)).catch(() => {}));
  if (Date.now() < langsomTil) {
    const gemt = await cache.match(req, { ignoreSearch: true });
    if (gemt) return gemt;
  }
  let ur;
  const forSent = new Promise((ok) => { ur = setTimeout(() => ok(null), HENT_MS); });
  try {
    let svar = await Promise.race([fraNet, forSent]);
    if (svar === null) {
      const gemt = await cache.match(req, { ignoreSearch: true });
      if (gemt) {
        langsomTil = Date.now() + LANGSOM_MS;
        return gemt;
      }
      svar = await fraNet;
    }
    if (svar.status >= 500) return (await cache.match(req, { ignoreSearch: true })) || svar;
    return svar;
  } catch (err) {
    const gemt = await cache.match(req, { ignoreSearch: true });
    if (gemt) return gemt;
    throw err;
  } finally {
    clearTimeout(ur);
  }
}

async function cacheFoerst(e, req) {
  const cache = await caches.open(VERSION);
  const gemt = await cache.match(req, { ignoreSearch: true });
  if (gemt) return gemt;
  try {
    const svar = await fetch(req);
    if (svar.ok && svar.type === 'basic') e.waitUntil(cache.put(req, svar.clone()).catch(() => {}));
    return svar;
  } catch (err) {
    if (req.mode === 'navigate') {
      const forside = await cache.match('index.html');
      if (forside) return forside;
    }
    throw err;
  }
}

// Lydfilerne (Røst-stemmen, lyd/<ret>/<navn>.mp3) står ikke i FILER: de er ca. 8 MB, 18 gange resten af appen, og
// hentes derfor først, når de spilles (cache først som resten). De gemmes i LYD_CACHE, som kun skifter navn, når
// lydfilerne ændres (LYD, test/test-sw.js), så en ny udgave af appen ikke sletter lyden. Safari beder om lyd i bidder
// (Range: bytes=0-1), og et svar med en bid (206) kan ikke gemmes i en cache. Derfor hentes og gemmes altid hele filen,
// og bidden skæres ud af den.
async function lyd(e, req) {
  const cache = await caches.open(LYD_CACHE);
  let svar = await cache.match(req.url, { ignoreSearch: true });
  if (!svar) {
    // Uden Range: hele filen. «no-cache»: en ny udgave tages ikke fra browserens HTTP-cache. Svarer nettet ikke inden for
    // HENT_MS (wifi uden internet), afbrydes hentningen, og tale.js tager iPad-stemmen. Uret stopper ved svarets
    // første del, så en langsom, men levende forbindelse ikke skærer filen over
    const afbryd = new AbortController();
    const ur = setTimeout(() => afbryd.abort(), HENT_MS);
    try {
      svar = await fetch(req.url, { cache: 'no-cache', signal: afbryd.signal });
    } finally {
      clearTimeout(ur);
    }
    if (svar.status !== 200) return svar;
    e.waitUntil(cache.put(req.url, svar.clone()).catch(() => {}));
  }
  const omraade = req.headers.get('range');
  return omraade ? bid(svar, omraade) : svar;
}

// RFC 9110, afsnit 14: en Range, der ikke kan læses (en anden enhed end bytes, flere intervaller, «bytes=5-2»), ignoreres,
// og hele filen sendes (200). Enheden kendes uden forskel på store og små bogstaver («Bytes=0-1» er en bid).
// En gyldig bid, der ligger efter filens slutning («bytes=10-» af 10 byte, «bytes=-0»), giver 416
async function bid(svar, omraade) {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(omraade.trim());
  if (!m || (m[1] === '' && m[2] === '') || (m[1] !== '' && m[2] !== '' && Number(m[2]) < Number(m[1]))) return svar;
  const data = await svar.arrayBuffer();
  const n = data.byteLength;
  let fra;
  let til = n - 1;
  if (m[1] !== '') { fra = Number(m[1]); if (m[2] !== '') til = Math.min(Number(m[2]), n - 1); }
  else fra = Number(m[2]) > 0 ? Math.max(0, n - Number(m[2])) : n; // «bytes=-500»: de sidste 500
  if (fra >= n) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
  return new Response(data.slice(fra, til + 1), {
    status: 206,
    headers: {
      'Content-Type': svar.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + fra + '-' + til + '/' + n,
      'Content-Length': String(til - fra + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

const erLyd = (url) => /\/lyd\/[a-z0-9-]+\/[a-z0-9-]+\.mp3$/.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !iScope(url)) return; // andre apps på samme origin: ikke vores sag
  e.respondWith(erOpskrift(url) ? netvaerkFoerst(e, req) : erLyd(url) ? lyd(e, req) : cacheFoerst(e, req));
});
