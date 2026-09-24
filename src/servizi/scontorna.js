/**
 * Lo scontorno, dichiarato.
 *
 * Queste tre cose — cosa accetta il `+`, cosa fa il tasto, quali strumenti —
 * erano sparse dentro `App.jsx` come rami condizionali. Qui sono dati, quindi
 * un test le guarda invece di cercarle.
 */
export default {
  id: 'scontorna',
  /** Gratis per tutti: gira sul computer del cliente, ed è l'amo. */
  serve: 'niente',
  /** La frase sotto il `+` col piano vuoto. Chiave i18n, non testo. */
  claim: 'drop.claim',

  /** Fino a tre: il quarto è l'invito allo studio, come sulla home. */
  accetta: { file: ['image/*'], quanti: 3 },

  /**
   * Il tasto esegue la catena decisa nel punto oro. `azione` è un id e non
   * una funzione: il descrittore è dati, e chi esegue sta in `engine/`.
   */
  tasto: {
    azione: 'catena',
    /** I due offerti qui. Il terzo (illustrazioni) resta nel motore. */
    modelli: ['u2net', 'isnet-general-use'],
    /** Le pastiglie ×4 ×2 :2 :4 nel punto oro. */
    fattori: true,
    /*
     * I passi che il punto oro offre: togli lo sfondo e scarica, e basta
     * (S5, 2026-09-15). «Richiudi i buchi», «porta alla misura di stampa» e
     * «salva in libreria» NON spariscono dal prodotto — restano sotto
     * Avanzati, che è dove l'impianto tiene i gesti di rifinitura. Qui
     * sparisce solo la loro pastiglia, perché il tasto deve rispondere a una
     * domanda sola: cosa fa quando lo premo.
     */
    passi: ['scontorna', 'scarica'],
  },

  /*
   * La colonna destra NON esiste prima di Zack (S2): con un file sul piano
   * non c'è ancora niente da correggere, e cinque cerchi spenti sono cinque
   * domande senza risposta.
   *
   * «Cambia file» se n'è andato: il `+` porta dentro e la × toglie, ed erano
   * già lì accanto. «Recupera» e «togli» sono diventati **una** penna: dentro
   * `MaskBrush` si sceglie già da che parte dipingere, e due cerchi per lo
   * stesso pennello erano due nomi per un gesto solo.
   */
  strumenti: [
    { id: 'scarica', icon: 'scarica', label: 'action.export.label', quando: 'con-risultato' },
    { id: 'righello', icon: 'righello', label: 'brush.ruler', quando: 'con-risultato' },
    { id: 'penna', icon: 'pencil', label: 'brush.title', quando: 'con-risultato' },
    { id: 'indietro', icon: 'undo', label: 'bar.undo', quando: 'con-risultato' },
    { id: 'avanti', icon: 'redo', label: 'bar.redo', quando: 'con-risultato' },
  ],
};
