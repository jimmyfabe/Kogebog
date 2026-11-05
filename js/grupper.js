// grupper.js — forsidens billedknapper, gruppeskærmen og vejen tilbage: adresserne og listerne. Ren logik uden DOM, tale og
// lager (test/test-forside.js). Skærmene står i app.js. Forsiden husker intet valg: alt her regnes ud fra adressen,
// index.json og favoritterne.
//   #/gruppe/<id>         gruppens retter
//   #/gruppe/favoritter   hjertets retter (kun i hukommelsen: favoritterne står i familien, js/lager.js)
//   #/soeg                den voksnes søgning bag lupen
import { GRUPPER } from './katalog.js';

export const FAVORITTER = 'favoritter';
export const HASH_FORSIDE = '#/';
export const HASH_SOEG = '#/soeg';
export const hashGruppe = (id) => '#/gruppe/' + id;

const kendt = (id) => Object.hasOwn(GRUPPER, id);

// Adressen som rute, eller null, når den ikke er en af disse. Gruppen tjekkes først, når skærmen vises (gruppeRetter)
export function gruppeRute(hash) {
  const d = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean);
  if (d[0] === 'gruppe' && d[1]) return { side: 'gruppe', id: d[1] };
  if (d[0] === 'soeg') return { side: 'soeg' };
  return null;
}

// Forsidens knapper i index.json's rækkefølge: de grupper, koden kender, og som har retter. ukendte: grupper i index.json,
// koden ikke har navn og billede til (en gammel udgave af koden med en ny liste). De må ikke forsvinde i stilhed
export function forsideGrupper(grupper) {
  return {
    knapper: grupper.filter((g) => kendt(g.id) && g.retter.length > 0).map((g) => g.id),
    ukendte: grupper.filter((g) => !kendt(g.id)).map((g) => g.id),
  };
}

// Den gruppe, retten står i, når koden kender den. Ellers null
export function gruppeAf(ret, grupper) {
  const g = grupper.find((x) => x.retter.includes(ret));
  return g && kendt(g.id) ? g.id : null;
}

// Retterne på gruppeskærmen id som [{ id, gruppe }] (gruppen giver kortets farve, også blandt favoritterne), eller null,
// når gruppen ikke findes eller er tom (den har heller ingen knap på forsiden). Favoritterne står i den rækkefølge, de fik
// hjertet, og kan være tomme: hjertet viser sin egen besked
export function gruppeRetter(id, grupper, favoritter = []) {
  if (id === FAVORITTER) return favoritter.map((ret) => ({ id: ret, gruppe: gruppeAf(ret, grupper) }));
  const g = kendt(id) ? grupper.find((x) => x.id === id) : null;
  return g && g.retter.length ? g.retter.map((ret) => ({ id: ret, gruppe: id })) : null;
}

// Rettens tilbage-pil: dertil, hvor retten blev åbnet (fra = { hash, ret, y }), ellers rettens gruppe, så en gammel adresse
// til en ret stadig fører et sted hen, og ellers forsiden
export function tilbageFraRet(ret, grupper, fra) {
  if (fra && fra.ret === ret) return fra.hash;
  const g = gruppeAf(ret, grupper);
  return g ? hashGruppe(g) : HASH_FORSIDE;
}

// Rullepladsen, der skal gendannes, når skærmen hash vises: kun på den skærm, retten blev åbnet fra. Ellers null
export function rulleplads(fra, hash) {
  return fra && fra.hash === hash && Number.isFinite(fra.y) ? fra.y : null;
}
