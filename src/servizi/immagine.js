/**
 * «Immagine»: il primo servizio che costa denaro.
 *
 * Il `+` non accetta un file da scontornare — accetta **riferimenti**, cioè
 * asset della libreria che entrano nella generazione. È la promessa che la
 * home fa da settimane e che nessun servizio manteneva: «ritagli un
 * personaggio una volta e diventa un ingrediente».
 *
 * ⚠️ I limiti dei riferimenti NON stanno qui: stanno nel listino, che è
 * l'unico posto che sa cosa accetta il fornitore. Scriverli in due posti vuol
 * dire vederli divergere al primo fornitore nuovo, e allora si addebita una
 * richiesta che il fornitore rifiuta.
 *
 * ⚠️ **`accetta.menu` e `accetta.quanti`, qui sotto, SONO quella scrittura in
 * due posti** — letterali copiati a mano da `limitiDi('immagine-nbp')`, non
 * calcolati. Restano letterali apposta: i descrittori sono dati puri (nessun
 * import di logica), un'invariante di questo progetto, e importare `limitiDi`
 * qui dentro la romperebbe per risparmiare due righe. A tenere la copia
 * onesta con l'originale ci pensa un test — `test/preventivo.test.js`, «i
 * limiti duplicati in «accetta» restano uguali a quelli del listino» — che
 * diventa rosso se uno dei due cambia senza l'altro.
 */
export default {
  id: 'immagine',
  claim: 'immagine.claim',

  /** Lo paga il saldo, non l'abbonamento: si usa anche senza abbonarsi. */
  serve: 'saldo',

  /** La voce di listino che dice quanto costa e quanti riferimenti accetta. */
  listino: 'immagine-nbp',

  accetta: { menu: ['personaggio', 'oggetto', 'stile'], quanti: 14 },

  tasto: {
    azione: 'generaImmagine',
    modelli: [],
    fattori: false,
    /*
     * Due domande, due gruppi: quanto grande e di che forma.
     *
     * Le pastiglie «rapida/grande» sono sparite dalla schermata (decisione
     * del committente, 2026-09-15): stavano sopra la tela e rispondevano a
     * una domanda che il punto oro fa già per tutti gli altri servizi.
     *
     * ⚠️ Gli `id` dei formati sono le stesse chiavi di `LISTINO['immagine-nbp']
     * .formati`, e una prova (`test/formati.test.js`) diventa rossa se uno dei
     * due elenchi cambia senza l'altro: offrire una forma che il fornitore non
     * conosce vuol dire addebitare una richiesta che poi rimbalza.
     */
    gruppi: [
      {
        id: 'misura',
        label: 'immagine.misura.title',
        // ⚠️ Costano uguale, ed è il motivo per cui la scelta esiste: 2816×1536
        // e 1024×1024 consumano gli stessi 1120 token d'immagine (misurato il
        // 2026-09-10). Non è un piano «pro»: è che la grande ci mette tre
        // secondi in più, e chi ha fretta lo dice.
        predefinita: 'grande',
        opzioni: [
          { id: 'rapida', label: 'immagine.misura.1k' },
          { id: 'grande', label: 'immagine.misura.2k' },
        ],
      },
      {
        id: 'formato',
        label: 'immagine.formato.title',
        // Quadrato: è la forma che non scontenta nessuno finché non si
        // sceglie, e l'unica che stava bene in tutt'e due i posti dove
        // l'immagine finisce (la tela e la libreria).
        predefinita: '1:1',
        opzioni: [
          { id: '1:1', label: 'immagine.formato.1_1' },
          { id: '9:16', label: 'immagine.formato.9_16' },
          { id: '16:9', label: 'immagine.formato.16_9' },
          { id: '4:5', label: 'immagine.formato.4_5' },
          { id: '5:4', label: 'immagine.formato.5_4' },
          { id: '3:4', label: 'immagine.formato.3_4' },
          { id: '4:3', label: 'immagine.formato.4_3' },
          { id: '2:3', label: 'immagine.formato.2_3' },
          { id: '3:2', label: 'immagine.formato.3_2' },
          { id: '21:9', label: 'immagine.formato.21_9' },
        ],
      },
    ],
  },

  strumenti: [
    // ⚠️ `icon` dev'essere una chiave VERA di `src/lib/icons.js` e `label` una
    // chiave VERA dell'i18n: un'icona inventata disegna il vuoto, una chiave
    // inventata stampa se stessa sullo schermo. `image` e `stella` esistono in
    // ICONS; le label vivono in `it.json`/`en.json`, blocco `immagine`.
    { id: 'riferimenti', icon: 'image', label: 'immagine.riferimenti', quando: 'sempre' },
    { id: 'salva', icon: 'stella', label: 'immagine.salva', quando: 'con-risultato' },
  ],
};
