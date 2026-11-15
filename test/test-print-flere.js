// test-print-flere.js — flere retter på papir (js/print-flere.js): print.html?retter=<id>,<id>… og print.html?alle.
// Adressen kommer udefra, så retterTilPrint skal afvise alt, der ikke er præcis kendte id'er fra index.json, og printFlere
// må hverken hente eller vise noget fra en adresse, der er afvist. Printets udseende (én ret pr. A4-side) prøves i WebKit.
// Kør:  node test/test-print-flere.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Et lille falsk document: el() i js/dom.js laver elementer med børn, attributter og tekst
const lavEl = (tag) => ({
  tag, born: [], attr: {}, textContent: '',
  setAttribute(k, v) { this.attr[k] = String(v); },
  removeAttribute(k) { delete this.attr[k]; },
  append(...b) { this.born.push(...b); },
  replaceChildren(...b) { this.born = b; },
  addEventListener() {},
});
globalThis.document = { createElement: lavEl, createTextNode: (tekst) => ({ tekst }), title: '' };

const { retterTilPrint, printFlere, MAKS_TEGN } = await import('../js/print-flere.js');

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KENDTE = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', 'index.json'), 'utf8')).grupper.flatMap((g) => g.retter);
const p = (s) => new URLSearchParams(s);
const svar = (s, kendte = KENDTE) => retterTilPrint(p(s), kendte);

test('retter=: kendte id\'er i adressens rækkefølge, og alle: hele kogebogen i forsidens rækkefølge', () => {
  const [a, b, c] = [KENDTE[7], KENDTE[0], KENDTE.at(-1)];
  assert.deepEqual(svar('retter=' + [a, b, c].join(',')), { ids: [a, b, c] });
  assert.deepEqual(svar('retter=' + a), { ids: [a] });
  assert.deepEqual(svar('alle'), { ids: KENDTE });
  assert.deepEqual(svar('alle='), { ids: KENDTE });
  // n og groen hører til printet af hver ret og må gerne stå med
  assert.deepEqual(svar('retter=' + a + '&n=6&groen=1'), { ids: [a] });
  assert.deepEqual(svar('alle&n=4'), { ids: KENDTE });
  // Svaret er en kopi: at ændre det ændrer ikke listen fra index.json
  const kendte = [...KENDTE];
  svar('alle', kendte).ids.pop();
  assert.equal(kendte.length, KENDTE.length);
});

test('et id, der ligner et id, men ikke står i index.json, giver «ukendt»', () => {
  for (const s of ['retter=findes-ikke', 'retter=' + KENDTE[0] + ',findes-ikke', 'retter=koedsovs2', 'retter=constructor', 'retter=proto']) {
    assert.deepEqual(svar(s), { fejl: 'ukendt' }, s);
  }
});

test('alt andet i adressen giver «forkert» eller «tom», aldrig en liste', () => {
  const a = KENDTE[0];
  const forkert = [
    '', 'n=4', 'retter=' + a + '&retter=' + a, 'retter=' + a + '&alle', 'alle&alle', 'alle=ja', 'alle=' + a,
    'ret=' + a + '&retter=' + a, 'uge&alle', 'retter=' + a + '&uge',
    'retter=' + a + ',' + a, 'retter=' + a + ',', 'retter=,' + a, 'retter=' + a + ',,' + KENDTE[1],
    'retter=KOEDSOVS', 'retter=' + a + '%20', 'retter=' + a + ';' + KENDTE[1], 'retter=__proto__', 'retter=../index',
    'retter=' + encodeURIComponent('<b>x</b>'), 'retter=-koedsovs', 'retter=koed--sovs', 'retter=' + 'a,'.repeat(MAKS_TEGN),
  ];
  for (const s of forkert) assert.deepEqual(svar(s), { fejl: 'forkert' }, s);
  assert.deepEqual(svar('retter='), { fejl: 'tom' });
  assert.deepEqual(svar('retter'), { fejl: 'tom' });
  assert.deepEqual(svar('alle', []), { fejl: 'tom' }, 'en tom kogebog');
  // Grænsen: hele index.json med komma kan altid stå i adressen
  assert.ok(KENDTE.join(',').length <= MAKS_TEGN, KENDTE.join(',').length + ' tegn');
  assert.deepEqual(svar('retter=' + KENDTE.join(',')), { ids: KENDTE });
});

// ---------- printFlere med en falsk fetch, der læser opskrifterne fra disken ----------

const hentet = [];
let svigter = new Set(); // stier, som den falske fetch ikke kan hente
globalThis.fetch = async (sti) => {
  hentet.push(sti);
  if (svigter.has(sti)) throw new TypeError('ingen forbindelse');
  const fil = path.join(ROD, sti);
  if (!fs.existsSync(fil)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(fil, 'utf8'), { status: 200, headers: { 'content-type': 'application/json' } });
};

const alleI = (e) => (e && typeof e === 'object' ? [e, ...(e.born || []).flatMap(alleI)] : []);
const tekstAf = (e) => (e == null ? '' : typeof e.tekst === 'string' ? e.tekst : (e.textContent ?? '') + (e.born || []).map(tekstAf).join(''));
// print.html's elementer og print.js' fejlside, så tyndt som muligt. retArk giver et mærke med retten og nummeret
function printSide(s) {
  const beskeder = [];
  const side = {
    ark: Object.assign(lavEl('main'), { attr: { 'aria-live': 'polite' } }),
    printKnap: { textContent: 'Print', disabled: true },
    tilbage: { href: 'index.html', textContent: 'Tilbage' },
    besked: (titel, tekst) => { beskeder.push([titel, tekst]); },
    params: p(s),
    retArk: (m, nr) => ({ tag: 'article', ret: m.id, nr }),
    groen: false,
  };
  return { side, beskeder, koer: () => printFlere(side) };
}

test('printFlere: de valgte retter, én artikel hver i adressens rækkefølge, og printknappen slås til', async () => {
  const ids = [KENDTE[3], KENDTE[1]];
  const { side, beskeder, koer } = printSide('retter=' + ids.join(','));
  await koer();
  const artikler = side.ark.born.filter((b) => b && b.tag === 'article');
  assert.deepEqual(artikler.map((a) => [a.ret, a.nr]), [[ids[0], 0], [ids[1], 1]]);
  assert.equal(side.printKnap.disabled, false);
  assert.equal(side.printKnap.textContent, 'Print de 2 retter');
  assert.equal(side.tilbage.href, 'index.html#/voksen/katalog');
  assert.ok(!Object.hasOwn(side.ark.attr, 'aria-live'), 'arket læses ikke op i sin helhed');
  assert.deepEqual(beskeder.map((b) => b[0]), ['Retter til print'], 'kun «Henter …», ingen fejl');
  assert.match(document.title, /^2 retter · Tumbi Køkken$/);
});

test('printFlere: alle giver hele kogebogen', async () => {
  const { side, koer } = printSide('alle');
  await koer();
  assert.deepEqual(side.ark.born.map((a) => a.ret), KENDTE);
  assert.equal(side.printKnap.textContent, 'Print de ' + KENDTE.length + ' retter');
});

test('printFlere: et ukendt id giver en fast fejltekst, og ingen opskrift hentes eller vises', async () => {
  for (const [s, titel] of [['retter=' + KENDTE[0] + ',findes-ikke', 'En af retterne findes ikke i kogebogen'],
    ['retter=' + encodeURIComponent('<img src=x onerror=alert(1)>'), 'Linket til printet passer ikke'], ['retter=', 'Der er ingen retter at printe']]) {
    hentet.length = 0;
    const { side, beskeder, koer } = printSide(s);
    await koer();
    assert.deepEqual(hentet, ['opskrifter/index.json'], s + ': kun listen over retter hentes');
    assert.equal(beskeder.at(-1)[0], titel, s);
    assert.ok(beskeder.every(([t, x]) => !(t + x).includes('findes-ikke') && !(t + x).includes('<')), s + ': intet fra adressen i teksten');
    assert.equal(side.printKnap.disabled, true, s + ': intet at printe');
    assert.deepEqual(side.ark.born, [], s);
  }
});

test('printFlere: en ret, der ikke kan hentes, står ikke med, og en linje siger det', async () => {
  svigter = new Set(['opskrifter/' + KENDTE[1] + '.json']);
  try {
    const { side, koer } = printSide('retter=' + KENDTE.slice(0, 3).join(','));
    await koer();
    const [advarsel, ...artikler] = side.ark.born;
    assert.equal(advarsel.tag, 'p');
    assert.match(tekstAf(advarsel), /^Én opskrift kunne ikke hentes og er ikke med\./);
    assert.deepEqual(artikler.map((a) => [a.ret, a.nr]), [[KENDTE[0], 0], [KENDTE[2], 1]]);
    // Kan ingen hentes, er det en fejlside, ikke et tomt print
    svigter = new Set(KENDTE.slice(0, 2).map((id) => 'opskrifter/' + id + '.json'));
    const anden = printSide('retter=' + KENDTE.slice(0, 2).join(','));
    await anden.koer();
    assert.equal(anden.beskeder.at(-1)[0], 'Opskrifterne kunne ikke hentes');
    assert.equal(anden.side.printKnap.disabled, true);
    // Uden index.json
    svigter = new Set(['opskrifter/index.json']);
    const tredje = printSide('alle');
    await tredje.koer();
    assert.equal(tredje.beskeder.at(-1)[0], 'Opskrifterne kunne ikke hentes');
  } finally {
    svigter = new Set();
  }
});

// Review F2 (15-11): Safari springer et link uden tabindex over med Tab, så «Tilbage» i printets værktøjslinje skal have det
test('print.html: «Tilbage» kan nås med Tab (tabindex="0")', () => {
  const html = fs.readFileSync(path.join(ROD, 'print.html'), 'utf8');
  const tilbage = html.match(/<a\b[^>]*\bid="tilbage"[^>]*>/);
  assert.ok(tilbage, 'print.html har linket #tilbage');
  assert.match(tilbage[0], /\btabindex="0"/);
});
