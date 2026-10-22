// ugeplan.js — skærmene til ugeplanen og indkøbslisten (docs/ugeplan-plan.md, afsnit 1-3):
//   #/hent/<kode>  telefonen: gemmer listen fra linket og skifter adressen til #/indkoeb (history.replaceState)
//   #/indkoeb      telefonen: listen, der krydses af i butikken. Er den tom, kan linket sættes ind i et felt
//   #/uge          iPad og desktop: den voksnes oversigt over ugen, Send til telefon, Del som tekst, Print og Ny uge
//   #/uge/dag/<n>  den voksne vælger en ret til dag n (1 = mandag) med filtrene højst 40 min, billigst og mindst kniv
// Koden i linket kommer udefra. Den går kun gennem afkod() i js/plankode.js, og intet fra adressen kommer i DOM'en: fejlene
// er faste tekster, og listen gemmes med den genskrevne kode. Lageret røres kun gennem js/lager.js, og al tekst sættes
// som tekst (js/dom.js). app.js ejer ruterne og tilstanden (S) og giver sine hjælpere med init().
import { el, ikon } from './dom.js';
import * as Lager from './lager.js';
import { afkod, kod, ukendtTekst, BESKED_UGYLDIG, BESKED_NYERE } from './plankode.js';
import { saml, grupper, tekst as listeTekst } from './indkoeb.js';
import { DYR, grafikIngrediens, grafikRet, grafikDyr } from './katalog.js';
import { ugeNr, dagDato, planMandag } from './tid.js';
import { minutterTekst } from './tekst.js';
import { holdKnap } from './hold.js';

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
  if (raa === 'uge') return { uge: true, side: 'oversigt' };
  const dag = /^uge\/dag\/([1-7])$/.exec(raa);
  if (dag) return { uge: true, side: 'dag', i: Number(dag[1]) - 1 };
  if (raa.startsWith('uge/')) return { uge: true, side: 'oversigt' };
  return null;
}

let sidsteSide = null;
export function skaerm(r) {
  if (r.side !== 'indkoeb') K.S.listeBesked = null;
  // Beskederne under oversigtens knapper («Linket er kopieret») hører til den skærm, de kom på
  if (r.side !== sidsteSide) oversigtBesked = null;
  sidsteSide = r.side;
  if (r.side === 'hent') return hentSkaerm(r.kode);
  if (r.side === 'oversigt') return oversigtSkaerm();
  if (r.side === 'dag') return dagSkaerm(r.i);
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

// ---------- Ugeplanen: fælles for den voksne og barnet ----------

const DAG_MS = 86400000;
const dyrNavn = (af) => (Object.hasOwn(DYR, af) ? DYR[af].split(',')[0] : '');
const knivtrin = (m) => m.trin.filter((t) => t.verbum === 'skaere' || t.verbum === 'rive').length;
const iPlanen = () => K.S.ids.map(model).filter((m) => m && m.uge);
// Prisen for de valgte portioner (opskriftens pris er for hele retten)
const prisFor = (m, n) => (m.uge.prisKr * n) / m.uge.portioner;

// Tid, pris, grønt og kniv i én linje, som oversigten og valget viser dem
function metaTekst(m, n) {
  const kniv = knivtrin(m);
  return [
    m.minutter ? minutterTekst(m.minutter) : '',
    'ca. ' + Math.round(prisFor(m, n)) + ' kr.',
    Math.round(m.uge.groentG / m.uge.portioner) + ' g grønt pr. person',
    kniv ? kniv + ' knivtrin' : 'ingen kniv',
  ].filter(Boolean).join(' · ');
}

// Planen, som skærmen viser den. Den læses med alle id'erne fra index.json, så en dag, hvis opskrift ikke kunne hentes,
// stadig står der
const hentPlan = () => Lager.hentUge(K.S.ids);

// Ændrer planen: læser altid hele planen lige før (alle id'er fra index.json, ikke kun de hentede retter), så en dag,
// der ikke er vist, aldrig gemmes tom (code review af trin 1-5). fn får en kopi og returnerer ændringen.
// Svar: den gemte plan eller null (låst af en nyere udgave, eller lageret fejler)
let oversigtBesked = null; // { tekst, fejl?, felt? } under oversigtens knapper
function gemPlan(fn) {
  if (!klar()) return null;
  const p = hentPlan();
  if (p.laast) return null;
  const aendring = fn({ ...p, dage: [...p.dage] });
  const ny = Lager.gemUge({ ...aendring, uge: aendring.uge || p.uge || planMandag(), rettet: Date.now() }, K.S.ids);
  if (!ny) oversigtBesked = { tekst: 'Planen kunne ikke gemmes på denne enhed. Måske er privat browsing slået til, eller lageret er fuldt.', fejl: true };
  return ny;
}

// Tegner skærmen igen uden at skifte adresse, og giver fokus tilbage til knappen med data-fokus
function tegnIgen(fokus) {
  K.vis();
  if (fokus) document.querySelector('[data-fokus="' + fokus + '"]')?.focus({ preventScroll: true });
}

// Ugen er gået, når dens søndag er forbi (planMandag er i dag, eller den næste mandag)
const ugenErGaaet = (uge) => Boolean(uge) && Date.parse(uge + 'T00:00:00Z') + 7 * DAG_MS <= Date.parse(planMandag() + 'T00:00:00Z');

// Linket til telefonen og varerne til «Del som tekst»: kun dage, hvis ret er hentet og står i ugeplanen, kommer på listen
function ugensData(p) {
  const uge = p.uge || planMandag();
  const dage = p.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  const valg = p.dage.filter(Boolean).map((d) => ({ m: model(d.ret), n: d.n })).filter((x) => x.m && x.m.uge)
    .map((x) => ({ ret: { tumbi: x.m.uge.tumbi }, n: x.n }));
  return { uge, kode: kod(uge, dage), varer: saml(valg), antal: valg.length };
}

// ---------- #/uge: den voksnes oversigt ----------

function medFokus(b, noegle) {
  b.dataset.fokus = noegle;
  return b;
}

function stepper({ vaerdi, navn, enhed, fokus, saet }) {
  return el('div', { class: 'stepper', role: 'group', 'aria-label': navn },
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'minus', label: 'Færre: ' + navn, onclick: () => saet(vaerdi - 1, fokus + '-minus') }), fokus + '-minus'),
    el('output', { class: 'stepper-tal', tekst: vaerdi + ' ' + enhed }),
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'plus', label: 'Flere: ' + navn, onclick: () => saet(vaerdi + 1, fokus + '-plus') }), fokus + '-plus'));
}

function dagRaekke(p, d, i) {
  const navn = DAGE[i];
  const lille = navn.toLowerCase();
  const hoved = el('div', { class: 'dag-hoved' }, el('span', { class: 'dag-navn', tekst: navn }),
    el('span', { class: 'dag-dato', tekst: dagDato(p.uge || planMandag(), i) }));
  const li = (...born) => el('li', { class: 'dag' + (d ? '' : ' fri'), 'data-dag': String(i) }, hoved, ...born);
  if (!d) {
    return li(el('div', { class: 'dag-ret' }, el('span', { class: 'dag-ret-navn', tekst: 'Fri aften' })),
      el('div', { class: 'dag-knapper' },
        medFokus(K.knap('Vælg ret', { klasse: 'lille', ikonNavn: 'plus', label: 'Vælg ret til ' + lille, onclick: () => K.naviger('#/uge/dag/' + (i + 1)) }), 'dag-' + i + '-vaelg')));
  }
  const m = K.S.retter.get(d.ret);
  const fjern = medFokus(K.knap('Fjern', { klasse: 'lille', ikonNavn: 'kryds', label: 'Fjern retten fra ' + lille, onclick: () => {
    if (gemPlan((q) => { q.dage[i] = null; return { dage: q.dage }; })) K.annoncer(navn + ' er en fri aften.');
    tegnIgen('dag-' + i + '-vaelg');
  } }), 'dag-' + i + '-fjern');
  const byt = medFokus(K.knap('Byt ret', { klasse: 'lille', label: 'Byt retten ' + lille, onclick: () => K.naviger('#/uge/dag/' + (i + 1)) }), 'dag-' + i + '-byt');
  if (!m || m instanceof Error || !m.uge) {
    const tekst = m instanceof Error ? 'Opskriften kunne ikke hentes. Tjek internetforbindelsen.' : 'Retten er ikke længere i ugeplanen.';
    return li(el('div', { class: 'dag-ret' }, el('span', { class: 'dag-ret-navn', tekst: m && !(m instanceof Error) ? m.navn : 'Ukendt ret' }),
      el('span', { class: 'dag-meta', tekst })), el('div', { class: 'dag-knapper' }, byt, fjern));
  }
  const portioner = stepper({ vaerdi: d.n, navn: 'portioner ' + lille, enhed: 'pers.', fokus: 'dag-' + i, saet: (n, fokus) => {
    if (n < 1 || n > 12) return;
    if (gemPlan((q) => { if (q.dage[i]) q.dage[i] = { ...q.dage[i], n }; return { dage: q.dage }; })) K.annoncer(navn + ': ' + n + ' personer.');
    tegnIgen(fokus);
  } });
  return li(
    K.billede(grafikRet(m.id), '', 'dag-billede'),
    el('div', { class: 'dag-ret' },
      el('span', { class: 'dag-ret-navn', tekst: m.navn }),
      el('span', { class: 'dag-meta', tekst: metaTekst(m, d.n) }),
      el('span', { class: 'dag-af' }, K.billede(grafikDyr(d.af), '', 'dag-dyr'), el('span', { tekst: 'Valgt af ' + dyrNavn(d.af) }))),
    el('div', { class: 'dag-knapper' }, portioner, byt, fjern));
}

// Delearket (AirDrop eller Beskeder), ellers udklipsholderen, ellers et felt, man selv kopierer fra.
// Svar: beskeden under knapperne, eller null, når man selv lukkede delearket (så står den forrige besked)
async function del(data, kopi, tekster) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return { tekst: tekster.delt };
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      // Delearket kan ikke bruges her (fx uden tilladelse): kopiér i stedet
    }
  }
  try {
    await navigator.clipboard.writeText(kopi);
    return { tekst: tekster.kopieret };
  } catch (e) {
    return { tekst: tekster.felt, felt: kopi };
  }
}

async function sendLink(data) {
  const url = new URL('#/hent/' + data.kode, location.href).href;
  const b = await del({ title: 'Indkøbsliste uge ' + ugeNr(data.uge), url }, url, {
    delt: 'Åbn linket på telefonen. Så ligger listen dér, også uden net.',
    kopieret: 'Linket er kopieret. Sæt det ind i en besked til telefonen.',
    felt: 'Kopiér linket herunder, og send det til telefonen.',
  });
  if (b) { oversigtBesked = b; tegnIgen('send'); }
}

async function delTekst(data) {
  const titel = 'Indkøbsliste uge ' + ugeNr(data.uge);
  const tekst = titel + '\n\n' + listeTekst(data.varer);
  const b = await del({ title: titel, text: tekst }, tekst, {
    delt: 'Listen er delt som tekst. I Noter: markér linjerne, og tryk på tjeklisten.',
    kopieret: 'Listen er kopieret. Sæt den ind i Noter, markér linjerne, og tryk på tjeklisten.',
    felt: 'Kopiér listen herunder, og sæt den ind i Noter.',
  });
  if (b) { oversigtBesked = b; tegnIgen('del'); }
}

function oversigtBeskedEl() {
  const b = oversigtBesked;
  if (!b) return null;
  const flere = Boolean(b.felt) && b.felt.includes('\n');
  const felt = b.felt ? el(flere ? 'textarea' : 'input', { class: 'kopi-felt', readonly: true, rows: flere ? '8' : null,
    'aria-label': flere ? 'Listen som tekst' : 'Linket til telefonen' }) : null;
  if (felt) {
    felt.value = b.felt;
    felt.addEventListener('focus', () => felt.select());
  }
  return el('div', { class: 'uge-besked' + (b.fejl ? ' fejl' : ''), role: b.fejl ? 'alert' : 'status' }, el('p', { tekst: b.tekst }), felt);
}

function oversigtSkaerm() {
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return henter('Henter ugeplanen …');
  const p = hentPlan();
  if (p.laast) {
    return K.statusSkaerm({
      titel: 'Ugeplanen er lavet med en nyere udgave',
      tekst: 'Denne enhed har en ældre udgave af Tumbi Køkken, som ikke må ændre planen. Genindlæs siden, så hentes den nye udgave.',
      handling: K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') }),
    });
  }
  const uge = p.uge || planMandag();
  const data = ugensData(p);
  const harRetter = p.dage.some(Boolean);
  // Summen: prisen for de valgte portioner og dagene med grønt (ud af alle syv; en fri aften tæller som uden)
  let kr = 0;
  let groent = 0;
  for (const d of p.dage) {
    const m = d && model(d.ret);
    if (!m || !m.uge) continue;
    kr += prisFor(m, d.n);
    if (m.uge.groentG > 0) groent++;
  }
  const sum = harRetter ? 'Ca. ' + Math.round(kr / 10) * 10 + ' kr. · grønt ' + groent + ' af 7 dage' : 'Ingen retter endnu';

  const indstillinger = el('div', { class: 'uge-indstillinger' },
    el('div', { class: 'indstilling' }, el('span', { class: 'indstilling-navn', tekst: 'Portioner til nye retter' }),
      stepper({ vaerdi: p.n, navn: 'portioner til nye retter', enhed: 'pers.', fokus: 'plan-n', saet: (n, fokus) => {
        if (n < 1 || n > 12) return;
        gemPlan(() => ({ n }));
        tegnIgen(fokus);
      } })),
    el('div', { class: 'indstilling' }, el('span', { class: 'indstilling-navn', id: 'ind-pr-barn', tekst: 'Retter pr. barn' }),
      el('div', { class: 'valg-par', role: 'group', 'aria-labelledby': 'ind-pr-barn' }, [1, 2].map((x) => {
        const b = medFokus(K.knap(String(x), { klasse: 'lille valg', label: x === 1 ? 'Én ret pr. barn' : 'To retter pr. barn', onclick: () => {
          gemPlan(() => ({ prBarn: x }));
          tegnIgen('pr-barn-' + x);
        } }), 'pr-barn-' + x);
        b.setAttribute('aria-pressed', String(p.prBarn === x));
        return b;
      }))));

  const ny = medFokus(holdKnap({
    klasse: 'lille voksen-hold ny-uge',
    label: 'Ny uge: tømmer planen. Hold knappen inde i 2 sekunder.',
    indhold: [ikon('igen'), el('span', { tekst: 'Ny uge: hold' })],
    naarFaerdig: () => {
      if (gemPlan(() => ({ dage: [null, null, null, null, null, null, null], uge: planMandag() }))) {
        oversigtBesked = { tekst: 'Planen er tømt. Den nye plan er til uge ' + ugeNr(planMandag()) + '.' };
      }
      tegnIgen('ny-uge');
    },
  }), 'ny-uge');

  const knapper = harRetter ? [
    medFokus(K.knap('Indkøbsliste', { klasse: 'primaer', ikonNavn: 'kurv', onclick: () => K.naviger('#/hent/' + data.kode) }), 'liste'),
    medFokus(K.knap('Send til telefon', { ikonNavn: 'telefon', onclick: () => sendLink(data) }), 'send'),
    medFokus(K.knap('Del som tekst', { ikonNavn: 'liste', onclick: () => delTekst(data) }), 'del'),
    el('a', { class: 'knap print-link', href: 'print.html?uge' }, ikon('print'), el('span', { tekst: 'Print' })),
  ] : [];

  return el('main', { class: 'skaerm uge-oversigt' },
    K.topbar(),
    el('div', { class: 'uge' },
      el('header', { class: 'uge-hoved' },
        el('h1', { tabindex: '-1', tekst: 'Ugeplan' }),
        el('p', { class: 'uge-nr', tekst: 'Uge ' + ugeNr(uge) + ' · ' + dagDato(uge, 0) + '–' + dagDato(uge, 6) })),
      ugenErGaaet(p.uge)
        ? el('p', { class: 'uge-advarsel', role: 'status', tekst: 'Uge ' + ugeNr(p.uge) + ' er gået. Hold «Ny uge» for at lave en plan til uge ' + ugeNr(planMandag()) + '.' })
        : null,
      indstillinger,
      el('ol', { class: 'uge-dage', role: 'list', 'aria-label': 'Ugens dage' }, p.dage.map((d, i) => dagRaekke(p, d, i))),
      el('div', { class: 'uge-bund' },
        el('p', { class: 'uge-sum', tekst: sum }),
        harRetter ? null : el('p', { class: 'uge-tom', tekst: 'Vælg mindst én ret, så kan listen sendes til telefonen.' }),
        el('div', { class: 'uge-knapper' }, knapper, harRetter || p.uge ? ny : null),
        oversigtBeskedEl())));
}

// ---------- #/uge/dag/<n>: den voksne vælger en ret til en dag ----------

const filtre = { hurtig: false, billig: false, kniv: false }; // huskes, til siden lukkes
const FILTRE = [
  ['hurtig', 'Højst 40 min'],
  ['billig', 'Billigst først'],
  ['kniv', 'Mindst kniv først'],
];

function dagSkaerm(i) {
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return henter('Henter retterne …');
  const p = hentPlan();
  if (p.laast) return oversigtSkaerm();
  const navn = DAGE[i].toLowerCase();
  const nu = p.dage[i];
  const n = nu ? nu.n : p.n;
  const alle = iPlanen();
  const prisPP = (m) => m.uge.prisKr / m.uge.portioner;
  const retter = alle.filter((m) => !filtre.hurtig || (m.minutter != null && m.minutter <= 40))
    .sort((a, b) => (filtre.kniv ? knivtrin(a) - knivtrin(b) : 0) || (filtre.billig ? prisPP(a) - prisPP(b) : 0));

  const chips = el('div', { class: 'filtre', role: 'group', 'aria-label': 'Filtre' }, FILTRE.map(([k, tekst]) => {
    const b = medFokus(K.knap(tekst, { klasse: 'lille filter', onclick: () => { filtre[k] = !filtre[k]; tegnIgen('filter-' + k); } }), 'filter-' + k);
    b.setAttribute('aria-pressed', String(filtre[k]));
    return b;
  }));

  // Den voksnes valg står som Bos (afsnit 1). Byttes en ret, beholder dagen dyret og portionerne
  const vaelg = (m) => {
    const gemt = gemPlan((q) => {
      const gl = q.dage[i];
      q.dage[i] = { ret: m.id, af: gl ? gl.af : 'bo', n: gl ? gl.n : q.n };
      return { dage: q.dage };
    });
    if (gemt) K.annoncer(m.navn + ' står nu på ' + navn + '.');
    K.naviger('#/uge');
  };

  let indhold;
  if (!alle.length) {
    indhold = el('p', { class: 'uge-tom', tekst: 'Der er ingen retter i ugeplanen endnu.' });
  } else if (!retter.length) {
    indhold = el('div', { class: 'uge-tom' },
      el('p', { tekst: 'Ingen af retterne tager højst 40 minutter.' }),
      medFokus(K.knap('Vis alle retter', { klasse: 'lille', onclick: () => { filtre.hurtig = false; tegnIgen('filter-hurtig'); } }), 'vis-alle'));
  } else {
    indhold = el('ul', { class: 'ret-valg', 'aria-label': 'Retter i ugeplanen' }, retter.map((m) => {
      const valgt = Boolean(nu) && nu.ret === m.id;
      return el('li', { class: 'ret-valg-raekke' + (valgt ? ' valgt' : ''), 'data-ret': m.id },
        K.billede(grafikRet(m.id), '', 'dag-billede'),
        el('div', { class: 'dag-ret' },
          el('span', { class: 'dag-ret-navn', tekst: m.navn }),
          el('span', { class: 'dag-meta', tekst: metaTekst(m, n) }),
          valgt ? el('span', { class: 'dag-af', tekst: 'Står på ' + navn + ' nu' }) : null),
        K.knap(valgt ? 'Behold' : 'Vælg', { klasse: 'lille vaelg-ret', ikonNavn: 'tjek', label: (valgt ? 'Behold ' : 'Vælg ') + m.navn + ' til ' + navn,
          onclick: () => vaelg(m) }));
    }));
  }

  return el('main', { class: 'skaerm uge-oversigt' },
    K.topbar(),
    el('div', { class: 'uge' },
      el('header', { class: 'uge-hoved' },
        el('h1', { tabindex: '-1', tekst: 'Vælg ret til ' + navn }),
        el('p', { class: 'uge-nr', tekst: DAGE[i] + ' ' + dagDato(p.uge || planMandag(), i) + ' · ' + n + ' pers.' })),
      el('div', { class: 'dag-vaerktoej' },
        K.knap('Tilbage til ugeplanen', { klasse: 'lille', ikonNavn: 'tilbage', onclick: () => K.naviger('#/uge') }),
        chips),
      indhold));
}
