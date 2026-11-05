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
import { GRUPPER, AFTENSMAD_GRUPPER, gruppeSoegeord } from '../js/katalog.js';
import { soeg, soegeTekst } from '../js/soeg.js';
import { FAVORITTER, gruppeRute, forsideGrupper, gruppeAf, gruppeRetter, tilbageFraRet, rulleplads, blandet } from '../js/grupper.js';
import { lavModel, erLynhurtig, harTid } from '../js/model.js';

const ROD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NI = ['pasta-og-nudler', 'kylling', 'fisk', 'koed', 'groent', 'broed-og-pizza', 'soede-sager', 'jul', 'halloween'];
const ANTAL_RETTER = 151;
const ANTAL_PLANLAGTE = 82;

const laesJson = (sti) => JSON.parse(fs.readFileSync(path.join(ROD, sti), 'utf8'));
const INDEX = laesJson('opskrifter/index.json');
const FILER = fs.readdirSync(path.join(ROD, 'opskrifter')).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => f.slice(0, -5));
const retterI = (id) => INDEX.grupper.find((g) => g.id === id).retter;
const JSONER = new Map(FILER.map((id) => [id, laesJson('opskrifter/' + id + '.json')]));
// Retterne til ugeplanen i index.json's rækkefølge (efter gruppe)
const UGE = INDEX.grupper.flatMap((g) => g.retter).filter((id) => JSONER.get(id).tumbi && JSONER.get(id).tumbi.ugeplan === true);

// ---------- Sorteringen i opskrifter/index.json ----------

test('alle 151 retter står i præcis én af de 9 grupper, og alle opskriftsfiler har en plads', () => {
  const alle = INDEX.grupper.flatMap((g) => g.retter);
  assert.equal(alle.length, ANTAL_RETTER);
  assert.equal(new Set(alle).size, alle.length, 'en ret står to steder');
  assert.deepEqual([...alle].sort(), [...FILER].sort());
  assert.equal(FILER.length, ANTAL_RETTER);
});

test('de 9 grupper står i forsidens rækkefølge, ingen er tom, og koden kender dem alle', () => {
  assert.deepEqual(INDEX.grupper.map((g) => g.id), NI);
  assert.deepEqual(Object.keys(GRUPPER), NI, 'GRUPPER i js/katalog.js har samme rækkefølge som listen');
  for (const g of INDEX.grupper) assert.ok(g.retter.length > 0, g.id + ' er tom');
  assert.deepEqual(forsideGrupper(INDEX.grupper), { knapper: NI, ukendte: [] });
});

test('de 82 retter, der kan planlægges, er stadig 82 og står alle i en af grupperne', () => {
  const planlagte = FILER.filter((id) => JSONER.get(id).tumbi && JSONER.get(id).tumbi.ugeplan === true);
  assert.equal(planlagte.length, ANTAL_PLANLAGTE);
  assert.equal(FILER.map((id) => lavModel(JSONER.get(id))).filter((m) => m.uge).length, ANTAL_PLANLAGTE, 'også sådan, som modellen læser dem');
  for (const id of planlagte) assert.ok(gruppeAf(id, INDEX.grupper), id + ' står ikke i en kendt gruppe');
});

test('de fem nye aftensmads-grupper og «Bagning»: søgeordene hænger på gruppen, ikke på retten', () => {
  assert.deepEqual(AFTENSMAD_GRUPPER, ['pasta-og-nudler', 'kylling', 'fisk', 'koed', 'groent']);
  for (const g of AFTENSMAD_GRUPPER) assert.equal(gruppeSoegeord(g), 'Aftensmad');
  assert.equal(gruppeSoegeord('broed-og-pizza'), 'Bagning');
  for (const g of ['soede-sager', 'jul', 'halloween', 'ukendt', 'constructor', null, undefined]) assert.equal(gruppeSoegeord(g), null, String(g));
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

test('korte ord: 1-2 bogstaver kun ordets begyndelse, 3 også slutningen, og længere ord også inde i ordet', () => {
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
  assert.deepEqual(ids('lmos'), ['Kartoffelmos']);
});

test('«aftensmad» finder alle retter i de fem grupper og ingen andre', () => {
  const traef = soeg(POSTER, 'aftensmad');
  const forventet = AFTENSMAD_GRUPPER.flatMap(retterI);
  assert.deepEqual(traef.map((p) => p.m.id).sort(), [...forventet].sort());
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

test('forsiden: 9 rigtige knapper med navn til skærmlæseren, billede og navn og ingen af de 151 kort', async () => {
  await start();
  const b = knapper();
  assert.deepEqual(b.map((x) => x.dataset.gruppe), NI);
  assert.deepEqual(b.map((x) => x.getAttribute('aria-label')), NI.map((id) => GRUPPER[id]));
  for (const x of b) {
    assert.equal(x.tag, 'button');
    assert.equal(x.getAttribute('type'), 'button');
    assert.equal(x.textContent, x.getAttribute('aria-label'), 'ingen anden tekst end navnet');
    assert.match(x.querySelector('img').getAttribute('src'), /^grafik\/[a-z-]+\.svg$/);
    assert.equal(x.querySelector('img').getAttribute('alt'), '', 'billedet er pynt: knappen har navnet');
  }
  assert.equal(rod.querySelectorAll('.kort').length, 0);
  assert.equal(rod.querySelectorAll('nav ul li button').length, 9, 'en liste i en nav, så skærmlæseren kan sige antallet');
});

test('billederne på forsiden findes alle på disken', async () => {
  await start();
  for (const b of knapper()) {
    const src = b.querySelector('img').getAttribute('src');
    assert.ok(fs.existsSync(path.join(ROD, src)), src);
  }
});

test('et tryk åbner gruppen og siger navnet, og skærmen skifter først', async () => {
  await start();
  for (const id of NI) {
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
  for (const id of NI) {
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
  for (const id of NI) {
    gaaTil('#/gruppe/' + id);
    assert.equal(rod.querySelectorAll('.lyn').length, medLyn.filter((g) => g === id).length, 'lyn på ' + id);
    assert.equal(rod.querySelectorAll('.kort-tid').length, medTid.filter((g) => g === id).length, 'minuttal på ' + id);
  }
});

test('en ukendt gruppe giver en fejlskærm med vej til forsiden', async () => {
  await start();
  for (const id of ['constructor', '__proto__', 'toString', 'xyz', 'aftensmad', 'bagning']) {
    gaaTil('#/gruppe/' + id);
    assert.equal(overskrift(), 'Den gruppe findes ikke', id);
    assert.equal(kort().length, 0);
    tryk(knapMedTekst('Til forsiden'));
    assert.equal(location.hash, '#/', id);
  }
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
  assert.equal(knapper().length, 9);
});

test('gamle adresser til en ret virker og fører tilbage til rettens gruppe', async () => {
  for (const g of NI) {
    const id = retterI(g)[0];
    await start('#/ret/' + id);
    assert.equal(overskrift(), lavModel(JSONER.get(id)).navn, id);
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
  assert.match(rod.querySelector('.soeg-tal').textContent, /81/);
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
  assert.equal(knapper().length, 9);

  const [a, b] = [retterI('fisk')[0], retterI('jul')[0]];
  await start('#/', { foer: () => { Lager.skiftFavorit(a, FILER); Lager.skiftFavorit(b, FILER); } });
  const hjerte = rod.querySelector('.forside-favoritter');
  assert.equal(hjerte.tag, 'button');
  assert.equal(hjerte.getAttribute('aria-label'), 'Favoritter');
  assert.equal(knapper().length, 9, 'hjertet er ud over de 9');
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
});

test('grupper i listen, koden ikke kender, forsvinder ikke i stilhed', async () => {
  const ny = { version: 2, grupper: [...INDEX.grupper, { id: 'ukendt-gruppe', retter: ['ny-ret-her'] }] };
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? ny : undefined) });
  assert.equal(knapper().length, 9);
  const fejl = rod.querySelectorAll('.fejl-linje').map((p) => p.textContent).join(' ');
  assert.match(fejl, /ukendt-gruppe/);
  assert.equal(rod.querySelector('.fejl-linje').getAttribute('role'), 'status');
});

test('en gruppe, der er tom i listen, har ingen knap, og adressen til den giver fejlskærmen', async () => {
  const ny = { version: 2, grupper: INDEX.grupper.map((g) => (g.id === 'fisk' ? { id: 'fisk', retter: [] } : g)) };
  await start('#/', { hent: (sti) => (sti === 'opskrifter/index.json' ? ny : undefined) });
  assert.deepEqual(knapper().map((b) => b.dataset.gruppe), NI.filter((x) => x !== 'fisk'));
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
  assert.equal(knapper().length, 9);
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
  assert.equal(knapper().length, 9);
  assert.equal(rod.querySelector('.forside-favoritter'), null);
  assert.equal(lageret.get('kog-familie-v1'), gemt, 'en nyere udgaves data er urørt');
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

test('børnenes valg: første side blander grupperne, og man når alle retter til ugeplanen og ingen andre', async () => {
  await start('#/uge/vaelg/rosa');
  const sider = alleSider();
  assert.equal(sider[0].length, 4);
  assert.equal(new Set(gruppeNavne(sider[0])).size, 4, 'side 1 har: ' + gruppeNavne(sider[0]).join(', '));
  assert.deepEqual(sider.flat().sort(), [...UGE].sort());
  assert.deepEqual(skrivninger, [], 'at bladre gemmer intet');
});

test('børnenes valg med et udvalg: kun udvalgets retter, blandet, og det gemte udvalg er urørt', async () => {
  const ids = [...retterI('pasta-og-nudler').filter((id) => UGE.includes(id)).slice(0, 3), ...retterI('fisk').filter((id) => UGE.includes(id)).slice(0, 2)];
  let gemt = null;
  // Pip: valget undervejs (barn i js/ugeplan.js) huskes i modulet, så Rosa ville starte på den side, testen før sluttede på
  await start('#/uge/vaelg/pip', { foer: () => { Lager.gemFamilie({ udvalg: { ids, rettet: '2026-11-05' } }, FILER); gemt = lageret.get('kog-familie-v1'); } });
  const vist = alleSider().flat();
  assert.deepEqual([...vist].sort(), [...ids].sort());
  assert.deepEqual(gruppeNavne(vist).slice(0, 4), ['pasta-og-nudler', 'fisk', 'pasta-og-nudler', 'fisk']);
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
