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

// Forsidens top på iPhone på højkant: afsnittenes knapper står mellem Rosa og Bo i et grid (minmax(0, 1fr) auto
// minmax(0, 1fr)). Dyrene skal være skjult eller mindst 32 px brede (som forsideTop i test-e2e.js), og knaprækken må ikke
// være bredere end skærmen (den står i midten og må gerne gå ind i toppens margen: på 360 px står den 4 px fra kanterne,
// målt i WebKit). Med jul blev knapperne fem (352 px), og på 390×844 blev dyrene 1 px brede (review K1, 01-11-2026).
// Testen regner bredderne ud af app.css og antallet af afsnit for hver skærmbredde fra 360 til 700 px på højkant, så en
// sjette knap eller en ny afstand fanges uden en browser
const MIN_DYR = 32;
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
test('forsidens top på iPhone på højkant: Rosa og Bo er skjult eller mindst 32 px, og knaprækken er højst skærmens bredde', () => {
  const rod = blokke(CSS);
  const rodVar = Object.fromEntries([...rod.regler.filter((r) => r.hoved === ':root').map((r) => r.deklarationer).join(';')
    .matchAll(/(--[a-z-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
  const px = (v) => {
    const m = /^var\((--[a-z-]+)\)$/.exec(v);
    const t = m ? rodVar[m[1]] : v;
    assert.match(t, /^\d+(\.\d+)?px$|^0$/, 'forventede en værdi i px, fandt ' + v);
    return parseFloat(t);
  };
  const vandret = (v) => { const d = v.split(/\s+/); return px(d.length === 1 ? d[0] : d[1]); }; // padding: højre/venstre
  const kolonneGap = (v) => { const d = v.split(/\s+/); return px(d.length === 1 ? d[0] : d[1]); }; // gap: række kolonne
  const n = Object.keys(GRUPPER).length;
  const smalle = [];
  const ude = [];
  for (let b = 360; b <= 700; b++) {
    const h = 1000; // højkant: også (min-height: 521px)
    const top = gaeldende(rod, '.forside-top', b, h);
    if (top.display !== 'grid') continue; // kun iPhone-layoutet på højkant
    const indhold = b - 2 * vandret(top.padding);
    const kolonner = (top['grid-template-columns'].match(/minmax\([^)]*\)|[^\s()]+/g) || []).length;
    const gab = kolonner > 1 ? (kolonner - 1) * kolonneGap(top.gap) : 0;
    const knapper = n * px(gaeldende(rod, '.knap.hop', b, h).width) + (n - 1) * px(gaeldende(rod, '.forside-hop', b, h).gap);
    const skjult = gaeldende(rod, '.forside-top > .forside-dyr', b, h).display === 'none';
    const dyr = skjult ? 0 : (indhold - gab - knapper) / 2;
    if (!skjult && dyr < MIN_DYR) smalle.push(b + ' px: ' + dyr + ' px');
    if (knapper > b) ude.push(b + ' px: ' + knapper + ' px');
  }
  const kort = (l) => (l.length > 2 ? l[0] + ' … ' + l.at(-1) : l.join(', '));
  assert.deepEqual(smalle, [], smalle.length + ' bredder giver Rosa og Bo under ' + MIN_DYR + ' px (' + kort(smalle) + '): skjul dem i reglen med .forside-top > .forside-dyr');
  assert.deepEqual(ude, [], ude.length + ' bredder er smallere end knaprækken (' + kort(ude) + ')');
});

// Hvert afsnit på forsiden (GRUPPER i js/katalog.js) har sin egen farve i [data-gruppe] (overskriften, kortenes cirkel og
// knappen i toppen). Jul kom ind 01-11-2026 uden en regel, og så faldt kortene tilbage til sennep og knappen til ingenting
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
