/**
 * Le due pile di «indietro» e «avanti».
 *
 * Modulo puro: niente React, niente `useState` — solo la regola delle due
 * pile, che chi la chiama (`App.jsx`) applica al proprio stato. E' nato dal
 * rilievo Critico 1 della revisione del Task 6 (2026-09-16): la logica viveva
 * intrecciata dentro tre chiusure di `App.jsx`, nessuna prova la guardava, e
 * la botola più grave del compito — l'annulla che porta a una colonna senza
 * risultato, «avanti» compreso, chiusa nella pila `futuro` senza nessun modo
 * di riaprirla — stava esattamente lì. Una prova di sorgente non l'avrebbe
 * vista; una pila pura sì, perché la si interroga senza montare un
 * componente e senza inventare un file finto da scontornare.
 *
 * Le funzioni ricevono le pile e restituiscono le pile nuove: chi tiene lo
 * stato vero (`history`, `futuro`, `result`) resta `App.jsx`.
 */

/** Quante mosse tiene ciascuna pila: otto bastano, più in là si ricomincia. */
const TETTO = 8;

/**
 * Impila un risultato nuovo: la storia cresce, il futuro si svuota.
 *
 * ⚠️ Correzione del Critico 1: un `risultatoDiPrima` che non c'è (`null`,
 * prima del primo Zack) NON si impila. Impilare `null` costruirebbe una
 * storia che, una volta raggiunta con «indietro», porta a `risultato: null`
 * — e siccome ogni strumento della colonna (compreso «avanti») è dichiarato
 * `quando: 'con-risultato'`, la colonna intera sparirebbe proprio nel momento
 * più comune di tutti: un risultato, un annulla.
 */
export function impilaRisultato(storia, risultatoDiPrima) {
  const nuovaStoria = risultatoDiPrima == null ? storia : [...storia, risultatoDiPrima].slice(-TETTO);
  return { storia: nuovaStoria, futuro: [] };
}

/**
 * Indietro: la cima della storia diventa il risultato attuale, e quello di
 * prima va nel futuro.
 *
 * `null` se la storia è vuota: chi chiama non deve fare nulla, il tasto è
 * spento apposta (`disabled`) — un tasto spento è onesto, una botola no.
 */
export function vaIndietro(storia, futuro, risultatoAttuale) {
  if (!storia.length) return null;
  return {
    storia: storia.slice(0, -1),
    futuro: [...futuro, risultatoAttuale].slice(-TETTO),
    risultato: storia[storia.length - 1],
  };
}

/**
 * Avanti: l'esatto contrario di `vaIndietro`.
 *
 * `null` se il futuro è vuoto — stesso motivo di sopra.
 */
export function vaAvanti(storia, futuro, risultatoAttuale) {
  if (!futuro.length) return null;
  return {
    storia: [...storia, risultatoAttuale].slice(-TETTO),
    futuro: futuro.slice(0, -1),
    risultato: futuro[futuro.length - 1],
  };
}
