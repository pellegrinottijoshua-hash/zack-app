import scontorna from './scontorna.js';
import filmato from './filmato.js';

/**
 * I descrittori dei servizi: dove vive il comportamento di ognuno.
 *
 * Puro — nessun canvas, nessun React, nessun DOM — perché è la parte che
 * decide cosa si vede, ed è capace di sbagliare in silenzio: uno strumento
 * che non compare mai non solleva niente. Va dove i test la vedono, in Node.
 * Stessa ragione di `ricette.js`, `holes.js`, `keying.js`.
 */
export const DESCRITTORI = { scontorna, filmato };

/**
 * Gli stati in cui uno strumento può comparire. **Lista chiusa.**
 *
 * Chiusa apposta: uno stato nuovo si aggiunge QUI, e allora
 * `strumentiVisibili` sa cosa farne. Uno scritto a mano dentro un descrittore
 * sparirebbe in silenzio — lo strumento non comparirebbe mai, e nessuno
 * saprebbe perché. Per questo `validaDescrittore` lo rifiuta.
 */
export const QUANDO = ['sempre', 'con-file', 'con-risultato', 'con-file-senza-risultato'];

/** Il descrittore di un servizio, o un errore che lo nomina. */
export function getDescrittore(id) {
  const d = DESCRITTORI[id];
  if (!d) throw new Error(`Servizio senza descrittore: ${id}`);
  return d;
}

/**
 * Quali strumenti si vedono, dato cosa c'è sul piano.
 *
 * `stato` è due booleani e basta. Se un giorno servisse di più, si allarga
 * `QUANDO`, non si passa qui un oggetto che il descrittore deve interpretare:
 * quello sarebbe rimettere il programma dentro i dati.
 */
export function strumentiVisibili(descrittore, { file = false, risultato = false } = {}) {
  const vale = {
    sempre: () => true,
    'con-file': () => file,
    'con-risultato': () => file && risultato,
    'con-file-senza-risultato': () => file && !risultato,
  };
  return descrittore.strumenti.filter((s) => vale[s.quando]());
}

/** Un descrittore storto lo dice subito, con dentro cosa non va. */
export function validaDescrittore(d) {
  if (!d || typeof d !== 'object') throw new Error('Descrittore assente.');
  for (const campo of ['id', 'claim', 'accetta', 'tasto', 'strumenti']) {
    if (!d[campo]) throw new Error(`Descrittore ${d.id || '?'}: manca «${campo}».`);
  }
  if (!Array.isArray(d.strumenti)) {
    throw new Error(`Descrittore ${d.id}: «strumenti» non è una lista.`);
  }
  for (const s of d.strumenti) {
    for (const campo of ['id', 'icon', 'label', 'quando']) {
      if (!s[campo]) {
        throw new Error(`Descrittore ${d.id}, strumento ${s.id || '?'}: manca «${campo}».`);
      }
    }
    if (!QUANDO.includes(s.quando)) {
      throw new Error(`Descrittore ${d.id}, strumento ${s.id}: «${s.quando}» non è uno stato noto.`);
    }
  }
  const quanti = d.accetta?.quanti;
  if (!Number.isInteger(quanti) || quanti < 1) {
    throw new Error(`Descrittore ${d.id}: «accetta.quanti» deve essere un intero ≥ 1.`);
  }
}
