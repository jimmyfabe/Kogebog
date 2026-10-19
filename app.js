// app.js — Tumbi Køkken: forside → ret → ét trin pr. skærm → færdig.
// Ruterne står i adressen (#/ret/<id>/trin/<nr>), så tilbage-knappen og en genindlæsning virker.
// Al tekst fra opskrifterne sættes som tekst (textContent), aldrig som HTML.
import { el, ikon, svgEl } from './js/dom.js';
import { hentIndex, hentRet } from './js/data.js';
import * as Tale from './js/tale.js';
import * as R from './js/replikker.js';
import * as Timer from './js/timer.js';
import * as Lager from './js/lager.js';
import { holdKnap } from './js/hold.js';
import { VERBER, VOKSEN_HJAELP, INGREDIENSER, GRUPPER, grafikVerbum, grafikIngrediens, grafikDyr, grafikRet, grafikGruppe, GRAFIK_FAERDIG } from './js/katalog.js';
import { formaterTid, varighed, varighedTale } from './js/tid.js';
import { minutterTekst } from './js/tekst.js';

// ?hurtig=1 (kun til test): alle timere varer 2 sekunder
const HURTIG = new URLSearchParams(location.search).get('hurtig') === '1';
const SPAERRE_MS = 350; // et dobbelttryk må ikke springe et trin over
const FORTSAET_MS = 12 * 3600 * 1000; // «Fortsæt» vises i 12 timer
const RING_OMKREDS = 2 * Math.PI * 54;

const rod = document.getElementById('app');
const meddelelse = document.getElementById('meddelelse');

const S = {
  ids: null,          // rækkefølgen fra index.json
  grupper: [],        // forsidens afsnit fra index.json: [{ id, retter }]
  indexFejl: null,
  retter: new Map(),  // id → model eller HentFejl
  valgtKort: null,    // forsiden: første tryk siger navnet, andet åbner
  spaerTil: 0,
  vistHash: null,
  oprydning: [],
};

// ---------- Hjælpere ----------

const klik = (fn) => (e) => {
  if (performance.now() < S.spaerTil) return;
  fn(e);
};

function knap(tekst, { klasse = '', ikonNavn, ikonEfter = false, label, onclick } = {}) {
  const ik = ikonNavn ? ikon(ikonNavn) : null;
  return el('button', { type: 'button', class: 'knap ' + klasse, 'aria-label': label, onclick: onclick && klik(onclick) },
    ikonEfter ? null : ik, tekst ? el('span', { tekst }) : null, ikonEfter ? ik : null);
}

function billede(src, alt, klasse) {
  return el('img', { src, alt, class: klasse, draggable: 'false', decoding: 'async' });
}

function annoncer(tekst) {
  meddelelse.textContent = '';
  setTimeout(() => { meddelelse.textContent = tekst; }, 30);
}

const hashFor = {
  forside: () => '#/',
  ret: (id) => '#/ret/' + id,
  trin: (id, nr) => '#/ret/' + id + '/trin/' + nr,
  faerdig: (id) => '#/ret/' + id + '/faerdig',
};

function rute() {
  const d = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (d[0] === 'ret' && d[1]) {
    if (d[2] === 'trin') return { side: 'trin', id: d[1], nr: Number.parseInt(d[3], 10) };
    if (d[2] === 'faerdig') return { side: 'faerdig', id: d[1] };
    return { side: 'ret', id: d[1] };
  }
  return { side: 'forside' };
}

// Skift skærm med det samme (inde i trykket), så oplæsningen bagefter stadig tæller som en del af trykket
function naviger(hash, efter) {
  if (location.hash !== hash) location.hash = hash;
  vis();
  if (efter) efter();
}

// ---------- Fælles dele ----------

function timerPille() {
  const tal = el('span', { class: 'pille-tal' });
  // «Tiden er gået» afløser tallet, når tiden er gået. På smalle skærme får fremskridtet sin egen række under pillen (app.css)
  const slut = el('span', { class: 'pille-slut', tekst: 'Tiden er gået' });
  const b = el('button', { type: 'button', class: 'knap pille', hidden: true }, ikon('ur'), tal, slut);
  b.addEventListener('click', klik(() => {
    const t = Timer.aktuel();
    if (t) naviger(hashFor.trin(t.ret, t.nr));
  }));
  function tegn() {
    const t = Timer.aktuel();
    const r = rute();
    const her = t && r.side === 'trin' && r.id === t.ret && r.nr === t.nr;
    b.hidden = !t || her;
    if (!t || her) return;
    const s = Timer.status();
    const m = S.retter.get(t.ret);
    const navn = m && m.navn ? m.navn + ', trin ' + t.nr : 'trin ' + t.nr;
    b.classList.toggle('faerdig', s.faerdig);
    tal.textContent = formaterTid(s.restSek);
    b.setAttribute('aria-label', (s.faerdig ? 'Timeren er færdig' : 'Timer: ' + formaterTid(s.restSek) + ' tilbage') + '. Gå til ' + navn + '.');
  }
  S.oprydning.push(Timer.lyt(tegn));
  tegn();
  return b;
}

function topbar(midte) {
  return el('header', { class: 'topbar' },
    knap('', { klasse: 'rund', ikonNavn: 'hjem', label: 'Til forsiden', onclick: () => { Tale.stop(); naviger(hashFor.forside()); } }),
    el('div', { class: 'topbar-midte' }, midte || null),
    timerPille());
}

function statusSkaerm({ titel, tekst, handling, laeser = false }) {
  return el('main', { class: 'skaerm status-skaerm' },
    el('div', { class: 'status-boks' + (laeser ? ' henter' : '') },
      billede(grafikDyr(laeser ? 'pip' : 'bo'), '', 'status-dyr'),
      el('h1', { tabindex: '-1', tekst: titel }),
      tekst ? el('p', { tekst }) : null,
      handling || null));
}

function henterSkaerm() {
  return statusSkaerm({ titel: 'Henter opskrifterne …', laeser: true });
}

function fejlSkaermRet(id, fejl) {
  const findesIkke = fejl && fejl.findesIkke;
  return statusSkaerm({
    titel: findesIkke ? 'Den opskrift findes ikke' : 'Opskriften kunne ikke hentes',
    tekst: findesIkke
      ? 'Måske er den blevet omdøbt. Vælg en ret på forsiden.'
      : 'Tjek internetforbindelsen, og prøv igen. Virker det stadig ikke, så vælg en anden ret.',
    handling: el('div', { class: 'status-knapper' },
      findesIkke ? null : knap('Prøv igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => { S.retter.delete(id); indlaes(); } }),
      knap('Til forsiden', { ikonNavn: 'hjem', onclick: () => naviger(hashFor.forside()) })),
  });
}

// ---------- Forsiden ----------

function forside() {
  let indhold;
  let hop = null;
  if (S.indexFejl) {
    indhold = el('div', { class: 'status-boks' },
      billede(grafikDyr('bo'), '', 'status-dyr'),
      el('h2', { tekst: 'Opskrifterne kunne ikke hentes' }),
      el('p', { tekst: 'Tjek internetforbindelsen, og prøv igen.' }),
      knap('Prøv igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => indlaes() }));
  } else if (!S.ids) {
    indhold = el('div', { class: 'status-boks henter' }, billede(grafikDyr('pip'), '', 'status-dyr'), el('p', { tekst: 'Henter opskrifterne …' }));
  } else if (!S.ids.length) {
    // Til forælderen, ikke til udvikleren: hvordan man lægger en opskrift ind, står i CLAUDE.md
    indhold = el('div', { class: 'status-boks' },
      billede(grafikDyr('bo'), '', 'status-dyr'),
      el('h2', { tekst: 'Der er ingen opskrifter endnu' }),
      el('p', { tekst: 'Kogebogen er tom lige nu. Hent listen igen om lidt.' }),
      // S.ids = null, så skærmen viser «Henter opskrifterne …», mens listen hentes (en tom liste er ikke null)
      knap('Hent opskrifterne igen', { klasse: 'primaer', ikonNavn: 'igen', onclick: () => { S.ids = null; indlaes(); } }));
  } else {
    const fejlede = [];
    // Afsnittets billede (gryden, ovnen, kagen) står også i kortets hjørne: den grønne og den røde cirkel kan ikke skelnes
    // ved farveblindhed (UI-review 5). Pynt for skærmlæseren: kortets navn er rettens navn
    const kortTil = (id, gruppe) => {
      const m = S.retter.get(id);
      if (!m) return el('li', { class: 'kort-plads' }, el('div', { class: 'kort tomt', 'aria-hidden': 'true' }));
      if (m instanceof Error) { fejlede.push(id); return null; }
      const b = el('button', { type: 'button', class: 'kort' + (S.valgtKort === id ? ' valgt' : ''), 'data-ret': id },
        Object.hasOwn(GRUPPER, gruppe) ? el('span', { class: 'kort-gruppe', 'aria-hidden': 'true' }, billede(grafikGruppe(gruppe), '')) : null,
        el('span', { class: 'kort-billede' }, billede(grafikRet(id), '')),
        el('span', { class: 'kort-navn', tekst: m.navn }),
        el('span', { class: 'kort-aabn', 'aria-hidden': 'true' }, ikon('naeste'), el('span', { tekst: 'Tryk igen' })));
      b.addEventListener('click', klik(() => kortTryk(id, b)));
      return el('li', { class: 'kort-plads' }, b);
    };
    // Et afsnit pr. gruppe: gryden, ovnen og kagen står i overskriften og har samme farve som kortenes cirkel.
    // Et afsnit uden kort (alle dets opskrifter fejlede) vises ikke
    const hopKnapper = [];
    const afsnit = S.grupper.map((g) => {
      const kort = g.retter.map((id) => kortTil(id, g.id)).filter(Boolean);
      if (!kort.length) return null;
      const navn = Object.hasOwn(GRUPPER, g.id) ? GRUPPER[g.id] : null;
      if (navn) hopKnapper.push(hopKnap(g.id, navn));
      return el('section', { class: 'gruppe', 'data-gruppe': g.id, 'aria-labelledby': navn ? 'gruppe-' + g.id : null },
        navn ? el('h2', { class: 'gruppe-navn', id: 'gruppe-' + g.id, tabindex: '-1' },
          el('span', { class: 'gruppe-ikon' }, billede(grafikGruppe(g.id), '')), el('span', { tekst: navn })) : null,
        el('ul', { class: 'kort-gitter' }, kort));
    });
    // Ved første visning ses kun det første afsnit: en knap pr. afsnit i toppen viser, at der er mere, og hopper dertil
    if (hopKnapper.length > 1) hop = el('nav', { class: 'forside-hop', 'aria-label': 'Gå til et afsnit' }, hopKnapper);
    indhold = el('div', { class: 'forside-indhold' },
      afsnit,
      fejlede.length ? el('p', { class: 'fejl-linje', role: 'status', tekst: (fejlede.length === 1 ? 'Én opskrift' : fejlede.length + ' opskrifter') + ' kunne ikke læses (' + fejlede.join(', ') + '). Prøv at genindlæse siden.' }) : null);
  }
  const top = el('header', { class: 'forside-top' },
    billede(grafikDyr('rosa'), '', 'forside-dyr'),
    el('div', { class: 'forside-titel' },
      el('h1', { tabindex: '-1', tekst: 'Tumbi Køkken' }),
      // Hårdt mellemrum: «dag?» stod alene på sidste linje på 390 px
      el('p', { tekst: 'Hvad skal vi lave i\u00a0dag?' })),
    hop,
    billede(grafikDyr('bo'), '', 'forside-dyr'));
  return el('main', { class: 'skaerm forside' }, top, el('div', { class: 'forside-timer' }, timerPille()), indhold);
}

// En rund knap med afsnittets billede og farve (som overskriften). Tryk: rul til afsnittet, sig navnet, og flyt fokus
// til overskriften, så Tab fortsætter derfra. Uden animation ved «mindre bevægelse»
function hopKnap(id, navn) {
  const b = knap('', { klasse: 'rund hop', label: navn, onclick: () => {
    const h = document.getElementById('gruppe-' + id);
    if (!h) return;
    h.closest('.gruppe').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    h.focus({ preventScroll: true });
    Tale.sig(R.gruppe(id));
  } });
  b.dataset.gruppe = id;
  b.append(billede(grafikGruppe(id), ''));
  return b;
}

function kortTryk(id, b) {
  const m = S.retter.get(id);
  if (S.valgtKort === id) {
    S.valgtKort = null;
    naviger(hashFor.ret(id), () => Tale.sig(R.retAaben(m)));
    return;
  }
  S.valgtKort = id;
  for (const k of rod.querySelectorAll('.kort.valgt')) k.classList.remove('valgt');
  b.classList.add('valgt');
  S.spaerTil = performance.now() + SPAERRE_MS;
  Tale.sig(R.retValgt(m));
}

// ---------- Retten ----------

function retSkaerm(m) {
  const meta = [m.portioner, m.minutter ? minutterTekst(m.minutter) : ''].filter(Boolean).join(' · ');
  const ingr = m.ingredienser.map((x, i) => {
    const b = el('button', { type: 'button', class: 'ingr', 'aria-label': x.tekst },
      x.ikon ? billede(grafikIngrediens(x.ikon), '', 'ingr-ikon') : null,
      x.maengde ? el('span', { class: 'ingr-maengde', tekst: x.maengde }) : null,
      el('span', { class: 'ingr-navn', tekst: x.navn }));
    b.addEventListener('click', klik(() => Tale.sig(R.ingrediens(m, i), { knap: b })));
    return el('li', {}, b);
  });

  const sidste = Lager.hent().sidste;
  const fortsaetNr = sidste && sidste.ret === m.id && sidste.nr > 1 && sidste.nr <= m.trin.length && Date.now() - sidste.tid < FORTSAET_MS
    ? sidste.nr : 0;
  // Gik man ud midt i retten, er «Fortsæt» den store knap, og «Start forfra» siger, hvad den gør.
  // «Fortsæt» står først i bunden, så Tab når den først (på iPhone og iPad på højkant står den også øverst);
  // på de brede skærme flytter app.css den til højre som «Næste»
  const fortsaet = fortsaetNr
    ? knap('Fortsæt ved trin ' + fortsaetNr, { klasse: 'primaer fortsaet', ikonNavn: 'naeste', ikonEfter: true, onclick: () => gaaTilTrin(m, fortsaetNr) })
    : null;
  const start = fortsaetNr
    ? knap('Start forfra', { klasse: 'start forfra', ikonNavn: 'igen', onclick: () => gaaTilTrin(m, 1) })
    : knap('Start', { klasse: 'primaer start', ikonNavn: 'naeste', ikonEfter: true, onclick: () => gaaTilTrin(m, 1) });

  const print = holdKnap({
    klasse: 'lille print-knap',
    label: 'Print opskriften til den voksne. Hold knappen inde i 2 sekunder.',
    indhold: [ikon('print'), el('span', { tekst: 'Print: hold' })],
    naarFaerdig: () => { location.href = 'print.html?ret=' + encodeURIComponent(m.id); },
    naarKort: () => Tale.sig(R.PRINT_HOLD),
  });

  const hoejttaler = knap('', { klasse: 'rund stor-rund', ikonNavn: 'hoejttaler', label: 'Læs op' });
  hoejttaler.addEventListener('click', klik(() => Tale.sig(R.retAaben(m), { knap: hoejttaler })));

  return el('main', { class: 'skaerm ret' },
    topbar(),
    el('div', { class: 'ret-indhold' },
      el('section', { class: 'ret-hoved' },
        el('div', { class: 'ret-billede' }, billede(grafikRet(m.id), '')),
        el('div', { class: 'ret-titel' },
          el('h1', { tabindex: '-1', tekst: m.navn }),
          hoejttaler),
        meta ? el('p', { class: 'meta', tekst: meta }) : null),
      el('section', { class: 'ret-ingredienser', 'aria-labelledby': 'ingr-titel' },
        el('h2', { id: 'ingr-titel', tekst: 'Det skal I bruge' }),
        el('ul', { class: 'ingr-gitter' }, ingr))),
    el('footer', { class: 'handlinger' },
      fortsaet,
      print,
      el('span', { class: 'skub' }),
      start));
}

// ---------- Trinene ----------

function sigTrin(m, t, b) {
  Tale.sig(R.trin(m, t), { knap: b || rod.querySelector('.laes-op') });
}

function gaaTilTrin(m, nr) {
  const t = m.trin[nr - 1];
  naviger(hashFor.trin(m.id, nr), () => sigTrin(m, t));
}

function fremskridt(m, nr) {
  const dele = m.trin.map((t) => el('span', { class: t.nr < nr ? 'gjort' : t.nr === nr ? 'nu' : '' }));
  return el('div', { class: 'fremskridt-boks' },
    el('div', { class: 'fremskridt', 'aria-hidden': 'true' }, dele),
    el('p', { class: 'trin-nr', tekst: 'Trin ' + nr + ' af ' + m.trin.length }));
}

// Timeren rulles frem over den faste bund, når den starter, når «Start timer» siger, at en anden timer kører, og når tiden
// er gået: på lave skærme lå ringen, «Stop» og forklaringen under bunden (667×375, 844×390 og 390×844), og «Ok» kom under
// bunden, når blokken voksede med «Tiden er gået!» (UI-review 5). Uden animation ved «mindre bevægelse»
function rulFrem(e) {
  e.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function timerBlok(m, t) {
  const sek = varighed(t.timerSek, HURTIG);
  const blok = el('div', { class: 'timer' });
  const rest = svgEl('circle', { class: 'rest', cx: 60, cy: 60, r: 54, 'stroke-dasharray': RING_OMKREDS.toFixed(2) });
  const ring = svgEl('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' });
  ring.append(svgEl('circle', { class: 'spor', cx: 60, cy: 60, r: 54 }), rest);
  const tal = el('span', { class: 'timer-tal' });
  const ringBoks = el('div', { class: 'timer-ring', role: 'timer', 'aria-label': 'Tid tilbage' }, ring, tal);
  const startKnap = knap('', { klasse: 'timer-start', label: 'Start timeren på ' + varighedTale(sek) });
  startKnap.append(ikon('ur'), el('span', { class: 'timer-start-tekst' }, el('span', { tekst: 'Start timer' }), el('strong', { tekst: formaterTid(sek) })));
  // Appen har én timer ad gangen: kører en anden, sletter et tryk her den ikke (fx sovsen på trin 8, når spaghettien skal i)
  const optagetTekst = el('p', { class: 'timer-optaget' });
  // En anden timer, der stadig kører. En færdig timer tæller med vilje ikke: «Start timer» her erstatter den
  const andenTimer = () => {
    const a = Timer.aktuel();
    return a && !a.faerdig && !(a.ret === m.id && a.nr === t.nr) ? a : null;
  };
  // Rettens model, hvis den er hentet (ellers siger teksten kun «trin 8»)
  const timerRet = (a) => {
    const r = S.retter.get(a.ret);
    return r && !(r instanceof Error) ? r : null;
  };
  const hvor = (a) => R.timerHvor(timerRet(a), a.nr, a.ret === m.id);
  startKnap.addEventListener('click', klik(() => {
    const a = andenTimer();
    if (a) {
      Tale.sig(R.timerOptaget(timerRet(a), a.nr, a.ret === m.id), { knap: startKnap });
      rulFrem(blok);
      return;
    }
    Timer.start(m.id, t.nr, sek);
    annoncer('Timeren er startet: ' + varighedTale(sek) + '.');
    rulFrem(blok);
  }));
  const stopKnap = knap('Stop', { klasse: 'lille', ikonNavn: 'stop', label: 'Stop timeren', onclick: () => Timer.stop() });
  const okKnap = knap('Ok', { klasse: 'primaer lille-primaer', ikonNavn: 'tjek', label: 'Ok, tiden er gået. Slå timeren fra.', onclick: () => Timer.stop() });
  let varFaerdig = false;
  let vistUden = ''; // 'start' eller 'optaget': tegn kun om, når det skifter (ellers mister knappen fokus hvert kvarte sekund)

  // Nyt indhold i blokken. Stod fokus i blokken (Tab, VoiceOver), flyttes det til knappen, der afløser den gamle:
  // ellers faldt fokus til body, når «Start timer», «Stop» eller «Ok» forsvandt (UI-review 5)
  function skift(fokus, ...born) {
    const havdeFokus = blok.contains(document.activeElement);
    blok.replaceChildren(...born);
    if (havdeFokus) fokus.focus({ preventScroll: true });
  }

  function tegn() {
    const a = Timer.aktuel();
    const min = a && a.ret === m.id && a.nr === t.nr;
    if (!min) {
      varFaerdig = false;
      const anden = andenTimer();
      if (anden) {
        const tekst = 'Der kører allerede en timer på ' + hvor(anden) + '.';
        if (optagetTekst.textContent !== tekst) optagetTekst.textContent = tekst;
      }
      const ny = anden ? 'optaget' : 'start';
      if (vistUden !== ny) {
        vistUden = ny;
        blok.className = 'timer' + (anden ? ' optaget' : '');
        startKnap.setAttribute('aria-disabled', anden ? 'true' : 'false');
        if (anden) skift(startKnap, startKnap, optagetTekst);
        else skift(startKnap, startKnap);
      }
      return;
    }
    vistUden = '';
    const s = Timer.status();
    rest.setAttribute('stroke-dashoffset', (RING_OMKREDS * (1 - s.andel)).toFixed(2));
    tal.textContent = formaterTid(s.restSek);
    blok.className = 'timer ' + (s.faerdig ? 'faerdig' : 'koerer');
    if (s.faerdig) {
      if (!varFaerdig) {
        varFaerdig = true;
        skift(okKnap, ringBoks, el('p', { class: 'timer-faerdig-tekst', tekst: 'Tiden er gået!' }), okKnap);
        annoncer('Tiden er gået.');
        // Blokken er højere nu: rul «Ok» frem over bunden. Kun når tiden går, mens trinnet ses. Kommer man til trinnet
        // med en timer, der allerede er færdig (fx fra pillen), er blokken ikke på siden endnu, og skærmen står øverst
        if (blok.isConnected) rulFrem(blok);
      }
    } else if (!blok.contains(stopKnap)) {
      skift(stopKnap, ringBoks, stopKnap);
    }
  }
  S.oprydning.push(Timer.lyt(tegn));
  tegn();
  return blok;
}

function trinSkaerm(m, nr) {
  const t = m.trin[nr - 1];
  const sidst = nr === m.trin.length;
  Lager.gem({ sidste: { ret: m.id, nr, tid: Date.now() } });

  const laesOp = knap('Læs op', { klasse: 'laes-op', ikonNavn: 'hoejttaler' });
  laesOp.addEventListener('click', klik(() => sigTrin(m, t, laesOp)));

  const maerke = t.voksen
    ? el('div', { class: 'voksen-maerke' },
      billede(grafikDyr('bo'), '', 'voksen-bo'),
      el('strong', { tekst: 'Hent en voksen' }),
      t.voksenSlags ? el('span', { class: 'voksen-slags' }, ikon(t.voksenSlags === 'kniv' ? 'kniv' : 'flamme'), el('span', { tekst: Object.hasOwn(VOKSEN_HJAELP, t.voksenSlags) ? VOKSEN_HJAELP[t.voksenSlags] : '' })) : null)
    : null;

  const ikoner = t.ikoner.length
    ? el('ul', { class: 'trin-ikoner', 'aria-label': 'Det skal bruges' },
      t.ikoner.map((ik) => el('li', {}, billede(grafikIngrediens(ik), INGREDIENSER[ik] || ik))))
    : null;

  const frem = () => {
    if (sidst) naviger(hashFor.faerdig(m.id), () => Tale.sig(R.FAERDIG));
    else gaaTilTrin(m, nr + 1);
  };
  const tilbage = () => {
    if (nr > 1) gaaTilTrin(m, nr - 1);
    else { Tale.stop(); naviger(hashFor.ret(m.id)); }
  };

  const naesteTekst = sidst ? 'Færdig' : 'Næste';
  const naeste = t.voksen
    ? holdKnap({
      klasse: 'primaer naeste voksen-hold',
      label: naesteTekst + '. Den voksne holder knappen inde i 2 sekunder.',
      indhold: [el('span', { class: 'hold-tekst' }, el('span', { tekst: naesteTekst }), el('small', { tekst: 'Voksen: hold' })), ikon('naeste')],
      naarFaerdig: frem,
      naarKort: (b) => Tale.sig(R.VOKSEN_HOLD, { knap: b }),
    })
    : knap(naesteTekst, { klasse: 'primaer naeste', ikonNavn: sidst ? 'tjek' : 'naeste', ikonEfter: true, onclick: frem });

  const skaerm = el('main', { class: 'skaerm trin', 'data-verbum': t.verbum },
    topbar(fremskridt(m, nr)),
    el('section', { class: 'scene' + (t.voksen ? ' voksen' : ''), 'aria-labelledby': 'trin-tekst' },
      maerke,
      el('figure', { class: 'verbum-ramme anim-' + t.verbum },
        billede(grafikVerbum(t.verbum), VERBER[t.verbum] || '', 'verbum-billede')),
      el('div', { class: 'trin-tekst' },
        el('h1', { id: 'trin-tekst', tabindex: '-1', tekst: t.tekst }),
        ikoner,
        el('div', { class: 'trin-knapper' }, laesOp, t.timerSek ? timerBlok(m, t) : null),
        t.note ? el('p', { class: 'note' }, el('span', { class: 'note-hvem', tekst: 'Til den voksne: ' }), t.note) : null)),
    el('footer', { class: 'handlinger' },
      knap('Tilbage', { klasse: 'tilbage', ikonNavn: 'tilbage', label: 'Tilbage', onclick: tilbage }),
      el('span', { class: 'skub' }),
      naeste));
  // En tast, der holdes inde (e.repeat), gør ikke noget igen — fx mellemrum, der stadig er nede efter et voksen-hold
  skaerm.tastatur = (e) => {
    if (e.key === 'ArrowRight' && !t.voksen) { e.preventDefault(); if (!e.repeat && performance.now() >= S.spaerTil) frem(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!e.repeat && performance.now() >= S.spaerTil) tilbage(); }
    else if (e.key === ' ' && (document.activeElement === document.body || document.activeElement.tagName === 'H1')) { e.preventDefault(); if (!e.repeat) sigTrin(m, t, laesOp); }
  };
  return skaerm;
}

// ---------- Færdig ----------

function faerdigSkaerm() {
  Lager.gem({ sidste: null });
  const konfetti = el('div', { class: 'konfetti', 'aria-hidden': 'true' }, Array.from({ length: 14 }, (_, i) => el('span', { class: 'k' + (i % 4) })));
  const hoejttaler = knap('Læs op', { ikonNavn: 'hoejttaler' });
  hoejttaler.addEventListener('click', klik(() => Tale.sig(R.FAERDIG, { knap: hoejttaler })));
  return el('main', { class: 'skaerm faerdig' },
    topbar(),
    konfetti,
    el('div', { class: 'faerdig-indhold' },
      billede(GRAFIK_FAERDIG, 'Bo, Rosa og Pip fejrer, at maden er færdig', 'faerdig-billede'),
      el('h1', { tabindex: '-1', tekst: 'Færdig!' }),
      el('p', { class: 'faerdig-tekst', tekst: 'Godt gået. Velbekomme!' }),
      el('div', { class: 'status-knapper' },
        hoejttaler,
        knap('Til forsiden', { klasse: 'primaer', ikonNavn: 'hjem', onclick: () => naviger(hashFor.forside()) }))));
}

// ---------- Visning ----------

function vis() {
  for (const fn of S.oprydning.splice(0)) fn();
  const r = rute();
  let skaerm;
  if (r.side === 'forside') {
    skaerm = forside();
  } else {
    const m = S.retter.get(r.id);
    if (!m && (!S.ids || S.ids.includes(r.id)) && !S.indexFejl) skaerm = henterSkaerm();
    else if (!m) skaerm = fejlSkaermRet(r.id, S.indexFejl || { findesIkke: true });
    else if (m instanceof Error) skaerm = fejlSkaermRet(r.id, m);
    else if (r.side === 'ret') skaerm = retSkaerm(m);
    else if (r.side === 'faerdig') skaerm = faerdigSkaerm();
    else if (Number.isInteger(r.nr) && r.nr >= 1 && r.nr <= m.trin.length) skaerm = trinSkaerm(m, r.nr);
    else skaerm = fejlSkaermRet(r.id, { findesIkke: true });
  }
  if (r.side !== 'forside') S.valgtKort = null;
  const skiftet = S.vistHash !== location.hash;
  S.vistHash = location.hash;
  S.tastatur = skaerm.tastatur || null;
  rod.replaceChildren(skaerm);
  S.spaerTil = performance.now() + SPAERRE_MS;
  if (skiftet) {
    window.scrollTo(0, 0);
    const h = skaerm.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', () => {
  if (location.hash !== S.vistHash) { Tale.stop(); vis(); }
});

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (S.tastatur) S.tastatur(e);
});

async function indlaes() {
  S.indexFejl = null;
  if (!S.ids) vis();
  try {
    const ix = await hentIndex();
    S.grupper = ix.grupper;
    S.ids = ix.ids;
  } catch (e) {
    S.indexFejl = e;
    S.ids = null;
    vis();
    return;
  }
  await Promise.all(S.ids.filter((id) => !(S.retter.get(id) && !(S.retter.get(id) instanceof Error))).map(async (id) => {
    try {
      S.retter.set(id, await hentRet(id));
    } catch (e) {
      S.retter.set(id, e);
    }
  }));
  S.vistHash = null; // skærmen skifter fra «Henter …» til indholdet: tegn igen, og flyt fokus til overskriften
  vis();
}

Timer.gendan();
Tale.hentLydListe();
indlaes();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* uden service worker virker appen bare kun online */ });
  });
}
