/**
 * Il vettoriale, dichiarato.
 *
 * ⚠️ **Il committente aveva chiesto che il tasto «visualizzi l'immagine e
 * consigli cosa modificare». L'AI è rimandata (spec § 3), quindi il consiglio
 * non si finge.** Al suo posto ci sono solo gli avvisi che il codice sa
 * misurare — quanti path, quanto pesa, quanto ha risparmiato, e i controlli di
 * stampa che `engine/ready.js` fa già. È la regola *«dove non c'è una misura
 * non c'è un avviso»* applicata a un caso dove sarebbe stato facile violarla:
 * un modello linguistico che dice «prova ad alzare il contrasto» sembra un
 * consiglio ed è un'opinione senza misura sotto.
 *
 * **Gli strumenti stanno sui due fianchi** (contratto § 7.2): a sinistra come
 * si traccia, a destra cosa farne dopo. Il Vettoriale è l'unico servizio che
 * ne ha troppi per una colonna sola, e schiacciarli tutti a destra avrebbe
 * voluto dire una colonna che scorre — cioè la piega, che il contratto vieta.
 *
 * **«Avanzati» è il cerchio più in basso della colonna destra**: «fra loro»
 * nel senso di *in mezzo agli strumenti*, non sospeso al centro della tela,
 * che è l'unica cosa che l'impianto non permette a nessuno.
 */
export default {
  id: 'vettorializza',
  claim: 'drop.vectorHint',

  /** Un'immagine per volta: il tracciato è su un file solo. */
  accetta: { file: ['image/*'], quanti: 1 },

  tasto: {
    azione: 'catena',
    /** Nessun modello: il tracciato è geometria, non una rete. */
    modelli: [],
    /** I fattori servono: un tracciato si ingrandisce quanto si vuole. */
    fattori: true,
    /*
     * Come interpretare l'immagine. Era un pannello in colonna, e la colonna
     * non c'è più: sta nel punto oro perché risponde alla domanda del posto —
     * «cosa farà il tasto quando lo premo».
     *
     * Le etichette sono quelle che `engine/trace.js` già dichiara.
     */
    opzioni: [
      { id: 'poster', label: 'trace.poster.label' },
      { id: 'photo', label: 'trace.photo.label' },
      { id: 'bw', label: 'trace.bw.label' },
    ],
    predefinita: 'poster',
  },

  strumenti: [
    /*
     * A sinistra: come esce il file. Sono scelte che si fanno prima di
     * premere, e stanno dalla parte da cui si legge. Il TIPO di tracciato non
     * è qui: sta nel punto oro, insieme alle altre risposte a «cosa farà il
     * tasto».
     */
    // Un interruttore, non un comando: alleggerisce il file che uscirà. Il
    // cerchio lo dice con `aria-pressed`, che è quello che un interruttore fa.
    { id: 'pulisci', icon: 'alleggerisci', label: 'vector.clean.label', quando: 'con-file', lato: 'sinistra' },

    /* A destra: cosa farne dopo. */
    { id: 'apriEditor', icon: 'pencil', label: 'vector.openEditor', quando: 'con-risultato' },
    { id: 'undo', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
    { id: 'swap', icon: 'swap', label: 'bar.swap', quando: 'con-file-senza-risultato' },
    /*
     * Ultimo della colonna destra, e `sempre`: gli avanzati contengono
     * l'esportazione, che serve anche a piano vuoto per riprendere un lavoro.
     */
    { id: 'avanzati', icon: 'tag', label: 'advanced.title', quando: 'sempre' },
  ],
};
