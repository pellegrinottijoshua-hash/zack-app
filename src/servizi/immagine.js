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
     * Le due misure, sul punto oro come i fattori dello scontorno.
     *
     * ⚠️ **Costano uguale**, ed è il motivo per cui la scelta esiste: 2816×1536
     * e 1024×1024 consumano gli stessi 1120 token d'immagine (misurato il
     * 2026-09-10). Non è un piano «pro»: è che la grande ci mette tre secondi
     * in più, e chi ha fretta lo dice.
     */
    opzioni: [
      { id: 'rapida', label: 'immagine.rapida' },
      { id: 'grande', label: 'immagine.grande' },
    ],
    predefinita: 'grande',
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
