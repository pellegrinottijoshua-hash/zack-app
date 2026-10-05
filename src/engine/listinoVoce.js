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

/**
 * La voce si può usare? Le pronte sì; una voce propria (6b) solo se sta in
 * `proprie` — gli id che il Worker ha trovato in `voci` per QUESTO conto. Una
 * voce di un altro cliente non si usa, nemmeno conoscendone l'id.
 */
export function voceAmmessa(voce, proprie = []) {
  if (typeof voce !== 'string' || !voce) return false;
  return VOCI_PRONTE.some((v) => v.id === voce) || proprie.includes(voce);
}

/** Controlla la richiesta; `null` se va bene, o il codice dell'errore. */
export function letturaNonValida({ testo, voce, proprie = [] }) {
  const n = caratteriDi(testo);
  if (!n) return 'senza-testo';
  if (n > MAX_CARATTERI) return 'testo-troppo-lungo';
  if (!voceAmmessa(voce, proprie)) return 'voce-sconosciuta';
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

/* ------------------------------------------------------------------------ *
 * Fetta 6b — disegnare e clonare una voce. Stessa regola: senza misura,
 * niente prezzo e il Worker risponde 503 prima di addebitare.
 * ------------------------------------------------------------------------ */

export const VOCE_DISEGNA = 'voce-disegna';
export const VOCE_CLONA = 'voce-clona';

/**
 * Millesimi per UN disegno (ElevenLabs genera tre anteprime da una
 * descrizione, e le addebita in crediti) e per UNA clonazione istantanea.
 * Da misurare col piano scelto. ⚠️ Il piano gratuito non clona.
 */
export const MISURA_DISEGNO = null;
export const MISURA_CLONAZIONE = null;

/** La descrizione di una voce da disegnare: ElevenLabs ne vuole fra 20 e 1000 caratteri. */
export const DESCRIZIONE_MIN = 20;
export const DESCRIZIONE_MAX = 1000;
/** Il campione da clonare: abbastanza per una voce, non tanto da sfondare la richiesta. */
export const CAMPIONE_MAX_BYTE = 10 * 1024 * 1024;
const NOME_MAX = 60;

const fisso = (misura) => (Number.isFinite(misura) && misura > 0 ? priceFor(Math.ceil(misura)) : null);

export function prezzoDisegno(misura = MISURA_DISEGNO) {
  return fisso(misura);
}

export function prezzoClonazione(misura = MISURA_CLONAZIONE) {
  return fisso(misura);
}

export function descrizioneNonValida(descrizione) {
  const n = caratteriDi(descrizione);
  if (n < DESCRIZIONE_MIN) return 'descrizione-corta';
  if (n > DESCRIZIONE_MAX) return 'descrizione-lunga';
  return null;
}

export function nomeVoceNonValido(nome) {
  const n = caratteriDi(nome);
  if (!n) return 'senza-nome';
  if (n > NOME_MAX) return 'nome-lungo';
  return null;
}

/* ------------------------------------------------------------------------ *
 * Fetta 6c — cambiare la voce di una registrazione (speech-to-speech).
 * ------------------------------------------------------------------------ */

export const VOCE_CAMBIA = 'voce-cambia';

/**
 * Millesimi per SECONDO di audio cambiato. Da misurare: ElevenLabs addebita
 * lo speech-to-speech a tempo.
 */
export const MISURA_CAMBIO = null;

/** Il tetto di un cambio: un minuto. Basta per un vocale e per una clip. */
export const MAX_SECONDI_CAMBIO = 60;

/**
 * Il formato in cui il browser manda l'audio da cambiare: WAV PCM a 16 bit,
 * mono, 16 kHz. Fisso apposta: così il Worker legge la DURATA dall'intestazione
 * e la conta lui — un browser che dichiarasse «un secondo» per un minuto
 * pagherebbe un secondo, e il resto lo pagheremmo noi.
 */
export const WAV_CAMBIO = { frequenza: 16000, canali: 1, bit: 16 };

export function prezzoCambio(secondi, misura = MISURA_CAMBIO) {
  if (!Number.isFinite(misura) || misura <= 0) return null;
  return priceFor(Math.ceil(Math.max(1, Math.ceil(secondi || 0)) * misura));
}

/**
 * La durata di un WAV, dai byte: `null` se non è il WAV che ci aspettiamo.
 * Si cerca il blocco `data` invece di supporre 44 byte di intestazione: alcuni
 * scrittori ci mettono blocchi in più.
 */
export function durataWav(byte) {
  const b = byte instanceof Uint8Array ? byte : new Uint8Array(byte);
  if (b.length < 44) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const quattro = (o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (quattro(0) !== 'RIFF' || quattro(8) !== 'WAVE') return null;
  let o = 12;
  let fmt = null;
  while (o + 8 <= b.length) {
    const id = quattro(o);
    const lung = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      fmt = { formato: v.getUint16(o + 8, true), canali: v.getUint16(o + 10, true), frequenza: v.getUint32(o + 12, true), bit: v.getUint16(o + 22, true) };
    } else if (id === 'data') {
      if (!fmt || fmt.formato !== 1) return null;
      const { frequenza, canali, bit } = WAV_CAMBIO;
      if (fmt.frequenza !== frequenza || fmt.canali !== canali || fmt.bit !== bit) return null;
      // I byte veri, non quelli dichiarati: un `data` che dice più di quanto c'è mente.
      const dati = Math.min(lung, b.length - (o + 8));
      // E dopo `data` non c'è niente: altro audio in coda non sarebbe contato.
      if (b.length - (o + 8) - dati > 1) return null;
      return dati / (frequenza * canali * (bit / 8));
    }
    o += 8 + lung + (lung % 2);
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 * Fase 7c — «inventane uno»: un effetto sonoro da una descrizione.
 * ------------------------------------------------------------------------ */

export const EFFETTO_INVENTA = 'effetto-inventa';

/**
 * Millesimi per SECONDO di effetto generato. Da misurare col piano scelto
 * (ElevenLabs Sound Effects addebita a durata). `null` = spento.
 */
export const MISURA_EFFETTO = null;

/** Le durate offerte, in secondi: dentro i limiti dell'API (0,5–22). */
export const DURATE_EFFETTO = [1, 2, 5, 10];
export const EFFETTO_DESCRIZIONE_MAX = 450;

export function effettoNonValido({ descrizione, durata }) {
  const n = caratteriDi(descrizione);
  if (n < 3) return 'descrizione-corta';
  if (n > EFFETTO_DESCRIZIONE_MAX) return 'descrizione-lunga';
  if (!DURATE_EFFETTO.includes(durata)) return 'durata';
  return null;
}

export function prezzoEffetto(durata, misura = MISURA_EFFETTO) {
  if (!Number.isFinite(misura) || misura <= 0 || !DURATE_EFFETTO.includes(durata)) return null;
  return priceFor(Math.ceil(durata * misura));
}
