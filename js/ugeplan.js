// ugeplan.js — skærmene til ugeplanen og indkøbslisten (docs/ugeplan-plan.md, afsnit 1-3):
//   #/hent/<kode>  telefonen: gemmer listen fra linket og skifter adressen til #/indkoeb (history.replaceState)
//   #/indkoeb      telefonen: listen, der krydses af i butikken. Er den tom, kan linket sættes ind i et felt
// Koden i linket kommer udefra. Den går kun gennem afkod() i js/plankode.js, og intet fra adressen kommer i DOM'en: fejlene
// er faste tekster, og listen gemmes med den genskrevne kode. Lageret røres kun gennem js/lager.js, og al tekst sættes
// som tekst (js/dom.js). app.js ejer ruterne og tilstanden (S) og giver sine hjælpere med init().
import { el, ikon } from './dom.js';
import * as Lager from './lager.js';
import { afkod, ukendtTekst, BESKED_UGYLDIG, BESKED_NYERE } from './plankode.js';
import { saml, grupper } from './indkoeb.js';
import { grafikIngrediens, grafikRet } from './katalog.js';
import { ugeNr, dagDato } from './tid.js';

export const DAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

// app.js: { S, knap, billede, topbar, statusSkaerm, naviger, annoncer, indlaes, vis }
let K = null;
export function init(k) {
  K = k;
}

// Ruterne. «kode» er resten af adressen efter «#/hent/», som den står: den afkodes ikke (afkod afviser «%» og alt andet,
// der ikke passer præcis)
export function rute(hash) {
  const raa = hash.replace(/^#\/?/, '');
  if (raa === 'hent' || raa.startsWith('hent/')) return { uge: true, side: 'hent', kode: raa.slice(5) };
  if (raa === 'indkoeb') return { uge: true, side: 'indkoeb' };
  return null;
}

export function skaerm(r) {
  if (r.side !== 'indkoeb') K.S.listeBesked = null;
  if (r.side === 'hent') return hentSkaerm(r.kode);
  return indkoebSkaerm();
}

// ---------- Fælles ----------

// Opskrifterne er hentet (også dem, der fejlede): først da kan et link læses og en liste regnes ud
const klar = () => Boolean(K.S.ids) && K.S.ids.every((id) => K.S.retter.has(id));
const model = (id) => {
  const m = K.S.retter.get(id);
  return m && !(m instanceof Error) ? m : null;
};

const henter = (titel) => K.statusSkaerm({ titel, laeser: true });

function hentFejl() {
  return K.statusSkaerm({
    titel: 'Opskrifterne kunne ikke hentes',
    tekst: 'Listen regnes ud fra ugens opskrifter. Tjek internetforbindelsen, og prøv igen.',
    handling: el('div', { class: 'status-knapper' },
      K.knap('Prøv igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => {
        for (const [id, m] of K.S.retter) if (m instanceof Error) K.S.retter.delete(id);
        K.vis(); // «Henter …», mens de hentes igen
        K.indlaes();
      } })),
  });
}

// Linket i feltet: alt efter «#/hent/» (eller kun koden). Et punktum eller mellemrum efter linket i beskeden fjernes;
// koden slutter altid med kontrolsummens hex-tegn
export function kodeFraTekst(tekst) {
  const t = String(tekst || '').trim();
  const i = t.indexOf('#/hent/');
  return (i >= 0 ? t.slice(i + 7) : t).replace(/[^a-z0-9]+$/, '');
}

// Nødudgangen: en hjemmeskærm-app deler ikke lager med Safari, så linket kan sættes ind her (afsnit 2, vej a2).
// Det, der skrives i feltet, vises aldrig: koden går gennem afkod, og kun den genskrevne kode kommer i adressen
function linkForm() {
  const felt = el('input', {
    id: 'link-felt', class: 'link-felt', type: 'text', inputmode: 'url', autocomplete: 'off', autocapitalize: 'none',
    autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', maxlength: '2000', 'aria-describedby': 'link-hjaelp link-fejl',
  });
  const fejl = el('p', { id: 'link-fejl', class: 'felt-fejl', role: 'alert' });
  const form = el('form', { class: 'link-form', novalidate: true },
    el('label', { for: 'link-felt', class: 'felt-navn', tekst: 'Sæt linket ind' }),
    el('p', { id: 'link-hjaelp', class: 'felt-hjaelp', tekst: 'Hold fingeren på linket i beskeden, vælg Kopiér, og sæt det ind her.' }),
    el('div', { class: 'link-raekke' }, felt,
      el('button', { type: 'submit', class: 'knap primaer link-knap' }, ikon('kurv'), el('span', { tekst: 'Hent listen' }))),
    fejl);
  const siger = (tekst) => {
    fejl.textContent = tekst;
    felt.setAttribute('aria-invalid', 'true');
    felt.focus();
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const kode = kodeFraTekst(felt.value);
    if (!kode) { siger('Feltet er tomt. Sæt hele linket fra beskeden ind.'); return; }
    if (!K.S.ids) { siger('Opskrifterne er ikke hentet endnu. Vent et øjeblik, og prøv igen.'); return; }
    const r = afkod(kode, { retter: K.S.ids, idag: new Date() });
    if (!r.ok) {
      siger(r.fejl === 'nyere' ? BESKED_NYERE : BESKED_UGYLDIG + ' Tjek, at hele linket kom med.');
      return;
    }
    K.naviger('#/hent/' + r.kode);
  });
  return form;
}

// ---------- #/hent/<kode> ----------

let vent = null; // { kode, ny, ukendte }: et nyt link, mens telefonen har en anden liste («Erstat listen?»)
let gemFejlet = null; // koden, hvis liste ikke kunne gemmes efter «Erstat listen»

function tilListe(ukendte) {
  vent = null;
  K.S.listeBesked = ukendte ? ukendtTekst(ukendte) + '. Den er måske fjernet fra kogebogen.' : null;
  history.replaceState(null, '', '#/indkoeb');
}

function linkFejl(fejl) {
  const nyere = fejl === 'nyere';
  return K.statusSkaerm({
    titel: (nyere ? BESKED_NYERE : BESKED_UGYLDIG).replace(/\.$/, ''),
    tekst: nyere
      ? 'Telefonen har en ældre udgave af Tumbi Køkken. Genindlæs siden, og åbn linket igen.'
      : 'Måske er linket skåret over i beskeden. Send det igen fra iPad\'en, eller sæt hele linket ind herunder.',
    handling: el('div', { class: 'status-handling' }, linkForm(),
      K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })),
  });
}

const nyereListe = () => K.statusSkaerm({
  titel: 'Listen er lavet med en nyere udgave',
  tekst: 'Telefonen har en ældre udgave af Tumbi Køkken, som ikke må skrive i listen. Genindlæs siden, så henter telefonen den nye udgave.',
  handling: K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') }),
});

const gemFejl = () => K.statusSkaerm({
  titel: 'Listen kunne ikke gemmes på telefonen',
  tekst: 'Måske er privat browsing slået til, eller telefonen er fuld. Slå privat browsing fra, og åbn linket igen.',
  handling: K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') }),
});

function hentSkaerm(kode) {
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return henter('Henter indkøbslisten …');
  const r = afkod(kode, { retter: K.S.ids, idag: new Date() });
  if (!r.ok) return linkFejl(r.fejl);
  if (gemFejlet === r.kode) { gemFejlet = null; return gemFejl(); }
  // Varerne regnes ud nu og gemmes (et øjebliksbillede, afsnit 3). Kunne en af ugens retter ikke hentes, gemmes intet:
  // ellers manglede dens varer på listen uden at nogen opdagede det
  let ukendte = r.ukendte;
  const valg = [];
  for (const d of r.dage) {
    if (!d) continue;
    if (K.S.retter.get(d.ret) instanceof Error) return hentFejl();
    const m = model(d.ret);
    if (!m || !m.uge) { ukendte++; continue; }
    valg.push({ ret: { tumbi: m.uge.tumbi }, n: d.n });
  }
  if (!valg.length) {
    return K.statusSkaerm({
      titel: 'Der er ingen retter i ugeplanen',
      tekst: (ukendte ? ukendtTekst(ukendte) + '. ' : '') + 'Vælg retter på iPad\'en, og send linket igen.',
      handling: K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') }),
    });
  }
  const ny = { kode: r.kode, uge: r.uge, varer: saml(valg), koebt: [], harVi: [], hentet: Date.now() };
  const gl = Lager.hentListe();
  if (gl.laast) return nyereListe();
  // Samme link igen: listen og afkrydsningerne bliver, som de er
  if (gl.kode === ny.kode) { tilListe(ukendte); return indkoebSkaerm(); }
  if (gl.varer.length) { vent = { kode: ny.kode, ny, ukendte }; return erstatSkaerm(gl, ny); }
  if (!Lager.gemListe(ny)) return gemFejl();
  tilListe(ukendte);
  return indkoebSkaerm();
}

// Telefonen har allerede en liste: den erstattes kun, når man siger det (man kan stå midt i butikken)
function erstatSkaerm(gl, ny) {
  const glUge = gl.uge ? 'uge ' + ugeNr(gl.uge) : 'den gamle uge';
  const tal = optaelling(grupper(gl.varer), new Set(gl.koebt), new Set(gl.harVi));
  return K.statusSkaerm({
    titel: 'Erstat listen for ' + glUge + '?',
    tekst: 'Det nye link er til uge ' + ugeNr(ny.uge) + '. På listen, der er på telefonen nu, er ' + tal.koebt + ' af ' + tal.ialt + ' købt.',
    handling: el('div', { class: 'status-knapper' },
      K.knap('Erstat listen', { klasse: 'primaer', ikonNavn: 'kurv', onclick: () => {
        const v = vent;
        if (!v) return;
        if (!Lager.gemListe(v.ny)) {
          gemFejlet = v.kode;
          K.vis();
          document.querySelector('main h1')?.focus();
          return;
        }
        tilListe(v.ukendte);
        K.vis();
      } }),
      K.knap('Behold listen for ' + glUge, { onclick: () => { tilListe(0); K.vis(); } })),
  });
}

// ---------- #/indkoeb ----------

// Varerne, der skal købes (ikke basisvarerne og ikke «Har vi»), og hvor mange af dem, der er købt
function optaelling(afd, koebt, harVi) {
  const ids = afd.filter((g) => g.afd !== 'basis').flatMap((g) => g.varer.map((v) => v.id)).filter((id) => !harVi.has(id));
  return { koebt: ids.filter((id) => koebt.has(id)).length, ialt: ids.length };
}

function indkoebSkaerm() {
  const liste = Lager.hentListe();
  if (liste.laast) return nyereListe();
  if (!liste.varer.length) {
    return K.statusSkaerm({
      titel: 'Der er ingen indkøbsliste endnu',
      tekst: 'Tryk på linket fra iPad\'en, så kommer listen her. Er Tumbi Køkken lagt på hjemmeskærmen, så kopiér linket, og sæt det ind herunder.',
      handling: el('div', { class: 'status-handling' }, linkForm(),
        K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })),
    });
  }
  return listeSkaerm(liste);
}

// Rækkernes placering før en ændring, så de kan glide på plads bagefter (en købt vare glider ned). Uden bevægelse ved
// «mindre bevægelse»
function placeringer(beholder) {
  return new Map([...beholder.querySelectorAll('[data-vare]')].map((e) => [e.dataset.vare, e.getBoundingClientRect().top]));
}
function glid(beholder, foer) {
  if (!foer.size || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const e of beholder.querySelectorAll('[data-vare]')) {
    const top = foer.get(e.dataset.vare);
    if (top === undefined || typeof e.animate !== 'function') continue;
    const dy = top - e.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) e.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
  }
}

function listeSkaerm(liste) {
  const alle = grupper(liste.varer);
  const afdelinger = alle.filter((g) => g.afd !== 'basis');
  const basis = alle.find((g) => g.afd === 'basis');
  const st = { koebt: new Set(liste.koebt), harVi: new Set(liste.harVi), basisAaben: false };
  const tal = el('p', { class: 'liste-tal' });
  const fyld = el('span', { class: 'liste-maaler-fyld' });
  const krop = el('div', { class: 'liste-krop' });
  const advarsel = el('p', { class: 'liste-advarsel', role: 'alert', hidden: true,
    tekst: 'Telefonen kunne ikke gemme afkrydsningen. Den er væk, når siden lukkes.' });
  // Et hurtigt dobbelttryk må ikke ramme varen, der glider op på den købte vares plads
  let spaerTil = 0;
  const spaer = (fn) => () => {
    if (performance.now() < spaerTil) return;
    spaerTil = performance.now() + 350;
    fn();
  };

  function gem(felt) {
    advarsel.hidden = Boolean(Lager.gemListe({ [felt]: [...st[felt]] }));
  }

  function vareKnap(v) {
    const koebt = st.koebt.has(v.id);
    const b = el('button', { type: 'button', class: 'vare', 'aria-pressed': String(koebt) },
      el('span', { class: 'vare-tjek', 'aria-hidden': 'true' }, ikon('tjek')),
      K.billede(grafikIngrediens(v.ikon), '', 'vare-ikon'),
      el('span', { class: 'vare-tekst' },
        el('span', { class: 'vare-navn', tekst: v.navn }),
        v.maengde ? el('span', { class: 'vare-maengde', tekst: v.maengde }) : null));
    b.addEventListener('click', spaer(() => {
      if (st.koebt.has(v.id)) st.koebt.delete(v.id);
      else st.koebt.add(v.id);
      gem('koebt');
      tegn(v.id, '.vare');
      const t = optaelling(alle, st.koebt, st.harVi);
      K.annoncer((st.koebt.has(v.id) ? 'Købt: ' : 'Ikke købt: ') + v.navn + '. ' + t.koebt + ' af ' + t.ialt + ' købt.');
    }));
    return b;
  }

  function flytKnap(v, harVi) {
    const tekst = harVi ? 'Skal købes' : 'Har vi';
    return K.knap(tekst, { klasse: 'har-vi', label: tekst + ': ' + v.navn, onclick: spaer(() => {
      if (harVi) st.harVi.delete(v.id);
      else { st.harVi.add(v.id); st.koebt.delete(v.id); gem('koebt'); }
      gem('harVi');
      tegn(v.id, '.har-vi');
      K.annoncer(harVi ? v.navn + ' skal købes.' : v.navn + ' står under «Har vi allerede».');
    }) });
  }

  // En afdeling: varerne, der mangler, først, og de købte nederst (overstreget)
  function afdeling(g) {
    const varer = g.varer.filter((v) => !st.harVi.has(v.id));
    if (!varer.length) return null;
    const orden = [...varer.filter((v) => !st.koebt.has(v.id)), ...varer.filter((v) => st.koebt.has(v.id))];
    return el('section', { class: 'afd', 'aria-labelledby': 'afd-' + g.afd },
      el('h2', { id: 'afd-' + g.afd, tekst: g.navn }),
      el('ul', { class: 'varer' }, orden.map((v) => el('li', { 'data-vare': v.id, class: st.koebt.has(v.id) ? 'koebt' : null },
        vareKnap(v), st.koebt.has(v.id) ? null : flytKnap(v, false)))));
  }

  function harViAfsnit() {
    const varer = afdelinger.flatMap((g) => g.varer).filter((v) => st.harVi.has(v.id));
    if (!varer.length) return null;
    return el('section', { class: 'afd har-vi-afd', 'aria-labelledby': 'afd-har-vi' },
      el('h2', { id: 'afd-har-vi', tekst: 'Har vi allerede' }),
      el('ul', { class: 'varer' }, varer.map((v) => el('li', { 'data-vare': v.id },
        el('span', { class: 'vare vare-stille' },
          K.billede(grafikIngrediens(v.ikon), '', 'vare-ikon'),
          el('span', { class: 'vare-tekst' }, el('span', { class: 'vare-navn', tekst: v.navn }),
            v.maengde ? el('span', { class: 'vare-maengde', tekst: v.maengde }) : null)),
        flytKnap(v, true)))));
  }

  // Salt, peber, olie og krydderier: lukket, uden for optællingen (afsnit 1)
  function basisBlok() {
    if (!basis) return null;
    const d = el('details', { class: 'tjek-basis', open: st.basisAaben },
      el('summary', {}, ikon('naeste', 'ikon pil'), el('span', { tekst: basis.navn + ' (' + basis.varer.length + ')' })),
      el('ul', { class: 'basis-varer' }, basis.varer.map((v) => el('li', {},
        K.billede(grafikIngrediens(v.ikon), '', 'vare-ikon'), el('span', { tekst: v.navn })))));
    d.addEventListener('toggle', () => { st.basisAaben = d.open; });
    return d;
  }

  // Ugens retter med links til opskrifterne. Koden er gemt af appen selv (renset i lager.js), men afkodes alligevel
  // strengt; er listen ældre end 8 uger, eller er opskrifterne ikke hentet, står afsnittet ikke der
  function retter() {
    if (!liste.kode || !K.S.ids) return null;
    const r = afkod(liste.kode, { retter: K.S.ids, idag: new Date() });
    if (!r.ok) return null;
    const links = r.dage.map((d, i) => {
      const m = d && model(d.ret);
      if (!m || !m.uge) return null;
      return el('li', {}, el('a', { class: 'ret-link', href: '#/ret/' + m.id },
        K.billede(grafikRet(m.id), '', 'ret-link-billede'),
        el('span', { class: 'vare-tekst' },
          el('span', { class: 'vare-navn', tekst: m.navn }),
          el('span', { class: 'vare-maengde', tekst: DAGE[i] + ' ' + dagDato(r.uge, i) + ' · ' + d.n + ' pers.' }))));
    }).filter(Boolean);
    if (!links.length) return null;
    return el('section', { class: 'afd', 'aria-labelledby': 'afd-retter' },
      el('h2', { id: 'afd-retter', tekst: 'Ugens retter' }),
      el('ul', { class: 'varer ret-links' }, links));
  }

  // fokus: varen og knappen, der blev trykket på, så fokus følger varen, når den flytter sig
  function tegn(fokusVare, fokusSel) {
    const foer = placeringer(krop);
    const t = optaelling(alle, st.koebt, st.harVi);
    tal.textContent = t.koebt + ' af ' + t.ialt + ' købt';
    fyld.style.setProperty('--andel', String(t.ialt ? t.koebt / t.ialt : 0));
    krop.replaceChildren(...[...afdelinger.map(afdeling), harViAfsnit(), basisBlok(), retter()].filter(Boolean));
    glid(krop, foer);
    if (fokusVare) {
      const li = krop.querySelector('[data-vare="' + fokusVare + '"]');
      const b = li && (li.querySelector(fokusSel) || li.querySelector('button'));
      if (b) b.focus({ preventScroll: true });
    }
  }
  tegn();

  return el('main', { class: 'skaerm indkoeb' },
    K.topbar(),
    el('div', { class: 'liste' },
      el('header', { class: 'liste-hoved' },
        el('h1', { tabindex: '-1', tekst: 'Indkøbsliste' }),
        el('p', { class: 'liste-uge', tekst: liste.uge ? 'Uge ' + ugeNr(liste.uge) : '' })),
      el('div', { class: 'liste-status' }, tal, el('span', { class: 'liste-maaler', 'aria-hidden': 'true' }, fyld)),
      K.S.listeBesked ? el('p', { class: 'liste-besked', role: 'status', tekst: K.S.listeBesked }) : null,
      advarsel,
      krop));
}
