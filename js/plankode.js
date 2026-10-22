// plankode.js — ugeplanen som en kode i linket #/hent/<kode> (docs/ugeplan-plan.md, afsnit 3). Ren logik: ingen DOM og
// intet lager. Koden er v1.<mandag ÅÅÅÅMMDD>.<syv dage adskilt af ~>.<kontrolsum>, hvor en dag er tom (fri aften) eller
// <id>_<portioner>, fx v1.20261026.koedsovs_4~~bolognese-one-pot_6~~~~.a3f9. Den har kun tegn uden URL-kodning, så
// Beskeder ikke skærer linket over. Kontrolsummen (FNV-1a, 4 hex) fanger et afskåret link; den er ikke sikkerhed.
// afkod() er streng: en kode, der ikke passer præcis, afvises helt (ingen delvis indlæsning). Fra adressen kommer kun
// id'er, der står i «retter», og tal, der er tjekket, videre, og fejlbeskederne er faste (intet fra adressen vises)
import { ID_RE } from './data.js';

export const MAKS_LAENGDE = 400; // tjekkes, før noget andet sker: en gyldig kode er højst ca. 325 tegn
export const MAKS_ID = 40;
export const MAKS_DAGE_VAEK = 56; // ugens mandag højst 8 uger før eller efter i dag
export const BESKED_NYERE = 'Lavet med en nyere udgave. Opdatér appen.';
export const BESKED_UGYLDIG = 'Linket kan ikke læses.';

const TEGN_RE = /^[a-z0-9._~-]*$/;
// En dag: tom eller id_portioner med portioner 1-12 uden foranstillet nul. Hele koden er præcis syv dage
const DAG = '(?:[a-z0-9]+(?:-[a-z0-9]+)*_(?:[1-9]|1[0-2]))?';
const KODE_RE = new RegExp('^v1\\.([0-9]{8})\\.(' + DAG + '(?:~' + DAG + '){6})\\.([0-9a-f]{4})$');
const NYERE_RE = /^v(?:[2-9]|[1-9][0-9]+)\./;
const DAG_MS = 86400000;

const erPortioner = (n) => Number.isInteger(n) && n >= 1 && n <= 12;
const erId = (id) => typeof id === 'string' && id.length <= MAKS_ID && ID_RE.test(id);

// FNV-1a, 32 bit
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// De 32 bit foldet til 16 (4 hex med små bogstaver) over alt før det sidste punktum
export function kontrolsum(krop) {
  const h = fnv1a(krop);
  return ((h >>> 16) ^ (h & 0xffff)).toString(16).padStart(4, '0');
}

// UTC-tiden for en rigtig mandag, ellers null (30-02 og år 0099 er ikke rigtige datoer her)
function mandag(aar, md, dag) {
  const ms = Date.UTC(aar, md - 1, dag);
  const d = new Date(ms);
  const rigtig = d.getUTCFullYear() === aar && d.getUTCMonth() === md - 1 && d.getUTCDate() === dag;
  return rigtig && d.getUTCDay() === 1 ? ms : null;
}

// uge: mandagen som ÅÅÅÅ-MM-DD; dage: syv dage, hver null (fri aften) eller { ret, n }. Kaster ved forkerte data
export function kod(uge, dage) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(typeof uge === 'string' ? uge : '');
  if (!m || mandag(Number(m[1]), Number(m[2]), Number(m[3])) === null) throw new RangeError('kod: uge skal være en mandag (ÅÅÅÅ-MM-DD)');
  if (!Array.isArray(dage) || dage.length !== 7) throw new RangeError('kod: der skal være 7 dage');
  const felter = dage.map((d) => {
    if (d === null) return '';
    if (!d || !erId(d.ret) || !erPortioner(d.n)) throw new RangeError('kod: en dag er null eller { ret, n } med n fra 1 til 12');
    return d.ret + '_' + d.n;
  });
  const krop = 'v1.' + m[1] + m[2] + m[3] + '.' + felter.join('~');
  return krop + '.' + kontrolsum(krop);
}

// retter: id'erne på retterne i ugeplanen (fra index.json og med «tumbi.ugeplan»: true); idag: en Date.
// Svar: { ok: true, uge, dage, ukendte, kode } eller { ok: false, fejl: 'nyere' | 'ugyldig', besked }. Et gyldigt id,
// der ikke står i «retter», giver en tom dag og tæller i «ukendte». «kode» er genskrevet fra det godkendte og er den,
// der gemmes
export function afkod(kode, { retter, idag = new Date() } = {}) {
  if (!Array.isArray(retter)) throw new TypeError('afkod: retter skal være en liste');
  if (!(idag instanceof Date) || Number.isNaN(idag.getTime())) throw new TypeError('afkod: idag skal være en dato');
  const nej = (fejl) => ({ ok: false, fejl, besked: fejl === 'nyere' ? BESKED_NYERE : BESKED_UGYLDIG });
  // 1. Længden og tegnene, før noget deles op
  if (typeof kode !== 'string' || kode.length > MAKS_LAENGDE || !TEGN_RE.test(kode)) return nej('ugyldig');
  // 2. Hele koden i ét udtryk; en nyere udgave genkendes kun på begyndelsen
  const m = KODE_RE.exec(kode);
  if (!m) return nej(NYERE_RE.test(kode) ? 'nyere' : 'ugyldig');
  const [, dato, felter, sum] = m;
  if (kontrolsum(kode.slice(0, -5)) !== sum) return nej('ugyldig');
  // 3. En rigtig mandag tæt på i dag, og id'erne
  const ms = mandag(Number(dato.slice(0, 4)), Number(dato.slice(4, 6)), Number(dato.slice(6)));
  const iDag = Date.UTC(idag.getFullYear(), idag.getMonth(), idag.getDate());
  if (ms === null || Math.abs(ms - iDag) > MAKS_DAGE_VAEK * DAG_MS) return nej('ugyldig');
  let ukendte = 0;
  const dage = [];
  for (const f of felter.split('~')) {
    if (f === '') {
      dage.push(null);
      continue;
    }
    const [id, n] = f.split('_');
    if (!erId(id)) return nej('ugyldig');
    // includes, aldrig opslag i et objekt: «constructor» er ikke en ret
    if (!retter.includes(id)) {
      ukendte++;
      dage.push(null);
      continue;
    }
    dage.push({ ret: id, n: Number(n) });
  }
  const uge = dato.slice(0, 4) + '-' + dato.slice(4, 6) + '-' + dato.slice(6);
  return { ok: true, uge, dage, ukendte, kode: kod(uge, dage) };
}

// Teksten til ukendte retter: kun tallet, aldrig id'et fra adressen
export const ukendtTekst = (n) => (n === 1 ? '1 ret kunne ikke findes' : n + ' retter kunne ikke findes');
