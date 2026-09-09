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
     * Gli OTTO strumenti di disegno, a sinistra.
     *
     * Esistevano gia' — `SvgEditor` li dichiara da sempre, testo compreso — ma
     * vivevano in una barra di parole sopra la tela, dentro una schermata a
     * parte (`tool === 'editor'`) che si raggiungeva solo dopo aver tracciato
     * un'immagine e premuto «apri nell'editor». Il committente il 2026-09-09:
     * *«sono spariti tutti gli strumenti»*. Non erano spariti: erano dietro
     * una porta che quasi nessuno apriva.
     *
     * `sempre`, non `con-file`: la tela nasce vuota e ci si disegna sopra
     * subito. E' un foglio, non un ritocco — «il canva vuoto color panna».
     */
    { id: 'select', icon: 'cursore', label: 'tools.select.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'path', icon: 'penna', label: 'tools.pen.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'fhpath', icon: 'pencil', label: 'tools.pencil.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'line', icon: 'linea', label: 'tools.line.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'rect', icon: 'rettangolo', label: 'tools.rect.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'ellipse', icon: 'ellisse', label: 'tools.ellipse.label', quando: 'sempre', lato: 'sinistra' },
    { id: 'text', icon: 'testo', label: 'tools.text.label', quando: 'sempre', lato: 'sinistra' },
    // I nodi si modificano solo dentro un tracciato gia' scelto: il cerchio
    // resta, ma spento finche' non c'e' cosa modificare — lo dice `disabled`.
    { id: 'pathedit', icon: 'nodi', label: 'tools.nodes.label', quando: 'sempre', lato: 'sinistra' },

    /*
     * A sinistra: come esce il file. Sono scelte che si fanno prima di
     * premere, e stanno dalla parte da cui si legge. Il TIPO di tracciato non
     * è qui: sta nel punto oro, insieme alle altre risposte a «cosa farà il
     * tasto».
     */
    // Un interruttore, non un comando: alleggerisce il file che uscirà. Il
    // cerchio lo dice con `aria-pressed`, che è quello che un interruttore fa.
    { id: 'pulisci', icon: 'alleggerisci', label: 'vector.clean.label', quando: 'con-file' },

    /* A destra: cosa farne dopo. */
    /*
     * «Apri nell'editor» non c'e' piu': l'editor E' questa schermata. Era la
     * porta, e la porta e' stata tolta.
     */
    { id: 'tutorial', icon: 'domanda', label: 'tutorial.apri', quando: 'sempre' },
    { id: 'undo', icon: 'undo', label: 'bar.undo', quando: 'sempre' },
    { id: 'swap', icon: 'swap', label: 'bar.swap', quando: 'con-file-senza-risultato' },
    /*
     * Ultimo della colonna destra, e `sempre`: gli avanzati contengono
     * l'esportazione, che serve anche a piano vuoto per riprendere un lavoro.
     */
    { id: 'avanzati', icon: 'tag', label: 'advanced.title', quando: 'sempre' },
  ],
};
