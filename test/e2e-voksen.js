// e2e-voksen.js — forældredelen i WebKit (docs/foraeldredel.md, testplanen i afsnit 8). Køres af test-e2e.js med
// E2E_DELE=voksen, som giver sine hjælpere med (H). Det forventede regnes af appens egen kode (portionerFraHusstand,
// faktorFor, skalerMaengde, kod, saml), så testen ser, at skærmen viser det, modulerne regner ud.
// På hver skærm i E2E_SKAERME (390×844, 1180×820, 1280×800): 1. holdet på forsiden og vagten ved et dybt link,
// 2. husstanden og portionerne i ugeplanen, 4. retten og printet ved 6 portioner, 3. ugens udvalg med «Fyld op med nye»
// og børnenes valg på to sider, 6. hjertet på færdig-skærmen (⭐ i børnenes valg, favoritterne), 7. genindlæsning og
// 9. knapperne (børn 64 px, voksne 48 px) og ingen vandret rulning. Én gang: 4b. printets strenge n (desktop),
// 5. «Send til telefon» og listen på telefonen og 8. data fra v3 (kun kog-uge-v1 og kog-liste-v1) indlæses uden tab.
import { portionerFraHusstand, faktorFor, skalerMaengde } from '../js/skaler.js';
import { lavModel } from '../js/model.js';
import { kod } from '../js/plankode.js';
import { saml, grupper } from '../js/indkoeb.js';
import { planMandag } from '../js/tid.js';
import { tilTale } from '../js/tekst.js';

const FAMILIE = 'kog-familie-v1';
const UGE = 'kog-uge-v1';
const LISTE = 'kog-liste-v1';
const RET = 'one-pot-tomatpasta'; // «300 g penne» bliver «450 g» ved 6 portioner (opskriften er til 4)
const BAGNING = 'boller';         // ingen talportioner: altid som i opskriften
const TRIN_LINJE = 'Mængderne i trinene er til 4 — se ingredienslisten';
const TO_FADE = 'Brug to fade — tiden kan blive længere';
const HOLD_OEJE = 'Hold øje med tiden';

export async function voksen(browser, H) {
  for (const skaerm of H.VALGTE) await forloeb(browser, H, skaerm);
  await strengtPrint(browser, H);
  await telefon(browser, H);
  await migrering(browser, H);
}

const ugeplanRetter = (RETTER) => Object.keys(RETTER).filter((id) => RETTER[id].tumbi.ugeplan === true);
const hash = (side) => side.evaluate(() => location.hash);
// Ny adresse: den gamle skærm mærkes, og testen venter, til appen har tegnet en ny (hashchange kommer først bagefter)
async function gaaTil(side, h) {
  const skift = await side.evaluate((x) => {
    if (location.hash === x) return false;
    document.querySelector('main')?.setAttribute('data-gammel', '');
    location.hash = x;
    return true;
  }, h);
  if (skift) await side.waitForFunction(() => !document.querySelector('main[data-gammel]'), null, { timeout: 6000 });
}
const laesLager = (side, k) => side.evaluate((x) => JSON.parse(localStorage.getItem(x) || 'null'), k);
const raatLager = (side) => side.evaluate((k) => k.map((x) => localStorage.getItem(x)), [FAMILIE, UGE, LISTE]);
const saetLager = (side, k, v) => side.evaluate(([x, j]) => localStorage.setItem(x, j), [k, typeof v === 'string' ? v : JSON.stringify(v)]);
const tekstAf = (side, sel) => side.evaluate((s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(), sel);
const idagLokal = (side) => side.evaluate(() => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
});
const sidsteTale = (side) => side.evaluate(() => window.__tale[window.__tale.length - 1] || null);
// Holdet med musen kræver, at knappen står på skærmen (på telefonen kan den stå længere nede)
async function holdHer(H, side, sel, ms) {
  const b = side.locator(sel).first();
  try {
    await b.waitFor({ state: 'visible' });
    await b.scrollIntoViewIfNeeded();
  } catch (e) {
    throw new Error('holdet på ' + sel + ' (' + await hash(side) + '): ' + e.message.split('\n')[0]);
  }
  await H.hold(side, sel, ms);
}

// Ingredienslinjerne, som retten og printet skal vise dem ved faktoren (som skaleretLinje i app.js)
function forventetLinjer(RETTER, id, faktor) {
  const m = lavModel(RETTER[id]);
  const varer = (RETTER[id].tumbi.ingredienser || []).map((l) => (l && l.vare) || undefined);
  return m.ingredienser.map((x, i) => {
    const maengde = faktor ? skalerMaengde(x.maengde, faktor, { vare: varer[i] }).tekst : x.maengde;
    return { maengde, tekst: maengde + x.tekst.slice(x.maengde.length), skaleret: maengde !== x.maengde, original: x.tekst };
  });
}

// Voksendelen på adressen #/voksen<del>: står holdet der (låsen lukker, når man går ud af #/voksen…), holdes det.
const VOKSEN_SKAERM = { '': 'voksen-hub', '/husstand': 'voksen-husstand', '/udvalg': 'voksen-udvalg', '/favoritter': 'voksen-favoritter' };
async function aabnVoksen(H, side, del, hvor) {
  const til = '#/voksen' + del;
  await gaaTil(side, til);
  await H.venterPaa(side, () => document.querySelector('.voksen-vagt, main.voksen-del'), null, hvor + ': holdet eller voksendelen');
  if (await side.locator('.voksen-vagt').count()) await holdHer(H, side, '.voksen-vagt');
  await H.venterPaa(side, ([h, k]) => location.hash === h && document.querySelector('main.voksen-del.' + k), [til, VOKSEN_SKAERM[del]], hvor + ': voksendelen skal åbne');
}

// Den mindste side af elementet (børneknapper skal være mindst 64 px)
const mindsteSide = (side, sel) => side.evaluate((s) => {
  const b = document.querySelector(s)?.getBoundingClientRect();
  return b ? Math.round(Math.min(b.width, b.height)) : 0;
}, sel);

async function forloeb(browser, H, skaerm) {
  const { BASE, RETTER, nySide, tjek, tjekLayout, foto, tryk, vent, venterPaa, h1 } = H;
  const hold = (s, sel, ms) => holdHer(H, s, sel, ms);
  const n = skaerm.navn;
  const bred = n !== 'iphone';
  console.log('[' + n + '] voksendelen: hold, husstand, retten ved 6 portioner, udvalg, hjertet og genindlæsning');
  const IPLAN = ugeplanRetter(RETTER);
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });

  // En planlagt mandag med 3 portioner (valgt af Bo, så Rosa stadig kan vælge) og to retter, der er lavet før
  const uge = planMandag(new Date());
  const mandag = { ret: IPLAN[0], af: 'bo', n: 3 };
  const lavetFoer = { [IPLAN[1]]: { gange: 2, sidst: '2026-10-01' }, [IPLAN[3]]: { gange: 1, sidst: '2026-10-20' } };
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await saetLager(side, UGE, { v: 1, uge, dage: [mandag, null, null, null, null, null, null], n: 4, prBarn: 1, rettet: null });

  // 1. Et dybt link til voksendelen viser holdet, ikke voksendelen
  await gaaTil(side, '#/voksen/udvalg');
  await venterPaa(side, () => document.querySelector('.voksen-vagt'), null, n + ': et dybt link til #/voksen/udvalg skal vise holdet');
  tjek(await h1(side) === 'Til de voksne', n + ': holdets overskrift (' + await h1(side) + ')');
  tjek(await side.locator('main.voksen-del').count() === 0, n + ': udvalget må ikke vises uden holdet');
  await tjekLayout(side, n + ' voksendelens hold');
  await foto(side, n + '-voksen-hold');
  await hold(side, '.voksen-vagt');
  await venterPaa(side, () => location.hash === '#/voksen/udvalg' && document.querySelector('.voksen-udvalg'), null, n + ': holdet skal åbne udvalget');

  // … og forsiden: et kort tryk bliver der, et hold åbner oversigten, og «Luk» lukker igen
  await gaaTil(side, '#/');
  await side.waitForSelector('.voksen-knap');
  tjek(await tekstAf(side, '.voksen-knap') === 'Voksne: hold', n + ': forsidens knap hedder «Voksne: hold» (' + await tekstAf(side, '.voksen-knap') + ')');
  await tryk(side, '.voksen-knap');
  tjek(await hash(side) === '#/' && await side.locator('.voksen-knap.mind').count() === 1, n + ': et kort tryk på «Voksne» bliver på forsiden og viser, at knappen skal holdes');
  await hold(side, '.voksen-knap');
  await venterPaa(side, () => location.hash === '#/voksen' && document.querySelector('.voksen-menu'), null, n + ': holdet på «Voksne» skal åbne voksendelen');
  tjek(await h1(side) === 'Voksne', n + ': voksendelens overskrift (' + await h1(side) + ')');
  await tjekLayout(side, n + ' voksendelen');
  await foto(side, n + '-voksen-oversigt');
  await tryk(side, '[data-fokus="luk"]');
  await venterPaa(side, () => location.hash === '#/' && document.querySelector('.voksen-knap'), null, n + ': «Luk» skal gå til forsiden');
  await gaaTil(side, '#/voksen');
  await venterPaa(side, () => document.querySelector('.voksen-vagt'), null, n + ': efter «Luk» skal #/voksen vise holdet igen');

  // 2. Husstand 2 + 2 → 4 portioner, og så 6 voksne → 6: nye dage får husstandens antal, mandag beholder sine 3
  await aabnVoksen(H, side, '/husstand', n + ' husstand');
  for (const k of ['voksne-plus', 'voksne-plus', 'boern-plus', 'boern-plus']) await tryk(side, '[data-fokus="' + k + '"]');
  const fire = portionerFraHusstand(2, 2, 0.7);
  tjek(fire === 4 && await tekstAf(side, '.husstand-sum') === '= 4 portioner', n + ': 2 voksne og 2 børn giver 4 portioner (' + await tekstAf(side, '.husstand-sum') + ')');
  await tjekLayout(side, n + ' husstand');
  await foto(side, n + '-voksen-husstand');
  await tryk(side, '[data-fokus="gem"]');
  let f = await laesLager(side, FAMILIE);
  let p = await laesLager(side, UGE);
  tjek(f && f.voksne === 2 && f.boern === 2 && f.barnAndel === 0.7, n + ': husstanden gemmes som antal (' + JSON.stringify(f) + ')');
  tjek(p && p.n === 4 && JSON.stringify(p.dage[0]) === JSON.stringify(mandag), n + ': ugeplanen får 4 portioner, og mandag er uændret (' + JSON.stringify(p) + ')');
  for (const k of ['voksne-plus', 'voksne-plus', 'voksne-plus', 'voksne-plus', 'boern-minus', 'boern-minus']) await tryk(side, '[data-fokus="' + k + '"]');
  await tryk(side, '[data-fokus="gem"]');
  p = await laesLager(side, UGE);
  tjek(p && p.n === 6 && JSON.stringify(p.dage[0]) === JSON.stringify(mandag), n + ': 6 voksne giver ugeplanen 6 portioner, og mandag er uændret (' + JSON.stringify(p) + ')');
  await gaaTil(side, '#/uge/dag/2');
  await venterPaa(side, () => location.hash === '#/uge/dag/2' && document.querySelector('.ret-valg'), null, n + ': valget til tirsdag');
  await tryk(side, 'li[data-ret="' + RET + '"] .vaelg-ret');
  await venterPaa(side, () => location.hash === '#/uge' && document.querySelector('.uge-dage'), null, n + ': «Vælg» skal gå til oversigten');
  p = await laesLager(side, UGE);
  tjek(p && JSON.stringify(p.dage[1]) === JSON.stringify({ ret: RET, af: 'bo', n: 6 }) && p.dage[0].n === 3,
    n + ': en ny dag får husstandens 6 portioner, mandag har stadig 3 (' + JSON.stringify(p && p.dage.slice(0, 2)) + ')');

  // 4a. Dagens n før husstandens: mandagens ret står til mandagens 3 portioner, selvom husstanden er 6
  const mandagFaktor = faktorFor(lavModel(RETTER[IPLAN[0]]), 3);
  await gaaTil(side, '#/ret/' + IPLAN[0]);
  await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), IPLAN[0], n + ': mandagens ret');
  tjek(/^Til 3 portioner( · |$)/.test(await tekstAf(side, '.ret .meta')), n + ': mandagens ret står til dagens 3 portioner, ikke husstandens 6 (' + await tekstAf(side, '.ret .meta') + ')');
  const mandagVist = await side.evaluate(() => [...document.querySelectorAll('.ingr')].map((b) => b.getAttribute('aria-label')));
  const mandagLinjer = forventetLinjer(RETTER, IPLAN[0], mandagFaktor).map((l) => l.tekst);
  tjek(mandagFaktor === 0.75 && JSON.stringify(mandagVist) === JSON.stringify(mandagLinjer),
    n + ': mandagens mængder er regnet om × 0,75 (' + mandagVist.slice(0, 4).join(' | ') + ')');

  // 4. Retten ved 6 portioner: «Til 6», mængderne regnet om og markeret, én voksen-linje, og iPad-stemmen læser op
  const faktor = faktorFor(lavModel(RETTER[RET]), 6);
  const linjer = forventetLinjer(RETTER, RET, faktor);
  await gaaTil(side, '#/ret/' + RET);
  await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': retten');
  const vist = await side.evaluate(() => [...document.querySelectorAll('.ingr')].map((b) => ({
    maengde: b.querySelector('.ingr-maengde')?.textContent || '',
    skaleret: Boolean(b.querySelector('.ingr-maengde.skaleret')),
    label: b.getAttribute('aria-label'),
  })));
  const forkert = linjer.map((l, i) => [l, vist[i]]).filter(([l, v]) => !v || v.maengde !== l.maengde || v.skaleret !== l.skaleret || v.label !== l.tekst);
  tjek(faktor === 1.5 && vist.length === linjer.length && !forkert.length, n + ': mængderne ved 6 portioner (forkert: ' + JSON.stringify(forkert.slice(0, 3)) + ')');
  const penne = linjer.findIndex((l) => l.original === '300 g penne');
  tjek(penne >= 0 && vist[penne] && vist[penne].maengde === '450 g', n + ': «300 g penne» bliver «450 g» (' + JSON.stringify(vist[penne]) + ')');
  tjek(/^Til 6 portioner( · |$)/.test(await tekstAf(side, '.ret .meta')) && await side.locator('.ret .meta .skaleret').count() === 1,
    n + ': «Til 6 portioner» står i stedet for opskriftens portioner (' + await tekstAf(side, '.ret .meta') + ')');
  const vLinjer = await side.evaluate(() => [...document.querySelectorAll('.ret .voksen-linje')].map((e) => e.textContent));
  tjek(JSON.stringify(vLinjer) === JSON.stringify([TRIN_LINJE]), n + ': én voksen-linje om trinene ved faktor 1,5 (' + JSON.stringify(vLinjer) + ')');
  await tjekLayout(side, n + ' retten ved 6 portioner', { knapperSes: bred });
  await foto(side, n + '-voksen-ret-6');
  await tryk(side, '.ingr >> nth=' + penne);
  let sagt = await sidsteTale(side);
  tjek(sagt && !sagt.fil && sagt.lang === 'da-DK' && sagt.tekst === tilTale(linjer[penne].tekst),
    n + ': en skaleret ingrediens læses af iPad-stemmen uden lydfil (' + JSON.stringify(sagt) + ')');
  const uskaleret = linjer.findIndex((l) => !l.skaleret);
  if (uskaleret >= 0) {
    await tryk(side, '.ingr >> nth=' + uskaleret);
    sagt = await sidsteTale(side);
    tjek(sagt && (sagt.fil ? sagt.fil === RET + '/ingrediens-' + (uskaleret + 1) + '.mp3' : sagt.tekst === tilTale(linjer[uskaleret].original)),
      n + ': en ingrediens, der ikke ændres, læses som før (' + JSON.stringify(sagt) + ')');
  }
  // Printet fra retten får n med og viser det samme
  await hold(side, '.print-knap');
  await venterPaa(side, (id) => location.pathname.endsWith('/print.html') && location.search === '?ret=' + id + '&n=6' && document.querySelector('.tjek li'), RET, n + ': «Print» skal åbne print.html?ret=' + RET + '&n=6');
  const printLinjer = await side.evaluate(() => [...document.querySelectorAll('.tjek li')].map((li) => li.textContent));
  tjek(JSON.stringify(printLinjer) === JSON.stringify(linjer.map((l) => l.tekst)), n + ': printet viser de samme mængder (' + printLinjer.slice(0, 4).join(' | ') + ')');
  tjek((await tekstAf(side, '.hoved .meta')).startsWith('Til 6 portioner'), n + ': printet står til 6 portioner (' + await tekstAf(side, '.hoved .meta') + ')');
  await side.goBack();
  await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': tilbage fra printet');
  // En bageopskrift har ingen talportioner og vises som i opskriften
  await gaaTil(side, '#/ret/' + BAGNING);
  await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), BAGNING, n + ': bageopskriften');
  const bag = await side.evaluate(() => ({
    skaleret: document.querySelectorAll('.skaleret, .voksen-linje').length,
    maengder: [...document.querySelectorAll('.ingr')].map((b) => b.querySelector('.ingr-maengde')?.textContent || ''),
  }));
  tjek(!bag.skaleret && JSON.stringify(bag.maengder) === JSON.stringify(forventetLinjer(RETTER, BAGNING, null).map((l) => l.maengde)),
    n + ': ' + BAGNING + ' (uden talportioner) vises som i opskriften (' + JSON.stringify(bag) + ')');

  // 3. Ugens udvalg: «Fyld op med nye» vælger 8 retter, der ikke er lavet før, og børnene ser kun dem, på to sider
  f = await laesLager(side, FAMILIE);
  await saetLager(side, FAMILIE, { ...f, lavet: lavetFoer });
  await aabnVoksen(H, side, '/udvalg', n + ' udvalg');
  tjek(await tekstAf(side, '.udvalg-tal') === 'Intet udvalg: børnene ser alle retter', n + ': intet udvalg i starten (' + await tekstAf(side, '.udvalg-tal') + ')');
  await tryk(side, '[data-fokus="fyld-op"]');
  const otte = IPLAN.filter((id) => !Object.hasOwn(lavetFoer, id)).slice(0, 8);
  f = await laesLager(side, FAMILIE);
  tjek(f && f.udvalg && JSON.stringify(f.udvalg.ids) === JSON.stringify(otte), n + ': «Fyld op med nye» vælger de 8 første retter, der ikke er lavet (' + JSON.stringify(f && f.udvalg) + ')');
  tjek(await tekstAf(side, '.udvalg-tal') === '8 af 24 valgt', n + ': «8 af 24 valgt» (' + await tekstAf(side, '.udvalg-tal') + ')');
  const valgte = await side.evaluate(() => [...document.querySelectorAll('.voksen-raekke.valgt')].map((r) => r.dataset.ret));
  tjek(JSON.stringify([...valgte].sort()) === JSON.stringify([...otte].sort()), n + ': de 8 rækker er markeret (' + valgte.join(', ') + ')');
  await tjekLayout(side, n + ' udvalg');
  await foto(side, n + '-voksen-udvalg');

  const kort = () => side.evaluate(() => [...document.querySelectorAll('.ret-kort')].map((b) => ({
    id: b.dataset.ret, ny: Boolean(b.querySelector('.maerke-ny')), fav: Boolean(b.querySelector('.maerke-fav')),
  })));
  const boernenesValg = async (hvor) => {
    await gaaTil(side, '#/uge/vaelg/rosa');
    await venterPaa(side, () => location.hash === '#/uge/vaelg/rosa' && document.querySelector('.ret-gitter'), null, hvor + ': børnenes valg');
    const s1 = await kort();
    const prikker = await side.locator('.side-prikker span').count();
    let s2 = [];
    if (await side.locator('.side-naeste:not([disabled])').count()) {
      await tryk(side, '.side-naeste');
      s2 = await kort();
    }
    return { prikker, sider: [s1, s2] };
  };
  let bv = await boernenesValg(n + ' udvalg');
  tjek(bv.prikker === 2 && JSON.stringify(bv.sider.flat().map((k) => k.id)) === JSON.stringify(otte),
    n + ': børnenes valg har 2 sider med kun de 8 retter (' + bv.prikker + ' sider: ' + bv.sider.flat().map((k) => k.id).join(', ') + ')');
  tjek(bv.sider.flat().every((k) => k.ny && !k.fav), n + ': alle 8 er nye for os (✨) og ingen er favorit endnu');
  await tjekLayout(side, n + ' børnenes valg med udvalg');
  await foto(side, n + '-voksen-boern-udvalg');

  // 6. Færdig-skærmen: «lavet» gemmes, og hjertet gør retten til favorit (⭐ i børnenes valg, og under favoritterne)
  const fav = otte[0];
  const favTrin = lavModel(RETTER[fav]).trin;
  const sidst = favTrin.length;
  await gaaTil(side, '#/ret/' + fav + '/trin/' + sidst);
  await venterPaa(side, (h) => location.hash === h && document.querySelector('main.trin .naeste'), '#/ret/' + fav + '/trin/' + sidst, n + ': sidste trin i ' + fav);
  if (favTrin[sidst - 1].voksen) await hold(side, 'main.trin .naeste');
  else await tryk(side, 'main.trin .naeste');
  await venterPaa(side, () => document.querySelector('main.faerdig h1'), null, n + ': færdig-skærmen');
  f = await laesLager(side, FAMILIE);
  const idag = await idagLokal(side);
  tjek(f && JSON.stringify(f.lavet[fav]) === JSON.stringify({ gange: 1, sidst: idag }), n + ': færdig-skærmen gemmer, at ' + fav + ' er lavet i dag (' + JSON.stringify(f && f.lavet[fav]) + ')');
  tjek(await side.locator('.hjerte-knap').getAttribute('aria-pressed') === 'false', n + ': hjertet er tomt i starten');
  tjek(await mindsteSide(side, '.hjerte-knap') >= 64, n + ': hjertet er en børneknap på mindst 64 px (' + await mindsteSide(side, '.hjerte-knap') + ')');
  await tryk(side, '.hjerte-knap');
  tjek(await side.locator('.hjerte-knap').getAttribute('aria-pressed') === 'true', n + ': et tryk på hjertet gør det rødt (aria-pressed)');
  f = await laesLager(side, FAMILIE);
  tjek(f && JSON.stringify(f.favoritter) === JSON.stringify([fav]), n + ': ' + fav + ' er favorit (' + JSON.stringify(f && f.favoritter) + ')');
  tjek(await side.locator('.faerdig .voksen-linje:not([hidden])').count() === 0, n + ': ingen fejl på færdig-skærmen');
  await tjekLayout(side, n + ' færdig med hjertet');
  await foto(side, n + '-voksen-faerdig');
  // En genindlæsning af færdig-skærmen tæller ikke retten som lavet igen
  await side.reload();
  await venterPaa(side, () => document.querySelector('main.faerdig h1'), null, n + ': færdig-skærmen efter genindlæsning');
  f = await laesLager(side, FAMILIE);
  tjek(f && f.lavet[fav] && f.lavet[fav].gange === 1, n + ': genindlæsningen tæller ikke retten som lavet igen (' + JSON.stringify(f && f.lavet[fav]) + ')');
  tjek(await side.locator('.hjerte-knap').getAttribute('aria-pressed') === 'true', n + ': hjertet er stadig rødt efter genindlæsning');

  bv = await boernenesValg(n + ' favorit');
  const favKort = bv.sider.flat().find((k) => k.id === fav);
  tjek(favKort && favKort.fav && !favKort.ny, n + ': favoritten har ⭐ og er ikke ny længere (' + JSON.stringify(favKort) + ')');
  tjek(bv.sider.flat().filter((k) => k.id !== fav).every((k) => k.ny && !k.fav), n + ': de andre er stadig nye og ikke favoritter');
  await aabnVoksen(H, side, '/favoritter', n + ' favoritter');
  tjek(await side.locator('[data-fokus="fav-' + fav + '"]').getAttribute('aria-pressed') === 'true', n + ': favoritten står med rødt hjerte under favoritterne');
  await tjekLayout(side, n + ' favoritter');
  await foto(side, n + '-voksen-favoritter');

  // 3b. «Fyld op med nye» igen: 4 retter mere, og ingen af dem er lavet før
  await aabnVoksen(H, side, '/udvalg', n + ' udvalg igen');
  await tryk(side, '[data-fokus="fyld-op"]');
  f = await laesLager(side, FAMILIE);
  const nye = f && f.udvalg ? f.udvalg.ids.slice(8) : [];
  tjek(f && f.udvalg && f.udvalg.ids.length === 12 && JSON.stringify(f.udvalg.ids.slice(0, 8)) === JSON.stringify(otte) && nye.every((id) => !Object.hasOwn(f.lavet, id)),
    n + ': «Fyld op med nye» tilføjer 4 retter, der ikke er lavet (' + JSON.stringify(nye) + ')');

  // 7. Genindlæsning bevarer alt: lageret er byte-for-byte det samme, voksendelen er låst igen og viser det gemte
  const foer = await raatLager(side);
  // Holdet står der, mens opskrifterne hentes, og tegnes igen, når de er hentet: testen holder først bagefter
  await side.reload({ waitUntil: 'networkidle' });
  await venterPaa(side, () => document.querySelector('.voksen-vagt'), null, n + ': efter genindlæsning er voksendelen låst');
  await hold(side, '.voksen-vagt');
  await venterPaa(side, () => document.querySelector('.voksen-udvalg'), null, n + ': udvalget efter genindlæsning');
  tjek(await tekstAf(side, '.udvalg-tal') === '12 af 24 valgt', n + ': udvalget efter genindlæsning (' + await tekstAf(side, '.udvalg-tal') + ')');
  await aabnVoksen(H, side, '', n + ' oversigten efter genindlæsning');
  const status = await side.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-fokus]')]
    .map((b) => [b.dataset.fokus, (b.querySelector('.voksen-punkt-status')?.textContent || '').replace(/\s+/g, ' ')])));
  tjek(status.husstand === '6 voksne = 6 portioner' && status.udvalg === '12 retter at vælge mellem' && status.favoritter === '1 ret',
    n + ': oversigten efter genindlæsning (' + JSON.stringify(status) + ')');
  tjek(JSON.stringify(await raatLager(side)) === JSON.stringify(foer), n + ': genindlæsningen ændrer intet i lageret');
  await gaaTil(side, '#/ret/' + RET);
  await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': retten efter genindlæsning');
  tjek(/^Til 6 portioner/.test(await tekstAf(side, '.ret .meta')), n + ': retten står stadig til 6 portioner efter genindlæsning');

  await vent(100);
  tjek(side.fejl.length === 0, n + ' (voksendelen): ' + side.fejl.join(' | '));
  await ctx.close();
}

// 4b. print.html?ret=<id>&n=<1-12>: n tjekkes strengt (ellers som opskriften), og fadet nævnes ved mange og få portioner
async function strengtPrint(browser, H) {
  const { BASE, RETTER, SKAERME, nySide, tjek, tjekLayout, foto, venterPaa } = H;
  const skaerm = SKAERME[2];
  const n = skaerm.navn;
  console.log('[' + n + '] voksendelen: print.html med n');
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  const aabn = async (soeg) => {
    await side.goto(BASE + '/print.html?ret=' + soeg);
    await venterPaa(side, () => !document.getElementById('print').disabled, null, n + ' print ' + soeg);
    return side.evaluate(() => ({
      linjer: [...document.querySelectorAll('.tjek li')].map((li) => li.textContent),
      meta: document.querySelector('.hoved .meta')?.textContent || '',
      noter: [...document.querySelectorAll('.ingredienser .note')].map((p) => p.textContent),
    }));
  };
  const som = (id) => RETTER[id].recipeIngredient;
  for (const daarlig of ['6abc', '06', '13', '0', '-6', '6.0', '+6', '%206', '6&n=7', '']) {
    const r = await aabn(RET + '&n=' + daarlig);
    tjek(JSON.stringify(r.linjer) === JSON.stringify(som(RET)) && !r.noter.length && !r.meta.startsWith('Til'), n + ': n=«' + daarlig + '» giver opskriften, som den står (' + r.meta + ')');
  }
  let r = await aabn(RET + '&n=4');
  tjek(JSON.stringify(r.linjer) === JSON.stringify(som(RET)) && !r.noter.length, n + ': n=4 (faktor 1) giver opskriften, som den står');
  r = await aabn(BAGNING + '&n=6');
  tjek(JSON.stringify(r.linjer) === JSON.stringify(som(BAGNING)) && !r.noter.length, n + ': ' + BAGNING + ' har ingen talportioner og printes, som den står');
  const m = lavModel(RETTER[RET]);
  for (const [tal, fade] of [[6, null], [8, TO_FADE], [1, HOLD_OEJE]]) {
    r = await aabn(RET + '&n=' + tal);
    const forventet = forventetLinjer(RETTER, RET, faktorFor(m, tal)).map((l) => l.tekst);
    tjek(JSON.stringify(r.linjer) === JSON.stringify(forventet), n + ': n=' + tal + ' regner mængderne om (' + r.linjer.slice(0, 3).join(' | ') + ')');
    tjek(r.meta.startsWith('Til ' + tal + (tal === 1 ? ' portion' : ' portioner')), n + ': n=' + tal + ' står i printets hoved (' + r.meta + ')');
    tjek(JSON.stringify(r.noter) === JSON.stringify([TRIN_LINJE, fade].filter(Boolean)), n + ': n=' + tal + ' har noterne ' + JSON.stringify(r.noter));
    if (tal === 8) {
      await tjekLayout(side, n + ' print ved 8 portioner');
      await foto(side, n + '-voksen-print-8');
    }
  }
  tjek(side.fejl.length === 0, n + ' (print med n): ' + side.fejl.join(' | '));
  await ctx.close();
}

// Falsk delark som i e2e-ugeplan.js: linket, iPad'en sender, gemmes i window.__delt
const fakeDeling = () => {
  window.__delt = [];
  Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__delt.push(JSON.parse(JSON.stringify(d))); return Promise.resolve(); } });
};

// 5. «Send til telefon» med husstandens portioner: linket er det samme v1-link som før, og telefonen viser de samme mængder
async function telefon(browser, H) {
  const { BASE, RETTER, SKAERME, nySide, tjek, tryk, venterPaa } = H;
  console.log('[ipad → iphone] voksendelen: «Send til telefon» med husstandens portioner');
  const IPLAN = ugeplanRetter(RETTER);
  const uge = planMandag(new Date());
  const dage = [{ ret: RET, af: 'bo', n: 6 }, null, { ret: IPLAN[0], af: 'rosa', n: 3 }, null, null, null, null];
  const { ctx, side } = await nySide(browser, SKAERME[0], { serviceWorkers: 'block' });
  await ctx.addInitScript(fakeDeling);
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await saetLager(side, FAMILIE, { v: 1, voksne: 6, boern: 0, barnAndel: 0.7, udvalg: null, favoritter: [], lavet: {} });
  await saetLager(side, UGE, { v: 1, uge, dage, n: 6, prBarn: 1, rettet: null });
  await gaaTil(side, '#/uge');
  await venterPaa(side, () => document.querySelector('.uge-dage'), null, 'ipad: ugeplanen');
  await tryk(side, 'button:has-text("Send til telefon")');
  await venterPaa(side, () => window.__delt.length === 1, null, 'ipad: «Send til telefon» skal åbne delearket');
  const delt = await side.evaluate(() => window.__delt[0] || {});
  const kode = kod(uge, dage.map((d) => (d ? { ret: d.ret, n: d.n } : null)));
  tjek(kode.startsWith('v1.') && delt.url === BASE + '/index.html#/hent/' + kode, 'ipad: linket er det samme v1-link med dagenes portioner (' + delt.url + ')');
  tjek(side.fejl.length === 0, 'ipad (send til telefon): ' + side.fejl.join(' | '));
  await ctx.close();

  const tlf = await nySide(browser, SKAERME[1], { serviceWorkers: 'block' });
  await tlf.side.goto(delt.url || BASE + '/index.html#/hent/' + kode);
  await venterPaa(tlf.side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, 'iphone: linket skal åbne listen');
  const valg = dage.filter(Boolean).map((d) => ({ ret: RETTER[d.ret], n: d.n }));
  const forventet = grupper(saml(valg)).filter((g) => g.afd !== 'basis').flatMap((g) => g.varer.map((v) => [v.id, (v.maengde || '').replace(/\s+/g, ' ')]));
  const vist = await tlf.side.evaluate(() => [...document.querySelectorAll('.liste-krop .afd:not(.har-vi-afd) li[data-vare]')]
    .map((li) => [li.dataset.vare, (li.querySelector('.vare-maengde')?.textContent || '').replace(/\s+/g, ' ')]));
  tjek(vist.length > 0 && JSON.stringify(vist) === JSON.stringify(forventet), 'iphone: listen har de samme mængder som iPad\'ens plan (' + JSON.stringify(vist.slice(0, 4)) + ')');
  tjek(tlf.side.fejl.length === 0, 'iphone (listen): ' + tlf.side.fejl.join(' | '));
  await tlf.ctx.close();
}

// 8. Migrering: data fra v3 (kun kog-uge-v1 og kog-liste-v1, ingen kog-familie-v1) indlæses uden tab. At se skærmene
// ændrer intet, og først når husstanden gemmes, skrives kog-familie-v1 og ugeplanens standardportioner
async function migrering(browser, H) {
  const { BASE, RETTER, SKAERME, nySide, tjek, venterPaa, tryk } = H;
  const n = SKAERME[0].navn;
  console.log('[' + n + '] voksendelen: data fra v3 indlæses uden tab');
  const IPLAN = ugeplanRetter(RETTER);
  const uge = planMandag(new Date());
  const dage = [{ ret: IPLAN[2], af: 'rosa', n: 5 }, null, null, { ret: IPLAN[4], af: 'pip', n: 2 }, null, null, null];
  const kode = kod(uge, dage.map((d) => (d ? { ret: d.ret, n: d.n } : null)));
  const varer = saml(dage.filter(Boolean).map((d) => ({ ret: RETTER[d.ret], n: d.n }))).map(({ id, m }) => ({ id, m }));
  const ugeV3 = JSON.stringify({ v: 1, uge, dage, n: 4, prBarn: 2, rettet: 1761900000000 });
  const listeV3 = JSON.stringify({ v: 1, kode, uge, varer, koebt: [varer[0].id], harVi: [], hentet: 1761900000000 });
  const { ctx, side } = await nySide(browser, SKAERME[0], { serviceWorkers: 'block' });
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await side.evaluate(() => localStorage.clear());
  await saetLager(side, UGE, ugeV3);
  await saetLager(side, LISTE, listeV3);
  await side.reload();
  await side.waitForSelector('.kort[data-ret]');
  await gaaTil(side, '#/uge');
  await venterPaa(side, () => document.querySelector('.uge-dage'), null, n + ': ugeplanen fra v3');
  tjek(await side.locator('.uge-dage > .dag:not(.fri)').count() === 2, n + ': ugeplanen fra v3 har sine 2 retter');
  await gaaTil(side, '#/indkoeb');
  await venterPaa(side, () => document.querySelector('.liste-tal'), null, n + ': indkøbslisten fra v3');
  tjek(await side.locator('li.koebt[data-vare="' + varer[0].id + '"]').count() === 1, n + ': listen fra v3 har stadig den købte vare');
  await aabnVoksen(H, side, '', n + ' voksendelen med data fra v3');
  const status = await side.evaluate(() => (document.querySelector('[data-fokus="husstand"] .voksen-punkt-status')?.textContent || '').replace(/\s+/g, ' '));
  tjek(status === 'Ikke sat. Nye retter er til 4 portioner', n + ': uden kog-familie-v1 er husstanden ikke sat (' + status + ')');
  await gaaTil(side, '#/ret/' + RET);
  await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': retten uden husstand');
  tjek(await side.locator('.ret .skaleret, .ret .voksen-linje').count() === 0, n + ': uden husstand vises retten som før');
  let [familie, ugeNu, listeNu] = await raatLager(side);
  tjek(familie === null && ugeNu === ugeV3 && listeNu === listeV3, n + ': at se skærmene ændrer intet i lageret (familie: ' + familie + ')');
  // Husstanden gemmes: kun ugeplanens standardportioner (og «rettet») ændres, dagene og listen er de samme
  await aabnVoksen(H, side, '/husstand', n + ' husstand med data fra v3');
  for (const k of ['voksne-plus', 'voksne-plus', 'voksne-plus']) await tryk(side, '[data-fokus="' + k + '"]');
  await tryk(side, '[data-fokus="gem"]');
  [familie, ugeNu, listeNu] = await raatLager(side);
  const u = JSON.parse(ugeNu || 'null');
  tjek(familie !== null && JSON.parse(familie).voksne === 3, n + ': husstanden er gemt i kog-familie-v1 (' + familie + ')');
  tjek(u && u.n === 3 && JSON.stringify(u.dage) === JSON.stringify(dage) && u.prBarn === 2 && u.uge === uge, n + ': ugeplanen får 3 portioner, og dagene er uændrede (' + ugeNu + ')');
  tjek(listeNu === listeV3, n + ': indkøbslisten er uændret');
  tjek(side.fejl.length === 0, n + ' (data fra v3): ' + side.fejl.join(' | '));
  await ctx.close();
}
