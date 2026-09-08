/**
 * Il vocale, dichiarato.
 *
 * ⚠️ L'`id` è **`suono`**, non «vocale»: è la chiave che `App.jsx` usa in
 * `tool === 'suono'` e che `services.js` dichiara. Registrato con l'altro
 * nome, `DESCRITTORI[tool]` non l'avrebbe mai trovato — e il servizio
 * sarebbe restato fuori dall'impianto senza che niente si lamentasse. Il
 * file si chiama `vocale.js` perché è il nome della sezione per chi la usa;
 * l'`id` è il nome che il codice conosce già, e cambiarlo sarebbe stato un
 * rinominare travestito da aggiungere.
 *
 * Il `+` dà due scelte perché sono due gesti diversi: **registrare** apre il
 * microfono, **aggiungere** prende un file che hai già. Metterli in uno solo
 * avrebbe voluto dire scegliere al posto dell'utente quale dei due intendeva.
 *
 * Il tasto imposta i filtri dalla descrizione scritta in basso, con
 * `engine/dizionarioVoce.js`: locale, istantaneo, e onesto su ciò che non ha
 * capito. Niente modelli, quindi niente attesa e niente costo.
 */
export default {
  id: 'suono',
  claim: 'sound.claim',

  /*
   * Tre voci, non due. Le prime due sono i due gesti del contratto § 7.3 —
   * registrare apre il microfono, aggiungere prende una voce che hai gia'.
   *
   * La terza c'e' perche' il servizio ha DUE meta': la voce, e il laboratorio
   * degli effetti sintetizzati (`engine/synth.js`), che non ha bisogno di
   * nessuna registrazione. Senza questa voce, entrando nell'impianto il
   * laboratorio sarebbe sparito dietro un «prima registra qualcosa» che non
   * gli serve — una funzione persa in silenzio mentre si sistemava la
   * schermata.
   */
  accetta: { menu: ['registra', 'aggiungi', 'effetto'], quanti: 1 },

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
