// e2e-ugeplan.js — ugeplanen og indkøbslisten i WebKit (docs/ugeplan-plan.md). Køres af test-e2e.js med
// E2E_DELE=ugeplan, som giver sine hjælpere med (H). Det forventede regnes af appens egen kode (kod, saml, grupper),
// så testen ser, at skærmen viser det, modulerne regner ud.
// Telefonen (390×844): linket gemmer listen og skifter adressen til #/indkoeb, afkrydsninger overlever en genindlæsning,
// «Har vi», basisvarerne, samme link igen, et nyt link («Erstat listen?»), feltet «Sæt linket ind» og fjendtlige koder,
// hvor intet fra adressen må komme i DOM'en, og lageret ikke må ændres.
// iPad (1180×820) og desktop (1280×800): den voksnes oversigt, valget af en ret med filtrene, portionerne, «Send til
// telefon» (falsk delark, og linket åbnes på en telefon), «Del som tekst», kopiering og feltet uden delark, «Ny uge» og
// reglen om, at en dag, hvis opskrift ikke kunne hentes, ikke forsvinder, når en anden dag gemmes.
// Børnene (iPad): dyrene, fire retter pr. side med pilene, dagbrikkerne, optagne dage, én eller to retter pr. barn,
// stemmen ved hvert tryk (den falske stemme), fejlskærmen, når lageret er fuldt, og skærmene på højkant og telefonen.
import { kod } from '../js/plankode.js';
import { saml, grupper, tekst as listeTekst } from '../js/indkoeb.js';
import { planMandag, ugeNr } from '../js/tid.js';
import { tilTale } from '../js/tekst.js';
import * as R from '../js/replikker.js';

const LISTE = 'kog-liste-v1';
const DAG_MS = 86400000;
const plusDage = (dato, n) => new Date(Date.parse(dato + 'T00:00:00Z') + n * DAG_MS).toISOString().slice(0, 10);

export async function ugeplan(browser, H) {
  await telefon(browser, H);
  await oversigtIpad(browser, H);
  await boernValg(browser, H);
  await oversigtDesktop(browser, H);
}

// Det, listen skal vise for en plan: afdelingerne (uden basis) med varernes navne og basisvarerne for sig
function forventet(H, dage) {
  const valg = dage.filter(Boolean).map((d) => ({ ret: H.RETTER[d.ret], n: d.n }));
  const varer = saml(valg);
  const g = grupper(varer);
  return {
    varer,
    afd: g.filter((x) => x.afd !== 'basis').map((x) => ({ navn: x.navn, varer: x.varer.map((v) => v.navn) })),
    basis: (g.find((x) => x.afd === 'basis') || { varer: [] }).varer.map((v) => v.navn),
  };
}

const lager = (side) => side.evaluate((k) => localStorage.getItem(k), LISTE);
const hash = (side) => side.evaluate(() => location.hash);

// Listen, som den står på skærmen: afdelingernes overskrifter og varer, tallet øverst og de afkrydsede
const listeNu = (side) => side.evaluate(() => {
  const afd = [...document.querySelectorAll('.liste-krop > .afd:not(.har-vi-afd)')]
    .filter((s) => s.querySelector('[data-vare]') && !s.querySelector('.ret-link'))
    .map((s) => ({ navn: s.querySelector('h2').textContent, varer: [...s.querySelectorAll('li[data-vare] .vare-navn')].map((e) => e.textContent) }));
  const koebtSidst = [...document.querySelectorAll('.liste-krop > .afd ul.varer')].every((ul) => {
    const k = [...ul.children].map((li) => li.classList.contains('koebt'));
    return k.indexOf(true) === -1 || k.slice(k.indexOf(true)).every(Boolean);
  });
  return {
    h1: document.querySelector('h1')?.textContent || '',
    uge: document.querySelector('.liste-uge')?.textContent || '',
    tal: document.querySelector('.liste-tal')?.textContent || '',
    afd,
    koebt: [...document.querySelectorAll('li.koebt .vare-navn')].map((e) => e.textContent),
    trykket: [...document.querySelectorAll('.vare[aria-pressed="true"]')].length,
    harVi: [...document.querySelectorAll('.har-vi-afd .vare-navn')].map((e) => e.textContent),
    basisLukket: Boolean(document.querySelector('details.tjek-basis:not([open])')),
    basis: [...document.querySelectorAll('.basis-varer li')].map((e) => e.textContent),
    retter: [...document.querySelectorAll('.ret-link')].map((a) => a.getAttribute('href')),
    koebtSidst,
  };
});

// Åbner linket, som når man trykker på det i Beskeder: en ny indlæsning af siden
async function aabn(side, BASE, hashDel) {
  await side.goto('about:blank');
  await side.goto(BASE + '/index.html' + hashDel);
}

async function telefon(browser, H) {
  const { BASE, SKAERME, nySide, tjek, tjekLayout, foto, tryk, vent, venterPaa, h1, maal } = H;
  const skaerm = SKAERME[1];
  const n = skaerm.navn;
  console.log('[' + n + '] ugeplan: linket, indkøbslisten og fjendtlige koder');
  const uge = planMandag(new Date());
  const dage = [{ ret: 'koedsovs', n: 4 }, null, { ret: 'tunfrikadeller', n: 2 }, null, { ret: 'chorizo-pasta', n: 6 }, null, null];
  const kode = kod(uge, dage);
  const F = forventet(H, dage);
  const ialt = F.afd.reduce((s, a) => s + a.varer.length, 0);
  // Ingen service worker her: den gemmer filerne, og delen offline tester den for sig
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  const dialoger = [];
  side.on('dialog', (d) => { dialoger.push(d.message()); d.dismiss().catch(() => {}); });

  // 1. Ingen liste endnu: feltet «Sæt linket ind»
  await side.goto(BASE + '/index.html#/indkoeb');
  await side.waitForSelector('#link-felt');
  tjek(await h1(side) === 'Der er ingen indkøbsliste endnu', n + ': tom liste skal sige «Der er ingen indkøbsliste endnu» (' + await h1(side) + ')');
  tjek(await side.locator('label[for="link-felt"]').textContent() === 'Sæt linket ind', n + ': feltet skal hedde «Sæt linket ind»');
  await tjekLayout(side, n + ' tom indkøbsliste');
  await foto(side, n + '-ugeplan-tom-liste');

  // 2. Feltet: noget, der ikke er et link, giver den faste fejl; et link med et punktum efter (fra beskeden) virker
  await side.fill('#link-felt', 'Hej! MARK-felt-123');
  await tryk(side, '.link-knap');
  const feltFejl = await side.locator('#link-fejl').textContent();
  tjek(/^Linket kan ikke læses\./.test(feltFejl), n + ': et forkert link i feltet skal give «Linket kan ikke læses» (' + feltFejl + ')');
  tjek(!(await side.evaluate(() => document.getElementById('app').textContent)).includes('MARK-felt'), n + ': teksten fra feltet må ikke vises');
  tjek(await lager(side) === null, n + ': et forkert link må ikke gemme noget');
  await side.fill('#link-felt', 'Her er listen: ' + BASE + '/index.html#/hent/' + kode + '.');
  await tryk(side, '.link-knap');
  await venterPaa(side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': linket i feltet skal åbne listen');
  const gemt = JSON.parse(await lager(side) || '{}');
  tjek(gemt.kode === kode && gemt.uge === uge, n + ': listen skal gemmes med koden og ugen (' + gemt.kode + ', ' + gemt.uge + ')');
  tjek(JSON.stringify(gemt.varer) === JSON.stringify(F.varer), n + ': de gemte varer skal være saml() af ugens retter');

  // 3. Listen: afdelingerne i butikkens rækkefølge, basisvarerne lukket for sig og ugens retter
  let l = await listeNu(side);
  tjek(l.h1 === 'Indkøbsliste' && l.uge === 'Uge ' + ugeNr(uge), n + ': overskriften og ugen (' + l.h1 + ' · ' + l.uge + ')');
  tjek(JSON.stringify(l.afd) === JSON.stringify(F.afd), n + ': afdelingerne og varerne skal være grupper() af listen: ' + JSON.stringify(l.afd));
  tjek(l.tal === '0 af ' + ialt + ' købt', n + ': tallet øverst (' + l.tal + ', ventede 0 af ' + ialt + ')');
  tjek(l.basisLukket && l.basis.length === F.basis.length, n + ': «Tjek, at I har» skal være lukket og have ' + F.basis.length + ' varer (' + l.basis.length + ')');
  tjek(JSON.stringify(l.retter) === JSON.stringify(['#/ret/koedsovs', '#/ret/tunfrikadeller', '#/ret/chorizo-pasta']), n + ': ugens retter: ' + l.retter.join(', '));
  await tjekLayout(side, n + ' indkøbsliste');
  await foto(side, n + '-ugeplan-liste', { fullPage: true });

  // 4. Tre varer krydses af: de står overstreget nederst i afdelingen, og tallet følger med
  const krydset = [];
  for (let i = 0; i < 3; i++) {
    const navn = await side.locator('li[data-vare]:not(.koebt) .vare .vare-navn').first().textContent();
    await tryk(side, 'li[data-vare]:not(.koebt) .vare');
    krydset.push(navn);
  }
  l = await listeNu(side);
  tjek(l.tal === '3 af ' + ialt + ' købt' && l.trykket === 3, n + ': efter tre tryk: ' + l.tal + ', ' + l.trykket + ' trykket ned');
  tjek(krydset.every((v) => l.koebt.includes(v)), n + ': de afkrydsede varer: ' + l.koebt.join(', ') + ' (ventede ' + krydset.join(', ') + ')');
  tjek(l.koebtSidst, n + ': de købte varer skal stå nederst i deres afdeling');
  const fokus = await side.evaluate(() => document.activeElement?.closest('li.koebt')?.querySelector('.vare-navn')?.textContent || '');
  tjek(fokus === krydset[2], n + ': fokus skal følge den sidst afkrydsede vare (' + fokus + ')');
  // Varerne glider på plads (240 ms): billedet tages, når de står stille
  await side.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await foto(side, n + '-ugeplan-tre-koebt');
  await side.reload();
  await side.waitForSelector('.liste-tal');
  l = await listeNu(side);
  tjek(l.tal === '3 af ' + ialt + ' købt' && krydset.every((v) => l.koebt.includes(v)), n + ': afkrydsningerne skal overleve en genindlæsning (' + l.tal + ')');

  // 5. «Har vi»: varen flytter til «Har vi allerede» og tæller ikke med; «Skal købes» flytter den tilbage
  const harViNavn = await side.locator('li[data-vare]:not(.koebt) .vare-navn').first().textContent();
  await tryk(side, 'li[data-vare]:not(.koebt) .har-vi');
  l = await listeNu(side);
  tjek(l.harVi.includes(harViNavn) && l.tal === '3 af ' + (ialt - 1) + ' købt', n + ': «Har vi» flytter ' + harViNavn + ' (' + l.harVi.join(', ') + ', ' + l.tal + ')');
  tjek(JSON.parse(await lager(side)).harVi.length === 1, n + ': «Har vi» skal gemmes');
  await tryk(side, '.har-vi-afd .har-vi');
  l = await listeNu(side);
  tjek(!l.harVi.length && l.tal === '3 af ' + ialt + ' købt', n + ': «Skal købes» flytter varen tilbage (' + l.tal + ')');

  // 6. Basisvarerne kan foldes ud
  await tryk(side, 'details.tjek-basis summary');
  tjek(await side.locator('details.tjek-basis[open]').count() === 1, n + ': «Tjek, at I har» skal kunne foldes ud');

  // 7. Samme link igen: afkrydsningerne bliver
  await aabn(side, BASE, '#/hent/' + kode);
  await venterPaa(side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': samme link igen skal vise listen');
  l = await listeNu(side);
  tjek(l.tal === '3 af ' + ialt + ' købt', n + ': samme link igen må ikke nulstille afkrydsningerne (' + l.tal + ')');

  // 8. Et nyt link til næste uge: «Erstat listen for uge NN?» — først «Behold», så «Erstat»
  const uge2 = plusDage(uge, 7);
  const dage2 = [null, { ret: 'bolognese-one-pot', n: 4 }, null, null, null, null, null];
  const kode2 = kod(uge2, dage2);
  const F2 = forventet(H, dage2);
  const foer = await lager(side);
  await aabn(side, BASE, '#/hent/' + kode2);
  await side.waitForSelector('text=Erstat listen for uge ' + ugeNr(uge) + '?').catch(() => tjek(false, n + ': et nyt link skal spørge «Erstat listen for uge ' + ugeNr(uge) + '?»'));
  tjek(await lager(side) === foer, n + ': listen må ikke erstattes, før man har valgt');
  await tjekLayout(side, n + ' erstat listen');
  await foto(side, n + '-ugeplan-erstat');
  await tryk(side, 'button:has-text("Behold listen for uge ' + ugeNr(uge) + '")');
  await venterPaa(side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': «Behold listen» skal vise den gamle liste');
  tjek(await lager(side) === foer && (await listeNu(side)).tal === '3 af ' + ialt + ' købt', n + ': «Behold listen» beholder listen og afkrydsningerne');
  await aabn(side, BASE, '#/hent/' + kode2);
  await side.waitForSelector('button:has-text("Erstat listen")');
  await tryk(side, 'button:has-text("Erstat listen")');
  await venterPaa(side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': «Erstat listen» skal vise den nye liste');
  l = await listeNu(side);
  const ialt2 = F2.afd.reduce((s, a) => s + a.varer.length, 0);
  tjek(JSON.parse(await lager(side)).kode === kode2 && l.uge === 'Uge ' + ugeNr(uge2) && l.tal === '0 af ' + ialt2 + ' købt',
    n + ': «Erstat listen» gemmer den nye liste uden afkrydsninger (' + l.uge + ', ' + l.tal + ')');
  tjek(JSON.stringify(l.afd) === JSON.stringify(F2.afd), n + ': den nye liste skal have den nye uges varer');

  // 9. Fjendtlige og ødelagte koder: kun faste tekster, intet fra adressen i DOM'en, og listen står urørt
  const gyldigUkendt = kod(uge, [{ ret: 'markukendt', n: 4 }, null, null, null, null, null, null]);
  const KODER = [
    ['<img src=x onerror=alert(1)>MARKa', 'Linket kan ikke læses'],
    ['%3Cscript%3Ealert(1)%3C/script%3EMARKb', 'Linket kan ikke læses'],
    ['"><svg onload=alert(1)>MARKc', 'Linket kan ikke læses'],
    ['v2.20261026.markd_4~~~~~~.0000', 'Lavet med en nyere udgave. Opdatér appen'],
    ['__proto__marke', 'Linket kan ikke læses'],
    ['constructor', 'Linket kan ikke læses'],
    [kode.slice(0, -4) + 'ffff', 'Linket kan ikke læses'], // forkert kontrolsum
    [kode.slice(0, 30), 'Linket kan ikke læses'], // skåret over i beskeden
    ['v1.' + 'markf'.repeat(1000), 'Linket kan ikke læses'],
    [gyldigUkendt, 'Der er ingen retter i ugeplanen'], // gyldig kode, men retten findes ikke: id'et må ikke vises
  ];
  const foerFjendtlig = await lager(side);
  for (const [k, titel] of KODER) {
    await aabn(side, BASE, '#/hent/' + k);
    await side.waitForSelector('main h1');
    await side.waitForFunction(() => !document.querySelector('.status-boks.henter'));
    // Teksten i #app og skærmlæserens linje (body har også <noscript>-teksten «JavaScript»), og #app's HTML for attributter
    // (role="alert" og ikonernes <svg> er appens egne, så de ord tjekkes kun i teksten)
    const r = await side.evaluate(() => ({
      h1: document.querySelector('h1').textContent,
      tekst: (document.getElementById('app').textContent + ' ' + document.getElementById('meddelelse').textContent + ' ' + document.title).toLowerCase(),
      html: document.getElementById('app').outerHTML.toLowerCase(),
    }));
    const kort = k.slice(0, 40);
    tjek(r.h1 === titel, n + ': koden «' + kort + '» skal give «' + titel + '» (' + r.h1 + ')');
    const fundet = [
      ...['mark', 'alert', 'script', 'svg', 'img', 'onerror', 'onload', '__proto__', 'constructor'].filter((m) => r.tekst.includes(m)),
      ...['mark', 'onerror', 'onload', '__proto__', 'constructor', 'src="x"', 'src=x'].filter((m) => r.html.includes(m)).map((m) => 'html: ' + m),
    ];
    tjek(!fundet.length, n + ': koden «' + kort + '» kom ind i siden: ' + fundet.join(', '));
    tjek(await lager(side) === foerFjendtlig, n + ': koden «' + kort + '» må ikke ændre listen');
  }
  tjek(!dialoger.length, n + ': en fjendtlig kode åbnede en dialog: ' + dialoger.join(' | '));
  await side.waitForSelector('text=1 ret kunne ikke findes').catch(() => tjek(false, n + ': en ukendt ret skal tælles («1 ret kunne ikke findes»)'));
  await aabn(side, BASE, '#/hent/' + KODER[0][0]);
  await side.waitForSelector('#link-felt');
  await tjekLayout(side, n + ' linket kan ikke læses');
  await foto(side, n + '-ugeplan-fjendtlig');

  // 10. Listen på 360 px og på langs (844×390)
  await aabn(side, BASE, '#/indkoeb');
  await side.waitForSelector('.liste-tal');
  for (const [b, h] of [[360, 740], [844, 390]]) {
    await side.setViewportSize({ width: b, height: h });
    await vent(150);
    await tjekLayout(side, n + ' indkøbsliste ' + b + '×' + h);
    await foto(side, n + '-ugeplan-liste-' + b + 'x' + h);
  }
  await side.setViewportSize(skaerm.viewport);
  tjek(!side.fejl.length, n + ' ugeplan: ' + side.fejl.join(' | '));
  await ctx.close();

  // 11. En af ugens retter kan ikke hentes: intet gemmes, og «Prøv igen» henter den
  const f = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await f.side.route('**/opskrifter/tunfrikadeller.json', (r) => r.abort());
  await f.side.goto(BASE + '/index.html#/hent/' + kode);
  await f.side.waitForSelector('text=Opskrifterne kunne ikke hentes').catch(() => tjek(false, n + ': en ret, der ikke kan hentes, skal give en fejl'));
  tjek(await lager(f.side) === null, n + ': listen må ikke gemmes uden alle ugens retter');
  await f.side.unroute('**/opskrifter/tunfrikadeller.json');
  await tryk(f.side, 'button:has-text("Prøv igen")');
  await venterPaa(f.side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': «Prøv igen» skal hente retten og vise listen');
  tjek(JSON.parse(await lager(f.side) || '{}').kode === kode, n + ': efter «Prøv igen» skal listen være gemt');
  tjek(!f.side.fejl.filter((x) => !/tunfrikadeller\.json/.test(x)).length, n + ' ret fejler: ' + f.side.fejl.join(' | '));
  await f.ctx.close();

  // 12. Lageret er slået fra (privat browsing): en fast fejl, ikke en tom liste
  const p = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await p.ctx.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Fuldt', 'QuotaExceededError'); }; });
  await p.side.goto(BASE + '/index.html#/hent/' + kode);
  await p.side.waitForSelector('text=Listen kunne ikke gemmes på telefonen').catch(() => tjek(false, n + ': et lager, der ikke kan skrives, skal give «Listen kunne ikke gemmes på telefonen»'));
  tjek(!p.side.fejl.length, n + ' uden lager: ' + p.side.fejl.join(' | '));
  await p.ctx.close();
  maal.push(n + ' ugeplan: listen har ' + ialt + ' varer i ' + F.afd.length + ' afdelinger og ' + F.basis.length + ' basisvarer; ' + KODER.length + ' fjendtlige koder');
}

// ---------- Den voksnes oversigt (#/uge) ----------

const UGE = 'kog-uge-v1';
const ugeLager = (side) => side.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), UGE);
const minutter = (iso) => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso || '');
  return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : null;
};

// Summen i bunden, regnet her fra opskrifternes JSON: prisen for de valgte portioner og dagene med grønt
function sumTekst(H, dage) {
  let kr = 0;
  let g = 0;
  for (const d of dage) {
    if (!d) continue;
    const t = H.RETTER[d.ret].tumbi;
    kr += (t.pris_kr * d.n) / t.portioner;
    if (t.groent_g > 0) g++;
  }
  return 'Ca. ' + Math.round(kr / 10) * 10 + ' kr. · grønt ' + g + ' af 7 dage';
}

// Planen i lageret og på skærmen: rettens navn pr. dag (null for en fri aften)
const raekker = (side) => side.evaluate(() => [...document.querySelectorAll('.uge-dage > .dag')].map((d) => (d.classList.contains('fri')
  ? null : { navn: d.querySelector('.dag-ret-navn').textContent, af: d.querySelector('.dag-af')?.textContent || '', n: d.querySelector('.stepper-tal')?.textContent || '' })));

const fakeDeling = () => {
  window.__delt = [];
  window.__delAfbryd = false;
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: (d) => {
      window.__delt.push(JSON.parse(JSON.stringify(d)));
      return window.__delAfbryd ? Promise.reject(new DOMException('Lukket', 'AbortError')) : Promise.resolve();
    },
  });
};

async function oversigtIpad(browser, H) {
  const { BASE, SKAERME, RETTER, nySide, tjek, tjekLayout, foto, tryk, hold, vent, venterPaa, h1, maal } = H;
  const skaerm = SKAERME[0];
  const n = skaerm.navn;
  console.log('[' + n + '] ugeplan: oversigten, valget af en ret, Send til telefon og Ny uge');
  const IPLAN = Object.keys(RETTER).filter((id) => RETTER[id].tumbi.ugeplan === true);
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await ctx.addInitScript(fakeDeling);

  // 1. Forsiden: «Ugeplan» står bag et hold. Et kort tryk bliver på forsiden
  await side.goto(BASE + '/index.html');
  await side.waitForSelector('.uge-knap');
  await tryk(side, '.uge-knap');
  tjek(!(await hash(side)).startsWith('#/uge'), n + ': et kort tryk på «Ugeplan» må ikke åbne ugeplanen');
  tjek(await side.locator('.uge-knap.mind').count() === 1, n + ': et kort tryk på «Ugeplan» skal vise, at knappen skal holdes');
  await hold(side, '.uge-knap');
  await venterPaa(side, () => location.hash === '#/uge' && document.querySelector('.uge-dage'), null, n + ': holdet på «Ugeplan» skal åbne oversigten');

  // 2. En tom plan: syv fri aftener og ingen knapper til at sende
  tjek(await h1(side) === 'Ugeplan', n + ': oversigtens overskrift (' + await h1(side) + ')');
  tjek(JSON.stringify(await raekker(side)) === JSON.stringify([null, null, null, null, null, null, null]), n + ': en ny plan har syv fri aftener');
  tjek(await side.locator('.uge-sum').textContent() === 'Ingen retter endnu', n + ': summen i en tom plan');
  tjek(await side.locator('button:has-text("Send til telefon")').count() === 0, n + ': «Send til telefon» skal først vises, når der er en ret');
  tjek((await side.locator('.uge-nr').textContent()).startsWith('Uge ' + ugeNr(planMandag(new Date())) + ' · '), n + ': ugenummeret');
  await tjekLayout(side, n + ' tom ugeplan');
  await foto(side, n + '-ugeplan-tom');

  // 3. Valget af en ret til mandag: alle retter i ugeplanen, filtrene og «Vælg»
  await tryk(side, '[aria-label="Vælg ret til mandag"]');
  await venterPaa(side, () => location.hash === '#/uge/dag/1' && document.querySelector('.ret-valg'), null, n + ': «Vælg ret» skal åbne valget');
  tjek(await h1(side) === 'Vælg ret til mandag', n + ': valgets overskrift (' + await h1(side) + ')');
  const ids = () => side.evaluate(() => [...document.querySelectorAll('.ret-valg-raekke')].map((r) => r.dataset.ret));
  tjek((await ids()).length === IPLAN.length, n + ': valget skal vise alle ' + IPLAN.length + ' retter i ugeplanen (' + (await ids()).length + ')');
  await tjekLayout(side, n + ' vælg ret');
  await foto(side, n + '-ugeplan-vaelg-ret');
  await tryk(side, '.filter:has-text("Højst 40 min")');
  const hurtige = IPLAN.filter((id) => minutter(RETTER[id].totalTime) <= 40);
  tjek(JSON.stringify((await ids()).sort()) === JSON.stringify([...hurtige].sort()), n + ': «Højst 40 min» viser ' + (await ids()).join(', '));
  tjek(await side.locator('.filter:has-text("Højst 40 min")').getAttribute('aria-pressed') === 'true', n + ': et valgt filter har aria-pressed');
  tjek(await side.evaluate(() => document.activeElement?.dataset.fokus) === 'filter-hurtig', n + ': fokus bliver på filteret');
  await tryk(side, '.filter:has-text("Billigst først")');
  const pp = (id) => RETTER[id].tumbi.pris_kr / RETTER[id].tumbi.portioner;
  const billigst = [...hurtige].sort((a, b) => pp(a) - pp(b))[0];
  tjek((await ids())[0] === billigst, n + ': «Billigst først» skal sætte ' + billigst + ' først (' + (await ids())[0] + ')');
  await tryk(side, '.filter:has-text("Højst 40 min")');
  await tryk(side, '.filter:has-text("Billigst først")');
  await tryk(side, 'li[data-ret="koedsovs"] .vaelg-ret');
  await venterPaa(side, () => location.hash === '#/uge' && document.querySelector('.uge-dage'), null, n + ': «Vælg» skal gå tilbage til oversigten');
  const uge = planMandag(new Date());
  let gemt = await ugeLager(side);
  tjek(gemt && gemt.uge === uge && JSON.stringify(gemt.dage[0]) === JSON.stringify({ ret: 'koedsovs', af: 'bo', n: 4 }),
    n + ': mandag skal gemmes som kødsovs, valgt af Bo, 4 pers. (' + JSON.stringify(gemt && gemt.dage[0]) + ')');
  // Onsdag og fredag
  for (const [dag, id] of [['onsdag', 'tunfrikadeller'], ['fredag', 'chorizo-pasta']]) {
    await tryk(side, '[aria-label="Vælg ret til ' + dag + '"]');
    await side.waitForSelector('li[data-ret="' + id + '"] .vaelg-ret');
    await tryk(side, 'li[data-ret="' + id + '"] .vaelg-ret');
    await side.waitForSelector('.uge-dage');
  }
  let r = await raekker(side);
  tjek(r[0] && r[0].navn === RETTER.koedsovs.name && r[0].af === 'Valgt af Bo' && r[2] && r[2].navn === RETTER.tunfrikadeller.name && r[4] && r[1] === null,
    n + ': oversigten skal vise mandag, onsdag og fredag: ' + JSON.stringify(r));

  // 4. Portionerne: + to gange og − én gang på onsdag. Fokus bliver på knappen
  for (const k of ['plus', 'plus', 'minus']) await tryk(side, '[data-fokus="dag-2-' + k + '"]');
  gemt = await ugeLager(side);
  r = await raekker(side);
  tjek(gemt.dage[2].n === 5 && r[2].n === '5 pers.', n + ': onsdag skal have 5 portioner (' + gemt.dage[2].n + ', ' + r[2].n + ')');
  tjek(await side.evaluate(() => document.activeElement?.dataset.fokus) === 'dag-2-minus', n + ': fokus bliver på «−»');
  let dage = gemt.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  tjek(await side.locator('.uge-sum').textContent() === sumTekst(H, dage), n + ': summen (' + await side.locator('.uge-sum').textContent() + ', ventede ' + sumTekst(H, dage) + ')');
  await tjekLayout(side, n + ' ugeplan');
  await foto(side, n + '-ugeplan', { fullPage: true });

  // 5. Den hele plan læses, før der gemmes: kan onsdagens opskrift ikke hentes, står dagen stadig der, også når en
  // anden dag ændres (code review af trin 1-5)
  await side.route('**/opskrifter/tunfrikadeller.json', (x) => x.abort());
  await side.reload();
  await side.waitForSelector('.uge-dage');
  tjek((await side.locator('.dag[data-dag="2"] .dag-meta').textContent()).includes('kunne ikke hentes'), n + ': en ret, der ikke kan hentes, skal sige det');
  await tryk(side, '[data-fokus="dag-0-plus"]');
  gemt = await ugeLager(side);
  tjek(JSON.stringify(gemt.dage[2]) === JSON.stringify({ ret: 'tunfrikadeller', af: 'bo', n: 5 }) && gemt.dage[0].n === 5,
    n + ': onsdag må ikke forsvinde, når mandag ændres, mens onsdagens opskrift ikke kan hentes (' + JSON.stringify(gemt.dage) + ')');
  await side.unroute('**/opskrifter/tunfrikadeller.json');
  await tryk(side, '[data-fokus="dag-0-minus"]'); // mandag tilbage til 4
  await side.reload();
  await side.waitForSelector('.uge-dage');

  // 6. Fjern fredag
  await tryk(side, '[data-fokus="dag-4-fjern"]');
  gemt = await ugeLager(side);
  tjek(gemt.dage[4] === null && (await raekker(side))[4] === null, n + ': «Fjern» gør fredag til en fri aften');
  tjek(await side.evaluate(() => document.activeElement?.dataset.fokus) === 'dag-4-vaelg', n + ': fokus går til «Vælg ret» på fredag');
  dage = gemt.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  const kode = kod(uge, dage);

  // 7. Send til telefon: delearket får linket, og linket åbner den samme liste på en telefon
  await tryk(side, 'button:has-text("Send til telefon")');
  await venterPaa(side, () => window.__delt.length === 1, null, n + ': «Send til telefon» skal åbne delearket');
  const delt = await side.evaluate(() => window.__delt);
  tjek(delt[0] && delt[0].url === BASE + '/index.html#/hent/' + kode && delt[0].title === 'Indkøbsliste uge ' + ugeNr(uge),
    n + ': delearket skal have linket til ugens kode (' + JSON.stringify(delt[0]) + ')');
  tjek((await side.locator('.uge-besked').textContent()).includes('Åbn linket på telefonen'), n + ': efter delingen står, hvad man gør på telefonen');
  tjek(await side.evaluate(() => document.activeElement?.dataset.fokus) === 'send', n + ': fokus bliver på «Send til telefon»');
  const tlf = await nySide(browser, SKAERME[1], { serviceWorkers: 'block' });
  await tlf.side.goto(delt[0].url);
  await venterPaa(tlf.side, () => location.hash === '#/indkoeb' && document.querySelector('.liste-tal'), null, n + ': linket fra delearket skal åbne listen på telefonen');
  const F = forventet(H, dage);
  const tlfListe = await listeNu(tlf.side);
  tjek(JSON.stringify(tlfListe.afd) === JSON.stringify(F.afd), n + ': telefonens liste skal være ugens varer: ' + JSON.stringify(tlfListe.afd));
  tjek(!tlf.side.fejl.length, n + ' telefonen: ' + tlf.side.fejl.join(' | '));
  await tlf.ctx.close();
  // Lukker man delearket selv, sker der ingenting
  await side.evaluate(() => { window.__delAfbryd = true; });
  await tryk(side, 'button:has-text("Send til telefon")');
  await vent(200);
  tjek((await side.locator('.uge-besked').textContent()).includes('Åbn linket på telefonen'), n + ': et lukket deleark ændrer ikke beskeden');
  await side.evaluate(() => { window.__delAfbryd = false; });

  // 8. Del som tekst: én vare pr. linje under afdelingernes overskrifter
  await tryk(side, 'button:has-text("Del som tekst")');
  await venterPaa(side, () => window.__delt.length === 3, null, n + ': «Del som tekst» skal åbne delearket');
  const tekst = (await side.evaluate(() => window.__delt[2])).text;
  tjek(tekst === 'Indkøbsliste uge ' + ugeNr(uge) + '\n\n' + listeTekst(F.varer), n + ': teksten skal være tekst() af ugens varer');
  tjek(await side.locator('a.knap[href="print.html?uge"]').count() === 1, n + ': «Print» skal pege på print.html?uge');
  await foto(side, n + '-ugeplan-sendt');

  // 9. Ny uge: et kort tryk gør intet, et hold på 2 s tømmer planen
  await tryk(side, '.ny-uge');
  tjek((await ugeLager(side)).dage.filter(Boolean).length === 2, n + ': et kort tryk på «Ny uge» må ikke tømme planen');
  await hold(side, '.ny-uge');
  await side.waitForSelector('text=Planen er tømt');
  gemt = await ugeLager(side);
  tjek(gemt.dage.every((d) => d === null) && gemt.uge === planMandag(new Date()), n + ': «Ny uge» tømmer planen (' + JSON.stringify(gemt.dage) + ')');
  tjek(JSON.stringify(await raekker(side)) === JSON.stringify([null, null, null, null, null, null, null]), n + ': oversigten er tom efter «Ny uge»');

  // 10. Oversigten på en telefon (360 px) og iPad'en på højkant
  await side.evaluate((p) => { localStorage.setItem('kog-uge-v1', JSON.stringify(p)); }, { ...gemt, dage: [{ ret: 'koedsovs', af: 'rosa', n: 4 }, null, { ret: 'tunfrikadeller', af: 'pip', n: 12 }, null, null, { ret: 'bolognese-one-pot', af: 'bo', n: 6 }, null] });
  await side.reload();
  await side.waitForSelector('.uge-dage');
  for (const [b, h] of [[360, 740], [390, 844], [820, 1180]]) {
    await side.setViewportSize({ width: b, height: h });
    await vent(150);
    await tjekLayout(side, n + ' ugeplan ' + b + '×' + h);
    await foto(side, n + '-ugeplan-' + b + 'x' + h, { fullPage: true });
  }
  tjek(!side.fejl.filter((x) => !/tunfrikadeller\.json/.test(x)).length, n + ' oversigten: ' + side.fejl.join(' | '));
  await ctx.close();
  maal.push(n + ' ugeplan: ' + IPLAN.length + ' retter i ugeplanen, ' + hurtige.length + ' på højst 40 min');
}

// Desktop: uden delearket kopieres linket og teksten, og kan det heller ikke, står de i et felt. Tastaturet når det hele
async function oversigtDesktop(browser, H) {
  const { BASE, SKAERME, nySide, tjek, tjekLayout, foto, vent, venterPaa } = H;
  const skaerm = SKAERME[2];
  const n = skaerm.navn;
  console.log('[' + n + '] ugeplan: oversigten uden delearket og med tastaturet');
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    window.__kopieret = [];
    window.__kopiFejl = false;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t) => (window.__kopiFejl ? Promise.reject(new DOMException('Nej', 'NotAllowedError')) : (window.__kopieret.push(t), Promise.resolve())) },
    });
  });
  const uge = planMandag(new Date());
  const plan = { v: 1, uge, dage: [null, { ret: 'cremet-koedsovs', af: 'bo', n: 4 }, null, { ret: 'koedsovs', af: 'rosa', n: 6 }, null, null, null], n: 4, prBarn: 1, rettet: Date.now() };
  await side.goto(BASE + '/index.html');
  await side.evaluate((p) => localStorage.setItem('kog-uge-v1', JSON.stringify(p)), plan);
  await side.goto(BASE + '/index.html#/uge');
  await side.waitForSelector('.uge-dage');
  const dage = plan.dage.map((d) => (d ? { ret: d.ret, n: d.n } : null));
  const url = BASE + '/index.html#/hent/' + kod(uge, dage);
  tjek(await side.locator('.uge-sum').textContent() === sumTekst(H, dage), n + ': summen (' + await side.locator('.uge-sum').textContent() + ')');
  await tjekLayout(side, n + ' ugeplan');
  await foto(side, n + '-ugeplan', { fullPage: true });

  // Tastatur: Tab til «Send til telefon» og Enter kopierer linket
  let fundet = false;
  for (let i = 0; i < 60 && !fundet; i++) {
    await side.keyboard.press('Tab');
    fundet = await side.evaluate(() => document.activeElement?.dataset.fokus === 'send');
  }
  tjek(fundet, n + ': Tab skal nå «Send til telefon»');
  const ring = await side.evaluate(() => { const s = getComputedStyle(document.activeElement); return { stil: s.outlineStyle, bredde: parseFloat(s.outlineWidth) }; });
  tjek(ring.stil !== 'none' && ring.bredde >= 3, n + ': fokus skal kunne ses på «Send til telefon» (' + JSON.stringify(ring) + ')');
  await vent(420);
  await side.keyboard.press('Enter');
  await venterPaa(side, () => window.__kopieret.length === 1, null, n + ': Enter på «Send til telefon» skal kopiere linket');
  tjek((await side.evaluate(() => window.__kopieret[0])) === url, n + ': det kopierede link (' + await side.evaluate(() => window.__kopieret[0]) + ')');
  tjek((await side.locator('.uge-besked').textContent()).includes('Linket er kopieret'), n + ': beskeden efter kopieringen');
  // Udklipsholderen afviser: linket og teksten står i et felt
  await side.evaluate(() => { window.__kopiFejl = true; });
  await vent(420);
  await side.locator('button:has-text("Send til telefon")').click();
  await side.waitForSelector('input.kopi-felt');
  tjek(await side.locator('input.kopi-felt').inputValue() === url, n + ': feltet skal have linket');
  await vent(420);
  await side.locator('button:has-text("Del som tekst")').click();
  await side.waitForSelector('textarea.kopi-felt');
  const F = forventet(H, dage);
  tjek(await side.locator('textarea.kopi-felt').inputValue() === 'Indkøbsliste uge ' + ugeNr(uge) + '\n\n' + listeTekst(F.varer), n + ': feltet skal have listen som tekst');
  await tjekLayout(side, n + ' ugeplan med felt');
  await foto(side, n + '-ugeplan-felt', { fullPage: true });
  // «Ny uge» med tastaturet: mellemrum holdes i 2 s
  await side.focus('[data-fokus="ny-uge"]');
  await side.keyboard.down('Space');
  await vent(2300);
  await side.keyboard.up('Space');
  await side.waitForSelector('text=Planen er tømt');
  tjek((await ugeLager(side)).dage.every((d) => d === null), n + ': mellemrum holdt på «Ny uge» tømmer planen');
  tjek(!side.fejl.length, n + ' oversigten: ' + side.fejl.join(' | '));
  await ctx.close();
}

// ---------- Børnene vælger (#/uge/vaelg) på iPad'en ----------

// Det, stemmen sagde sidst (den falske stemme i test-e2e.js), og det, den skal sige: replikkens tekst i talform
const sagt = (side) => side.evaluate(() => (window.__tale[window.__tale.length - 1] || {}).tekst || '');
const siger = (replik) => tilTale(replik.tekst);
const VAELG = 'button.knap.primaer.naeste';
const valgHash = (side, h) => side.evaluate((x) => { location.hash = x; }, h);

const dyrNu = (side) => side.evaluate(() => [...document.querySelectorAll('.dyr-kort')].map((b) => ({
  dyr: b.dataset.dyr,
  navn: b.querySelector('.kort-navn').textContent,
  faerdig: b.classList.contains('faerdig') && Boolean(b.querySelector('.dyr-tjek')),
  pladser: b.querySelectorAll('.dyr-plads').length,
  fyldte: b.querySelectorAll('.dyr-plads.fyldt img').length,
})));
const kortNu = (side) => side.evaluate(() => [...document.querySelectorAll('.ret-kort')].map((b) => ({
  id: b.dataset.ret,
  valgt: b.classList.contains('valgt') && b.getAttribute('aria-pressed') === 'true',
  top: Math.round(b.getBoundingClientRect().top),
})));
const brikkerNu = (side) => side.evaluate(() => [...document.querySelectorAll('.dag-brik')].map((b) => ({
  navn: b.querySelector('.brik-navn').textContent,
  optaget: b.classList.contains('optaget'),
  valgt: b.classList.contains('valgt'),
  ret: (b.querySelector('.brik-tallerken img')?.getAttribute('src') || '').replace(/^grafik\/ret-|\.webp$/g, ''),
  dyr: (b.querySelector('.brik-dyr')?.getAttribute('src') || '').replace(/^grafik\/dyr-|\.svg$/g, ''),
  top: Math.round(b.getBoundingClientRect().top),
  farve: getComputedStyle(b).backgroundColor,
})));

async function boernValg(browser, H) {
  const { BASE, SKAERME, RETTER, nySide, tjek, tjekLayout, foto, tryk, hold, vent, venterPaa, h1, maal } = H;
  const skaerm = SKAERME[0];
  const n = skaerm.navn;
  console.log('[' + n + '] ugeplan: børnene vælger med dyrene, billederne og stemmen');
  const IPLAN = Object.keys(RETTER).filter((id) => RETTER[id].tumbi.ugeplan === true);
  const sider = Math.ceil(IPLAN.length / 4);
  const ret = (id) => ({ id, navn: RETTER[id].name });
  const uge = planMandag(new Date());
  const hvem = (hvor) => venterPaa(side, () => location.hash === '#/uge/vaelg' && document.querySelector('.dyr-gitter, ol.dag-brikker'), null, n + ': ' + hvor);
  const { ctx, side } = await nySide(browser, skaerm, { serviceWorkers: 'block' });

  // 1. Fra oversigten: «Børnene vælger» åbner dyrene, og stemmen spørger, hvem der skal vælge
  await side.goto(BASE + '/index.html#/uge');
  await side.waitForSelector('.boern-vaelger');
  await tryk(side, '.boern-vaelger');
  await hvem('«Børnene vælger» skal åbne #/uge/vaelg');
  tjek(await h1(side) === 'Hvem skal vælge?', n + ': første trins overskrift (' + await h1(side) + ')');
  tjek(await sagt(side) === siger(R.UGE_HVEM), n + ': stemmen spørger, hvem der skal vælge (' + await sagt(side) + ')');
  let d = await dyrNu(side);
  tjek(JSON.stringify(d.map((x) => [x.dyr, x.navn])) === JSON.stringify([['bo', 'Bo'], ['rosa', 'Rosa'], ['pip', 'Pip']]), n + ': dyrene Bo, Rosa og Pip (' + JSON.stringify(d) + ')');
  tjek(d[0].pladser === 0 && d[1].pladser === 1 && d[2].pladser === 1 && !d.some((x) => x.faerdig), n + ': én ret pr. barn: Rosa og Pip har hver én tom plads, Bo ingen (' + JSON.stringify(d) + ')');
  await tjekLayout(side, n + ' børnene: hvem');
  await foto(side, n + '-boern-hvem');

  // 2. Rosa: fire retter pr. side, pilene og første tryk, der siger navnet
  await tryk(side, '.dyr-kort[data-dyr="rosa"]');
  await venterPaa(side, () => location.hash === '#/uge/vaelg/rosa' && document.querySelector('.ret-gitter'), null, n + ': Rosa skal åbne retterne');
  tjek(await h1(side) === 'Rosa vælger mad', n + ': andet trins overskrift (' + await h1(side) + ')');
  tjek(await sagt(side) === siger(R.dyrVaelger('rosa')), n + ': stemmen siger, at Rosa vælger (' + await sagt(side) + ')');
  let k = await kortNu(side);
  tjek(k.length === Math.min(4, IPLAN.length), n + ': fire retter pr. side (' + k.length + ')');
  tjek(new Set(k.map((x) => x.top)).size === 1, n + ': retterne står på én række på iPad på langs');
  tjek(await side.locator(VAELG).count() === 0, n + ': fluebenet vises først, når en ret er trykket på');
  tjek(await side.locator('.side-forrige').evaluate((b) => b.disabled && getComputedStyle(b).visibility === 'hidden'), n + ': på første side er pilen tilbage væk');
  await tjekLayout(side, n + ' børnene: retter');
  await foto(side, n + '-boern-retter');
  const [a, b] = k.map((x) => x.id);
  await tryk(side, '.ret-kort[data-ret="' + a + '"]');
  k = await kortNu(side);
  tjek(k.filter((x) => x.valgt).map((x) => x.id).join() === a, n + ': første tryk markerer retten (' + JSON.stringify(k) + ')');
  tjek(await sagt(side) === siger(R.ugeRet(ret(a))), n + ': stemmen siger rettens navn (' + await sagt(side) + ')');
  tjek(await side.locator(VAELG).count() === 1, n + ': fluebenet vises, når en ret er trykket på');
  tjek(await side.evaluate(() => document.activeElement?.dataset.ret) === a, n + ': fokus bliver på retten');
  await tryk(side, '.ret-kort[data-ret="' + b + '"]');
  tjek((await kortNu(side)).filter((x) => x.valgt).map((x) => x.id).join() === b, n + ': kun den sidst trykkede ret er markeret');
  if (sider > 1) {
    await tryk(side, '.side-naeste');
    k = await kortNu(side);
    tjek(k.length === Math.min(4, IPLAN.length - 4) && !k.some((x) => x.id === a || x.id === b), n + ': pilen viser de næste retter (' + k.map((x) => x.id).join(', ') + ')');
    tjek(!k.some((x) => x.valgt) && await side.locator(VAELG).count() === 0, n + ': en ny side har ingen markeret ret');
    tjek(await side.evaluate(() => Boolean(document.querySelectorAll('.side-prikker span')[1]?.classList.contains('nu'))), n + ': prikken for side 2 er fyldt');
    if (sider === 2) tjek(await side.evaluate(() => Boolean(document.activeElement?.classList.contains('side-forrige'))), n + ': på sidste side går fokus til pilen tilbage');
    await foto(side, n + '-boern-retter-side-2');
    await tryk(side, '.side-forrige');
    tjek((await kortNu(side))[0].id === a, n + ': pilen tilbage viser første side igen');
  }

  // 3. Hvilken dag? Rosas ret på mandag
  await tryk(side, '.ret-kort[data-ret="' + a + '"]');
  await tryk(side, VAELG);
  await venterPaa(side, (h) => location.hash === h && document.querySelector('.dag-brikker'), '#/uge/vaelg/rosa/' + a, n + ': fluebenet skal åbne dagene');
  tjek(await h1(side) === 'Hvilken dag?', n + ': tredje trins overskrift (' + await h1(side) + ')');
  tjek(await sagt(side) === siger(R.HVILKEN_DAG), n + ': stemmen spørger om dagen (' + await sagt(side) + ')');
  let br = await brikkerNu(side);
  tjek(br.map((x) => x.navn).join() === 'Mandag,Tirsdag,Onsdag,Torsdag,Fredag,Lørdag,Søndag' && !br.some((x) => x.optaget || x.valgt || x.ret), n + ': syv frie dage (' + JSON.stringify(br.map((x) => x.navn)) + ')');
  tjek(new Set(br.map((x) => x.top)).size === 1, n + ': de syv dage står på én række på iPad på langs');
  tjek(new Set(br.map((x) => x.farve)).size === 7, n + ': hver dag har sin egen farve');
  await tjekLayout(side, n + ' børnene: dage');
  await foto(side, n + '-boern-dage');
  await tryk(side, '.dag-brik[data-dag="0"]');
  br = await brikkerNu(side);
  tjek(br[0].valgt && br[0].ret === a && br.filter((x) => x.valgt).length === 1, n + ': mandag er markeret og viser retten på tallerkenen');
  tjek(await sagt(side) === siger(R.dag(0)), n + ': stemmen siger dagen (' + await sagt(side) + ')');
  await foto(side, n + '-boern-dag-valgt');
  await tryk(side, VAELG);
  await hvem('fluebenet på dagen skal gå tilbage til dyrene');
  let gemt = await ugeLager(side);
  tjek(gemt && gemt.uge === uge && JSON.stringify(gemt.dage[0]) === JSON.stringify({ ret: a, af: 'rosa', n: 4 }), n + ': mandag gemmes som Rosas valg (' + JSON.stringify(gemt && gemt.dage) + ')');
  tjek(await sagt(side) === siger(R.UGE_TAK), n + ': stemmen siger tak (' + await sagt(side) + ')');
  d = await dyrNu(side);
  tjek(d[1].faerdig && d[1].fyldte === 1 && !d[2].faerdig && d[2].fyldte === 0, n + ': Rosa har valgt (flueben og rettens billede), Pip ikke (' + JSON.stringify(d) + ')');

  // 4. Rosa har valgt: et tryk siger, at det er en andens tur, og adressen til Rosas retter viser dyrene
  await tryk(side, '.dyr-kort[data-dyr="rosa"]');
  tjek(await hash(side) === '#/uge/vaelg' && await sagt(side) === siger(R.dyrFaerdig('rosa')), n + ': Rosa har valgt og bliver på dyrene (' + await sagt(side) + ')');
  await valgHash(side, '#/uge/vaelg/rosa');
  await vent(200);
  tjek(await h1(side) === 'Hvem skal vælge?', n + ': Rosa kan ikke vælge flere gennem adressen (' + await h1(side) + ')');

  // 5. Pip: mandag er optaget (Rosas ret og Rosa) og siger det, tirsdag vælges. Så har begge børn valgt
  await tryk(side, '.dyr-kort[data-dyr="pip"]');
  await side.waitForSelector('.ret-gitter');
  await tryk(side, '.ret-kort[data-ret="' + b + '"]');
  await tryk(side, VAELG);
  await side.waitForSelector('.dag-brikker');
  br = await brikkerNu(side);
  tjek(br[0].optaget && br[0].ret === a && br[0].dyr === 'rosa' && br.filter((x) => x.optaget).length === 1, n + ': mandag er optaget med Rosas ret (' + JSON.stringify(br[0]) + ')');
  tjek(await side.locator('.dag-brik[data-dag="0"]').getAttribute('aria-label') === 'Mandag: ' + RETTER[a].name + ', valgt af Rosa', n + ': den optagne dag har retten og dyret i sit navn');
  await tryk(side, '.dag-brik[data-dag="0"]');
  tjek(await sagt(side) === siger(R.DAG_OPTAGET) && !(await brikkerNu(side))[0].valgt && await side.locator(VAELG).count() === 0, n + ': en optaget dag siger det og kan ikke vælges (' + await sagt(side) + ')');
  await tryk(side, '.dag-brik[data-dag="1"]');
  await tryk(side, VAELG);
  await hvem('Pips valg skal gå tilbage til dyrene');
  gemt = await ugeLager(side);
  tjek(JSON.stringify(gemt.dage.slice(0, 2)) === JSON.stringify([{ ret: a, af: 'rosa', n: 4 }, { ret: b, af: 'pip', n: 4 }]), n + ': tirsdag gemmes som Pips valg, mandag er uændret (' + JSON.stringify(gemt.dage) + ')');
  tjek(await sagt(side) === siger(R.ALLE_VALGT), n + ': når begge børn har valgt, siger stemmen det (' + await sagt(side) + ')');

  // 6. Adresser, der ikke findes: et ukendt dyr viser dyrene, en ukendt ret viser retterne, og intet fra adressen kommer i DOM'en
  for (const [h, forventet] of [['#/uge/vaelg/constructor', 'Hvem skal vælge?'], ['#/uge/vaelg/xyzfjendtlig', 'Hvem skal vælge?'],
    ['#/uge/vaelg/bo/xyzfjendtlig', 'Bo vælger mad'], ['#/uge/vaelg/bo/constructor', 'Bo vælger mad']]) {
    await valgHash(side, h);
    await vent(200);
    const dom = await side.evaluate(() => document.getElementById('app').innerHTML + document.title);
    tjek(await h1(side) === forventet && !dom.includes('xyzfjendtlig') && !dom.includes('constructor'), n + ': ' + h + ' viser «' + await h1(side) + '»');
  }

  // 7. Kan valget ikke gemmes (lageret er fuldt): en fejlskærm til den voksne, og «Prøv igen» gemmer, når lageret virker
  await side.evaluate(() => {
    const gl = Storage.prototype.setItem;
    Storage.prototype.setItem = function (noegle, v) {
      if (window.__lagerFejl && noegle === 'kog-uge-v1') throw new DOMException('Fuldt', 'QuotaExceededError');
      return gl.call(this, noegle, v);
    };
    window.__lagerFejl = true;
  });
  await valgHash(side, '#/uge/vaelg/bo/' + a);
  await side.waitForSelector('.dag-brikker');
  await tryk(side, '.dag-brik[data-dag="2"]');
  await tryk(side, VAELG);
  await venterPaa(side, () => document.querySelector('h1')?.textContent === 'Valget kunne ikke gemmes', null, n + ': et fuldt lager skal give fejlskærmen');
  tjek((await ugeLager(side)).dage[2] === null, n + ': intet er gemt, når lageret fejler');
  await tjekLayout(side, n + ' børnene: kunne ikke gemme');
  await side.evaluate(() => { window.__lagerFejl = false; });
  await tryk(side, 'button:has-text("Prøv igen")');
  await side.waitForSelector('.dag-brik.valgt[data-dag="2"]');
  await tryk(side, VAELG);
  await hvem('«Prøv igen» og fluebenet skal gemme');
  tjek(JSON.stringify((await ugeLager(side)).dage[2]) === JSON.stringify({ ret: a, af: 'bo', n: 4 }), n + ': «Prøv igen» gemmer Bos valg');
  tjek(await sagt(side) === siger(R.UGE_TAK), n + ': Bo får «Tak», ikke «I har begge valgt» (' + await sagt(side) + ')');

  // 8. Bo vælger den sidste frie dag: ugen er fuld, og den voksne tager over
  gemt = await ugeLager(side);
  await side.evaluate((p) => localStorage.setItem('kog-uge-v1', JSON.stringify(p)),
    { ...gemt, dage: gemt.dage.map((x, i) => x || (i === 6 ? null : { ret: a, af: 'bo', n: 4 })) });
  await valgHash(side, '#/uge/vaelg/bo');
  await side.waitForSelector('.ret-gitter');
  await tryk(side, '.ret-kort[data-ret="' + b + '"]');
  await tryk(side, VAELG);
  await side.waitForSelector('.dag-brikker');
  tjek((await brikkerNu(side)).filter((x) => x.optaget).length === 6, n + ': seks dage er optaget');
  await tryk(side, '.dag-brik[data-dag="6"]');
  await tryk(side, VAELG);
  await hvem('den sidste dag skal gå til «Ugen er fuld»');
  tjek(await h1(side) === 'Ugen er fuld' && await sagt(side) === siger(R.UGE_FULD), n + ': ugen er fuld (' + await h1(side) + ', ' + await sagt(side) + ')');
  br = await brikkerNu(side);
  tjek(br.length === 7 && br.every((x) => x.optaget && x.ret) && br[6].ret === b && br[6].dyr === 'bo', n + ': den fulde uge viser syv retter med dyrene');
  await tjekLayout(side, n + ' børnene: ugen er fuld');
  await foto(side, n + '-boern-fuld');

  // 9. Den voksne: et kort tryk på «Ugeplan: hold» bliver hos børnene, et hold går til oversigten
  await tryk(side, '.til-ugeplan');
  tjek(await hash(side) === '#/uge/vaelg', n + ': et kort tryk på «Ugeplan: hold» bliver hos børnene');
  await hold(side, '.til-ugeplan');
  await venterPaa(side, () => location.hash === '#/uge' && document.querySelector('.uge-dage'), null, n + ': holdet skal gå til oversigten');

  // 10. To retter pr. barn: Rosa har to pladser, én fyldt, og er ikke færdig
  await side.evaluate((p) => localStorage.setItem('kog-uge-v1', JSON.stringify(p)),
    { ...gemt, prBarn: 2, dage: [{ ret: a, af: 'rosa', n: 4 }, null, null, null, null, null, null] });
  await tryk(side, '.boern-vaelger');
  await hvem('«Børnene vælger» med to retter pr. barn');
  d = await dyrNu(side);
  tjek(d[1].pladser === 2 && d[1].fyldte === 1 && !d[1].faerdig && d[2].pladser === 2 && d[2].fyldte === 0, n + ': to retter pr. barn: Rosa har én af to (' + JSON.stringify(d) + ')');

  // 11. Tastaturet: Enter på et dyr åbner retterne, Enter på en ret markerer den, og fokus bliver på den
  await side.locator('.dyr-kort[data-dyr="rosa"]').focus();
  await vent(400);
  await side.keyboard.press('Enter');
  await side.waitForSelector('.ret-gitter');
  await vent(400);
  await side.locator('.ret-kort').first().focus();
  await side.keyboard.press('Enter');
  await vent(100);
  tjek(await side.evaluate(() => Boolean(document.activeElement?.classList.contains('valgt'))), n + ': Enter markerer retten, og fokus bliver på den');

  // 12. iPad på højkant og telefonen: retterne to og to, dagene på flere rækker, dyrene side om side
  for (const [bredde, hoejde] of [[820, 1180], [390, 844], [360, 740]]) {
    await side.setViewportSize({ width: bredde, height: hoejde });
    for (const [h, navn] of [['#/uge/vaelg', 'hvem'], ['#/uge/vaelg/pip', 'retter'], ['#/uge/vaelg/pip/' + a, 'dage']]) {
      await valgHash(side, h);
      await vent(200);
      await tjekLayout(side, n + ' børnene ' + navn + ' ' + bredde + '×' + hoejde);
      if (bredde !== 360) await foto(side, n + '-boern-' + navn + '-' + bredde + 'x' + hoejde, { fullPage: true });
    }
    if (bredde === 820) {
      await valgHash(side, '#/uge/vaelg/pip');
      await vent(200);
      tjek(new Set((await kortNu(side)).map((x) => x.top)).size === 2, n + ': på højkant står retterne to og to');
    }
  }

  tjek(await side.evaluate(() => window.__taleAfvist) === 0, n + ': stemmen blev aldrig afvist (al oplæsning kom i et tryk)');
  tjek(!side.fejl.length, n + ' børnene: ' + side.fejl.join(' | '));
  await ctx.close();
  maal.push(n + ' børnene: ' + IPLAN.length + ' retter på ' + sider + (sider === 1 ? ' side' : ' sider'));
}
