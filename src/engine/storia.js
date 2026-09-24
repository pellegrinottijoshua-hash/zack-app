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
 * Le funzioni ricevono le pile e restituiscono le pile nuove. `riduciStoria`,
 * in fondo, le mette insieme in un riduttore che `App.jsx` monta con
 * `useReducer`: risultato, storia e futuro sono UN solo stato (Bloccante 1
 * della revisione finale, 2026-09-23).
 */

/** Quante mosse tiene ciascuna pila: otto bastano, più in là si ricomincia. */
export const TETTO = 8;

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

/*
 * ─── Il riduttore: risultato, storia e futuro in UN SOLO stato ────────────
 *
 * Bloccante 1 della revisione finale della fase 1 (2026-09-23). Le tre
 * funzioni qui sopra erano giuste; era sbagliato il modo in cui `App.jsx`
 * le chiamava. `history`, `futuro` e `result` erano TRE `useState`, e per
 * leggerne due insieme `undoResult`/`redoResult` chiamavano il setter
 * dell'uno DENTRO l'updater dell'altro, poi leggevano subito la `mossa`
 * calcolata là dentro. React esegue quell'updater interno sul momento solo
 * se non c'è nient'altro in coda; altrimenti più tardi — e la `mossa` era
 * ancora `null`. Misurato con un clic vero: «Rifai» non cambiava il
 * risultato, lasciava il risultato annullato incastrato nel futuro, ne
 * spingeva un doppione nella storia e non si spegneva più. Il risultato
 * annullato diventava irrecuperabile: il Critico 1 del Task 6, riaperto un
 * piano più su, dove le prove della pila pura non arrivavano.
 *
 * La cura non è un updater più furbo: è togliere la ragione per cui ce ne
 * volevano due. Le tre cose che cambiano insieme diventano UN valore, e una
 * funzione pura decide il valore dopo. `App.jsx` la usa con `useReducer`,
 * che le passa sempre lo stato fresco — anche quando la mossa parte da una
 * catena asincrona iniziata in un render precedente.
 */

/** Lo stato di partenza: niente risultato, niente da annullare né da rifare. */
export const STORIA_VUOTA = Object.freeze({ risultato: null, storia: [], futuro: [] });

/**
 * Lo stato dopo una mossa.
 *
 * Azioni:
 *   - `{ tipo: 'nuovo', risultato }` — un risultato nuovo (Zack, ritocco,
 *     vettoriale, ingrandimento…): quello attuale va in storia (se c'è: il
 *     `null` di partenza NON si impila, Critico 1 del Task 6), il futuro si
 *     svuota.
 *   - `{ tipo: 'indietro' }` — annulla; storia vuota → stato invariato.
 *   - `{ tipo: 'avanti' }` — rifai; futuro vuoto → stato invariato.
 *   - `{ tipo: 'azzera', risultato? }` — file nuovo, piano svuotato, lavoro
 *     ripreso dalla libreria: pile vuote, risultato quello dato (o nessuno).
 *
 * Una mossa che non può fare nulla restituisce LO STESSO oggetto: React
 * allora non ridisegna, e il tasto che l'ha chiesta era già spento.
 */
export function riduciStoria(stato, azione) {
  switch (azione?.tipo) {
    case 'nuovo': {
      const { storia, futuro } = impilaRisultato(stato.storia, stato.risultato);
      return { risultato: azione.risultato, storia, futuro };
    }
    case 'indietro': {
      const mossa = vaIndietro(stato.storia, stato.futuro, stato.risultato);
      return mossa ?? stato;
    }
    case 'avanti': {
      const mossa = vaAvanti(stato.storia, stato.futuro, stato.risultato);
      return mossa ?? stato;
    }
    case 'azzera':
      return { risultato: azione.risultato ?? null, storia: [], futuro: [] };
    default:
      throw new Error(`riduciStoria: azione sconosciuta ${JSON.stringify(azione?.tipo)}`);
  }
}
