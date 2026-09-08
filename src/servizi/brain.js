/**
 * Brain, dichiarato.
 *
 * Il `+` ha TRE voci e non quattro: «idea» non è un tipo, è una nota con la
 * categoria «idea» — `CATEGORIE` in `engine/brain.js` è già
 * `idea · task · domanda · riferimento · fatto`. Due tasti che creano lo
 * stesso oggetto avrebbero solo impedito di scoprire le altre quattro.
 *
 * La freccia non è nel `+`: ha bisogno di due oggetti già sulla tela, e una
 * voce che il più delle volte non si può premere non è una voce del `+`.
 */
export default {
  id: 'brain',
  claim: 'brain.claim',

  /** La tela non ha un tetto: quanti ne vuoi. */
  accetta: { menu: ['nota', 'gruppo', 'file'], quanti: 99 },

  tasto: {
    azione: 'riordina',
    modelli: [],
    fattori: false,
    /**
     * Le pastiglie del punto oro: la regola di riordino.
     *
     * Sta nel punto oro per la stessa ragione dei modelli dello scontorno e
     * dei fattori dell'ingrandimento: sono tutte risposte alla domanda «cosa
     * farà il tasto quando lo premo», e quella domanda ha un posto solo.
     */
    opzioni: [
      { id: 'gruppi', label: 'brain.riordina.gruppi' },
      { id: 'tipo', label: 'brain.riordina.tipo' },
      { id: 'compatta', label: 'brain.riordina.compatta' },
      { id: 'frecce', label: 'brain.riordina.frecce' },
    ],
    predefinita: 'gruppi',
  },

  strumenti: [
    { id: 'freccia', icon: 'freccia', label: 'brain.add.arrow', quando: 'con-file' },
    { id: 'annulla', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
  ],
};
