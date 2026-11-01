// print.js — A4-printet til den voksne: print.html?ret=<id>. Samme JSON som skærmene.
// print.html?ret=<id>&n=<1-12> regner mængderne om til n portioner (retten på skærmen, når husstanden er sat).
// print.html?uge er ugeplanen og indkøbslisten (js/print-uge.js).
import { el, ikon, sideTitel } from './dom.js';
import { hentRet, ID_RE } from './data.js';
import { VERBER, grafikVerbum } from './katalog.js';
import { varighedKort } from './tid.js';
import { minutterTekst } from './tekst.js';
import { faktorFor, skaleretIngrediens, voksenNoter, portionerTekst } from './skaler.js';
import { printUge } from './print-uge.js';
import { UDGAVE } from './version.js';

const ark = document.getElementById('ark');
const printKnap = document.getElementById('print');
const tilbage = document.getElementById('tilbage');
const params = new URLSearchParams(location.search);
const id = params.get('ret') || '';
// Kun ét n, et helt tal fra 1 til 12, skrevet som tal uden fortegn og nuller foran. Alt andet giver opskriften, som den står
const N_RE = /^(?:[1-9]|1[0-2])$/;
const nAlle = params.getAll('n');
const n = nAlle.length === 1 && N_RE.test(nAlle[0]) ? Number(nAlle[0]) : null;

function besked(titel, tekst) {
  ark.replaceChildren(el('h1', { tekst: titel }), el('p', { class: 'besked', tekst }));
}

// En dato i kilden brydes ikke: «(22-10-2026)» stod som «(22-10-» og «2026)» på to linjer (UI-review 2, 23-10)
const medDatoer = (tekst) => tekst.split(/(\d{1,2}-\d{1,2}-\d{4})/).map((s, i) => (i % 2 ? el('span', { class: 'dato', tekst: s }) : s));

function tegn(m) {
  sideTitel(m.navn + ' · Tumbi Køkken');
  // Faktor 1, og bage- og søde retter uden talportioner, printes som før
  const f = n ? faktorFor(m, n) : null;
  const faktor = f && f !== 1 ? f : null;
  const portioner = faktor ? 'Til ' + portionerTekst(n) : m.portioner;
  const meta = [portioner, m.minutter ? minutterTekst(m.minutter) + ' i alt' : '', m.aktivMinutter ? minutterTekst(m.aktivMinutter) + ' forberedelse' : '']
    .filter(Boolean).join(' · ');

  const trin = m.trin.map((t) => el('li', { class: t.voksen ? 'voksen' : '' },
    el('img', { class: 'trin-ikon', src: grafikVerbum(t.verbum), alt: VERBER[t.verbum] || '' }),
    el('div', { class: 'trin-krop' },
      el('p', { class: 'trin-tekst' },
        el('span', { tekst: t.tekst }),
        t.voksen ? el('span', { class: 'maerke' }, ikon(t.voksenSlags === 'kniv' ? 'kniv' : 'flamme'), el('span', { tekst: t.voksenSlags === 'kniv' ? 'Voksen: kniv' : t.voksenSlags === 'varme' ? 'Voksen: varme' : 'Voksen' })) : null,
        t.timerSek ? el('span', { class: 'maerke' }, ikon('ur'), el('span', { tekst: varighedKort(t.timerSek) })) : null),
      t.note ? el('p', { class: 'note', tekst: t.note }) : null)));

  // Det sidste trin og foden står i én blok, der ikke deles over to sider: foden står ikke alene øverst på side 2, og er
  // der ikke plads, kommer det sidste trin med over. Safari kender ikke break-before: avoid (webkit.org/b/294559), men nok
  // break-inside: avoid. Blokkens liste fortsætter nummereringen fra den første (CSS-tælleren «trin»)
  const sidste = trin.pop();
  let slutListe = null;
  if (sidste) {
    slutListe = el('ol', { class: 'trin', role: 'list', start: trin.length + 1 }, sidste);
    slutListe.style.counterReset = 'trin ' + trin.length;
  }

  ark.replaceChildren(
    el('header', { class: 'hoved' },
      el('div', {},
        el('h1', { tekst: m.navn }),
        meta ? el('p', { class: 'meta', tekst: meta }) : null,
        m.beskrivelse ? el('p', { class: 'beskrivelse', tekst: m.beskrivelse }) : null),
      m.afproevet ? null : el('p', { class: 'ikke-afproevet', tekst: 'Ikke afprøvet' })),
    el('div', { class: 'spalter' },
      el('section', { class: 'ingredienser', 'aria-labelledby': 'p-ingr' },
        el('h2', { id: 'p-ingr', tekst: 'Ingredienser' }),
        // Mængden regnes om som på skærmen (retSkaerm i app.js), og navnet står som før
        el('ul', { class: 'tjek' }, m.ingredienser.map((x, i) => el('li', { tekst: faktor ? skaleretIngrediens(m, i, faktor).tekst : x.tekst }))),
        faktor ? voksenNoter(m, faktor).map((t) => el('p', { class: 'note', tekst: t })) : null,
        m.redskaber.length ? el('h2', { tekst: 'Redskaber' }) : null,
        m.redskaber.length ? el('p', { class: 'redskaber', tekst: m.redskaber.join(', ') }) : null),
      el('section', { class: 'fremgang', 'aria-labelledby': 'p-trin' },
        el('h2', { id: 'p-trin', tekst: 'Sådan gør du' }),
        trin.length ? el('ol', { class: 'trin', role: 'list' }, trin) : null,
        el('div', { class: 'slut' },
          slutListe,
          el('footer', { class: 'fod' },
            el('p', { tekst: 'Tjek selv pakkerne for allergener.' }),
            el('p', {}, 'Tumbi Køkken · ', medDatoer(m.kilde || 'Egen tekst')),
            el('p', { tekst: 'Stemmen er en computerstemme (Røst fra Alexandra Instituttet).' }),
            el('p', { tekst: 'Version ' + UDGAVE }))))));
  printKnap.disabled = false;
}

printKnap.addEventListener('click', () => window.print());

async function start() {
  if (!id || !ID_RE.test(id)) {
    besked('Der mangler en opskrift', 'Åbn printet fra en ret i Tumbi Køkken (knappen «Print» på retten).');
    return;
  }
  tilbage.href = 'index.html#/ret/' + id;
  try {
    tegn(await hentRet(id));
  } catch (e) {
    if (e.findesIkke) besked('Den opskrift findes ikke', 'Gå tilbage, og vælg retten igen på forsiden.');
    else besked('Opskriften kunne ikke hentes', 'Tjek, at enheden er på nettet, og genindlæs siden.');
  }
}

if (params.has('uge')) {
  printUge({ ark, printKnap, tilbage, besked })
    .catch(() => besked('Ugeplanen kunne ikke vises', 'Genindlæs siden. Sker det igen, så åbn printet fra ugeplanen.'));
} else {
  start();
}
