// model.js — gør en opskrift (schema.org/Recipe + «tumbi») til det, skærmene og printet bruger. Ingen DOM.
import { isoTilMinutter, delIngrediens } from './tekst.js';

export function lavModel(json) {
  const t = json.tumbi || {};
  const ingredienser = (json.recipeIngredient || []).map((tekst, i) => {
    const ekstra = (t.ingredienser || [])[i] || {};
    const { maengde, navn } = delIngrediens(tekst, ekstra.maengde);
    return { tekst, maengde, navn, ikon: ekstra.ikon || null };
  });
  const trin = (json.recipeInstructions || []).map((s, i) => {
    const st = s.tumbi || {};
    return {
      nr: i + 1,
      tekst: s.text,
      verbum: st.verbum,
      voksen: st.voksen_hjaelp || null,
      timerSek: Number.isInteger(st.timer_sek) && st.timer_sek > 0 ? st.timer_sek : null,
      note: st.note || '',
      ikoner: st.ikoner || [],
    };
  });
  return {
    id: t.id,
    navn: json.name,
    beskrivelse: json.description || '',
    portioner: json.recipeYield || '',
    minutter: isoTilMinutter(json.totalTime),
    aktivMinutter: isoTilMinutter(json.prepTime),
    afproevet: t.afproevet === true,
    kilde: t.kilde || '',
    redskaber: json.tool || [],
    ingredienser,
    trin,
  };
}
