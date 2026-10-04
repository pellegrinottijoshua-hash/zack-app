/**
 * Il listino della voce — ElevenLabs, «leggi questo» (fetta 6a).
 *
 * A parte da `listino.js` per la stessa ragione del video: l'immagine costa
 * una cifra fissa, la lettura costa **a carattere**. Modulo puro: lo leggono
 * il browser (il prezzo accanto al tasto) e il Worker (l'addebito), e i due
 * numeri non possono divergere perché sono lo stesso codice.
 *
 * ⚠️ **Il costo si misura prima di scrivere il prezzo** (lezione 3 di B2,
 * spec `2026-10-04-voce-design.md` §2.2). ElevenLabs non vende a carattere: si
 * paga un abbonamento con dentro dei crediti, e il costo di un carattere è
 * «quota mensile ÷ crediti», più quanto ne consuma il modello. Il committente
 * il 2026-10-04 non ha ancora scelto il piano: quindi la misura **non c'è**, il
 * prezzo è `null`, il tasto è spento e il Worker risponde 503 prima di
 * addebitare. Il giorno della misura si scrive UN numero qui sotto.
 */

import { priceFor } from './ledger.js';

export const VOCE_LEGGI = 'voce-leggi';

/**
 * Millesimi di euro per **mille caratteri**, misurati su una lettura vera col
 * piano scelto (cambio dollaro→euro come in `listinoVideo.js`, per eccesso).
 * `null` = non misurato: nessun prezzo, nessuna lettura.
 */
export const MISURA_VOCE = null;

/**
 * Il modello: il multilingue, perché legge l'italiano. Il «flash» costa la
 * metà a carattere ma pronuncia peggio; se un giorno si cambia, si rifà la
 * misura (consuma un credito a carattere, il flash mezzo).
 */
export const MODELLO_VOCE = 'eleven_multilingual_v2';

/**
 * Il tetto di una lettura. ElevenLabs ne accetta di più per chiamata; qui si
 * resta sotto perché la risposta torna in base64 dentro una richiesta sola, e
 * perché un prezzo che si vede deve restare un prezzo piccolo.
 */
export const MAX_CARATTERI = 2500;

/**
 * Le voci pronte di ElevenLabs offerte nel punto oro. Lista CHIUSA: il Worker
 * rifiuta un id che non sta qui (la 6b aggiungerà le voci del cliente, coi
 * loro controlli). Gli id sono quelli delle voci «premade» pubblicate; vanno
 * riconfermati con la chiave vera il giorno della misura (`GET /v1/voices`).
 */
export const VOCI_PRONTE = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', nome: 'George' },
  { id: 'EXAVITQu4vr4xnSDxMaL', nome: 'Sarah' },
  { id: 'pNInz6obpgDQGcFmaJgB', nome: 'Adam' },
  { id: 'XB0fDUnXU5powFXDhCwa', nome: 'Charlotte' },
];

/**
 * Quanti caratteri si pagano. `length` conta in UTF-16, quindi una emoji vale
 * due: per eccesso rispetto a ElevenLabs, mai per difetto — «la stima non sta
 * mai sotto il costo».
 */
export function caratteriDi(testo) {
  return typeof testo === 'string' ? testo.trim().length : 0;
}

/** Controlla la richiesta; `null` se va bene, o il codice dell'errore. */
export function letturaNonValida({ testo, voce }) {
  const n = caratteriDi(testo);
  if (!n) return 'senza-testo';
  if (n > MAX_CARATTERI) return 'testo-troppo-lungo';
  if (!VOCI_PRONTE.some((v) => v.id === voce)) return 'voce-sconosciuta';
  return null;
}

/** Il costo, in millesimi, di `caratteri` a questa misura. Per eccesso. */
export function costoLettura(caratteri, misura = MISURA_VOCE) {
  if (!Number.isFinite(misura) || misura <= 0) return null;
  return Math.ceil((caratteri * misura) / 1000);
}

/**
 * Il prezzo di una lettura (`{ total, cost, margin }`), col ricarico di
 * Immagine e Video (decisione del committente, 2026-10-04) — oppure `null`
 * finché la misura non c'è. Un testo vuoto costa il minimo di un carattere:
 * il prezzo accanto al tasto non deve mai dire «0 €».
 */
export function prezzoLettura(testo, misura = MISURA_VOCE) {
  const costo = costoLettura(Math.max(1, caratteriDi(testo)), misura);
  return costo === null ? null : priceFor(costo);
}
