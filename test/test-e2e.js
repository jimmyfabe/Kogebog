// test-e2e.js — går hele vejen i en rigtig browser (Playwright, WebKit = Safaris motor) på tre skærme:
// iPad på langs (1180×820, børnenes standard), iPhone (390×844) og desktop (1280×800).
// Forside → pandekager → alle trin (med en timer og voksen-hold) → færdig, alle trin i alle retter,
// print-siden for alle retter (også i printvisning på A4-bredde), tastatur, timere på tværs af skærme og genindlæsning,
// fejltilstande og «mindre bevægelse». Delen «former» ser desuden 360 px, iPad mini på højkant og iPhones på langs
// (667×375 til 932×430).
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
import { GRUPPER } from '../js/katalog.js';

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

// Forsiden har et afsnit pr. gruppe (aftensmad, bagning, søde sager); index er alle retter i forsidens rækkefølge
const INDEX_GRUPPER = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper;
const index = INDEX_GRUPPER.flatMap((g) => g.retter);
const RETTER = Object.fromEntries(index.map((id) => [id, JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter', id + '.json'), 'utf8'))]));

const vent = (ms) => new Promise((r) => setTimeout(r, ms));
let antalTjek = 0;
const fejl = [];
const maal = []; // målinger, der ikke er fejl (fx at man skal rulle på iPhone)
let cspSprunget = 0; // CSP-beskeder fra Playwrights eget <style> ved skærmbilleder, som ikke tælles som fejl (se foto())
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
  side.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (side.iFoto && /^Refused to apply a stylesheet/.test(m.text())) { cspSprunget++; return; } // testens eget <style>, se foto()
    side.fejl.push('console: ' + m.text());
  });
  side.on('response', (r) => { if (r.status() >= 400) side.fejl.push('HTTP ' + r.status() + ': ' + r.url()); });
  side.on('requestfailed', (r) => side.fejl.push('requestfailed: ' + r.url() + ' (' + (r.failure() || {}).errorText + ')'));
  return { ctx, side };
}

// I WebKit lægger Playwright altid et <style>body {}</style> ind før et skærmbillede (shouldToggleStyleSheetToSyncAnimations
// i playwright-core, uanset caret og animations), og appens CSP (style-src 'self') afviser det med en konsolfejl.
// Kun den fejl, og kun mens fotoet tages, tælles ikke. Alle andre CSP-fejl tæller stadig.
async function foto(side, navn, ekstra = {}) {
  side.iFoto = true;
  try {
    await side.screenshot({ path: path.join(UD, navn + '.png'), ...ekstra });
    await side.evaluate(() => 0); // konsolbeskeden fra fotoet er nået frem før dette svar
  } finally {
    side.iFoto = false;
  }
}

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
    // offsetWidth og clientWidth er uden transform, så verbernes små bevægelser ikke tæller med
    return { ude: Math.round(ude), klipper, bredde: img.offsetWidth, indeni: ramme.clientWidth };
  });
  if (!r) return;
  tjek(r.ude <= 1 || r.klipper, hvor + ': verbum-billedet stikker ' + r.ude + ' px ud over den runde ramme');
  // Tegningernes arme skal nå ud til rammen (før var billedet 86 % af rammen, og armene stoppede før kanten)
  tjek(r.bredde >= r.indeni - 1, hvor + ': verbum-billedet skal fylde rammens bredde (' + r.bredde + ' af ' + r.indeni + ' px)');
}

// Rettens hoved ved første visning: billedet, navnet og personer og tid står over den faste bund (eller skærmens kant).
// Før stod hovedet midt i en høj række ved en lang ingrediensliste: pizzasnegle på 901×800 havde personer og tid
// 129 px under bunden, og på 1180×820 var linjen skåret over
async function retHoved(side, hvor) {
  const r = await side.evaluate(() => {
    const s = document.querySelector('#app > .skaerm:not([data-gammel])');
    const b = (sel) => s.querySelector(sel).getBoundingClientRect();
    const h = s.querySelector('.handlinger');
    const bund = getComputedStyle(h).position === 'sticky' ? h.getBoundingClientRect().top : innerHeight;
    return { rul: Math.round(scrollY), billede: [Math.round(b('.ret-billede img').top), Math.round(b('.ret-billede img').bottom)], navn: Math.round(b('.ret-titel h1').bottom), meta: Math.round(b('.meta').bottom), bund: Math.round(bund) };
  });
  tjek(r.rul === 0 && r.billede[0] >= 0 && Math.max(r.billede[1], r.navn, r.meta) <= r.bund,
    hvor + ': billedet, navnet og personer og tid skal ses over bunden ved første visning ' + JSON.stringify(r));
  return r;
}

async function sidsteTale(side) {
  return side.evaluate(() => (window.__tale[window.__tale.length - 1] || {}).tekst || '');
}

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

// valg går videre til Playwrights click, fx { force: true } til en knap, der pulserer (Playwright venter ellers på,
// at den står stille, og det gør «Tiden er gået»-pillen aldrig)
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

// Forsiden med mange retter ruller: den første række kort skal ses uden at rulle, og det sidste kort skal kunne
// rulles helt frem (kortenes kant på 6 px regnes med). Før skulle alle 5 kort ses på én skærm.
async function forsideRulning(side) {
  return side.evaluate(async () => {
    const billede = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    window.scrollTo({ top: 0, behavior: 'instant' });
    await billede();
    const kort = [...document.querySelectorAll('.kort[data-ret]')];
    const top = Math.min(...kort.map((k) => k.getBoundingClientRect().top));
    const foersteRaekke = kort.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 2);
    const foersteUnder = Math.round(Math.max(...foersteRaekke.map((k) => k.getBoundingClientRect().bottom + 6)) - innerHeight);
    // Navnet skal blive inde i kortet («Havregrynskugler» stak ud på 360 px, hvor browseren ikke kunne dele ordet)
    const navnUd = kort.filter((k) => {
      const r = document.createRange();
      r.selectNodeContents(k.querySelector('.kort-navn'));
      const t = r.getBoundingClientRect();
      const b = k.getBoundingClientRect();
      return t.left < b.left - 0.5 || t.right > b.right + 0.5;
    }).map((k) => k.dataset.ret);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await billede();
    const b = kort[kort.length - 1].getBoundingClientRect();
    const ud = { kort: kort.length, iFoersteRaekke: foersteRaekke.length, foersteUnder, navnUd, rullet: Math.round(window.scrollY), sidsteTop: Math.round(b.top), sidsteBund: Math.round(b.bottom + 6), H: innerHeight };
    ud.sidsteSes = b.top >= 0 && b.bottom + 6 <= innerHeight + 1;
    window.scrollTo({ top: 0, behavior: 'instant' });
    await billede();
    return ud;
  });
}

// Forsiden har et afsnit pr. gruppe med en stor overskrift (ikon + ord), og kortene i et afsnit har samme farve på
// cirklen. Før stod alle 13 kort i ét gitter, og grupperne kunne ikke ses: med to kort pr. række delte pizzasnegle
// (bagning) og pandekager (søde sager) række. Rækkerne regnes efter index.json, så blandingen også kan måles uden afsnit
async function tjekGrupper(side, hvor) {
  const gruppeAf = Object.fromEntries(INDEX_GRUPPER.flatMap((g) => g.retter.map((id) => [id, g.id])));
  const g = await side.evaluate((gruppeAf) => {
    const afsnit = [...document.querySelectorAll('.forside .gruppe')].map((s) => {
      const h = s.querySelector('h2');
      const img = h && h.querySelector('img');
      const kort = [...s.querySelectorAll('.kort[data-ret]')];
      return {
        id: s.dataset.gruppe,
        navn: h ? h.textContent.trim() : null,
        navnPx: h ? parseFloat(getComputedStyle(h).fontSize) : 0,
        ikon: img ? { alt: img.getAttribute('alt'), b: Math.round(img.getBoundingClientRect().width), ok: img.complete && img.naturalWidth > 0 } : null,
        hBund: h ? Math.round(h.getBoundingClientRect().bottom) : null,
        retter: kort.map((k) => k.dataset.ret),
        farver: [...new Set(kort.map((k) => getComputedStyle(k.querySelector('.kort-billede')).backgroundColor))],
        kortTop: kort.length ? Math.round(Math.min(...kort.map((k) => k.getBoundingClientRect().top))) : null,
        kortPx: kort.length ? parseFloat(getComputedStyle(kort[0].querySelector('.kort-navn')).fontSize) : 0,
      };
    });
    const raekker = {};
    for (const k of document.querySelectorAll('.forside .kort[data-ret]')) {
      const top = Math.round(k.getBoundingClientRect().top + scrollY);
      (raekker[top] = raekker[top] || []).push(k.dataset.ret);
    }
    const r = Object.values(raekker);
    return {
      afsnit,
      blandet: r.filter((ids) => new Set(ids.map((id) => gruppeAf[id])).size > 1).map((ids) => ids.join('+')),
      iRaekke: Math.max(...r.map((ids) => ids.length)),
    };
  }, gruppeAf);
  tjek(g.afsnit.length === INDEX_GRUPPER.length, hvor + ': forsiden skal have ' + INDEX_GRUPPER.length + ' afsnit med hver sin overskrift (fandt ' + g.afsnit.length + ')');
  INDEX_GRUPPER.forEach((ig, i) => {
    const a = g.afsnit[i];
    if (!a) return;
    const navn = GRUPPER[ig.id];
    tjek(a.id === ig.id && a.navn === navn, hvor + ': afsnit ' + (i + 1) + ' skal hedde «' + navn + '» (fandt ' + a.id + ' «' + a.navn + '»)');
    tjek(a.ikon && a.ikon.ok && a.ikon.alt === '' && a.ikon.b >= 32, hvor + ': overskriften «' + navn + '» skal have et ikon på mindst 32 px ' + JSON.stringify(a.ikon));
    tjek(a.navnPx >= Math.max(24, a.kortPx), hvor + ': overskriften «' + navn + '» skal være mindst 24 px og ikke mindre end kortenes navne (' + a.navnPx + ' mod ' + a.kortPx + ' px)');
    tjek(a.retter.join() === ig.retter.join(), hvor + ': afsnittet «' + navn + '» skal have ' + ig.retter.join(', ') + ' (fandt ' + a.retter.join(', ') + ')');
    tjek(a.farver.length === 1, hvor + ': kortene i «' + navn + '» skal have samme farve på cirklen (fandt ' + a.farver.join(', ') + ')');
    tjek(a.hBund !== null && a.kortTop !== null && a.hBund <= a.kortTop, hvor + ': overskriften «' + navn + '» skal stå over sine kort (bund ' + a.hBund + ', kort ' + a.kortTop + ')');
  });
  const farver = g.afsnit.map((a) => a.farver[0]);
  tjek(new Set(farver).size === farver.length, hvor + ': hvert afsnit skal have sin egen farve på cirklen (fandt ' + farver.join(', ') + ')');
  tjek(g.blandet.length === 0, hvor + ': en række må kun have kort fra én gruppe (blandet: ' + g.blandet.join(' | ') + ')');
  return g;
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

// Topbaren på et trin: hvor bred midten er, hvor fremskridtet står, om det overlapper pillen, den smalleste streg,
// og om «Trin x af y» er på én linje
async function topbarMaal(side) {
  return side.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    const midte = r('.topbar-midte');
    const frem = r('.fremskridt');
    const p = document.querySelector('.topbar .pille:not([hidden])');
    const pille = p ? p.getBoundingClientRect() : null;
    const nr = document.querySelector('.trin-nr');
    const linjer = nr ? Math.round(nr.getBoundingClientRect().height / parseFloat(getComputedStyle(nr).lineHeight)) : 0;
    const streger = [...document.querySelectorAll('.fremskridt > span')].map((s) => s.getBoundingClientRect().width);
    const kasse = (b) => (b ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null);
    return {
      midte: midte ? Math.round(midte.width) : 0,
      fremX: frem ? Math.round(frem.left) : null,
      frem: kasse(frem),
      pille: kasse(pille),
      overlap: !!(frem && pille && Math.min(frem.right, pille.right) - Math.max(frem.left, pille.left) > 0.5
        && Math.min(frem.bottom, pille.bottom) - Math.max(frem.top, pille.top) > 0.5),
      mindsteStreg: streger.length ? Math.round(Math.min(...streger) * 10) / 10 : null,
      linjer,
    };
  });
}

// Konfettiens mindste afstand til færdig-skærmens overskrift og tekst (målt til selve bogstaverne, ikke hele linjens bredde)
const konfettiAfstand = (side) => side.evaluate(() => {
  const linjer = (e) => { const r = document.createRange(); r.selectNodeContents(e); return [...r.getClientRects()]; };
  const tekst = [...linjer(document.querySelector('.faerdig h1')), ...linjer(document.querySelector('.faerdig-tekst'))];
  let mindst = Infinity;
  for (const s of document.querySelectorAll('.konfetti span')) {
    const b = s.getBoundingClientRect();
    for (const t of tekst) mindst = Math.min(mindst, Math.hypot(Math.max(t.left - b.right, b.left - t.right, 0), Math.max(t.top - b.bottom, b.top - t.bottom, 0)));
  }
  return Math.round(mindst);
});

// ---------- Hele vejen med pandekager ----------
// Trinnumrene læses af opskriften: timeren er det første trin med «timer_sek», og holdet på 3 s er det sidste voksen-trin
const VEJ = 'pandekager';
const VEJ_NAVN = RETTER[VEJ].name;
const VEJ_TRIN = RETTER[VEJ].recipeInstructions;
const TIMER_NR = VEJ_TRIN.findIndex((t) => t.tumbi.timer_sek) + 1;
const HOLD_NR = VEJ_TRIN.map((t, i) => (t.tumbi.voksen === true && i < VEJ_TRIN.length - 1 ? i + 1 : 0)).reduce((a, b) => Math.max(a, b), 0);
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
  const rul = await forsideRulning(side);
  tjek(rul.foersteUnder <= 0, n + ': den første række kort på forsiden skæres ' + rul.foersteUnder + ' px af forneden');
  tjek(rul.sidsteSes, n + ': det sidste kort på forsiden skal kunne rulles helt frem ' + JSON.stringify(rul));
  maal.push(n + ' forside: ' + rul.kort + ' kort, ' + rul.iFoersteRaekke + ' i første række, rullet ' + rul.rullet + ' px for at nå det sidste');
  const gr = await tjekGrupper(side, n + ' forside');
  maal.push(n + ' forside: ' + gr.afsnit.length + ' afsnit, højst ' + gr.iRaekke + ' kort pr. række');
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
  tjek((await sidsteTale(side)).startsWith(VEJ_NAVN), n + ': første tryk skal sige navnet');
  const stemme = await side.evaluate(() => window.__tale[window.__tale.length - 1]);
  tjek(stemme.lang === 'da-DK' && stemme.stemme === 'da-DK', n + ': oplæsning skal være da-DK med den danske stemme, fik ' + JSON.stringify(stemme));
  if (n === 'ipad') await foto(side, n + '-2-forside-valgt');
  await tryk(side, '.kort[data-ret="pandekager"]');
  await side.waitForSelector('.ret h1');
  tjek(await h1(side) === VEJ_NAVN, n + ': retten skal hedde ' + VEJ_NAVN);
  tjek(await side.locator('.ingr').count() === RETTER.pandekager.recipeIngredient.length, n + ': alle ingredienser skal vises');
  // Start (og print) skal kunne ses uden at rulle på alle skærme. På iPhone står bunden fast (før skulle man rulle)
  await tjekLayout(side, n + ' ret', { knapperSes: true });
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
  const trin = VEJ_TRIN;
  let fremUdenTimer = null; // fremskridtets x på trinnet før timeren: det må ikke flytte sig, når pillen kommer
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
    if ([1, 3, TIMER_NR + 1, trin.length].includes(nr)) await foto(side, n + '-4-trin-' + nr);
    if (nr === TIMER_NR - 1) fremUdenTimer = (await topbarMaal(side)).fremX;

    if (nr === TIMER_NR) {
      // Timeren: start, gå videre, se pillen, vent på slut, gå tilbage, kvittér
      tjek((await side.locator('.timer-start').textContent()).includes(formaterTid(HURTIG_SEK)), n + ': ?hurtig=1 skal give en timer på ' + formaterTid(HURTIG_SEK));
      await tryk(side, '.timer-start');
      tjek(await side.locator('.timer-ring').isVisible(), n + ': timer-ringen skal vises');
      tjek(await side.evaluate(() => window.__laas.anmodet) === 1, n + ': timeren skal holde skærmen tændt (wakeLock)');
      if (n === 'ipad') await foto(side, n + '-5-timer');
      // Er timer-trinnet et voksen-trin (pandekagen på panden), går man videre med et hold
      if (voksen) await hold(side, '.naeste', 2300);
      else await tryk(side, '.naeste');
      await side.waitForFunction((x) => location.hash.endsWith('/trin/' + x), TIMER_NR + 1);
      tjek(await side.locator('.pille:not([hidden])').count() === 1, n + ': timer-pillen skal vises på næste trin');
      const fremKoerer = (await topbarMaal(side)).fremX;
      await venterPaa(side, () => !!document.querySelector('.pille.faerdig'), null, n + ': pillen skal vise, at tiden er gået');
      const lyd = await side.evaluate(() => ({ toner: window.__toner, laas: window.__laas }));
      tjek(lyd.toner >= 3, n + ': der skal spilles tre toner ved slut (fik ' + lyd.toner + ')');
      tjek(lyd.laas.sluppet === 1 && lyd.laas.aktive === 0, n + ': wakeLock skal slippes, når timeren er slut ' + JSON.stringify(lyd.laas));
      // «Tiden er gået» i topbaren må ikke klemme fremskridtet (iPhone: midten var 61 px, og stregerne lå under pillen)
      const top = await topbarMaal(side);
      tjek(top.midte >= 140, n + ': topbarens midte med en færdig timer er kun ' + top.midte + ' px bred');
      tjek(top.pille !== null && !top.overlap, n + ': fremskridtet løber ind under pillen (fremskridt ' + top.frem + ', pille ' + top.pille + ')');
      tjek(top.linjer === 1, n + ': «Trin ' + (TIMER_NR + 1) + ' af ' + trin.length + '» skal stå på én linje med en færdig timer (' + top.linjer + ' linjer)');
      // Fremskridtet må ikke hoppe vandret efter pillens bredde (iPad: x 320 → 248 → 200). iPhone har ikke plads til at stå stille.
      const xer = [fremUdenTimer, fremKoerer, top.fremX];
      if (n === 'iphone') maal.push(n + ': fremskridtets x uden timer, med timer og færdig: ' + xer.join(', '));
      else tjek(Math.max(...xer) - Math.min(...xer) <= 1, n + ': fremskridtet flytter sig, når timer-pillen kommer (x uden timer, med timer og færdig: ' + xer.join(', ') + ')');
      await foto(side, n + '-6-pille-faerdig');
      await tryk(side, '.pille', PULSERER);
      await side.waitForFunction((x) => location.hash.endsWith('/trin/' + x), TIMER_NR);
      tjek(await side.locator('.timer.faerdig').count() === 1, n + ': trinnet skal vise, at tiden er gået');
      // Ringen pulserer (scale 1.06), når tiden er gået, og ingen forfader må skære den af. Før ramte færdig-skærmens
      // .faerdig { overflow: hidden } også .timer.faerdig, så ringen blev klippet flad foroven og forneden
      const klippet = await side.evaluate(() => {
        const ring = document.querySelector('.timer.faerdig .timer-ring');
        const r = ring.getBoundingClientRect();
        const halv = ring.offsetWidth * 1.06 / 2;
        const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
        const ud = [];
        for (let e = ring.parentElement; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
          const a = e.getBoundingClientRect();
          if (cx - halv < a.left - 0.5 || cx + halv > a.right + 0.5 || cy - halv < a.top - 0.5 || cy + halv > a.bottom + 0.5) ud.push(e.className + ' (overflow ' + cs.overflow + ')');
        }
        return ud;
      });
      tjek(!klippet.length, n + ': den pulserende ring skæres af ' + klippet.join(', '));
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
      // Det sidste voksen-trin holdes i 3 s: klikket ved slip kommer efter appens spærre, så kun blokerTilSlip (hold.js) kan sluge det
      await hold(side, '.naeste', nr === HOLD_NR ? 3000 : 2300);
      if (nr === HOLD_NR) {
        await vent(300);
        tjek(side.url().endsWith('/trin/' + (nr + 1)), n + ' trin ' + nr + ': et hold på 3 s må kun gå ét trin frem (adressen er ' + side.url() + ')');
      }
    } else {
      await tryk(side, '.naeste');
    }
  }
  await side.waitForSelector('.faerdig h1');
  tjek(await h1(side) === 'Færdig!', n + ': færdig-skærmen');
  tjek((await sidsteTale(side)).startsWith('Færdig!'), n + ': færdig-skærmen siger «Færdig!»');
  // Teksten nævner ikke retten: navnet med små bogstaver gav «Velbekomme med rasmus klumps pandekager.»
  const faerdigTekst = await side.evaluate(() => document.querySelector('.faerdig-tekst').textContent);
  tjek(faerdigTekst === 'Godt gået. Velbekomme!', n + ': færdig-teksten skal være «Godt gået. Velbekomme!» (fandt «' + faerdigTekst + '»)');
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
  // … og den holder afstand til overskriften og teksten
  const afstand = await konfettiAfstand(side);
  tjek(afstand >= 16, n + ': konfettien skal holde mindst 16 px fra overskriften og teksten (nærmeste: ' + afstand + ' px)');
  await foto(side, n + '-7-faerdig');
  await tryk(side, '.faerdig .knap.primaer');
  await side.waitForSelector('.forside .kort');
  tjek(side.fejl.length === 0, n + ' (hele vejen): ' + side.fejl.join(' | '));

  // Alle trin i alle retter (direkte adresse)
  console.log('[' + n + '] alle trin i alle ' + index.length + ' retter');
  // Et billede, der ses første gang (fx et nyt verbum), kan stadig være på vej, når overskriften står der:
  // «boller trin 11: billeder ikke indlæst: grafik/verbum-pensle.svg» kom i én af to kørsler. Vent, til alle er færdige
  // (også de fejlede, så tjekLayout melder et billede, der mangler)
  const billederFaerdige = () => side.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 5000 }).catch(() => {});
  // WebKit afviser adresseskift ud over ca. 200 pr. 10 s i samme dokument («Excessive navigation attempts blocked.»,
  // målt 18-10-2026). Alle trin i alle retter er over 200 skift, og så stod «havregrynskugler trin 11» aldrig frem.
  // Hver ret åbnes derfor i et nyt dokument, hvilket nulstiller tælleren. Omvejen over about:blank er nødvendig, fordi goto
  // til en adresse, der kun skifter efter #, bliver i samme dokument. Et afvist skift meldes som det, det er
  const gaaTil = async (h, hvad) => {
    const ok = await side.evaluate((x) => { location.hash = x; return location.hash === x; }, h);
    tjek(ok, n + ' ' + hvad + ': WebKit afviste adresseskiftet til ' + h + ' (for mange skift i samme dokument)');
  };
  for (const id of index) {
    await side.goto('about:blank');
    await side.goto(BASE + '/index.html?hurtig=1#/ret/' + id);
    await side.waitForFunction((x) => document.querySelector('.ret h1') && document.querySelector('.ret h1').textContent === x, RETTER[id].name);
    await billederFaerdige();
    await tjekLayout(side, n + ' ' + id + ' ret', { knapperSes: true });
    await retHoved(side, n + ' ' + id + ' ret');
    if (n !== 'ipad' && id === 'koedsovs') await foto(side, n + '-8-ret-koedsovs');
    for (let i = 0; i < RETTER[id].recipeInstructions.length; i++) {
      const t = RETTER[id].recipeInstructions[i];
      await gaaTil('#/ret/' + id + '/trin/' + (i + 1), id + ' trin ' + (i + 1));
      await side.waitForFunction((x) => document.querySelector('.trin h1') && document.querySelector('.trin h1').textContent === x, t.text, { timeout: 5000 })
        .catch(() => tjek(false, n + ' ' + id + ' trin ' + (i + 1) + ': viste ikke «' + t.text + '»'));
      await billederFaerdige();
      await tjekLayout(side, n + ' ' + id + ' trin ' + (i + 1), { knapperSes: true });
      await tjekVerbum(side, n + ' ' + id + ' trin ' + (i + 1));
      if (n === 'iphone' && id === 'chorizo-pasta' && i === 10) await foto(side, n + '-9-chorizo-trin-11');
      if (n === 'ipad' && id === 'boller' && i === 6) await foto(side, n + '-9-boller-trin-7');
    }
    // Tilbage på retten efter det sidste trin står «Fortsæt ved trin N» i bunden: hovedet ses stadig
    await gaaTil('#/ret/' + id, id + ' ret med Fortsæt');
    await side.waitForSelector('.ret .fortsaet', { timeout: 5000 }).catch(() => tjek(false, n + ' ' + id + ': retten skal vise «Fortsæt» efter det sidste trin'));
    await billederFaerdige();
    await tjekLayout(side, n + ' ' + id + ' ret med Fortsæt', { knapperSes: true });
    await retHoved(side, n + ' ' + id + ' ret med Fortsæt');
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
  // «Fortsæt» husker trinnet (retten er det første kort, som Tab og Enter åbnede)
  await side.evaluate((id) => { location.hash = '#/ret/' + id; }, index[0]);
  await side.waitForSelector('.ret h1');
  tjek((await side.locator('.fortsaet').textContent().catch(() => '')).includes('trin 2'), 'Fortsæt ved trin 2 skal vises');
  // U17: «Fortsæt» er den store knap, og den anden siger, at den starter forfra
  tjek(await side.locator('.handlinger .knap.primaer').count() === 1 && await side.locator('.fortsaet.primaer').count() === 1, 'Fortsæt skal være den eneste store knap');
  tjek((await side.locator('.start').textContent().catch(() => '')).trim() === 'Start forfra', 'knappen ved siden af Fortsæt skal hedde «Start forfra»');
  // «Fortsæt» står først i koden (Tab), men på den brede skærm til højre som «Næste»
  const vh = await side.evaluate(() => Object.fromEntries(['fortsaet', 'forfra', 'print-knap'].map((k) => [k, Math.round(document.querySelector('.handlinger .' + k).getBoundingClientRect().left)])));
  tjek(vh.fortsaet > vh.forfra && vh.forfra > vh['print-knap'], 'tastatur: print, «Start forfra» og «Fortsæt» skal stå fra venstre mod højre ' + JSON.stringify(vh));
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
  const baggrund = () => side.locator('.timer-start').evaluate((b) => getComputedStyle(b).backgroundColor);
  const normal = await baggrund();
  await tryk(side, '.timer-start');
  await side.evaluate(() => { location.hash = '#/ret/koedsovs/trin/10'; });
  await side.waitForFunction(() => location.hash.endsWith('/trin/10') && !!document.querySelector('.timer-start'));
  // Knappen har aria-disabled="true", men kan stadig trykkes (den siger, hvor timeren kører). Playwright venter
  // ellers for evigt på, at en aria-disabled knap bliver «enabled».
  tjek(await side.locator('.timer-start').getAttribute('aria-disabled') === 'true', n + ': «Start timer» på trin 10 skal være aria-disabled, mens trin 8 kører');
  const optaget = await baggrund();
  tjek(optaget !== normal, n + ': «Start timer» skal se blegere ud, mens en anden timer kører (baggrunden er ' + optaget + ' som ellers)');
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
  // Pillen skubber kortene ned. Før skulle alle 5 kort ses (de blev skåret af på iPad); med 13 retter ruller forsiden,
  // så nu skal den første række stadig ses uden at rulle, og det sidste kort skal kunne rulles frem
  const rul = await forsideRulning(side);
  tjek(rul.foersteUnder <= 0, n + ': den første række kort på forsiden med «Tiden er gået» skæres ' + rul.foersteUnder + ' px af forneden');
  tjek(rul.sidsteSes, n + ': det sidste kort på forsiden med «Tiden er gået» skal kunne rulles frem ' + JSON.stringify(rul));
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
  const fejlTekst = await side.locator('.status-boks').textContent().catch(() => '');
  tjek(!/iPad/.test(fejlTekst), 'fejl: teksten må ikke gå ud fra, at det er en iPad: ' + fejlTekst);
  tjek(await side.locator('.status-boks .status-dyr').count() === 1, 'fejl: Bo skal stå over fejlen, som på rettens fejlskærm');
  await tjekLayout(side, 'fejl forside');
  await foto(side, skaerm.navn + '-fejl-forside');
  await side.unroute('**/opskrifter/index.json');
  await tryk(side, 'button:has-text("Prøv igen")');
  await side.waitForSelector('.kort[data-ret]').catch(() => tjek(false, 'fejl: «Prøv igen» skal hente opskrifterne'));

  // U18: en tom liste taler til forælderen, ikke til udvikleren
  await side.route('**/opskrifter/index.json', (r) => r.fulfill({ contentType: 'application/json', body: '{"version":2,"grupper":[]}' }));
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('text=Der er ingen opskrifter endnu').catch(() => tjek(false, 'tom: en tom liste skal sige «Der er ingen opskrifter endnu»'));
  const tomTekst = await side.locator('.status-boks').textContent().catch(() => '');
  tjek(!/index\.json|mappen/.test(tomTekst), 'tom: teksten må ikke handle om filer og mapper: ' + tomTekst);
  tjek(await side.locator('button:has-text("Hent opskrifterne igen")').count() === 1, 'tom: «Hent opskrifterne igen» skal vises');
  tjek(await side.locator('.status-boks .status-dyr').count() === 1, 'tom: Bo skal stå over beskeden, som på fejlskærmen');
  await tjekLayout(side, 'tom forside');
  await foto(side, skaerm.navn + '-tom-forside');
  await side.unroute('**/opskrifter/index.json');
  // Listen svarer langsomt: imens skal skærmen sige «Henter opskrifterne …» og ikke blive stående på den tomme liste
  await side.route('**/opskrifter/index.json', async (r) => { await vent(1500); await r.continue().catch(() => {}); });
  await tryk(side, 'button:has-text("Hent opskrifterne igen")');
  await side.waitForSelector('text=Henter opskrifterne', { timeout: 1000 })
    .catch(() => tjek(false, 'tom: «Hent opskrifterne igen» skal vise «Henter opskrifterne …», mens listen hentes'));
  await side.waitForSelector('.kort[data-ret]').catch(() => tjek(false, 'tom: «Hent opskrifterne igen» skal hente listen'));
  await side.unroute('**/opskrifter/index.json');

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
  // Den voksne holder lige efter: ringen og rystet stopper med det samme (før rystede knappen videre i 1,5 s under holdet)
  await finger('pointerdown');
  tjek(await side.locator('.voksen-hold.mind').count() === 0, n + ': et hold lige efter et kort tryk skal fjerne ringen');
  await finger('pointercancel');

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

  // 5. Den voksne holder «Næste», og barnet trykker Hjem imens. Knappen er væk, så holdet må ikke gå videre bagefter
  //    (før kørte holdets løkke videre på den gamle knap og sendte appen til trin 11 efter 2 s)
  await tilTrin10();
  await finger('pointerdown');
  await tryk(side, '.topbar .rund');
  await vent(2300);
  tjek(await adresse() === '#/', n + ': et hold, hvor skærmen skifter undervejs, må ikke gå videre bagefter (adressen er ' + await adresse() + ')');
  tjek(side.fejl.length === 0, n + ': ' + side.fejl.join(' | '));
  await ctx.close();
}

// ---------- Skærmformer, som de tre faste skærme ikke dækker ----------
// Den smalleste iPhone (360 px), iPhone (390), iPad mini på højkant (768×1024 og den nye 744×1133) og iPhone på langs
// (844×390), de små iPhones på langs (667×375 og 736×414), som før fik iPhone-layoutet på højkant, iPhone mini, X og
// 11 Pro på langs (812×375) og iPhone Pro Max på langs (932×430). På langs skal rettens bund være én række, også med
// «Fortsæt ved trin 12». Og tre smalle desktopvinduer: 901×800 er det smalleste med desktop-layoutet (grænsen i app.css),
// op til 970 px (960×800) har ingredienserne tre kolonner, og kødsovs' knapper lå under kanten, og på 1024×800 lå
// pizzasneglenes personer og tid under bunden
const FORMER = [
  { navn: 'w360', viewport: { width: 360, height: 780 }, hasTouch: true },
  { navn: 'iphone', viewport: { width: 390, height: 844 }, hasTouch: true },
  { navn: 'tablet', viewport: { width: 768, height: 1024 }, hasTouch: true },
  { navn: 'mini', viewport: { width: 744, height: 1133 }, hasTouch: true },
  { navn: 'land', viewport: { width: 844, height: 390 }, hasTouch: true },
  { navn: 'se-land', viewport: { width: 667, height: 375 }, hasTouch: true },
  { navn: 'plus-land', viewport: { width: 736, height: 414 }, hasTouch: true },
  { navn: 'x-land', viewport: { width: 812, height: 375 }, hasTouch: true },
  { navn: 'max-land', viewport: { width: 932, height: 430 }, hasTouch: true },
  { navn: 'desk-901', viewport: { width: 901, height: 800 }, hasTouch: false },
  { navn: 'desk-960', viewport: { width: 960, height: 800 }, hasTouch: false },
  { navn: 'desk-1024', viewport: { width: 1024, height: 800 }, hasTouch: false },
];
// Retterne, som «former» går helt igennem (knapper, Tab, fokus), og skærmene, hvor alle retters hoved også måles
const RET_FORMER = ['pandekager', 'koedsovs', 'pizzasnegle'];
const RET_ALLE_PAA = ['se-land', 'plus-land', 'x-land', 'mini', 'desk-901', 'desk-960', 'desk-1024'];

// Hvor et element ligger i forhold til den faste bund: { top, bund } for elementet og bundens top (bundTop)
const modBund = (side, sel) => side.evaluate((sel) => {
  const e = document.querySelector('#app > .skaerm:not([data-gammel]) ' + sel);
  const b = e ? e.getBoundingClientRect() : null;
  const h = document.querySelector('#app > .skaerm:not([data-gammel]) .handlinger').getBoundingClientRect();
  return { top: b ? Math.round(b.top) : null, bund: b ? Math.round(b.bottom) : null, bundTop: Math.round(h.top), hoejde: Math.round(h.height), H: innerHeight };
}, sel);

// Tab mellem knapperne i den faste bund må ikke rulle siden: de kan allerede ses. Før rullede html { scroll-padding-bottom }
// siden, når fokus kom ind i bunden (390 px, kødsovs med «Fortsæt»: 0 → 176 → 348 px), og indholdet hoppede
async function tabIBunden(side, hvor) {
  const antal = await side.evaluate(() => {
    window.scrollTo(0, 0);
    const k = [...document.querySelectorAll('#app > .skaerm:not([data-gammel]) .handlinger button')].filter((b) => b.getClientRects().length);
    k[k.length - 1].focus({ preventScroll: true });
    return k.length;
  });
  const rul = [];
  for (let i = 1; i < antal; i++) {
    await side.keyboard.press('Shift+Tab');
    await vent(100);
    rul.push(await side.evaluate(() => Math.round(window.scrollY)));
  }
  tjek(rul.every((y) => y === 0), hvor + ': Shift+Tab mellem knapperne i den faste bund må ikke rulle siden (rulning ' + rul.join(', ') + ')');
}

// Læg en gemt tilstand i «kog-v1», og indlæs siden igen: timeren og «Fortsæt» læses, når siden indlæses.
// Adressen skiftes med replaceState, så appen ikke når at tegne (og hente billeder til) skærmen før genindlæsningen
async function medGemt(side, { sidste = null, timer = null }, hash) {
  await side.waitForFunction(() => [...document.images].every((i) => i.complete)); // en genindlæsning afbryder billeder på vej
  await side.evaluate(({ sidste, timer, hash }) => {
    const nu = Date.now();
    localStorage.setItem('kog-v1', JSON.stringify({
      v: 1,
      sidste: sidste ? { ret: sidste.ret, nr: sidste.nr, tid: nu } : null,
      timer: timer ? { ret: timer.ret, nr: timer.nr, sek: timer.sek, start: nu + timer.slutOm - timer.sek * 1000, slut: nu + timer.slutOm } : null,
    }));
    history.replaceState(null, '', hash);
  }, { sidste, timer, hash });
  await side.reload();
}

// Timeren rulles frem, når man trykker «Start timer»: ringen og «Stop» skal ses over den faste bund. Før lå de under
// bunden på alle 34 timer-trin på 667×375 og 844×390 og på 23 af dem på 390×844. Kører en anden timer, skal forklaringen
// («Der kører allerede en timer …») kunne ses efter trykket. Med «mindre bevægelse» rulles der uden animation
const TIMER_PAA = ['iphone', 'land', 'se-land'];
const nuSkaerm = '#app > .skaerm:not([data-gammel]) ';
// Vent, til siden står stille (en blød rulning er færdig)
const stille = (side) => side.evaluate(() => new Promise((ok) => {
  let y = scrollY; let ens = 0; const slut = performance.now() + 2000;
  const se = () => {
    if (scrollY === y) ens++; else { y = scrollY; ens = 0; }
    if (ens >= 6 || performance.now() > slut) ok(Math.round(scrollY)); else requestAnimationFrame(se);
  };
  requestAnimationFrame(se);
}));
const overBunden = (side, sel) => side.evaluate((sel) => {
  const s = document.querySelector('#app > .skaerm:not([data-gammel])');
  const h = s.querySelector('.handlinger');
  const bund = getComputedStyle(h).position === 'sticky' ? h.getBoundingClientRect().top : innerHeight;
  const ud = sel.map((x) => s.querySelector(x).getBoundingClientRect());
  return { top: Math.round(Math.min(...ud.map((b) => b.top))), bund: Math.round(Math.max(...ud.map((b) => b.bottom))), fast: Math.round(bund), rul: Math.round(scrollY), ses: ud.every((b) => b.top >= 0 && b.bottom <= bund + 0.5) };
}, sel);
async function timerFrem(browser) {
  const timerTrin = index.flatMap((id) => RETTER[id].recipeInstructions.map((t, i) => (t.tumbi.timer_sek ? [id, i + 1] : null)).filter(Boolean));
  for (const sk of FORMER.filter((f) => TIMER_PAA.includes(f.navn))) {
    const n = sk.navn;
    console.log('[' + n + '] timeren rulles frem på ' + timerTrin.length + ' timer-trin');
    const { ctx, side } = await nySide(browser, sk);
    await side.goto(BASE + '/index.html');
    await side.waitForSelector('.kort[data-ret]');
    const gaa = async (id, nr) => {
      await side.evaluate((h) => { location.hash = h; }, '#/ret/' + id + '/trin/' + nr);
      await side.waitForFunction((x) => location.hash.endsWith(x) && !document.querySelector('.skaerm[data-gammel]') && document.querySelector('#app > .skaerm .timer-start'), '/' + id + '/trin/' + nr);
      // Billedet skubber timeren ned, når det er hentet: før det kunne «Start timer» se ud til at stå over bunden
      await side.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 5000 }).catch(() => {});
    };
    // Som et barn: rul kun lige så langt, at «Start timer» kan ses over bunden, og tryk så
    const knapFrem = () => side.evaluate(() => {
      const s = document.querySelector('#app > .skaerm:not([data-gammel])');
      const h = s.querySelector('.handlinger');
      const bund = getComputedStyle(h).position === 'sticky' ? h.getBoundingClientRect().top : innerHeight;
      const b = s.querySelector('.timer-start').getBoundingClientRect();
      if (b.bottom > bund) window.scrollBy({ top: b.bottom - bund + 4, behavior: 'instant' });
    });
    const ikke = [];
    for (const [id, nr] of timerTrin) {
      await gaa(id, nr);
      await knapFrem();
      await tryk(side, nuSkaerm + '.timer-start');
      await stille(side);
      const r = await overBunden(side, ['.timer-ring', '.timer .knap']);
      if (!r.ses) ikke.push(id + ' ' + nr + ' ' + JSON.stringify(r));
      await tryk(side, nuSkaerm + '.timer .knap');
    }
    tjek(!ikke.length, n + ': ringen og «Stop» skal ses over bunden, når timeren starter (' + ikke.length + ' af ' + timerTrin.length + ' trin): ' + ikke.slice(0, 4).join(' | '));
    // En anden timer kører (den første), og man trykker «Start timer» på de andre timer-trin
    const [forsteId, forsteNr] = timerTrin[0];
    await gaa(forsteId, forsteNr);
    await tryk(side, nuSkaerm + '.timer-start');
    const optaget = [];
    for (const [id, nr] of timerTrin.slice(1)) {
      await gaa(id, nr);
      await knapFrem();
      await tryk(side, nuSkaerm + '.timer-start', { force: true }); // aria-disabled: Playwright venter ellers på, at den bliver aktiv
      await stille(side);
      const r = await overBunden(side, ['.timer-optaget']);
      r.trin = side.url().endsWith('/' + id + '/trin/' + nr); // trykket ramte «Start timer», ikke bunden
      if (!r.ses || !r.trin) optaget.push(id + ' ' + nr + ' ' + JSON.stringify(r));
    }
    tjek(!optaget.length, n + ': «Der kører allerede en timer» skal ses over bunden efter trykket (' + optaget.length + ' af ' + (timerTrin.length - 1) + ' trin): ' + optaget.slice(0, 4).join(' | '));
    tjek(side.fejl.length === 0, n + ' (timeren rulles frem): ' + side.fejl.join(' | '));
    await ctx.close();
  }
  // Mindre bevægelse: siden står det rette sted med det samme (ingen blød rulning). Kødsovs trin 10 ligger lavest på 390×844
  const { ctx, side } = await nySide(browser, FORMER.find((f) => f.navn === 'iphone'), { reducedMotion: 'reduce' });
  await side.goto(BASE + '/index.html#/ret/koedsovs/trin/10');
  await side.waitForSelector('.timer-start');
  await tryk(side, '.timer-start');
  const straks = await side.evaluate(() => Math.round(scrollY));
  const til = await stille(side);
  const r = await overBunden(side, ['.timer-ring', '.timer .knap']);
  tjek(r.ses && straks === til, 'iphone med mindre bevægelse: timeren skal rulles frem uden animation (straks ' + straks + ', til sidst ' + til + ', ' + JSON.stringify(r) + ')');
  await ctx.close();
}

async function former(browser) {
  // E2E_FORMER=se-land,land begrænser skærmformerne (standard: alle)
  const valgte = FORMER.filter((s) => !process.env.E2E_FORMER || process.env.E2E_FORMER.split(',').includes(s.navn));
  for (const sk of valgte) {
    const n = sk.navn;
    const lav = sk.viewport.height <= 520;
    console.log('[' + n + '] skærmform ' + sk.viewport.width + '×' + sk.viewport.height);
    const { ctx, side } = await nySide(browser, sk);
    // iPad mini på højkant har to kolonner som iPad'en (744×1133 fik før iPhone-layoutet: én kolonne og en 640 px bred «Næste»)
    const ipadKolonner = sk.viewport.width >= 701 && !lav;
    // På langs og fra 901 px står «Fortsæt» til højre i samme række som de andre knapper (som på iPad'en på langs)
    const fortsaetHoejre = lav || sk.viewport.width >= 901;
    const kolonner = (sel) => side.evaluate((s) => getComputedStyle(document.querySelector('#app > .skaerm:not([data-gammel]) ' + s)).gridTemplateColumns.split(' ').length, sel);
    await side.goto(BASE + '/index.html');
    await side.waitForSelector('.kort[data-ret]');
    await side.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));

    // Forsiden med alle retter: første række uden at rulle, det sidste kort kan rulles frem, navnene bliver i kortene, og intet vandret rul
    const rul = await forsideRulning(side);
    tjek(rul.foersteUnder <= 0, n + ' forside: den første række kort skæres ' + rul.foersteUnder + ' px af forneden');
    tjek(rul.sidsteSes, n + ' forside: det sidste kort skal kunne rulles helt frem ' + JSON.stringify(rul));
    tjek(rul.navnUd.length === 0, n + ' forside: navnet stikker ud af kortet på ' + rul.navnUd.join(', '));
    maal.push(n + ' forside: ' + rul.iFoersteRaekke + ' kort i første række, rullet ' + rul.rullet + ' px for at nå det sidste');
    const gr = await tjekGrupper(side, n + ' forside');
    maal.push(n + ' forside: højst ' + gr.iRaekke + ' kort pr. række');
    await tjekLayout(side, n + ' forside');
    await foto(side, n + '-former-forside');

    // Fremskridtet med timer-pillen: boller har 16 trin, og timeren fra trin 8 kører på trin 9 og er færdig på trin 13
    if (sk.viewport.width <= 760) {
      for (const [nr, slutOm, hvad] of [[9, 25 * 60000, 'kører'], [13, -1000, 'er færdig']]) {
        await medGemt(side, { timer: { ret: 'boller', nr: 8, sek: 1800, slutOm } }, '#/ret/boller/trin/' + nr);
        await side.waitForSelector('.trin .topbar .pille:not([hidden])');
        const top = await topbarMaal(side);
        const hvor = n + ' boller trin ' + nr + ' (timeren ' + hvad + ')';
        tjek(top.mindsteStreg >= 10, hvor + ': fremskridtets streger skal være mindst 10 px brede (' + top.mindsteStreg + ' px)');
        tjek(!top.overlap, hvor + ': fremskridtet ligger ind over pillen (fremskridt ' + top.frem + ', pille ' + top.pille + ')');
        maal.push(hvor + ': mindste streg ' + top.mindsteStreg + ' px');
        await tjekLayout(side, hvor, { knapperSes: true });
        if (nr === 9) await foto(side, n + '-former-pille');
        // Uden :has (iOS under 15.4) står pillen ved siden af fremskridtet, og «Tiden er gået» fylder for meget: dér viser
        // pillen «0:00». Reglen står i @supports not selector(:has(*)) og må ikke gælde her, hvor WebKit kan :has.
        // Den prøves ved at lægge dens regler ind i arket uden @supports og tage dem ud igen
        if (nr === 13) {
          const u = await side.evaluate(() => {
            const vist = () => [...document.querySelectorAll('#app > .skaerm:not([data-gammel]) .topbar .pille > span')]
              .filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent.trim()).join(' + ');
            let regel = null;
            let ark = null;
            for (const a of document.styleSheets) {
              for (const r of a.cssRules) if (r instanceof CSSSupportsRule && /not\s*\(?\s*selector\(\s*:has\(/.test(r.conditionText)) { regel = r; ark = a; }
            }
            const ud = { kanHas: CSS.supports('selector(:has(*))'), medHas: vist(), regel: !!regel, udenHas: null };
            if (regel) {
              const n = ark.cssRules.length;
              for (const r of regel.cssRules) ark.insertRule(r.cssText, ark.cssRules.length);
              ud.udenHas = vist();
              while (ark.cssRules.length > n) ark.deleteRule(ark.cssRules.length - 1);
            }
            return ud;
          });
          tjek(u.kanHas && u.medHas === 'Tiden er gået', hvor + ': med :has skal pillen sige «Tiden er gået» ' + JSON.stringify(u));
          tjek(u.regel && u.udenHas === '0:00', hvor + ': uden :has (iOS under 15.4) skal pillen vise «0:00» (@supports not selector(:has(*))) ' + JSON.stringify(u));
        }
      }
    }

    // Retten med og uden «Fortsæt»: knapperne kan ses uden at rulle, og «Fortsæt» står først, over de andre.
    // På langs er der kun højde til én række knapper: dér står «Fortsæt» til højre som på iPad (og fra 901 px).
    // Kødsovs har 12 ingredienser: på 768×1024 lå print og «Start forfra» under kanten. Pizzasnegle har den længste
    // liste (15) og den længste «personer og tid». «Fortsæt» står ved det næstsidste trin, så kødsovs (13 trin) og
    // pizzasnegle (23) har to cifre, som den bredeste «Fortsæt»
    let mindst = null; // den mindste luft mellem personer og tid og bunden på langs (skrives ud som måling)
    const noterLuft = (meta, hvor) => { if (!mindst || meta.bundTop - meta.bund < mindst.luft) mindst = { luft: meta.bundTop - meta.bund, hvor }; };
    for (const ret of RET_FORMER) {
      for (const fortsaet of [false, true]) {
        await medGemt(side, { sidste: fortsaet ? { ret, nr: ret === 'pandekager' ? 7 : RETTER[ret].recipeInstructions.length - 1 } : null }, '#/ret/' + ret);
        await side.waitForSelector(fortsaet ? '.ret .fortsaet' : '.ret .start');
        const hvor = n + ' ret ' + ret + (fortsaet ? ' med Fortsæt' : '');
        await tjekLayout(side, hvor, { knapperSes: true });
        // Lange sammensatte ord deles med bindestreg som på forsidens kort (før blev de brudt midt i ordet uden streg)
        const deling = await side.evaluate(() => ['.ret-titel h1', '.ingr-navn'].map((s) => {
          const cs = getComputedStyle(document.querySelector('#app > .skaerm:not([data-gammel]) ' + s));
          return s + ': ' + (cs.hyphens || cs.webkitHyphens);
        }));
        tjek(deling.every((d) => d.endsWith(': auto')), hvor + ': lange ord skal deles med bindestreg (' + deling.join(', ') + ')');
        if (ipadKolonner) tjek(await kolonner('.ret-indhold') === 2, hvor + ': billedet og ingredienserne skal stå i to kolonner som på iPad (' + await kolonner('.ret-indhold') + ')');
        // Billedet, navnet og personer og tid ses ved første visning på alle skærme (på 844×390 lå linjen halvt under
        // bunden, og på 901×800 og 744×1133 lå pizzasneglenes under den)
        await side.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth)); // billedet giver højden
        await retHoved(side, hvor);
        if (lav) {
          // På langs er bunden én række, og navnet står over den (667×375 fik iPhone-bunden: 179 px = 48 %, navnet under den)
          const navn = await modBund(side, '.ret-titel h1');
          tjek(navn.hoejde <= navn.H * 0.25, hvor + ': bunden fylder ' + navn.hoejde + ' af ' + navn.H + ' px (højst 25 %)');
          noterLuft(await modBund(side, '.meta'), hvor);
          // Knapperne står på én række (de er centreret lodret, så rækken tælles på midten: print er lavere end «Start»).
          // Luften i rækken (skubbet mellem knapperne) skrives ud: WebKit på Windows tegner med Trebuchet MS, iPhonen med
          // ui-rounded, så bredderne her er kun omtrentlige
          const raekke = await side.evaluate(() => {
            const h = document.querySelector('#app > .skaerm:not([data-gammel]) .handlinger');
            const k = [...h.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.getBoundingClientRect());
            const skub = h.querySelector('.skub');
            return { raekker: new Set(k.map((b) => Math.round((b.top + b.bottom) / 2))).size, luft: skub ? Math.round(skub.getBoundingClientRect().width) : null };
          });
          tjek(raekke.raekker === 1, hvor + ': bunden på langs skal være én række knapper (' + raekke.raekker + ' rækker)');
          maal.push(hvor + ': luft i bundens række ' + raekke.luft + ' px');
        }
        if (fortsaet) {
          // Tab-rækkefølgen: «Fortsæt» er den første knap i bunden (før kom den efter print og «Start forfra», selvom den stod øverst),
          // og uden for «på langs» følger Tab knapperne, som de står. På langs står «Fortsæt» til højre som «Næste»
          const r = await side.evaluate(() => [...document.querySelectorAll('#app > .skaerm:not([data-gammel]) .handlinger button')].map((b) => {
            const k = b.getBoundingClientRect();
            return { navn: b.classList.contains('fortsaet') ? 'Fortsæt' : b.classList.contains('forfra') ? 'Start forfra' : 'Print', top: Math.round(k.top), bund: Math.round(k.bottom), venstre: Math.round(k.left) };
          }));
          const tab = r.map((x) => x.navn).join(' → ');
          tjek(r[0].navn === 'Fortsæt', hvor + ': «Fortsæt» skal være den første knap i bunden med Tab (' + tab + ')');
          if (!fortsaetHoejre) {
            const ses = [...r].sort((a, b) => (a.top < b.bund && b.top < a.bund ? a.venstre - b.venstre : a.top - b.top)).map((x) => x.navn).join(' → ');
            tjek(ses === tab, hvor + ': Tab skal følge knapperne, som de står (Tab ' + tab + ', ses ' + ses + ')');
          } else {
            const v = Object.fromEntries(r.map((x) => [x.navn, x.venstre]));
            tjek(v['Fortsæt'] > v['Start forfra'], hvor + ': på langs og fra 901 px skal «Fortsæt» stå til højre for «Start forfra» ' + JSON.stringify(v));
          }
        }
        if (fortsaet && !fortsaetHoejre) {
          const k = await side.evaluate(() => Object.fromEntries(['.fortsaet', '.forfra', '.print-knap']
            .map((s) => { const b = document.querySelector('.handlinger ' + s).getBoundingClientRect(); return [s, { top: Math.round(b.top), bund: Math.round(b.bottom), bredde: Math.round(b.width) }]; })));
          tjek(k['.fortsaet'].bund <= Math.min(k['.forfra'].top, k['.print-knap'].top) + 1, hvor + ': «Fortsæt» skal stå først, over de andre knapper ' + JSON.stringify(k));
          tjek(k['.fortsaet'].bredde > k['.forfra'].bredde, hvor + ': «Fortsæt» skal være bredere end «Start forfra» ' + JSON.stringify(k));
        }
        await foto(side, n + '-former-ret-' + ret + (fortsaet ? '-fortsaet' : ''));
        await tabIBunden(side, hvor);
        // Den sidste ingrediens med fokus (Tab, VoiceOver) rulles op over den faste bund, ikke ind under den
        await side.evaluate(() => {
          window.scrollTo(0, 0);
          const a = [...document.querySelectorAll('#app > .skaerm:not([data-gammel]) .ret-indhold .ingr')];
          a[a.length - 1].focus();
        });
        await vent(150);
        const sidst = await side.evaluate(() => {
          const a = [...document.querySelectorAll('#app > .skaerm:not([data-gammel]) .ret-indhold .ingr')];
          return { knap: Math.round(a[a.length - 1].getBoundingClientRect().bottom), bund: Math.round(document.querySelector('#app > .skaerm:not([data-gammel]) .handlinger').getBoundingClientRect().top) };
        });
        tjek(sidst.knap <= sidst.bund, hvor + ': den sidste ingrediens med fokus ligger under den faste bund (knappens bund ' + sidst.knap + ' > bundens top ' + sidst.bund + ')');
      }
    }

    // De øvrige retter på de laveste iPhones på langs, iPad mini på højkant og de smalle desktopvinduer: billedet, navnet
    // og personer og tid står også over den faste bund, med og uden «Fortsæt». På 667×375 brydes «personer og tid» på to
    // linjer for pizzasnegle, brownie og blondie, og med et billede på 22svh lå den anden linje 18 px under bunden.
    // Kun målingen her: resten af retten er tjekket ovenfor
    if (RET_ALLE_PAA.includes(n)) {
      for (const ret of index.filter((r) => !RET_FORMER.includes(r))) {
        for (const fortsaet of [false, true]) {
          await medGemt(side, { sidste: fortsaet ? { ret, nr: RETTER[ret].recipeInstructions.length - 1 } : null }, '#/ret/' + ret);
          await side.waitForSelector(fortsaet ? '.ret .fortsaet' : '.ret .start');
          await side.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth)); // billedet giver højden
          const hvor = n + ' ret ' + ret + (fortsaet ? ' med Fortsæt' : '');
          await retHoved(side, hvor);
          if (lav) noterLuft(await modBund(side, '.meta'), hvor);
        }
      }
    }
    if (mindst) maal.push(n + ' ret: mindst ' + mindst.luft + ' px luft mellem personer og tid og bunden (' + mindst.hvor + ')');

    // Trinene: «Næste» kan ses uden at rulle, også på langs (et almindeligt trin, et voksen-trin med timer, en lang note)
    for (const [ret, nr] of [['pandekager', 3], ['pandekager', 10], ['boller', 9]]) {
      // Den gamle skærm mærkes: adressen skifter med det samme, men skærmen først ved hashchange, og et trin ligner et andet.
      // Uden mærket målte testen det forrige trin (rullet af fokus-tjekket nedenfor) og tog billede af det
      const hash = '#/ret/' + ret + '/trin/' + nr;
      await side.evaluate((h) => { document.querySelector('#app > .skaerm').dataset.gammel = '1'; location.hash = h; }, hash);
      await side.waitForFunction(() => !!document.querySelector('#app > .trin:not([data-gammel]) h1') && [...document.images].every((i) => i.complete && i.naturalWidth));
      await tjekLayout(side, n + ' ' + ret + ' trin ' + nr, { knapperSes: true });
      if (ipadKolonner) tjek(await kolonner('.scene') === 2, n + ' ' + ret + ' trin ' + nr + ': billedet og teksten skal stå i to kolonner som på iPad (' + await kolonner('.scene') + ')');
      // Billedet ses også uden at rulle: det står over den faste bund (på langs lå det midt i en høj tekstkolonne)
      const bil = await side.evaluate(() => ({
        rul: Math.round(window.scrollY),
        billede: Math.round(document.querySelector('.verbum-ramme').getBoundingClientRect().bottom),
        bund: Math.round(document.querySelector('.handlinger').getBoundingClientRect().top),
      }));
      tjek(bil.rul === 0 && bil.billede <= bil.bund, n + ' ' + ret + ' trin ' + nr + ': billedet skal ses over bunden uden at rulle ' + JSON.stringify(bil));
      // … og det samme gør trinteksten (på 667×375 lå den under bunden)
      const tekst = await modBund(side, '#trin-tekst');
      tjek(tekst.bund <= tekst.bundTop, n + ' ' + ret + ' trin ' + nr + ': trinteksten skal ses over bunden uden at rulle ' + JSON.stringify(tekst));
      // På langs kan «Læs op» også ses uden at rulle: børnene kan ikke læse trinnet selv (på 844×390 lå den under bunden)
      if (lav) {
        const laes = await modBund(side, '.laes-op');
        tjek(laes.bund <= laes.bundTop, n + ' ' + ret + ' trin ' + nr + ': «Læs op» skal ses over bunden uden at rulle ' + JSON.stringify(laes));
      }
      if (nr === 10) await foto(side, n + '-former-trin-10');
      if (nr === 10) {
        // strong er et flex-element (en blok), så linjerne tælles på teksten: én kasse pr. linje
        const linjer = await side.evaluate(() => {
          const r = document.createRange();
          r.selectNodeContents(document.querySelector('.voksen-maerke strong'));
          return new Set([...r.getClientRects()].filter((k) => k.width > 0).map((k) => Math.round(k.top))).size;
        });
        tjek(linjer === 1, n + ' pandekager trin 10: «Hent en voksen» skal stå på én linje (' + linjer + ' linjer)');
      }
      // Når «Start timer» får fokus (Tab, VoiceOver), skal den rulles op over den faste bund, ikke blive liggende under den
      if (nr === 10) {
        await side.evaluate(() => window.scrollTo(0, 0));
        await side.locator('.timer-start').focus();
        await vent(100);
        const f = await side.evaluate(() => ({
          knap: Math.round(document.querySelector('.timer-start').getBoundingClientRect().bottom),
          bund: Math.round(document.querySelector('.handlinger').getBoundingClientRect().top),
        }));
        tjek(f.knap <= f.bund, n + ' pandekager trin 10: «Start timer» med fokus ligger under den faste bund (knappens bund ' + f.knap + ' > bundens top ' + f.bund + ')');
      }
      await tabIBunden(side, n + ' ' + ret + ' trin ' + nr);
    }

    // Kører en anden timer (sovsen på trin 8), er «Start timer» på trin 10 falmet med en forklaring under sig.
    // Får knappen fokus, skal forklaringen også ses over den faste bund (på 390 px lå den under bunden)
    await medGemt(side, { timer: { ret: 'koedsovs', nr: 8, sek: 1200, slutOm: 15 * 60000 } }, '#/ret/koedsovs/trin/10');
    await side.waitForSelector('.timer.optaget .timer-optaget');
    await side.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
    await side.evaluate(() => window.scrollTo(0, 0));
    if (lav) {
      // Voksen-trinnet med timer og note er det højeste: «Læs op» står stadig over bunden
      const laes = await modBund(side, '.laes-op');
      tjek(laes.bund <= laes.bundTop, n + ' kødsovs trin 10: «Læs op» skal ses over bunden uden at rulle ' + JSON.stringify(laes));
      await foto(side, n + '-former-koedsovs-10');
    }
    await side.locator('.timer-start').focus();
    await vent(150);
    const optaget = await modBund(side, '.timer-optaget');
    tjek(optaget.bund <= optaget.bundTop, n + ' kødsovs trin 10 (en anden timer kører): forklaringen under «Start timer» med fokus ligger under den faste bund ' + JSON.stringify(optaget));

    // Færdig-skærmen: «Læs op» og «Til forsiden» kan ses uden at rulle (på 844×390 lå de under kanten), og konfettien
    // holder stadig afstand til teksten. Uden bevægelse står konfettien med det samme, hvor den ellers lander
    await side.emulateMedia({ reducedMotion: 'reduce' });
    await medGemt(side, {}, '#/ret/boller/faerdig');
    await side.waitForSelector('.faerdig h1');
    await side.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
    await tjekLayout(side, n + ' færdig');
    const fk = await side.evaluate(() => ({ H: innerHeight, knapper: [...document.querySelectorAll('.faerdig .status-knapper .knap')].map((k) => Math.round(k.getBoundingClientRect().bottom + window.scrollY)) }));
    tjek(fk.knapper.length === 2 && fk.knapper.every((b) => b <= fk.H), n + ' færdig: «Læs op» og «Til forsiden» skal kunne ses uden at rulle ' + JSON.stringify(fk));
    const afstand = await konfettiAfstand(side);
    tjek(afstand >= 16, n + ' færdig: konfettien skal holde mindst 16 px fra overskriften og teksten (nærmeste: ' + afstand + ' px)');
    await foto(side, n + '-former-faerdig');
    await side.emulateMedia({ reducedMotion: null });
    tjek(side.fejl.length === 0, n + ' (skærmformer): ' + side.fejl.join(' | '));
    await ctx.close();
  }
}

// E2E_DELE=hele,print,tastatur,timer,fejl,beroering,former (standard: alle) og E2E_SKAERME=ipad,iphone,desktop (standard: alle)
// «former» kører på sine egne skærme (FORMER) og ser bort fra E2E_SKAERME
const DELE = (process.env.E2E_DELE || 'hele,print,tastatur,timer,fejl,beroering,former').split(',').map((x) => x.trim()).filter(Boolean);
const VALGTE = SKAERME.filter((s) => !process.env.E2E_SKAERME || process.env.E2E_SKAERME.split(',').includes(s.navn));
const KOERSEL = [];
for (const s of VALGTE) if (DELE.includes('hele')) KOERSEL.push(['hele vejen ' + s.navn, (b) => heleVejen(b, s)]);
for (const s of VALGTE) if (DELE.includes('print')) KOERSEL.push(['print ' + s.navn, (b) => print(b, s)]);
if (DELE.includes('tastatur')) KOERSEL.push(['tastatur', (b) => tastatur(b, SKAERME[2])]);
if (DELE.includes('timer')) KOERSEL.push(['timere', (b) => timere(b, SKAERME[0])]);
if (DELE.includes('timer')) KOERSEL.push(['timeren rulles frem', (b) => timerFrem(b)]);
if (DELE.includes('fejl')) KOERSEL.push(['fejltilstande', (b) => fejltilstande(b, SKAERME[0])]);
if (DELE.includes('beroering')) KOERSEL.push(['berøring', (b) => beroering(b, SKAERME[0])]);
if (DELE.includes('former')) KOERSEL.push(['skærmformer', (b) => former(b)]);

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
maal.push(cspSprunget + ' CSP-beskeder fra Playwrights eget <style> ved skærmbilleder er ikke talt som fejl (se foto())');
console.log('\n' + antalTjek + ' tjek (' + KOERSEL.map((k) => k[0]).join(', ') + ') i ' + Math.round((Date.now() - start) / 1000) + ' s · skærmbilleder i ' + UD);
if (maal.length) console.log(maal.length + ' målinger (ikke fejl):\n  - ' + maal.slice(0, 40).join('\n  - '));
if (fejl.length) {
  console.log(fejl.length + ' FEJL:\n  - ' + fejl.join('\n  - '));
  process.exit(1);
}
console.log('Alle tjek er grønne.');
