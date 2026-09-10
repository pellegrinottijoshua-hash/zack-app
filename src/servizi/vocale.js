/**
 * Il vocale, dichiarato.
 *
 * Si chiamava `suono` ed era **due mestieri su una schermata sola**:
 * registrare una voce e trasformarla, e costruire un tonfo da zero. Divisi il
 * 2026-09-08 su decisione del committente — qui resta la voce, gli effetti
 * stanno in `effetti.js`.
 *
 * Il `+` dà due scelte perché sono due gesti diversi: **registrare** apre il
 * microfono, **aggiungere** prende un file che hai già. Metterli in uno solo
 * avrebbe voluto dire scegliere al posto dell'utente quale dei due intendeva.
 * La terza voce, «un effetto», se n'è andata con gli effetti: era li' perché
 * il laboratorio abitava questa schermata, e ora ha la sua.
 *
 * Il tasto imposta i filtri dalla descrizione scritta in basso, con
 * `engine/dizionarioVoce.js`: locale, istantaneo, e onesto su ciò che non ha
 * capito. Niente modelli, quindi niente attesa e niente costo.
 */
export default {
  id: 'vocale',
  /** Gira sul computer del cliente: lo paga l'abbonamento, non i crediti. */
  serve: 'abbonamento',
  claim: 'sound.claim',

  /** I due gesti del contratto § 7.3, e nessun terzo. */
  accetta: { menu: ['registra', 'aggiungi'], quanti: 1 },

  tasto: {
    azione: 'filtriDaDescrizione',
    modelli: [],
    fattori: false,
    /*
     * Da dove parte la voce, prima che la frase la sposti.
     *
     * Sono le sei ricette di `engine/sound.js`, che erano scritte, provate e
     * **irraggiungibili**: nessun componente le nominava, e `sound.apply` non
     * era chiamato da nessuna parte. Il punto oro e' il posto giusto —
     * rispondono alla stessa domanda delle altre pastiglie, «cosa fara' il
     * tasto quando lo premo».
     *
     * Le etichette sono quelle che le ricette gia' dichiarano: due nomi per
     * la stessa cosa sarebbero due stringhe da tradurre, e il giorno che ne
     * cambia una sola nessuno se ne accorge.
     */
    opzioni: [
      { id: 'neutra', label: 'sound.base.neutra' },
      { id: 'gigante', label: 'sound.giant.label' },
      { id: 'vento', label: 'sound.wind.label' },
      { id: 'motore', label: 'sound.engine.label' },
      { id: 'metallo', label: 'sound.metal.label' },
      { id: 'mostro', label: 'sound.monster.label' },
      { id: 'radio', label: 'sound.radio.label' },
    ],
    predefinita: 'neutra',
  },

  strumenti: [
    /*
     * `sound.ascolta` esiste già e dice esattamente questo. Una chiave nuova
     * per la stessa parola avrebbe voluto dire due stringhe da tradurre
     * uguali, e il giorno che ne cambia una sola nessuno se ne accorge.
     */
    { id: 'riascolta', icon: 'wave', label: 'sound.ascolta', quando: 'con-file' },
    // Salvare la VOCE registrata, non il suono lavorato: `sound.salva` è
    // l'altro, e sono due cose diverse (§ Task 5 del piano).
    { id: 'salvaVoce', icon: 'stella', label: 'sound.saveVoice', quando: 'con-file' },
    { id: 'annulla', icon: 'undo', label: 'bar.undo', quando: 'con-file' },
  ],
};
