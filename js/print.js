// print.js — A4-printet til den voksne: print.html?ret=<id>. Samme JSON som skærmene.
import { el, ikon } from './dom.js';
import { hentRet, ID_RE } from './data.js';
import { VERBER, grafikVerbum } from './katalog.js';
import { varighedKort } from './tid.js';
import { minutterTekst } from './tekst.js';

const ark = document.getElementById('ark');
const printKnap = document.getElementById('print');
const tilbage = document.getElementById('tilbage');
const id = new URLSearchParams(location.search).get('ret') || '';

function besked(titel, tekst) {
  ark.replaceChildren(el('h1', { tekst: titel }), el('p', { class: 'besked', tekst }));
}

function tegn(m) {
  document.title = m.navn + ' · Tumbi Køkken';
  const meta = [m.portioner, m.minutter ? minutterTekst(m.minutter) + ' i alt' : '', m.aktivMinutter ? minutterTekst(m.aktivMinutter) + ' forberedelse' : '']
    .filter(Boolean).join(' · ');

  const trin = m.trin.map((t) => el('li', { class: t.voksen ? 'voksen' : '' },
    el('img', { class: 'trin-ikon', src: grafikVerbum(t.verbum), alt: VERBER[t.verbum] || '' }),
    el('div', { class: 'trin-krop' },
      el('p', { class: 'trin-tekst' },
        el('span', { tekst: t.tekst }),
        t.voksen ? el('span', { class: 'maerke' }, ikon(t.voksenSlags === 'kniv' ? 'kniv' : 'flamme'), el('span', { tekst: t.voksenSlags === 'kniv' ? 'Voksen: kniv' : t.voksenSlags === 'varme' ? 'Voksen: varme' : 'Voksen' })) : null,
        t.timerSek ? el('span', { class: 'maerke' }, ikon('ur'), el('span', { tekst: varighedKort(t.timerSek) })) : null),
      t.note ? el('p', { class: 'note', tekst: t.note }) : null)));

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
        el('ul', { class: 'tjek' }, m.ingredienser.map((x) => el('li', { tekst: x.tekst }))),
        m.redskaber.length ? el('h2', { tekst: 'Redskaber' }) : null,
        m.redskaber.length ? el('p', { class: 'redskaber', tekst: m.redskaber.join(', ') }) : null),
      el('section', { class: 'fremgang', 'aria-labelledby': 'p-trin' },
        el('h2', { id: 'p-trin', tekst: 'Sådan gør du' }),
        el('ol', { class: 'trin', role: 'list' }, trin))),
    el('footer', { class: 'fod' },
      el('p', { tekst: 'Tjek selv pakkerne for allergener.' }),
      el('p', { tekst: 'Tumbi Køkken · ' + (m.kilde || 'Egen tekst') })));
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

start();
