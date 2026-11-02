// e2e-voksen.js — forældredelen i WebKit (docs/foraeldredel.md, testplanen i afsnit 8). Køres af test-e2e.js med
// E2E_DELE=voksen, som giver sine hjælpere med (H). Det forventede regnes af appens egen kode (portionerFraHusstand,
// faktorFor, skaleretIngrediens, kod, saml), så testen ser, at skærmen viser det, modulerne regner ud.
// På hver skærm i E2E_SKAERME (390×844, 1180×820, 1280×800): 1. holdet på forsiden og vagten ved et dybt link,
// 2. husstanden og portionerne i ugeplanen, 4. retten og printet ved 6 portioner, 3. ugens udvalg med «Fyld op med nye»
// og børnenes valg på to sider, 6. hjertet på færdig-skærmen (❤️ i børnenes valg, favoritterne), 7. genindlæsning og
// 9. knapperne (børn 64 px, voksne 48 px) og ingen vandret rulning. Én gang: 4b. printets strenge n (desktop),
// 5. «Send til telefon» og listen på telefonen, 8. data fra v3 (kun kog-uge-v1 og kog-liste-v1) indlæses uden tab og
// 10. kog-familie-v1 fra en nyere udgave (oversigten står, siderne og hjertet er låst), 11. loftet på 12 portioner og
// 12. holdet først, når opskrifterne er hentet. 13. Kataloget og søgefeltet (også på udvalget og favoritterne) på hver
// skærm: feltet tegnes ikke om, mens der skrives, «jul» giver juleretterne, grupperne, ingen træf, hjertet og «Med».
// 14. «Mere grønt i maden» på iPad'en og telefonen: kontakten, retten, trinnet og printet (strengt groen=1), ugeplanens
// pris, linket (plankode v2) og listen på telefonen, og at kontakten ikke rører den gemte plan
import fs from 'node:fs';
import path from 'node:path';
import { portionerFraHusstand, faktorFor, skaleretIngrediens, voksenNoter } from '../js/skaler.js';
import { lavModel } from '../js/model.js';
import { kod } from '../js/plankode.js';
import { saml, grupper } from '../js/indkoeb.js';
import { planMandag } from '../js/tid.js';
import { tilTale } from '../js/tekst.js';
import { soeg } from '../js/soeg.js';
import { GRUPPER } from '../js/katalog.js';
import { MAERKER, maerkerFor } from '../js/maerker.js';
import { medMereGroent, GROENT_TEKST } from '../js/groent.js';

const FAMILIE = 'kog-familie-v1';
const UGE = 'kog-uge-v1';
const LISTE = 'kog-liste-v1';
const RET = 'one-pot-tomatpasta'; // «300 g penne» bliver «450 g» ved 6 portioner (opskriften er til 4)
const BAGNING = 'boller';         // ingen talportioner: altid som i opskriften
const TRIN_LINJE = 'Mængderne i trinene er til 4 — se ingredienslisten';
const TO_FADE = 'Brug to fade — tiden kan blive længere';
const HOLD_OEJE = 'Hold øje med tiden';
const TAERTE = 'kyllingetaerte-med-butterdej'; // «1 rulle færdig butterdej» rundes op til hele
const FORM = 'Dej og form er rundet op til hele — formen passer måske ikke';
// Playwright trykker ikke på en knap med aria-disabled="true" (den er ikke «enabled»), men det kan man på iPad'en
const AFVIST = { force: true };

export async function voksen(browser, H) {
  for (const skaerm of H.VALGTE) await forloeb(browser, H, skaerm);
  for (const skaerm of H.VALGTE) await katalog(browser, H, skaerm);
  await strengtPrint(browser, H);
  await telefon(browser, H);
  await migrering(browser, H);
  await nyereFamilie(browser, H);
  await husstandLoft(browser, H);
  await henterFoerHoldet(browser, H);
  for (const skaerm of H.VALGTE.filter((s) => s.navn !== 'desktop')) await mereGroent(browser, H, skaerm);
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

// Ingredienslinjerne, som retten og printet skal vise dem ved faktoren (skaleretIngrediens i js/skaler.js)
function forventetLinjer(RETTER, id, faktor) {
  const m = lavModel(RETTER[id]);
  return m.ingredienser.map((x, i) => ({
    ...(faktor ? skaleretIngrediens(m, i, faktor) : { maengde: x.maengde, navn: x.navn, tekst: x.tekst, skaleret: false }),
    original: x.tekst,
  }));
}

// Voksendelen på adressen #/voksen<del>: står holdet der (låsen lukker, når man går ud af #/voksen…), holdes det.
const VOKSEN_SKAERM = { '': 'voksen-hub', '/husstand': 'voksen-husstand', '/udvalg': 'voksen-udvalg', '/favoritter': 'voksen-favoritter', '/katalog': 'voksen-katalog' };
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
  // «Gemt» forsvinder ved næste ændring: den passer ikke til kladden længere
  tjek(await side.locator('.voksen-husstand .uge-besked').count() === 1, n + ': «Gem» viser en besked');
  await tryk(side, '[data-fokus="voksne-plus"]');
  tjek(await side.locator('.voksen-husstand .uge-besked').count() === 0, n + ': en ændring efter «Gem» fjerner beskeden');
  for (const k of ['voksne-plus', 'voksne-plus', 'voksne-plus', 'boern-minus', 'boern-minus']) await tryk(side, '[data-fokus="' + k + '"]');
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
  // «revet ost til servering» har ingen mængde, så der er intet at regne om: kun linjen om trinene (01-11)
  const mandagNoter = await side.evaluate(() => [...document.querySelectorAll('.ret .voksen-linje')].map((e) => e.textContent));
  tjek(JSON.stringify(mandagNoter) === JSON.stringify([TRIN_LINJE]),
    n + ': mandagens ret har kun linjen om trinene, ingen om en mængde uden tal (' + JSON.stringify(mandagNoter) + ')');

  // 4. Retten ved 6 portioner: «Til 6», mængderne regnet om og markeret, én voksen-linje, og iPad-stemmen læser op
  const faktor = faktorFor(lavModel(RETTER[RET]), 6);
  const linjer = forventetLinjer(RETTER, RET, faktor);
  await gaaTil(side, '#/ret/' + RET);
  await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': retten');
  const vist = await side.evaluate(() => [...document.querySelectorAll('.ingr')].map((b) => ({
    maengde: b.querySelector('.ingr-maengde')?.textContent || '',
    skaleret: Boolean(b.querySelector('.ingr-maengde.skaleret')),
    // Navneordet bøjet efter mængden («1,5 grøntsagsbouillonterning»), som printet viser det
    navn: b.querySelector('.ingr-navn')?.textContent || '',
    label: b.getAttribute('aria-label'),
  })));
  const forkert = linjer.map((l, i) => [l, vist[i]]).filter(([l, v]) => !v || v.maengde !== l.maengde || v.navn !== l.navn || v.skaleret !== l.skaleret || v.label !== l.tekst);
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

  // 2b. «Brug på hele ugen» (efter 4a, der skal bruge mandagens 3): de planlagte dage får husstandens 6 portioner med
  // samme ret og dyr, og indkøbslisten røres ikke
  await aabnVoksen(H, side, '/husstand', n + ' husstand, hele ugen');
  const foerDage = (await laesLager(side, UGE)).dage;
  const foerListe = (await raatLager(side))[2];
  await tryk(side, '[data-fokus="hele-ugen"]');
  p = await laesLager(side, UGE);
  const somFoer = (d, i) => (!d && !foerDage[i]) || (d && foerDage[i] && d.n === 6 && d.ret === foerDage[i].ret && d.af === foerDage[i].af);
  tjek(foerDage[0] && foerDage[0].n === 3 && p && p.n === 6 && p.dage.every(somFoer),
    n + ': «Brug på hele ugen» giver alle planlagte dage 6 portioner og beholder ret og dyr (' + JSON.stringify(p && p.dage) + ')');
  tjek((await raatLager(side))[2] === foerListe, n + ': «Brug på hele ugen» ændrer ikke indkøbslisten');

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
    favIkon: b.querySelector('.maerke-fav')?.textContent || '', favNavn: b.querySelector('.maerke-fav')?.getAttribute('aria-label') || '',
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

  // 6. Færdig-skærmen: «lavet» gemmes, og hjertet gør retten til favorit (❤️ i børnenes valg, og under favoritterne)
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
  const midt = await side.evaluate(() => [document.querySelector('.hjerte-knap'), document.querySelector('.faerdig .topbar-midte')]
    .map((e) => { const b = e.getBoundingClientRect(); return Math.round(b.left + b.width / 2); }));
  tjek(Math.abs(midt[0] - midt[1]) <= 1, n + ': hjertet står midt i topbaren (hjertet ' + midt[0] + ', midten ' + midt[1] + ')');
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
  tjek(favKort && favKort.fav && !favKort.ny, n + ': favoritten har et hjerte og er ikke ny længere (' + JSON.stringify(favKort) + ')');
  // Samme symbol som hjertet på færdig-skærmen: et rødt hjerte (MAERKER.favorit), og skærmlæseren siger stadig «Favorit»
  tjek(favKort && favKort.favIkon === '\u2764\uFE0F' && favKort.favNavn === 'Favorit', n + ': favoritten har ❤️ med navnet «Favorit» (' + JSON.stringify(favKort) + ')');
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
  // Holdet kommer først, når opskrifterne er hentet (12.)
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

  // 4c. Flere voksen-linjer (tærten ved 8 portioner: trinene, to fade og formen) står med fælles venstrekant
  const taerteFaktor = faktorFor(lavModel(RETTER[TAERTE]), 8);
  const taerteNoter = voksenNoter(lavModel(RETTER[TAERTE]), taerteFaktor, forventetLinjer(RETTER, TAERTE, taerteFaktor));
  await saetLager(side, FAMILIE, { ...await laesLager(side, FAMILIE), voksne: 8, boern: 0 });
  await gaaTil(side, '#/ret/' + TAERTE);
  await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), TAERTE, n + ': tærten ved 8 portioner');
  const kanter = await side.evaluate(() => [...document.querySelectorAll('.ret .voksen-linje')].map((e) => [e.textContent, Math.round(e.getBoundingClientRect().left)]));
  tjek(taerteNoter.length >= 3 && JSON.stringify(kanter.map((k) => k[0])) === JSON.stringify(taerteNoter) && kanter.every((k) => k[1] === kanter[0][1]),
    n + ': voksen-linjerne ved 8 portioner står med samme venstrekant (' + JSON.stringify(kanter) + ')');
  await tjekLayout(side, n + ' tærten ved 8 portioner', { knapperSes: bred });

  await vent(100);
  tjek(side.fejl.length === 0, n + ' (voksendelen): ' + side.fejl.join(' | '));
  await ctx.close();
}

// ---------- 13. Kataloget og søgefeltet ----------

// Retterne, som voksendelen søger i (soegePost i js/voksen-del.js): navn, ingredienser, gruppens navn og mærkerne, som
// en familie uden favoritter og «lavet». Søgeordene i testen («jul», «kylling», «kyl», «xyzzy») står ikke i noget
// mærkes navn, så familiens egne mærker (ny, favorit) ændrer ikke svaret
function katalogPoster(RETTER, ROD) {
  const ix = JSON.parse(fs.readFileSync(path.join(ROD, 'opskrifter/index.json'), 'utf8')).grupper;
  const familie = { favoritter: [], lavet: {} };
  return ix.flatMap((g) => g.retter.map((id) => {
    const m = lavModel(RETTER[id]);
    return { id, gruppeId: g.id, uge: Boolean(m.uge), navn: m.navn, ingredienser: m.ingredienser, gruppe: GRUPPER[g.id],
      maerker: maerkerFor(m, { familie }).map((k) => MAERKER[k].navn) };
  }));
}
const raekker = (side) => side.evaluate(() => [...document.querySelectorAll('#app > main .voksen-liste .voksen-raekke')].map((r) => r.dataset.ret));
const ens = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const feltNu = (side, id) => side.evaluate((x) => {
  const f = document.getElementById(x);
  return { vaerdi: f ? f.value : null, fokus: document.activeElement === f, ryd: document.querySelector('.soeg-ryd')?.hidden ?? null };
}, id);

// Skriver tekst ét tegn ad gangen i feltet, der har fokus (og er tomt eller har markøren til sidst). Efter hvert tegn:
// samme input-element og samme skærm (intet er tegnet om, så Safari ikke lukker tastaturet), fokus i feltet, markøren til
// sidst, og listen er præcis forventet(det skrevne)
async function skrivTegnForTegn(H, side, sel, tekst, hvor, forventet) {
  await side.evaluate((s) => { window.__felt = document.querySelector(s); window.__skaerm = document.querySelector('#app > main'); }, sel);
  let skrevet = await side.evaluate(() => window.__felt.value);
  for (const tegn of tekst) {
    await side.keyboard.type(tegn);
    skrevet += tegn;
    const s = await side.evaluate((x) => {
      const f = window.__felt;
      return { samme: document.querySelector(x) === f && f.isConnected && document.querySelector('#app > main') === window.__skaerm,
        fokus: document.activeElement === f, vaerdi: f.value, markoer: [f.selectionStart, f.selectionEnd] };
    }, sel);
    H.tjek(s.samme && s.fokus && s.vaerdi === skrevet && s.markoer[0] === skrevet.length && s.markoer[1] === skrevet.length,
      hvor + ': efter «' + skrevet + '» er feltet det samme element, med fokus og markøren til sidst (' + JSON.stringify(s) + ')');
    const vist = await raekker(side);
    const ventet = forventet(skrevet);
    H.tjek(ens(vist, ventet), hvor + ': listen efter «' + skrevet + '» (' + vist.length + ' vist, ' + ventet.length + ' ventet)');
  }
}

async function katalog(browser, H, skaerm) {
  const { BASE, RETTER, ROD, nySide, tjek, tjekLayout, foto, tryk, vent, venterPaa, h1 } = H;
  const n = skaerm.navn;
  // Smal eller lav skærm (KOMPAKT i js/voksen-del.js): filtrene starter foldet sammen og foldes sammen efter et valg.
  // Det gælder alle tre skærme i testen (iPad og desktop er lavere end 900 px)
  const kompakt = skaerm.viewport.width <= 700 || skaerm.viewport.height <= 900;
  console.log('[' + n + '] voksendelen: kataloget og søgefeltet (også på udvalget og favoritterne)');
  const POSTER = katalogPoster(RETTER, ROD);
  const ALLE = POSTER.map((p) => p.id);
  const UGEPLAN = POSTER.filter((p) => p.uge);
  const AFTENSMAD = POSTER.filter((p) => p.gruppeId === 'aftensmad');
  const JUL = POSTER.filter((p) => p.gruppeId === 'jul').map((p) => p.id);
  const GRUPPE_IDS = [...new Set(POSTER.map((p) => p.gruppeId))];
  const ids = (liste, tekst) => soeg(liste, tekst).map((p) => p.id);
  const retter = (antal) => antal + ' retter';
  // En chip i filtrene: er de foldet sammen (på telefonen, også efter et valg), foldes de ud først
  const chip = async (fokus) => {
    if (!await side.evaluate(() => document.querySelector('main .voksen-filtre').open)) await tryk(side, 'main .voksen-filtre > summary');
    await tryk(side, '[data-fokus="' + fokus + '"]');
  };
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');

  // Oversigten: «Katalog» er det fjerde punkt og siger, hvor mange retter der kan søges i
  await aabnVoksen(H, side, '', n + ' katalog: oversigten');
  const punkter = await side.evaluate(() => [...document.querySelectorAll('.voksen-punkt')].map((b) => b.dataset.fokus));
  const status = await tekstAf(side, '[data-fokus="katalog"] .voksen-punkt-status');
  tjek(punkter[3] === 'katalog' && status === 'Søg i alle ' + retter(ALLE.length), n + ': «Katalog» er det fjerde punkt på oversigten (' + punkter.join(', ') + ' · ' + status + ')');
  await tryk(side, '[data-fokus="katalog"]');
  await venterPaa(side, () => location.hash === '#/voksen/katalog' && document.querySelector('main.voksen-katalog'), null, n + ': «Katalog» åbner kataloget');
  tjek(await h1(side) === 'Katalog', n + ': katalogets overskrift (' + await h1(side) + ')');
  const felt = await side.evaluate(() => {
    const f = document.getElementById('soeg-katalog');
    return f && { type: f.type, label: document.querySelector('label[for="soeg-katalog"]')?.textContent || '', hoejde: Math.round(f.getBoundingClientRect().height), vaerdi: f.value };
  });
  tjek(felt && felt.type === 'search' && felt.label === 'Søg i retterne' && felt.hoejde >= 48 && felt.vaerdi === '',
    n + ': søgefeltet er type="search" med den synlige label «Søg i retterne» og mindst 48 px højt (' + JSON.stringify(felt) + ')');
  tjek(ens(await raekker(side), ALLE) && await tekstAf(side, '.soeg-tal') === 'Viser alle ' + retter(ALLE.length),
    n + ': kataloget viser alle ' + ALLE.length + ' retter (' + await tekstAf(side, '.soeg-tal') + ')');
  const medVed = await side.evaluate(() => [...document.querySelectorAll('.voksen-raekke')].filter((r) => r.querySelector('[data-fokus^="ret-"]')).map((r) => r.dataset.ret));
  tjek(ens(medVed, UGEPLAN.map((p) => p.id)), n + ': «Med i udvalget» står kun ved de ' + UGEPLAN.length + ' retter til ugeplanen (' + medVed.length + ')');
  tjek(await side.locator('.voksen-katalog [data-fokus^="fav-"]').count() === ALLE.length && await side.locator('.voksen-katalog [data-fokus^="aabn-"]').count() === ALLE.length,
    n + ': hver ret i kataloget har et hjerte og «Åbn»');
  // Review-fund 8 (02-11): på en lav skærm starter filtrene foldet sammen, så den første ret ses (før: y≈757 på 820 px)
  const start = await side.evaluate(() => ({ open: document.querySelector('.voksen-filtre').open,
    top: Math.round(document.querySelector('.voksen-liste .voksen-raekke').getBoundingClientRect().top), H: innerHeight }));
  tjek(start.open === !kompakt && start.top < start.H - 120, n + ': grupper og mærker er ' + (kompakt ? 'foldet sammen' : 'foldet ud') + ', og den første ret ses (' + JSON.stringify(start) + ')');
  // Review-fund 9 (02-11): på telefonen får knapperne kun deres egen linje i rækker med «Med». Uden «Med» står hjertet og
  // «Åbn» ved billedet, og navnet har stadig plads (ikke ét bogstav pr. linje)
  const telefon = skaerm.viewport.width <= 700;
  const linjer = await side.evaluate(() => [...document.querySelectorAll('.voksen-katalog .voksen-raekke')].map((r) => {
    const knapper = r.querySelector('.voksen-raekke-knapper');
    return { id: r.dataset.ret, med: knapper.classList.contains('med-udvalg'), egenLinje: knapper.getBoundingClientRect().top >= r.querySelector('.voksen-raekke-billede').getBoundingClientRect().bottom - 1,
      navn: Math.round(r.querySelector('.voksen-raekke-navn').getBoundingClientRect().width) };
  }));
  const forkert = linjer.filter((l) => l.egenLinje !== (telefon && l.med)).map((l) => l.id);
  const smal = linjer.filter((l) => l.navn < 80).map((l) => l.id + ' ' + l.navn + ' px');
  tjek(forkert.length === 0 && smal.length === 0 && linjer.some((l) => l.med) && linjer.some((l) => !l.med),
    n + ': knapperne har ' + (telefon ? 'kun deres egen linje i rækker med «Med»' : 'aldrig deres egen linje') + ', og navnene er mindst 80 px brede ('
    + JSON.stringify({ forkert: forkert.slice(0, 5), smal: smal.slice(0, 5), med: linjer.filter((l) => l.med).length, i_alt: linjer.length }) + ')');
  await tjekLayout(side, n + ' katalog');
  await foto(side, n + '-voksen-katalog');

  // «jul», ét tegn ad gangen: feltet tegnes aldrig om, og listen ender med præcis juleretterne
  await tryk(side, '#soeg-katalog');
  await skrivTegnForTegn(H, side, '#soeg-katalog', 'jul', n + ' katalog', (t) => ids(POSTER, t));
  tjek(ens(await raekker(side), JUL) && await tekstAf(side, '.soeg-tal') === 'Viser ' + JUL.length + ' af ' + retter(ALLE.length),
    n + ': «jul» viser kun de ' + JUL.length + ' juleretter (' + await tekstAf(side, '.soeg-tal') + ')');
  tjek((await feltNu(side, 'soeg-katalog')).ryd === false, n + ': «Ryd søgningen» (×) står i feltet, når der er skrevet noget');
  await tjekLayout(side, n + ' katalog med «jul»');
  await foto(side, n + '-voksen-katalog-jul');

  // Hjertet fra kataloget: favorit, fokus bliver på hjertet, og søgningen står der stadig, efter at skærmen er tegnet om
  const julRet = JUL[0];
  await tryk(side, '[data-fokus="fav-' + julRet + '"]');
  let f = await laesLager(side, FAMILIE);
  const hjerte = await side.evaluate((id) => ({
    trykket: document.querySelector('[data-fokus="fav-' + id + '"]')?.getAttribute('aria-pressed'),
    fokus: document.activeElement?.dataset?.fokus || document.activeElement?.tagName,
    soegning: document.getElementById('soeg-katalog').value,
    maerker: (document.querySelector('.voksen-raekke[data-ret="' + id + '"] .voksen-raekke-maerker')?.textContent || '').replace(/\s+/g, ' '),
  }), julRet);
  tjek(f && ens(f.favoritter, [julRet]) && hjerte.trykket === 'true' && hjerte.fokus === 'fav-' + julRet,
    n + ': hjertet i kataloget gør ' + julRet + ' til favorit, og fokus bliver på hjertet (' + JSON.stringify({ favoritter: f && f.favoritter, ...hjerte }) + ')');
  tjek(hjerte.soegning === 'jul' && ens(await raekker(side), JUL), n + ': søgningen «jul» står der stadig, efter at hjertet har tegnet skærmen om');
  tjek(hjerte.maerker.startsWith('Jul') && hjerte.maerker.includes('❤️ Favorit'), n + ': rækken viser gruppen og mærket ❤️ Favorit (' + hjerte.maerker + ')');

  // × tømmer feltet, giver det fokus og viser alle retter
  await tryk(side, '.soeg-ryd');
  let nu = await feltNu(side, 'soeg-katalog');
  tjek(nu.vaerdi === '' && nu.fokus && nu.ryd === true && ens(await raekker(side), ALLE), n + ': × tømmer søgefeltet, giver det fokus og viser alle retter (' + JSON.stringify(nu) + ')');

  // Grupperne (med antal): «Aftensmad» viser kun aftensmad, og linjen over chipsene siger, hvad der er valgt. På en
  // kompakt skærm foldes de ud først
  if (kompakt) {
    await tryk(side, '.voksen-filtre > summary');
    tjek(await side.evaluate(() => document.querySelector('.voksen-filtre').open), n + ': et tryk på «Grupper og mærker» folder filtrene ud');
  }
  // Review 02-11: de udfoldede filtre tjekkes også (før stod de kun lukkede ved tjekLayout), og linjen over dem fylder
  // hele bredden (app.css' «.filtre { display: flex }» gjorde den kun så bred som teksten, før klassen fik sit voksen-navn)
  const linje = await side.evaluate(() => {
    const d = document.querySelector('.voksen-filtre');
    return { display: getComputedStyle(d).display, boks: Math.round(d.getBoundingClientRect().width), linje: Math.round(d.querySelector('summary').getBoundingClientRect().width) };
  });
  tjek(linje.display === 'block' && linje.linje >= linje.boks - 2, n + ': linjen over filtrene fylder hele bredden (' + JSON.stringify(linje) + ')');
  await tjekLayout(side, n + ' katalog med filtrene foldet ud');
  const chips = await side.evaluate(() => [...document.querySelectorAll('[data-fokus^="gruppe-"]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  const ventChips = ['Alle (' + ALLE.length + ')', ...GRUPPE_IDS.map((g) => GRUPPER[g] + ' (' + POSTER.filter((p) => p.gruppeId === g).length + ')')];
  tjek(ens(chips, ventChips), n + ': gruppe-chipsene med antal (' + chips.join(', ') + ')');
  await tryk(side, '[data-fokus="gruppe-aftensmad"]');
  const gruppe = await side.evaluate(() => ({
    trykket: document.querySelector('[data-fokus="gruppe-aftensmad"]').getAttribute('aria-pressed'),
    alle: document.querySelector('[data-fokus="gruppe-alle"]').getAttribute('aria-pressed'),
    valgt: document.querySelector('.voksen-filtre-valgt')?.textContent || '',
    fokus: document.activeElement?.dataset?.fokus || '',
    open: document.querySelector('.voksen-filtre').open,
    top: Math.round(document.querySelector('.voksen-liste .voksen-raekke').getBoundingClientRect().top), H: innerHeight,
  }));
  tjek(ens(await raekker(side), AFTENSMAD.map((p) => p.id)) && gruppe.trykket === 'true' && gruppe.alle === 'false' && gruppe.valgt === 'Aftensmad'
    && gruppe.fokus === (kompakt ? 'filtre-katalog' : 'gruppe-aftensmad'),
    n + ': «Aftensmad» viser kun de ' + AFTENSMAD.length + ' retter til aftensmad (' + JSON.stringify(gruppe) + ')');
  // Review-fund 3 (02-11): på en kompakt skærm folder valget filtrene sammen, så tallet og den første ret ses, og fokus
  // står på linjen, der siger, hvad der er valgt. Ellers bliver filtrene stående
  tjek(gruppe.open === !kompakt && (!kompakt || gruppe.top < gruppe.H - 60),
    n + ': ' + (kompakt ? 'valget folder filtrene sammen, og den første ret ses over kanten' : 'filtrene bliver foldet ud efter valget') + ' (' + JSON.stringify(gruppe) + ')');
  tjek(await tekstAf(side, '.soeg-tal') === 'Viser ' + AFTENSMAD.length + ' af ' + retter(ALLE.length), n + ': tallet følger gruppen (' + await tekstAf(side, '.soeg-tal') + ')');
  await tjekLayout(side, n + ' katalog: aftensmad');

  // … og søgningen inden for gruppen. På en kompakt skærm folder det første tegn de udfoldede filtre sammen (review-fund 3)
  if (kompakt) await tryk(side, '.voksen-filtre > summary');
  await tryk(side, '#soeg-katalog');
  await skrivTegnForTegn(H, side, '#soeg-katalog', 'kylling', n + ' katalog, aftensmad', (t) => ids(AFTENSMAD, t));
  if (kompakt) tjek(!await side.evaluate(() => document.querySelector('.voksen-filtre').open), n + ': søgningen folder filtrene sammen');
  const kylling = ids(AFTENSMAD, 'kylling');
  const kyllingUge = UGEPLAN.map((p) => p.id).filter((id) => kylling.includes(id));
  tjek(kyllingUge.length >= 2, n + ': mindst to retter til ugeplanen med kylling (' + kyllingUge.join(', ') + ')');
  await tjekLayout(side, n + ' katalog: aftensmad med «kylling»');
  await foto(side, n + '-voksen-katalog-kylling');

  // «Med» fra kataloget: retten kommer i udvalget, og overskriftens linje tæller med
  const medRet = kyllingUge[0];
  await tryk(side, '[data-fokus="ret-' + medRet + '"]');
  f = await laesLager(side, FAMILIE);
  tjek(f && f.udvalg && ens(f.udvalg.ids, [medRet]) && await side.locator('[data-fokus="ret-' + medRet + '"]').getAttribute('aria-pressed') === 'true',
    n + ': «Med» i kataloget sætter ' + medRet + ' i udvalget (' + JSON.stringify(f && f.udvalg) + ')');
  tjek(await tekstAf(side, '.voksen-undertitel') === 'Ugens udvalg: 1 af 24' && (await feltNu(side, 'soeg-katalog')).vaerdi === 'kylling',
    n + ': overskriften siger «Ugens udvalg: 1 af 24», og søgningen står der stadig (' + await tekstAf(side, '.voksen-undertitel') + ')');

  // Grænsen: med 24 retter i udvalget er «Med» aria-disabled, og et tryk siger det i rækken, som på udvalgssiden. Søgningen
  // og gruppen huskes, når man går til oversigten og tilbage (låsen er ikke lukket)
  const anden = kyllingUge[1];
  const fyldte = UGEPLAN.map((p) => p.id).filter((id) => id !== anden).slice(0, 24);
  await saetLager(side, FAMILIE, { ...f, udvalg: { ids: fyldte, rettet: f.udvalg.rettet } });
  await tryk(side, 'main .knap[aria-label="Tilbage til voksendelen"]');
  await venterPaa(side, () => location.hash === '#/voksen' && document.querySelector('main.voksen-hub'), null, n + ': «Tilbage» fra kataloget går til oversigten');
  await tryk(side, '[data-fokus="katalog"]');
  await venterPaa(side, () => document.querySelector('main.voksen-katalog'), null, n + ': kataloget igen fra oversigten');
  const husket = await side.evaluate(() => ({ soegning: document.getElementById('soeg-katalog').value, gruppe: document.querySelector('[data-fokus="gruppe-aftensmad"]').getAttribute('aria-pressed') }));
  tjek(husket.soegning === 'kylling' && husket.gruppe === 'true', n + ': søgningen og gruppen huskes mellem voksendelens sider (' + JSON.stringify(husket) + ')');
  tjek(await side.locator('[data-fokus="ret-' + anden + '"]').getAttribute('aria-disabled') === 'true', n + ': «Med» er aria-disabled, når udvalget er fuldt');
  await tryk(side, '[data-fokus="ret-' + anden + '"]', AFVIST);
  const fuld = await tekstAf(side, '.voksen-raekke[data-ret="' + anden + '"] .uge-besked');
  f = await laesLager(side, FAMILIE);
  tjek(fuld === 'Udvalget er fuldt: højst 24 retter. Fjern en ret først.' && ens(f.udvalg.ids, fyldte),
    n + ': «Med» ved et fuldt udvalg siger grænsen i rækken og ændrer intet (' + fuld + ')');
  await tjekLayout(side, n + ' katalog: fuldt udvalg');

  // Ingen træf: en kort tekst med det, der er søgt efter, og «Ryd søgningen» og «Fjern filtrene»
  await tryk(side, '.soeg-ryd');
  await skrivTegnForTegn(H, side, '#soeg-katalog', 'xyzzy', n + ' katalog, ingen træf', (t) => ids(AFTENSMAD, t));
  const tom = await side.evaluate(() => ({ tekst: document.querySelector('.voksen-tom p')?.textContent || '', knapper: [...document.querySelectorAll('.voksen-tom .knap')].map((b) => b.dataset.fokus) }));
  tjek(tom.tekst === 'Ingen retter passer til «xyzzy» med de valgte filtre.' && ens(tom.knapper, ['ryd-soegning', 'fjern-filtre']),
    n + ': ingen træf viser teksten og «Ryd søgningen» og «Fjern filtrene» (' + JSON.stringify(tom) + ')');
  tjek(await tekstAf(side, '.soeg-tal') === 'Viser 0 af ' + retter(ALLE.length), n + ': tallet ved ingen træf (' + await tekstAf(side, '.soeg-tal') + ')');
  await tjekLayout(side, n + ' katalog: ingen træf');
  await foto(side, n + '-voksen-katalog-ingen');
  // Review-fund 4 (02-11): en lang søgetekst uden mellemrum (feltet tillader 60 tegn) brydes inden for skærmen og ikke
  // ét bogstav pr. linje
  await side.fill('#soeg-katalog', 'x'.repeat(60));
  const lang = await side.evaluate(() => {
    const r = document.querySelector('.voksen-tom p').getBoundingClientRect();
    return { venstre: Math.round(r.left), hoejre: Math.round(r.right), hoejde: Math.round(r.height), W: innerWidth };
  });
  tjek(lang.venstre >= 0 && lang.hoejre <= lang.W && lang.hoejde < 200, n + ': en søgning på 60 tegn uden mellemrum brydes inden for skærmen (' + JSON.stringify(lang) + ')');
  await tjekLayout(side, n + ' katalog: lang søgning');
  await foto(side, n + '-voksen-katalog-lang');
  await tryk(side, '[data-fokus="ryd-soegning"]');
  nu = await feltNu(side, 'soeg-katalog');
  tjek(nu.vaerdi === '' && nu.fokus && ens(await raekker(side), AFTENSMAD.map((p) => p.id)), n + ': «Ryd søgningen» tømmer feltet, giver det fokus og viser gruppen igen (' + JSON.stringify(nu) + ')');
  await chip('gruppe-alle');
  tjek(ens(await raekker(side), ALLE), n + ': «Alle» viser alle retter igen');

  // «Åbn» går til retten. Ud af voksendelen lukker låsen, og søgningen, gruppen og foldningen er glemt, når den åbnes igen
  await chip('gruppe-jul');
  await tryk(side, '#soeg-katalog');
  await side.keyboard.type('jul');
  await tryk(side, '[data-fokus="aabn-' + julRet + '"]');
  await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), julRet, n + ': «Åbn» åbner ' + julRet);
  await aabnVoksen(H, side, '/katalog', n + ' kataloget efter låsen');
  const glemt = await side.evaluate(() => ({ soegning: document.getElementById('soeg-katalog').value, alle: document.querySelector('[data-fokus="gruppe-alle"]').getAttribute('aria-pressed'), open: document.querySelector('.voksen-filtre').open }));
  tjek(glemt.soegning === '' && glemt.alle === 'true' && glemt.open === !kompakt && ens(await raekker(side), ALLE),
    n + ': efter låsen er søgningen og gruppen glemt (' + JSON.stringify(glemt) + ')');

  // Søgefeltet på favoritterne og udvalget: samme felt, der heller ikke tegnes om, mens der skrives
  await aabnVoksen(H, side, '/favoritter', n + ' favoritter med søgning');
  await tryk(side, '#soeg-favoritter');
  await skrivTegnForTegn(H, side, '#soeg-favoritter', 'kyl', n + ' favoritter', (t) => ids(POSTER, t));
  tjek(await tekstAf(side, '.soeg-tal') === 'Viser ' + ids(POSTER, 'kyl').length + ' af ' + retter(ALLE.length), n + ': tallet på favoritterne (' + await tekstAf(side, '.soeg-tal') + ')');
  await tjekLayout(side, n + ' favoritter med søgning');
  await foto(side, n + '-voksen-favoritter-soeg');
  await aabnVoksen(H, side, '/udvalg', n + ' udvalg med søgning');
  tjek((await feltNu(side, 'soeg-udvalg')).vaerdi === '', n + ': udvalget har sin egen søgning (tom)');
  await tryk(side, '#soeg-udvalg');
  await skrivTegnForTegn(H, side, '#soeg-udvalg', 'kyl', n + ' udvalg', (t) => ids(UGEPLAN, t));
  tjek(await tekstAf(side, '.soeg-tal') === 'Viser ' + ids(UGEPLAN, 'kyl').length + ' af ' + retter(UGEPLAN.length) && await tekstAf(side, '.udvalg-tal') === '24 af 24 valgt',
    n + ': udvalget viser søgningens tal og stadig «24 af 24 valgt» (' + await tekstAf(side, '.soeg-tal') + ' · ' + await tekstAf(side, '.udvalg-tal') + ')');
  // Review-fund 2 (02-11): på en kompakt skærm står mærkerne foldet sammen, så den første ret ses lige under søgefeltet
  if (kompakt) {
    const u = await side.evaluate(() => ({ open: document.querySelector('.voksen-udvalg .voksen-filtre').open,
      top: Math.round(document.querySelector('.voksen-liste .voksen-raekke').getBoundingClientRect().top), H: innerHeight }));
    tjek(!u.open && u.top < u.H - 60, n + ': udvalgets mærker er foldet sammen, og den første ret ses over kanten efter «kyl» (' + JSON.stringify(u) + ')');
  }
  await tjekLayout(side, n + ' udvalg med søgning');
  await foto(side, n + '-voksen-udvalg-soeg');
  // … og med mærkerne foldet ud (review 02-11: på en kompakt skærm blev de ellers aldrig tegnet ved tjekLayout). Bagefter
  // foldes de sammen igen, for åbningen huskes, mens siden står
  if (kompakt) {
    await tryk(side, '.voksen-udvalg .voksen-filtre > summary');
    await tjekLayout(side, n + ' udvalg med mærkerne foldet ud');
    await tryk(side, '.voksen-udvalg .voksen-filtre > summary');
  }

  // «Luk» glemmer søgningen
  await aabnVoksen(H, side, '', n + ' oversigten før «Luk»');
  await tryk(side, '[data-fokus="luk"]');
  await venterPaa(side, () => location.hash === '#/' && document.querySelector('.voksen-knap'), null, n + ': «Luk» går til forsiden');
  await aabnVoksen(H, side, '/udvalg', n + ' udvalget efter «Luk»');
  tjek((await feltNu(side, 'soeg-udvalg')).vaerdi === '' && ens(await raekker(side), UGEPLAN.map((p) => p.id)), n + ': efter «Luk» er søgningen på udvalget glemt');

  await vent(100);
  tjek(side.fejl.length === 0, n + ' (kataloget): ' + side.fejl.join(' | '));
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
  r = await aabn(TAERTE + '&n=6');
  tjek(r.noter.includes(FORM), n + ': ' + TAERTE + ' ved 6 portioner siger, at dejen er rundet op til hele (' + JSON.stringify(r.noter) + ')');
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
  // Ingen ret er lavet endnu, så ingen er «ny for os» (ellers var alle retter nye)
  await gaaTil(side, '#/uge/vaelg/rosa');
  await venterPaa(side, () => location.hash === '#/uge/vaelg/rosa' && document.querySelector('.ret-gitter'), null, n + ': børnenes valg med data fra v3');
  tjek(await side.locator('.maerke-ny').count() === 0, n + ': uden noget lavet har ingen ret ✨ i børnenes valg');
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
  // Ved 0 børn er «Færre børn» aria-disabled, og et tryk siger grænsen i stedet for ingenting
  tjek(await side.locator('[data-fokus="boern-minus"]').getAttribute('aria-disabled') === 'true', n + ': «Færre børn» er aria-disabled ved 0 børn');
  await tryk(side, '[data-fokus="boern-minus"]', AFVIST);
  await venterPaa(side, () => document.getElementById('meddelelse').textContent === 'Mindst 0 børn', null, n + ': «Færre børn» ved 0 siger «Mindst 0 børn»');
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

// 10. En nyere udgave har gemt kog-familie-v1: oversigten står stadig med vejen til ugeplanen, men husstand, udvalg og
// favoritter kan ikke åbnes, og færdig-skærmen siger, hvorfor hjertet ikke kunne gemmes. Familien røres ikke
async function nyereFamilie(browser, H) {
  const { BASE, SKAERME, nySide, tjek, tryk, venterPaa } = H;
  const n = SKAERME[0].navn;
  console.log('[' + n + '] voksendelen: familien er gemt med en nyere udgave');
  const nyere = JSON.stringify({ v: 2, voksne: 3, boern: 1 });
  const { ctx, side } = await nySide(browser, SKAERME[0], { serviceWorkers: 'block' });
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await side.evaluate(() => localStorage.clear());
  await saetLager(side, FAMILIE, nyere);
  await side.reload();
  await side.waitForSelector('.kort[data-ret]');
  await aabnVoksen(H, side, '', n + ' voksendelen med en nyere familie');
  const punkter = await side.evaluate(() => Object.fromEntries([...document.querySelectorAll('.voksen-punkt')]
    .map((b) => [b.dataset.fokus, (b.disabled ? 'låst: ' : '') + (b.querySelector('.voksen-punkt-status')?.textContent || '').replace(/\s+/g, ' ')])));
  tjek(['husstand', 'udvalg', 'favoritter'].every((k) => punkter[k] === 'låst: Lavet med en nyere udgave') && !/låst/.test(punkter.ugeplan + punkter.indkoeb),
    n + ': husstand, udvalg og favoritter er låst, ugeplanen og listen ikke (' + JSON.stringify(punkter) + ')');
  const groen = await side.evaluate(() => {
    const b = document.querySelector('[data-fokus="groent"]');
    return b ? (b.disabled ? 'låst: ' : '') + (document.getElementById('groent-status')?.textContent || '') : null;
  });
  tjek(groen === 'låst: Lavet med en nyere udgave', n + ': «Mere grønt i maden» er låst med en nyere familie (' + groen + ')');
  await tryk(side, '[data-fokus="ugeplan"]');
  await venterPaa(side, () => location.hash === '#/uge' && document.querySelector('.uge-dage'), null, n + ': ugeplanen kan nås fra oversigten');
  await gaaTil(side, '#/voksen/husstand');
  await venterPaa(side, () => document.querySelector('.voksen-vagt'), null, n + ': holdet ved husstanden');
  await holdHer(H, side, '.voksen-vagt');
  await venterPaa(side, () => document.querySelector('main h1')?.textContent === 'Voksendelen er gemt med en nyere udgave', null, n + ': husstanden siger, at familien er gemt med en nyere udgave');
  await tryk(side, 'main .knap[aria-label="Tilbage til voksendelen"]');
  await venterPaa(side, () => location.hash === '#/voksen' && document.querySelector('main.voksen-hub'), null, n + ': «Tilbage» går til oversigten');
  await gaaTil(side, '#/ret/' + RET + '/faerdig');
  await venterPaa(side, () => document.querySelector('main.faerdig h1'), null, n + ': færdig-skærmen med en nyere familie');
  await tryk(side, '.hjerte-knap');
  const fejl = await tekstAf(side, '.faerdig .voksen-linje:not([hidden])');
  tjek(fejl.includes('nyere udgave') && await side.locator('.hjerte-knap').getAttribute('aria-pressed') === 'false',
    n + ': hjertet gemmes ikke, og færdig-skærmen siger, at det er en nyere udgave (' + fejl + ')');
  tjek(JSON.stringify(await raatLager(side)) === JSON.stringify([nyere, null, null]), n + ': den nyere familie er urørt');
  tjek(side.fejl.length === 0, n + ' (nyere familie): ' + side.fejl.join(' | '));
  await ctx.close();
}

// 11. Husstanden 8 + 8 (13,6 portioner): loftet på 12 står i summen og på oversigten, så ingen tror, der er nok til 14.
// Og ved 8 siger «Flere» grænsen
async function husstandLoft(browser, H) {
  const { BASE, SKAERME, nySide, tjek, tjekLayout, tryk, venterPaa } = H;
  const n = SKAERME[0].navn;
  console.log('[' + n + '] voksendelen: husstanden 8 + 8 og loftet på 12 portioner');
  const LOFT = '12 portioner (højst 12 — lav retten to gange til flere)';
  const { ctx, side } = await nySide(browser, SKAERME[0], { serviceWorkers: 'block' });
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await side.evaluate(() => localStorage.clear());
  await saetLager(side, FAMILIE, { v: 1, voksne: 8, boern: 8, barnAndel: 0.7, udvalg: null, favoritter: [], lavet: {} });
  await aabnVoksen(H, side, '', n + ' voksendelen med 8 + 8');
  const status = await tekstAf(side, '[data-fokus="husstand"] .voksen-punkt-status');
  tjek(status === '8 voksne og 8 børn = ' + LOFT, n + ': oversigten siger, at 8 + 8 er skåret ned til 12 (' + status + ')');
  await tjekLayout(side, n + ' oversigten med loftet');
  await aabnVoksen(H, side, '/husstand', n + ' husstanden 8 + 8');
  const sum = await tekstAf(side, '.husstand-sum');
  tjek(sum === '= ' + LOFT, n + ': husstanden siger, at 8 + 8 er skåret ned til 12 (' + sum + ')');
  // Ved 8 er «Flere» aria-disabled (fokus bliver på knappen), og et tryk siger grænsen
  const graense = await side.evaluate(() => ['voksne-minus', 'voksne-plus', 'boern-plus'].map((k) => document.querySelector('[data-fokus="' + k + '"]').getAttribute('aria-disabled')));
  tjek(JSON.stringify(graense) === JSON.stringify([null, 'true', 'true']), n + ': ved 8 er kun «Flere» aria-disabled (' + JSON.stringify(graense) + ')');
  await tryk(side, '[data-fokus="voksne-plus"]', AFVIST);
  await venterPaa(side, () => document.getElementById('meddelelse').textContent === 'Højst 8 voksne', null, n + ': «Flere voksne» ved 8 siger «Højst 8 voksne»');
  tjek(await tekstAf(side, '.stepper-tal') === '8 voksne', n + ': de voksne er stadig 8');
  tjek(side.fejl.length === 0, n + ' (8 + 8): ' + side.fejl.join(' | '));
  await ctx.close();
}

// 12. Åbnes #/voksen, mens opskrifterne hentes, står «Henter opskrifterne …» der først og holdet bagefter, så holdet
// ikke tegnes om midt i et tryk
async function henterFoerHoldet(browser, H) {
  const { BASE, SKAERME, nySide, tjek, venterPaa } = H;
  const n = SKAERME[0].navn;
  console.log('[' + n + '] voksendelen: holdet først, når opskrifterne er hentet');
  const { ctx, side } = await nySide(browser, SKAERME[0], { serviceWorkers: 'block' });
  await side.route('**/opskrifter/index.json', async (r) => { await H.vent(1500); await r.continue().catch(() => {}); });
  await side.goto(BASE + '/index.html#/voksen');
  await venterPaa(side, () => (document.querySelector('main h1')?.textContent || '').startsWith('Henter opskrifterne'), null, n + ': «Henter opskrifterne …» først');
  tjek(await side.locator('.voksen-vagt').count() === 0, n + ': holdet står der ikke, mens opskrifterne hentes');
  await venterPaa(side, () => document.querySelector('.voksen-vagt'), null, n + ': holdet, når opskrifterne er hentet');
  await holdHer(H, side, '.voksen-vagt');
  await venterPaa(side, () => location.hash === '#/voksen' && document.querySelector('main.voksen-hub'), null, n + ': holdet åbner oversigten');
  tjek(side.fejl.length === 0, n + ' (henter før holdet): ' + side.fejl.join(' | '));
  await ctx.close();
}

// 14. «Mere grønt i maden» (js/groent.js). Det forventede regnes af appens egen kode (lavModel(...).groen, medMereGroent,
// kod, saml). På iPad'en hele vejen: kontakten, retten, ingrediensen med iPad-stemmen (Røst har ikke de nye linjer endnu),
// det nye trin, printet og dets strenge groen=1, ugeplanens pris, «Send til telefon» med et v2-link og listen på
// telefonen, og at kontakten ikke rører den gemte plan. På telefonen: kontakten og retten med layout og foto
const GROEN_RET = 'koedsovs';
const GROEN_TRIN = 'Hæld linser og vand i gryden.';
const groenKontakt = (side) => side.evaluate(() => {
  const b = document.querySelector('[data-fokus="groent"]');
  return b ? {
    rolle: b.getAttribute('role'), til: b.getAttribute('aria-checked'), laast: b.disabled,
    status: (document.getElementById('groent-status')?.textContent || '').replace(/\s+/g, ' '),
    hoejde: Math.round(b.getBoundingClientRect().height), fokus: document.activeElement === b,
  } : null;
});
const retVist = (side) => side.evaluate(() => ({
  ingr: [...document.querySelectorAll('.ingr')].map((b) => b.getAttribute('aria-label')),
  linjer: [...document.querySelectorAll('.ret .voksen-linje')].map((e) => e.textContent),
}));

async function skiftGroent(H, side, til, hvor) {
  await aabnVoksen(H, side, '', hvor + ': oversigten');
  await H.tryk(side, '[data-fokus="groent"]');
  await H.venterPaa(side, (x) => document.querySelector('[data-fokus="groent"]')?.getAttribute('aria-checked') === x, String(til), hvor + ': kontakten slås ' + (til ? 'til' : 'fra'));
  return groenKontakt(side);
}

async function mereGroent(browser, H, skaerm) {
  const { BASE, RETTER, SKAERME, nySide, tjek, tjekLayout, foto, tryk, venterPaa, h1 } = H;
  const n = skaerm.navn;
  const ipad = n === 'ipad';
  console.log('[' + n + '] voksendelen: «Mere grønt i maden»');
  const grund = lavModel(RETTER[GROEN_RET]);
  const groen = grund.groen;
  tjek(Boolean(groen), GROEN_RET + ' har en udgave med mere grønt');
  if (!groen) return;
  const antal = Object.values(RETTER).filter((j) => j.tumbi && 'mere_groent' in j.tumbi).length;
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await ctx.addInitScript(fakeDeling);
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.kort[data-ret]');
  await side.evaluate(() => localStorage.clear());

  // Kontakten: slået fra som standard, og slået til gemmes i familien
  await aabnVoksen(H, side, '', n + ' oversigten');
  let k = await groenKontakt(side);
  tjek(k && k.rolle === 'switch' && k.til === 'false' && !k.laast && k.status === 'Slået fra' && k.hoejde >= 48,
    n + ': kontakten står slået fra, er mindst 48 px og har role="switch" (' + JSON.stringify(k) + ')');
  k = await skiftGroent(H, side, true, n);
  tjek(k.status === 'Halvt kød og halvt røde linser i ' + antal + (antal === 1 ? ' ret' : ' retter') && k.fokus,
    n + ': slået til siger antallet af retter, og fokus bliver på kontakten (' + JSON.stringify(k) + ')');
  tjek((await laesLager(side, FAMILIE) || {}).mereGroent === true, n + ': valget er gemt i familien');
  await tjekLayout(side, n + ' oversigten med «Mere grønt i maden»');
  await foto(side, n + '-voksen-groent');

  // Retten: halvt kød, linser og vand, og linjen til den voksne
  await gaaTil(side, '#/ret/' + GROEN_RET);
  await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), GROEN_RET, n + ': retten med mere grønt');
  let ret = await retVist(side);
  tjek(JSON.stringify(ret.ingr) === JSON.stringify(groen.ingredienser.map((x) => x.tekst)),
    n + ': retten viser ingredienserne med mere grønt (' + ret.ingr.slice(0, 3).join(' | ') + ' …)');
  tjek(JSON.stringify(ret.linjer) === JSON.stringify([GROENT_TEKST]), n + ': linjen til den voksne (' + JSON.stringify(ret.linjer) + ')');
  await tjekLayout(side, n + ' retten med mere grønt', { knapperSes: n !== 'iphone' });
  await foto(side, n + '-voksen-groent-ret');
  if (ipad) {
    // Modellens ingredienser har ikke varen, så linjen findes på ikonet «linser» (kødsovsens linje med røde linser)
    const linser = groen.ingredienser.findIndex((x) => x.ikon === 'linser');
    tjek(linser >= 0, n + ': retten med mere grønt har en linje med ikonet «linser»');
    if (linser >= 0) await tryk(side, '.ingr >> nth=' + linser);
    const sagt = await sidsteTale(side);
    tjek(linser >= 0 && sagt && (sagt.fil ? sagt.fil === GROEN_RET + '/' + groen.ingredienser[linser].lyd + '.mp3' : sagt.tekst === tilTale(groen.ingredienser[linser].tekst)),
      n + ': de røde linser læses op med deres egen fil eller iPad-stemmen (' + JSON.stringify(sagt) + ')');
    const nr = groen.trin.findIndex((x) => x.tekst === GROEN_TRIN) + 1;
    await gaaTil(side, '#/ret/' + GROEN_RET + '/trin/' + nr);
    await venterPaa(side, () => document.querySelector('.trin h1'), null, n + ': trin ' + nr);
    tjek(nr > 0 && await h1(side) === GROEN_TRIN, n + ': trin ' + nr + ' er det nye trin med linserne (' + await h1(side) + ')');
    await gaaTil(side, '#/ret/' + GROEN_RET);
    await venterPaa(side, () => document.querySelector('.ret h1'), null, n + ': tilbage til retten');

    // Printet fra retten får groen=1 med. Alt andet end præcis ét groen=1 giver grundretten
    await holdHer(H, side, '.print-knap');
    await venterPaa(side, (id) => location.pathname.endsWith('/print.html') && location.search === '?ret=' + id + '&groen=1' && document.querySelector('.tjek li'), GROEN_RET, n + ': «Print» skal åbne print.html?ret=' + GROEN_RET + '&groen=1');
    const print = () => side.evaluate(() => ({
      linjer: [...document.querySelectorAll('.tjek li')].map((li) => li.textContent),
      meta: [...document.querySelectorAll('.hoved .meta')].map((p) => p.textContent),
    }));
    let pr = await print();
    tjek(JSON.stringify(pr.linjer) === JSON.stringify(groen.ingredienser.map((x) => x.tekst)) && pr.meta.includes(GROENT_TEKST),
      n + ': printet viser retten med mere grønt og linjen (' + JSON.stringify(pr.meta) + ')');
    for (const daarlig of ['groen=1&groen=1', 'groen=true', 'groen=0', 'groen=', 'groen=01']) {
      await side.goto(BASE + '/print.html?ret=' + GROEN_RET + '&' + daarlig);
      await venterPaa(side, () => !document.getElementById('print').disabled, null, n + ' print ' + daarlig);
      pr = await print();
      tjek(JSON.stringify(pr.linjer) === JSON.stringify(RETTER[GROEN_RET].recipeIngredient) && !pr.meta.includes(GROENT_TEKST),
        n + ': «' + daarlig + '» giver grundretten på printet');
    }
    await side.goto(BASE + '/index.html');
    await side.waitForSelector('.kort[data-ret]');

    // Ugeplanen: prisen er rettens med mere grønt, og linket til telefonen er v2 med g
    const uge = planMandag(new Date());
    const dage = [{ ret: GROEN_RET, af: 'bo', n: 4 }, null, null, null, null, null, null];
    await saetLager(side, UGE, { v: 1, uge, dage, n: 4, prBarn: 1, rettet: null });
    await gaaTil(side, '#/uge');
    await venterPaa(side, () => document.querySelector('.uge-dage'), null, n + ': ugeplanen');
    const kr = Math.round((groen.uge.prisKr * 4) / groen.uge.portioner);
    const meta = await tekstAf(side, '.dag-meta');
    tjek(meta.includes('ca. ' + kr + ' kr.') && kr < Math.round((grund.uge.prisKr * 4) / grund.uge.portioner), n + ': ugeplanen regner med prisen med mere grønt (' + meta + ')');
    tjek((await tekstAf(side, '.uge-sum')).startsWith('Ca. ' + Math.round(kr / 10) * 10 + ' kr.'), n + ': summen (' + await tekstAf(side, '.uge-sum') + ')');
    await tryk(side, 'button:has-text("Send til telefon")');
    await venterPaa(side, () => window.__delt.length === 1, null, n + ': «Send til telefon» skal åbne delearket');
    const delt = await side.evaluate(() => window.__delt[0] || {});
    const kode = kod(uge, dage.map((d) => (d ? { ret: d.ret, n: d.n } : null)), { mereGroent: true });
    tjek(kode.startsWith('v2.') && delt.url === BASE + '/index.html#/hent/' + kode, n + ': linket er v2 med mere grønt (' + delt.url + ')');

    // Kontakten slås fra: retten er som før, og planen er urørt
    const foer = await raatLager(side);
    k = await skiftGroent(H, side, false, n);
    tjek(k.status === 'Slået fra' && (await laesLager(side, FAMILIE)).mereGroent === false, n + ': slået fra igen (' + JSON.stringify(k) + ')');
    tjek(JSON.stringify((await raatLager(side)).slice(1)) === JSON.stringify(foer.slice(1)), n + ': kontakten rører ikke den gemte plan og liste');
    await gaaTil(side, '#/ret/' + GROEN_RET);
    await venterPaa(side, (id) => location.hash === '#/ret/' + id && document.querySelector('.ret h1'), GROEN_RET, n + ': grundretten');
    ret = await retVist(side);
    tjek(JSON.stringify(ret.ingr) === JSON.stringify(grund.ingredienser.map((x) => x.tekst)) && !ret.linjer.length,
      n + ': slået fra viser retten som før og uden linjen (' + ret.ingr.slice(0, 3).join(' | ') + ' …)');
    tjek(side.fejl.length === 0, n + ' (mere grønt): ' + side.fejl.join(' | '));
    await ctx.close();

    // Telefonen har sin egen familie (slået fra), men listen følger linket: linser og halvt kød
    const tlf = await nySide(browser, SKAERME[1], { serviceWorkers: 'block' });
    await tlf.side.goto(delt.url || BASE + '/index.html#/hent/' + kode);
    await venterPaa(tlf.side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, 'iphone: v2-linket skal åbne listen');
    const forventet = grupper(saml([{ ret: medMereGroent(RETTER[GROEN_RET]), n: 4 }])).filter((g) => g.afd !== 'basis')
      .flatMap((g) => g.varer.map((v) => [v.id, (v.maengde || '').replace(/\s+/g, ' ')]));
    const vist = await tlf.side.evaluate(() => [...document.querySelectorAll('.liste-krop .afd:not(.har-vi-afd) li[data-vare]')]
      .map((li) => [li.dataset.vare, (li.querySelector('.vare-maengde')?.textContent || '').replace(/\s+/g, ' ')]));
    tjek(vist.some(([id]) => id === 'roede-linser') && JSON.stringify(vist) === JSON.stringify(forventet),
      'iphone: listen fra v2-linket har linserne og halvt kød (' + JSON.stringify(vist.slice(0, 4)) + ')');
    tjek(tlf.side.fejl.length === 0, 'iphone (listen med mere grønt): ' + tlf.side.fejl.join(' | '));
    await tlf.ctx.close();
    return;
  }
  tjek(side.fejl.length === 0, n + ' (mere grønt): ' + side.fejl.join(' | '));
  await ctx.close();
}
