import scontorna from './scontorna.js';
import brain from './brain.js';
import vocale from './vocale.js';
import effetti from './effetti.js';
import vettorializza from './vettorializza.js';
import { puoiLavorare } from '../engine/licenza.js';

/**
 * I descrittori dei servizi: dove vive il comportamento di ognuno.
 *
 * Puro — nessun canvas, nessun React, nessun DOM — perché è la parte che
 * decide cosa si vede, ed è capace di sbagliare in silenzio: uno strumento
 * che non compare mai non solleva niente. Va dove i test la vedono, in Node.
 * Stessa ragione di `ricette.js`, `holes.js`, `keying.js`.
 */
/*
 * La chiave è l'`id` dentro il descrittore, e un test lo verifica.
 *
 * ⚠️ **Registrare un descrittore È il cablaggio**, non un passo prima: la
 * riga `DESCRITTORI[tool] ? <Piano>` in `App.jsx` è l'interruttore che porta
 * un servizio dentro l'impianto. Registrarne uno prima che i suoi gesti
 * esistano vuol dire cerchi che si accendono e non fanno niente — il difetto
 * del righello del 2026-09-04 — e il test «ogni strumento dichiarato ha un
 * gesto che lo esegue» lo rifiuta, giustamente. Il Vocale (`vocale.js`, id
 * `suono`) entra qui insieme ai suoi gesti, non prima.
 */
export const DESCRITTORI = { scontorna, brain, vocale, effetti, vettorializza };

/**
 * Gli stati in cui uno strumento può comparire. **Lista chiusa.**
 *
 * Chiusa apposta: uno stato nuovo si aggiunge QUI, e allora
 * `strumentiVisibili` sa cosa farne. Uno scritto a mano dentro un descrittore
 * sparirebbe in silenzio — lo strumento non comparirebbe mai, e nessuno
 * saprebbe perché. Per questo `validaDescrittore` lo rifiuta.
 */
export const QUANDO = ['sempre', 'con-file', 'con-risultato', 'con-file-senza-risultato'];

/**
 * I due fianchi su cui uno strumento può stare. **Lista chiusa**, come `QUANDO`.
 *
 * Contratto § 7.2: il Vettoriale tiene gli strumenti sui **due lati**, e la
 * tela resta grande — 390 − 44 − 44 = 302 px. Chi non lo dichiara sta a
 * destra, che è dove stanno da sempre.
 */
export const LATI = ['sinistra', 'destra'];

/**
 * Cosa serve per usare un servizio. **Lista chiusa**, come `QUANDO` e `LATI`.
 *
 * `abbonamento` — gira sul computer del cliente, e l'abbonamento è ciò che lo
 * paga. `saldo` — chiama un fornitore che ci addebita, e a pagarlo sono i
 * crediti: quindi si usa **anche senza abbonamento**, perché quei crediti sono
 * già soldi di chi li ha comprati (decisione del committente, 2026-09-10).
 */
export const SERVE = ['abbonamento', 'saldo'];

/**
 * Questo servizio si può usare adesso?
 *
 * Prende il posto del `chiuso` unico: un muro solo per tutto lo studio
 * chiuderebbe anche la generazione, e chi ha 18 € di credito troverebbe una
 * porta chiusa davanti a soldi suoi.
 *
 * Un `descrittore` assente (`tool` fuori dall'impianto: l'editor, e le altre
 * viste che non hanno un servizio) non è un caso speciale: `?.serve` va a
 * `undefined`, mai uguale a `'saldo'`, e si ricade su `puoiLavorare(stato)` —
 * cioè lo stesso muro di sempre per chi non è nell'impianto.
 */
export function servizioAperto(descrittore, { stato, crediti = 0, prezzo = 0 } = {}) {
  if (descrittore?.serve === 'saldo') return crediti >= prezzo;
  return puoiLavorare(stato);
}

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
  /*
   * Le opzioni del punto oro sono `{id, label}`, non stringhe: la label e' una
   * chiave i18n, e senza di lei il componente condiviso dovrebbe indovinare il
   * prefisso — cioe' avere dentro una regola di UN servizio. Ci ha provato:
   * `t(`brain.riordina.${o}`)` scritto in `Piano.jsx`, e il Vocale avrebbe
   * mostrato «sound.riordina.gigante».
   */
  for (const s of d.strumenti) {
    if (s.lato && !LATI.includes(s.lato)) {
      // Un lato inventato non farebbe comparire lo strumento da nessuna parte,
      // e nessuno saprebbe perche': la stessa ragione di `QUANDO`.
      throw new Error(`Descrittore ${d.id}, strumento ${s.id}: «${s.lato}» non è un lato.`);
    }
  }
  for (const o of d.tasto?.opzioni || []) {
    if (!o?.id || !o?.label) {
      throw new Error(`Descrittore ${d.id}: un'opzione senza «id» o «label».`);
    }
  }
  if (d.tasto?.opzioni && !d.tasto.opzioni.some((o) => o.id === d.tasto.predefinita)) {
    // Una predefinita che non e' fra le opzioni vuol dire nessuna pastiglia
    // accesa all'apertura, e il tasto che fa una cosa che nessuno ha scelto.
    throw new Error(`Descrittore ${d.id}: «${d.tasto.predefinita}» non è fra le opzioni.`);
  }

  const quanti = d.accetta?.quanti;
  if (!Number.isInteger(quanti) || quanti < 1) {
    throw new Error(`Descrittore ${d.id}: «accetta.quanti» deve essere un intero ≥ 1.`);
  }

  if (!SERVE.includes(d.serve)) {
    // Un valore inventato non chiuderebbe e non aprirebbe: lo stesso guasto
    // silenzioso di uno stato fuori da `QUANDO`.
    throw new Error(`Descrittore ${d.id}: «${d.serve}» non è fra ${SERVE.join(', ')}.`);
  }
}
