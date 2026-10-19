// data.js — henter opskrifterne (opskrifter/index.json og opskrifter/<id>.json).
import { lavModel } from './model.js';

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class HentFejl extends Error {
  constructor(besked, { findesIkke = false } = {}) {
    super(besked);
    this.findesIkke = findesIkke;
  }
}

async function hentJson(sti) {
  let r;
  try {
    r = await fetch(sti);
  } catch (e) {
    throw new HentFejl('ingen forbindelse');
  }
  if (r.status === 404) throw new HentFejl('findes ikke', { findesIkke: true });
  if (!r.ok) throw new HentFejl('serveren svarede ' + r.status);
  try {
    return await r.json();
  } catch (e) {
    throw new HentFejl('filen kan ikke læses');
  }
}

// index.json har forsidens afsnit i rækkefølge, hvert med sine retter: { grupper: [{ id, retter }], ids }, hvor ids er
// alle retter i forsidens rækkefølge. En ret, der står to gange (også i samme gruppe), vises kun første gang, og en
// gruppe, der står to gange, springes over anden gang (validatoren tillader ingen af delene)
export async function hentIndex() {
  const j = await hentJson('opskrifter/index.json');
  if (!j || !Array.isArray(j.grupper)) throw new HentFejl('listen over retter mangler');
  const ids = [];
  const grupper = [];
  for (const g of j.grupper) {
    if (!g || typeof g.id !== 'string' || !ID_RE.test(g.id) || !Array.isArray(g.retter)) continue;
    if (grupper.some((x) => x.id === g.id)) continue;
    const retter = [];
    for (const id of g.retter) {
      if (typeof id === 'string' && ID_RE.test(id) && !ids.includes(id)) { retter.push(id); ids.push(id); }
    }
    grupper.push({ id: g.id, retter });
  }
  return { grupper, ids };
}

export async function hentRet(id) {
  if (!ID_RE.test(id)) throw new HentFejl('ugyldigt navn', { findesIkke: true });
  const m = lavModel(await hentJson('opskrifter/' + id + '.json'));
  if (!m.navn || !m.trin.length || m.id !== id) throw new HentFejl('opskriften er ufuldstændig');
  return m;
}
