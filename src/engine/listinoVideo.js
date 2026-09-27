/**
 * Il listino del video — Seedance 2.5 (fase 3).
 *
 * A parte da `listino.js` perché ha un'altra forma: l'immagine costa una cifra
 * fissa, il video costa **a secondo**, e il secondo costa diverso secondo la
 * risoluzione e il CANALE da cui lo si compra. Modulo puro: lo leggono il
 * browser (il prezzo accanto al tasto) e il Worker (l'addebito), e i due
 * numeri non possono divergere perché sono lo stesso codice.
 *
 * Fonti, lette il 2026-09-27 sulle pagine ufficiali (spec
 * `docs/superpowers/specs/2026-09-27-video-seedance-design.md` §1):
 * - BytePlus ModelArk: 10,70 $ per milione di token;
 * - Higgsfield: 0,0214 $ ogni 1.000 token (il doppio);
 * - token = ceil(larghezza × altezza × secondi × 24 / 1024), uguale per tutti e due.
 */

import { priceFor } from './ledger.js';

/**
 * Dollari → euro. Una FOTOGRAFIA prudente: il dollaro contato più caro di
 * com'è, così un cambio che si muove un po' non porta il costo sopra il
 * prezzo. Va riguardata; `lavori.costo_reale` dice quando ha smesso di valere.
 */
export const CAMBIO_USD_EUR = 0.95;

/**
 * I pixel del formato PIÙ GRANDE di ogni risoluzione. Il prezzo si fa su
 * questo, così qualunque formato si scelga la stima resta sopra il costo vero
 * (la regola del listino: «la stima non sta mai sotto il costo»).
 * 720p: il 4:3 a 1112×834. 480p: il 21:9, arrotondato per eccesso.
 */
export const PIXEL_MASSIMI = { '480p': 424000, '720p': 927408 };

/** Dollari per token, per canale. */
export const DOLLARI_PER_TOKEN = {
  byteplus: 10.7 / 1e6,
  higgsfield: 0.0214 / 1e3,
};

export const CANALI = Object.keys(DOLLARI_PER_TOKEN);
/** Il canale su cui si fa il PREZZO: quello ufficiale, il meno caro. */
export const CANALE_DEL_PREZZO = 'byteplus';

export const DURATE = [5, 10, 15];
export const RISOLUZIONI = ['480p', '720p'];
export const FORMATI = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

export const VOCE_VIDEO = 'video-seedance25';

const nonValido = (code) => Object.assign(new Error(code), { code });

/** Controlla la richiesta; torna `null` se va bene, o il codice dell'errore. */
export function richiestaVideoNonValida({ durata, risoluzione, formato }) {
  if (!DURATE.includes(durata)) return 'durata';
  if (!RISOLUZIONI.includes(risoluzione)) return 'risoluzione';
  if (!FORMATI.includes(formato)) return 'formato';
  return null;
}

/** Quanti token si pagano, al massimo, per questa durata e risoluzione. */
export function tokenVideo({ durata, risoluzione }) {
  return Math.ceil((PIXEL_MASSIMI[risoluzione] * durata * 24) / 1024);
}

/** Il costo in millesimi di euro, da un canale. Per eccesso: è un costo. */
export function costoVideo({ durata, risoluzione, canale = CANALE_DEL_PREZZO }) {
  if (!DOLLARI_PER_TOKEN[canale]) throw nonValido('canale-sconosciuto');
  const euro = tokenVideo({ durata, risoluzione }) * DOLLARI_PER_TOKEN[canale] * CAMBIO_USD_EUR;
  return Math.ceil(euro * 1000);
}

/**
 * Il prezzo al cliente: sempre sul canale UFFICIALE, qualunque sia acceso.
 * Chi preme vede un numero solo, e non cambia perché il committente ha
 * spostato un interruttore.
 */
export function prezzoVideo({ durata, risoluzione, formato = '16:9' }) {
  const errore = richiestaVideoNonValida({ durata, risoluzione, formato });
  if (errore) throw nonValido(errore);
  return priceFor(costoVideo({ durata, risoluzione, canale: CANALE_DEL_PREZZO }));
}

/**
 * Il cancello del canale: si può generare da `canale` a questo prezzo?
 *
 * No se il canale costa più di quanto il cliente paga — Higgsfield, a listino,
 * costa il doppio. Si passa solo se il committente l'ha deciso
 * (`accettaPerdita`, cioè `VIDEO_ACCETTA_PERDITA=1`): è così che si usa una
 * promozione, apposta e mai per sbaglio.
 */
export function canaleConsentito({ canale, durata, risoluzione, accettaPerdita = false }) {
  if (!DOLLARI_PER_TOKEN[canale]) return false;
  if (accettaPerdita) return true;
  return costoVideo({ durata, risoluzione, canale }) <= prezzoVideo({ durata, risoluzione }).total;
}

/** Il costo VERO, dai token che il fornitore ha contato (o stimato per eccesso). */
export function costoDaToken(token, canale) {
  if (!Number.isFinite(token) || !DOLLARI_PER_TOKEN[canale]) return null;
  return Math.ceil(token * DOLLARI_PER_TOKEN[canale] * CAMBIO_USD_EUR * 1000);
}
