/**
 * Gli effetti sonori, dichiarati.
 *
 * **Qui non si registra: si costruisce.** Un whoosh è rumore filtrato con un
 * inviluppo, non un file da cercare in una libreria — la matematica sta in
 * `engine/synth.js`, dove i test la vedono, ed è il motivo per cui il
 * servizio è gratuito.
 *
 * Stava dentro «suono» insieme alla voce, ed erano due mestieri su una
 * schermata sola: chi vuole un tonfo per una clip non ha una voce da
 * trasformare, e chi ha una voce da trasformare non vuole sei manopole di
 * sintesi. Divisi il 2026-09-08.
 *
 * Il microfono serve anche qui, ma per un'altra cosa: **battere un ritmo** che
 * l'effetto poi segue — «tum tum tum» diventa passi di gigante. È il ponte fra
 * i due servizi, non la loro materia in comune.
 */
export default {
  id: 'effetti',
  /** Gira sul computer del cliente: lo paga l'abbonamento, non i crediti. */
  serve: 'abbonamento',
  claim: 'effetti.claim',

  /*
   * Il `+` non prende un file: sceglie una FAMIGLIA da cui partire. È la
   * stessa forma del menu di Brain — su un piano dove non si porta niente, il
   * `+` chiede cosa mettere, non quale file aprire.
   */
  accetta: { menu: ['costruisci', 'ritmo'], quanti: 1 },

  tasto: {
    azione: 'suonaEffetto',
    modelli: [],
    fattori: false,
    /*
     * Le sei famiglie di `engine/synth.js`, nel punto oro: rispondono alla
     * domanda del posto — «cosa farà il tasto quando lo premo».
     *
     * Le etichette sono quelle che le famiglie già dichiarano: due nomi per
     * la stessa cosa sarebbero due stringhe da tradurre, e il giorno che ne
     * cambia una sola nessuno se ne accorge.
     */
    opzioni: [
      { id: 'whoosh', label: 'sound.fam.whoosh' },
      { id: 'impatto', label: 'sound.fam.impatto' },
      { id: 'click', label: 'sound.fam.click' },
      { id: 'vento', label: 'sound.fam.vento' },
      { id: 'passi', label: 'sound.fam.passi' },
      { id: 'ronzio', label: 'sound.fam.ronzio' },
    ],
    predefinita: 'whoosh',
  },

  strumenti: [
    // Un altro suono della stessa famiglia: lo stesso seme dà sempre lo
    // stesso suono, quindi «un altro» è un numero che cambia — non un dado
    // nascosto che rende irripetibile ciò che hai appena trovato.
    { id: 'unAltro', icon: 'fuoco', label: 'sound.altro', quando: 'con-file' },
    { id: 'ritmo', icon: 'wave', label: 'sound.rec', quando: 'con-file' },
    { id: 'salvaEffetto', icon: 'stella', label: 'sound.salva', quando: 'con-file' },
  ],
};
