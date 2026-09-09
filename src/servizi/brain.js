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

  /*
   * Quattro voci, e nessun sottomenu.
   *
   * «File» era una sola, e apriva il selettore del computer — ma un file puo'
   * venire anche dalla LIBRERIA, e quella strada stava in un cassetto fisso a
   * sinistra della tela. Il committente il 2026-09-09: quel cassetto, la
   * barra e l'elenco «non servono a nulla», la tela dev'essere vuota.
   *
   * Toglierlo e basta avrebbe chiuso l'unica via per mettere sulla tela un
   * asset che hai gia'. Quindi la via diventa una voce del `+`, che e' dove
   * si va a cercare quando si vuole aggiungere qualcosa.
   */
  accetta: { menu: ['nota', 'gruppo', 'computer', 'libreria'], quanti: 99 },

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

  /*
   * Tre cerchi, e la tela sgombra.
   *
   * «Centra tutto» era un tasto sulla tela ed e' finito qui: su una tela dove
   * ci si puo' perdere e' una via d'uscita, non un vezzo, quindi non va negli
   * avanzati — va dove stanno i comandi, ai lati.
   *
   * Pacco, riapri-pacco e fotografia della tela stanno negli avanzati: sono
   * gesti che si fanno a lavoro finito, non mentre si pensa.
   */
  strumenti: [
    { id: 'freccia', icon: 'freccia', label: 'brain.add.arrow', quando: 'con-file' },
    { id: 'annulla', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
    { id: 'centra', icon: 'centra', label: 'brain.center', quando: 'con-file', lato: 'sinistra' },
    { id: 'avanzati', icon: 'tag', label: 'advanced.title', quando: 'con-file' },
  ],
};
