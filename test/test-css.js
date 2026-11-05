// test-css.js — regler i app.css, som browsertesten ikke kan se.
// Den faste bund og --bund (luften over bunden, som knapper med fokus rulles op over) skal regne med samme
// safe-area: Playwright sætter env(safe-area-inset-bottom) til 0, men en iPhone har 34 px på højkant og 21 px på langs.
// Kør:  node test/test-css.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRUPPER } from '../js/katalog.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROD, 'app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Et lille træ af blokkene: { hoved, regler, deklarationer }. Nok til app.css (ingen strenge med { eller })
function blokke(tekst) {
  const rod = { hoved: '', regler: [], deklarationer: '' };
  const stak = [rod];
  let buf = '';
  for (const c of tekst) {
    if (c === '{') {
      const n = { hoved: buf.trim(), regler: [], deklarationer: '' };
      stak.at(-1).regler.push(n);
      stak.push(n);
      buf = '';
    } else if (c === '}') {
      stak.pop().deklarationer += buf;
      buf = '';
    } else buf += c;
  }
  return rod;
}

const SAFE_AREA = /max\(\s*\d+px\s*,\s*env\(\s*safe-area-inset-bottom\s*\)\s*\)/;
const ens = (s) => s.replace(/\s+/g, '');

test('--bund regner med samme safe-area som den faste bund', () => {
  const medBund = blokke(CSS).regler.filter((b) => b.hoved.startsWith('@media') && b.regler.some((r) => /--bund\s*:/.test(r.deklarationer)));
  assert.ok(medBund.length >= 3, 'forventede --bund i mindst tre @media-blokke (iPhone, iPad på højkant, på langs), fandt ' + medBund.length);
  for (const blok of medBund) {
    // En fast bund: position: sticky og bottom: 0 (.handlinger på retten, trinene og børnenes valg, .uge-handlinger på ugeplanen)
    const bund = blok.regler.find((r) => /position\s*:\s*sticky/.test(r.deklarationer) && /(^|;)\s*bottom\s*:\s*0\s*(;|$)/.test(r.deklarationer));
    assert.ok(bund, blok.hoved + ': --bund står i en blok uden en fast bund (en regel med position: sticky og bottom: 0)');
    const padding = SAFE_AREA.exec(bund.deklarationer);
    assert.ok(padding, blok.hoved + ': bundens padding i bunden bruger ikke max(…, env(safe-area-inset-bottom))');
    for (const r of blok.regler) {
      for (const [, vaerdi] of r.deklarationer.matchAll(/--bund\s*:\s*([^;]+)/g)) {
        const m = SAFE_AREA.exec(vaerdi);
        assert.ok(m && ens(m[0]) === ens(padding[0]),
          blok.hoved + ' ' + r.hoved + ': --bund er «' + vaerdi.trim() + '», men bunden har ' + padding[0] + ' i bunden. '
          + 'Byg --bund med samme udtryk, fx calc(100px + ' + padding[0] + ')');
      }
    }
  }
});

// En ingrediens, der læses op (.taler), skal kunne ses: .ingr sætter sin egen hvide baggrund efter .taler (samme vægt,
// så den sidste vinder), og ikonet er et img.ingr-ikon, som .taler .ikon ikke rammer. Reglen skal derfor veje mere
// (.ingr.taler). At farven faktisk ses, mens lyden spiller, er tjekket i WebKit med getComputedStyle (19-10-2026)
test('en ingrediens, der læses op, får den lyseblå baggrund og et ikon, der bevæger sig', () => {
  const rod = blokke(CSS);
  const vaelgere = (b) => b.hoved.split(',').map((s) => s.trim());
  const baggrund = rod.regler.filter((b) => vaelgere(b).includes('.ingr.taler')).map((b) => b.deklarationer).join(';');
  assert.match(baggrund, /background\s*:\s*var\(--blaa-lys\)/, '.ingr.taler skal have background: var(--blaa-lys) (som .taler), ellers vinder .ingr\'s hvide baggrund');
  const bevaegelse = rod.regler.filter((b) => /prefers-reduced-motion\s*:\s*no-preference/.test(b.hoved))
    .flatMap((b) => b.regler).filter((r) => vaelgere(r).includes('.ingr.taler .ingr-ikon'));
  assert.ok(bevaegelse.some((r) => /animation\s*:\s*tale\b/.test(r.deklarationer)),
    '.ingr.taler .ingr-ikon skal have animation: tale … i @media (prefers-reduced-motion: no-preference), som .taler .ikon');
});

// Printet: foden («Tjek selv pakkerne …» og kilden) må ikke stå alene øverst på side 2 eller deles over to sider.
// Playwrights WebKit deler ikke i sider, så reglen tjekkes her. Skønnet i WebKit med A4's bredde (UI-review 4):
// blondies fod startede 11 mm under side 1, og frikadellers fod (to linjer) blev delt. Det sidste trin og foden står
// i blokken .slut (js/print.js), som ikke må deles: Safari kender ikke break-before: avoid, så den regel virker ikke dér.
// At foden og det sidste trin faktisk står i blokken, tjekker browsertesten (test-e2e.js, print)
test('printets fod holdes sammen med det sidste trin', () => {
  const PRINT = fs.readFileSync(path.join(ROD, 'print.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const alle = [];
  const saml = (b) => { alle.push(b); b.regler.forEach(saml); };
  saml(blokke(PRINT));
  const regler = (sel) => alle.filter((b) => b.hoved.split(',').map((s) => s.trim()).includes(sel)).map((b) => b.deklarationer).join(';');
  assert.match(regler('.slut'), /break-inside\s*:\s*avoid/, '.slut (det sidste trin og foden) skal have break-inside: avoid, så foden ikke står alene på side 2');
  assert.doesNotMatch(regler('.fod'), /break-before/, '.fod må ikke bruge break-before: Safari kender ikke break-before: avoid, og blokken .slut holder foden sammen med det sidste trin');
});

// Forsidens gitter: gaeldende() regner ud af app.css, hvilke regler der gælder ved en skærmstørrelse, så gitterets variabler
// kan prøves uden en browser. Selve målene på skærmen måles i WebKit (test-e2e.js)
function mediaPasser(hoved, b, h) {
  const betingelser = hoved.replace(/^@media\s*/, '');
  return betingelser.split(',').some((alt) => alt.trim().split(/\s+and\s+/).every((del) => {
    const m = /^\(\s*([a-z-]+)\s*:\s*([a-z0-9.]+)\s*\)$/.exec(del.trim());
    if (!m) return false;
    const [, navn, v] = m;
    const tal = parseFloat(v);
    if (navn === 'max-width') return b <= tal;
    if (navn === 'min-width') return b >= tal;
    if (navn === 'max-height') return h <= tal;
    if (navn === 'min-height') return h >= tal;
    if (navn === 'orientation') return v === (h >= b ? 'portrait' : 'landscape');
    return false; // hover, prefers-reduced-motion og andet: ikke det, der styrer toppen
  }));
}
// Deklarationerne for vaelger, i kildens rækkefølge (samme vægt, så den sidste vinder), ved bredden b og højden h
function gaeldende(rod, vaelger, b, h) {
  const ud = {};
  const brug = (r) => {
    if (!r.hoved.split(',').map((s) => s.trim()).includes(vaelger)) return;
    for (const d of r.deklarationer.split(';')) {
      const i = d.indexOf(':');
      if (i > 0) ud[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
  };
  for (const r of rod.regler) {
    if (!r.hoved.startsWith('@')) brug(r);
    else if (r.hoved.startsWith('@media') && mediaPasser(r.hoved, b, h)) r.regler.forEach(brug);
  }
  return ud;
}
const GITTER = '.gruppe-knapper';
const MED_TI = '.gruppe-knapper:has(> li:nth-child(10))';
const pxTal = (v) => {
  assert.match(String(v), /^\d+(\.\d+)?px$/, 'forventede en værdi i px, fandt ' + v);
  return parseFloat(v);
};
// Gitterets variabler ved n knapper: reglen for 10 knapper lægges oven på den almindelige, som i browseren
function gitter(rod, n, b, h) {
  const g = { ...gaeldende(rod, GITTER, b, h), ...(n >= 10 ? gaeldende(rod, MED_TI, b, h) : {}) };
  return { kolonner: Number(g['--kolonner']), raekker: Number(g['--raekker']), rest: pxTal(g['--rest']), gab: pxTal(g['--raek-gab']), plade: g['--plade'] };
}

test('forsidens gitter: 3 × 3 på iPad, 2 kolonner på iPhone, og alle knapper har en plads', () => {
  const rod = blokke(CSS);
  const n = Object.keys(GRUPPER).length;
  assert.equal(n, 9, 'v7 har 9 knapper: en 10. skal også passe (næste test)');
  const ipad = gitter(rod, n, 1180, 820);
  assert.deepEqual([ipad.kolonner, ipad.raekker], [3, 3]);
  assert.deepEqual([gitter(rod, n, 390, 844).kolonner, gitter(rod, n, 390, 844).raekker], [2, 5]);
  for (const [b, h] of [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    const g = gitter(rod, n, b, h);
    assert.ok(g.kolonner * g.raekker >= n, b + '×' + h + ' har plads til ' + g.kolonner * g.raekker);
  }
  for (let b = 360; b <= 700; b++) assert.equal(gitter(rod, n, b, 1000).kolonner, 2, b + ' px');
});

test('forsidens gitter: en 10. knap giver 5 × 2 på iPad på langs og 2 kolonner på iPhone, uden ny kode', () => {
  const rod = blokke(CSS);
  const ipad = gitter(rod, 10, 1180, 820);
  assert.deepEqual([ipad.kolonner, ipad.raekker], [5, 2]);
  const hoej = gitter(rod, 10, 820, 1180);
  assert.deepEqual([hoej.kolonner, hoej.raekker], [2, 5], 'iPad på højkant: ingen knap alene på en række');
  for (const [b, h] of [[390, 844], [360, 640], [700, 1000]]) assert.equal(gitter(rod, 10, b, h).kolonner, 2, b + ' px');
  for (const [b, h] of [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [390, 844], [667, 375]]) {
    const g = gitter(rod, 10, b, h);
    assert.ok(g.kolonner * g.raekker >= 10, b + '×' + h + ' har plads til ' + g.kolonner * g.raekker);
  }
});

// Rækkens højde regnes af skærmen og --rest (som i app.css). En knap skal mindst kunne rumme den mindste tallerken (72 px),
// knappens luft og et navn: ellers presses gitteret ud over skærmen
test('forsidens gitter: rækkerne er høje nok uden at rulle på iPad, med 9 og 10 knapper og med timeren fremme', () => {
  const rod = blokke(CSS);
  const hoejde = (g, h, rest = g.rest) => (h - rest - (g.raekker - 1) * g.gab) / g.raekker;
  for (const n of [9, 10]) {
    for (const [b, h] of [[1180, 820], [1024, 768]]) {
      const g = gitter(rod, n, b, h);
      assert.ok(hoejde(g, h) >= 92, n + ' knapper på ' + b + '×' + h + ': rækken er ' + hoejde(g, h) + ' px');
    }
  }
  const pille = rod.regler.filter((r) => r.hoved.includes('.forside:has(.forside-timer .pille:not([hidden])) .gruppe-knapper')).map((r) => r.deklarationer).join(';');
  const m = /--rest\s*:\s*(\d+px)/.exec(pille);
  assert.ok(m, 'timeren skubber knapperne ned: reglen skal give et større --rest');
  const g = gitter(rod, 9, 1180, 820);
  assert.ok(pxTal(m[1]) > g.rest);
  assert.ok(hoejde(g, 820, pxTal(m[1])) >= 92, 'med timeren: ' + hoejde(g, 820, pxTal(m[1])) + ' px');
});

test('knapperne er store nok til små fingre på iPhone, og navnene kan ikke knække midt i et ord', () => {
  const rod = blokke(CSS);
  for (let b = 360; b <= 700; b++) {
    const luft = gaeldende(rod, GITTER, b, 1000);
    const [, vandret] = luft.padding.split(/\s+/).map(parseFloat);
    const [, kolonneGab] = luft.gap.replace(/var\(--raek-gab\)/, '0px').split(/\s+/).map(parseFloat);
    const knap = (b - 2 * vandret - kolonneGab) / 2;
    assert.ok(knap >= 140, b + ' px: knappen er ' + knap + ' px bred');
    assert.ok(pxTal(luft['--plade']) >= 96, b + ' px');
    assert.ok(pxTal(luft['--plade']) <= knap - 22, b + ' px: tallerkenen skal kunne være i knappen');
  }
  const navn = gaeldende(rod, '.gruppe-knap-navn', 1180, 820);
  assert.equal(navn['overflow-wrap'], 'break-word', 'overflow-wrap: anywhere giver ét bogstav pr. linje i flex i WebKit');
  assert.equal(navn.hyphens, 'auto');
  assert.equal(navn['-webkit-hyphens'], 'auto');
  assert.equal(navn['min-width'], '0');
});

test('lupen er mindst 48 px på alle skærme, og Rosa og Bo giver plads til den på smalle skærme', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [820, 1180], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    const l = gaeldende(rod, '.knap.forside-lup', b, h);
    assert.ok(pxTal(l.width) >= 48 && pxTal(l['min-height']) >= 48, b + '×' + h);
  }
  for (let b = 360; b <= 559; b++) assert.equal(gaeldende(rod, '.forside-top > .forside-dyr', b, 1000).display, 'none', b + ' px');
});

test('de gamle hop-knapper er væk fra stilarket', () => {
  assert.doesNotMatch(CSS, /\.hop\b|forside-hop/);
});

// Hver gruppe (GRUPPER i js/katalog.js) har sin egen farve i [data-gruppe] (knappen på forsiden, overskriften og kortenes
// cirkel). Jul kom ind 01-11-2026 uden en regel, og så faldt kortene tilbage til sennep og knappen til ingenting
test('hvert afsnit har sin egen farve i [data-gruppe] fra en farve på :root', () => {
  const rod = blokke(CSS);
  const farver = new Set([...rod.regler.filter((b) => b.hoved === ':root').map((b) => b.deklarationer).join(';')
    .matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1]));
  const brugt = new Map();
  for (const id of Object.keys(GRUPPER)) {
    const regel = rod.regler.filter((b) => b.hoved === '[data-gruppe="' + id + '"]').map((b) => b.deklarationer).join(';');
    const m = /--ret-farve\s*:\s*var\((--[a-z-]+)\)/.exec(regel);
    assert.ok(m, 'app.css mangler [data-gruppe="' + id + '"] { --ret-farve: var(--…); }');
    assert.ok(farver.has(m[1]), '[data-gruppe="' + id + '"] bruger ' + m[1] + ', som ikke står på :root');
    assert.ok(!brugt.has(m[1]), id + ' og ' + brugt.get(m[1]) + ' har samme farve (' + m[1] + ')');
    brugt.set(m[1], id);
  }
});

// Review-fund 4 (02-11): en lang søgetekst uden mellemrum i «Ingen retter passer til «…»» løb ud over højre kant på 390 og
// 360 px. .voksen-tom står med align-items: flex-start, så teksten fik sin min-content-bredde (hele ordet). overflow-wrap:
// anywhere gør min-content smal, så teksten brydes ved kanten. e2e skriver 60 tegn uden mellemrum og måler (kataloget)
test('søgeteksten i «Ingen retter passer til …» kan brydes, også uden mellemrum (familie.css)', () => {
  const FAM = fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const regler = blokke(FAM).regler.filter((b) => b.hoved.split(',').map((s) => s.trim()).includes('.voksen-tom p')).map((b) => b.deklarationer).join(';');
  assert.match(regler, /overflow-wrap\s*:\s*anywhere/, '.voksen-tom p skal have overflow-wrap: anywhere');
});

// Review-fund 9 (02-11): på telefonen får kun katalogets rækker med «Med» (.med-udvalg) knapperne på en linje for sig.
// Uden «Med» står hjertet og «Åbn» ved siden af navnet, så «jul» (24 retter uden «Med») ikke giver en side på 4.322 px.
// Rækkerne og klassen tjekkes i test-voksen-del.js, og e2e måler, at hjertet står ved billedet
test('katalogets knapper får kun deres egen linje på telefonen i rækker med «Med» (familie.css)', () => {
  const FAM = fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const telefon = blokke(FAM).regler.filter((b) => /^@media\s*\(max-width:\s*700px\)$/.test(b.hoved)).flatMap((b) => b.regler);
  const helLinje = telefon.filter((r) => /grid-column\s*:\s*1\s*\/\s*-1/.test(r.deklarationer)).flatMap((r) => r.hoved.split(',').map((s) => s.trim()));
  assert.ok(helLinje.includes('.voksen-raekke-knapper.med-udvalg'), 'forventede grid-column: 1 / -1 på .voksen-raekke-knapper.med-udvalg (' + helLinje.join(', ') + ')');
  assert.ok(!helLinje.includes('.voksen-raekke-knapper'), '.voksen-raekke-knapper uden .med-udvalg må ikke få en linje for sig');
});

// Review 02-11: voksendelens <details class="filtre"> fik også app.css' «.valg-par, .filtre { display: flex }» (til
// ugeplanens chips), så linjen kun var så bred som teksten, og den lukkede boks lå ved siden af den. familie.css må kun
// bruge app.css' klassenavne, når det er meningen at bygge videre på dem. Ellers skal klassen have et nyt navn (fx voksen-)
test('familie.css bruger kun app.css\' klassenavne fra en kendt liste (ingen navne, der kolliderer ved et uheld)', () => {
  const FAM = fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const klasser = (tekst) => new Set(tekst.replace(/\{[^{}]*\}/g, '{}').match(/\.[a-zA-Z][\w-]*/g) ?? []);
  const iApp = klasser(CSS);
  const begge = [...klasser(FAM)].filter((k) => iApp.has(k)).sort();
  const KENDTE = ['.faerdig', '.ikon', '.knap', '.topbar-midte', '.uge-besked', '.valg-par', '.valgt'];
  assert.deepEqual(begge.filter((k) => !KENDTE.includes(k)), [], 'klasser i både app.css og familie.css (giv dem et nyt navn, eller skriv dem i KENDTE)');
});
