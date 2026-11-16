// ugeplan.js — skærmene til ugeplanen og indkøbslisten (docs/ugeplan-plan.md, afsnit 1-3):
//   #/hent/<kode>  telefonen: gemmer listen fra linket og skifter adressen til #/indkoeb (history.replaceState)
//   #/indkoeb      telefonen: listen, der krydses af i butikken. Er den tom, kan linket sættes ind i et felt
//   #/uge          gammel adresse: js/voksen-del.js sender den videre til #/voksen (voksendelens forside er ugeplanen),
//                  og #/uge/dag/<n> til #/voksen/dag/<n> (vælg en ret til dagen). Her står ugens dage og arket under en
//                  dag (ugeIndhold), handlingerne under «Mere» (ugeHandlinger: Send til telefon, Del som tekst, Print,
//                  Ny uge) og saetDag. Det hele ligger bag voksendelens lås (laasFor), #/uge/vaelg ikke
//   #/uge/vaelg    iPad: børnene vælger med dyrene, billederne og stemmen (hvem → ret → dag) blandt ugens udvalg fra
//                  voksendelen (favoritterne og nye retter, højst 12, når der intet udvalg er: retterTilBoern)
// Koden i linket kommer udefra. Den går kun gennem afkod() i js/plankode.js, og intet fra adressen kommer i DOM'en: fejlene
// er faste tekster, og listen gemmes med den genskrevne kode. Lageret røres kun gennem js/lager.js, og al tekst sættes
// som tekst (js/dom.js). app.js ejer ruterne og tilstanden (S) og giver sine hjælpere med init().
import { el, ikon, ledLinje, printLink } from './dom.js';
import * as Lager from './lager.js';
import { afkod, kod, kodeFraTekst, ukendtTekst, BESKED_UGYLDIG, BESKED_NYERE, BESKED_GAMMEL } from './plankode.js';
import { saml, grupper, tekst as listeTekst, manglerTekst, holdSammen } from './indkoeb.js';
import { DYR, grafikIngrediens, grafikRet, grafikDyr } from './katalog.js';
import { ugeNr, dagDato, planMandag, ugenErGaaet, DAGE } from './tid.js';
import { minutterTekst, utenBloede } from './tekst.js';
import { holdKnap } from './hold.js';
import { maerkerFor, MAERKER } from './maerker.js';
import { knivtrin } from './model.js';
import { valgt as udgaveAf } from './groent.js';
import { blandet } from './grupper.js';
import * as Tale from './tale.js';
import * as R from './replikker.js';

// app.js: { S, knap, klik, billede, lynMaerke, lynTekst, topbar, statusSkaerm, naviger, annoncer, indlaes, vis, huskFra,
// voksne, fraVoksne }. voksne(hash) låser voksendelen op og går til hash, og fraVoksne() siger, om listen er åbnet fra
// voksendelens forside (js/voksen-del.js)
let K = null;
export function init(k) {
  K = k;
  // En anden fane har ændret indkøbslisten: listen, der står fremme her, tegnes igen ud fra lageret (code review U1, 23-10)
  Lager.vedListeAendring(() => {
    if (rute(location.hash)?.side === 'indkoeb') K.vis();
  });
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
  // Dyret og retten tjekkes først i vaelgSkaerm (DYR og index.json): her kun, at de ligner et id
  const v = /^uge\/vaelg(?:\/([a-z]+)(?:\/([a-z0-9-]+))?)?$/.exec(raa);
  if (v) return { uge: true, side: 'vaelg', dyr: v[1] || null, ret: v[2] || null };
  if (raa.startsWith('uge/')) return { uge: true, side: 'oversigt' };
  return null;
}

let sidsteSide = null;
export function skaerm(r) {
  if (r.side !== 'indkoeb') K.S.listeBesked = null;
  if (r.side !== 'vaelg') barnFejl = false;
  // Beskederne under oversigtens knapper («Linket er kopieret») hører til den skærm, de kom på
  if (r.side !== sidsteSide) oversigtBesked = null;
  sidsteSide = r.side;
  // #/uge og #/uge/dag/<n> når aldrig hertil: js/voksen-del.js sender dem videre til #/voksen og #/voksen/dag/<n>
  // (nyAdresse), før app.js spørger her
  if (r.side === 'hent') return hentSkaerm(r.kode);
  if (r.side === 'vaelg') return vaelgSkaerm(r);
  return indkoebSkaerm();
}

// ---------- Fælles ----------

// Opskrifterne er hentet (også dem, der fejlede): først da kan et link læses og en liste regnes ud
const klar = () => Boolean(K.S.ids) && K.S.ids.every((id) => K.S.retter.has(id));
// «Mere grønt i maden» fra voksendelen (js/groent.js): er den slået til på denne enhed, viser og regner ugeplanen med
// retten med halvt kød og halvt røde linser (navnet er det samme, prisen, grønt og varerne er dens egne), og linket til
// telefonen siger det. Telefonen bruger linkets valg, ikke sit eget (hentSkaerm)
const mereGroent = () => Boolean(K.S.ids) && Lager.mereGroentPaa(K.S.ids);
// Retten i den udgave, groen siger (som standard denne enheds valg), eller null, når den ikke er hentet
const model = (id, groen = mereGroent()) => {
  const m = K.S.retter.get(id);
  return m && !(m instanceof Error) ? udgaveAf(m, groen) : null;
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
      if (r.fejl === 'nyere') siger(BESKED_NYERE);
      else if (r.fejl === 'gammel') siger(BESKED_GAMMEL + ' Lav en ny plan på iPad\'en, og send linket igen.');
      else siger(BESKED_UGYLDIG + ' Tjek, at hele linket kom med.');
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

// Et link til en uge mere end 8 uger tilbage er ikke skåret over: den voksne laver en ny plan (code review U4, 23-10)
function linkFejl(fejl) {
  const [besked, tekst] = {
    nyere: [BESKED_NYERE, 'Telefonen har en ældre udgave af Tumbi Køkken. Genindlæs siden, og åbn linket igen.'],
    gammel: [BESKED_GAMMEL, 'Linket er til en uge, der ligger mere end 8 uger tilbage. Lav en ny plan på iPad\'en, og send linket igen.'],
  }[fejl] || [BESKED_UGYLDIG, 'Måske er linket skåret over i beskeden. Send det igen fra iPad\'en, eller sæt hele linket ind herunder.'];
  return K.statusSkaerm({
    titel: besked.replace(/\.$/, ''),
    tekst,
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
  // En app, der pakker linket ind (mail, beskeder), kan kode ~ som %7E. Det er det samme link (~ er et ureserveret tegn,
  // RFC 3986), så det laves om som i feltet (kodeFraTekst). afkod tjekker stadig resten (code review F6, 23-10)
  const r = afkod(kode.replace(/%7e/gi, '~'), { retter: K.S.ids, idag: new Date() });
  if (!r.ok) return linkFejl(r.fejl);
  if (gemFejlet === r.kode) { gemFejlet = null; return gemFejl(); }
  // Varerne regnes ud nu og gemmes (et øjebliksbillede, afsnit 3). Kunne en af ugens retter ikke hentes, gemmes intet:
  // ellers manglede dens varer på listen uden at nogen opdagede det
  let ukendte = r.ukendte;
  const valg = [];
  for (const d of r.dage) {
    if (!d) continue;
    if (K.S.retter.get(d.ret) instanceof Error) return hentFejl();
    const m = model(d.ret, r.mereGroent);
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

// Telefonen har allerede en liste: den erstattes kun, når man siger det (man kan stå midt i butikken).
// «uge 44» har et hårdt mellemrum: på 360 px stod «44» alene på knappens anden linje (UI-review 2, 23-10)
function erstatSkaerm(gl, ny) {
  const glUge = gl.uge ? 'uge\u00a0' + ugeNr(gl.uge) : 'den gamle uge';
  const tal = optaelling(grupper(gl.varer), new Set(gl.koebt), new Set(gl.harVi));
  // Hver uges nummer står én gang: før stod den gamle uge både i overskriften og på «Behold», og med et nyt link til samme
  // uge stod «uge 45» tre steder (UI-review 27-10)
  const nyUge = gl.uge && gl.uge === ny.uge ? 'Det nye link er en ny liste til samme uge.' : 'Det nye link er til uge\u00a0' + ugeNr(ny.uge) + '.';
  return K.statusSkaerm({
    titel: 'Erstat listen for ' + glUge + '?',
    tekst: nyUge + ' På listen, der er på telefonen nu, er ' + tal.koebt + ' af ' + tal.ialt + ' købt.',
    handling: el('div', { class: 'status-knapper' },
      // Pilen rundt, ikke kurven: kurven betyder «hent», og Erstat sletter fluebenene på den gamle liste. Erstat er stadig
      // den gule knap, fordi et nyt link næsten altid sendes for at få den nye uges liste (UI-review V9, 23-10)
      K.knap('Erstat listen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => {
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
      K.knap('Behold den gamle liste', { onclick: () => { tilListe(0); K.vis(); } })),
  });
}

// ---------- #/indkoeb ----------

// Listens top: huset til børnenes forside, eller «Til ugeplanen», når listen er åbnet med boblen på voksendelens forside,
// og låsen stadig er åben (fraVoksne i js/voksen-del.js, review U2, 16-11)
const listeTopbar = () => (K.fraVoksne?.()
  ? K.topbar(null, '#/voksen', { tekst: 'Til ugeplanen', label: 'Til ugeplanen' })
  : K.topbar());

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

  // Hvert tryk retter ét id i det, der er gemt nu, og gemmer begge felter i ét kald: en anden fane med samme liste kan
  // have krydset af imens. Er listen erstattet (eller låst) dér, tegnes den nye i stedet (code review U1, 23-10).
  // Kunne lageret ikke skrive sidst, er hukommelsen nyere end lageret og bruges i stedet. Svar: false, når skærmen er tegnet om
  let ikkeGemt = false;
  function aendr(fn) {
    const nu = Lager.hentListe();
    if (nu.laast || nu.kode !== liste.kode) {
      K.vis();
      document.querySelector('main h1')?.focus({ preventScroll: true });
      return false;
    }
    if (!ikkeGemt) Object.assign(st, { koebt: new Set(nu.koebt), harVi: new Set(nu.harVi) });
    fn();
    ikkeGemt = !Lager.gemListe({ koebt: [...st.koebt], harVi: [...st.harVi] });
    advarsel.hidden = !ikkeGemt;
    return true;
  }


  function vareKnap(v) {
    const koebt = st.koebt.has(v.id);
    const b = el('button', { type: 'button', class: 'vare', 'aria-pressed': String(koebt) },
      el('span', { class: 'vare-tjek', 'aria-hidden': 'true' }, ikon('tjek')),
      K.billede(grafikIngrediens(v.ikon), '', 'vare-ikon'),
      el('span', { class: 'vare-tekst' },
        el('span', { class: 'vare-navn', tekst: v.navn }),
        v.maengde ? el('span', { class: 'vare-maengde', tekst: holdSammen(v.maengde) }) : null));
    // Trykket gør det, knappen viser (koebt fra tegningen), ikke det modsatte af lageret: en fane, der ikke er tegnet om
    // efter en afkrydsning i en anden fane, må ikke fjerne den (code review F1, 23-10)
    b.addEventListener('click', spaer(() => {
      if (!aendr(() => { if (koebt) st.koebt.delete(v.id); else st.koebt.add(v.id); })) return;
      tegn(v.id, '.vare');
      const t = optaelling(alle, st.koebt, st.harVi);
      K.annoncer((st.koebt.has(v.id) ? 'Købt: ' : 'Ikke købt: ') + utenBloede(v.navn) + '. ' + t.koebt + ' af ' + t.ialt + ' købt.');
    }));
    return b;
  }

  function flytKnap(v, harVi) {
    const tekst = harVi ? 'Skal købes' : 'Har vi';
    return K.knap(tekst, { klasse: 'har-vi', label: tekst + ': ' + utenBloede(v.navn), onclick: spaer(() => {
      if (!aendr(() => { if (harVi) st.harVi.delete(v.id); else { st.harVi.add(v.id); st.koebt.delete(v.id); } })) return;
      tegn(v.id, '.har-vi');
      K.annoncer(harVi ? utenBloede(v.navn) + ' skal købes.' : utenBloede(v.navn) + ' står under «Har vi allerede».');
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
            v.maengde ? el('span', { class: 'vare-maengde', tekst: holdSammen(v.maengde) }) : null)),
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
      const m = d && model(d.ret, r.mereGroent);
      if (!m || !m.uge) return null;
      // Retten åbnes i linkets udgave (med «/groen»), ikke telefonens egen: ellers viste retten alt kødet og ingen linser,
      // mens listen havde linserne (code review kode-2). Rettens pil fører tilbage til listen
      // tabindex: Safari springer et link uden tabindex over med Tab (review R5, 15-11, som F2)
      return el('li', {}, el('a', { class: 'ret-link', href: '#/ret/' + m.id + (m.erGroen ? '/groen' : ''), tabindex: '0', onclick: () => K.huskFra(m.id) },
        K.billede(grafikRet(m.id), '', 'ret-link-billede'),
        el('span', { class: 'vare-tekst' },
          el('span', { class: 'vare-navn', tekst: m.navn }),
          ledLinje('span', { class: 'vare-maengde' }, [DAGE[i] + ' ' + dagDato(r.uge, i), d.n + ' pers.']))));
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
    listeTopbar(),
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

const dyrNavn = (af) => (Object.hasOwn(DYR, af) ? DYR[af].split(',')[0] : '');
const iPlanen = () => {
  const groen = mereGroent();
  return K.S.ids.map((id) => model(id, groen)).filter((m) => m && m.uge);
};
// Prisen for de valgte portioner (opskriftens pris er for hele retten)
const prisFor = (m, n) => (m.uge.prisKr * n) / m.uge.portioner;
// «2 knivtrin» eller «ingen kniv»: tælles af knivtrin i js/model.js, som mærket «ingen kniv» (js/maerker.js) og filteret
// «Mindst kniv først» også bruger, så de aldrig er uenige. Også dåseåbneren med voksen-kniv tæller (Jimmys valg A, 01-11)
export function knivTekst(m) {
  const kniv = knivtrin(m);
  return kniv ? kniv + ' knivtrin' : 'ingen kniv';
}

// Rækkefølgen i vælg-tilstanden (#/voksen/dag/<n> i js/voksen-del.js): «Mindst kniv først» efter knivtrin (som «N
// knivtrin»), «Billigst først» efter pris pr. portion, begge valgt: kniv først og så pris. Ellers som i planen. Giver en
// ny liste
export function sorterValg(retter, { kniv = false, billig = false } = {}) {
  const prisPP = (m) => m.uge.prisKr / m.uge.portioner;
  return [...retter].sort((a, b) => (kniv ? knivtrin(a) - knivtrin(b) : 0) || (billig ? prisPP(a) - prisPP(b) : 0));
}

// Tid, pris, grønt, kniv og «mere grønt» (derfor er prisen lavere) i én linje, som oversigten og valget viser dem. Hvert led
// holdes sammen med hårde mellemrum, så linjen kun brydes mellem leddene: før stod der «268 g grønt pr. | person» og
// «· 2 knivtrin» alene (UI-review V5, 23-10). Prikken skjules, hvor linjen brydes (ledLinje i js/dom.js)
const SKILLE_HEL = '\u00a0· ';
export function metaLinje(m, n) {
  return ledLinje('span', { class: 'dag-meta' }, [
    m.minutter ? minutterTekst(m.minutter) : '',
    'ca. ' + Math.round(prisFor(m, n)) + ' kr.',
    Math.round(m.uge.groentG / m.uge.portioner) + ' g grønt pr. person',
    knivTekst(m),
    m.erGroen ? 'mere grønt' : '',
  ].filter(Boolean).map((led) => led.replace(/ /g, '\u00a0')), SKILLE_HEL);
}

// Planen, som skærmen viser den. Den læses med alle id'erne fra index.json, så en dag, hvis opskrift ikke kunne hentes,
// stadig står der
const hentPlan = () => Lager.hentUge(K.S.ids);

// Ændrer planen: læser altid hele planen lige før (alle id'er fra index.json, ikke kun de hentede retter), så en dag,
// der ikke er vist, aldrig gemmes tom (code review af trin 1-5). fn får en kopi og returnerer ændringen.
// Svar: den gemte plan eller null (låst af en nyere udgave, eller lageret fejler)
let oversigtBesked = null; // { tekst, fejl?, felt?, ret? } under oversigtens knapper (ret: ved den ret på dagskærmen)
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

// Efter «Send til telefon» og «Del som tekst»: beskeden under knapperne rulles frem, så vejledningen (og feltet) kan ses.
// Fokus bliver på knappen. På iPad'en lå beskeden under bunden (UI-review V1, 23-10). Uden animation ved «mindre bevægelse»
function visBesked(fokus) {
  tegnIgen(fokus);
  document.querySelector('.uge-besked')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// Linket til telefonen og varerne til «Del som tekst»: kun dage, hvis ret er hentet og står i ugeplanen, kommer på listen.
// «mangler» siger, hvor mange dage der ikke kom med, og hvorfor (som dagens række i oversigten: en fejl ved hentningen,
// ellers er retten ikke længere i ugeplanen)
function ugensData(p) {
  const uge = p.uge || planMandag();
  const groen = mereGroent();
  const dage = p.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  const valg = p.dage.filter(Boolean).map((d) => ({ m: model(d.ret, groen), n: d.n })).filter((x) => x.m && x.m.uge)
    .map((x) => ({ ret: { tumbi: x.m.uge.tumbi }, n: x.n }));
  const udenfor = p.dage.filter((d) => d && !(model(d.ret, groen) && model(d.ret, groen).uge));
  const ikkeHentet = udenfor.filter((d) => K.S.retter.get(d.ret) instanceof Error).length;
  return { uge, kode: kod(uge, dage, { mereGroent: groen }), varer: saml(valg), antal: valg.length, mangler: manglerTekst(ikkeHentet, udenfor.length - ikkeHentet) };
}

// ---------- #/voksen: ugen på voksendelens forside (js/voksen-del.js bygger skærmen) ----------
// voksen-del.js står for boblerne øverst, «Luk», låsen og #/voksen/dag/<n> (kataloget i vælg-tilstand). Her står ugens
// dage, summen, advarslen og hjælpen til en tom uge (ugeIndhold), handlingerne under «Mere» (ugeHandlinger) og det, der
// lægger en ret på en dag (saetDag). Et tryk på en tom dag går til vælg-tilstanden; et tryk på en udfyldt dag folder et
// lille ark ud under den med portionerne, «Byt ret», «Fjern» og «Åbn retten». Ét ark ad gangen, og kun i hukommelsen

let aabenDag = null; // dagen (0-6), hvis ark er foldet ud, eller null

// En ny side i voksendelen: beskeden og arket hørte til den side, de kom på
export function glemVisning() {
  oversigtBesked = null;
  aabenDag = null;
}

function medFokus(b, noegle) {
  b.dataset.fokus = noegle;
  return b;
}

function stepper({ vaerdi, navn, enhed, fokus, saet }) {
  return el('div', { class: 'stepper', role: 'group', 'aria-label': navn },
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'minus', label: 'Færre: ' + navn, onclick: () => saet(vaerdi - 1, fokus + '-minus') }), fokus + '-minus'),
    el('output', { class: 'stepper-tal', tekst: vaerdi + '\u00a0' + enhed }),
    medFokus(K.knap('', { klasse: 'rund trin-knap', ikonNavn: 'plus', label: 'Flere: ' + navn, onclick: () => saet(vaerdi + 1, fokus + '-plus') }), fokus + '-plus'));
}

// Lægger retten id på dag i (0 = mandag) gennem gemPlan, som læser hele planen lige før (M1). Den voksnes valg står som
// Bos (afsnit 1). Byttes en ret, beholder dagen dyret og portionerne. Svar: den gemte plan eller null
export function saetDag(i, id) {
  if (!Number.isInteger(i) || i < 0 || i >= DAGE.length) return null;
  return gemPlan((q) => {
    const gl = q.dage[i];
    q.dage[i] = { ret: id, af: gl ? gl.af : 'bo', n: gl ? gl.n : q.n };
    return { dage: q.dage };
  });
}

// Varerne, der skal købes til ugens plan (uden basisvarerne: salt, peber, olie), til boblen «Indkøbsliste». 0 uden plan
export function antalVarer() {
  if (!klar()) return 0;
  const p = hentPlan();
  if (p.laast) return 0;
  return grupper(ugensData(p).varer).filter((g) => g.afd !== 'basis').reduce((s, g) => s + g.varer.length, 0);
}

// En plan fra en nyere udgave: linjen på forsiden og «Mere», og statusskærmen til børnenes valg og vælg-tilstanden.
// Teksterne står kun her (review F6, 16-11)
const LAAST_TEKST = 'Ugeplanen er lavet med en nyere udgave af Tumbi Køkken, så den kan ikke ændres her. Genindlæs siden, så hentes den nye udgave.';
// handling: knappen væk fra skærmen (børnenes valg: huset; vælg-tilstanden: «Tilbage» til voksendelen)
export const laastPlanSkaerm = (handling = K.knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => K.naviger('#/') })) => K.statusSkaerm({
  titel: 'Ugeplanen er lavet med en nyere udgave',
  tekst: 'Denne enhed har en ældre udgave af Tumbi Køkken, som ikke må ændre planen. Genindlæs siden, så hentes den nye udgave.',
  handling,
});

// Et link til en uge mere end 8 uger fra i dag afviser afkod (på telefonen og på #/hent/ her). Så går «Indkøbsliste» til
// den gemte liste, og advarslen siger, hvad den voksne gør; «Del som tekst» og «Print» virker stadig (U4, 23-10).
// «Ny uge» og «uge 44» har hårde mellemrum: på 390 px brød de som «Ny | uge» (UI-review 2, 23-10)
const kanSendes = (p, data) => !p.dage.some(Boolean) || afkod(data.kode, { retter: K.S.ids, idag: new Date() }).ok;
function advarselFor(p, data) {
  const uge = p.uge || planMandag();
  const hold = 'hold «Ny\u00a0uge» under «Mere» for at tømme planen';
  const nyPlan = ' og lave en plan til uge\u00a0' + ugeNr(planMandag()) + '.';
  if (!kanSendes(p, data) && ugenErGaaet(p.uge)) return 'Uge\u00a0' + ugeNr(uge) + ' er mere end 8 uger siden, så listen kan ikke sendes til telefonen. H' + hold.slice(1) + nyPlan;
  if (!kanSendes(p, data)) return 'Uge\u00a0' + ugeNr(uge) + ' ligger mere end 8 uger fremme, så listen kan ikke sendes til telefonen. Tjek datoen på iPad\'en, eller ' + hold + '.';
  if (ugenErGaaet(p.uge)) return 'Uge\u00a0' + ugeNr(p.uge) + ' er gået. H' + hold.slice(1) + nyPlan;
  return null;
}

// Arket under en udfyldt dag: tid, pris og kniv, hvem der valgte, portionerne og de tre handlinger
function dagArk(d, i, m, id) {
  const navn = DAGE[i];
  const lille = navn.toLowerCase();
  const kendt = Boolean(m && m.uge);
  const fejlVed = () => { if (oversigtBesked) oversigtBesked.dag = i; };
  const portioner = kendt ? stepper({ vaerdi: d.n, navn: 'portioner ' + lille, enhed: 'pers.', fokus: 'dag-' + i, saet: (n, fokus) => {
    if (n < 1 || n > 12) return;
    if (gemPlan((q) => { if (q.dage[i]) q.dage[i] = { ...q.dage[i], n }; return { dage: q.dage }; })) K.annoncer(navn + ': ' + n + ' personer.');
    else fejlVed();
    tegnIgen(fokus);
  } }) : null;
  const byt = medFokus(K.knap('Byt ret', { klasse: 'lille', ikonNavn: 'igen', label: 'Byt retten ' + lille, onclick: () => K.naviger('#/voksen/dag/' + (i + 1)) }), 'dag-' + i + '-byt');
  const fjern = medFokus(K.knap('Fjern', { klasse: 'lille', ikonNavn: 'kryds', label: 'Fjern retten fra ' + lille, onclick: () => {
    if (gemPlan((q) => { q.dage[i] = null; return { dage: q.dage }; })) {
      aabenDag = null;
      K.annoncer('Retten er fjernet fra ' + lille + '.');
    } else fejlVed();
    tegnIgen('dag-' + i);
  } }), 'dag-' + i + '-fjern');
  // Pilen fra retten fører tilbage hertil (huskFra i app.js). Retten ligger uden for låsen, så holdet kommer først
  const aabn = kendt ? medFokus(K.knap('Åbn retten', { klasse: 'lille', label: 'Åbn retten ' + m.navn, onclick: () => {
    K.huskFra(m.id);
    K.naviger('#/ret/' + m.id);
  } }), 'dag-' + i + '-aabn') : null;
  return el('div', { class: 'voksen-dag-ark', id, role: 'group', 'aria-label': navn },
    kendt ? metaLinje(m, d.n) : null,
    kendt && dyrNavn(d.af) ? el('span', { class: 'dag-af' }, K.billede(grafikDyr(d.af), '', 'dag-dyr'), el('span', { tekst: 'Valgt af ' + dyrNavn(d.af) })) : null,
    portioner ? el('div', { class: 'indstilling' }, el('span', { class: 'indstilling-navn', 'aria-hidden': 'true', tekst: 'Portioner' }), portioner) : null,
    el('div', { class: 'voksen-dag-handlinger' }, byt, fjern, aabn),
    oversigtBesked && oversigtBesked.dag === i ? oversigtBeskedEl() : null);
}

// Arket under dagen ud eller ind. Fokus bliver på dagen, og et udfoldet ark rulles frem, hvis det står under kanten
function skiftArk(i) {
  aabenDag = aabenDag === i ? null : i;
  tegnIgen('dag-' + i);
  if (aabenDag === i) document.querySelector('.voksen-dag-ark')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// En dag på forsiden: hele rækken er én knap. Tom: «+ Vælg ret» (vælg-tilstanden). Udfyldt: billedet, navnet og
// portionerne, og et tryk folder arket ud. Navnet til skærmlæseren er det, der står («Tirsdag 17/11 Vælg ret»)
function forsideDag(p, d, i) {
  const hvornaar = el('span', { class: 'voksen-dag-hvornaar' },
    el('span', { class: 'voksen-dag-ugedag', tekst: DAGE[i] }),
    el('span', { class: 'voksen-dag-dato', tekst: dagDato(p.uge || planMandag(), i) }));
  if (!d) {
    return el('li', { class: 'voksen-dag voksen-dag-tom', 'data-dag': String(i) },
      medFokus(el('button', { type: 'button', class: 'voksen-dag-knap', onclick: K.klik(() => K.naviger('#/voksen/dag/' + (i + 1))) },
        hvornaar, el('span', { class: 'voksen-dag-vaelg' }, ikon('plus'), el('span', { tekst: 'Vælg ret' }))), 'dag-' + i));
  }
  const raa = K.S.retter.get(d.ret);
  const m = model(d.ret);
  const kendt = Boolean(m && m.uge);
  const aaben = aabenDag === i;
  const arkId = 'dag-ark-' + i;
  const under = kendt ? d.n + '\u00a0' + (d.n === 1 ? 'portion' : 'portioner')
    : raa instanceof Error ? 'Opskriften kunne ikke hentes. Tjek internetforbindelsen.' : 'Retten er ikke længere i ugeplanen.';
  const knap = medFokus(el('button', {
    type: 'button',
    class: 'voksen-dag-knap',
    'aria-expanded': String(aaben),
    'aria-controls': aaben ? arkId : null,
    onclick: K.klik(() => skiftArk(i)),
  }, hvornaar,
  kendt ? K.billede(grafikRet(m.id), '', 'voksen-dag-billede') : null,
  el('span', { class: 'voksen-dag-ret' },
    el('span', { class: 'voksen-dag-ret-navn', tekst: m ? m.navn : 'Ukendt ret' }),
    el('span', { class: 'voksen-dag-under', tekst: under })),
  ikon('frem', 'ikon voksen-dag-pil')), 'dag-' + i);
  const li = el('li', { class: 'voksen-dag' + (kendt ? '' : ' voksen-dag-ukendt') + (aaben ? ' voksen-dag-aaben' : ''), 'data-dag': String(i), 'data-ret': d.ret },
    knap, aaben ? dagArk(d, i, m, arkId) : null);
  // Escape lukker arket, både fra dagen og fra knapperne i arket, og fokus står på dagen igen
  if (aaben) {
    li.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      aabenDag = null;
      tegnIgen('dag-' + i);
    });
  }
  return li;
}

// Forsidens indhold under boblerne: advarslen, hjælpen til en tom uge, de syv dage, summen og en besked. En plan fra en
// nyere udgave vises ikke (den kan ikke læses her): kun en fast tekst
export function ugeIndhold() {
  const p = hentPlan();
  if (p.laast) return [el('p', { class: 'uge-advarsel', role: 'status', tekst: LAAST_TEKST })];
  const data = ugensData(p);
  const harRetter = p.dage.some(Boolean);
  const advarsel = advarselFor(p, data);
  // Summen: prisen for de valgte portioner og dagene med grønt (ud af alle syv; en tom dag tæller som uden). Hårde
  // mellemrum i begge led: på 360 px stod «dage» alene på næste linje (UI-review V6, 23-10)
  let kr = 0;
  let groent = 0;
  for (const d of p.dage) {
    const m = d && model(d.ret);
    if (!m || !m.uge) continue;
    kr += prisFor(m, d.n);
    if (m.uge.groentG > 0) groent++;
  }
  const tom = harRetter ? null : el('div', { class: 'voksen-uge-tom' },
    el('p', { tekst: 'Ugen er tom. Tryk på en dag, eller lad børnene vælge.' }),
    medFokus(boernKnap('Lad børnene vælge', 'voksen-boern'), 'boern'));
  return [
    advarsel ? el('p', { class: 'uge-advarsel', role: 'status', tekst: advarsel }) : null,
    tom,
    el('ol', { class: 'voksen-uge', role: 'list', 'aria-label': 'Ugens dage' }, p.dage.map((d, i) => forsideDag(p, d, i))),
    harRetter ? ledLinje('p', { class: 'uge-sum' }, ['Ca.\u00a0' + Math.round(kr / 10) * 10 + '\u00a0kr.', 'grønt\u00a0' + groent + '\u00a0af\u00a07\u00a0dage'], SKILLE_HEL) : null,
    oversigtBesked && oversigtBesked.dag == null ? oversigtBeskedEl() : null,
  ];
}

// «Mere» → «Ugeplanen»: send, del og print listen, portioner til nye retter, retter pr. barn, børnene vælger og «Ny uge»
export function ugeHandlinger() {
  const p = hentPlan();
  if (p.laast) return [el('p', { class: 'uge-advarsel', role: 'status', tekst: LAAST_TEKST })];
  const data = ugensData(p);
  const harRetter = p.dage.some(Boolean);
  const knapper = harRetter ? el('div', { class: 'voksen-knapper' },
    kanSendes(p, data) ? medFokus(K.knap('Send til telefon', { klasse: 'lille', ikonNavn: 'telefon', onclick: () => sendLink(data) }), 'send') : null,
    medFokus(K.knap('Del som tekst', { klasse: 'lille', ikonNavn: 'liste', onclick: () => delTekst(data) }), 'del'),
    // Samme printLink som voksendelen: tabindex til Safari (F2), navnet begynder med «Print» (L4), og fokus kommer
    // tilbage, når skærmen tegnes igen (review R5, 15-11)
    medFokus(printLink('Print', 'print.html?uge', 'Print ugeplanen og indkøbslisten', { klasse: 'lille' }), 'print'))
    : el('p', { class: 'voksen-hjaelp', tekst: 'Vælg mindst én ret på ugeplanen, så kan listen sendes til telefonen, deles og printes.' });

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
      }))),
    medFokus(boernKnap('Børnene vælger'), 'boern'));

  const ny = harRetter || p.uge ? medFokus(holdKnap({
    klasse: 'lille voksen-hold ny-uge',
    label: 'Ny uge: tømmer planen. Hold knappen inde i 2 sekunder.',
    indhold: [ikon('igen'), el('span', { tekst: 'Ny\u00a0uge: hold' })],
    naarFaerdig: () => {
      if (gemPlan(() => ({ dage: [null, null, null, null, null, null, null], uge: planMandag() }))) {
        oversigtBesked = { tekst: 'Planen er tømt. Den nye plan er til uge\u00a0' + ugeNr(planMandag()) + '.' };
      }
      tegnIgen('ny-uge');
    },
  }), 'ny-uge') : null;

  return [knapper, oversigtBeskedEl(), indstillinger, ny ? el('div', { class: 'voksen-knapper' }, ny) : null];
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
  if (b) { oversigtBesked = b; visBesked('send'); }
}

// Mangler en dag på listen, står det under overskriften i teksten og sidst i beskeden (code review U5, 23-10)
async function delTekst(data) {
  const titel = 'Indkøbsliste uge ' + ugeNr(data.uge);
  const tekst = titel + '\n\n' + (data.mangler ? data.mangler + '\n\n' : '') + listeTekst(data.varer);
  const efter = data.mangler ? ' ' + data.mangler : '';
  const b = await del({ title: titel, text: tekst }, tekst, {
    delt: 'Listen er delt som tekst. I Noter: markér linjerne, og tryk på tjeklisten.' + efter,
    kopieret: 'Listen er kopieret. Sæt den ind i Noter, markér linjerne, og tryk på tjeklisten.' + efter,
    felt: 'Kopiér listen herunder, og sæt den ind i Noter.' + efter,
  });
  if (b) { oversigtBesked = b; visBesked('del'); }
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

// Giver iPad'en til børnene: de vælger med dyrene (#/uge/vaelg), og stemmen spørger, hvem der skal vælge. klasse:
// 'boern-vaelger' (app.css) i rækken med indstillingerne under «Mere», 'voksen-boern' (familie.css) på forsiden
function boernKnap(tekst, klasse = 'boern-vaelger') {
  const b = K.knap(tekst, { klasse, onclick: () => {
    nulstilBarn();
    K.naviger('#/uge/vaelg', () => Tale.sig(R.UGE_HVEM));
  } });
  b.prepend(K.billede(grafikDyr('rosa'), '', 'knap-dyr'));
  return b;
}

// ---------- #/uge/vaelg: børnene vælger ugens mad (iPad på langs) ----------
// Tre trin, hvert med sin adresse, så browserens «tilbage» går et trin tilbage:
//   #/uge/vaelg               «Hvem skal vælge?»: Bo, Rosa og Pip (dyrene, aldrig børnenes navne)
//   #/uge/vaelg/<dyr>         fire retter pr. side med pile til flere. Første tryk siger navnet, fluebenet vælger
//   #/uge/vaelg/<dyr>/<ret>   «Hvilken dag?»: syv dagbrikker. En optaget dag viser retten og dyret og siger, at den er optaget
// Rosa og Pip vælger hver højst p.prBarn retter (den voksne sætter 1 eller 2 i oversigten). Bo er den voksne og vælger,
// så længe der er en fri dag ud over dem, børnene mangler: før kunne Bo tage seks dage, og så fik Pip ingen tur
// (UI-review 27-10). Et barn med én ret er også færdigt, når der ikke er flere frie dage end børn uden en ret: med to
// retter pr. barn og fem retter fra oversigten tog Rosa begge frie dage, og Pip fik ingen (code review 28-10). I
// oversigten kan den voksne stadig fylde ugen selv. Børnene kan næsten ikke læse: hvert trin har
// «Læs op», og hvert tryk siger, hvad man trykkede på (R.… fra js/replikker.js, test/test-lyd.js). Planen gemmes kun
// gennem gemPlan, som læser hele planen lige før
const PR_SIDE = 4;
const BOERN = ['rosa', 'pip'];
const barn = { dyr: null, side: 0, ret: null, dag: null }; // valget undervejs (kun i hukommelsen, til det er bekræftet)
let barnFejl = false; // valget kunne ikke gemmes: den voksne får en fejlskærm

const valgtAf = (p, dyr) => p.dage.filter((d) => d && d.af === dyr).length;
const fri = (p) => p.dage.filter((d) => !d).length;
const boernMangler = (p) => BOERN.reduce((s, b) => s + Math.max(0, p.prBarn - valgtAf(p, b)), 0);
const udenRet = (p, dyr) => BOERN.filter((b) => b !== dyr && valgtAf(p, b) === 0).length;
const harValgt = (p, dyr) => (BOERN.includes(dyr)
  ? valgtAf(p, dyr) >= p.prBarn || (valgtAf(p, dyr) > 0 && fri(p) <= udenRet(p, dyr))
  : fri(p) <= boernMangler(p));
const ugenErFuld = (p) => p.dage.every(Boolean);
const nulstilBarn = () => Object.assign(barn, { dyr: null, side: 0, ret: null, dag: null });

// Uden et udvalg vælger børnene blandt højst BOERN_KORT retter (3 sider), og højst BOERN_HJERTER af dem er favoritter, så
// der altid er mindst 2, familien ikke har lavet (docs/fable-foraeldrekogebog-2026-11-10.md, fase 1 b)
export const BOERN_KORT = 12;
export const BOERN_HJERTER = 10;

// Retterne, børnene vælger mellem, i den rækkefølge de står på siderne. familie er hentFamilie fra js/lager.js, grupper
// index.json's grupper. Med et udvalg fra voksendelen: udvalgets retter, der stadig står i alle (ugeplan-retterne),
// blandet over grupperne, så første side ikke kun er pasta. Uden udvalg, eller når ingen af dets retter er tilbage:
// favoritterne først (de mindst nyligt lavede først, højst BOERN_HJERTER), og så retter, der aldrig er lavet (blandet over
// grupperne), til der er BOERN_KORT. Er der ikke nye nok, de mindst nyligt lavede. Ren funktion (test/test-udvalg.js)
export function retterTilBoern(alle, familie, grupper = []) {
  if (!Array.isArray(alle)) throw new TypeError('retterTilBoern: alle skal være en liste med ugeplan-retterne');
  const f = familie && typeof familie === 'object' ? familie : {};
  const gr = Array.isArray(grupper) ? grupper : [];
  const ids = f.udvalg && Array.isArray(f.udvalg.ids) ? f.udvalg.ids : [];
  const valgte = alle.filter((m) => ids.includes(m.id));
  if (valgte.length) return blandet(valgte, gr, (m) => m.id);
  const fav = Array.isArray(f.favoritter) ? f.favoritter : [];
  const lavet = f.lavet && typeof f.lavet === 'object' ? f.lavet : {};
  const erLavet = (m) => Object.hasOwn(lavet, m.id);
  const sidst = (m) => (erLavet(m) && lavet[m.id] && typeof lavet[m.id].sidst === 'string' ? lavet[m.id].sidst : '');
  const tidligstFoerst = (a, b) => (sidst(a) < sidst(b) ? -1 : sidst(a) > sidst(b) ? 1 : 0);
  const hjerter = alle.filter((m) => fav.includes(m.id)).sort(tidligstFoerst).slice(0, BOERN_HJERTER);
  const resten = alle.filter((m) => !fav.includes(m.id));
  const nye = blandet(resten.filter((m) => !erLavet(m)), gr, (m) => m.id);
  const lavede = resten.filter(erLavet).sort(tidligstFoerst);
  return [...hjerter, ...[...nye, ...lavede].slice(0, BOERN_KORT - hjerter.length)];
}
// Antal sider med PR_SIDE retter, mindst én (også uden retter)
export const sideAntal = (retter) => Math.max(1, Math.ceil(retter.length / PR_SIDE));

// Sideprikkerne: højst maks prikker i et vindue, der følger siden. Prikken ved kanten er lille, når der er flere sider
// den vej. 21 prikker på 198 px blev klemt til 4×16 px på en iPhone. Hvilken side det er, siger aria-label
export function prikVindue(side, sider, maks = 7) {
  const antal = Math.min(maks, sider);
  if (!(antal > 0)) return [];
  const nu = Math.min(Math.max(0, side), sider - 1);
  const fra = Math.min(Math.max(0, nu - Math.floor(antal / 2)), sider - antal);
  return Array.from({ length: antal }, (_, k) => ({
    nu: fra + k === nu,
    lille: (k === 0 && fra > 0) || (k === antal - 1 && fra + antal < sider),
  }));
}

// ✨ ny for os og ❤️ favorit på børnenes kort (maerkerFor i js/maerker.js): kun ikonet, med mærkets navn til skærmlæseren.
// De står efter rettens navn, som dyret i hjørnet, så navnet siges først
const BOERNE_MAERKER = { ny: 'maerke-ny', favorit: 'maerke-fav' };
const boerneMaerker = (m, familie) => maerkerFor(m, { familie })
  .filter((k) => Object.hasOwn(BOERNE_MAERKER, k))
  .map((k) => el('span', { class: 'maerke ' + BOERNE_MAERKER[k], role: 'img', 'aria-label': MAERKER[k].navn, tekst: MAERKER[k].ikon }));

function vaelgSkaerm(r) {
  if (K.S.indexFejl) return hentFejl();
  if (!klar()) return henter('Henter retterne …');
  const p = hentPlan();
  if (p.laast) return laastPlanSkaerm();
  if (barnFejl) return barnGemFejl();
  const dyr = r.dyr && Object.hasOwn(DYR, r.dyr) ? r.dyr : null;
  if (!dyr || ugenErFuld(p) || harValgt(p, dyr)) return hvemSkaerm(p);
  if (barn.dyr !== dyr) Object.assign(barn, { dyr, side: 0, ret: null, dag: null });
  const m = r.ret && K.S.ids.includes(r.ret) ? model(r.ret) : null;
  if (m && m.uge) return dagValgSkaerm(p, dyr, m);
  return retValgSkaerm(p, dyr);
}

// Overskriften med «Læs op» ved siden af (børnene kan ikke læse den), og dyret eller retten foran
function valgHoved(titel, laesOp, billede) {
  return el('header', { class: 'valg-hoved' }, billede || null, el('h1', { tabindex: '-1', tekst: titel }), laesOp);
}

function valgSide(klasse, hoved, indhold, ...bund) {
  return el('main', { class: 'skaerm boern-valg ' + klasse },
    K.topbar(),
    el('div', { class: 'valg-indhold' }, hoved, indhold),
    el('footer', { class: 'handlinger valg-bund' }, bund));
}

// Den voksnes vej tilbage til ugeplanen (voksendelens forside): bag et hold, så et barn ikke kommer derud ved et
// tilfælde. Holdet låser voksendelen op igen (børnenes valg lukkede den), så oversigten ikke beder om et hold mere
const tilUgeplanen = () => holdKnap({
  klasse: 'lille voksen-hold til-ugeplan',
  label: 'Ugeplan til den voksne. Hold knappen inde i 2 sekunder.',
  indhold: [ikon('kalender'), el('span', { tekst: 'Ugeplan: hold' })],
  naarFaerdig: () => K.voksne('#/voksen'),
});

// Dagens navn, tallerkenen (rettens billede, eller tom) og dyret, der har valgt. ny: retten, der vises på en fri dag,
// når barnet har trykket på den (så man kan se, hvor maden kommer til at stå)
function brikIndhold(d, i, ny) {
  const m = d ? model(d.ret) : ny;
  return [
    el('span', { class: 'brik-navn', tekst: DAGE[i] }),
    el('span', { class: 'brik-tallerken' }, m ? K.billede(grafikRet(m.id), '') : null),
    d && Object.hasOwn(DYR, d.af) ? K.billede(grafikDyr(d.af), '', 'brik-dyr') : null,
  ];
}
const brikNavn = (d, i) => {
  if (!d) return DAGE[i];
  const m = model(d.ret);
  return DAGE[i] + ': ' + (m ? m.navn : 'optaget') + (Object.hasOwn(DYR, d.af) ? ', valgt af ' + dyrNavn(d.af) : '');
};

// Trin 1: hvem vælger? Under hvert dyr en plads pr. ret: Rosa og Pip har så mange, som de må vælge (fyldt med rettens
// billede, når de har valgt), Bo kun dem, han har valgt. Er et barn færdigt med færre (de frie dage gik til den anden),
// står kun dets retter der: ellers stod en tom plads under fluebenet
function hvemSkaerm(p) {
  if (ugenErFuld(p)) return fuldSkaerm(p);
  const kort = Object.keys(DYR).map((dyr) => {
    const faerdig = harValgt(p, dyr);
    const retter = p.dage.filter((d) => d && d.af === dyr).map((d) => model(d.ret));
    const antal = BOERN.includes(dyr) && !faerdig ? Math.max(p.prBarn, retter.length) : retter.length;
    const pladser = Array.from({ length: antal }, (_, k) => el('span', { class: 'dyr-plads' + (k < retter.length ? ' fyldt' : '') },
      retter[k] ? K.billede(grafikRet(retter[k].id), '') : null));
    const raekke = pladser.length ? el('span', { class: 'dyr-pladser' + (antal > 3 ? ' mange' : ''), 'aria-hidden': 'true' }, pladser) : null;
    // Fra fire pladser står de på to lige lange rækker (seks som 3 + 3): før stod de, så mange der var plads til, og seks
    // blev til 5 + 1 (UI-review 27-10). Er kortet for smalt til halvdelen, deler de sig videre (2 + 2 + 2 på telefonen)
    if (antal > 3) raekke.style.setProperty('--kolonner', String(Math.ceil(antal / 2)));
    return el('li', { class: 'kort-plads' }, el('button', {
      type: 'button',
      class: 'kort dyr-kort' + (faerdig ? ' faerdig' : ''),
      'data-dyr': dyr,
      'data-fokus': 'dyr-' + dyr,
      'aria-label': DYR[dyr] + (faerdig ? '. Har valgt.' : ''),
      onclick: K.klik(() => {
        if (harValgt(hentPlan(), dyr)) { Tale.sig(R.dyrFaerdig(dyr)); return; }
        Object.assign(barn, { dyr, side: 0, ret: null, dag: null });
        K.naviger('#/uge/vaelg/' + dyr, () => Tale.sig(R.dyrVaelger(dyr)));
      }),
    },
    el('span', { class: 'kort-billede' }, K.billede(grafikDyr(dyr), '')),
    el('span', { class: 'kort-navn', tekst: dyrNavn(dyr) }),
    raekke,
    faerdig ? el('span', { class: 'dyr-tjek', 'aria-hidden': 'true' }, ikon('tjek')) : null));
  });
  return valgSide('hvem',
    valgHoved('Hvem skal vælge?', K.knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler', onclick: (e) => Tale.sig(R.UGE_HVEM, { knap: e.currentTarget }) })),
    el('ul', { class: 'dyr-gitter', 'aria-label': 'Dyrene' }, kort),
    tilUgeplanen());
}

// Alle syv dage har en ret: ugen vises som dagbrikkerne, og den voksne tager over
function fuldSkaerm(p) {
  return valgSide('fuld',
    valgHoved('Ugen er fuld', K.knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler', onclick: (e) => Tale.sig(R.UGE_FULD, { knap: e.currentTarget }) })),
    el('ol', { class: 'dag-brikker', role: 'list', 'aria-label': 'Ugens mad' },
      p.dage.map((d, i) => el('li', { class: 'dag-brik optaget', 'data-dag': String(i), 'aria-label': brikNavn(d, i) }, brikIndhold(d, i)))),
    tilUgeplanen());
}

// Trin 2: fire retter pr. side. Første tryk siger navnet og markerer retten, fluebenet («Vælg») går videre til dagene.
// Retterne og rækkefølgen kommer fra retterTilBoern (et udvalg blandet over grupperne, ellers favoritterne først). Den
// voksnes vælg-tilstand (#/voksen/dag/<n>) har søgning og filtre
function retValgSkaerm(p, dyr) {
  const familie = Lager.hentFamilie(K.S.ids);
  const alle = retterTilBoern(iPlanen(), familie, K.S.grupper);
  const sider = sideAntal(alle);
  barn.side = Math.min(Math.max(barn.side, 0), sider - 1);
  const vist = alle.slice(barn.side * PR_SIDE, (barn.side + 1) * PR_SIDE);
  if (!vist.some((m) => m.id === barn.ret)) barn.ret = null;
  const af = new Map();
  for (const d of p.dage) if (d && !af.has(d.ret) && Object.hasOwn(DYR, d.af)) af.set(d.ret, d.af);

  const kort = vist.map((m) => {
    const valgt = barn.ret === m.id;
    return el('li', { class: 'kort-plads' }, el('button', {
      type: 'button',
      class: 'kort ret-kort' + (valgt ? ' valgt' : ''),
      'data-ret': m.id,
      'data-fokus': 'ret-' + m.id,
      'aria-pressed': String(valgt),
      onclick: K.klik(() => {
        barn.ret = m.id;
        tegnIgen('ret-' + m.id);
        Tale.sig(R.ugeRet(m));
      }),
    },
    el('span', { class: 'kort-billede' }, K.billede(grafikRet(m.id), ''), K.lynMaerke(m)),
    el('span', { class: 'kort-navn', tekst: m.navn }),
    boerneMaerker(m, familie),
    // Retten står allerede på planen: dyret, der valgte den, i hjørnet (den kan godt vælges igen)
    af.has(m.id) ? el('span', { class: 'kort-dyr' }, K.billede(grafikDyr(af.get(m.id)), 'valgt af ' + dyrNavn(af.get(m.id)))) : null,
    K.lynTekst(m)));
  });

  // Pilene står i siderne som i en billedbog. Den, der ikke kan bruges, er usynlig (og ude af Tab), så kortene står stille
  const pil = (retning) => {
    const til = barn.side + retning;
    const kan = til >= 0 && til < sider;
    const b = medFokus(K.knap('', {
      klasse: 'rund stor-rund side-knap ' + (retning > 0 ? 'side-naeste' : 'side-forrige') + (kan ? '' : ' usynlig'),
      ikonNavn: retning > 0 ? 'frem' : 'forrige',
      label: retning > 0 ? 'Flere retter' : 'Forrige retter',
      onclick: () => {
        Object.assign(barn, { side: til, ret: null });
        // Fokus bliver på pilen, eller går til den anden, når der ikke er flere sider den vej
        const igen = retning > 0 ? til + 1 < sider : til > 0;
        tegnIgen(igen === (retning > 0) ? 'side-naeste' : 'side-forrige');
        if (retning > 0) Tale.sig(R.SIDE_FLERE);
        else Tale.sig(R.SIDE_FORRIGE);
      },
    }), retning > 0 ? 'side-naeste' : 'side-forrige');
    b.disabled = !kan;
    return b;
  };
  const prikker = sider > 1
    ? el('div', { class: 'side-prikker', role: 'img', 'aria-label': 'Side ' + (barn.side + 1) + ' af ' + sider },
      prikVindue(barn.side, sider).map((prik) => el('span', { class: [prik.nu && 'nu', prik.lille && 'lille'].filter(Boolean).join(' ') || null })))
    : null;

  const valgt = barn.ret && model(barn.ret);
  const vaelg = valgt ? K.knap('Vælg', {
    klasse: 'primaer naeste',
    ikonNavn: 'tjek',
    ikonEfter: true,
    label: 'Vælg ' + valgt.navn,
    onclick: () => K.naviger('#/uge/vaelg/' + dyr + '/' + valgt.id, () => Tale.sig(R.HVILKEN_DAG)),
  }) : null;

  return valgSide('retter',
    valgHoved(dyrNavn(dyr) + ' vælger mad',
      K.knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler', onclick: (e) => Tale.sig(R.dyrVaelger(dyr), { knap: e.currentTarget }) }),
      K.billede(grafikDyr(dyr), '', 'valg-dyr')),
    alle.length
      ? el('div', { class: 'ret-blad' }, pil(-1), el('ul', { class: 'ret-gitter', 'aria-label': 'Retter' }, kort), pil(1), prikker)
      : el('p', { class: 'uge-tom', tekst: 'Der er ingen retter i ugeplanen endnu.' }),
    K.knap('Tilbage', { klasse: 'tilbage', ikonNavn: 'tilbage', onclick: () => K.naviger('#/uge/vaelg', () => Tale.sig(R.UGE_HVEM)) }),
    el('span', { class: 'skub' }),
    vaelg);
}

// Trin 3: hvilken dag? En fri dag markeres og siges ved første tryk, fluebenet gemmer. En optaget dag siger det bare
function dagValgSkaerm(p, dyr, m) {
  if (barn.ret !== m.id) Object.assign(barn, { ret: m.id, dag: null });
  if (barn.dag !== null && p.dage[barn.dag]) barn.dag = null;

  const brikker = p.dage.map((d, i) => {
    const valgt = barn.dag === i;
    return el('li', {}, el('button', {
      type: 'button',
      class: 'dag-brik' + (d ? ' optaget' : '') + (valgt ? ' valgt' : ''),
      'data-dag': String(i),
      'data-fokus': 'dag-' + i,
      'aria-label': brikNavn(d, i),
      'aria-pressed': d ? null : String(valgt),
      'aria-disabled': d ? 'true' : null,
      onclick: K.klik(() => {
        if (d) { Tale.sig(R.DAG_OPTAGET); return; }
        barn.dag = i;
        tegnIgen('dag-' + i);
        Tale.sig(R.dag(i));
      }),
    }, brikIndhold(d, i, valgt ? m : null)));
  });

  const vaelg = barn.dag !== null ? K.knap('Vælg', {
    klasse: 'primaer naeste',
    ikonNavn: 'tjek',
    ikonEfter: true,
    label: 'Vælg ' + DAGE[barn.dag].toLowerCase(),
    onclick: () => gemBarnetsValg(dyr, m, barn.dag),
  }) : null;

  return valgSide('dage',
    valgHoved('Hvilken dag?',
      K.knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler', onclick: (e) => Tale.sig(R.HVILKEN_DAG, { knap: e.currentTarget }) }),
      el('span', { class: 'valg-ret' }, K.billede(grafikRet(m.id), m.navn))),
    el('ol', { class: 'dag-brikker', role: 'list', 'aria-label': 'Ugens dage' }, brikker),
    K.knap('Tilbage', { klasse: 'tilbage', ikonNavn: 'tilbage', onclick: () => K.naviger('#/uge/vaelg/' + dyr, () => Tale.sig(R.dyrVaelger(dyr))) }),
    el('span', { class: 'skub' }),
    vaelg);
}

// Fluebenet på dagene, og «Prøv igen» på fejlskærmen: gemmer barnets valg (dyr, ret og dag), hvis dagen stadig er fri.
// Kan lageret ikke gemme, kommer fejlskærmen (igen), og stemmen beder barnet vise skærmen til en voksen
function gemBarnetsValg(dyr, m, i) {
  barnFejl = false;
  const q = hentPlan();
  if (q.dage[i]) {
    barn.dag = null;
    tegnIgen('dag-' + i);
    Tale.sig(R.DAG_OPTAGET);
    return;
  }
  if (harValgt(q, dyr)) { K.naviger('#/uge/vaelg', () => Tale.sig(R.dyrFaerdig(dyr))); return; }
  const ny = gemPlan((x) => {
    x.dage[i] = { ret: m.id, af: dyr, n: x.n };
    return { dage: x.dage };
  });
  if (!ny) {
    barnFejl = true;
    K.vis();
    document.querySelector('main h1')?.focus({ preventScroll: true });
    Tale.sig(R.GEM_FEJL);
    return;
  }
  nulstilBarn();
  K.annoncer(m.navn + ' står nu på ' + DAGE[i].toLowerCase() + '.');
  K.naviger('#/uge/vaelg', () => {
    if (ugenErFuld(ny)) Tale.sig(R.UGE_FULD);
    else if (BOERN.includes(dyr) && BOERN.every((b) => harValgt(ny, b))) Tale.sig(R.ALLE_VALGT);
    else Tale.sig(R.UGE_TAK);
  });
}

// Valget kunne ikke gemmes. Barnet hører, at det skal vise skærmen til en voksen; «Prøv igen» gemmer det samme valg igen, og vejen
// til oversigten ligger bag et hold som på de andre børneskærme (code review U7, 23-10)
function barnGemFejl() {
  const m = barn.ret && model(barn.ret);
  const igen = () => {
    if (barn.dyr && m && barn.dag !== null) gemBarnetsValg(barn.dyr, m, barn.dag);
    else { barnFejl = false; K.vis(); }
  };
  // Barnets valg står på skærmen: dagen med retten og et orange kryds (voksen-hjælpens farve), så man kan se, at det ikke
  // blev gemt, også uden lyd. Før stod den glade Bo fra statusskærmene der, og huset manglede (UI-review V3, 23-10)
  const i = barn.dag;
  const brik = m && i !== null ? el('div', { class: 'dag-brik ikke-gemt', 'data-dag': String(i), role: 'img', 'aria-label': DAGE[i] + ': ' + m.navn + ', ikke gemt' },
    brikIndhold(null, i, m),
    el('span', { class: 'ikke-gemt-maerke', 'aria-hidden': 'true' }, ikon('kryds'))) : null;
  return valgSide('gem-fejl',
    valgHoved('Valget kunne ikke gemmes',
      K.knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler', onclick: (e) => Tale.sig(R.GEM_FEJL, { knap: e.currentTarget }) })),
    el('div', { class: 'gem-fejl-indhold' }, brik,
      el('p', { class: 'gem-fejl-tekst', tekst: 'Denne enhed kunne ikke gemme ugeplanen. Måske er privat browsing slået til, eller lageret er fuldt. Den voksne kan prøve igen.' })),
    tilUgeplanen(),
    el('span', { class: 'skub' }),
    K.knap('Prøv igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: igen }));
}
