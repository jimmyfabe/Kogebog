// e2e-skaermfund.js — de visuelle fund fra UI-gennemgangen af næste udgave (05-11-2026), målt på de skærme, de blev set på:
// 1 ugeplanens række uden billede, 2 børnenes sideprikker, 3 «Start timer» over den faste bund, 4 statusskærme på lave
// skærme, 5 rettens højttaler, 6 venstrekanten på 667×375, 7 adskilleren « · » ved linjens kant (også efter en drejning
// fra 667×375 til 932×430), 8 gruppens kolonner og
// 9 «Vælg ret» på lave skærme.
// Del af test-e2e.js: E2E_DELE=skaermfund. E2E_FUND=1,3 begrænser til nogle af fundene, E2E_FUND_SKAERME=se-land,iphone til nogle af skærmene.
import { planMandag } from '../js/tid.js';
import { kod } from '../js/plankode.js';

const FUND = process.env.E2E_FUND ? process.env.E2E_FUND.split(',').map((x) => x.trim()) : null;
const VALGTE = process.env.E2E_FUND_SKAERME ? process.env.E2E_FUND_SKAERME.split(',').map((x) => x.trim()) : null;
const paa = (navne) => (VALGTE ? navne.filter((n) => VALGTE.includes(n)) : navne);
const nuSkaerm = '#app > .skaerm:not([data-gammel]) ';
const IPLAN = (RETTER) => Object.keys(RETTER).filter((id) => RETTER[id].tumbi.ugeplan === true);

export async function skaermfund(browser, H) {
  const dele = { 1: raekkeUdenBillede, 2: sidePrikker, 3: timerOverBund, 4: statusLave, 5: hoejttaler, 6: venstrekant, 7: adskiller, 8: gruppeKolonner, 9: vaelgRet };
  for (const [nr, del] of Object.entries(dele)) if (!FUND || FUND.includes(nr)) await del(browser, H);
}

const skaerm = (H, navn) => {
  const s = [...H.SKAERME, ...H.FORMER].find((x) => x.navn === navn);
  if (!s) throw new Error('Ukendt skærm: ' + navn);
  return s;
};

// Forsiden i en ny side uden service worker. lager: { nøgle: værdi }, der ligger i localStorage, før appen tegner
async function aabn(browser, H, navn, { lager = null, hash = '', foer = null } = {}) {
  const { ctx, side } = await H.nySide(browser, skaerm(H, navn), { serviceWorkers: 'block' });
  if (foer) await foer(ctx);
  if (lager) await ctx.addInitScript((l) => { for (const [k, v] of Object.entries(l)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, lager);
  await side.goto(H.BASE + '/index.html' + hash);
  await side.waitForSelector('#app > .skaerm');
  return { ctx, side };
}

// Skift adresse og vent på den nye skærm (uden genindlæsning). WebKit afviser over ca. 200 skift pr. 10 s: derfor pausen
async function gaa(side, hash, klar, vent) {
  await side.evaluate((h) => {
    if (location.hash === h) return;
    const s = document.querySelector('#app > .skaerm');
    if (s) s.dataset.gammel = '1';
    location.hash = h;
  }, hash);
  await side.waitForSelector(nuSkaerm + klar, { timeout: 15000 });
  await vent(60);
}

// Nyt dokument, når der er skiftet adresse mange gange
async function frisk(side) {
  await side.reload();
  await side.waitForSelector('#app > .skaerm');
}

// To billeder frem: det, appen retter efter layoutet (ResizeObserver), er sket
const tegnet = (side) => side.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

// ---------- 1. Ugeplanens række uden billede ----------
// Rækken uden billede havde teksten i billedets kolonne (64-84 px): «Ukend | t ret», og «internetforbindelsen.» løb ud
async function raekkeUdenBillede(browser, H) {
  const { RETTER, tjek, foto, vent, maal } = H;
  const ude = Object.keys(RETTER).find((id) => RETTER[id].tumbi.ugeplan !== true);
  const plan = (ret, n = 4) => ({ ret, af: 'bo', n });
  const uge = JSON.stringify({ v: 1, uge: planMandag(new Date()), dage: [plan('koedsovs'), plan(ude), plan('tunfrikadeller'), null, null, null, null], n: 4, prBarn: 1, rettet: Date.now() });
  for (const n of paa(['iphone', 'ipad', 'desktop', 'se-land', 'land', 'x-land', 'w360', 'tablet'])) {
    console.log('[' + n + '] fund 1: ugeplanens række uden billede');
    const { ctx, side } = await aabn(browser, H, n, { lager: { 'kog-uge-v1': uge } });
    await side.route('**/opskrifter/koedsovs.json*', (r) => r.abort());
    await side.reload();
    await side.waitForSelector('.gruppe-knap');
    await gaa(side, '#/uge', '.uge-dage .dag-meta', vent);
    await side.waitForFunction(() => document.querySelector('.dag-billede') && /internetforbindelsen/.test(document.querySelector('.uge-dage').textContent), null, { timeout: 10000 });
    const r = await side.evaluate(() => [...document.querySelectorAll('.dag:not(.fri)')].map((d) => {
      const ret = d.querySelector('.dag-ret');
      const rk = d.getBoundingClientRect();
      const k = ret.getBoundingClientRect();
      const hoved = d.querySelector('.dag-hoved').getBoundingClientRect();
      const knapper = d.querySelector('.dag-knapper').getBoundingClientRect();
      // Det, teksten kan bruge: rækken minus dagens hoved til venstre og knapperne til højre, hvis de står ved siden af
      const fra = hoved.bottom > k.top + 1 ? hoved.right : rk.left;
      const til = knapper.top < k.bottom - 1 ? knapper.left : rk.right;
      const delt = [];
      const ude = [];
      const w = document.createTreeWalker(ret, NodeFilter.SHOW_TEXT);
      for (let t; (t = w.nextNode());) {
        const rng = document.createRange();
        rng.selectNodeContents(t);
        for (const x of rng.getClientRects()) if (x.width && (x.right > til + 0.5 || x.left < fra - 0.5)) ude.push(t.data.slice(0, 24));
        for (const m of t.data.matchAll(/[^\s]+/g)) {
          let forrige = null;
          for (let i = m.index; i < m.index + m[0].length; i++) {
            if (t.data[i] === '­') continue;
            rng.setStart(t, i);
            rng.setEnd(t, i + 1);
            const b = rng.getBoundingClientRect();
            if (forrige != null && b.top > forrige + 5 && !/[-­]/.test(t.data[i - 1])) delt.push(m[0]);
            forrige = b.top;
          }
        }
      }
      return { dag: d.dataset.dag, billede: Boolean(d.querySelector('.dag-billede')), bredde: Math.round(k.width), ledig: Math.round(til - fra), hoejde: Math.round(rk.height), delt, ude };
    }));
    for (const x of r.filter((y) => !y.billede)) {
      const hvor = n + ' ugeplanens række uden billede (dag ' + x.dag + ')';
      tjek(x.bredde >= 0.85 * x.ledig, hvor + ': teksten skal bruge rækkens bredde (' + x.bredde + ' af ' + x.ledig + ' px)');
      tjek(!x.delt.length, hvor + ': ord delt uden tegn: ' + x.delt.join(', '));
      tjek(!x.ude.length, hvor + ': tekst uden for rækken eller ind over knapperne: ' + x.ude.join(', '));
    }
    tjek(r.filter((y) => !y.billede).length === 2, n + ': to rækker uden billede (' + JSON.stringify(r) + ')');
    tjek(r.filter((y) => y.billede).length === 1, n + ': rækken med billede står der stadig');
    maal.push(n + ' række uden billede: ' + r.map((x) => (x.billede ? 'med ' : 'uden ') + x.bredde + '/' + x.ledig + ' px, ' + x.hoejde + ' høj').join(' · '));
    await side.evaluate(() => document.querySelector('.uge-dage').scrollIntoView({ block: 'start' }));
    await foto(side, n + '-fund1-raekke');
    await ctx.close();
  }
}

// ---------- 2. Børnenes sideprikker ----------
// 21 prikker i en række på 198 px blev 4×16 px. Prikkerne er pynt: siden siges i aria-label, og pilene er knapperne
async function sidePrikker(browser, H) {
  const { RETTER, tjek, foto, tryk, vent, maal } = H;
  const sider = Math.ceil(IPLAN(RETTER).length / 4);
  for (const n of paa(['iphone', 'ipad', 'se-land', 'land', 'w360'])) {
    console.log('[' + n + '] fund 2: børnenes sideprikker');
    const { ctx, side } = await aabn(browser, H, n);
    await gaa(side, '#/uge/vaelg/rosa', '.ret-gitter', vent);
    const prikker = () => side.evaluate(() => {
      const p = document.querySelector('.side-prikker');
      const b = p.getBoundingClientRect();
      const s = [...p.querySelectorAll('span')].map((e) => ({ r: e.getBoundingClientRect(), nu: e.classList.contains('nu') }));
      const pile = [...document.querySelectorAll('.side-knap:not(.usynlig)')].map((e) => e.getBoundingClientRect());
      return {
        antal: s.length,
        ikkeRunde: s.filter((x) => Math.abs(x.r.width - x.r.height) > 0.5).map((x) => x.r.width.toFixed(1) + '×' + x.r.height.toFixed(1)),
        smaa: s.filter((x) => x.r.width < 8).length,
        nu: s.findIndex((x) => x.nu),
        antalNu: s.filter((x) => x.nu).length,
        ude: s.filter((x) => x.r.left < b.left - 0.5 || x.r.right > b.right + 0.5 || pile.some((k) => x.r.left < k.right && k.left < x.r.right && x.r.top < k.bottom && k.top < x.r.bottom)).length,
        navn: p.getAttribute('aria-label'),
      };
    });
    // Side 1, en side midt i og den sidste. På iPhone hele vejen; ellers kun de to første
    const antalTryk = n === 'iphone' ? sider - 1 : 1;
    for (let nr = 1; nr <= antalTryk + 1; nr++) {
      const p = await prikker();
      const hvor = n + ' børnenes retter side ' + nr + ' af ' + sider;
      tjek(!p.ikkeRunde.length, hvor + ': prikkerne skal være runde: ' + p.ikkeRunde.slice(0, 3).join(', ') + ' (' + p.antal + ' prikker)');
      tjek(!p.smaa, hvor + ': ' + p.smaa + ' prikker er under 8 px');
      tjek(!p.ude, hvor + ': ' + p.ude + ' prikker står uden for rækken eller ind over en pil');
      tjek(p.antalNu === 1, hvor + ': præcis én fyldt prik (' + p.antalNu + ')');
      tjek(p.navn === 'Side ' + nr + ' af ' + sider, hvor + ': skærmlæseren siger siden (' + p.navn + ')');
      if (nr === 1) maal.push(n + ' prikker: ' + p.antal + ' stk. for ' + sider + ' sider');
      if (nr === 1 || nr === 2 || nr === 11) await foto(side, n + '-fund2-side-' + nr);
      if (nr <= antalTryk) await tryk(side, '.side-naeste');
    }
    await ctx.close();
  }
}

// ---------- 3. «Start timer» over den faste bund ----------
// Alle 373 trin med timer: knappen med sin kant (5 px) skal stå over bunden, før man ruller. Før lå den 23 px under på
// 667×375 og 5 px på 844×390. På iPhone kan en lang note gerne fortsætte under bunden: den kan rulles frem
async function timerOverBund(browser, H) {
  const { RETTER, tjek, foto, vent, maal } = H;
  const trin = [];
  for (const [id, r] of Object.entries(RETTER)) r.recipeInstructions.forEach((t, i) => { if (t.tumbi?.timer_sek) trin.push([id, i + 1]); });
  for (const n of paa(['se-land', 'land', 'x-land', 'iphone', 'w360'])) {
    console.log('[' + n + '] fund 3: «Start timer» på ' + trin.length + ' trin');
    const { ctx, side } = await aabn(browser, H, n);
    let vaerst = null;
    let under = 0;
    let genskabt = 0;
    for (const [id, nr] of trin) {
      if (++genskabt % 150 === 0) await frisk(side); // WebKits grænse for adresseskift i samme dokument
      await gaa(side, '#/ret/' + id + '/trin/' + nr, '.timer-start', vent);
      const r = await side.evaluate((sel) => {
        const s = document.querySelector(sel);
        const k = s.querySelector('.timer-start').getBoundingClientRect();
        const b = s.querySelector('.handlinger').getBoundingClientRect();
        return { rul: Math.round(scrollY), luft: Math.round(b.top - (k.bottom + 5)) };
      }, '#app > .skaerm:not([data-gammel])');
      if (!vaerst || r.luft < vaerst.luft) vaerst = { id, nr, luft: r.luft };
      if (r.luft < 0 || r.rul !== 0) under++;
    }
    tjek(under === 0, n + ': «Start timer» ligger under bunden på ' + under + ' af ' + trin.length + ' trin (værst ' + JSON.stringify(vaerst) + ')');
    maal.push(n + ' «Start timer»: mindst ' + vaerst.luft + ' px luft over bunden (' + vaerst.id + ' trin ' + vaerst.nr + '), under på ' + under);
    await gaa(side, '#/ret/' + vaerst.id + '/trin/' + vaerst.nr, '.timer-start', vent);
    await side.waitForFunction(() => [...document.images].every((i) => i.complete));
    const hoejt = await side.evaluate((sel) => {
      const k = document.querySelector(sel);
      const r = k.getBoundingClientRect();
      return { b: Math.round(r.width), h: Math.round(r.height), navn: k.textContent.trim() };
    }, nuSkaerm + '.laes-op');
    tjek(hoejt.b === hoejt.h && hoejt.navn === 'Læs op', n + ': «Læs op» ved timeren er rund og hedder det stadig ' + JSON.stringify(hoejt));
    await foto(side, n + '-fund3-vaerst');
    await ctx.close();
  }
}

// ---------- 4. Statusskærme på lave skærme ----------
// Figuren på 140 px skar «Genindlæs siden», og «Til forsiden» stod under folden (667×375 og 844×390)
async function statusLave(browser, H) {
  const { tjek, foto, vent, maal } = H;
  for (const n of paa(['se-land', 'land', 'x-land', 'iphone', 'ipad'])) {
    console.log('[' + n + '] fund 4: statusskærme');
    const lav = skaerm(H, n).viewport.height <= 520;
    const { ctx, side } = await aabn(browser, H, n, { lager: { 'kog-familie-v1': JSON.stringify({ v: 2, voksne: 3, boern: 1 }) } });
    await side.waitForSelector('.gruppe-knap');
    await gaa(side, '#/gruppe/favoritter', '.status-knapper .knap', vent);
    await side.waitForFunction(() => [...document.images].every((i) => i.complete));
    const r = await side.evaluate(() => {
      const knapper = [...document.querySelectorAll('.status-knapper .knap')].map((k) => k.getBoundingClientRect());
      const dyr = document.querySelector('.status-dyr').getBoundingClientRect();
      const ud = { H: innerHeight, dyr: Math.round(dyr.width), top: Math.round(document.querySelector('.status-boks').getBoundingClientRect().top), antal: knapper.length, bunde: knapper.map((b) => Math.round(b.bottom + 5)) };
      window.scrollTo(0, document.documentElement.scrollHeight);
      ud.sidsteEfterRul = Math.round(knapper.length ? document.querySelectorAll('.status-knapper .knap')[knapper.length - 1].getBoundingClientRect().bottom + 5 : 0);
      window.scrollTo(0, 0);
      return ud;
    });
    const hvor = n + ' låste favoritter';
    tjek(r.antal === 2, hvor + ': to knapper (' + r.antal + ')');
    tjek(r.top >= 0, hvor + ': overskriften og figuren må ikke skæres øverst ' + JSON.stringify(r));
    tjek(r.bunde[0] <= r.H, hvor + ': «Genindlæs siden» skal ses helt uden at rulle ' + JSON.stringify(r));
    tjek(r.sidsteEfterRul <= r.H, hvor + ': «Til forsiden» skal kunne nås ' + JSON.stringify(r));
    if (lav) tjek(r.dyr <= 90, hvor + ': figuren skal være mindre på en lav skærm (' + r.dyr + ' px)');
    else tjek(r.dyr === 140, hvor + ': figuren er uændret på høje skærme (' + r.dyr + ' px)');
    maal.push(hvor + ': figur ' + r.dyr + ' px, knappernes bund ' + r.bunde.join(', ') + ' af ' + r.H);
    await foto(side, n + '-fund4-favoritter');
    await ctx.close();
    // En ret, der ikke kan hentes, har den længste tekst og også to knapper
    const f = await aabn(browser, H, n);
    await f.side.route('**/opskrifter/koedsovs.json*', (x) => x.abort());
    await frisk(f.side);
    await f.side.waitForSelector('.gruppe-knap');
    await gaa(f.side, '#/ret/koedsovs', '.status-knapper .knap', vent);
    await foto(f.side, n + '-fund4-ret-fejl');
    const fejl = await f.side.evaluate(() => ({ H: innerHeight, bund: Math.round(document.querySelector('.status-knapper .knap').getBoundingClientRect().bottom + 5), top: Math.round(document.querySelector('.status-boks').getBoundingClientRect().top) }));
    tjek(fejl.top >= 0 && fejl.bund <= fejl.H, n + ' ret, der ikke kan hentes: «Prøv igen» skal ses helt uden at rulle ' + JSON.stringify(fejl));
    await f.ctx.close();
  }
}

// ---------- 5. Rettens højttaler ----------
// Højttaleren var ægformet: 64×72 på retter med et langt navn, fordi den kunne skrumpe i rækken ved navnet
async function hoejttaler(browser, H) {
  const { RETTER, tjek, vent, maal } = H;
  const ids = Object.keys(RETTER);
  for (const n of paa(['ipad', 'iphone', 'desktop', 'se-land', 'land', 'x-land'])) {
    console.log('[' + n + '] fund 5: rettens højttaler på ' + ids.length + ' retter');
    const { ctx, side } = await aabn(browser, H, n);
    const maalt = new Set();
    const ikkeRund = [];
    for (let i = 0; i < ids.length; i++) {
      if (i && i % 150 === 0) await frisk(side);
      await gaa(side, '#/ret/' + ids[i], '.ret-titel .stor-rund', vent);
      const k = await side.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { b: Math.round(b.width * 2) / 2, h: Math.round(b.height * 2) / 2 }; }, nuSkaerm + '.ret-titel .stor-rund');
      maalt.add(k.b + '×' + k.h);
      if (Math.abs(k.b - k.h) > 0.5) ikkeRund.push(ids[i]);
    }
    tjek(!ikkeRund.length, n + ': højttaleren er ikke rund på ' + ikkeRund.length + ' retter, fx ' + ikkeRund.slice(0, 3).join(', ') + ' (' + [...maalt].join(', ') + ')');
    tjek(maalt.size === 1, n + ': højttaleren skal have samme størrelse på alle retter (' + [...maalt].join(', ') + ')');
    tjek([...maalt].every((m) => parseFloat(m) >= 64), n + ': højttaleren er børnenes knap: mindst 64 px (' + [...maalt].join(', ') + ')');
    maal.push(n + ' højttaler: ' + [...maalt].join(', '));
    await ctx.close();
  }
}

// ---------- 6. Venstrekanten på 667×375 ----------
// Knappen øverst og indholdet skal starte samme sted: voksendelen havde hus-knappen ved x=24 og indholdet ved x=12, og
// retten tilbage ved x=24 og print ved x=16
async function venstrekant(browser, H) {
  const { tjek, foto, hold, vent, maal } = H;
  const n = 'se-land';
  console.log('[' + n + '] fund 6: venstrekanten');
  const uge = JSON.stringify({ v: 1, uge: planMandag(new Date()), dage: [{ ret: 'koedsovs', af: 'bo', n: 4 }, null, null, null, null, null, null], n: 4, prBarn: 1, rettet: Date.now() });
  const { ctx, side } = await aabn(browser, H, n, { lager: { 'kog-uge-v1': uge } });
  await side.waitForSelector('.voksen-knap');
  await side.locator('.voksen-knap').scrollIntoViewIfNeeded(); // under folden på en lav skærm
  await hold(side, '.voksen-knap');
  await side.waitForSelector('.voksen-menu');
  const SIDER = [
    ['#/voksen', '.voksen-menu', ['.voksen-hoved h1', '.voksen-menu']],
    ['#/voksen/husstand', '.husstand', ['h1', '.husstand']],
    ['#/voksen/udvalg', '.voksen-liste', ['h1', '.voksen-liste']],
    ['#/voksen/favoritter', 'h1', ['h1']],
    ['#/voksen/katalog', '.voksen-liste', ['h1', '.voksen-liste']],
    ['#/uge', '.uge-dage', ['h1', '.uge-dage']],
    ['#/uge/dag/1', '.ret-valg', ['h1', '.ret-valg']],
    ['#/ret/koedsovs', '.start', ['.ret-hoved', '.handlinger > .knap']],
    ['#/ret/koedsovs/trin/2', '.scene', ['.scene', '.handlinger > .knap']],
  ];
  for (const [hash, klar, indhold] of SIDER) {
    await gaa(side, hash, klar, vent);
    const r = await side.evaluate(({ indhold, s }) => {
      const v = (sel) => Math.round(document.querySelector(s + sel).getBoundingClientRect().left);
      return { top: v('.topbar > .knap'), indhold: indhold.map((x) => [x, v(x)]) };
    }, { indhold, s: nuSkaerm });
    const forkert = r.indhold.filter(([, x]) => x !== r.top);
    tjek(!forkert.length, n + ' ' + hash + ': knappen øverst står ved x=' + r.top + ', men ' + forkert.map(([s, x]) => s + ' ved x=' + x).join(', '));
    maal.push(n + ' ' + hash + ': x=' + r.top + ', ' + r.indhold.map(([, x]) => x).join(', '));
    await foto(side, n + '-fund6-' + hash.replace(/\W+/g, '-'));
  }
  await ctx.close();
}

// ---------- 7. Adskilleren « · » ved linjens kant ----------
// Hvor mange linjer i de viste tekster, der starter eller slutter med adskilleren. Det, der ikke fylder (højde 0), ses ikke
const SKILLE = '.meta, .dag-meta, .uge-sum, .uge-nr, .vare-maengde';
const vedKant = (side) => side.evaluate(({ sel, s }) => {
  const ud = [];
  for (const e of document.querySelectorAll(sel.split(', ').map((x) => s + x).join(', '))) {
    if (!e.getClientRects().length) continue;
    const linjer = [];
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    const rng = document.createRange();
    for (let t; (t = w.nextNode());) {
      if (!t.parentElement.getBoundingClientRect().height) continue;
      for (let i = 0; i < t.data.length; i++) {
        rng.setStart(t, i);
        rng.setEnd(t, i + 1);
        const b = rng.getBoundingClientRect();
        if (!b.height) continue;
        const midt = (b.top + b.bottom) / 2;
        let l = linjer.find((x) => Math.abs(x.midt - midt) < 6);
        if (!l) { l = { midt, t: '' }; linjer.push(l); }
        l.t += t.data[i];
      }
    }
    for (const l of linjer) if (/^[\s ]*·|·[\s ]*$/.test(l.t)) ud.push(l.t.replace(/ /g, ' ').trim());
  }
  return ud;
}, { sel: SKILLE, s: nuSkaerm });

async function adskiller(browser, H) {
  const { RETTER, tjek, foto, vent, maal } = H;
  const ids = Object.keys(RETTER);
  const plan = IPLAN(RETTER);
  const mandag = planMandag(new Date());
  const længst = [...plan].sort((a, b) => RETTER[b].name.length - RETTER[a].name.length).slice(0, 7);
  const uge = JSON.stringify({ v: 1, uge: mandag, dage: længst.map((ret) => ({ ret, af: 'bo', n: 4 })), n: 4, prBarn: 1, rettet: Date.now() });
  const familie = JSON.stringify({ v: 1, voksne: 2, boern: 3, barnAndel: 0.7, udvalg: null, favoritter: [], lavet: {}, mereGroent: false });
  for (const n of paa(['se-land', 'land', 'x-land', 'iphone', 'w360', 'ipad', 'desktop'])) {
    console.log('[' + n + '] fund 7: adskilleren ved linjens kant');
    const { ctx, side } = await aabn(browser, H, n, { lager: { 'kog-uge-v1': uge } });
    await side.waitForSelector('.gruppe-knap');
    const fund = [];
    const brudte = []; // retter, hvis personer og tid står i to linjer her (til drejningen nedenfor)
    const se = async (hvor) => { await tegnet(side); for (const t of await vedKant(side)) fund.push(hvor + ': «' + t + '»'); };
    // Alle retter, uden og med skalerede portioner (husstanden gemt: «Til 5 portioner · 40 min»)
    for (const medHusstand of [false, true]) {
      if (medHusstand) await side.evaluate((f) => localStorage.setItem('kog-familie-v1', f), familie);
      for (let i = 0; i < ids.length; i++) {
        if (i && i % 150 === 0) await frisk(side);
        await gaa(side, '#/ret/' + ids[i], '.ret-titel', vent);
        await se('ret ' + ids[i] + (medHusstand ? ' (husstand)' : ''));
        if (!medHusstand && await brudtePrikker(side)) brudte.push(ids[i]);
      }
    }
    await side.evaluate(() => localStorage.removeItem('kog-familie-v1'));
    await gaa(side, '#/uge', '.uge-dage', vent);
    await side.waitForFunction((a) => document.querySelectorAll('.dag:not(.fri) .dag-meta').length === a, 7, { timeout: 20000 });
    await se('ugeplanen');
    await foto(side, n + '-fund7-uge');
    await gaa(side, '#/uge/dag/1', '.ret-valg', vent);
    await side.waitForFunction((a) => document.querySelectorAll('.ret-valg .dag-meta').length === a, plan.length, { timeout: 30000 });
    await se('vælg ret');
    await side.evaluate((h) => { location.hash = h; }, '#/hent/' + kod(mandag, længst.map((ret) => ({ ret, n: 4 }))));
    await side.waitForFunction(() => location.hash === '#/indkoeb' && document.querySelector('.vare-maengde'), null, { timeout: 8000 });
    await se('indkøbslisten');
    tjek(!fund.length, n + ': ' + fund.length + ' linjer starter eller slutter med adskilleren, fx ' + fund.slice(0, 4).join(' | '));
    maal.push(n + ' adskilleren ved kanten: ' + fund.length + ' linjer');
    await ctx.close();
    if (n === 'se-land') await drejet(browser, H, brudte);
  }
}

const brudtePrikker = (side) => side.evaluate((s) => document.querySelectorAll(s).length, nuSkaerm + '.meta .led-skille.brudt');

// Skærmen bliver bredere, fra 667×375 til 932×430, som når en iPad drejes eller Split View ændres (code review 05-11-2026):
// personer og tid skal brydes som efter en frisk indlæsning i 932×430. .meta krymper til sin bredeste linje, så den
// ændrede ikke selv størrelse, og linjen blev stående i to
async function drejet(browser, H, brudte) {
  const { tjek, vent, maal } = H;
  const lav = skaerm(H, 'se-land').viewport;
  const bred = skaerm(H, 'max-land').viewport;
  console.log('[se-land → max-land] fund 7: drejet skærm på ' + brudte.length + ' retter');
  tjek(brudte.length > 0, 'se-land: mindst én ret har personer og tid i to linjer (ellers tester drejningen intet)');
  const f = await aabn(browser, H, 'max-land');
  await f.side.waitForSelector('.gruppe-knap');
  const frisk = {};
  for (const id of brudte) {
    await gaa(f.side, '#/ret/' + id, '.ret-titel', vent);
    await tegnet(f.side);
    frisk[id] = await brudtePrikker(f.side);
  }
  await f.ctx.close();
  const { ctx, side } = await aabn(browser, H, 'se-land');
  await side.waitForSelector('.gruppe-knap');
  const forkert = [];
  for (const id of brudte) {
    await side.setViewportSize(lav);
    await gaa(side, '#/ret/' + id, '.ret-titel', vent);
    await tegnet(side);
    const foer = await brudtePrikker(side);
    await side.setViewportSize(bred);
    await tegnet(side);
    await vent(100);
    await tegnet(side);
    const efter = await brudtePrikker(side);
    if (efter !== frisk[id]) forkert.push(id + ' ' + foer + ' → ' + efter + ' (frisk ' + frisk[id] + ')');
  }
  tjek(!forkert.length, 'se-land → max-land: ' + forkert.length + ' af ' + brudte.length + ' retter har andre brud end efter en frisk indlæsning: ' + forkert.slice(0, 4).join(' | '));
  maal.push('se-land → max-land: ' + brudte.length + ' retter drejet, ' + forkert.length + ' med andre brud end en frisk indlæsning');
  await ctx.close();
}

// ---------- 8. Gruppens kolonner på lave skærme ----------
// Forsiden har tre kolonner fra 736 px på langs. Gruppen under den havde to, indtil der var 868 px
async function gruppeKolonner(browser, H) {
  const { tjek, foto, vent, maal } = H;
  for (const [n, forventet] of [['se-land', 2], ['plus-land', 3], ['x-land', 3], ['land', 3], ['max-land', 3]]) {
    if (!paa([n]).length) continue;
    console.log('[' + n + '] fund 8: gruppens kolonner');
    const { ctx, side } = await aabn(browser, H, n);
    await side.waitForSelector('.gruppe-knap');
    await gaa(side, '#/gruppe/pasta-og-nudler', '.kort-gitter', vent);
    const k = await side.evaluate(() => getComputedStyle(document.querySelector('.kort-gitter')).gridTemplateColumns.split(' ').length);
    tjek(k === forventet, n + ' gruppen: ' + forventet + ' kolonner (' + k + ')');
    maal.push(n + ' gruppen: ' + k + ' kolonner');
    await foto(side, n + '-fund8-gruppe');
    await ctx.close();
  }
}

// ---------- 9. «Vælg ret» på lave skærme ----------
// Tilbage og filtrene fyldte tre rækker: den første ret stod ved y=338 af 375, og «Vis alle retter» ved et tomt filter lå
// under kanten. Kun kødsovs i index.json giver det tomme filter («Vegetar»)
async function vaelgRet(browser, H) {
  const { tjek, foto, tryk, vent, maal } = H;
  const enRet = async (c) => {
    await c.route('**/opskrifter/index.json*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 2, grupper: [{ id: 'koed', retter: ['koedsovs'] }] }) }));
  };
  for (const n of paa(['se-land', 'x-land', 'land'])) {
    console.log('[' + n + '] fund 9: vælg ret');
    const a = await aabn(browser, H, n);
    await a.side.waitForSelector('.gruppe-knap');
    await gaa(a.side, '#/uge/dag/1', '.ret-valg', vent);
    const f = await a.side.evaluate(() => {
      const r = document.querySelector('.ret-valg-raekke').getBoundingClientRect();
      return { H: innerHeight, raekke: Math.round(r.top), billede: Math.round(document.querySelector('.ret-valg-raekke .dag-billede').getBoundingClientRect().bottom) };
    });
    tjek(f.billede <= f.H, n + ' vælg ret: billedet i den første række skal kunne ses ' + JSON.stringify(f));
    maal.push(n + ' vælg ret: første ret ved y=' + f.raekke + ' af ' + f.H);
    await foto(a.side, n + '-fund9-vaelg');
    await a.ctx.close();
    const b = await aabn(browser, H, n, { foer: enRet });
    await b.side.waitForSelector('.gruppe-knap');
    await gaa(b.side, '#/uge/dag/1', '.ret-valg', vent);
    await tryk(b.side, nuSkaerm + '.filtre .filter:has-text("Vegetar")'); // tryk venter, til appen tager imod tryk efter skiftet
    await b.side.waitForSelector('[data-fokus="vis-alle"]');
    const t = await b.side.evaluate(() => ({ H: innerHeight, bund: Math.round(document.querySelector('[data-fokus="vis-alle"]').getBoundingClientRect().bottom + 5) }));
    tjek(t.bund <= t.H, n + ' tomt filter: «Vis alle retter» skal ses helt uden at rulle ' + JSON.stringify(t));
    maal.push(n + ' tomt filter: «Vis alle retter» slutter ved y=' + t.bund + ' af ' + t.H);
    await foto(b.side, n + '-fund9-tom');
    await b.ctx.close();
  }
}
