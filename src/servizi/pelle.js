/**
 * La pelle: cosa si vede su una schermata, e quando.
 *
 * Puro, come `piano.js` e per la stessa ragione: queste sono decisioni capaci
 * di sbagliare **in silenzio** — un comando che non compare mai non solleva
 * niente — e vivevano dentro i ternari delle props di `App.jsx`, dove nessun
 * test poteva vederle. Qui sono dati e funzioni, in Node.
 *
 * Le decisioni vengono dal quaderno (`docs/2026-09-14-bozze-servizi.md`,
 * sezioni H e S) e non si ridiscutono qui.
 */

/** I servizi che mostrano il saldo: quelli che lo spendono, e basta. */
const SPENDONO = new Set(['immagine']);

/**
 * I servizi che hanno uno «stato vuoto» con la mascotte dentro.
 *
 * Brain non ce l'ha: la sua tela vuota è il punto di partenza, non un'attesa.
 * Il vettoriale nemmeno, per la stessa ragione già scritta in `piano.js`.
 */
const HANNO_MASCOTTE = new Set(['scontorna']);

/**
 * Dove sta il `+`.
 *
 * - `'centro'` col piano vuoto: è il gesto con cui si comincia, ed è grande
 *   perché intorno non c'è nient'altro;
 * - `'sinistra'` appena c'è qualcosa: **il piano si legge «entra da sinistra,
 *   esce a destra»** — l'uscita è a destra (T2), e i due non si contendono lo
 *   stesso bordo;
 * - `null` al tetto del servizio: tre file per lo scontorno, novantanove per
 *   Brain. Il tetto lo dice il descrittore, non questa funzione: scriverlo qui
 *   sarebbe la seconda copia di un numero che il `+` e il fornitore devono
 *   leggere uguale.
 */
export function postoDelPiu(tool, { quanti = 0, tetto = 1 } = {}) {
  if (quanti >= tetto) return null;
  return quanti === 0 ? 'centro' : 'sinistra';
}

/** La mascotte è lo stato vuoto: c'è finché non c'è niente sul piano. */
export function mostraMascotte(tool, { quanti = 0 } = {}) {
  return HANNO_MASCOTTE.has(tool) && quanti === 0;
}

/**
 * Il saldo si vede solo dove si spende.
 *
 * ⚠️ Non «da nessuna parte»: il tasto del saldo è **l'unica porta** verso la
 * ricarica, e toglierlo ovunque rifarebbe il difetto peggiore di B2 — il
 * cliente nuovo, con zero crediti, davanti a un vicolo cieco. Qui esce dalla
 * home e da scontorna, e resta dentro i servizi che costano.
 */
export function mostraCrediti(tool) {
  return SPENDONO.has(tool);
}

/**
 * Questo servizio si vede nella fila?
 *
 * La fila corta (immagine · scontorna · video) e quella lunga (più vettoriale,
 * vocale, effetti) sono la stessa fila vista da due clienti diversi — e la
 * differenza la fa `serve: 'abbonamento'`, cioè il livello che il servizio
 * dichiara già nell'impianto. Non c'è un secondo elenco: un secondo elenco
 * divergerebbe dal primo al prossimo servizio.
 *
 * ⚠️ **Legata al muro, non all'abbonamento da sola.** Col muro spento — cioè
 * oggi — i cinque strumenti locali funzionano per tutti: nasconderli
 * adesso vorrebbe dire toglierli a chiunque, compreso chi paga, mentre
 * nessuno può nemmeno abbonarsi (il primo ingresso via email è rotto da B1).
 * La fila si accorcia il giorno che il muro si alza, e si accorcia da sola.
 *
 * ⚠️ `immagine` non sparisce mai: è dove si spendono i crediti già comprati,
 * e nasconderla sarebbe un vicolo cieco davanti a soldi del cliente — la
 * stessa forma del difetto peggiore di B2. Un servizio senza descrittore
 * (video, che nell'impianto non è ancora entrato) si vede: è la stessa
 * scelta che fa già `servizioAperto`.
 */
export function mostraInFila(descrittore, { muroAcceso = false, abbonato = false } = {}) {
  if (!muroAcceso) return true;
  if (descrittore?.serve !== 'abbonamento') return true;
  return abbonato;
}
