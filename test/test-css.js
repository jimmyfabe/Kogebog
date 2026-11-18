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
    // En fast bund: position: sticky og bottom: 0 (.handlinger på retten, trinene og børnenes valg)
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
const MED_ELLEVE = '.gruppe-knapper:has(> li:nth-child(11):last-child)';
const MED_TOLV = '.gruppe-knapper:has(> li:nth-child(12):last-child)';
// Reglerne for præcis n knapper (11 fra v9, 12 fra v11, hvor Kød blev til Gris og Ko)
const PRAECIS = { 11: MED_ELLEVE, 12: MED_TOLV };
const pxTal = (v) => {
  assert.match(String(v), /^\d+(\.\d+)?px$/, 'forventede en værdi i px, fandt ' + v);
  return parseFloat(v);
};
// Gitterets variabler ved n knapper: reglen for 10 knapper lægges oven på den almindelige, og reglen for præcis 11 eller 12
// oven på den, som i browseren (:has() vejer det samme som vælgeren i parentesen). spor er antallet i grid-template-columns:
// med 11 og 12 knapper to pr. kolonne, så den sidste række kan stå i midten, når den ikke er fuld
function gitter(rod, n, b, h) {
  const g = { ...gaeldende(rod, GITTER, b, h), ...(n >= 10 ? gaeldende(rod, MED_TI, b, h) : {}), ...(Object.hasOwn(PRAECIS, n) ? gaeldende(rod, PRAECIS[n], b, h) : {}) };
  const spor = /^repeat\((\d+),/.exec(g['grid-template-columns'] || '');
  return { kolonner: Number(g['--kolonner']), raekker: Number(g['--raekker']), spor: spor ? Number(spor[1]) : Number(g['--kolonner']),
    rest: pxTal(g['--rest']), gab: pxTal(g['--raek-gab']), plade: g['--plade'] };
}
// En knaps grid-column ved n knapper (11 eller 12): reglen for alle knapper og så den for knap nr. i (vejer mere)
const knapLi = (rod, n, i, b, h) => ({ ...gaeldende(rod, PRAECIS[n] + ' > li', b, h), ...gaeldende(rod, PRAECIS[n] + ' > li:nth-child(' + i + ')', b, h) })['grid-column'];
const elleveLi = (rod, i, b, h) => knapLi(rod, 11, i, b, h);
// Knappens bredde ved n knapper: gitteret er højst 1180 px, minus luften i siderne og mellem kolonnerne
function knapBredde(rod, n, b, h) {
  const g = gitter(rod, n, b, h);
  const luft = gaeldende(rod, GITTER, b, h);
  const vandret = parseFloat(luft.padding.split(/\s+/)[1]);
  const kolonneGab = parseFloat(luft.gap.replace(/var\(--raek-gab\)/, '0px').split(/\s+/)[1]);
  return (Math.min(b, 1180) - 2 * vandret - (g.kolonner - 1) * kolonneGab) / g.kolonner;
}

test('forsidens gitter: 5 × 2 på iPad, 2 kolonner på iPhone, og alle knapper har en plads', () => {
  const rod = blokke(CSS);
  // GRUPPER og index.json har 12 grupper fra v11 (testene for 11 og 12 står nedenfor)
  assert.equal(Object.keys(GRUPPER).length, 12, 'v11 har 12 grupper: Kød er delt i Gris og Ko');
  const n = 10;
  const ipad = gitter(rod, n, 1180, 820);
  assert.deepEqual([ipad.kolonner, ipad.raekker], [5, 2]);
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

// Madpakke (v9) er den 11. knap. Den sidste række står i midten: gitteret har to spor pr. kolonne, og den første knap i
// den sidste række starter i spor 2. Hvilken knap det er, følger kolonnerne (7 ved 6 + 5, 10 ved 3 × 4, 11 ved 2 × 6)
test('forsidens gitter: 11 knapper giver 6 + 5 på iPad på langs, 3 × 4 i smalle vinduer på langs og ellers 2 kolonner', () => {
  const rod = blokke(CSS);
  const forventet = [
    [1180, 820, 6], [1280, 800, 6], [1024, 768, 6], [1024, 800, 6], [1000, 700, 6],
    [999, 800, 3], [960, 800, 3], [901, 800, 3], [701, 500, 3], [844, 390, 3], [932, 430, 3], [812, 375, 3], [736, 414, 3], [1024, 500, 3],
    [820, 1180, 2], [768, 1024, 2], [744, 1133, 2], [390, 844, 2], [360, 780, 2], [667, 375, 2], [700, 400, 2],
  ];
  for (const [b, h, k] of forventet) {
    const g = gitter(rod, 11, b, h);
    const hvor = '11 knapper på ' + b + '×' + h;
    assert.equal(g.kolonner, k, hvor + ': kolonner');
    assert.equal(g.spor, 2 * k, hvor + ': to spor pr. kolonne');
    assert.equal(g.raekker, Math.ceil(11 / k), hvor + ': rækker');
    const midten = 11 - ((11 % k) || k) + 1; // den første knap i den sidste række
    for (let i = 1; i <= 11; i++) assert.equal(elleveLi(rod, i, b, h), i === midten ? '2 / span 2' : 'span 2', hvor + ': knap ' + i);
  }
  for (let b = 360; b <= 700; b++) assert.equal(gitter(rod, 11, b, 1000).kolonner, 2, b + ' px');
  // Reglen gælder kun præcis 11: med 10 knapper er der ingen dobbelte spor
  assert.equal(gitter(rod, 10, 1180, 820).spor, 5);
});

// Gris og Ko (v11) giver 12 knapper: samme kolonner og rækker som 11 (6 × 2, 3 × 4 og 2 × 6), men alle rækker er fulde,
// så ingen knap flyttes til midten. Knappen og navnet står, som de gør med 11
test('forsidens gitter: 12 knapper giver 6 × 2 på iPad på langs, 3 × 4 i smalle vinduer på langs og ellers 2 × 6', () => {
  const rod = blokke(CSS);
  const forventet = [
    [1180, 820, 6], [1280, 800, 6], [1024, 768, 6], [1024, 800, 6], [1000, 700, 6],
    [999, 800, 3], [960, 800, 3], [901, 800, 3], [701, 500, 3], [844, 390, 3], [932, 430, 3], [812, 375, 3], [736, 414, 3], [1024, 500, 3],
    [820, 1180, 2], [768, 1024, 2], [744, 1133, 2], [390, 844, 2], [360, 780, 2], [667, 375, 2], [700, 400, 2],
  ];
  for (const [b, h, k] of forventet) {
    const g = gitter(rod, 12, b, h);
    const hvor = '12 knapper på ' + b + '×' + h;
    assert.equal(g.kolonner, k, hvor + ': kolonner');
    assert.equal(g.spor, 2 * k, hvor + ': to spor pr. kolonne');
    assert.equal(g.raekker, 12 / k, hvor + ': fulde rækker');
    for (let i = 1; i <= 12; i++) assert.equal(knapLi(rod, 12, i, b, h), 'span 2', hvor + ': knap ' + i + ' flyttes ikke');
    assert.equal(g.plade, gitter(rod, 11, b, h).plade, hvor + ': tallerkenen som med 11');
    for (const del of [' .gruppe-knap', ' .gruppe-knap-navn']) {
      assert.deepEqual(gaeldende(rod, MED_TOLV + del, b, h), gaeldende(rod, MED_ELLEVE + del, b, h), hvor + del + ': som med 11');
    }
  }
  for (let b = 360; b <= 700; b++) assert.equal(gitter(rod, 12, b, 1000).kolonner, 2, b + ' px');
});

test('forsidens gitter: med 11 og 12 knapper er hver knap mindst 140 px bred, fra 360 px og op', () => {
  const rod = blokke(CSS);
  for (const n of [11, 12]) {
    for (let b = 360; b <= 1400; b++) {
      for (const h of b <= 700 ? [1000, 400] : [400, 800, 1200]) {
        const k = knapBredde(rod, n, b, h);
        assert.ok(k >= 140, n + ' knapper på ' + b + '×' + h + ': knappen er ' + k + ' px bred');
      }
    }
  }
});

// Rækkens højde regnes af skærmen og --rest (som i app.css). En knap skal mindst kunne rumme den mindste tallerken (72 px),
// knappens luft og et navn: ellers presses gitteret ud over skærmen
test('forsidens gitter: rækkerne er høje nok uden at rulle på iPad, med 9, 10, 11 og 12 knapper og med timeren fremme', () => {
  const rod = blokke(CSS);
  const hoejde = (g, h, rest = g.rest) => (h - rest - (g.raekker - 1) * g.gab) / g.raekker;
  // 11 og 12 knapper med tallerkenen til venstre for navnet: den mindste tallerken (72), knappens luft (20) og kanten (6)
  for (const n of [11, 12]) {
    for (const [b, h] of [[820, 1180], [768, 1024], [744, 1133], [901, 800], [960, 800]]) {
      const g = gitter(rod, n, b, h);
      assert.ok(hoejde(g, h) >= 98, n + ' knapper på ' + b + '×' + h + ': rækken er ' + hoejde(g, h) + ' px');
    }
  }
  for (const n of [9, 10, 11, 12]) {
    for (const [b, h] of [[1180, 820], [1024, 768], [1280, 800]]) {
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

// Review F3 (15-11): med «I dag»-kortet og en timer rullede forsiden på desktop (1280×800: 824 px med et kort navn, 842 med
// et langt), for tallerkenen stod på sit mindste (72 px). Kun i det tilfælde må den gå ned til 64 px (billedet 48 px, regel
// 9), pillen og kortet rykker tættere på dugen, og navnet står på én linje på skærme på langs. e2e måler det (heleVejen)
test('forsiden med «I dag» og en timer: tallerkenen må gå ned til 64 px, og alle tallerkenregler bruger --plade-min', () => {
  const rod = blokke(CSS);
  const BEGGE = '.forside:has(.forside-idag):has(.forside-timer .pille:not([hidden]))';
  const gitterRegel = rod.regler.filter((r) => r.hoved === BEGGE + ' .gruppe-knapper').map((r) => r.deklarationer).join(';');
  assert.match(gitterRegel, /--plade-min\s*:\s*64px/);
  assert.doesNotMatch(CSS.replace(gitterRegel, ''), /--plade-min\s*:/, '--plade-min sættes kun med «I dag» og en timer');
  // Alle steder, tallerkenen regnes af rækken, er mindstemålet --plade-min (72 px, når den ikke er sat)
  const clamps = CSS.match(/--plade\s*:\s*clamp\([^;]+/g);
  assert.ok(clamps.length >= 6, 'fandt ' + clamps.length);
  for (const c of clamps) assert.match(c, /^--plade\s*:\s*clamp\(var\(--plade-min,\s*72px\),/, c);
  // Over hinanden (på højkant; på langs står de i én række, testen nedenfor)
  for (const [b, h] of [[820, 1180], [744, 1133]]) {
    assert.equal(gaeldende(rod, BEGGE + ' .forside-timer .pille', b, h)['margin-top'], '8px', b + '×' + h);
    assert.equal(gaeldende(rod, BEGGE + ' .forside-idag', b, h)['padding-top'], '8px', b + '×' + h);
  }
  for (const [b, h] of [[1280, 800], [1180, 820]]) {
    const navn = gaeldende(rod, BEGGE + ' .idag-navn', b, h);
    assert.deepEqual([navn['white-space'], navn.overflow, navn['text-overflow']], ['nowrap', 'hidden', 'ellipsis'], b + '×' + h);
  }
  assert.equal(gaeldende(rod, BEGGE + ' .idag-navn', 390, 844)['white-space'], undefined, 'på telefonen må navnet stå på to linjer (siden ruller)');
});

// Review U6 og U8 (15-11): med pillen over kortet rullede 1280×720 76 px («Voksne: hold» skåret af), og 1280×800 havde
// ingen luft (tallerkenen på 64 px). På skærme på langs står pillen nu til venstre for kortet i én række (.forside-nu i
// app.js), og knapperne regnes som med kortet alene. På højkant og telefonen står de over hinanden. e2e måler det
test('forsiden med «I dag» og en timer på langs: pillen står ved siden af kortet, og knapperne får kortets --rest', () => {
  const rod = blokke(CSS);
  const BEGGE = '.forside:has(.forside-idag):has(.forside-timer .pille:not([hidden]))';
  for (const [b, h] of [[1280, 720], [1280, 800], [1180, 820], [1180, 746], [1000, 700], [1440, 900]]) {
    const nu = gaeldende(rod, BEGGE + ' .forside-nu', b, h);
    assert.equal(nu.display, 'flex', b + '×' + h);
    assert.equal(nu['flex-direction'], undefined, b + '×' + h + ': i én række');
    assert.equal(nu['align-items'], 'center', b + '×' + h);
    assert.equal(gaeldende(rod, BEGGE + ' .forside-timer .pille', b, h)['margin-top'], '0', b + '×' + h);
    assert.equal(gaeldende(rod, BEGGE + ' .forside-idag', b, h).padding, '0', b + '×' + h);
    assert.equal(gaeldende(rod, BEGGE + ' .gruppe-knapper', b, h)['--rest'], gaeldende(rod, '.forside:has(.forside-idag) .gruppe-knapper', b, h)['--rest'],
      b + '×' + h + ': samme --rest som med kortet alene');
  }
  for (const [b, h] of [[820, 1180], [744, 1133], [390, 844], [360, 740], [844, 390], [960, 600]]) {
    assert.equal(gaeldende(rod, BEGGE + ' .forside-nu', b, h).display, undefined, b + '×' + h + ': over hinanden');
  }
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

// Review F6 (15-11): «Kom kyllingen og ægget i.» endte med «i.» alene på anden linje. text-wrap: balance gør linjerne lige
// lange (WebKit fra Safari 17.5; ældre Safari bryder som før). e2e-tjekket «titler» ser kun på retternes navne
test('trinteksten brydes i lige lange linjer på alle skærme (text-wrap: balance)', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[390, 844], [844, 390], [768, 1024], [1180, 820], [1280, 800]]) {
    assert.equal(gaeldende(rod, '.trin-tekst h1', b, h)['text-wrap'], 'balance', b + '×' + h);
  }
});

// Review U12 (17-11): 492 af 3044 trin-noter endte med ét ord alene på sidste linje på 390 px (271 på 1180 px), målt i
// WebKit. Med text-wrap: pretty var det 0 og 2 linjer mere i alt. Ældre Safari bryder som før
test('trin-noterne ender ikke med ét ord alene på sidste linje (text-wrap: pretty)', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[390, 844], [844, 390], [768, 1024], [1180, 820], [1280, 800]]) {
    assert.equal(gaeldende(rod, '.note', b, h)['text-wrap'], 'pretty', b + '×' + h);
  }
});

// Review V4 (17-11): rettens navn over ingredienserne endte med et kort ord alene på sidste linje («… med / ris»). Samme
// regel som kortene: målt i WebKit stod det i 24 af 255 navne på 360 px før og 6 efter (390 px: 12 og 3, 1180 px: 24 og 6,
// 1280 px: 20 og 4). Resten er lange ord, der ikke kan deles («Mild / kyllingekarry / med ris»)
test('rettens navn på retten brydes i lige lange linjer (text-wrap: balance)', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[360, 780], [390, 844], [844, 390], [768, 1024], [1180, 820], [1280, 800]]) {
    assert.equal(gaeldende(rod, '.ret-titel h1', b, h)['text-wrap'], 'balance', b + '×' + h);
  }
});

// Review U13 (17-11): «Hyrdetærte / med / kartoffelskiver» (390 px) og «Smash-burgere med / ost» (360 px) på forsidens
// gruppekort. Med text-wrap: balance stod et ord på højst 4 bogstaver alene i 58 af 2550 navne mod 171 før (10 skærme,
// WebKit), uden at et kort blev højere. Hyrdetærten fik desuden en blød bindestreg i «kartoffel|skiver»
test('retternes navne på kortene brydes i lige lange linjer (text-wrap: balance)', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[360, 780], [390, 844], [667, 375], [844, 390], [820, 1180], [1180, 820], [1280, 800]]) {
    assert.equal(gaeldende(rod, '.kort-navn', b, h)['text-wrap'], 'balance', b + '×' + h);
  }
});

test('lupen er mindst 48 px på alle skærme, og Rosa og Bo giver plads til den på smalle skærme', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [820, 1180], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    const l = gaeldende(rod, '.knap.forside-lup', b, h);
    assert.ok(pxTal(l.width) >= 48 && pxTal(l['min-height']) >= 48, b + '×' + h);
  }
  for (let b = 360; b <= 559; b++) assert.equal(gaeldende(rod, '.forside-top > .forside-dyr', b, 1000).display, 'none', b + ' px');
});

// Dyret på statusskærmene havde kun en bredde. Kom billedet sent (første start, mens service workeren gemmer alle filer),
// voksede det fra 0 til 140 px, og alt under det rykkede ned: «Voksne: hold» flyttede sig under musen midt i holdet, og
// holdet stoppede (e2e «uden net» 15-11, målt mod en HTTP/1.0-server). Pladsen er derfor sat af, før billedet kommer
test('dyret på statusskærmene har sin højde, før billedet er hentet (aspect-ratio), på alle skærme', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [820, 1180], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    const d = gaeldende(rod, '.status-dyr', b, h);
    assert.ok(pxTal(d.width) > 0, b + '×' + h + ': bredden er ' + d.width);
    assert.equal(ens(d['aspect-ratio'] || ''), '1/1', b + '×' + h + ': dyrene er kvadratiske (viewBox 256 × 256)');
  }
});

// Review U5 (15-11): et dyr, der ikke kunne hentes (klassen «mangler» fra app.js), skjules uden at tage pladsen med sig,
// så knapperne under det ikke rykker (visibility, ikke display)
test('statusskærmens dyr uden billede er skjult, men holder sin plads', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [390, 844], [1280, 800]]) {
    const d = gaeldende(rod, '.status-dyr.mangler', b, h);
    assert.equal(d.visibility, 'hidden', b + '×' + h);
    assert.equal(d.display, undefined, b + '×' + h + ': display må ikke ændres (så forsvinder pladsen)');
  }
});

// Review R6 (15-11): forsidens dyr (Rosa og Bo i dugen) havde også kun en bredde. Kommer billedet sent, vokser dugen, og
// alt under den rykker ned midt i et hold på «Voksne: hold» (samme mønster som statusskærmens dyr ovenfor)
test('forsidens dyr har deres højde, før billedet er hentet (aspect-ratio), på alle skærme, hvor de står', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [820, 1180], [1280, 800], [1280, 720], [744, 1133], [600, 900]]) {
    const d = gaeldende(rod, '.forside-dyr', b, h);
    assert.notEqual(d.display, 'none', b + '×' + h + ': dyrene står på forsiden her');
    assert.ok(d.width, b + '×' + h + ': dyrene har en bredde');
    assert.equal(ens(d['aspect-ratio'] || ''), '1/1', b + '×' + h + ': dyrene er kvadratiske (viewBox 256 × 256)');
  }
});

test('hovedknappen på statusskærmene (.knap.primaer) er mindst 48 px på alle skærme (regel 9)', () => {
  const rod = blokke(CSS);
  for (const [b, h] of [[1180, 820], [820, 1180], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    assert.ok(pxTal(gaeldende(rod, '.knap.primaer', b, h)['min-height']) >= 48, b + '×' + h);
  }
});

// gaeldende ser kun den præcise vælger, så en længere vælger som «.faerdig .status-knapper .knap» slap uden om testen ovenfor
test('ingen regel gør en knap lavere end 48 px, heller ikke med en længere vælger (regel 9)', () => {
  const alleRegler = (regler) => regler.flatMap((r) => (r.hoved.startsWith('@') ? alleRegler(r.regler ?? []) : [r]));
  const forLave = [];
  for (const r of alleRegler(blokke(CSS).regler)) {
    const hoejde = /(?:^|;)\s*min-height:\s*(\d+(?:\.\d+)?)px/.exec(r.deklarationer);
    if (!hoejde || parseFloat(hoejde[1]) >= 48) continue;
    for (const v of r.hoved.split(',')) {
      if (/\.knap(?:\.[\w-]+)*\s*$/.test(v)) forLave.push(v.trim() + ': ' + hoejde[1] + ' px');
    }
  }
  assert.deepEqual(forLave, []);
});

test('gruppeskærmen har luft under sidste række på alle skærme', () => {
  const rod = blokke(CSS);
  const bund = (padding) => {
    const v = padding.split(/\s+/);
    return parseFloat(v[2] ?? v[0]);
  };
  for (const [b, h] of [[1180, 820], [820, 1180], [700, 900], [390, 844], [360, 640], [844, 390], [667, 375]]) {
    const { padding } = gaeldende(rod, '.gruppe', b, h);
    assert.ok(bund(padding) >= 28, b + '×' + h + ' har padding: ' + padding);
  }
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

// Review-fund 9 (02-11) gav kun rækker med «Med» en linje til knapperne på telefonen, så «jul» ikke blev en side på
// 4.322 px. Med «Print» (v10) er der tre-fire knapper i hver række, og ved navnet blev det under 80 px bredt, så nu får
// knapperne deres egen linje i alle katalogets rækker på telefonen. Kun i kataloget: udvalgets og favoritternes rækker
// har én knap. e2e måler det i WebKit
test('katalogets knapper får deres egen linje i alle rækker på telefonen, og kun i kataloget (familie.css)', () => {
  const FAM = fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const telefon = blokke(FAM).regler.filter((b) => /^@media\s*\(max-width:\s*700px\)$/.test(b.hoved)).flatMap((b) => b.regler);
  const helLinje = telefon.filter((r) => /grid-column\s*:\s*1\s*\/\s*-1/.test(r.deklarationer)).flatMap((r) => r.hoved.split(',').map((s) => s.trim()));
  assert.ok(helLinje.includes('.voksen-katalog .voksen-raekke-knapper'), 'forventede grid-column: 1 / -1 på .voksen-katalog .voksen-raekke-knapper (' + helLinje.join(', ') + ')');
  assert.ok(!helLinje.includes('.voksen-raekke-knapper'), '.voksen-raekke-knapper uden .voksen-katalog må ikke få en linje for sig (udvalget og favoritterne)');
  assert.doesNotMatch(FAM, /\.med-udvalg/, '.med-udvalg bruges ikke længere');
});

// Review U7 (15-11): på 390 px stod katalogets knapper til højre med 21 px luft til venstre og 10 px til højre. «Med» står
// nu i venstre side (margin-right: auto tager luften), og hjertet, «Åbn» og «Print» står stadig til højre, samme sted i alle
// rækker, også dem uden «Med». Kun på telefonen, hvor knapperne har deres egen linje. e2e måler det i WebKit
test('katalogets knaprække på telefonen: «Med» i venstre side, de andre til højre (familie.css)', () => {
  const rod = blokke(fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''));
  const MED = '.voksen-katalog .voksen-raekke-knapper > .voksen-med';
  for (const b of [360, 390, 430, 700]) {
    assert.equal(gaeldende(rod, MED, b, 844)['margin-right'], 'auto', b + ' px');
    assert.equal(gaeldende(rod, '.voksen-raekke-knapper', b, 844)['justify-content'], 'flex-end', b + ' px: de andre står til højre');
  }
  assert.equal(gaeldende(rod, MED, 1180, 820)['margin-right'], undefined, 'ved navnet (iPad, desktop): som før');
});

// Review F5 (15-11): på iPhone var de tre øverst (84 px) lavere end «Mere» (87 px med to linjer status), Favoritter 72 px
// (én linje), og kontakten «Mere grønt i maden» den største (98-128 px, navnet på to linjer i 24 px). Kontakten er noget,
// man sætter én gang, så den ligner «Mere». e2e måler højderne i WebKit
// v11 (16-11): de tre store kort øverst på oversigten er væk (forsiden er ugeplanen), så kun «Mere» og kontakten måles
test('voksendelens «Mere»: kortene er lige høje, og kontakten ligner dem (familie.css)', () => {
  const FAM = fs.readFileSync(path.join(ROD, 'familie.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const trae = blokke(FAM).regler;
  const telefon = trae.filter((b) => /^@media\s*\(max-width:\s*700px\)$/.test(b.hoved)).flatMap((b) => b.regler);
  // Den sidste værdi af egenskaben i en regel, hvis vælgerliste har vælgeren
  const vaerdi = (regler, vaelger, egenskab) => {
    const fund = regler.filter((r) => r.hoved.split(',').map((x) => x.trim()).includes(vaelger))
      .flatMap((r) => [...r.deklarationer.matchAll(new RegExp('(?:^|;)\\s*' + egenskab + '\\s*:\\s*([^;]+)', 'g'))].map((m) => m[1].trim()));
    return fund.at(-1) ?? null;
  };
  assert.equal(vaerdi(trae, '.voksen-mere .voksen-punkt-status', 'min-height'), '2.2em', '«Mere» har plads til to linjer status');
  assert.equal(vaerdi(trae, '.voksen-kontakt .voksen-punkt-status', 'min-height'), '2.2em', 'kontakten har plads til to linjer status');
  for (const egenskab of ['min-height', 'padding', 'border-width', 'box-shadow']) {
    assert.ok(vaerdi(trae, '.voksen-mere .knap.voksen-punkt', egenskab), egenskab + ' på «Mere»');
    assert.equal(vaerdi(trae, '.knap.voksen-kontakt', egenskab), vaerdi(trae, '.voksen-mere .knap.voksen-punkt', egenskab), 'kontakten som «Mere»: ' + egenskab);
  }
  assert.equal(vaerdi(trae, '.voksen-kontakt .voksen-punkt-navn', 'font-size'), vaerdi(trae, '.voksen-mere .voksen-punkt-navn', 'font-size'), 'kontaktens navn som «Mere»');
  assert.equal(vaerdi(telefon, '.knap.voksen-kontakt', 'min-height'), vaerdi(telefon, '.voksen-mere .knap.voksen-punkt', 'min-height'), 'kontakten som «Mere» på telefonen');
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

// Review F9 (17-11): app.css havde regler til den gamle ugeplans skærme (.uge-handlinger, .ret-valg, .dag-vaerktoej,
// .dag-hoved, .uden-billede m.fl.), som intet tegnede efter v11 (f020bf1), og --bund-testen tjekkede en fast bund, der
// ikke fandtes. Hvert klassenavn i app.css skal stå som et ord i en streng i koden (app.js, index.html og js/ uden
// printets filer, som har print.css), eller være et kendt sammensat navn ('anim-' + verbum, 'k' + tal). Groft: korte
// navne som .dag og .uge står også i koden som adresser og slipper igennem
test('hvert klassenavn i app.css bruges af koden (ingen døde regler)', () => {
  const filer = ['app.js', 'index.html', ...fs.readdirSync(path.join(ROD, 'js')).filter((f) => f.endsWith('.js') && !f.startsWith('print')).map((f) => 'js/' + f)];
  const ord = new Set();
  for (const f of filer) {
    for (const m of fs.readFileSync(path.join(ROD, f), 'utf8').matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
      for (const o of (m[1] ?? m[2] ?? m[3]).split(/\s+/)) ord.add(o);
    }
  }
  const SAMMENSAT = /^(anim-[a-z-]+|k\d)$/;
  const klasser = new Set(CSS.replace(/\{[^{}]*\}/g, '{}').match(/\.[a-zA-Z][\w-]*/g) ?? []);
  const doede = [...klasser].map((k) => k.slice(1)).filter((k) => !ord.has(k) && !SAMMENSAT.test(k)).sort();
  assert.deepEqual(doede, [], 'klasser i app.css, som ingen kode bruger (fjern reglerne, eller ret navnet)');
});

// Review af v12 (18-11): 63 trin gik fra «haelde» (vippet med haeld) til «si-daase» og «skylle» og stod stille. Dåsen
// hældes som målekanden, og sien rystes under vandhanen som hænderne i «vaske-haender» (gnid). Verbernes bevægelse står
// kun i @media (prefers-reduced-motion: no-preference), så «mindre bevægelse» holder billederne stille
test('si-daase vipper som haelde, og skylle rystes som vaske-haender, kun uden «mindre bevægelse» (v12)', () => {
  const rod = blokke(CSS);
  const vaelgere = (b) => b.hoved.split(',').map((s) => s.trim());
  const bevaegelse = rod.regler.filter((b) => /prefers-reduced-motion\s*:\s*no-preference/.test(b.hoved)).flatMap((b) => b.regler);
  const anim = (verbum) => bevaegelse.filter((r) => vaelgere(r).includes('.anim-' + verbum + ' .verbum-billede')).map((r) => ens(r.deklarationer)).join(';');
  assert.match(anim('haelde'), /animation-name:haeld;/, '.anim-haelde skal stadig vippe med haeld');
  assert.equal(anim('si-daase'), anim('haelde'), '.anim-si-daase .verbum-billede skal have samme bevægelse som .anim-haelde (dåsen hældes)');
  assert.match(anim('skylle'), /animation-name:gnid;/, '.anim-skylle .verbum-billede skal rystes med gnid, som .anim-vaske-haender under vandhanen');
  assert.match(anim('vaske-haender'), /animation-name:gnid;/);
  // Ingen .anim-regel uden for «ingen præference» (på øverste niveau eller i en anden @media)
  const alle = (b) => [b, ...b.regler.flatMap(alle)];
  const udenfor = alle(rod).filter((b) => /\.anim-/.test(b.hoved) && !bevaegelse.includes(b)).map((b) => b.hoved);
  assert.deepEqual(udenfor, [], 'verbernes bevægelse skal stå i @media (prefers-reduced-motion: no-preference)');
});
