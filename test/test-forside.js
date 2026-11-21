// test-forside.js — forsiden med billedknapper (js/grupper.js og app.js): sorteringen i opskrifter/index.json, ruterne,
// vejen tilbage, lupen, hjertet og at intet nyt gemmes. Skærmene prøves i den rigtige app.js med et lille falsk DOM og de
// rigtige opskrifter fra disken, så rute, lyd og fejlskærme testes uden en browser. Mål og layout prøves i test-css.js og
// i WebKit (test-e2e.js).
// Kør:  node test/test-forside.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRUPPER, AFTENSMAD, AFTENSMAD_GRUPPER, VARER, gruppeSoegeord, grafikGruppe } from '../js/katalog.js';
import { kod } from '../js/plankode.js';
import { planMandag, idag } from '../js/tid.js';
import { soeg, soegeTekst } from '../js/soeg.js';
import { FAVORITTER, gruppeRute, forsideGrupper, gruppeAf, gruppeRetter, tilbageFraRet, rulleplads, blandet } from '../js/grupper.js';
import { lavModel, erLynhurtig, harTid } from '../js/model.js';
import { utenBloede, kortNavn } from '../js/tekst.js';
import { UDGAVE } from '../js/version.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Alle grupper i forsidens rækkefølge. En ny gruppe står i GRUPPER, men kommer først i index.json, når dens retter har
// billeder (docs/venter-paa-billede/README.md). Indtil da står den i VENTER_PAA_BILLEDER. Madpakke (v9) er med, og Kød er
// delt i Gris og Ko (v11): 12 knapper
const GRUPPE_IDS = ['pasta-og-nudler', 'kylling', 'fisk', 'gris', 'ko', 'groent', 'broed-og-pizza', 'madpakke', 'soede-sager', 'drikke', 'jul', 'halloween'];
// Kødretterne fra før v11. Delingen må ikke tabe en af dem (de står alle i Gris eller Ko)
const KOED_FOER_V11 = ['dino-vulkan', 'frikadeller', 'chili-con-carne', 'medister-i-ovn', 'poelse-boennegryde', 'cowboyboenner', 'hyrdetaerte',
  'floedekartofler-med-skinke-og-broccoli', 'hoisin-gris-med-ris-og-agurk', 'honning-soja-koedboller', 'mild-bibimbap-risskaal',
  'smash-burgere-med-ost', 'koteletter-med-aeble', 'hjemmelavet-kebab'];
const VENTER_PAA_BILLEDER = [];
const KNAPPER = GRUPPE_IDS.filter((id) => !VENTER_PAA_BILLEDER.includes(id)); // forsidens knapper nu
const ANTAL_RETTER = 255;
const ANTAL_PLANLAGTE = 92;

const laesJson = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));
const INDEX = laesJson('opskrifter/index.json');
const FILER = fs.readdirSync(path.join(ROD, 'opskrifter')).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => f.slice(0, -5));
const retterI = (id) => INDEX.grupper.find((g) => g.id === id).retter;
const JSONER = new Map(FILER.map((id) => [id, laesJson('opskrifter/' + id + '.json')]));
// Retterne til ugeplanen i index.json's rækkefølge (efter gruppe)
const UGE = INDEX.grupper.flatMap((g) => g.retter).filter((id) => JSONER.get(id).tumbi && JSONER.get(id).tumbi.ugeplan === true);

// ---------- Sorteringen i opskrifter/index.json ----------

test('alle 255 retter står i præcis én af forsidens grupper, og alle opskriftsfiler har en plads', () => {
  const alle = INDEX.grupper.flatMap((g) => g.retter);
  assert.equal(alle.length, ANTAL_RETTER);
  assert.equal(new Set(alle).size, alle.length, 'en ret står to steder');
  assert.deepEqual([...alle].sort(), [...FILER].sort());
  assert.equal(FILER.length, ANTAL_RETTER);
});

test('grupperne står i forsidens rækkefølge, ingen er tom, og koden kender dem alle', () => {
  assert.deepEqual(INDEX.grupper.map((g) => g.id), KNAPPER);
  assert.deepEqual(Object.keys(GRUPPER), GRUPPE_IDS, 'GRUPPER i js/katalog.js har samme rækkefølge som listen');
  for (const g of INDEX.grupper) assert.ok(g.retter.length > 0, g.id + ' er tom');
  assert.deepEqual(forsideGrupper(INDEX.grupper), { knapper: KNAPPER, ukendte: [] });
});

test('de 92 retter, der kan planlægges, er stadig 92 og står alle i en af grupperne', () => {
  const planlagte = FILER.filter((id) => JSONER.get(id).tumbi && JSONER.get(id).tumbi.ugeplan === true);
  assert.equal(planlagte.length, ANTAL_PLANLAGTE);
  assert.equal(FILER.map((id) => lavModel(JSONER.get(id))).filter((m) => m.uge).length, ANTAL_PLANLAGTE, 'også sådan, som modellen læser dem');
  for (const id of planlagte) assert.ok(gruppeAf(id, INDEX.grupper), id + ' står ikke i en kendt gruppe');
});

test('de seks aftensmads-grupper, «Kød» og «Bagning»: søgeordene hænger på gruppen, ikke på retten', () => {
  assert.deepEqual(AFTENSMAD_GRUPPER, ['pasta-og-nudler', 'kylling', 'fisk', 'gris', 'ko', 'groent']);
  for (const g of ['pasta-og-nudler', 'kylling', 'fisk', 'groent']) assert.equal(gruppeSoegeord(g), 'Aftensmad', g);
  for (const g of ['gris', 'ko']) assert.equal(gruppeSoegeord(g), 'Aftensmad Kød', g);
  assert.equal(gruppeSoegeord('broed-og-pizza'), 'Bagning');
  for (const g of ['soede-sager', 'jul', 'halloween', 'koed', 'ukendt', 'constructor', null, undefined]) assert.equal(gruppeSoegeord(g), null, String(g));
});

test('Kød er delt i Gris og Ko: alle kødretter fra før står i en af dem, og ingen gruppe er næsten tom', () => {
  assert.ok(!INDEX.grupper.some((g) => g.id === 'koed'), 'koed står ikke længere i index.json');
  assert.ok(!Object.hasOwn(GRUPPER, 'koed'), 'koed står ikke længere i GRUPPER');
  for (const id of KOED_FOER_V11) assert.ok(['gris', 'ko'].includes(gruppeAf(id, INDEX.grupper)), id + ' står i ' + gruppeAf(id, INDEX.grupper));
  for (const g of ['gris', 'ko']) assert.ok(retterI(g).length >= 2, g + ' har ' + retterI(g).length + ' retter');
});

// ---------- js/grupper.js ----------

test('gruppeRute: gruppen og søgningen, og alt andet er ikke dens', () => {
  assert.deepEqual(gruppeRute('#/gruppe/fisk'), { side: 'gruppe', id: 'fisk' });
  assert.deepEqual(gruppeRute('#/gruppe/fisk/'), { side: 'gruppe', id: 'fisk' });
  assert.deepEqual(gruppeRute('#/soeg'), { side: 'soeg' });
  for (const h of ['', '#', '#/', '#/gruppe', '#/gruppe/', '#/ret/boller', '#/uge', '#/voksen']) assert.equal(gruppeRute(h), null, h);
});

test('forsideGrupper: kun kendte grupper med retter får en knap, og ukendte siges højt', () => {
  const r = forsideGrupper([
    { id: 'fisk', retter: ['a'] },
    { id: 'kylling', retter: [] },
    { id: 'drikke-som-ikke-findes', retter: ['b'] },
    { id: 'constructor', retter: ['c'] },
  ]);
  assert.deepEqual(r.knapper, ['fisk']);
  assert.deepEqual(r.ukendte, ['drikke-som-ikke-findes', 'constructor']);
});

test('gruppeRetter: en ukendt eller tom gruppe er null, tomme favoritter er en tom liste', () => {
  const g = [{ id: 'fisk', retter: ['laks', 'tun'] }, { id: 'kylling', retter: [] }, { id: 'ukendt', retter: ['x'] }];
  assert.deepEqual(gruppeRetter('fisk', g), [{ id: 'laks', gruppe: 'fisk' }, { id: 'tun', gruppe: 'fisk' }]);
  for (const id of ['kylling', 'ukendt', 'constructor', '__proto__', 'toString', 'hasOwnProperty', '']) assert.equal(gruppeRetter(id, g), null, id);
  assert.deepEqual(gruppeRetter(FAVORITTER, g), []);
  assert.deepEqual(gruppeRetter(FAVORITTER, g, ['tun', 'x']), [{ id: 'tun', gruppe: 'fisk' }, { id: 'x', gruppe: null }], 'en favorit uden gruppe får bare ingen farve');
});

test('tilbageFraRet: dertil, hvor retten blev åbnet, ellers rettens gruppe, ellers forsiden', () => {
  const g = [{ id: 'fisk', retter: ['laks'] }];
  assert.equal(tilbageFraRet('laks', g, { hash: '#/soeg', ret: 'laks', y: 10 }), '#/soeg');
  assert.equal(tilbageFraRet('laks', g, null), '#/gruppe/fisk', 'en gammel adresse til en ret');
  assert.equal(tilbageFraRet('laks', g, { hash: '#/soeg', ret: 'en-anden', y: 10 }), '#/gruppe/fisk', 'en anden ret end den, der blev åbnet');
  assert.equal(tilbageFraRet('ingen', g, null), '#/');
});

test('rulleplads: kun på den skærm, retten blev åbnet fra, og kun et rigtigt tal', () => {
  assert.equal(rulleplads({ hash: '#/gruppe/fisk', ret: 'a', y: 300 }, '#/gruppe/fisk'), 300);
  assert.equal(rulleplads({ hash: '#/gruppe/fisk', ret: 'a', y: 0 }, '#/gruppe/fisk'), 0);
  assert.equal(rulleplads({ hash: '#/gruppe/fisk', ret: 'a', y: 300 }, '#/gruppe/kylling'), null);
  assert.equal(rulleplads(null, '#/gruppe/fisk'), null);
  assert.equal(rulleplads({ hash: '#/gruppe/fisk', ret: 'a', y: NaN }, '#/gruppe/fisk'), null);
});

test('blandet: skiftevis én fra hver gruppe i fast rækkefølge, som en ny liste', () => {
  const g = [{ id: 'a', retter: ['a1', 'a2', 'a3'] }, { id: 'b', retter: ['b1'] }, { id: 'c', retter: ['c1', 'c2'] }];
  const alle = ['a1', 'a2', 'a3', 'b1', 'c1', 'c2'];
  const ventet = ['a1', 'b1', 'c1', 'a2', 'c2', 'a3'];
  const selv = (x) => x;
  assert.deepEqual(blandet(alle, g, selv), ventet);
  assert.deepEqual(blandet(alle, g, selv), ventet, 'ingen tilfældighed: samme liste giver samme rækkefølge');
  assert.deepEqual(alle, ['a1', 'a2', 'a3', 'b1', 'c1', 'c2'], 'listen selv er urørt');
  const objekter = alle.map((id) => ({ id }));
  const ud = blandet(objekter, g, (m) => m.id);
  assert.deepEqual(ud.map((m) => m.id), ventet);
  assert.equal(ud[0], objekter[0], 'de samme elementer, ikke kopier');
  assert.deepEqual(blandet([], g, selv), []);
  assert.deepEqual(blandet(['a2', 'a1'], [], selv), ['a2', 'a1'], 'uden grupper står listen, som den stod');
});

test('blandet: kun listens egne retter kommer ud, så en ret uden «uge» ikke kommer med gennem sin gruppe', () => {
  const g = [{ id: 'a', retter: ['a1', 'uden-uge', 'a2'] }, { id: 'b', retter: ['uden-uge-2'] }, { id: 'c', retter: ['c1'] }];
  assert.deepEqual(blandet(['a1', 'a2', 'c1'], g, (x) => x), ['a1', 'c1', 'a2']);
  assert.deepEqual(blandet(['a2', 'a1', 'c1'], g, (x) => x), ['a2', 'c1', 'a1'], 'inden for gruppen gælder listens rækkefølge');
});

test('blandet: en ret i en ukendt gruppe eller uden for grupperne forsvinder ikke', () => {
  const g = [{ id: 'fisk', retter: ['f1', 'f2'] }, { id: 'drikke-som-ikke-findes', retter: ['d1'] }];
  const alle = ['f1', 'f2', 'd1', 'ny', 'constructor', '__proto__'];
  assert.deepEqual(blandet(alle, g, (x) => x), ['f1', 'd1', 'ny', 'f2', 'constructor', '__proto__']);
});

test('blandet på de rigtige retter: alle retter til ugeplanen er med, og de første er én fra hver gruppe', () => {
  const b = blandet(UGE, INDEX.grupper, (x) => x);
  assert.deepEqual([...b].sort(), [...UGE].sort());
  const medUge = INDEX.grupper.filter((g) => g.retter.some((id) => UGE.includes(id))).map((g) => g.id);
  assert.ok(medUge.length >= 3, 'testen skal have flere grupper at blande');
  assert.deepEqual(b.slice(0, medUge.length).map((id) => gruppeAf(id, INDEX.grupper)), medUge);
});

// ---------- Søgningen på de rigtige retter ----------

const POSTER = FILER.map((id) => {
  const m = lavModel(JSONER.get(id));
  const gruppeId = gruppeAf(id, INDEX.grupper);
  return { m, navn: m.navn, ingredienser: m.ingredienser, gruppe: GRUPPER[gruppeId], gruppeOrd: gruppeSoegeord(gruppeId), maerker: [] };
});
const ordI = (p) => soegeTekst(p).split(/[^\p{L}\p{N}]+/u);

const erIsOrd = (o) => o.startsWith('is') || o.endsWith('eis');

test('«is» rammer ord, der begynder med «is» eller slutter på «eis», ikke «ris», «fisk» og «flormelis»', () => {
  const traef = soeg(POSTER, 'is');
  for (const p of traef) assert.ok(ordI(p).some(erIsOrd), p.m.id);
  const risRetter = POSTER.filter((p) => ordI(p).includes('ris') && !ordI(p).some(erIsOrd));
  assert.ok(risRetter.length > 0, 'testen skal have retter med ris at prøve på');
  for (const p of risRetter) assert.ok(!traef.includes(p), p.m.id + ' har ris, ikke is');
  const flormelis = POSTER.filter((p) => ordI(p).includes('flormelis') && !ordI(p).some(erIsOrd));
  assert.ok(flormelis.length > 0, 'testen skal have retter alene med flormelis at prøve på');
  for (const p of flormelis) assert.ok(!traef.includes(p), p.m.id + ' har flormelis, ikke is');
  assert.ok(traef.some((p) => p.m.id === 'banansplit-med-chokoladesovs'), 'Banansplit har vaniljeis');
});

test('«mos», «kål» og «mel» finder ordets slutning: Kartoffelmos, Blomkål og hvedemel', () => {
  const navn = (t) => soeg(POSTER, t).map((p) => p.m.id);
  assert.ok(navn('mos').includes('kartoffelmos'), 'mos');
  assert.ok(navn('kål').includes('ovnbagt-blomkaal'), 'kål');
  const hvedemel = POSTER.filter((p) => ordI(p).includes('hvedemel'));
  assert.ok(hvedemel.length > 0, 'testen skal have retter med hvedemel at prøve på');
  for (const p of hvedemel) assert.ok(navn('mel').includes(p.m.id), p.m.id);
});

test('«ris» finder ikke en ret alene på «gris»', () => {
  const traef = soeg(POSTER, 'ris');
  const erRisOrd = (o) => o !== 'gris' && o !== 'pris' && (o.startsWith('ris') || o.endsWith('ris'));
  const grise = POSTER.filter((p) => ordI(p).includes('gris') && !ordI(p).some(erRisOrd));
  assert.ok(grise.length > 0, 'testen skal have retter alene med gris at prøve på');
  for (const p of grise) assert.ok(!traef.includes(p), p.m.id + ' har gris, ikke ris');
  for (const p of traef) assert.ok(ordI(p).some(erRisOrd), p.m.id);
});

test('korte ord: højst 3 bogstaver kun ordets begyndelse, madord også slutningen, og længere ord også inde i ordet', () => {
  const r = (navn) => ({ id: navn, navn, ingredienser: [], maerker: [] });
  const liste = [r('Flødeis'), r('Is med bær'), r('Risengrød'), r('Fiskefrikadeller'), r('Kartoffelmos'), r('Æggekage')];
  const ids = (t) => soeg(liste, t).map((x) => x.id);
  assert.deepEqual(ids('is'), ['Flødeis', 'Is med bær']);
  assert.deepEqual(ids('ris'), ['Risengrød']);
  assert.deepEqual(ids('fis'), ['Fiskefrikadeller']);
  assert.deepEqual(ids('æg'), ['Æggekage'], 'æ er et bogstav: \\b kender kun a-z i WebKit');
  assert.deepEqual(ids('deis'), ['Flødeis'], 'fire bogstaver må stå inde i ordet');
  assert.deepEqual(ids('mos'), ['Kartoffelmos'], '«mos» slutter ordet');
  assert.deepEqual(ids('tof'), [], '«tof» står inde i ordet');
  assert.deepEqual(ids('age'), [], '«age» slutter «Æggekage», men er ikke et madord');
  assert.deepEqual(ids('lmos'), ['Kartoffelmos']);
});

test('«aftensmad» finder alle retter i de seks grupper og ingen andre', () => {
  const traef = soeg(POSTER, 'aftensmad');
  const forventet = AFTENSMAD_GRUPPER.flatMap(retterI);
  assert.deepEqual(traef.map((p) => p.m.id).sort(), [...forventet].sort());
});

// Før v11 stod gruppens navn «Kød» på alle kødretterne, så «kød» fandt også pølser, skinke, medister og koteletter, der
// ikke har ordet i navn eller ingredienser. Det skal den stadig efter delingen i Gris og Ko
test('«kød» finder alle retter i Gris og Ko, også dem uden ordet «kød»', () => {
  const traef = soeg(POSTER, 'kød').map((p) => p.m.id);
  for (const id of [...retterI('gris'), ...retterI('ko')]) assert.ok(traef.includes(id), id);
  assert.ok(['poelse-boennegryde', 'koteletter-med-aeble', 'medister-i-ovn'].every((id) => !/kød/i.test(soegeTekst({ ...POSTER.find((p) => p.m.id === id), gruppeOrd: null }))),
    'testen skal have retter, som kun gruppen gør til kød');
  for (const id of retterI('gris')) assert.ok(soeg(POSTER, 'gris').some((p) => p.m.id === id), 'gruppens navn finder ' + id);
});

test('«jul» og «bagning» finder stadig deres gruppe', () => {
  for (const id of retterI('broed-og-pizza')) assert.ok(soeg(POSTER, 'bagning').some((p) => p.m.id === id), id);
  for (const id of retterI('jul')) assert.ok(soeg(POSTER, 'jul').some((p) => p.m.id === id), id);
});

test('en tom søgning og mærkelige tegn får ikke søgningen til at fejle', () => {
  assert.equal(soeg(POSTER, '').length, ANTAL_RETTER);
  assert.equal(soeg(POSTER, '   ').length, ANTAL_RETTER);
  for (const t of ['(', ')', '[', '.*', '\\', '^$', '+', '?', '<script>', '\u{1F355}', 'a\\b(c', '%', 'x'.repeat(5000), '__proto__', 'constructor']) {
    assert.ok(Array.isArray(soeg(POSTER, t)), JSON.stringify(t.slice(0, 20)));
    assert.equal(soeg(POSTER, t).length, 0, JSON.stringify(t.slice(0, 20)));
  }
});

// ---------- Den rigtige app.js med et falsk DOM ----------
// Elementerne husker børn, attributter og lyttere. querySelector kender tag, .klasse, [attr] og [attr="v"] og mellemrum

let rod;
let meddelelse;
let fokus = null;
let vinduesLyttere = {};
let ur = 10000;
let sagt = [];
let rullet = [];
let skrivninger = [];
let hentninger = 0;
let hentFra = null;

const lille = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function lavEl(tag) {
  const e = {
    tag: String(tag).toLowerCase(), born: [], attr: {}, dataset: {}, lyt: {}, hidden: false, value: '', className: '', mor: null, _tekst: '',
    style: { setProperty() {}, removeProperty() {} },
    get classList() {
      const self = this;
      const liste = () => self.className.split(/\s+/).filter(Boolean);
      return {
        add: (...k) => { self.className = [...new Set([...liste(), ...k])].join(' '); },
        remove: (...k) => { self.className = liste().filter((x) => !k.includes(x)).join(' '); },
        toggle: (k, til) => { const med = til ?? !liste().includes(k); self.classList[med ? 'add' : 'remove'](k); return med; },
        contains: (k) => liste().includes(k),
      };
    },
    get textContent() { return this._tekst + this.born.map((b) => b.textContent ?? '').join(''); },
    set textContent(v) { this._tekst = String(v ?? ''); this.born = []; },
    setAttribute(k, v) {
      if (k === 'class') this.className = String(v);
      else if (k.startsWith('data-')) this.dataset[lille(k.slice(5))] = String(v);
      else { this.attr[k] = String(v); if (k === 'hidden') this.hidden = true; if (k === 'id') this.id = String(v); }
    },
    getAttribute(k) {
      if (k === 'class') return this.className;
      if (k.startsWith('data-')) return this.dataset[lille(k.slice(5))] ?? null;
      return Object.hasOwn(this.attr, k) ? this.attr[k] : null;
    },
    removeAttribute(k) { delete this.attr[k]; },
    append(...b) { for (const x of b) { x.mor = this; this.born.push(x); } },
    prepend(...b) { for (const x of b) x.mor = this; this.born.unshift(...b); },
    replaceChildren(...b) { this.born = []; this.append(...b); },
    remove() { if (this.mor) this.mor.born = this.mor.born.filter((x) => x !== this); },
    addEventListener(type, fn) { (this.lyt[type] ??= []).push(fn); },
    removeEventListener(type, fn) { this.lyt[type] = (this.lyt[type] || []).filter((x) => x !== fn); },
    focus() { fokus = this; },
    blur() { if (fokus === this) fokus = null; },
    scrollIntoView() {},
    select() {},
    setSelectionRange() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    querySelectorAll(sel) { return alleUnder(this).filter((x) => passer(x, sel, this)); },
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; },
    closest(sel) { for (let x = this; x; x = x.mor) if (passer(x, sel, null)) return x; return null; },
    contains(x) { for (; x; x = x.mor) if (x === this) return true; return false; },
    get isConnected() { return rod.contains(this); },
  };
  return e;
}
const alleUnder = (e) => (e.born || []).flatMap((b) => (b.tag ? [b, ...alleUnder(b)] : []));
function delPasser(e, del) {
  const dele = del.match(/^[a-z0-9]+|\.[\w-]+|\[[^\]]+\]/gi);
  if (!dele || dele.join('') !== del) throw new Error('testens querySelector kender ikke «' + del + '»');
  return dele.every((d) => {
    if (d[0] === '.') return e.classList.contains(d.slice(1));
    if (d[0] === '[') {
      const [, k, , v] = /^\[([\w-]+)(="([^"]*)")?\]$/.exec(d);
      const vaerdi = e.getAttribute(k);
      return v === undefined ? vaerdi !== null : vaerdi === v;
    }
    return e.tag === d.toLowerCase();
  });
}
function passer(e, sel, inden) {
  return sel.split(',').some((alt) => {
    const led = alt.trim().split(/\s+/);
    if (!delPasser(e, led.at(-1))) return false;
    let x = e.mor;
    for (let i = led.length - 2; i >= 0; i--) {
      while (x && x !== inden && !delPasser(x, led[i])) x = x.mor;
      if (!x || x === inden) return false;
      x = x.mor;
    }
    return true;
  });
}

globalThis.document = {
  title: '',
  visibilityState: 'visible',
  addEventListener() {},
  removeEventListener() {},
  createElement: lavEl,
  createElementNS: (ns, tag) => lavEl(tag),
  createTextNode: (tekst) => ({ textContent: String(tekst) }),
  getElementById: (id) => (id === 'app' ? rod : id === 'meddelelse' ? meddelelse : null),
  querySelector: (sel) => rod.querySelector(sel),
  querySelectorAll: (sel) => rod.querySelectorAll(sel),
  get activeElement() { return fokus; },
};
const lokation = { hash: '#/', search: '', protocol: 'http:' };
globalThis.location = lokation;
// En gammel adresse (#/uge) skiftes til den nye med history.replaceState (js/voksen-del.js): her skifter den kun hash
globalThis.history = { replaceState: (s, t, url) => { lokation.hash = url; } };
globalThis.window = {
  scrollY: 0,
  addEventListener: (type, fn) => { (vinduesLyttere[type] ??= []).push(fn); },
  removeEventListener() {},
  scrollTo(x, y) { this.scrollY = y; rullet.push(y); },
  speechSynthesis: { speak: (u) => { sagt.push({ tekst: u.text, hash: location.hash }); }, cancel() {}, getVoices: () => [] },
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
};
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
Object.defineProperty(globalThis, 'performance', { value: { now: () => ur }, configurable: true });
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
const lageret = new Map();
globalThis.localStorage = {
  getItem: (k) => (lageret.has(k) ? lageret.get(k) : null),
  setItem: (k, v) => { skrivninger.push(k); lageret.set(k, String(v)); },
  removeItem: (k) => { skrivninger.push(k); lageret.delete(k); },
};
globalThis.fetch = async (sti) => {
  hentninger++;
  try {
    const svar = hentFra ? hentFra(sti) : undefined;
    if (svar instanceof Error) throw svar;
    if (svar !== undefined) return { ok: true, status: 200, json: async () => svar };
    if (sti === 'opskrifter/index.json') return { ok: true, status: 200, json: async () => INDEX };
    const m = /^opskrifter\/(.+)\.json$/.exec(sti);
    if (m && JSONER.has(m[1])) return { ok: true, status: 200, json: async () => JSONER.get(m[1]) };
    if (sti === 'lyd/liste.json') return { ok: true, status: 200, json: async () => laesJson('lyd/liste.json') };
    return { ok: false, status: 404, json: async () => null };
  } finally {
    hentninger--;
  }
};

const Lager = await import('../js/lager.js');
const HENT_FEJL_TEST = new Error('ingen forbindelse');

const ventPaaHentning = async () => {
  for (let i = 0; i < 2; i++) {
    do { await new Promise(setImmediate); } while (hentninger > 0);
  }
};

// Starter en ny app.js (kun app.js indlæses igen, så S er ny) på adressen hash, og venter på, at alt er hentet
let startNr = 0;
async function start(hash = '#/', { hent = null, foer = null } = {}) {
  rod = lavEl('div');
  meddelelse = lavEl('div');
  fokus = null;
  vinduesLyttere = {};
  sagt = [];
  rullet = [];
  skrivninger = [];
  lageret.clear();
  hentFra = hent;
  lokation.hash = hash;
  window.scrollY = 0;
  if (foer) foer();
  skrivninger = [];
  await import('../app.js?start=' + ++startNr);
  await ventPaaHentning();
  ur += 1000;
}

// Et tryk, efter spærren mod dobbelttryk er løbet ud
const tryk = (e) => {
  assert.ok(e, 'knappen findes ikke');
  ur += 1000;
  for (const fn of e.lyt.click || []) fn({ type: 'click', target: e, preventDefault() {}, stopPropagation() {} });
};
// Det, browseren gør, når adressen skifter uden for appen (tilbage-knappen, et link)
const gaaTil = (hash) => {
  lokation.hash = hash;
  for (const fn of vinduesLyttere.hashchange || []) fn();
  ur += 1000;
};
const skriv = (felt, tekst) => {
  felt.value = tekst;
  for (const fn of felt.lyt.input || []) fn({ type: 'input', target: felt });
};
const knapper = () => rod.querySelectorAll('.gruppe-knap');
const kort = () => rod.querySelectorAll('.kort[data-ret]').map((k) => k.dataset.ret);
const knapMed = (label) => rod.querySelectorAll('button').find((b) => b.getAttribute('aria-label') === label);
const knapMedTekst = (tekst) => rod.querySelectorAll('button').find((b) => b.textContent === tekst);
const overskrift = () => rod.querySelector('h1').textContent;

test('forsiden: en rigtig knap pr. gruppe med navn til skærmlæseren, billede og navn og ingen af de 255 kort', async () => {
  await start();
  const b = knapper();
  assert.deepEqual(b.map((x) => x.dataset.gruppe), KNAPPER);
  assert.deepEqual(b.map((x) => x.getAttribute('aria-label')), KNAPPER.map((id) => GRUPPER[id]));
  for (const x of b) {
    assert.equal(x.tag, 'button');
    assert.equal(x.getAttribute('type'), 'button');
    assert.equal(x.textContent, x.getAttribute('aria-label'), 'ingen anden tekst end navnet');
    assert.match(x.querySelector('img').getAttribute('src'), /^grafik\/[a-z-]+\.svg$/);
    assert.equal(x.querySelector('img').getAttribute('alt'), '', 'billedet er pynt: knappen har navnet');
  }
  assert.equal(rod.querySelectorAll('.kort').length, 0);
  assert.equal(rod.querySelectorAll('nav ul li button').length, 12, 'en liste i en nav, så skærmlæseren kan sige antallet');
});

test('billederne på forsiden findes alle på disken', async () => {
  await start();
  for (const b of knapper()) {
    const src = b.querySelector('img').getAttribute('src');
    assert.ok(fs.existsSync(path.join(ROD, src)), src);
  }
});

test('billedet til chippen «Aftensmad» i voksendelen findes på disken', () => {
  assert.ok(fs.existsSync(path.join(ROD, grafikGruppe(AFTENSMAD))), grafikGruppe(AFTENSMAD));
});

test('et tryk åbner gruppen og siger navnet, og skærmen skifter først', async () => {
  await start();
  for (const id of KNAPPER) {
    gaaTil('#/');
    sagt = [];
    tryk(knapper().find((b) => b.dataset.gruppe === id));
    assert.equal(location.hash, '#/gruppe/' + id);
    assert.deepEqual(sagt, [{ tekst: GRUPPER[id], hash: '#/gruppe/' + id }]);
  }
});

test('en stemme, der fejler, holder ikke navigationen tilbage', async () => {
  await start();
  const gammel = window.speechSynthesis.speak;
  window.speechSynthesis.speak = () => { throw new Error('ingen stemme'); };
  try {
    tryk(knapper()[1]);
    assert.equal(location.hash, '#/gruppe/kylling');
    assert.equal(overskrift(), GRUPPER.kylling);
  } finally {
    window.speechSynthesis.speak = gammel;
  }
});

test('gruppeskærmen viser kun gruppens retter med kortene fra før (minuttal og lyn)', async () => {
  await start();
  for (const id of KNAPPER) {
    gaaTil('#/gruppe/' + id);
    assert.deepEqual(kort(), retterI(id), id);
    assert.equal(overskrift(), GRUPPER[id]);
    assert.equal(rod.querySelector('section').dataset.gruppe, id);
  }
  const modeller = FILER.map((f) => lavModel(JSONER.get(f)));
  const hvor = (fn) => modeller.filter(fn).map((m) => gruppeAf(m.id, INDEX.grupper));
  const medLyn = hvor(erLynhurtig);
  const medTid = hvor(harTid);
  assert.ok(medLyn.length > 0, 'testen skal have lynhurtige retter at prøve på');
  for (const id of KNAPPER) {
    gaaTil('#/gruppe/' + id);
    assert.equal(rod.querySelectorAll('.lyn').length, medLyn.filter((g) => g === id).length, 'lyn på ' + id);
    assert.equal(rod.querySelectorAll('.kort-tid').length, medTid.filter((g) => g === id).length, 'minuttal på ' + id);
  }
});

test('en ukendt gruppe giver en fejlskærm med vej til forsiden', async () => {
  await start();
  // 'koed' er et gammelt bogmærke fra før v11, hvor Kød blev delt i Gris og Ko
  for (const id of ['constructor', '__proto__', 'toString', 'xyz', 'aftensmad', 'bagning', 'koed']) {
    gaaTil('#/gruppe/' + id);
    assert.equal(overskrift(), 'Den gruppe findes ikke', id);
    assert.equal(kort().length, 0);
    tryk(knapMedTekst('Til forsiden'));
    assert.equal(location.hash, '#/', id);
  }
});

// v11 delte Kød i Gris og Ko uden en migrering (regel 5): de gemte data har kun rettens id, aldrig gruppens. Her gemmes
// favoritter, ugens udvalg, «lavet» og en ugeplan med kødretter, som v10 gemte dem (formatet er det samme), og appen viser
// dem bagefter uden at skrive lageret om
const KOED_GEMT = KOED_FOER_V11.filter((id) => UGE.includes(id)).slice(0, 4);
function gemKoedSomV10() {
  for (const id of KOED_GEMT.slice(0, 2)) Lager.skiftFavorit(id, FILER);
  Lager.gemFamilie({ udvalg: { ids: KOED_GEMT, rettet: '2026-11-14' } }, FILER);
  Lager.markerLavet(KOED_GEMT[2], '2026-11-14', FILER);
  const dage = [{ ret: KOED_GEMT[0], af: 'rosa', n: 4 }, null, { ret: KOED_GEMT[3], af: 'bo', n: 4 }, null, null, null, null];
  Lager.gemUge({ uge: planMandag(), dage }, FILER);
  return { familie: lageret.get('kog-familie-v1'), uge: lageret.get('kog-uge-v1') };
}

test('gemte data med kødretter fra før v11 overlever delingen i Gris og Ko, uden at blive skrevet om', async () => {
  assert.equal(KOED_GEMT.length, 4, 'testen skal have fire kødretter til ugeplanen');
  assert.ok(KOED_GEMT.some((id) => gruppeAf(id, INDEX.grupper) === 'gris') && KOED_GEMT.some((id) => gruppeAf(id, INDEX.grupper) === 'ko'),
    'testen skal have retter fra både Gris og Ko: ' + KOED_GEMT.map((id) => gruppeAf(id, INDEX.grupper)).join(', '));
  let foer = null;
  await start('#/gruppe/favoritter', { foer: () => { foer = gemKoedSomV10(); } });
  assert.deepEqual([...kort()].sort(), KOED_GEMT.slice(0, 2).sort(), 'hjertet viser de to kødretter');
  const f = Lager.hentFamilie(FILER);
  assert.deepEqual(f.favoritter, KOED_GEMT.slice(0, 2));
  assert.deepEqual(f.udvalg.ids, KOED_GEMT);
  assert.deepEqual(Object.keys(f.lavet), [KOED_GEMT[2]]);
  assert.deepEqual(Lager.hentUge(FILER).dage.map((d) => d && d.ret), [KOED_GEMT[0], null, KOED_GEMT[3], null, null, null, null]);
  assert.equal(lageret.get('kog-familie-v1'), foer.familie, 'familien står uændret i lageret');
  assert.equal(lageret.get('kog-uge-v1'), foer.uge, 'ugeplanen står uændret i lageret');
  // Børnenes valg viser ugens udvalg med alle fire kødretter (fire passer på én side). Pip, for Rosa har valgt sin ret
  await start('#/uge/vaelg/pip', { foer: () => { foer = gemKoedSomV10(); } });
  assert.deepEqual([...rod.querySelectorAll('.ret-kort').map((k) => k.dataset.ret)].sort(), [...KOED_GEMT].sort());
  assert.equal(lageret.get('kog-familie-v1'), foer.familie);
  assert.deepEqual(skrivninger, [], 'ingen nøgle skrives om');
});

// Det, skærmlæseren siger for et element: teksten og billedernes alt, uden det, der er aria-hidden (aria-label vinder)
const laesNavn = (e) => {
  if (!e.tag) return e.textContent;
  if (e.getAttribute('aria-hidden') === 'true') return '';
  if (e.getAttribute('aria-label') !== null) return e.getAttribute('aria-label');
  if (e.tag === 'img') return e.getAttribute('alt') || '';
  return e._tekst + e.born.map(laesNavn).join('');
};
const UDEN_DELING = /[\u00ad\u00a0]/u;
// Navnet til skærmlæseren er rettens navn uden bløde bindestreger og hårde mellemrum, og skærmen viser det delt (kortNavn)
function tjekKortNavne(kortene, hvor) {
  assert.ok(kortene.length > 0, hvor + ': ingen kort');
  const medDeling = [];
  for (const k of kortene) {
    const sagt = laesNavn(k);
    if (UDEN_DELING.test(sagt)) medDeling.push(k.dataset.ret + ' «' + sagt.replace(/\u00ad/g, '|').replace(/\u00a0/g, '_') + '»');
  }
  assert.deepEqual(medDeling, [], hvor + ': ' + medDeling.length + ' af ' + kortene.length + ' kort har en blød bindestreg eller et hårdt mellemrum i navnet til skærmlæseren');
  for (const k of kortene) {
    const navn = utenBloede(lavModel(JSONER.get(k.dataset.ret)).navn);
    const sagt = laesNavn(k);
    assert.ok(sagt.startsWith(navn), hvor + ' ' + k.dataset.ret + ': «' + sagt + '» begynder ikke med «' + navn + '»');
    const vist = k.querySelector('.kort-navn');
    assert.equal(vist.getAttribute('aria-hidden'), 'true', hvor + ' ' + k.dataset.ret);
    assert.equal(utenBloede(vist.textContent).replace(/\u00a0/g, ' '), navn, hvor + ' ' + k.dataset.ret + ': skærmen viser hele navnet');
  }
}

// Review K9 (17-11): kortNavn giver navnet bløde bindestreger og et hårdt mellemrum til skærmen, og kortets navn til
// skærmlæseren kom fra den tekst (97 af 255 navne med en blød bindestreg, 48 med et hårdt mellemrum)
test('kortenes navn til skærmlæseren er rettens navn uden bløde bindestreger og hårde mellemrum (review K9)', async () => {
  let delt = 0;
  for (const g of KNAPPER) {
    await start('#/gruppe/' + g);
    const kortene = rod.querySelectorAll('.kort[data-ret]');
    tjekKortNavne(kortene, g);
    delt += kortene.filter((k) => UDEN_DELING.test(k.querySelector('.kort-navn').textContent)).length;
  }
  assert.ok(delt >= 90, delt + ' kort viser navnet delt');
  await start('#/gruppe/fisk');
  assert.equal(rod.querySelector('.kort[data-ret="fiskepinde-med-baade"] .kort-navn').textContent, 'Fiske\u00adpinde med kartof\u00adfelbåde');
  // Børnenes valg (js/ugeplan.js) har de samme kort
  for (const dyr of ['rosa', 'bo']) {
    await start('#/uge/vaelg/' + dyr);
    tjekKortNavne(rod.querySelectorAll('.ret-kort'), '#/uge/vaelg/' + dyr);
  }
});

// Review V11 (17-11): rettens titel endte med et kort stykke alene («… fiskefrikadeller med / ris», «Lille kransekage- /
// tårn»). Titlen deles nu som kortene (kortNavn), og skærmlæseren får navnet uden bløde bindestreger og hårde mellemrum
test('rettens titel deles som kortets navn, og skærmlæseren får hele navnet (review V11 og K9)', async () => {
  const ids = INDEX.grupper.flatMap((g) => g.retter);
  await start('#/ret/' + ids[0]);
  const forkert = [];
  for (const id of ids) {
    gaaTil('#/ret/' + id);
    await ventPaaHentning();
    const navn = lavModel(JSONER.get(id)).navn;
    const h = rod.querySelector('h1');
    const vist = h.querySelector('.titel-navn');
    if (!vist || vist.getAttribute('aria-hidden') !== 'true' || vist.textContent !== kortNavn(navn) || laesNavn(h) !== utenBloede(navn)) {
      forkert.push(id + ' «' + laesNavn(h).replace(/\u00ad/g, '|').replace(/\u00a0/g, '_') + '»');
    }
  }
  assert.deepEqual(forkert, [], forkert.length + ' af ' + ids.length + ' titler');
  gaaTil('#/ret/milde-asiatiske-fiskefrikadeller');
  await ventPaaHentning();
  assert.match(rod.querySelector('h1 .titel-navn').textContent, /med\u00a0ris$/u);
});

// Review V10 (17-11): i ingredienslisten stod tallet og ordet efter det på hver sin linje («(à 80 / g)», «15 / %»). Navnet
// på skærmen binder dem med et hårdt mellemrum (holdSammen i js/indkoeb.js), men knappens navn til skærmlæseren og stemmen
// får det ikke
test('ingrediensens tal og ordet efter står sammen på skærmen, men ikke i skærmlæserens navn (review V10)', async () => {
  const ids = INDEX.grupper.flatMap((g) => g.retter);
  await start('#/ret/' + ids[0]);
  const loese = [];
  const iNavnet = [];
  let bundne = 0;
  for (const id of ids) {
    gaaTil('#/ret/' + id);
    await ventPaaHentning();
    for (const b of rod.querySelectorAll('.ingr')) {
      const vist = b.querySelector('.ingr-navn').textContent;
      if (/[\d½] \S/u.test(vist)) loese.push(id + ' «' + vist + '»');
      if (/[\d½]\u00a0/u.test(vist)) bundne++;
      if (UDEN_DELING.test(b.getAttribute('aria-label'))) iNavnet.push(id + ' «' + b.getAttribute('aria-label') + '»');
    }
  }
  assert.deepEqual(loese, [], loese.length + ' ingrediensnavne med et tal, der kan stå alene på en linje');
  assert.deepEqual(iNavnet, []);
  assert.ok(bundne >= 20, bundne + ' navne med et bundet tal');
  gaaTil('#/ret/groen-porre-kartoffelsuppe-med-bacondrys');
  await ventPaaHentning();
  const floede = rod.querySelectorAll('.ingr').find((b) => b.querySelector('.ingr-navn').textContent.includes('15\u00a0%'));
  assert.ok(floede, 'madlavningsfløde 15 % med et hårdt mellemrum');
  assert.ok(!UDEN_DELING.test(floede.getAttribute('aria-label')), floede.getAttribute('aria-label'));
  sagt = [];
  tryk(floede);
  assert.ok(sagt.length === 1 && !UDEN_DELING.test(sagt[0].tekst), JSON.stringify(sagt));
});

// Review V15 (17-11): «Sluk, og lad dem trække 5- / 10 min.» i sushi-skålens trin 3 på 360 px. Et interval i noten står i
// en .udelt (white-space: nowrap i app.css), og noten er den samme tekst som før: intet U+2011 eller hårdt mellemrum
test('et talinterval i trinnets note brydes ikke ved bindestregen, og teksten er uændret (review V15)', async () => {
  const INTERVAL = /\d+(?:,\d+)?[-–]\d+/gu;
  const trin = [];
  for (const id of INDEX.grupper.flatMap((g) => g.retter)) {
    JSONER.get(id).recipeInstructions.forEach((t, i) => { if (INTERVAL.test(t.tumbi?.note || '')) trin.push([id, i + 1, t.tumbi.note]); INTERVAL.lastIndex = 0; });
  }
  assert.ok(trin.length >= 60, trin.length + ' noter med et interval');
  await start('#/ret/' + trin[0][0] + '/trin/' + trin[0][1]);
  const forkert = [];
  for (const [id, nr, note] of trin) {
    gaaTil('#/ret/' + id + '/trin/' + nr);
    await ventPaaHentning();
    const p = rod.querySelector('.note');
    const udelte = p.querySelectorAll('.udelt').map((s) => s.textContent);
    const intervaller = note.match(INTERVAL);
    if (p.textContent !== 'Til den voksne: ' + note || udelte.length !== intervaller.length || !intervaller.every((x, i) => udelte[i].startsWith(x))) {
      forkert.push(id + ' trin ' + nr + ': ' + JSON.stringify(udelte));
    }
  }
  assert.deepEqual(forkert, []);
  gaaTil('#/ret/sushi-bowl-med-tun/trin/3');
  await ventPaaHentning();
  assert.deepEqual(rod.querySelectorAll('.note .udelt').map((s) => s.textContent), ['5-10 min.']);
});

test('tilbage fra en ret: pilen fører til gruppen på samme rulleplads og med fokus på kortet', async () => {
  await start('#/gruppe/fisk');
  const id = kort()[3];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  assert.equal(location.hash, '#/gruppe/fisk', 'første tryk siger kun navnet');
  assert.ok(k().classList.contains('valgt'));
  window.scrollY = 640;
  tryk(k());
  assert.equal(location.hash, '#/ret/' + id, 'andet tryk åbner retten');
  assert.equal(window.scrollY, 0, 'retten starter øverst');
  assert.ok(!knapMed('Til forsiden'), 'pilen står i husets sted, så advarslen har plads på en iPhone');
  tryk(knapMed('Tilbage'));
  assert.equal(location.hash, '#/gruppe/fisk');
  assert.equal(window.scrollY, 640);
  assert.equal(fokus, k());
  tryk(knapMed('Til forsiden'));
  assert.equal(location.hash, '#/');
  assert.equal(window.scrollY, 0);
});

test('browserens tilbage-knap fra retten gendanner også pladsen, og et dobbelttryk springer ikke et kort over', async () => {
  await start('#/gruppe/kylling');
  const b = rod.querySelectorAll('.kort[data-ret]')[0];
  const id = b.dataset.ret;
  tryk(b);
  for (const fn of rod.querySelector('.kort.valgt').lyt.click) fn({ type: 'click' });
  assert.equal(location.hash, '#/gruppe/kylling', 'samme tryk to gange inden for spærren åbner ikke retten');
  window.scrollY = 222;
  tryk(rod.querySelector('.kort.valgt'));
  assert.equal(location.hash, '#/ret/' + id);
  gaaTil('#/gruppe/kylling');
  assert.equal(window.scrollY, 222);
  gaaTil('#/gruppe/fisk');
  assert.equal(window.scrollY, 0, 'en ny gruppe starter øverst');
});

test('tilbage fra gruppen fører til forsiden', async () => {
  await start('#/gruppe/jul');
  tryk(knapMed('Til forsiden'));
  assert.equal(location.hash, '#/');
  assert.equal(knapper().length, 12);
});

test('gamle adresser til en ret virker og fører tilbage til rettens gruppe', async () => {
  for (const g of KNAPPER) {
    const id = retterI(g)[0];
    await start('#/ret/' + id);
    assert.equal(laesNavn(rod.querySelector('h1')), utenBloede(lavModel(JSONER.get(id)).navn), id);
    tryk(knapMed('Tilbage'));
    assert.equal(location.hash, '#/gruppe/' + g);
    assert.ok(kort().includes(id));
  }
});

test('gamle adresser til et trin, færdig og en ret, der ikke findes', async () => {
  const id = retterI('kylling')[0];
  await start('#/ret/' + id + '/trin/1');
  assert.ok(rod.querySelector('main'), 'trinnet vises');
  assert.notEqual(overskrift(), 'Den opskrift findes ikke');
  gaaTil('#/ret/findes-ikke');
  assert.equal(overskrift(), 'Den opskrift findes ikke');
  gaaTil('#/ret/' + id + '/trin/999');
  assert.equal(overskrift(), 'Den opskrift findes ikke');
});

test('lupen: findes for den voksne, åbner søgningen og giver feltet fokus', async () => {
  await start();
  const lup = knapMed('Søg efter en ret');
  assert.ok(lup.classList.contains('forside-lup'));
  assert.equal(lup.tag, 'button');
  tryk(lup);
  assert.equal(location.hash, '#/soeg');
  assert.equal(fokus, rod.querySelector('.soeg-felt'));
  assert.deepEqual(sagt, [], 'lupen er til den voksne: ingen stemme');
});

test('lupen: tom søgning viser vejledningen og ingen retter', async () => {
  await start('#/soeg');
  assert.ok(rod.querySelector('.soeg-vejledning'));
  assert.equal(kort().length, 0);
  skriv(rod.querySelector('.soeg-felt'), '   ');
  assert.ok(rod.querySelector('.soeg-vejledning'));
  assert.equal(kort().length, 0);
});

test('lupen: «is» og «aftensmad» på den rigtige skærm, og feltet tegnes ikke om', async () => {
  await start('#/soeg');
  const felt = rod.querySelector('.soeg-felt');
  skriv(felt, 'is');
  const is = kort();
  assert.ok(is.length > 0 && is.length < 62, 'var 62 træf før: ' + is.length);
  for (const id of is) assert.ok(ordI(POSTER.find((p) => p.m.id === id)).some(erIsOrd), id);
  assert.equal(rod.querySelector('.soeg-felt'), felt, 'Safari lukker tastaturet, hvis feltet tegnes om');
  skriv(felt, 'aftensmad');
  assert.deepEqual(kort().sort(), AFTENSMAD_GRUPPER.flatMap(retterI).sort());
  assert.match(rod.querySelector('.soeg-tal').textContent, /93/);
});

test('lupen: mærkelige tegn giver «ingen træf» med en vej videre, ikke en fejl', async () => {
  await start('#/soeg');
  const felt = rod.querySelector('.soeg-felt');
  for (const t of ['(', '.*', '\\', '[', '\u{1F355}', '<b>']) {
    skriv(felt, t);
    assert.equal(kort().length, 0, t);
    assert.ok(rod.querySelector('.soeg-resultat').textContent.includes(t), 'teksten står som tekst: ' + t);
  }
  const ryd = rod.querySelector('.soeg-resultat').querySelector('button');
  tryk(ryd);
  assert.equal(felt.value, '');
  assert.ok(rod.querySelector('.soeg-vejledning'));
});

test('lupen: kortene åbner retten, og tilbage står søgningen, som den var', async () => {
  await start('#/soeg');
  const felt = rod.querySelector('.soeg-felt');
  skriv(felt, 'kylling');
  const id = kort()[0];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  tryk(k());
  assert.equal(location.hash, '#/ret/' + id);
  tryk(knapMed('Tilbage'));
  assert.equal(location.hash, '#/soeg');
  assert.equal(rod.querySelector('.soeg-felt').value, 'kylling');
  assert.ok(kort().includes(id));
  tryk(knapMed('Til forsiden'));
  tryk(knapMed('Søg efter en ret'));
  assert.equal(rod.querySelector('.soeg-felt').value, '', 'forsiden husker ikke søgningen');
});

test('hjertet: kun når der findes en favorit, og det åbner favoritterne', async () => {
  await start();
  assert.equal(rod.querySelector('.forside-favoritter'), null, 'ingen favorit, intet hjerte');
  assert.equal(knapper().length, 12);

  const [a, b] = [retterI('fisk')[0], retterI('jul')[0]];
  await start('#/', { foer: () => { Lager.skiftFavorit(a, FILER); Lager.skiftFavorit(b, FILER); } });
  const hjerte = rod.querySelector('.forside-favoritter');
  assert.equal(hjerte.tag, 'button');
  assert.equal(hjerte.getAttribute('aria-label'), 'Favoritter');
  assert.equal(knapper().length, 12, 'hjertet er ud over de 12');
  tryk(hjerte);
  assert.equal(location.hash, '#/gruppe/' + FAVORITTER);
  assert.equal(overskrift(), 'Favoritter');
  assert.deepEqual(kort(), [a, b]);
  assert.equal(sagt.at(-1).tekst, 'Favoritter');
  assert.deepEqual(rod.querySelectorAll('.kort-plads').map((p) => p.dataset.gruppe), ['fisk', 'jul'], 'kortene beholder gruppens farve');
});

test('#/gruppe/favoritter uden favoritter forklarer det og fører til forsiden', async () => {
  await start('#/gruppe/' + FAVORITTER);
  assert.equal(overskrift(), 'Der er ingen favoritter endnu');
  tryk(knapMedTekst('Til forsiden'));
  assert.equal(location.hash, '#/');
});

test('«Voksne: hold» står under knapperne', async () => {
  await start();
  const main = rod.querySelector('main');
  const dele = main.born.map((b) => b.className);
  const hold = main.querySelector('.voksen-hold');
  assert.ok(hold.closest('.forside-voksen'));
  assert.ok(dele.indexOf('forside-indhold') < dele.indexOf('forside-voksen'));
  assert.ok(dele.indexOf('forside-voksen') < dele.indexOf('forside-fod'));
  // Review R2 (15-11): navnet begynder med den tekst, man ser, så stemmestyring finder knappen (som L4)
  assert.match(hold.getAttribute('aria-label'), /^Voksne: hold\b/);
});

// En app på hjemmeskærmen har ingen genindlæs-knap (Jimmy 19-11: v9 på iPhonen, selvom v12 var live), så med en service
// worker beder teksten ikke om at genindlæse: appen henter selv den nye udgave. Uden service worker sker der intet af sig
// selv, så dér beder den om det (code review L4, 19-11: før lovede den «af sig selv» også dér)
const MED_UKENDT_GRUPPE = { version: 2, grupper: [...INDEX.grupper, { id: 'ukendt-gruppe', retter: ['ny-ret-her'] }] };
async function ukendtGruppeLinje() {
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? MED_UKENDT_GRUPPE : undefined) });
  assert.equal(knapper().length, 12);
  // Den første linje er retten, der ikke kunne hentes (hentFejlLinje: ny-ret-her findes ikke på disken)
  const linje = rod.querySelectorAll('.fejl-linje').find((p) => p.textContent.includes('ukendt-gruppe'));
  assert.equal(linje.getAttribute('role'), 'status');
  return linje.textContent;
}

test('grupper i listen, koden ikke kender, forsvinder ikke i stilhed: med service worker kommer den nye udgave af sig selv', async () => {
  await medSW(true, async () => {
    assert.equal(await ukendtGruppeLinje(), 'Listen har grupper, denne udgave ikke kender (ukendt-gruppe). Den nye udgave hentes og vises af sig selv om lidt.');
  });
});

test('grupper i listen, koden ikke kender, forsvinder ikke i stilhed: uden service worker beder teksten om at genindlæse', async () => {
  assert.equal(await ukendtGruppeLinje(), 'Listen har grupper, denne udgave ikke kender (ukendt-gruppe). Genindlæs siden.');
});

// ---------- En ny udgave (v13) ----------
// sw.js tager over (skipWaiting og clients.claim), men den åbne side kører den gamle kode, til den genindlæses. Det gør
// app.js selv, men kun på børnenes forside. Den falske service worker: controller (styret eller ej), ready med en
// registrering, der tæller update(), skift(), der sender controllerchange, som når en ny udgave tager over, og
// nyInstallation(), der sender updatefound med en ny arbejder i reg.installing (til(tilstand) sender dens statechange)

function falskSW(styret) {
  const lyttere = [];
  const fundet = [];
  const reg = {
    installing: null,
    // sw.afvis: sw.js kan ikke hentes (som browserens TypeError, når serveren ikke svarer, eller svaret ikke er sw.js)
    update: async () => {
      sw.opdateringer++;
      if (sw.afvis) throw new TypeError('Failed to update a ServiceWorker');
    },
    addEventListener: (type, fn) => { if (type === 'updatefound') fundet.push(fn); },
  };
  const sw = {
    controller: styret ? { udgave: 'gammel' } : null,
    opdateringer: 0,
    ready: Promise.resolve(reg),
    addEventListener: (type, fn) => { if (type === 'controllerchange') lyttere.push(fn); },
    register: async () => reg,
    skift() {
      sw.controller = { udgave: 'ny' };
      for (const fn of lyttere) fn();
    },
    nyInstallation() {
      const statLyttere = [];
      const arbejder = {
        state: 'installing',
        addEventListener: (type, fn) => { if (type === 'statechange') statLyttere.push(fn); },
        til(tilstand) {
          arbejder.state = tilstand;
          if (reg.installing === arbejder) reg.installing = null;
          for (const fn of statLyttere) fn();
        },
      };
      reg.installing = arbejder;
      for (const fn of fundet) fn();
      return arbejder;
    },
  };
  return sw;
}

// Kører fn med en falsk service worker. Lytterne på document fanges, så visibilitychange kan sendes, og
// location.reload tælles. setTimeout går på et falsk ur (gaa(ms) lader tiden gå), så genindlæsningens nødudgang (10 s)
// ikke kører senere i en anden test. Bagefter er alt som før, så de andre tests kører uden service worker
async function medSW(styret, fn) {
  const sw = falskSW(styret);
  const dokLyttere = {};
  const dokLyt = document.addEventListener;
  let genindlaest = 0;
  navigator.serviceWorker = sw;
  document.addEventListener = (type, f) => { (dokLyttere[type] ??= []).push(f); };
  lokation.reload = () => { genindlaest++; };
  try {
    await medUr((gaa) => fn({
      sw,
      gaa,
      genindlaest: () => genindlaest,
      // window's load: app.js registrerer sw.js
      indlaest: async () => { for (const f of vinduesLyttere.load || []) f(); await ventPaaHentning(); },
      // Appen kommer frem igen (eller skjules)
      synlighed: async (tilstand) => {
        document.visibilityState = tilstand;
        for (const f of dokLyttere.visibilitychange || []) f();
        await ventPaaHentning();
      },
      // En tast på tastaturet (keydown på document), efter spærren mod dobbelttryk er løbet ud
      tast: (key) => {
        ur += 1000;
        const e = { type: 'keydown', key, repeat: false, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false,
          preventDefault() { e.defaultPrevented = true; } };
        for (const f of dokLyttere.keydown || []) f(e);
        return e;
      },
    }));
  } finally {
    delete navigator.serviceWorker;
    document.addEventListener = dokLyt;
    document.visibilityState = 'visible';
    delete lokation.reload;
  }
}

// Falsk ur til setTimeout og clearTimeout, mens fn kører: gaa(ms) lader tiden gå og kører de timere, der er nået, i
// rækkefølge. Bagefter er de rigtige tilbage
async function medUr(fn) {
  const rigtige = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const timere = new Map();
  let nu = 0;
  let naesteId = 1;
  globalThis.setTimeout = (f, ms = 0, ...arg) => { timere.set(naesteId, { tid: nu + ms, f: () => f(...arg) }); return naesteId++; };
  globalThis.clearTimeout = (id) => { timere.delete(id); };
  const gaa = (ms) => {
    const slut = nu + ms;
    for (;;) {
      const naeste = [...timere].filter(([, t]) => t.tid <= slut).sort((a, b) => a[1].tid - b[1].tid || a[0] - b[0])[0];
      if (!naeste) break;
      timere.delete(naeste[0]);
      nu = naeste[1].tid;
      naeste[1].f();
    }
    nu = slut;
  };
  try {
    await fn(gaa);
  } finally {
    Object.assign(globalThis, rigtige);
  }
}

// En timer på kødsovsens trin 8 i lageret, der slutter kl. slut (Date.now()-tid). Til start({ foer }): Timer.gendan
// genskaber den, før forsiden vises første gang
const gemtTimer = (slut) => () => {
  lageret.set('kog-v1', JSON.stringify({ v: 1, sidste: null, timer: { ret: 'koedsovs', nr: 8, start: slut - 1200000, slut, sek: 1200 } }));
};
// Venter i rigtig tid (højst ms), til fn() er sand. Date.now og performance.now kan være falske, så uret er hrtime
async function ventTil(fn, ms = 3000) {
  const frist = process.hrtime.bigint() + BigInt(ms) * 1000000n;
  while (!fn()) {
    if (process.hrtime.bigint() > frist) throw new Error('ventTil: ikke sket inden for ' + ms + ' ms');
    await new Promise(setImmediate);
  }
}

test('en ny udgave: første installation (siden var ikke styret) genindlæser ikke', async () => {
  await medSW(false, async ({ sw, genindlaest }) => {
    await start('#/');
    sw.skift();
    assert.equal(genindlaest(), 0);
    // Først den næste nye udgave er ny for siden
    sw.skift();
    assert.equal(genindlaest(), 1);
  });
});

test('en ny udgave: på børnenes forside genindlæses med det samme, og kun én gang', async () => {
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/');
    assert.equal(genindlaest(), 0, 'ingen genindlæsning uden en ny udgave');
    sw.skift();
    assert.equal(genindlaest(), 1);
    // location.reload() er ikke øjeblikkelig: et nyt skift eller en ny visning af forsiden imens giver ikke en til
    sw.skift();
    gaaTil('#/gruppe/fisk');
    gaaTil('#/');
    assert.equal(genindlaest(), 1);
  });
});

test('en ny udgave: midt i en ret står skærmen stille, til børnenes forside vises', async () => {
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/ret/koedsovs/trin/2');
    const foer = overskrift();
    sw.skift();
    assert.equal(genindlaest(), 0);
    assert.equal(location.hash, '#/ret/koedsovs/trin/2');
    assert.equal(overskrift(), foer);
    // Resten af retten, gruppen, lupen, børnenes valg og indkøbslisten er ikke børnenes forside
    for (const hash of ['#/ret/koedsovs/trin/3', '#/ret/koedsovs/faerdig', '#/ret/koedsovs', '#/gruppe/fisk', '#/soeg', '#/uge/vaelg', '#/indkoeb']) {
      gaaTil(hash);
      assert.equal(genindlaest(), 0, hash);
    }
    gaaTil('#/');
    assert.equal(genindlaest(), 1);
    assert.equal(location.hash, '#/');
  });
});

// Code review L2 (19-11): location.reload() er ikke øjeblikkelig. Imens står den gamle skærm (vis() tegner ikke forsiden,
// når den genindlæses), og den må ikke kunne trykkes på
test('en ny udgave: den gamle skærm kan ikke trykkes på, mens siden genindlæses', async () => {
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/ret/koedsovs/trin/2');
    sw.skift();
    assert.ok(!rod.inert, 'midt i retten kan barnet trykke videre');
    gaaTil('#/');
    assert.equal(genindlaest(), 1);
    assert.equal(rod.inert, true);
  });
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/');
    sw.skift();
    assert.equal(genindlaest(), 1);
    assert.equal(rod.inert, true, 'også på forsiden');
  });
});

// v13-review (19-11): rod.inert stopper tryk, men ikke tastaturlytteren på document. Den gamle trinskærms piletaster
// skiftede adressen, mens siden genindlæste. Og sker genindlæsningen aldrig, stod skærmen låst: efter 10 s kan den bruges
// igen, forsiden tegnes uden en ny genindlæsning, og næste forsøg er, når appen kommer frem igen
test('en ny udgave: tastaturet skifter ikke adresse under genindlæsningen, og efter 10 s uden genindlæsning virker skærmen igen', async () => {
  await medSW(true, async ({ sw, gaa, genindlaest, indlaest, synlighed, tast }) => {
    await start('#/ret/koedsovs/trin/2');
    await indlaest();
    sw.skift();
    gaaTil('#/');
    assert.equal(genindlaest(), 1);
    // Trinskærmens tastatur tager piletasterne og mellemrum (preventDefault): her når tasten den ikke
    for (const key of ['ArrowLeft', 'ArrowRight', ' ']) {
      assert.equal(tast(key).defaultPrevented, false, JSON.stringify(key) + ' må ikke nå trinskærmen');
      assert.equal(location.hash, '#/', JSON.stringify(key) + ' under genindlæsningen');
    }
    assert.equal(knapper().length, 0, 'forsiden tegnes ikke, mens siden genindlæses');
    gaa(9999);
    assert.equal(rod.inert, true, 'efter 9,999 s er skærmen stadig låst');
    gaa(1);
    assert.equal(rod.inert, false, 'efter 10 s kan skærmen bruges igen');
    assert.ok(knapper().length > 0, 'forsiden er tegnet');
    assert.equal(genindlaest(), 1, 'ingen ny genindlæsning med det samme');
    gaaTil('#/gruppe/fisk');
    gaaTil('#/');
    assert.equal(genindlaest(), 1, 'heller ikke, når forsiden vises igen');
    await synlighed('visible');
    assert.equal(genindlaest(), 2, 'næste forsøg, når appen kommer frem igen');
    assert.equal(rod.inert, true);
  });
});

test('en ny udgave: voksendelen og dens gamle adresser genindlæses ikke', async () => {
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/voksen');
    sw.skift();
    assert.equal(genindlaest(), 0);
    // #/uge skiftes til #/voksen (history.replaceState), og #/voksen/mere er en af voksendelens sider
    for (const hash of ['#/voksen/mere', '#/uge', '#/voksen/dag/3']) {
      gaaTil(hash);
      assert.equal(genindlaest(), 0, hash);
    }
    gaaTil('#/');
    assert.equal(genindlaest(), 1);
  });
});

test('en ny udgave: forsiden genindlæses ikke, mens der er en timer, heller ikke en færdig, men gerne efter «Stop» eller «Ok»', async () => {
  const Timer = await import('../js/timer.js');
  try {
    await medSW(true, async ({ sw, genindlaest }) => {
      // Timer.gendan genskaber timeren, før forsiden vises første gang
      await start('#/', { foer: gemtTimer(Date.now() + 600000) });
      assert.ok(Timer.aktuel() && !Timer.aktuel().faerdig, 'timeren kører');
      sw.skift();
      assert.equal(genindlaest(), 0, 'alarmens lyd kræver et nyt tryk efter en genindlæsning');
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 0);
      Timer.stop();
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 1);
    });
    // Tiden er gået: alarmen ringer, til nogen trykker «Ok» (stop), og den må ikke dø i en genindlæsning (v13-review d,
    // 20-11: før genindlæste controllerchange med en færdig timer). Timeren står stadig i lageret. Efter «Ok» genindlæses
    // forsiden, næste gang den vises
    await medSW(true, async ({ sw, genindlaest }) => {
      await start('#/', { foer: gemtTimer(Date.now() - 60000) });
      assert.ok(Timer.aktuel() && Timer.aktuel().faerdig, 'timeren er færdig');
      sw.skift();
      assert.equal(genindlaest(), 0, 'alarmen må ikke afbrydes af en genindlæsning');
      assert.equal(JSON.parse(lageret.get('kog-v1')).timer.nr, 8, 'den færdige timer står stadig i lageret');
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 0, 'heller ikke, når forsiden vises igen');
      Timer.stop();
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 1, 'efter «Ok» genindlæses forsiden');
    });
  } finally {
    Timer.stop();
  }
});

// Code review 2, LAV (v14): en færdig timer, som ingen kvitterer for, holdt appen på den gamle udgave for altid. Alarmen
// (to bip, 4 s imellem) er slut længe før, så genindlæsningen venter kun 60 s efter, at timeren blev færdig. Den færdige
// timer står stadig i lageret, så «Tiden er gået» kommer igen efter genindlæsningen (Timer.gendan, op til 2 timer)
test('en ny udgave: en færdig timer, som ingen kvitterer for, holder kun genindlæsningen tilbage i 60 s', async () => {
  const Timer = await import('../js/timer.js');
  const rigtigNu = Date.now;
  try {
    await medSW(true, async ({ sw, genindlaest, indlaest, synlighed }) => {
      const slut = Date.now() + 600000;
      await start('#/', { foer: gemtTimer(slut) });
      await indlaest();
      await synlighed('hidden');
      const faerdig = slut + 1000;
      Date.now = () => faerdig;
      await ventTil(() => Timer.aktuel()?.faerdig === true);
      await synlighed('visible');
      sw.skift();
      assert.equal(genindlaest(), 0, 'alarmen må ikke afbrydes af en genindlæsning');
      Date.now = () => faerdig + 59999;
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      await synlighed('visible');
      assert.equal(genindlaest(), 0, 'efter 59,999 s venter genindlæsningen stadig');
      Date.now = () => faerdig + 60000;
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 1, 'efter 60 s genindlæses forsiden, selvom ingen har trykket «Ok»');
      assert.equal(JSON.parse(lageret.get('kog-v1')).timer.nr, 8, 'den færdige timer står stadig i lageret');
    });
  } finally {
    Date.now = rigtigNu;
    Timer.stop();
  }
});

// Code review L1 (19-11): den nye udgave tog over, mens en timer kørte, og barnet blev på forsiden. Når timeren er stoppet,
// og appen kommer frem igen, genindlæses forsiden (før skete der intet, før barnet forlod forsiden og kom tilbage)
test('en ny udgave: forsiden genindlæses, når appen kommer frem igen efter en stoppet timer', async () => {
  const Timer = await import('../js/timer.js');
  try {
    await medSW(true, async ({ sw, genindlaest, indlaest, synlighed }) => {
      await start('#/', { foer: gemtTimer(Date.now() + 600000) });
      await indlaest();
      sw.skift();
      await synlighed('visible');
      assert.equal(genindlaest(), 0, 'timeren kører stadig');
      Timer.stop();
      await synlighed('hidden');
      assert.equal(genindlaest(), 0, 'ikke når appen skjules');
      await synlighed('visible');
      assert.equal(genindlaest(), 1);
      assert.equal(location.hash, '#/');
    });
  } finally {
    Timer.stop();
  }
});

// v13-review (19-11): appen kommer frem, og tiden er gået imens. Timerens egen visibilitychange (eller dens tik hvert 250 ms)
// gør den færdig og starter alarmen, og så genindlæste kommerFrem til den nye udgave: alarmen døde, før barnet hørte den.
// Nu genindlæses der ikke, når appen kommer frem, så længe der er en timer, også en færdig, til nogen trykker «Ok» (stop)
test('en ny udgave: appen genindlæser ikke, når den kommer frem med en timer, der lige er blevet færdig', async () => {
  const Timer = await import('../js/timer.js');
  const rigtigNu = Date.now;
  try {
    await medSW(true, async ({ sw, genindlaest, indlaest, synlighed }) => {
      const slut = Date.now() + 600000;
      await start('#/', { foer: gemtTimer(slut) });
      await indlaest();
      sw.skift();
      assert.equal(genindlaest(), 0, 'timeren kører');
      await synlighed('hidden');
      Date.now = () => slut + 1000;
      await ventTil(() => Timer.aktuel()?.faerdig === true);
      await synlighed('visible');
      assert.equal(genindlaest(), 0, 'alarmen må ikke afbrydes af en genindlæsning');
      Timer.stop();
      await synlighed('hidden');
      assert.equal(genindlaest(), 0, 'ikke når appen skjules');
      await synlighed('visible');
      assert.equal(genindlaest(), 1, 'efter «Ok» genindlæses forsiden, næste gang appen kommer frem');
    });
  } finally {
    Date.now = rigtigNu;
    Timer.stop();
  }
});

// Code review M2 (v13b, 20-11, rækkefølgen d1): den almindelige rækkefølge er omvendt. Appen kommer frem med en timer, der
// lige er blevet færdig, og kommerFrem spørger selv efter en ny sw.js (reg.update). Installationen tager kun få sekunder
// (2 filer), og så tager den nye udgave over (controllerchange), mens alarmen ringer. Før genindlæste controllerchange
// med en færdig timer, og alarmen døde. Reglen står nu ét sted (genindlaesTilNyUdgave): ingen genindlæsning, så længe der
// er en timer, også en færdig. Efter «Ok» (stop) og forsiden genindlæses den
test('en ny udgave: tager den over, efter at appen er kommet frem med en lige færdig timer, genindlæses der først efter «Ok»', async () => {
  const Timer = await import('../js/timer.js');
  const rigtigNu = Date.now;
  try {
    await medSW(true, async ({ sw, gaa, genindlaest, indlaest, synlighed }) => {
      const slut = Date.now() + 600000;
      await start('#/', { foer: gemtTimer(slut) });
      await indlaest();
      await synlighed('hidden');
      Date.now = () => slut + 1000;
      await ventTil(() => Timer.aktuel()?.faerdig === true);
      await synlighed('visible');
      assert.equal(sw.opdateringer, 1, 'kommerFrem spørger efter en ny sw.js');
      assert.equal(genindlaest(), 0);
      gaa(1000);
      sw.skift(); // installationen, kommerFrem startede, er færdig ca. 1 s senere
      assert.equal(genindlaest(), 0, 'alarmen må ikke afbrydes af en genindlæsning');
      assert.equal(Timer.aktuel()?.faerdig, true, 'alarmen ringer stadig');
      Timer.stop();
      gaaTil('#/gruppe/fisk');
      gaaTil('#/');
      assert.equal(genindlaest(), 1, 'efter «Ok» og forsiden genindlæses den');
    });
  } finally {
    Date.now = rigtigNu;
    Timer.stop();
  }
});

test('en ny udgave: appen spørger efter en ny sw.js, når den kommer frem igen, men først når register er lykkedes', async () => {
  await medSW(true, async ({ sw, indlaest, synlighed }) => {
    await start('#/');
    await synlighed('visible');
    assert.equal(sw.opdateringer, 0, 'før load er der ingen registrering');
    await indlaest();
    await synlighed('visible');
    assert.equal(sw.opdateringer, 1);
    await synlighed('hidden');
    assert.equal(sw.opdateringer, 1, 'ikke når appen skjules');
    await synlighed('visible');
    assert.equal(sw.opdateringer, 2);
  });
});

// Code review L3 (19-11): pageshow er en ekstra udløser med samme funktion som visibilitychange. En side, der kommer
// tilbage fra browserens bfcache (persisted), spørger efter en ny sw.js og genindlæses til en ny udgave, der har taget
// over. Den første pageshow (siden er lige indlæst) gør intet. Hvad iOS sender, når en app på hjemmeskærmen hentes frem,
// er ikke afprøvet på iPhone/iPad
test('en ny udgave: pageshow fra bfcache spørger efter en ny sw.js og genindlæser som visibilitychange', async () => {
  const pageshow = (persisted) => { for (const f of vinduesLyttere.pageshow || []) f({ type: 'pageshow', persisted }); };
  await medSW(true, async ({ sw, genindlaest, indlaest }) => {
    await start('#/');
    await indlaest();
    pageshow(false);
    assert.equal(sw.opdateringer, 0, 'den første pageshow');
    pageshow(true);
    assert.equal(sw.opdateringer, 1);
    assert.equal(genindlaest(), 0);
  });
  const Timer = await import('../js/timer.js');
  try {
    await medSW(true, async ({ sw, genindlaest, indlaest }) => {
      await start('#/', { foer: gemtTimer(Date.now() + 600000) });
      await indlaest();
      sw.skift();
      Timer.stop();
      pageshow(true);
      assert.equal(genindlaest(), 1);
    });
  } finally {
    Timer.stop();
  }
});

test('en ny udgave: ukendte grupper på forsiden spørger efter den nye udgave, højst én gang pr. sideindlæsning', async () => {
  await medSW(true, async ({ sw, genindlaest }) => {
    await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? MED_UKENDT_GRUPPE : undefined) });
    assert.equal(sw.opdateringer, 1);
    gaaTil('#/gruppe/fisk');
    gaaTil('#/');
    await ventPaaHentning();
    assert.equal(sw.opdateringer, 1);
    // Når den nye udgave tager over, genindlæses forsiden, og den nye kode kender grupperne
    sw.skift();
    assert.equal(genindlaest(), 1);
  });
  // Uden ukendte grupper spørges der ikke
  await medSW(true, async ({ sw }) => {
    await start('#/');
    assert.equal(sw.opdateringer, 0);
  });
});

// Code review M1 (19-11): reg.update() er løst, så snart sw.js er hentet, så en installation, der fejler (en fil mangler,
// nettet falder ud midt i de 719 filer), kunne ikke ses, og forsiden viste den gamle udgave for altid. Nu siger forsidens
// versionslinje det til den voksne. Uden net er det ventet, så dér er linjen tavs
// Fejlteksten har sin egen linje under versionsnummeret (.udgave-fejl er display: block; UI-review LAV, v13b), så den står
// uden « · » foran og med stort forbogstav, og textContent er de to linjer uden noget imellem
const VERSIONSLINJE = 'Version ' + UDGAVE;
const FEJL_LINJE = /^Ny udgave kunne ikke hentes kl\.\u00a0([01]\d|2[0-3]):[0-5]\d$/;
const FEJL_I_FODEN = new RegExp('^' + VERSIONSLINJE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + FEJL_LINJE.source.slice(1));
const fod = () => rod.querySelector('.forside-version').textContent;

test('en ny udgave, der ikke kan installeres: versionslinjen siger det, siden står stille, og næste forsøg fjerner teksten', async () => {
  await medSW(true, async ({ sw, genindlaest, indlaest }) => {
    await start('#/');
    await indlaest();
    assert.equal(fod(), VERSIONSLINJE);
    sw.nyInstallation().til('redundant');
    assert.match(fod(), FEJL_I_FODEN);
    assert.match(rod.querySelector('.forside-version .udgave-fejl').textContent, FEJL_LINJE, 'fejlteksten står for sig i sin egen linje');
    assert.equal(genindlaest(), 0, 'den gamle udgave kører videre');
    // Den står der stadig, når forsiden vises igen
    gaaTil('#/gruppe/fisk');
    gaaTil('#/');
    assert.match(fod(), FEJL_I_FODEN);
    // Næste forsøg lykkes: teksten forsvinder, og den nye udgave tager over som før
    const ny = sw.nyInstallation();
    ny.til('installed');
    assert.equal(fod(), VERSIONSLINJE);
    ny.til('activating');
    ny.til('activated');
    sw.skift();
    assert.equal(genindlaest(), 1);
  });
});

test('en ny udgave, der ikke kan installeres midt i en ret: skærmen står stille, og forsiden siger det bagefter', async () => {
  await medSW(true, async ({ sw, genindlaest, indlaest }) => {
    await start('#/ret/koedsovs/trin/2');
    await indlaest();
    const foer = overskrift();
    sw.nyInstallation().til('redundant');
    assert.equal(overskrift(), foer);
    assert.equal(location.hash, '#/ret/koedsovs/trin/2');
    gaaTil('#/');
    assert.match(fod(), FEJL_I_FODEN);
    assert.equal(genindlaest(), 0);
  });
});

test('en ny udgave, der ikke kan installeres: også når installationen var i gang, før register blev løst', async () => {
  await medSW(true, async ({ sw, indlaest }) => {
    await start('#/');
    const ny = sw.nyInstallation(); // updatefound, før appen lytter
    await indlaest();
    ny.til('redundant');
    assert.match(fod(), FEJL_I_FODEN);
  });
});

test('en ny udgave, der ikke kan installeres: tavs uden net, ved første installation og når en installeret udgave afløses', async () => {
  await medSW(true, async ({ sw, indlaest }) => {
    await start('#/');
    await indlaest();
    navigator.onLine = false;
    try {
      sw.nyInstallation().til('redundant');
    } finally {
      navigator.onLine = true;
    }
    assert.equal(fod(), VERSIONSLINJE, 'uden net');
  });
  // Første installation: siden er ikke styret og har allerede den nyeste kode
  await medSW(false, async ({ sw, indlaest }) => {
    await start('#/');
    await indlaest();
    sw.nyInstallation().til('redundant');
    assert.equal(fod(), VERSIONSLINJE, 'første installation');
  });
  // En udgave, der blev installeret og senere afløses af en nyere, er ikke en fejl
  await medSW(true, async ({ sw, indlaest }) => {
    await start('#/');
    await indlaest();
    const ny = sw.nyInstallation();
    ny.til('installed');
    ny.til('activated');
    ny.til('redundant');
    assert.equal(fod(), VERSIONSLINJE, 'afløst');
  });
});

// v13-review (19-11): reg.update() afvises, når sw.js ikke kan hentes (serveren svarer ikke, eller svaret er ikke sw.js),
// og afvisningen blev slugt: den voksne så aldrig, at iPad'en ikke fik den nye udgave. Med net siger forsidens fod det nu;
// uden net er det ventet og tavst. Lykkes næste forsøg, uden at en ny udgave er på vej, er teksten forældet og går væk
test('en ny udgave, der ikke kan hentes: afviser reg.update() med net, siger foden det; uden net er den tavs', async () => {
  try {
    await medSW(true, async ({ sw, genindlaest, indlaest, synlighed }) => {
      await start('#/');
      await indlaest();
      sw.afvis = true;
      navigator.onLine = false;
      await synlighed('visible');
      assert.equal(sw.opdateringer, 1);
      assert.equal(fod(), VERSIONSLINJE, 'uden net');
      navigator.onLine = true;
      await synlighed('visible');
      assert.equal(sw.opdateringer, 2);
      assert.match(fod(), FEJL_I_FODEN);
      assert.equal(genindlaest(), 0, 'den gamle udgave kører videre');
      sw.afvis = false;
      await synlighed('visible');
      assert.equal(fod(), VERSIONSLINJE, 'næste forsøg lykkes, og ingen ny udgave er på vej');
    });
    // Forsidens ukendte grupper spørger også efter den nye udgave (tjekNyUdgave): samme fod
    await medSW(true, async ({ sw }) => {
      sw.afvis = true;
      await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? MED_UKENDT_GRUPPE : undefined) });
      assert.equal(sw.opdateringer, 1);
      assert.match(fod(), FEJL_I_FODEN);
    });
  } finally {
    navigator.onLine = true;
  }
});

test('Madpakke har 8. pladsen (efter Gris og Ko), og uden for index.json har den ingen knap', async () => {
  await start();
  assert.deepEqual(knapper().map((b) => b.dataset.gruppe), GRUPPE_IDS);
  assert.equal(knapper()[7].getAttribute('aria-label'), 'Madpakke');
  const grupper = INDEX.grupper.filter((g) => g.id !== 'madpakke');
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? { version: 2, grupper } : undefined) });
  assert.deepEqual(knapper().map((b) => b.dataset.gruppe), GRUPPE_IDS.filter((id) => id !== 'madpakke'));
});

test('en gruppe, der er tom i listen, har ingen knap, og adressen til den giver fejlskærmen', async () => {
  const ny = { version: 2, grupper: INDEX.grupper.map((g) => (g.id === 'fisk' ? { id: 'fisk', retter: [] } : g)) };
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? ny : undefined) });
  assert.deepEqual(knapper().map((b) => b.dataset.gruppe), KNAPPER.filter((x) => x !== 'fisk'));
  gaaTil('#/gruppe/fisk');
  assert.equal(overskrift(), 'Den gruppe findes ikke');
});

test('listen kan ikke hentes: forsiden, gruppen og søgningen fortæller det og kan prøve igen', async () => {
  for (const hash of ['#/', '#/gruppe/fisk', '#/soeg']) {
    await start(hash, { hent: (sti) => (sti === 'opskrifter/index.json' ? HENT_FEJL_TEST : undefined) });
    assert.match(rod.textContent, /Opskrifterne kunne ikke hentes/, hash);
    assert.equal(knapper().length, 0);
    hentFra = null;
    tryk(knapMedTekst('Prøv igen'));
    await ventPaaHentning();
    assert.doesNotMatch(rod.textContent, /kunne ikke hentes/, hash);
    assert.equal(location.hash, hash);
  }
});

test('en tom liste: ingen knapper, ingen lup, og en vej til at hente igen', async () => {
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? { version: 2, grupper: [] } : undefined) });
  assert.match(rod.textContent, /Der er ingen opskrifter endnu/);
  assert.equal(knapper().length, 0);
  assert.equal(rod.querySelector('.forside-lup'), null);
});

test('en ret, der ikke kan læses, nævnes på gruppen og forsiden, og resten vises', async () => {
  const dårlig = retterI('fisk')[0];
  await start('#/gruppe/fisk', { hent: (sti) => (sti === 'opskrifter/' + dårlig + '.json' ? new Error('net') : undefined) });
  assert.deepEqual(kort(), retterI('fisk').slice(1));
  assert.match(rod.querySelector('.fejl-linje').textContent, new RegExp(dårlig));
  gaaTil('#/');
  assert.match(rod.querySelector('.fejl-linje').textContent, new RegExp(dårlig));
  assert.equal(knapper().length, 12);
});

test('intet nyt gemmes: forsiden, grupperne, lupen og retterne skriver ikke i lageret', async () => {
  await start();
  tryk(knapper()[2]);
  tryk(knapMed('Til forsiden'));
  tryk(knapMed('Søg efter en ret'));
  skriv(rod.querySelector('.soeg-felt'), 'kylling');
  tryk(knapMed('Til forsiden'));
  gaaTil('#/gruppe/' + FAVORITTER);
  gaaTil('#/gruppe/fisk');
  const id = kort()[0];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  tryk(k());
  assert.equal(location.hash, '#/ret/' + id);
  tryk(knapMed('Tilbage'));
  assert.deepEqual(skrivninger, []);
  assert.equal(lageret.size, 0);
});

test('en lås på familien (nyere udgave) giver hverken fejl på forsiden eller mistede favoritter', async () => {
  const gemt = JSON.stringify({ v: 999, favoritter: ['noget-nyt'] });
  await start('#/', { foer: () => { lageret.set('kog-familie-v1', gemt); } });
  assert.equal(knapper().length, 12);
  assert.equal(rod.querySelector('.forside-favoritter'), null);
  assert.equal(lageret.get('kog-familie-v1'), gemt, 'en nyere udgaves data er urørt');
});

test('favoritterne med en låst familie: skærmen siger, at de ikke kan vises, og data er urørt', async () => {
  const gemt = JSON.stringify({ v: 999, favoritter: ['koedsovs'] });
  await start('#/gruppe/' + FAVORITTER, { foer: () => { lageret.set('kog-familie-v1', gemt); } });
  assert.equal(overskrift(), 'Favoritterne kan ikke vises');
  assert.equal(rod.querySelector('.status-boks p').textContent, 'De er gemt af en nyere udgave. Genindlæs siden.');
  assert.deepEqual(skrivninger, []);
  tryk(knapMedTekst('Til forsiden'));
  assert.equal(location.hash, '#/');
  assert.equal(lageret.get('kog-familie-v1'), gemt, 'en nyere udgaves data er urørt');
});

// En app på hjemmeskærmen har ingen genindlæs-knap, så teksten «Genindlæs siden» var en blindgyde uden knappen her
test('favoritterne med en låst familie: «Genindlæs siden» genindlæser, og adressen og data er urørt', async () => {
  const gemt = JSON.stringify({ v: 999, favoritter: ['koedsovs'] });
  let genindlaest = 0;
  lokation.reload = () => { genindlaest++; };
  try {
    await start('#/gruppe/' + FAVORITTER, { foer: () => { lageret.set('kog-familie-v1', gemt); } });
    const b = knapMedTekst('Genindlæs siden');
    assert.ok(b, 'knappen findes');
    assert.ok(b.classList.contains('primaer'), 'mindst 48 px: test-css.js måler .knap.primaer');
    assert.equal(genindlaest, 0, 'først, når der trykkes');
    tryk(b);
    assert.equal(genindlaest, 1);
    assert.equal(location.hash, '#/gruppe/' + FAVORITTER);
    assert.deepEqual(skrivninger, []);
    assert.equal(lageret.get('kog-familie-v1'), gemt, 'en nyere udgaves data er urørt');
    assert.ok(knapMedTekst('Til forsiden'), 'vejen til forsiden er der stadig');
  } finally {
    delete lokation.reload;
  }
});

// ---------- Blandingen: det, der vælges og vises først ----------
// index.json står efter gruppe, og de 23 pastaretter står først. Uden blandingen var de 20 første retter i planen pasta

const gruppeNavne = (ids) => ids.map((id) => gruppeAf(id, INDEX.grupper));

// Et hold på 2 s, som fingeren gør det: requestAnimationFrame kører kun, når testen siger til (holdet læser uret)
const holdInde = (b) => {
  assert.ok(b, 'holdknappen findes ikke');
  const gammel = globalThis.requestAnimationFrame;
  let tegn = null;
  globalThis.requestAnimationFrame = (fn) => { tegn = fn; return 1; };
  try {
    for (const fn of b.lyt.pointerdown) fn({ pointerType: 'touch', button: 0 });
    ur += 2500;
    tegn();
  } finally {
    globalThis.requestAnimationFrame = gammel;
  }
};

// Børnenes valg: alle sider, som barnet bladrer i dem
const alleSider = () => {
  const sider = [rod.querySelectorAll('.ret-kort').map((b) => b.dataset.ret)];
  while (!knapMed('Flere retter').disabled) {
    tryk(knapMed('Flere retter'));
    sider.push(rod.querySelectorAll('.ret-kort').map((b) => b.dataset.ret));
    assert.ok(sider.length <= UGE.length, 'børnenes valg bliver ved med at have flere sider');
  }
  return sider;
};

// Uden udvalg (fase 1 b i docs/fable-foraeldrekogebog-2026-11-10.md): favoritterne og nye retter, højst 12 på 3 sider,
// ikke alle 92. Reglen selv prøves i test-udvalg.js
test('børnenes valg uden udvalg: 12 nye retter på 3 sider, første side blander grupperne, og kun retter til ugeplanen', async () => {
  await start('#/uge/vaelg/rosa');
  const sider = alleSider();
  assert.equal(sider.length, 3);
  assert.equal(sider[0].length, 4);
  assert.equal(new Set(gruppeNavne(sider[0])).size, 4, 'side 1 har: ' + gruppeNavne(sider[0]).join(', '));
  assert.deepEqual(sider.flat(), blandet(UGE, INDEX.grupper, (x) => x).slice(0, 12));
  assert.deepEqual(skrivninger, [], 'at bladre gemmer intet');
});

test('børnenes valg uden udvalg: hjerterne står først, og så nye retter, til der er 12', async () => {
  const fav = [retterI('fisk').find((id) => UGE.includes(id)), retterI('ko').find((id) => UGE.includes(id))];
  const ikkeIPlanen = INDEX.grupper.flatMap((g) => g.retter).find((id) => !UGE.includes(id)); // en kage: aldrig med
  // Bo: Rosa og Pip huskes fra testene før (barn i js/ugeplan.js)
  await start('#/uge/vaelg/bo', { foer: () => { for (const id of [...fav, ikkeIPlanen]) Lager.skiftFavorit(id, FILER); } });
  const vist = alleSider().flat();
  assert.equal(vist.length, 12);
  assert.deepEqual(vist.slice(0, 2), fav);
  assert.ok(!vist.includes(ikkeIPlanen), ikkeIPlanen + ' er ikke en ret til ugeplanen');
  assert.deepEqual(vist.slice(2), blandet(UGE.filter((id) => !fav.includes(id)), INDEX.grupper, (x) => x).slice(0, 10));
});

test('børnenes valg med et udvalg: kun udvalgets retter, blandet, og det gemte udvalg er urørt', async () => {
  // De 4 første pastaretter og de 4 sidste fiskeretter: blandes der før udvalgsfilteret, står hele pastaen før al fisken
  const ids = [...retterI('pasta-og-nudler').filter((id) => UGE.includes(id)).slice(0, 4), ...retterI('fisk').filter((id) => UGE.includes(id)).slice(-4)];
  let gemt = null;
  // Pip: valget undervejs (barn i js/ugeplan.js) huskes i modulet, så Rosa ville starte på den side, testen før sluttede på
  await start('#/uge/vaelg/pip', { foer: () => { Lager.gemFamilie({ udvalg: { ids, rettet: '2026-11-05' } }, FILER); gemt = lageret.get('kog-familie-v1'); } });
  const sider = alleSider();
  const vist = sider.flat();
  assert.deepEqual([...vist].sort(), [...ids].sort());
  assert.equal(sider.length, 2);
  for (const side of sider) assert.deepEqual(gruppeNavne(side), ['pasta-og-nudler', 'fisk', 'pasta-og-nudler', 'fisk']);
  assert.equal(lageret.get('kog-familie-v1'), gemt, 'det gemte udvalg har samme rækkefølge som før');
  assert.deepEqual(skrivninger, []);
});

test('«Fyld op med nye» på den rigtige skærm: blander grupperne, kun retter til ugeplanen, og de gamle står først', async () => {
  await start('#/voksen/udvalg');
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    const fyld = () => {
      tryk(rod.querySelector('[data-fokus="fyld-op"]'));
      return JSON.parse(lageret.get('kog-familie-v1')).udvalg.ids;
    };
    const otte = fyld();
    assert.equal(otte.length, 8);
    assert.ok(new Set(gruppeNavne(otte)).size >= 3, 'fyld op gav: ' + gruppeNavne(otte).join(', '));
    assert.ok(otte.every((id) => UGE.includes(id)), 'en ret uden «uge» kom med: ' + otte.join(', '));
    const tolv = fyld();
    assert.equal(tolv.length, 12);
    assert.deepEqual(tolv.slice(0, 8), otte, 'det, der allerede er valgt, står, hvor det stod');
    assert.ok(tolv.every((id) => UGE.includes(id)));
  } finally {
    gaaTil('#/');
  }
});

test('«Fyld op med nye» springer retter over, der er lavet før, og blander stadig', async () => {
  const lavet = [UGE[0], retterI('fisk').find((id) => UGE.includes(id))];
  await start('#/voksen/udvalg', { foer: () => { for (const id of lavet) Lager.markerLavet(id, '2026-10-20', FILER); } });
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    tryk(rod.querySelector('[data-fokus="fyld-op"]'));
    const ids = JSON.parse(lageret.get('kog-familie-v1')).udvalg.ids;
    assert.equal(ids.length, 8);
    for (const id of lavet) assert.ok(!ids.includes(id), id + ' er lavet før');
    assert.ok(new Set(gruppeNavne(ids)).size >= 3, 'fyld op gav: ' + gruppeNavne(ids).join(', '));
  } finally {
    gaaTil('#/');
  }
});

test('fyldOp med den blandede liste: de 8 første har mindst 3 grupper, og kun retter til ugeplanen', async () => {
  const V = await import('../js/voksen-del.js');
  const ny = V.fyldOp([], blandet(UGE, INDEX.grupper, (x) => x), {}, { antal: V.UDVALG_STANDARD });
  assert.equal(ny.length, V.UDVALG_STANDARD);
  assert.ok(new Set(gruppeNavne(ny)).size >= 3, 'kun: ' + gruppeNavne(ny).join(', '));
  assert.ok(ny.every((id) => UGE.includes(id)));
});

// ---------- «I dag» på forsiden og låsen på ugeplanen (fase 1 a og c) ----------

// Mandagen i den uge, der er i gang (planMandag giver den næste mandag, så en plan lavet i weekenden er til næste uge)
const denneMandag = () => {
  const d = new Date();
  return idag(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
};
const dagNr = () => (new Date().getDay() + 6) % 7; // mandag 0 … søndag 6
const planMed = (uge, i, ret, af = 'rosa') => () => {
  const dage = [null, null, null, null, null, null, null];
  if (ret) dage[i] = { ret, af, n: 4 };
  assert.ok(Lager.gemUge({ uge, dage }, FILER), 'planen blev gemt');
};
const idagKort = () => rod.querySelector('.idag-kort');

test('«I dag» på forsiden: dagens ret fra ugeplanen som en knap, der åbner retten, og grupperne står der stadig', async () => {
  const id = UGE[3];
  await start('#/', { foer: planMed(denneMandag(), dagNr(), id) });
  const k = idagKort();
  assert.ok(k, 'kortet står på forsiden');
  assert.equal(k.tag, 'button');
  assert.equal(k.getAttribute('aria-label'), 'I dag laver vi ' + lavModel(JSONER.get(id)).navn.replace(/\u00AD/g, ''));
  assert.equal(k.dataset.ret, id);
  assert.equal(k.dataset.gruppe, gruppeAf(id, INDEX.grupper));
  assert.ok(k.querySelector('.idag-dyr'), 'dyret, der valgte retten');
  assert.match(k.textContent, /^I dag laver vi/);
  // Review U6 og U8 (15-11): timeren og kortet har en fælles forælder, så de kan stå i én række på langs (app.css).
  // Timeren først, så Tab og skærmlæseren tager dem i den rækkefølge, de står
  const nu = k.closest('.forside-nu');
  assert.ok(nu, 'kortet står i .forside-nu');
  assert.deepEqual(nu.born.map((x) => x.className), ['forside-timer', 'forside-idag']);
  assert.deepEqual(knapper().map((x) => x.dataset.gruppe), KNAPPER, 'de 11 grupper står der stadig');
  assert.deepEqual(skrivninger, [], 'forsiden gemmer intet');
  tryk(k);
  assert.equal(location.hash, '#/ret/' + id);
});

test('«I dag» står der ikke uden en plan, på en tom dag, med en plan til en anden uge, eller med en plan fra en nyere udgave', async () => {
  const id = UGE[3];
  const naesteMandag = planMandag() === denneMandag() ? idag(new Date(Date.now() + 7 * 864e5)) : planMandag();
  const tilfaelde = [
    ['ingen plan', null],
    ['dagen er tom', planMed(denneMandag(), (dagNr() + 1) % 7, id)],
    ['næste uge', planMed(naesteMandag, dagNr(), id)],
    ['nyere udgave', () => { lageret.set('kog-uge-v1', JSON.stringify({ v: 99, uge: denneMandag(), dage: [0, 1, 2, 3, 4, 5, 6].map(() => ({ ret: id, af: 'bo', n: 4 })) })); }],
  ];
  for (const [navn, foer] of tilfaelde) {
    await start('#/', { foer });
    assert.equal(idagKort(), null, navn);
    assert.deepEqual(knapper().map((x) => x.dataset.gruppe), KNAPPER, navn);
  }
});

// v11 (16-11): ugeplanen er voksendelens forside. Den gamle adresse #/uge (et bogmærke, et gammelt link) sendes videre til
// #/voksen med history.replaceState, og holdet åbner forsiden med ugens dage
test('ugeplanen ligger bag låsen: #/uge viser holdet, holdet åbner voksendelens forside, og indkøbslisten kræver det ikke', async () => {
  await start('#/uge');
  try {
    assert.equal(overskrift(), 'Til de voksne');
    assert.equal(location.hash, '#/voksen', 'den gamle adresse er skiftet til den nye');
    // Review R2 (15-11): også vagtens hold hedder det, man ser
    assert.match(rod.querySelector('.voksen-vagt').getAttribute('aria-label'), /^Voksne: hold\b/);
    holdInde(rod.querySelector('.voksen-vagt'));
    assert.equal(location.hash, '#/voksen');
    assert.ok(rod.querySelector('main.voksen-forside'), 'voksendelens forside efter holdet');
    assert.equal(overskrift(), 'Ugeplan');
    assert.equal(rod.querySelectorAll('.voksen-uge .voksen-dag').length, 7, 'ugens syv dage');
    assert.deepEqual(rod.querySelectorAll('.voksen-bobler button').map((b) => b.dataset.fokus), ['indkoeb', 'katalog', 'mere']);
    // En tom dag åbner vælg-tilstanden, uden et nyt hold
    tryk(rod.querySelector('[data-fokus="dag-0"]'));
    gaaTil(location.hash);
    assert.equal(location.hash, '#/voksen/dag/1');
    assert.equal(overskrift(), 'Vælg ret til mandag');
    assert.equal(rod.querySelector('.voksen-vagt'), null, 'låsen er stadig åben');
  } finally {
    gaaTil('#/');
  }
  await start('#/indkoeb');
  assert.equal(rod.querySelector('.voksen-vagt'), null, 'indkøbslisten (telefonen) har intet hold');
});

// Review U5 (15-11): kan dyret på statusskærmen ikke hentes (første besøg uden net, før service workeren har gemt det),
// viste WebKit en grå ramme med «?». Billedet får klassen «mangler» (skjult i app.css, men pladsen står)
test('statusskærmens dyr skjules, hvis billedet ikke kan hentes', async () => {
  await start('#/uge');
  try {
    const dyr = rod.querySelector('.status-dyr');
    assert.ok(dyr, 'dyret står på holdets statusskærm');
    assert.ok(!dyr.classList.contains('mangler'), 'før en fejl');
    for (const fn of dyr.lyt.error || []) fn({ type: 'error', target: dyr });
    assert.ok(dyr.classList.contains('mangler'), 'efter en fejl');
  } finally {
    gaaTil('#/');
  }
});

// Review F2 (15-11): Safari (og WebKit) springer et link over med Tab, medmindre det har tabindex. «Print» ligner en knap og
// skal kunne nås med tastaturet, også på iPad med tastaturcover
test('«Mere» → «Ugeplanen»: «Print» kan nås med Tab (tabindex="0")', async () => {
  await start('#/voksen/mere', { foer: planMed(denneMandag(), dagNr(), UGE[3]) });
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    const print = rod.querySelector('.print-link');
    assert.ok(print, '«Print» står under «Mere» med en ret i planen');
    assert.equal(print.getAttribute('tabindex'), '0');
    // Review R5 (15-11): samme printLink som voksendelen: navnet begynder med «Print» og siger, hvad der kommer på papir,
    // og fokus kommer tilbage til den, når skærmen tegnes igen
    assert.equal(print.getAttribute('aria-label'), 'Print ugeplanen og indkøbslisten');
    assert.equal(print.textContent, 'Print');
    assert.equal(print.dataset.fokus, 'print');
  } finally {
    gaaTil('#/');
  }
});

// Review R3 (15-11): ugeplanens brug af ugenErGaaet (F1). Om søndagen er planMandag() i morgen, så
// ugenErGaaet(p.uge, planMandag()) sagde «Uge N er gået», mens «I dag»-kortet viste søndagens ret
const AegteDate = Date;
const falskDag = (iso) => class extends AegteDate {
  constructor(...a) { if (a.length) super(...a); else super(iso); }
  static now() { return new AegteDate(iso).getTime(); }
};
async function ugeAdvarselDen(iso, uge) {
  globalThis.Date = falskDag(iso);
  await start('#/uge', { foer: planMed(uge, 6, UGE[3]) });
  holdInde(rod.querySelector('.voksen-vagt'));
  assert.ok(rod.querySelector('main.voksen-forside'), iso + ': voksendelens forside med ugeplanen efter holdet');
  return rod.querySelector('.uge-advarsel')?.textContent || '';
}
test('ugeplanen siger ikke «er gået» om søndagen i ugen, men gør det mandagen efter', async () => {
  try {
    const soendag = await ugeAdvarselDen('2026-11-15T12:00:00', '2026-11-09');
    assert.equal(new Date().getDay(), 0, 'den falske dag er en søndag');
    assert.doesNotMatch(soendag, /er gået/, 'søndag i uge 46: ' + soendag);
    gaaTil('#/');
    const mandag = await ugeAdvarselDen('2026-11-16T12:00:00', '2026-11-09');
    assert.match(mandag.replace(/ /g, ' '), /^Uge 46 er gået\. .*plan til uge 47\.$/);
  } finally {
    globalThis.Date = AegteDate;
    gaaTil('#/');
  }
});

// ---------- Pilen «Tilbage» fra en ret, der ikke er åbnet fra børnenes grupper ----------
// tryk() kører linkets onclick, og gaaTil() er det, browseren gør bagefter, når den følger href

const listeMed = (id, valg) => () => Lager.gemListe({
  kode: kod(planMandag(), [{ ret: id, n: 4 }, null, null, null, null, null, null], valg),
  uge: planMandag(),
  varer: [{ id: Object.keys(VARER)[0], m: 1 }],
});

for (const [hvad, valg, slutning] of [['retten', undefined, ''], ['retten med mere grønt', { mereGroent: true }, '/groen']]) {
  test('indkøbslisten: pilen fra ' + hvad + ' fører tilbage til listen på samme rulleplads', async () => {
    const id = valg ? UGE.find((x) => lavModel(JSONER.get(x)).groen) : retterI('gris').find((x) => UGE.includes(x));
    assert.ok(id, 'testen skal have en ret at åbne');
    await start('#/indkoeb', { foer: listeMed(id, valg) });
    const link = rod.querySelector('.ret-link');
    assert.equal(link.getAttribute('href'), '#/ret/' + id + slutning);
    // Review R5 (15-11): Safari springer et link uden tabindex over med Tab (som F2)
    assert.equal(link.getAttribute('tabindex'), '0');
    window.scrollY = 420;
    tryk(link);
    gaaTil(link.getAttribute('href'));
    assert.equal(location.hash, '#/ret/' + id + slutning);
    assert.equal(window.scrollY, 0, 'retten starter øverst');
    tryk(knapMed('Tilbage'));
    assert.equal(location.hash, '#/indkoeb');
    assert.equal(window.scrollY, 420);
    assert.ok(rod.querySelector('.ret-link'), 'listen er tegnet');
  });
}

test('«Åbn» i Katalog: pilen fører til voksendelens hold og derfra til Katalog på samme rulleplads', async () => {
  const V = await import('../js/voksen-del.js');
  const id = retterI('jul')[0];
  const aabn = () => rod.querySelector('[data-fokus="aabn-' + id + '"]');
  await start('#/voksen/katalog');
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    assert.ok(aabn(), 'Katalog er åbent');
    window.scrollY = 900;
    tryk(aabn());
    assert.equal(location.hash, '#/ret/' + id);
    assert.equal(window.scrollY, 0, 'retten starter øverst');
    assert.equal(V.erLaastOp(), false, 'låsen lukker, når voksendelen forlades');
    tryk(knapMed('Tilbage'));
    assert.equal(location.hash, '#/voksen/katalog');
    assert.ok(rod.querySelector('.voksen-vagt'), 'voksendelens hold, ikke Katalog');
    assert.equal(aabn(), null);
    assert.equal(window.scrollY, 0, 'holdet står øverst');
    holdInde(rod.querySelector('.voksen-vagt'));
    assert.ok(aabn(), 'Katalog efter holdet');
    assert.equal(window.scrollY, 900);
  } finally {
    gaaTil('#/');
  }
});

// Låsen glemmer søgning og filtre, når en ret åbnes. Med søgningen «kylling» er listen 20 rækker, når pladsen måles, og 222
// efter holdet, så pladsen ville lande et tilfældigt sted
for (const [navn, filtrer] of [
  ['søgetekst', () => skriv(rod.querySelector('.soeg-felt'), 'kylling')],
  ['gruppe-chip', () => tryk(rod.querySelector('[data-fokus="gruppe-kylling"]'))],
  ['gruppen Aftensmad', () => tryk(rod.querySelector('[data-fokus="gruppe-' + AFTENSMAD + '"]'))],
  ['mærke', () => tryk(rod.querySelector('[data-fokus="filter-vegetar"]'))],
]) {
  test('«Åbn» i Katalog med ' + navn + ': efter holdet er listen hel igen og starter øverst', async () => {
    const raekker = () => rod.querySelectorAll('.voksen-raekke');
    await start('#/voksen/katalog');
    try {
      holdInde(rod.querySelector('.voksen-vagt'));
      const alle = raekker().length;
      filtrer();
      assert.ok(raekker().length > 0 && raekker().length < alle, 'listen er filtreret: ' + raekker().length + ' af ' + alle);
      const id = raekker()[0].dataset.ret;
      window.scrollY = 900;
      tryk(rod.querySelector('[data-fokus="aabn-' + id + '"]'));
      assert.equal(location.hash, '#/ret/' + id);
      tryk(knapMed('Tilbage'));
      assert.equal(location.hash, '#/voksen/katalog');
      window.scrollY = 77; // så testen ser, at det er gendannelsen, der ruller op: en plads på 0 er også en plads
      holdInde(rod.querySelector('.voksen-vagt'));
      assert.equal(raekker().length, alle, 'låsen har glemt søgning og filtre');
      assert.equal(window.scrollY, 0);
    } finally {
      gaaTil('#/');
    }
  });
}

test('«Åbn» i Katalog med kun mellemrum i søgefeltet: listen er den samme, så pladsen gendannes', async () => {
  const id = retterI('jul')[0];
  await start('#/voksen/katalog');
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    skriv(rod.querySelector('.soeg-felt'), '   ');
    window.scrollY = 900;
    tryk(rod.querySelector('[data-fokus="aabn-' + id + '"]'));
    tryk(knapMed('Tilbage'));
    holdInde(rod.querySelector('.voksen-vagt'));
    assert.equal(window.scrollY, 900);
  } finally {
    gaaTil('#/');
  }
});

test('pilen til Katalog og så «Til forsiden» fra holdet: næste gang starter Katalog øverst', async () => {
  const id = retterI('jul')[0];
  await start('#/voksen/katalog');
  try {
    holdInde(rod.querySelector('.voksen-vagt'));
    window.scrollY = 900;
    tryk(rod.querySelector('[data-fokus="aabn-' + id + '"]'));
    tryk(knapMed('Tilbage'));
    tryk(knapMedTekst('Til forsiden'));
    assert.equal(location.hash, '#/');
    gaaTil('#/voksen/katalog');
    holdInde(rod.querySelector('.voksen-vagt'));
    assert.equal(window.scrollY, 0);
  } finally {
    gaaTil('#/');
  }
});

// ---------- Vejen rundt, låsen og søgningens kanter ----------
// Fra en kodegennemgang: de er grønne, og de passer på det, 5 ændringer af forsiden slap forbi uden en test

test('tilbage fra en ret gendanner rullepladsen kun første gang', async () => {
  await start('#/gruppe/kylling');
  const b = rod.querySelectorAll('.kort[data-ret]')[0];
  const id = b.dataset.ret;
  tryk(b);
  window.scrollY = 222;
  tryk(rod.querySelector('.kort.valgt'));
  assert.equal(location.hash, '#/ret/' + id);
  gaaTil('#/gruppe/kylling');
  assert.equal(window.scrollY, 222);
  gaaTil('#/gruppe/fisk');
  gaaTil('#/gruppe/kylling');
  assert.equal(window.scrollY, 0, 'anden visning starter øverst');
});

test('et valgt kort er glemt, når man har været på forsiden', async () => {
  await start('#/gruppe/fisk');
  const id = kort()[0];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  tryk(knapMed('Til forsiden'));
  tryk(knapper().find((b) => b.dataset.gruppe === 'fisk'));
  tryk(k());
  assert.equal(location.hash, '#/gruppe/fisk', 'første tryk efter hjemturen må kun sige navnet');
});

test('hjertet på forsiden forsvinder, når den sidste favorit fjernes', async () => {
  const a = retterI('fisk')[0];
  await start('#/', { foer: () => { Lager.skiftFavorit(a, FILER); } });
  assert.ok(rod.querySelector('.forside-favoritter'));
  Lager.skiftFavorit(a, FILER);
  gaaTil('#/gruppe/fisk');
  gaaTil('#/');
  assert.equal(rod.querySelector('.forside-favoritter'), null);
});

test('lupen nævner en ret, der ikke kunne læses', async () => {
  const d = retterI('fisk')[0];
  await start('#/soeg', { hent: (sti) => (sti === 'opskrifter/' + d + '.json' ? new Error('net') : undefined) });
  assert.match(rod.querySelector('.fejl-linje')?.textContent ?? '', new RegExp(d));
});

test('lupen virker med en låst familie, og favoritterne siger, at de ikke kan vises', async () => {
  const gemt = JSON.stringify({ v: 999, favoritter: ['koedsovs'] });
  await start('#/soeg', { foer: () => { lageret.set('kog-familie-v1', gemt); } });
  skriv(rod.querySelector('.soeg-felt'), 'kylling');
  assert.ok(kort().length > 0);
  gaaTil('#/gruppe/' + FAVORITTER);
  assert.equal(overskrift(), 'Favoritterne kan ikke vises');
  assert.equal(lageret.get('kog-familie-v1'), gemt);
});

test('en favorit, der ikke kunne hentes: intet kort, og fejllinjen nævner den', async () => {
  const a = retterI('fisk')[0];
  await start('#/gruppe/' + FAVORITTER, { foer: () => { Lager.skiftFavorit(a, FILER); }, hent: (sti) => (sti === 'opskrifter/' + a + '.json' ? new Error('net') : undefined) });
  assert.equal(overskrift(), 'Favoritter');
  assert.equal(kort().length, 0);
  assert.match(rod.querySelector('.fejl-linje').textContent, new RegExp(a));
});

test('mærkelige adresser til en gruppe: den rigtige skærm, og intet fra adressen i teksten', async () => {
  await start();
  const findesIkke = 'Den gruppe findes ikke';
  for (const [h, forventet] of [
    ['#/gruppe/fisk/x/y', GRUPPER.fisk], ['#gruppe/fisk', GRUPPER.fisk], ['#/gruppe//fisk', GRUPPER.fisk],
    ['#/gruppe/FISK', findesIkke], ['#/gruppe/%66isk', findesIkke], ['#/gruppe/<img>', findesIkke], ['#/gruppe/..', findesIkke],
    ['#/gruppe/constructor', findesIkke], ['#/gruppe/__proto__', findesIkke],
  ]) {
    gaaTil(h);
    assert.equal(overskrift(), forventet, h);
    assert.ok(!rod.textContent.includes('<img>'), 'intet fra adressen i teksten: ' + h);
  }
  gaaTil('#/soeg/x');
  assert.ok(rod.querySelector('.soeg-felt'), '#/soeg/x er lupen');
});

test('trin og tilbage bevarer vejen til gruppen og rullepladsen', async () => {
  await start('#/gruppe/fisk');
  const id = kort()[2];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  window.scrollY = 300;
  tryk(k());
  gaaTil('#/ret/' + id + '/trin/1');
  gaaTil('#/ret/' + id);
  tryk(knapMed('Tilbage'));
  assert.equal(location.hash, '#/gruppe/fisk');
  assert.equal(window.scrollY, 300);
});

test('forsiden glemmer, hvor retten blev åbnet', async () => {
  await start('#/soeg');
  skriv(rod.querySelector('.soeg-felt'), 'kylling');
  const id = kort()[0];
  const k = () => rod.querySelector('.kort[data-ret="' + id + '"]');
  tryk(k());
  tryk(k());
  gaaTil('#/');
  gaaTil('#/ret/' + id);
  tryk(knapMed('Tilbage'));
  assert.equal(location.hash, '#/gruppe/' + gruppeAf(id, INDEX.grupper));
});

test('et bogstav uden for BMP tæller som ét, når søgeordets længde tælles', () => {
  const b = String.fromCodePoint(0x1D4B6) + String.fromCodePoint(0x1D4B7);
  assert.deepEqual(soeg([{ navn: 'x' + b, ingredienser: [], maerker: [] }], b), []);
  assert.equal(soeg([{ navn: b + 'x', ingredienser: [], maerker: [] }], b).length, 1);
  const tre = b + String.fromCodePoint(0x1D4B8);
  assert.equal(soeg([{ navn: tre + 'x', ingredienser: [], maerker: [] }], tre).length, 1, 'tre bogstaver må stå først i et ord');
  assert.equal(soeg([{ navn: 'x' + tre, ingredienser: [], maerker: [] }], tre).length, 0, 'men ikke sidst, når det ikke er et madord');
  assert.equal(soeg([{ navn: 'x' + tre + 'x', ingredienser: [], maerker: [] }], tre).length, 0, 'og ikke inde i det');
});

test('korte ord med blød bindestreg og tomme input', () => {
  const sh = String.fromCharCode(0xAD);
  const r = (navn) => ({ navn, ingredienser: [], maerker: [] });
  assert.equal(soeg([r('Is' + sh + 'bombe')], 'isb').length, 1);
  assert.equal(soeg([r('R' + sh + 'is')], 'is').length, 0);
  assert.equal(soeg([r('Is' + sh + 'bombe')], 'i' + sh + 's').length, 1);
  assert.equal(soeg([r('a')], sh).length, 1, 'kun en blød bindestreg er en tom søgning');
  assert.equal(soeg([r('a')], ' , ,').length, 1);
  assert.equal(soeg([r('a')], null).length, 1);
  assert.equal(soeg([r('a')], undefined).length, 1);
  assert.equal(soeg([], 'is').length, 0);
  assert.equal(soeg([r('Åben')], String.fromCharCode(0x41, 0x30A)).length, 1, 'Å skrevet som to tegn (A + ring) finder Å');
});
