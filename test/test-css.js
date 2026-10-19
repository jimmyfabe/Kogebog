// test-css.js — regler i app.css, som browsertesten ikke kan se.
// Den faste bund og --bund (luften over bunden, som knapper med fokus rulles op over) skal regne med samme
// safe-area: Playwright sætter env(safe-area-inset-bottom) til 0, men en iPhone har 34 px på højkant og 21 px på langs.
// Kør:  node test/test-css.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    const bund = blok.regler.find((r) => r.hoved.includes('.handlinger') && /position\s*:\s*sticky/.test(r.deklarationer));
    assert.ok(bund, blok.hoved + ': --bund står i en blok uden en fast bund (.handlinger med position: sticky)');
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
