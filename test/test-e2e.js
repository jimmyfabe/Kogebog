// test-e2e.js — går hele vejen i en rigtig browser (Playwright, WebKit = Safaris motor) på tre skærme:
// iPad på langs (1180×820, børnenes standard), iPhone (390×844) og desktop (1280×800).
// Forside → pandekager → alle trin (med en timer og voksen-hold) → færdig, alle trin i alle 5 retter,
// print-siden for alle 5 retter, tastatur, fejltilstande og «mindre bevægelse».
// Tjekker hele vejen: ingen konsolfejl, ingen 404, ingen vandret rulning, knapper mindst 48 px, billeder indlæst.
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

  window.__toner = 0;
  window.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() { window.__toner++; }, stop() {} }; }
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

const foto = (side, navn) => side.screenshot({ path: path.join(UD, navn + '.png') });

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
    return { bred: document.documentElement.scrollWidth, vindue: W, udenfor: udenfor.slice(0, 6), smaa, smaaBoern, underKanten, billeder, udenAlt };
  }, { boern: BOERNEKNAPPER, skaermknapper: SKAERMKNAPPER });
  tjek(r.bred <= r.vindue, hvor + ': vandret rulning (' + r.bred + ' > ' + r.vindue + ')');
  tjek(!r.udenfor.length, hvor + ': indhold uden for skærmen i siden: ' + r.udenfor.join(', '));
  tjek(!r.smaa.length, hvor + ': knapper under 48 px: ' + r.smaa.join(', '));
  tjek(!r.smaaBoern.length, hvor + ': børneknapper under 64 px: ' + r.smaaBoern.join(', '));
  if (knapperSes) tjek(!r.underKanten.length, hvor + ': knapperne nederst kræver rulning: ' + r.underKanten.join(', '));
  else if (r.underKanten.length) maal.push(hvor + ': rul for at nå ' + r.underKanten.join(', '));
  tjek(!r.billeder.length, hvor + ': billeder ikke indlæst: ' + r.billeder.join(', '));
  tjek(!r.udenAlt.length, hvor + ': billeder uden alt: ' + r.udenAlt.join(', '));
}

async function sidsteTale(side) {
  return side.evaluate(() => (window.__tale[window.__tale.length - 1] || {}).tekst || '');
}

async function tryk(side, sel) {
  await vent(SPAERRE);
  await side.locator(sel).first().click();
}

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

// ---------- Hele vejen med pandekager ----------
async function heleVejen(browser, skaerm) {
  const n = skaerm.navn;
  console.log('[' + n + '] forside → pandekager → færdig');
  const { ctx, side } = await nySide(browser, skaerm);
  await side.goto(BASE + '/index.html?hurtig=1');
  await side.waitForSelector('.kort[data-ret]');
  tjek(await side.locator('.kort[data-ret]').count() === index.length, n + ': forsiden skal have ' + index.length + ' kort');
  await tjekLayout(side, n + ' forside');
  await foto(side, n + '-1-forside');

  // Første tryk siger navnet, andet åbner
  await tryk(side, '.kort[data-ret="pandekager"]');
  tjek(await side.locator('.kort.valgt[data-ret="pandekager"]').count() === 1, n + ': første tryk skal markere kortet');
  tjek((await sidsteTale(side)).startsWith('Pandekager'), n + ': første tryk skal sige navnet');
  const stemme = await side.evaluate(() => window.__tale[window.__tale.length - 1]);
  tjek(stemme.lang === 'da-DK' && stemme.stemme === 'da-DK', n + ': oplæsning skal være da-DK med den danske stemme, fik ' + JSON.stringify(stemme));
  if (n === 'ipad') await foto(side, n + '-2-forside-valgt');
  await tryk(side, '.kort[data-ret="pandekager"]');
  await side.waitForSelector('.ret h1');
  tjek(await h1(side) === 'Pandekager', n + ': retten skal hedde Pandekager');
  tjek(await side.locator('.ingr').count() === RETTER.pandekager.recipeIngredient.length, n + ': alle ingredienser skal vises');
  await tjekLayout(side, n + ' ret', { knapperSes: n !== 'iphone' });
  await foto(side, n + '-3-ret');
  await tryk(side, '.ingr');
  tjek(await sidsteTale(side) === tilTale(RETTER.pandekager.recipeIngredient[0]), n + ': tryk på en ingrediens læser den op');

  // Trinene
  await tryk(side, '.start');
  const trin = RETTER.pandekager.recipeInstructions;
  for (let i = 0; i < trin.length; i++) {
    const nr = i + 1;
    const t = trin[i];
    await side.waitForFunction((x) => location.hash === '#/ret/pandekager/trin/' + x, nr, { timeout: 5000 }).catch(() => {});
    tjek(await h1(side) === t.text, n + ' trin ' + nr + ': teksten skal være «' + t.text + '», var «' + (await h1(side)) + '»');
    const voksen = t.tumbi.voksen === true;
    tjek(await sidsteTale(side) === tilTale((voksen ? 'Hent en voksen. ' : '') + t.text), n + ' trin ' + nr + ': trykket læser trinnet op');
    tjek((await side.locator('.voksen-maerke').count() === 1) === voksen, n + ' trin ' + nr + ': «Hent en voksen» skal ' + (voksen ? '' : 'ikke ') + 'vises');
    await tjekLayout(side, n + ' trin ' + nr, { knapperSes: n !== 'iphone' });
    if ([1, 3, 10, 12].includes(nr)) await foto(side, n + '-4-trin-' + nr);

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
      await venterPaa(side, () => !!document.querySelector('.pille.faerdig'), null, n + ': pillen skal vise, at tiden er gået');
      const lyd = await side.evaluate(() => ({ toner: window.__toner, laas: window.__laas }));
      tjek(lyd.toner >= 3, n + ': der skal spilles tre toner ved slut (fik ' + lyd.toner + ')');
      tjek(lyd.laas.sluppet === 1 && lyd.laas.aktive === 0, n + ': wakeLock skal slippes, når timeren er slut ' + JSON.stringify(lyd.laas));
      if (n === 'ipad') await foto(side, n + '-6-pille-faerdig');
      await tryk(side, '.pille');
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
      await tryk(side, '.naeste');
      await vent(150);
      tjek(side.url().endsWith('/trin/' + nr), n + ' trin ' + nr + ': et kort tryk må ikke gå videre ved voksen-hjælp');
      tjek((await sidsteTale(side)).startsWith('Hent en voksen'), n + ' trin ' + nr + ': et kort tryk siger «Hent en voksen»');
      await hold(side, '.naeste');
    } else {
      await tryk(side, '.naeste');
    }
  }
  await side.waitForSelector('.faerdig h1');
  tjek(await h1(side) === 'Færdig!', n + ': færdig-skærmen');
  tjek((await sidsteTale(side)).startsWith('Færdig!'), n + ': færdig-skærmen siger «Færdig!»');
  await tjekLayout(side, n + ' færdig');
  await vent(2800); // konfettien er landet
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
      await tjekLayout(side, n + ' ' + id + ' trin ' + (i + 1), { knapperSes: n !== 'iphone' });
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
    if (n === 'desktop') {
      await side.emulateMedia({ media: 'print' });
      await side.screenshot({ path: path.join(UD, 'print-' + id + '.png'), fullPage: true });
      const a4 = await side.evaluate(() => document.documentElement.scrollHeight);
      console.log('  print ' + id + ': ' + a4 + ' px høj i printvisning');
      await side.emulateMedia({ media: 'screen' });
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
  await side.keyboard.press('Enter');
  await vent(SPAERRE);
  await side.keyboard.press('Enter');
  await side.waitForSelector('.ret h1');
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
  // Hold med tastaturet: mellemrum i 2 sekunder på et voksen-trin
  await side.evaluate(() => { location.hash = '#/ret/pandekager/trin/10'; });
  await side.waitForSelector('.voksen-hold');
  await side.focus('.voksen-hold');
  await side.keyboard.down(' ');
  await vent(2300);
  await side.keyboard.up(' ');
  await side.waitForFunction(() => location.hash.endsWith('/trin/11')).catch(() => tjek(false, 'tastatur: hold mellemrum i 2 s skal gå videre fra et voksen-trin'));
  tjek(side.fejl.length === 0, 'tastatur: ' + side.fejl.join(' | '));
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

// E2E_DELE=hele,print,tastatur,fejl (standard: alle) og E2E_SKAERME=ipad,iphone,desktop (standard: alle)
const DELE = (process.env.E2E_DELE || 'hele,print,tastatur,fejl').split(',').map((x) => x.trim()).filter(Boolean);
const VALGTE = SKAERME.filter((s) => !process.env.E2E_SKAERME || process.env.E2E_SKAERME.split(',').includes(s.navn));
const KOERSEL = [];
for (const s of VALGTE) if (DELE.includes('hele')) KOERSEL.push(['hele vejen ' + s.navn, (b) => heleVejen(b, s)]);
for (const s of VALGTE) if (DELE.includes('print')) KOERSEL.push(['print ' + s.navn, (b) => print(b, s)]);
if (DELE.includes('tastatur')) KOERSEL.push(['tastatur', (b) => tastatur(b, SKAERME[2])]);
if (DELE.includes('fejl')) KOERSEL.push(['fejltilstande', (b) => fejltilstande(b, SKAERME[0])]);

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
