/**
 * Lo scontorno, dichiarato.
 *
 * Queste tre cose — cosa accetta il `+`, cosa fa il tasto, quali strumenti —
 * erano sparse dentro `App.jsx` come rami condizionali. Qui sono dati, quindi
 * un test le guarda invece di cercarle.
 */
export default {
  id: 'scontorna',
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
  },

  /*
   * L'ordine è quello del disegno: il righello guida, gli altri due
   * dipingono, l'annulla torna indietro.
   */
  strumenti: [
    { id: 'righello', icon: 'righello', label: 'brush.ruler', quando: 'con-risultato' },
    { id: 'restore', icon: 'pencil', label: 'brush.restore', quando: 'con-risultato' },
    { id: 'erase', icon: 'eraser', label: 'brush.erase', quando: 'con-risultato' },
    { id: 'undo', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
    // Cambiare file ha senso finché non c'è un risultato: dopo, cambiarlo
    // butterebbe via il lavoro senza dirlo.
    { id: 'swap', icon: 'swap', label: 'bar.swap', quando: 'con-file-senza-risultato' },
  ],
};
