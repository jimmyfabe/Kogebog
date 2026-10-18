// test-e2e.js — går hele vejen i en rigtig browser (Playwright, WebKit = Safaris motor) på tre skærme:
// iPad på langs (1180×820, børnenes standard), iPhone (390×844) og desktop (1280×800).
// Forside → pandekager → alle trin (med en timer og voksen-hold) → færdig, alle trin i alle 5 retter,
// print-siden for alle 5 retter (også i printvisning på A4-bredde), tastatur, timere på tværs af skærme og genindlæsning,
// fejltilstande og «mindre bevægelse».
// Tjekker hele vejen: ingen konsolfejl, ingen 404, ingen vandret rulning, billeder indlæst, og knapper mindst
// 64 px for børnenes knapper (BOERNEKNAPPER) og 48 px for de voksnes (fx print og stop).
//
// Kræver en lokal server:  py -m http.server 8091 --bind 127.0.0.1 --directory D:/Claude/Kogebog
// Tungt — kør gennem låsen (Git Bash):
//   bash ~/.claude/tung-koersel.sh "kogebog: e2e" node test/test-e2e.js [http://127.0.0.1:8091] [mappe-til-skærmbilleder]
// Playwright er kun et testværktøj — det bruges aldrig i appen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hentPlaywright } from '../vaerktoej/lav-ikoner.js';
import { tilTale } from '../js/tekst.js';
import { formaterTid, HURTIG_SEK } from '../js/tid.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:8091').replace(/\/$/, '');
const UD = process.argv[3] || path.join(ROD, 'test-resultater');
fs.mkdirSync(UD, { recursive: true });

const { webkit } = hentPlaywright();
const SPAERRE = 420; // appen sluger tryk i 350 ms efter et skærmskift

const SKAERME = [
  { navn: 'ipad', viewport: { width: 1180, height: 820 }, hasTouch: true },
  { navn: 'iphone', viewport: { width: 390, height: 844 }, hasTouch: true },
  { navn: 'desktop', viewport: { width: 1280, height: 800 }, hasTouch: false },
];

const index = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).retter;
const RETTER = Object.fromEntries(index.map((id) => [id, JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'))]));

const vent = (ms) => new Promise((r) => setTimeout(r, ms));
let antalTjek = 0;
const fejl = [];
const maal = []; // målinger, der ikke er fejl (fx at man skal rulle på iPhone)
function tjek(betingelse, besked) {
  antalTjek++;
  if (!betingelse) { fejl.push(besked); console.log('  FEJL: ' + besked); }
}

// Falsk stemme, falsk Wake Lock og falsk WebAudio, så testen kan se, hvad appen gør
function forfalskninger() {
  const tale = [];
  const falsk = {
    speaking: false, pending: false, paused: false,
    getVoices: () => [{ name: 'Falsk engelsk', lang: 'en-US' }, { name: 'Falsk dansk', lang: 'da-DK' }],
    addEventListener() {}, removeEventListener() {}, resume() {}, pause() {},
    speak(u) { tale.push({ tekst: u.text, lang: u.lang, stemme: u.voice ? u.voice.lang : null }); setTimeout(() => { if (u.onend) u.onend(); }, 30); },
    cancel() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: falsk, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  window.__tale = tale;

  const laas = { anmodet: 0, sluppet: 0, aktive: 0 };
  window.__laas = laas;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async (type) => {
        laas.anmodet++; laas.aktive++;
        let sluppet = false;
        return { type, released: false, addEventListener() {}, release: async () => { if (!sluppet) { sluppet = true; laas.sluppet++; laas.aktive--; } } };
      },
    },
  });

  // Lyd som i Safari: kun et betroet tryk, der giver brugeraktivering efter HTML-standarden, åbner for lyd (her i 1 s).
  // Det er keydown, mousedown, touchend, pointerdown med mus og pointerup med finger — ikke pointerdown med finger.
  let aktivTil = 0;
  window.__tryk = [];
  const aktiverer = (e) => e.isTrusted && ((e.type === 'keydown' && e.key !== 'Escape') || e.type === 'mousedown' || e.type === 'touchend'
    || (e.type === 'pointerdown' && e.pointerType === 'mouse') || (e.type === 'pointerup' && e.pointerType !== 'mouse'));
  for (const type of ['keydown', 'mousedown', 'touchend', 'pointerdown', 'pointerup']) {
    window.addEventListener(type, (e) => {
      window.__tryk.push(type + (e.pointerType ? ':' + e.pointerType : ''));
      if (aktiverer(e)) aktivTil = performance.now() + 1000;
    }, true);
  }
  const aktiveret = () => performance.now() < aktivTil;
  window.__toner = 0;
  window.AudioContext = class {
    constructor() { this.state = aktiveret() ? 'running' : 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { if (aktiveret()) this.state = 'running'; return Promise.resolve(); }
    createOscillator() { const k = this; return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() { if (k.state === 'running') window.__toner++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
  delete window.webkitAudioContext;
}

async function nySide(browser, skaerm, ekstra = {}) {
  const ctx = await browser.newContext({ viewport: skaerm.viewport, hasTouch: skaerm.hasTouch, deviceScaleFactor: 1, locale: 'da-DK', ...ekstra });
  await ctx.addInitScript(forfalskninger);
  const side = await ctx.newPage();
  side.fejl = [];
  side.on('pageerror', (e) => side.fejl.push('pageerror: ' + e.message));
  side.on('console', (m) => { if (m.type() === 'error') side.fejl.push('console: ' + m.text()); });
  side.on('response', (r) => { if (r.status() >= 400) side.fejl.push('HTTP ' + r.status() + ': ' + r.url()); });
  side.on('requestfailed', (r) => side.fejl.push('requestfailed: ' + r.url() + ' (' + (r.failure() || {}).errorText + ')'));
  return { ctx, side };
}

// caret: 'initial': ellers lægger Playwright et <style> ind for at skjule markøren, og appens CSP (style-src 'self')
// afviser det med en konsolfejl, som testen så tager for en fejl i appen
const foto = (side, navn, ekstra = {}) => side.screenshot({ path: path.join(UD, navn + '.png'), caret: 'initial', ...ekstra });

// Børnenes egne knapper skal være mindst 64 px (de voksnes, fx print og stop, mindst 48 px)
const BOERNEKNAPPER = '.kort, .ingr, .start, .naeste, .tilbage, .laes-op, .timer-start, .stor-rund, .knap.primaer';
const SKAERMKNAPPER = '.handlinger .knap'; // skal kunne ses uden at rulle på iPad og desktop

// Ingen vandret rulning (heller ikke indhold, som body's overflow-x skjuler), knapper mindst 48/64 px, alle billeder indlæst
async function tjekLayout(side, hvor, { knapperSes = false } = {}) {
  const r = await side.evaluate(({ boern, skaermknapper }) => {
    const navn = (e) => (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName.toLowerCase());
    const smaa = [];
    const smaaBoern = [];
    for (const e of document.querySelectorAll('button, a[href], [role="button"]')) {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(e).visibility === 'hidden') continue;
      const mindst = Math.min(b.width, b.height);
      if (mindst < 48) smaa.push(navn(e) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
      else if (mindst < 63.5 && e.matches(boern) && e.closest('#app')) smaaBoern.push(navn(e) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
    }
    // Tekst og ikon i en knap skal have luft til kanten (U13: «Tilbage» stod 3 px fra kanten på iPhone)
    const traengt = [];
    for (const k of document.querySelectorAll('#app .knap')) {
      const b = k.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      for (const c of k.children) {
        const cs = getComputedStyle(c);
        if (cs.position === 'absolute' || cs.display === 'none' || c.classList.contains('hold-fyld')) continue;
        const r = c.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const luft = Math.min(r.left - b.left, b.right - r.right);
        if (luft < 6) traengt.push(navn(k) + ' (' + Math.round(luft) + ' px)');
      }
    }
    const W = window.innerWidth;
    const udenfor = [];
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('.konfetti, .sr-kun, svg, noscript')) continue;
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      if (b.right > W + 1 || b.left < -1) udenfor.push(navn(e) + ' ' + Math.round(b.left) + '…' + Math.round(b.right));
    }
    const H = window.innerHeight;
    const underKanten = [...document.querySelectorAll(skaermknapper)]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.height && b.bottom + window.scrollY > H + 1; })
      .map((e) => navn(e) + ' bund ' + Math.round(e.getBoundingClientRect().bottom + window.scrollY) + ' > ' + H);
    const billeder = [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src'));
    const udenAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src'));
    return { bred: document.documentElement.scrollWidth, vindue: W, udenfor: udenfor.slice(0, 6), smaa, smaaBoern, traengt, underKanten, billeder, udenAlt };
  }, { boern: BOERNEKNAPPER, skaermknapper: SKAERMKNAPPER });
  tjek(r.bred <= r.vindue, hvor + ': vandret rulning (' + r.bred + ' > ' + r.vindue + ')');
  tjek(!r.udenfor.length, hvor + ': indhold uden for skærmen i siden: ' + r.udenfor.join(', '));
  tjek(!r.smaa.length, hvor + ': knapper under 48 px: ' + r.smaa.join(', '));
  tjek(!r.smaaBoern.length, hvor + ': børneknapper under 64 px: ' + r.smaaBoern.join(', '));
  tjek(!r.traengt.length, hvor + ': tekst eller ikon under 6 px fra knappens kant: ' + r.traengt.join(', '));
  if (knapperSes) tjek(!r.underKanten.length, hvor + ': knapperne nederst kræver rulning: ' + r.underKanten.join(', '));
  else if (r.underKanten.length) maal.push(hvor + ': rul for at nå ' + r.underKanten.join(', '));
  tjek(!r.billeder.length, hvor + ': billeder ikke indlæst: ' + r.billeder.join(', '));
  tjek(!r.udenAlt.length, hvor + ': billeder uden alt: ' + r.udenAlt.join(', '));
}

// Verbum-billedet er firkantet i en rund ramme: enten ligger hele billedet inden for cirklen, eller rammen klipper det
async function tjekVerbum(side, hvor) {
  const r = await side.evaluate(() => {
    const ramme = document.querySelector('.verbum-ramme');
    const img = document.querySelector('.verbum-billede');
    if (!ramme || !img) return null;
    const rr = ramme.getBoundingClientRect();
    const b = img.getBoundingClientRect();
    const cx = rr.left + rr.width / 2;
    const cy = rr.top + rr.height / 2;
    const radius = rr.width / 2;
    const ude = Math.max(...[[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy) - radius));
    const cs = getComputedStyle(ramme);
    const klipper = ['hidden', 'clip'].includes(cs.overflowX) && ['hidden', 'clip'].includes(cs.overflowY) && parseFloat(cs.borderTopLeftRadius) > 0;
    return { ude: Math.round(ude), klipper };
  });
  if (!r) return;
  tjek(r.ude <= 1 || r.klipper, hvor + ': verbum-billedet stikker ' + r.ude + ' px ud over den runde ramme');
}

async function sidsteTale(side) {
  return side.evaluate(() => (window.__tale[window.__tale.length - 1] || {}).tekst || '');
}

// valg går videre til Playwrights click, fx { force: true } til en knap, der pulserer (Playwright venter ellers på,
// at den står stille, og det gør «Tiden er gået»-pillen aldrig)
// Mindste skriftstørrelse og laveste kontrast mod hvid blandt de synlige elementer, der matcher sel
async function skrift(side, sel) {
  return side.evaluate((sel) => {
    const lum = (farve) => {
      const [r, g, b] = farve.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let px = Infinity;
    let kontrast = Infinity;
    for (const e of document.querySelectorAll(sel)) {
      if (!e.getClientRects().length) continue;
      const cs = getComputedStyle(e);
      px = Math.min(px, parseFloat(cs.fontSize));
      kontrast = Math.min(kontrast, 1.05 / (lum(cs.color) + 0.05));
    }
    return { px, kontrast: Math.round(kontrast * 10) / 10 };
  }, sel);
}

async function tryk(side, sel, valg = {}) {
  await vent(SPAERRE);
  await side.locator(sel).first().click(valg);
}
const PULSERER = { force: true };

async function hold(side, sel, ms = 2300) {
  await vent(SPAERRE);
  const b = await side.locator(sel).first().boundingBox();
  await side.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await side.mouse.down();
  await vent(ms);
  await side.mouse.up();
}

async function venterPaa(side, fn, arg, hvor, ms = 6000) {
  try {
    await side.waitForFunction(fn, arg, { timeout: ms });
    return true;
  } catch (e) {
    tjek(false, hvor + ': ventede forgæves');
    return false;
  }
}

const h1 = (side) => side.locator('h1').first().textContent();

// Topbaren på et trin: hvor bred midten er, hvor fremskridtet står, og om «Trin x af y» er på én linje
async function topbarMaal(side) {
  return side.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    const midte = r('.topbar-midte');
    const frem = r('.fremskridt');
    const pille = document.querySelector('.topbar .pille:not([hidden])');
    const nr = document.querySelector('.trin-nr');
    const linjer = nr ? Math.round(nr.getBoundingClientRect().height / parseFloat(getComputedStyle(nr).lineHeight)) : 0;
    return {
      midte: midte ? Math.round(midte.width) : 0,
      fremX: frem ? Math.round(frem.left) : null,
      fremHoejre: frem ? Math.round(frem.right) : null,
      pilleVenstre: pille ? Math.round(pille.getBoundingClientRect().left) : null,
      linjer,
    };
  });
}

// ---------- Hele vejen med pandekager ----------
async function heleVejen(browser, skaerm) {
  const n = skaerm.navn;
  console.log('[' + n + '] forside → pandekager → færdig');
  const { ctx, side } = await nySide(browser, skaerm);
  await side.goto(BASE + '/index.html?hurtig=1');
  await side.waitForSelector('.kort[data-ret]');
  tjek(await side.locator('.kort[data-ret]').count() === index.length, n + ': forsiden skal have ' + index.length + ' kort');
  await tjekLayout(side, n + ' forside');
  // Kortene i samme række er lige høje (før var «Kødsovs med spaghetti» højere end naboerne)
  const raekker = await side.evaluate(() => {
    const r = {};
    for (const k of document.querySelectorAll('.kort[data-ret]')) {
      const b = k.getBoundingClientRect();
      (r[Math.round(b.top)] = r[Math.round(b.top)] || []).push(Math.round(b.height));
    }
    return Object.values(r);
  });
  tjek(raekker.every((h) => Math.max(...h) - Math.min(...h) <= 1), n + ': kortene i en række skal være lige høje: ' + JSON.stringify(raekker));
  if (n === 'desktop') {
    // U16: med mus skal et kort ændre sig, når musen står over det
    const skygge = () => side.evaluate(() => getComputedStyle(document.querySelector('.kort[data-ret="frikadeller"]')).boxShadow);
    const foer = await skygge();
    await side.hover('.kort[data-ret="frikadeller"]');
    await vent(200);
    const over = await skygge();
    await side.mouse.move(0, 0);
    await vent(200);
    tjek(foer !== over, n + ': et kort skal ændre sig, når musen står over det (skygge ' + foer + ')');
  }
  await foto(side, n + '-1-forside');

  // Første tryk siger navnet, andet åbner
  await tryk(side, '.kort[data-ret="pandekager"]');
  tjek(await side.locator('.kort.valgt[data-ret="pandekager"]').count() === 1, n + ': første tryk skal markere kortet');
  // U14: den farvede cirkel bag billedet må ikke forsvinde i det gule, valgte kort (før var de samme farve)
  await vent(300); // kortets baggrund skifter med en overgang på .15 s
  const cirkel = await side.evaluate(() => {
    const lum = (farve) => {
      const [r, g, b] = farve.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const kort = document.querySelector('.kort.valgt');
    const cs = getComputedStyle(kort.querySelector('.kort-billede'));
    const [a, b] = [lum(cs.backgroundColor), lum(getComputedStyle(kort).backgroundColor)];
    return { kontrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), kant: cs.boxShadow.includes('inset') || parseFloat(cs.borderTopWidth) >= 2 };
  });
  tjek(cirkel.kontrast >= 1.5 || cirkel.kant, n + ': cirklen bag billedet skal kunne ses på det valgte kort (kontrast ' + cirkel.kontrast.toFixed(2) + ', ingen kant)');
  tjek((await sidsteTale(side)).startsWith('Pandekager'), n + ': første tryk skal sige navnet');
  const stemme = await side.evaluate(() => window.__tale[window.__tale.length - 1]);
  tjek(stemme.lang === 'da-DK' && stemme.stemme === 'da-DK', n + ': oplæsning skal være da-DK med den danske stemme, fik ' + JSON.stringify(stemme));
  if (n === 'ipad') await foto(side, n + '-2-forside-valgt');
  await tryk(side, '.kort[data-ret="pandekager"]');
  await side.waitForSelector('.ret h1');
  tjek(await h1(side) === 'Pandekager', n + ': retten skal hedde Pandekager');
  tjek(await side.locator('.ingr').count() === RETTER.pandekager.recipeIngredient.length, n + ': alle ingredienser skal vises');
  await tjekLayout(side, n + ' ret', { knapperSes: n !== 'iphone' });
  if (n === 'desktop') {
    const skygge = () => side.evaluate(() => getComputedStyle(document.querySelector('.ret .start')).boxShadow);
    const foer = await skygge();
    await side.hover('.ret .start');
    await vent(200);
    const over = await skygge();
    await side.mouse.move(0, 0);
    await vent(200);
    tjek(foer !== over, n + ' ret: Start skal ændre sig, når musen står over den (skygge ' + foer + ')');
  }
  // U15: den voksne skal kunne læse ingredienserne på armslængde
  const navne = await skrift(side, '.ingr-navn');
  tjek(navne.px >= 18 && navne.kontrast >= 10, n + ' ret: ingrediensnavnene skal være mindst 18 px og mørke (' + navne.px + ' px, kontrast ' + navne.kontrast + ':1)');
  if (n === 'ipad') {
    const ikonBredde = await side.evaluate(() => document.querySelector('.ingr-ikon').getBoundingClientRect().width);
    tjek(ikonBredde >= 72, n + ' ret: ingrediensikonerne skal være mindst 72 px (' + Math.round(ikonBredde) + ')');
  }
  await foto(side, n + '-3-ret');
  await tryk(side, '.ingr');
  tjek(await sidsteTale(side) === tilTale(RETTER.pandekager.recipeIngredient[0]), n + ': tryk på en ingrediens læser den op');

  // Trinene
  await tryk(side, '.start');
  const trin = RETTER.pandekager.recipeInstructions;
  let fremUdenTimer = null; // fremskridtets x på trin 8 (før timeren): det må ikke flytte sig, når pillen kommer
  for (let i = 0; i < trin.length; i++) {
    const nr = i + 1;
    const t = trin[i];
    await side.waitForFunction((x) => location.hash === '#/ret/pandekager/trin/' + x, nr, { timeout: 5000 }).catch(() => {});
    tjek(await h1(side) === t.text, n + ' trin ' + nr + ': teksten skal være «' + t.text + '», var «' + (await h1(side)) + '»');
    const voksen = t.tumbi.voksen === true;
    tjek(await sidsteTale(side) === tilTale((voksen ? 'Hent en voksen. ' : '') + t.text), n + ' trin ' + nr + ': trykket læser trinnet op');
    tjek((await side.locator('.voksen-maerke').count() === 1) === voksen, n + ' trin ' + nr + ': «Hent en voksen» skal ' + (voksen ? '' : 'ikke ') + 'vises');
    // Tilbage og Næste skal kunne ses uden at rulle på alle skærme, også iPhone (på retten må man rulle til Start)
    await tjekLayout(side, n + ' trin ' + nr, { knapperSes: true });
    if ([1, 3, 10, 12].includes(nr)) await foto(side, n + '-4-trin-' + nr);
    if (nr === 8) fremUdenTimer = (await topbarMaal(side)).fremX;

    if (t.tumbi.timer_sek && nr === 9) {
      // Timeren: start, gå videre, se pillen, vent på slut, gå tilbage, kvittér
      tjek((await side.locator('.timer-start').textContent()).includes(formaterTid(HURTIG_SEK)), n + ': ?hurtig=1 skal give en timer på ' + formaterTid(HURTIG_SEK));
      await tryk(side, '.timer-start');
      tjek(await side.locator('.timer-ring').isVisible(), n + ': timer-ringen skal vises');
      tjek(await side.evaluate(() => window.__laas.anmodet) === 1, n + ': timeren skal holde skærmen tændt (wakeLock)');
      if (n === 'ipad') await foto(side, n + '-5-timer');
      await tryk(side, '.naeste');
      await side.waitForFunction(() => location.hash.endsWith('/trin/10'));
      tjek(await side.locator('.pille:not([hidden])').count() === 1, n + ': timer-pillen skal vises på næste trin');
      const fremKoerer = (await topbarMaal(side)).fremX;
      await venterPaa(side, () => !!document.querySelector('.pille.faerdig'), null, n + ': pillen skal vise, at tiden er gået');
      const lyd = await side.evaluate(() => ({ toner: window.__toner, laas: window.__laas }));
      tjek(lyd.toner >= 3, n + ': der skal spilles tre toner ved slut (fik ' + lyd.toner + ')');
      tjek(lyd.laas.sluppet === 1 && lyd.laas.aktive === 0, n + ': wakeLock skal slippes, når timeren er slut ' + JSON.stringify(lyd.laas));
      // «Tiden er gået» i topbaren må ikke klemme fremskridtet (iPhone: midten var 61 px, og stregerne lå under pillen)
      const top = await topbarMaal(side);
      tjek(top.midte >= 140, n + ': topbarens midte med en færdig timer er kun ' + top.midte + ' px bred');
      tjek(top.pilleVenstre !== null && top.fremHoejre <= top.pilleVenstre, n + ': fremskridtet løber ind under pillen (' + top.fremHoejre + ' > ' + top.pilleVenstre + ')');
      tjek(top.linjer === 1, n + ': «Trin 10 af 12» skal stå på én linje med en færdig timer (' + top.linjer + ' linjer)');
      // Fremskridtet må ikke hoppe vandret efter pillens bredde (iPad: x 320 → 248 → 200). iPhone har ikke plads til at stå stille.
      const xer = [fremUdenTimer, fremKoerer, top.fremX];
      if (n === 'iphone') maal.push(n + ': fremskridtets x uden timer, med timer og færdig: ' + xer.join(', '));
      else tjek(Math.max(...xer) - Math.min(...xer) <= 1, n + ': fremskridtet flytter sig, når timer-pillen kommer (x uden timer, med timer og færdig: ' + xer.join(', ') + ')');
      await foto(side, n + '-6-pille-faerdig');
      await tryk(side, '.pille', PULSERER);
      await side.waitForFunction(() => location.hash.endsWith('/trin/9'));
      tjek(await side.locator('.timer.faerdig').count() === 1, n + ': trinnet skal vise, at tiden er gået');
      await tryk(side, '.timer.faerdig .knap.primaer');
      tjek(await side.locator('.timer-start').count() === 1, n + ': «Ok» slår timeren fra');
      tjek(await side.locator('.pille:not([hidden])').count() === 0, n + ': pillen forsvinder efter «Ok»');
      const gemt = await side.evaluate(() => JSON.parse(localStorage.getItem('kog-v1')));
      tjek(gemt && gemt.v === 1 && gemt.timer === null && Object.keys(gemt).sort().join() === 'sidste,timer,v', n + ': localStorage «kog-v1» skal kun have v, sidste og timer: ' + JSON.stringify(gemt));
    }

    if (nr === trin.length) {
      tjek((await side.locator('.naeste').textContent()).includes('Færdig'), n + ': sidste trin har «Færdig»');
      await tryk(side, '.naeste');
    } else if (voksen) {
      // Et kort tryk må ikke komme forbi en voksen-opgave
      const skygge = () => side.locator('.naeste').first().evaluate((b) => getComputedStyle(b).boxShadow);
      const skyggeFoer = await skygge();
      await tryk(side, '.naeste');
      await vent(150);
      tjek(side.url().endsWith('/trin/' + nr), n + ' trin ' + nr + ': et kort tryk må ikke gå videre ved voksen-hjælp');
      tjek((await sidsteTale(side)).startsWith('Hent en voksen'), n + ' trin ' + nr + ': et kort tryk siger «Hent en voksen»');
      // … og det skal kunne ses: knappen får en ring (før var skærmen den samme før og efter trykket)
      tjek(await skygge() !== skyggeFoer, n + ' trin ' + nr + ': et kort tryk på «Næste» skal kunne ses (knappen ændrede sig ikke)');
      // Trin 11 holdes i 3 s: klikket ved slip kommer efter appens spærre, så kun blokerTilSlip (hold.js) kan sluge det
      await hold(side, '.naeste', nr === 11 ? 3000 : 2300);
      if (nr === 11) {
        await vent(300);
        tjek(side.url().endsWith('/trin/12'), n + ' trin 11: et hold på 3 s må kun gå ét trin frem (adressen er ' + side.url() + ')');
      }
    } else {
      await tryk(side, '.naeste');
    }
  }
  await side.waitForSelector('.faerdig h1');
  tjek(await h1(side) === 'Færdig!', n + ': færdig-skærmen');
  tjek((await sidsteTale(side)).startsWith('Færdig!'), n + ': færdig-skærmen siger «Færdig!»');
  await tjekLayout(side, n + ' færdig');
  await vent(2800); // konfettien er landet
  // Konfettien må ikke ligge oven på tekst og knapper: hvor de overlapper, skal teksten være øverst.
  // pointer-events slås til på stykkerne (kun her), så elementFromPoint kan se, hvad der er tegnet øverst.
  const daekket = await side.evaluate(() => {
    const stykker = [...document.querySelectorAll('.konfetti span')];
    for (const s of stykker) s.style.pointerEvents = 'auto';
    const ud = [];
    for (const m of document.querySelectorAll('.faerdig h1, .faerdig-tekst, .faerdig .knap')) {
      const a = m.getBoundingClientRect();
      for (const s of stykker) {
        const b = s.getBoundingClientRect();
        const x1 = Math.max(a.left, b.left); const x2 = Math.min(a.right, b.right);
        const y1 = Math.max(a.top, b.top); const y2 = Math.min(a.bottom, b.bottom);
        if (x2 - x1 < 2 || y2 - y1 < 2) continue;
        const oeverst = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
        if (oeverst === s) ud.push((m.className || m.tagName.toLowerCase()) + ' ved ' + Math.round(x1) + ',' + Math.round(y1));
      }
    }
    for (const s of stykker) s.style.pointerEvents = '';
    return ud;
  });
  tjek(!daekket.length, n + ': konfetti ligger oven på teksten på færdig-skærmen: ' + daekket.join(', '));
  await foto(side, n + '-7-faerdig');
  await tryk(side, '.faerdig .knap.primaer');
  await side.waitForSelector('.forside .kort');
  tjek(side.fejl.length === 0, n + ' (hele vejen): ' + side.fejl.join(' | '));

  // Alle trin i alle retter (direkte adresse)
  console.log('[' + n + '] alle trin i alle ' + index.length + ' retter');
  for (const id of index) {
    await side.evaluate((h) => { location.hash = h; }, '#/ret/' + id);
    await side.waitForFunction((x) => document.querySelector('.ret h1') && document.querySelector('.ret h1').textContent === x, RETTER[id].name);
    await tjekLayout(side, n + ' ' + id + ' ret', { knapperSes: n !== 'iphone' });
    if (n !== 'ipad' && id === 'koedsovs') await foto(side, n + '-8-ret-koedsovs');
    for (let i = 0; i < RETTER[id].recipeInstructions.length; i++) {
      const t = RETTER[id].recipeInstructions[i];
      await side.evaluate((h) => { location.hash = h; }, '#/ret/' + id + '/trin/' + (i + 1));
      await side.waitForFunction((x) => document.querySelector('.trin h1') && document.querySelector('.trin h1').textContent === x, t.text, { timeout: 5000 })
        .catch(() => tjek(false, n + ' ' + id + ' trin ' + (i + 1) + ': viste ikke «' + t.text + '»'));
      await tjekLayout(side, n + ' ' + id + ' trin ' + (i + 1), { knapperSes: true });
      await tjekVerbum(side, n + ' ' + id + ' trin ' + (i + 1));
      if (n === 'iphone' && id === 'chorizo-pasta' && i === 10) await foto(side, n + '-9-chorizo-trin-11');
      if (n === 'ipad' && id === 'boller' && i === 6) await foto(side, n + '-9-boller-trin-7');
    }
  }
  tjek(side.fejl.length === 0, n + ' (alle retter): ' + side.fejl.join(' | '));

  // Service workeren må kun lave «kog-»-caches
  if (n === 'ipad') {
    const sw = await side.evaluate(async () => {
      if (!('serviceWorker' in navigator) || !window.caches) return { mangler: true };
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
      for (let i = 0; i < 40; i++) {
        const k = await caches.keys();
        if (k.length) {
          const c = await caches.open(k[0]);
          return { scope: reg && reg.scope, noegler: k, filer: (await c.keys()).length };
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      return { scope: reg && reg.scope, noegler: [], filer: 0 };
    });
    if (sw.mangler) maal.push(n + ': denne WebKit har ingen service worker/Cache API — sw.js er kun testet i node (test-sw.js)');
    else {
      tjek(sw.scope === BASE + '/', n + ': service workerens scope skal være appens mappe, var ' + sw.scope);
      tjek(sw.noegler.length === 1 && sw.noegler[0].startsWith('kog-'), n + ': kun én cache, og den starter med «kog-»: ' + sw.noegler.join(', '));
      tjek(sw.filer > 60, n + ': service workeren skal have gemt appens filer (fik ' + sw.filer + ')');
    }
  }
  await ctx.close();
}

// Trin-ikonerne på print-siden: står de i én lige kolonne, og er der plads til nummeret foran?
async function trinKolonne(side) {
  return side.evaluate(() => {
    const x = [...document.querySelectorAll('ol.trin > li')].map((li) => li.querySelector('.trin-ikon').getBoundingClientRect().left - li.getBoundingClientRect().left);
    return { spredning: Math.round(Math.max(...x) - Math.min(...x)), foran: Math.round(Math.min(...x)) };
  });
}

// ---------- Print ----------
async function print(browser, skaerm) {
  const n = skaerm.navn;
  console.log('[' + n + '] print af alle ' + index.length + ' retter');
  const { ctx, side } = await nySide(browser, skaerm);
  for (const id of index) {
    const r = RETTER[id];
    await side.goto(BASE + '/print.html?ret=' + id);
    await side.waitForSelector('ol.trin li');
    tjek(await h1(side) === r.name, n + ' print ' + id + ': titlen');
    tjek(await side.locator('ol.trin > li').count() === r.recipeInstructions.length, n + ' print ' + id + ': alle trin');
    tjek(await side.locator('ul.tjek > li').count() === r.recipeIngredient.length, n + ' print ' + id + ': alle ingredienser');
    tjek(await side.locator('ol.trin img.trin-ikon').count() === r.recipeInstructions.length, n + ' print ' + id + ': et verbum-ikon pr. trin');
    const voksen = r.recipeInstructions.filter((t) => t.tumbi.voksen === true).length;
    tjek(await side.locator('ol.trin > li.voksen').count() === voksen, n + ' print ' + id + ': voksen-trinene er mærket');
    tjek((await side.locator('.fod').textContent()).includes('Tjek selv pakkerne for allergener'), n + ' print ' + id + ': allergen-linjen');
    tjek((await side.locator('.ikke-afproevet').count() === 1) === !r.tumbi.afproevet, n + ' print ' + id + ': «Ikke afprøvet»');
    await tjekLayout(side, n + ' print ' + id);
    const smaat = await skrift(side, '.note, .maerke, .fod');
    tjek(smaat.px >= 15, n + ' print ' + id + ': noter, mærker og fod skal være mindst 15 px på skærmen (' + smaat.px + ' px)');
    const kol = await trinKolonne(side);
    tjek(kol.spredning <= 1, n + ' print ' + id + ': trin-ikonerne skal stå i én lige kolonne (de rykker ' + kol.spredning + ' px)');
    tjek(kol.foran >= 18, n + ' print ' + id + ': trinnummeret skal have plads foran ikonet (' + kol.foran + ' px)');
    if (n === 'desktop') {
      // Printvisning på A4-bredde: 210 mm minus 2 × 14 mm margen = 182 mm ≈ 688 px
      await side.setViewportSize({ width: 688, height: 1000 });
      await side.emulateMedia({ media: 'print' });
      const kp = await trinKolonne(side);
      tjek(kp.spredning <= 1, 'printvisning ' + id + ': trin-ikonerne skal stå i én lige kolonne (de rykker ' + kp.spredning + ' px)');
      tjek(kp.foran >= 14, 'printvisning ' + id + ': trinnummeret skal have plads foran ikonet (' + kp.foran + ' px)');
      await foto(side, 'print-' + id, { fullPage: true });
      const a4 = await side.evaluate(() => document.documentElement.scrollHeight);
      console.log('  print ' + id + ': ' + a4 + ' px høj i printvisning (688 px bred)');
      await side.emulateMedia({ media: 'screen' });
      await side.setViewportSize(skaerm.viewport);
    } else if (id === 'boller') {
      await foto(side, n + '-print-boller');
    }
  }
  tjek(side.fejl.length === 0, n + ' (print): ' + side.fejl.join(' | '));

  // Print-knappen på retten skal holdes inde
  if (n === 'desktop') {
    await side.goto(BASE + '/index.html#/ret/boller');
    await side.waitForSelector('.print-knap');
    await tryk(side, '.print-knap');
    await vent(200);
    tjek(!side.url().includes('print.html'), n + ': et kort tryk på print må ikke åbne printet');
    await hold(side, '.print-knap');
    await side.waitForURL(/print\.html\?ret=boller$/, { timeout: 5000 }).catch(() => tjek(false, n + ': hold på print skal åbne print.html?ret=boller'));
  }
  await ctx.close();
}

// ---------- Tastatur (desktop) ----------
async function tastatur(browser, skaerm) {
  console.log('[' + skaerm.navn + '] tastatur');
  const { ctx, side } = await nySide(browser, skaerm);
  await side.goto(BASE + '/index.html?hurtig=1');
  await side.waitForSelector('.kort[data-ret]');
  let fundet = false;
  for (let i = 0; i < 6 && !fundet; i++) {
    await side.keyboard.press('Tab');
    fundet = await side.evaluate(() => document.activeElement && document.activeElement.classList.contains('kort'));
  }
  tjek(fundet, 'tastatur: Tab skal nå det første kort');
  const ring = await side.evaluate(() => { const s = getComputedStyle(document.activeElement); return { stil: s.outlineStyle, bredde: parseFloat(s.outlineWidth) }; });
  tjek(ring.stil !== 'none' && ring.bredde >= 3, 'tastatur: fokus skal kunne ses (outline ' + JSON.stringify(ring) + ')');
  await foto(side, 'desktop-tastatur-fokus');
  // Forsiden tegnes igen, når opskrifterne er hentet, og appen sluger tryk i 350 ms efter hver tegning:
  // uden pausen her blev første Enter slugt, og andet Enter markerede kun kortet
  await vent(SPAERRE);
  await side.keyboard.press('Enter');
  tjek(await side.locator('.kort.valgt').count() === 1, 'tastatur: første Enter skal markere kortet');
  await vent(SPAERRE);
  await side.keyboard.press('Enter');
  await side.waitForSelector('.ret h1', { timeout: 5000 });
  await side.focus('.start');
  await vent(SPAERRE);
  await side.keyboard.press('Enter');
  await side.waitForFunction(() => location.hash.endsWith('/trin/1'));
  await vent(SPAERRE);
  await side.keyboard.press('ArrowRight');
  await side.waitForFunction(() => location.hash.endsWith('/trin/2')).catch(() => tjek(false, 'tastatur: pil til højre skal gå et trin frem'));
  await vent(SPAERRE);
  await side.keyboard.press('ArrowLeft');
  await side.waitForFunction(() => location.hash.endsWith('/trin/1')).catch(() => tjek(false, 'tastatur: pil til venstre skal gå et trin tilbage'));
  const foer = await side.evaluate(() => window.__tale.length);
  await side.keyboard.press(' ');
  tjek(await side.evaluate(() => window.__tale.length) === foer + 1, 'tastatur: mellemrum læser trinnet op');
  await vent(SPAERRE);
  await side.keyboard.press('ArrowRight');
  await side.waitForFunction(() => location.hash.endsWith('/trin/2'));
  // «Fortsæt» husker trinnet
  await side.evaluate(() => { location.hash = '#/ret/pandekager'; });
  await side.waitForSelector('.ret h1');
  tjek((await side.locator('.fortsaet').textContent().catch(() => '')).includes('trin 2'), 'Fortsæt ved trin 2 skal vises');
  // U17: «Fortsæt» er den store knap, og den anden siger, at den starter forfra
  tjek(await side.locator('.handlinger .knap.primaer').count() === 1 && await side.locator('.fortsaet.primaer').count() === 1, 'Fortsæt skal være den eneste store knap');
  tjek((await side.locator('.start').textContent().catch(() => '')).trim() === 'Start forfra', 'knappen ved siden af Fortsæt skal hedde «Start forfra»');
  await tjekLayout(side, 'tastatur ret med Fortsæt', { knapperSes: true });
  await foto(side, 'desktop-ret-fortsaet');
  // Hold med tastaturet: mellemrum i 2 sekunder på et voksen-trin
  await side.evaluate(() => { location.hash = '#/ret/pandekager/trin/10'; });
  await side.waitForSelector('.voksen-hold');
  await side.focus('.voksen-hold');
  await side.evaluate(() => { window.__gentagelser = 0; document.addEventListener('keydown', (e) => { if (e.repeat) window.__gentagelser++; }, true); });
  await side.keyboard.down(' ');
  await vent(2300);
  await side.waitForFunction(() => location.hash.endsWith('/trin/11')).catch(() => tjek(false, 'tastatur: hold mellemrum i 2 s skal gå videre fra et voksen-trin'));
  // Tasten er stadig nede: tastaturets gentagelser må ikke læse det nye trin op igen og igen
  const foerGentag = await side.evaluate(() => window.__tale.length);
  for (let i = 0; i < 5; i++) { await side.keyboard.down(' '); await vent(40); }
  const gentag = await side.evaluate(() => ({ tale: window.__tale.length, gentagelser: window.__gentagelser }));
  tjek(gentag.gentagelser >= 5, 'tastatur: testen skal sende gentagne tastetryk (repeat), sendte ' + gentag.gentagelser);
  tjek(gentag.tale === foerGentag, 'tastatur: mellemrum holdt inde efter et hold må ikke læse trinnet op igen (' + (gentag.tale - foerGentag) + ' gange)');
  await side.keyboard.up(' ');
  tjek(side.fejl.length === 0, 'tastatur: ' + side.fejl.join(' | '));
  await ctx.close();
}

// ---------- Timere på tværs af skærme og genindlæsning ----------
const gemTimer = (side, timer) => side.evaluate((t) => {
  const nu = Date.now();
  localStorage.setItem('kog-v1', JSON.stringify({ v: 1, sidste: null, timer: { ret: t.ret, nr: t.nr, sek: t.sek, start: nu + t.slutOm - t.sek * 1000, slut: nu + t.slutOm } }));
  location.hash = '#/';
}, timer);

async function timere(browser, skaerm) {
  const n = skaerm.navn;
  console.log('[' + n + '] timere: to timere, forsiden, genindlæsning');
  const { ctx, side } = await nySide(browser, skaerm);

  // 1) Kødsovs: trin 8 (20 min) kører, og man trykker «Start timer» på trin 10. Den første timer må ikke forsvinde.
  await side.goto(BASE + '/index.html#/ret/koedsovs/trin/8');
  await side.waitForSelector('.timer-start');
  await tryk(side, '.timer-start');
  await side.evaluate(() => { location.hash = '#/ret/koedsovs/trin/10'; });
  await side.waitForFunction(() => location.hash.endsWith('/trin/10') && !!document.querySelector('.timer-start'));
  // Knappen har aria-disabled="true", men kan stadig trykkes (den siger, hvor timeren kører). Playwright venter
  // ellers for evigt på, at en aria-disabled knap bliver «enabled».
  tjek(await side.locator('.timer-start').getAttribute('aria-disabled') === 'true', n + ': «Start timer» på trin 10 skal være aria-disabled, mens trin 8 kører');
  await tryk(side, '.timer-start', { force: true });
  const gemt = await side.evaluate(() => JSON.parse(localStorage.getItem('kog-v1')).timer);
  tjek(gemt && gemt.nr === 8, n + ': «Start timer» på trin 10 må ikke slette timeren på trin 8 (gemt: ' + JSON.stringify(gemt) + ')');
  const sagt = await sidsteTale(side);
  tjek(sagt.includes('trin 8'), n + ': trykket skal sige, at der kører en timer på trin 8 (sagde «' + sagt + '»)');
  tjek((await side.locator('.timer').first().textContent()).includes('trin 8'), n + ': trin 10 skal vise, at timeren på trin 8 kører');
  await tjekLayout(side, n + ' trin 10 med timer på trin 8', { knapperSes: true });
  await foto(side, n + '-timer-optaget');

  // 2) Forsiden viser timeren, og pillen fører til trinnet
  await tryk(side, 'button[aria-label="Til forsiden"]');
  await side.waitForSelector('.forside .kort');
  const pilleForside = await side.locator('.pille:not([hidden])').count();
  tjek(pilleForside === 1, n + ': forsiden skal vise timeren, der kører');
  await tjekLayout(side, n + ' forside med timer');
  await foto(side, n + '-forside-timer');
  if (pilleForside === 1) {
    await tryk(side, '.pille');
    await side.waitForFunction(() => location.hash === '#/ret/koedsovs/trin/8').catch(() => tjek(false, n + ': pillen på forsiden skal føre til trin 8'));
  } else {
    await side.evaluate(() => { location.hash = '#/ret/koedsovs/trin/8'; });
  }
  await side.waitForFunction(() => location.hash === '#/ret/koedsovs/trin/8');
  tjek(await side.locator('button[aria-label="Stop timeren"]').count() === 1, n + ': trin 8 skal stadig have sin timer (med «Stop»)');

  // 3) Timeren løb ud, mens fanen var væk (iOS smed den ud): efter genindlæsningen skal «Tiden er gået» stå på forsiden
  await gemTimer(side, { ret: 'koedsovs', nr: 8, sek: 1200, slutOm: -60000 });
  await side.reload();
  await side.waitForSelector('.forside .kort');
  const udloebet = side.locator('.pille.faerdig:not([hidden])');
  const udloebetVist = await udloebet.count() === 1 && (await udloebet.textContent()).includes('Tiden er gået');
  tjek(udloebetVist, n + ': en timer, der løb ud under genindlæsningen, skal vise «Tiden er gået» på forsiden');
  await foto(side, n + '-forside-udloebet');
  if (udloebetVist) {
    await tryk(side, '.pille', PULSERER);
    await side.waitForSelector('.timer.faerdig', { timeout: 5000 }).catch(() => tjek(false, n + ': trin 8 skal vise, at tiden er gået'));
    await tryk(side, '.timer.faerdig .knap.primaer');
    tjek(await side.evaluate(() => JSON.parse(localStorage.getItem('kog-v1')).timer) === null, n + ': «Ok» sletter den udløbne timer');
  }

  // 4) Lyden efter en genindlæsning: ét tryk med fingeren (pointerdown med finger tæller ikke som et tryk i Safari)
  await gemTimer(side, { ret: 'koedsovs', nr: 8, sek: 1200, slutOm: 5000 });
  await side.reload();
  await side.waitForSelector('.forside .kort');
  await side.tap('.forside-titel h1');
  const bip = await venterPaa(side, () => window.__toner >= 3, null, n + ': efter genindlæsning og ét tryk med fingeren skal der komme tre toner, når tiden er gået', 12000);
  if (!bip) maal.push(n + ': hændelser ved trykket: ' + (await side.evaluate(() => window.__tryk.join(', '))));
  tjek(side.fejl.length === 0, n + ' (timere): ' + side.fejl.join(' | '));
  await ctx.close();
}

// ---------- Fejltilstande og mindre bevægelse ----------
async function fejltilstande(browser, skaerm) {
  console.log('[' + skaerm.navn + '] fejltilstande');
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await side.route('**/opskrifter/index.json', (r) => r.abort());
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('text=Opskrifterne kunne ikke hentes');
  tjek(await side.locator('button:has-text("Prøv igen")').count() === 1, 'fejl: «Prøv igen» skal vises, når listen ikke kan hentes');
  await tjekLayout(side, 'fejl forside');
  await foto(side, skaerm.navn + '-fejl-forside');
  await side.unroute('**/opskrifter/index.json');
  await tryk(side, 'button:has-text("Prøv igen")');
  await side.waitForSelector('.kort[data-ret]').catch(() => tjek(false, 'fejl: «Prøv igen» skal hente opskrifterne'));

  // U18: en tom liste taler til forælderen, ikke til udvikleren
  await side.route('**/opskrifter/index.json', (r) => r.fulfill({ contentType: 'application/json', body: '{"version":1,"retter":[]}' }));
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('text=Der er ingen opskrifter endnu').catch(() => tjek(false, 'tom: en tom liste skal sige «Der er ingen opskrifter endnu»'));
  const tomTekst = await side.locator('.status-boks').textContent().catch(() => '');
  tjek(!/index\.json|mappen/.test(tomTekst), 'tom: teksten må ikke handle om filer og mapper: ' + tomTekst);
  tjek(await side.locator('button:has-text("Hent opskrifterne igen")').count() === 1, 'tom: «Hent opskrifterne igen» skal vises');
  await tjekLayout(side, 'tom forside');
  await foto(side, skaerm.navn + '-tom-forside');
  await side.unroute('**/opskrifter/index.json');
  await tryk(side, 'button:has-text("Hent opskrifterne igen")');
  await side.waitForSelector('.kort[data-ret]').catch(() => tjek(false, 'tom: «Hent opskrifterne igen» skal hente listen'));

  await side.evaluate(() => { location.hash = '#/ret/findes-ikke'; });
  await side.waitForSelector('text=Den opskrift findes ikke').catch(() => tjek(false, 'fejl: ukendt ret skal give «Den opskrift findes ikke»'));
  await side.evaluate(() => { location.hash = '#/ret/pandekager/trin/99'; });
  await side.waitForSelector('text=Den opskrift findes ikke').catch(() => tjek(false, 'fejl: trin 99 skal give en fejlside'));
  await side.goto(BASE + '/print.html');
  await side.waitForSelector('text=Der mangler en opskrift').catch(() => tjek(false, 'fejl: print uden ret'));
  await side.goto(BASE + '/print.html?ret=findes-ikke');
  await side.waitForSelector('text=Den opskrift findes ikke').catch(() => tjek(false, 'fejl: print af ukendt ret'));
  const uventede = side.fejl.filter((f) => !/findes-ikke\.json|opskrifter\/index\.json|Failed to load resource|404/.test(f));
  tjek(uventede.length === 0, 'fejltilstande: ' + uventede.join(' | '));
  await ctx.close();

  const r = await nySide(browser, skaerm, { reducedMotion: 'reduce' });
  await r.side.goto(BASE + '/index.html#/ret/pandekager/trin/6');
  await r.side.waitForSelector('.verbum-billede');
  const anim = await r.side.evaluate(() => getComputedStyle(document.querySelector('.verbum-billede')).animationName);
  tjek(anim === 'none', 'mindre bevægelse: verbum-billedet må ikke bevæge sig (animation ' + anim + ')');
  await r.ctx.close();
}

// ---------- Berøring: fingeren på en hold-knap (K10) ----------
// Playwright kan ikke holde en finger nede, så fingeren er syntetiske PointerEvents med pointerType 'touch'.
// Tjekker de tre linjer i hold.js, som kun berøring bruger: contextmenu, pointercancel på knappen og på document.
async function beroering(browser, skaerm) {
  const n = skaerm.navn + ' berøring';
  console.log('[' + skaerm.navn + '] berøring');
  const { ctx, side } = await nySide(browser, skaerm);
  const finger = (type, hvor = '.voksen-hold') => side.evaluate(({ type, hvor }) => {
    const e = hvor === 'document' ? document : document.querySelector(hvor);
    const r = e === document ? { left: 0, top: 0, width: 0, height: 0 } : e.getBoundingClientRect();
    e.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, isPrimary: true, button: 0, bubbles: true, cancelable: true,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  }, { type, hvor });
  const adresse = () => side.evaluate(() => location.hash);
  const tilTrin10 = async () => {
    await side.evaluate(() => { location.hash = '#/ret/pandekager/trin/10'; });
    await side.waitForFunction(() => location.hash.endsWith('/trin/10') && !!document.querySelector('.voksen-hold'));
    await vent(SPAERRE);
  };
  await side.goto(BASE + '/index.html?hurtig=1#/ret/pandekager/trin/10');
  await side.waitForSelector('.voksen-hold');
  await vent(SPAERRE);

  // 1. Et langt tryk må ikke åbne iPad'ens menu over knappen
  const menuAaben = await side.evaluate(() => document.querySelector('.voksen-hold').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  tjek(menuAaben === false, n + ': contextmenu på hold-knappen skal afvises (ellers åbner et langt tryk en menu)');

  // 2. Et kort tryk med fingeren går ikke videre, men knappen viser, at den skal holdes
  await finger('pointerdown');
  await vent(300);
  await finger('pointerup');
  await vent(200);
  tjek((await adresse()).endsWith('/trin/10'), n + ': et kort tryk må ikke gå videre (' + await adresse() + ')');
  tjek(await side.locator('.voksen-hold.mind').count() === 1, n + ': et kort tryk skal give hold-knappen ringen');

  // 3. iPad'en afbryder berøringen (pointercancel, fx når den tror, man ruller): holdet stopper
  await tilTrin10();
  await finger('pointerdown');
  await vent(500);
  await finger('pointercancel');
  await vent(2200);
  tjek((await adresse()).endsWith('/trin/10'), n + ': et hold, der afbrydes med pointercancel, må ikke gå videre (' + await adresse() + ')');

  // 4. Et hold lykkes, og iPad'en afbryder slippet (pointercancel i stedet for pointerup). Så skal spærren for
  //    klikket ved slip løftes, ellers sluger den det næste tryk på det nye trin
  await tilTrin10();
  await finger('pointerdown');
  await side.waitForFunction(() => location.hash.endsWith('/trin/11'), null, { timeout: 4000 })
    .catch(() => tjek(false, n + ': et hold på 2 s med fingeren skal gå til trin 11'));
  await finger('pointercancel', 'document');
  await tryk(side, '.tilbage');
  await side.waitForFunction(() => location.hash.endsWith('/trin/10'), null, { timeout: 2000 })
    .catch(() => tjek(false, n + ': efter pointercancel skal næste tryk virke (Tilbage blev slugt)'));
  tjek(side.fejl.length === 0, n + ': ' + side.fejl.join(' | '));
  await ctx.close();
}

// E2E_DELE=hele,print,tastatur,timer,fejl,beroering (standard: alle) og E2E_SKAERME=ipad,iphone,desktop (standard: alle)
const DELE = (process.env.E2E_DELE || 'hele,print,tastatur,timer,fejl,beroering').split(',').map((x) => x.trim()).filter(Boolean);
const VALGTE = SKAERME.filter((s) => !process.env.E2E_SKAERME || process.env.E2E_SKAERME.split(',').includes(s.navn));
const KOERSEL = [];
for (const s of VALGTE) if (DELE.includes('hele')) KOERSEL.push(['hele vejen ' + s.navn, (b) => heleVejen(b, s)]);
for (const s of VALGTE) if (DELE.includes('print')) KOERSEL.push(['print ' + s.navn, (b) => print(b, s)]);
if (DELE.includes('tastatur')) KOERSEL.push(['tastatur', (b) => tastatur(b, SKAERME[2])]);
if (DELE.includes('timer')) KOERSEL.push(['timere', (b) => timere(b, SKAERME[0])]);
if (DELE.includes('fejl')) KOERSEL.push(['fejltilstande', (b) => fejltilstande(b, SKAERME[0])]);
if (DELE.includes('beroering')) KOERSEL.push(['berøring', (b) => beroering(b, SKAERME[0])]);

const browser = await webkit.launch();
const start = Date.now();
try {
  // Én del, der går i stå, stopper ikke de andre: så giver én kørsel alle fund
  for (const [navn, del] of KOERSEL) {
    try {
      await del(browser);
    } catch (e) {
      fejl.push(navn + ' stoppede: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | '));
      console.log('  STOPPEDE: ' + navn + ': ' + e.message);
    }
  }
} finally {
  await browser.close();
}
console.log('\n' + antalTjek + ' tjek (' + KOERSEL.map((k) => k[0]).join(', ') + ') i ' + Math.round((Date.now() - start) / 1000) + ' s · skærmbilleder i ' + UD);
if (maal.length) console.log(maal.length + ' målinger (ikke fejl):\n  - ' + maal.slice(0, 40).join('\n  - '));
if (fejl.length) {
  console.log(fejl.length + ' FEJL:\n  - ' + fejl.join('\n  - '));
  process.exit(1);
}
console.log('Alle tjek er grønne.');
