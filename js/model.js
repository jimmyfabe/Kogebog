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
      // «voksen: true» = en voksen hjælper (advarselstrekanten); voksen_hjaelp siger hvorfor (kniv eller varme). Validatoren kræver begge.
      voksen: st.voksen === true || Boolean(st.voksen_hjaelp),
      voksenSlags: st.voksen_hjaelp || null,
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
    // Ugeplanen (docs/ugeplan-plan.md): kun når «tumbi.ugeplan» er true, ellers null. «tumbi» er opskriftens egne felter,
    // som saml() i js/indkoeb.js læser dem ({ ret: { tumbi }, n }). Validatoren kræver felterne, når ugeplan er true
    uge: t.ugeplan === true ? { tumbi: t, portioner: t.portioner, prisKr: t.pris_kr, groentG: t.groent_g } : null,
  };
}

// Lynhurtig ret: højst LYN_MIN minutter i alt (totalTime). Får ⚡ på tallerkenen, hvor retterne vælges (forsiden og
// ugeplanen). Uden tid (null) eller med 0 minutter (en fejl i opskriften) er retten ikke lynhurtig
export const LYN_MIN = 20;
export function erLynhurtig(m) {
  return Boolean(m) && Number.isFinite(m.minutter) && m.minutter > 0 && m.minutter <= LYN_MIN;
}

// Hvad den voksne hjælper med i retten: ['kniv'], ['varme'] eller ['kniv', 'varme'] (altid i den rækkefølge), [] når
// barnet kan lave hele retten selv. Et voksen-trin uden kniv tæller som varme, som flammen i printet og på skærmen.
// Bruges til trekanterne, når retten åbnes, og til replikken, der siges dér (js/replikker.js)
export function voksenFarer(m) {
  const trin = m.trin.filter((t) => t.voksen);
  return ['kniv', 'varme'].filter((f) => trin.some((t) => (t.voksenSlags === 'kniv') === (f === 'kniv')));
}
