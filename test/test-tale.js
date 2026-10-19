// test-tale.js — oplæsningen (js/tale.js) med en falsk browser, der opfører sig som iPad'en:
// et lydelement må først spille, når load() eller play() er kaldt i et tryk (en ny src alene låser ikke op, så testen
// fanger, hvis load() forsvinder fra oplåsningen), og speechSynthesis taler kun, hvis den første ytring kom i et tryk.
// Uden tryk afvises play(), og stemmen er tavs.
// Rækkefølgen betyder noget: tale.js indlæses én gang, og oplåsningen sker kun ved det første rigtige tryk.
//   1. Det første tryk: pointerup tæller ikke (WebKit), touchend gør. Bagefter et voksen-hold uden tryk
//   2. Lyden spiller lige efter et voksen-hold, ét fælles lydelement
//   3. Reserven (iPad-stemmen) kan tale uden tryk
//   4. En gammel replik's fejl rammer ikke den nye
//   5. Fejl og pause udefra slipper knappens markering
//   6. Uden net tager reserven over med det samme
//   7. stop() under en lydfil
//   8. En lydfil, der hverken spiller eller fejler: iPad-stemmen efter 6 s (falske timere)
// Ikke afprøvet på iPad.
// Kør:  node test/test-tale.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------- Den falske browser ----------
let iTryk = false; // true, mens et tryk behandles (som WebKits brugeraktivering under hændelsen)
const dokLyttere = {};
const doc = {
  addEventListener: (type, fn) => { (dokLyttere[type] ||= new Set()).add(fn); },
  removeEventListener: (type, fn) => { if (dokLyttere[type]) dokLyttere[type].delete(fn); },
};
// Et tryk: dokumentets lyttere (opfanger først), så knappens egen handling (fn) — alt i samme tryk.
// aktiv = false: WebKit regner ikke hændelsen som et tryk (fx pointerup med en finger), så intet låses op
function tryk(fn, type = 'pointerup', aktiv = true) {
  iTryk = aktiv;
  try {
    for (const l of [...(dokLyttere[type] || [])]) l({ type, isTrusted: true });
    if (fn) fn();
  } finally {
    iTryk = false;
  }
}
const naesteOpgave = () => new Promise((r) => setImmediate(r));

const spillet = []; // lydfiler, der faktisk spillede
let afvist = 0; // play(), der blev afvist, fordi elementet ikke var låst op
let elementer = 0;
let spilFejl = null; // sat til en DOMException: play() afvises (fx filen kunne ikke hentes)
let holdSvar = false; // true: play() venter, til testen selv afgør det (a.svar)
let stum = false; // true: play() svarer aldrig, og der kommer ingen hændelser (set i WebKit: kun loadstart, readyState 0)
class FalskAudio {
  constructor(src) {
    elementer++;
    this.laast = true;
    this.lyttere = {};
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.readyState = 0;
    this._src = '';
    if (src !== undefined) this.src = src;
  }
  set src(v) { this._src = String(v); this.paused = true; this.ended = false; this.error = null; this.readyState = 0; }
  get src() { return this._src; }
  addEventListener(type, fn) { (this.lyttere[type] ||= []).push(fn); }
  send(type) { for (const fn of this.lyttere[type] || []) fn({ type }); }
  load() { if (iTryk) this.laast = false; }
  play() {
    if (iTryk) this.laast = false;
    if (this.laast) { afvist++; return Promise.reject(new DOMException('Kræver et tryk', 'NotAllowedError')); }
    if (spilFejl) return Promise.reject(spilFejl);
    this.paused = false;
    if (stum) return new Promise(() => {});
    // Når lyden kører: readyState 4 og «playing» (en opgave senere, som i browseren)
    const spiller = () => { this.readyState = 4; setImmediate(() => { if (!this.paused) this.send('playing'); }); };
    if (holdSvar) return new Promise((ja, nej) => { this.svar = { ja: () => { spiller(); ja(); }, nej }; });
    spillet.push(this._src);
    spiller();
    return Promise.resolve();
  }
  pause() { if (!this.paused) { this.paused = true; setImmediate(() => this.send('pause')); } }
  // Testen: filen er spillet færdig (som i browseren: pause og så ended)
  slut() { this.paused = true; this.ended = true; this.send('pause'); this.send('ended'); }
}

const talt = []; // det, iPad-stemmen faktisk sagde
let stemmeAabnet = false;
let stemmeAfvist = 0;
const stemme = {
  speak(u) {
    if (!stemmeAabnet) {
      if (!iTryk) { stemmeAfvist++; return; } // iPad: tavs, indtil den første ytring kom i et tryk
      stemmeAabnet = true;
    }
    if (u.text.trim()) talt.push(u.text);
  },
  cancel() {},
  getVoices: () => [{ name: 'Falsk dansk', lang: 'da-DK' }],
};

// Service workerens lydcache: én fil er gemt
const cacheNavne = { 'kog-lyd-abc': ['https://eksempel.test/Kogebog/lyd/pandekager/gemt.mp3'], 'kog-v1': ['https://eksempel.test/Kogebog/app.js'] };
const falskCaches = {
  keys: async () => Object.keys(cacheNavne),
  open: async (n) => ({ keys: async () => (cacheNavne[n] || []).map((url) => ({ url })) }),
};

const nav = { onLine: true, serviceWorker: { controller: {} } };
Object.assign(globalThis, {
  window: globalThis,
  document: doc,
  Audio: FalskAudio,
  speechSynthesis: stemme,
  SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  caches: falskCaches,
  fetch: async () => ({ ok: true, json: async () => ({ filer: ['pandekager/1.mp3', 'pandekager/2.mp3', 'pandekager/3.mp3', 'pandekager/gemt.mp3', 'pandekager/ny.mp3'] }) }),
});
Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });

const Tale = await import('../js/tale.js');
await Tale.hentLydListe();
await naesteOpgave();

const lavKnap = () => {
  const s = new Set();
  return { classList: { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) } };
};
const sidsteLyd = () => FalskAudio.sidste;
const origPlay = FalskAudio.prototype.play;
FalskAudio.prototype.play = function play() { FalskAudio.sidste = this; return origPlay.call(this); };

// ---------- Testene (i rækkefølge: det første tryk låser op, se filens hoved) ----------

test('første tryk: en pointerup, der ikke tæller, slipper ikke oplåsningen, og touchend låser op', async () => {
  // Et fingertryk et sted uden knap: pointerup (ingen brugeraktivering i WebKit), så touchend og click
  tryk(null, 'pointerup', false);
  tryk(null, 'touchend');
  tryk(null, 'click');
  // Senere et voksen-hold (requestAnimationFrame, uden tryk)
  Tale.sig({ tekst: 'Hent en voksen. Steg pandekagen.', fil: 'pandekager/2.mp3' });
  await naesteOpgave();
  assert.equal(afvist, 0, 'lydelementet blev ikke låst op af touchend (lytterne var væk efter pointerup, eller load() mangler)');
  assert.deepEqual(spillet, ['lyd/pandekager/2.mp3']);
  sidsteLyd().slut();
  Tale.sig({ tekst: 'Der kører allerede en timer.', fil: 'faelles/findes-ikke.mp3' });
  assert.deepEqual(talt, ['Der kører allerede en timer.'], 'iPad-stemmen blev ikke låst op af touchend');
  spillet.length = 0;
  talt.length = 0;
});

test('lydfilen spiller også lige efter et voksen-hold, uden et tryk', async () => {
  tryk(() => Tale.sig({ tekst: 'Mål mel.', fil: 'pandekager/1.mp3' }));
  await naesteOpgave();
  assert.deepEqual(spillet, ['lyd/pandekager/1.mp3']);
  sidsteLyd().slut();
  // Holdet lykkes i requestAnimationFrame, mens fingeren er nede: ingen brugeraktivering
  Tale.sig({ tekst: 'Hent en voksen. Steg pandekagen.', fil: 'pandekager/2.mp3' });
  await naesteOpgave();
  assert.equal(afvist, 0, 'play() blev afvist uden tryk (et nyt lydelement pr. replik)');
  assert.deepEqual(spillet, ['lyd/pandekager/1.mp3', 'lyd/pandekager/2.mp3'], 'replikken efter holdet skal være lydfilen');
  assert.equal(elementer, 1, 'ét fælles lydelement');
  sidsteLyd().slut();
});

test('reserven (iPad-stemmen) kan tale uden tryk, fordi den blev låst op ved første tryk', async () => {
  const foer = stemmeAfvist;
  Tale.sig({ tekst: 'Der kører allerede en timer.', fil: 'faelles/findes-ikke.mp3' });
  assert.equal(stemmeAfvist, foer, 'iPad-stemmen var ikke låst op');
  assert.deepEqual(talt, ['Der kører allerede en timer.']);
});

test('en gammel replik, der fejler sent, rammer ikke den nye', async () => {
  holdSvar = true;
  const k1 = lavKnap();
  const k2 = lavKnap();
  Tale.sig({ tekst: 'Første.', fil: 'pandekager/1.mp3' }, { knap: k1 });
  const foerste = sidsteLyd().svar;
  Tale.sig({ tekst: 'Anden.', fil: 'pandekager/3.mp3' }, { knap: k2 });
  const anden = sidsteLyd().svar;
  holdSvar = false;
  foerste.nej(new DOMException('Afbrudt af en ny src', 'AbortError'));
  await naesteOpgave();
  assert.deepEqual(talt.slice(1), [], 'den gamle replik må ikke gå til iPad-stemmen');
  assert.ok(k2.classList.contains('taler'), 'knappen til den nye replik skal stadig være markeret');
  assert.ok(!k1.classList.contains('taler'));
  // Den forrige replik blev sat på pause, da den nye startede: den pause slutter ikke den nye
  anden.ja();
  await naesteOpgave();
  assert.ok(k2.classList.contains('taler'), 'pausen fra den forrige replik slukkede den nye knap');
  sidsteLyd().slut();
  assert.ok(!k2.classList.contains('taler'), 'markeringen slipper, når filen er spillet færdig');
});

test('fejl og pause udefra slipper knappens markering, og en fejl går til iPad-stemmen', async () => {
  const k = lavKnap();
  Tale.sig({ tekst: 'Rør.', fil: 'pandekager/1.mp3' }, { knap: k });
  await naesteOpgave();
  const a = sidsteLyd();
  a.paused = true; // fx et opkald på iPad'en
  a.send('pause');
  assert.ok(!k.classList.contains('taler'), 'markeringen sad fast efter en pause udefra');

  const k2 = lavKnap();
  Tale.sig({ tekst: 'Pisk.', fil: 'pandekager/2.mp3' }, { knap: k2 });
  await naesteOpgave();
  a.error = { code: 2 };
  a.send('error');
  assert.equal(talt[talt.length - 1], 'Pisk.', 'en fejl ved hentningen skal gå til iPad-stemmen');
  // play() afvises bagefter for samme fejl: iPad-stemmen må ikke sige det to gange
  const antal = talt.length;
  spilFejl = new DOMException('Filen kunne ikke hentes', 'NotSupportedError');
  Tale.sig({ tekst: 'Smag.', fil: 'pandekager/3.mp3' });
  sidsteLyd().error = { code: 4 };
  sidsteLyd().send('error');
  await naesteOpgave();
  spilFejl = null;
  assert.deepEqual(talt.slice(antal), ['Smag.'], 'reserven må kun tale én gang');
});

test('uden net tager iPad-stemmen over med det samme, hvis filen ikke er gemt', async () => {
  nav.onLine = false;
  try {
    const foer = spillet.length;
    Tale.sig({ tekst: 'Hæld mælk i.', fil: 'pandekager/ny.mp3' });
    assert.equal(talt[talt.length - 1], 'Hæld mælk i.', 'reserven skal vælges i trykket, ikke efter en fejl');
    // En fil, der ligger i service workerens lydcache, kan spilles uden net
    Tale.sig({ tekst: 'Gemt.', fil: 'pandekager/gemt.mp3' });
    await naesteOpgave();
    assert.deepEqual(spillet.slice(foer), ['lyd/pandekager/gemt.mp3']);
    sidsteLyd().slut();
    // … og en fil, der er spillet færdig (med service worker), er gemt nu
    nav.onLine = true;
    Tale.sig({ tekst: 'Rør.', fil: 'pandekager/1.mp3' });
    await naesteOpgave();
    sidsteLyd().slut();
    nav.onLine = false;
    Tale.sig({ tekst: 'Rør.', fil: 'pandekager/1.mp3' });
    await naesteOpgave();
    assert.equal(spillet[spillet.length - 1], 'lyd/pandekager/1.mp3', 'en fil, der er spillet færdig, kan spilles uden net');
    sidsteLyd().slut();
  } finally {
    nav.onLine = true;
  }
});

test('stop() under en lydfil: ingen reserve og ingen markering bagefter', async () => {
  holdSvar = true;
  const k = lavKnap();
  Tale.sig({ tekst: 'Vent.', fil: 'pandekager/1.mp3' }, { knap: k });
  const svar = sidsteLyd().svar;
  holdSvar = false;
  Tale.stop();
  const antal = talt.length;
  svar.nej(new DOMException('Afbrudt', 'AbortError'));
  await naesteOpgave();
  assert.equal(talt.length, antal);
  assert.ok(!k.classList.contains('taler'));
});

test('en lydfil, der hverken spiller eller fejler, giver plads til iPad-stemmen efter 6 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const k = lavKnap();
  stum = true;
  try {
    Tale.sig({ tekst: 'Hænger.', fil: 'pandekager/1.mp3' }, { knap: k });
    const a = sidsteLyd();
    await naesteOpgave();
    const antal = talt.length;
    t.mock.timers.tick(5000);
    assert.equal(talt.length, antal, 'iPad-stemmen tog over før tid');
    assert.ok(k.classList.contains('taler'));
    t.mock.timers.tick(1500);
    assert.deepEqual(talt.slice(antal), ['Hænger.'], 'efter 6 s uden «playing» skal iPad-stemmen sige replikken');
    assert.ok(a.paused, 'lydfilen skal stoppes, så den ikke spiller oven i iPad-stemmen bagefter');
    assert.ok(k.classList.contains('taler'), 'knappen er markeret, mens iPad-stemmen taler');

    // Et nyere tryk overskrives ikke: den første replik hænger, den anden spiller
    const k1 = lavKnap();
    const k2 = lavKnap();
    Tale.sig({ tekst: 'Første.', fil: 'pandekager/2.mp3' }, { knap: k1 });
    t.mock.timers.tick(3000);
    stum = false;
    Tale.sig({ tekst: 'Anden.', fil: 'pandekager/3.mp3' }, { knap: k2 });
    await naesteOpgave();
    await naesteOpgave();
    const efter = talt.length;
    t.mock.timers.tick(7000);
    assert.equal(talt.length, efter, 'tidsgrænsen fra den første replik må ikke ramme den nye');
    assert.ok(k2.classList.contains('taler'), 'den nye replik spiller stadig');
    assert.ok(!sidsteLyd().paused, 'den nye lydfil blev stoppet');
    sidsteLyd().slut();
  } finally {
    stum = false;
  }
});
