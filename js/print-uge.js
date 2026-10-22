// print-uge.js — ugeplanen på papir: print.html?uge (docs/ugeplan-plan.md, afsnit 3: vej (c), når telefonen ikke kan
// bruges). Side 1 er ugen med syv rækker (dagen, rettens billede, navn, tid, personer og dyret, der valgte), side 2 er
// indkøbslisten med □ efter afdeling. Planen læses af lageret (kog-uge-v1 gennem js/lager.js), ikke af adressen, og
// listen regnes af js/indkoeb.js som på skærmen. Al tekst sættes som tekst (js/dom.js)
import { el } from './dom.js';
import { hentIndex, hentRet } from './data.js';
import * as Lager from './lager.js';
import { saml, grupper } from './indkoeb.js';
import { DYR, grafikRet, grafikDyr } from './katalog.js';
import { DAGE, ugeNr, dagDato, planMandag } from './tid.js';
import { minutterTekst } from './tekst.js';

const dyrNavn = (af) => DYR[af].split(',')[0];

// ark, printKnap og tilbage er print.html's elementer, besked(titel, tekst) print.js' fejlside
export async function printUge({ ark, printKnap, tilbage, besked }) {
  tilbage.href = 'index.html#/uge';
  tilbage.textContent = 'Tilbage til ugeplanen';
  printKnap.textContent = 'Print ugeplanen';
  document.title = 'Ugeplan · Tumbi Køkken';
  besked('Ugeplan', 'Henter ugeplanen …');
  let ids;
  try {
    ids = (await hentIndex()).ids;
  } catch (e) {
    besked('Ugeplanen kunne ikke hentes', 'Tjek, at enheden er på nettet, og genindlæs siden.');
    return;
  }
  const p = Lager.hentUge(ids);
  if (p.laast) {
    besked('Ugeplanen er lavet med en nyere udgave', 'Genindlæs siden, så hentes den nye udgave af Tumbi Køkken.');
    return;
  }
  if (!p.dage.some(Boolean)) {
    besked('Ugeplanen er tom', 'Vælg retter i ugeplanen, og åbn så printet igen.');
    return;
  }
  // Hver ret hentes én gang. En ret, der ikke kan hentes, står som en fejl på sin dag og mangler på listen (det står der)
  const unikke = [...new Set(p.dage.filter(Boolean).map((d) => d.ret))];
  const hentet = new Map(await Promise.all(unikke.map((id) => hentRet(id).then((m) => [id, m], () => [id, null]))));
  tegn(ark, p, hentet);
  printKnap.disabled = false;
}

function tegn(ark, p, hentet) {
  const uge = p.uge || planMandag();
  const nr = ugeNr(uge);
  document.title = 'Ugeplan uge ' + nr + ' · Tumbi Køkken';
  const periode = dagDato(uge, 0) + '–' + dagDato(uge, 6);

  const dage = p.dage.map((d, i) => {
    const m = d ? hentet.get(d.ret) : null;
    const navn = !d ? 'Fri aften' : m ? m.navn : 'Opskriften kunne ikke hentes';
    return el('li', { class: 'uge-dag' + (d ? '' : ' fri') },
      el('p', { class: 'uge-dag-navn' }, el('span', { tekst: DAGE[i] }), el('span', { class: 'uge-dato', tekst: dagDato(uge, i) })),
      m ? el('img', { class: 'uge-billede', src: grafikRet(m.id), alt: '' }) : el('span', { class: 'uge-billede tom', 'aria-hidden': 'true' }),
      el('div', { class: 'uge-ret' },
        el('p', { class: 'uge-ret-navn', tekst: navn }),
        m ? el('p', { class: 'meta', tekst: [m.minutter ? minutterTekst(m.minutter) : '', d.n + ' pers.'].filter(Boolean).join(' · ') }) : null),
      d && Object.hasOwn(DYR, d.af)
        ? el('p', { class: 'uge-af' }, el('img', { src: grafikDyr(d.af), alt: '' }), el('span', { tekst: 'Valgt af ' + dyrNavn(d.af) }))
        : null);
  });

  // Listen: kun dage, hvis ret er hentet og står i ugeplanen (som «Send til telefon» i js/ugeplan.js)
  const valg = p.dage.filter(Boolean).map((d) => ({ m: hentet.get(d.ret), n: d.n })).filter((x) => x.m && x.m.uge)
    .map((x) => ({ ret: { tumbi: x.m.uge.tumbi }, n: x.n }));
  const mangler = p.dage.filter((d) => d && !(hentet.get(d.ret) || {}).uge).length;
  const afdelinger = grupper(saml(valg)).map((g) => el('section', { class: 'afd' + (g.afd === 'basis' ? ' basis' : '') },
    el('h3', { tekst: g.navn }),
    el('ul', { class: 'tjek' }, g.varer.map((v) => el('li', {},
      el('span', { class: 'vare-navn', tekst: v.navn }),
      v.maengde ? el('span', { class: 'maengde', tekst: v.maengde }) : null)))));

  ark.replaceChildren(
    el('section', { class: 'uge-side', 'aria-labelledby': 'p-uge' },
      el('header', { class: 'uge-hoved' },
        el('h1', { id: 'p-uge', tekst: 'Ugeplan · uge ' + nr }),
        el('p', { class: 'meta', tekst: periode })),
      el('ol', { class: 'uge-dage', role: 'list' }, dage)),
    el('section', { class: 'liste-side', 'aria-labelledby': 'p-liste' },
      el('header', { class: 'uge-hoved' },
        el('h2', { id: 'p-liste', tekst: 'Indkøbsliste · uge ' + nr }),
        el('p', { class: 'meta', tekst: periode })),
      mangler
        ? el('p', { class: 'liste-note', tekst: (mangler === 1 ? 'Én dag' : mangler + ' dage') + ' mangler på listen, fordi opskriften ikke kunne hentes. Genindlæs siden for at prøve igen.' })
        : null,
      afdelinger.length ? el('div', { class: 'afdelinger' }, afdelinger) : el('p', { class: 'liste-note', tekst: 'Der er ingen varer på listen.' }),
      el('footer', { class: 'fod' },
        el('p', { tekst: 'Tjek selv pakkerne for allergener.' }),
        el('p', { tekst: 'Mængderne er lagt sammen for hele ugen og rundet op.' }))));
}
