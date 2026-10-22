// e2e-ugeplan.js — ugeplanen og indkøbslisten i WebKit (docs/ugeplan-plan.md). Køres af test-e2e.js med
// E2E_DELE=ugeplan, som giver sine hjælpere med (H). Det forventede regnes af appens egen kode (kod, saml, grupper),
// så testen ser, at skærmen viser det, modulerne regner ud.
// Telefonen (390×844): linket gemmer listen og skifter adressen til #/indkoeb, afkrydsninger overlever en genindlæsning,
// «Har vi», basisvarerne, samme link igen, et nyt link («Erstat listen?»), feltet «Sæt linket ind» og fjendtlige koder,
// hvor intet fra adressen må komme i DOM'en, og lageret ikke må ændres.
import { kod } from '../js/plankode.js';
import { saml, grupper } from '../js/indkoeb.js';
import { planMandag, ugeNr } from '../js/tid.js';

const LISTE = 'kog-liste-v1';
const DAG_MS = 86400000;
const plusDage = (dato, n) => new Date(Date.parse(dato + 'T00:00:00Z') + n * DAG_MS).toISOString().slice(0, 10);

export async function ugeplan(browser, H) {
  await telefon(browser, H);
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
