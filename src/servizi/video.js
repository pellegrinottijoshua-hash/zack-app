/**
 * Video — Seedance 2.5 (fase 3).
 *
 * Gemello di Immagine: si paga col SALDO, il prezzo sta accanto al tasto
 * prima di premere, e le scelte stanno nel punto oro. La differenza è
 * l'attesa: un video impiega minuti, e il tasto lo dice mentre aspetta.
 *
 * Le liste di durata, risoluzione e formato sono quelle di
 * `engine/listinoVideo.js`: una prova le confronta, perché un'opzione qui
 * che il listino non conosce sarebbe un tasto che il Worker rifiuta (400).
 * Le immagini (fetta 3d): primo/ultimo fotogramma, oppure fino a 9
 * riferimenti — le regole in `listinoVideo.js`, le stesse del Worker.
 */
export default {
  id: 'video',
  claim: 'video.claim',

  serve: 'saldo',

  listino: 'video-seedance25',

  // Il `+` apre il menu dei tre ruoli, come su Immagine.
  accetta: { menu: ['primo', 'ultimo', 'riferimento'], quanti: 9 },

  tasto: {
    azione: 'generaVideo',
    modelli: [],
    fattori: false,
    gruppi: [
      {
        id: 'durata',
        label: 'video.durata.title',
        predefinita: '5',
        opzioni: [
          { id: '5', label: 'video.durata.5' },
          { id: '10', label: 'video.durata.10' },
          { id: '15', label: 'video.durata.15' },
        ],
      },
      {
        id: 'risoluzione',
        label: 'video.risoluzione.title',
        predefinita: '720p',
        opzioni: [
          { id: '480p', label: 'video.risoluzione.480p' },
          { id: '720p', label: 'video.risoluzione.720p' },
          { id: '1080p', label: 'video.risoluzione.1080p' },
        ],
      },
      {
        id: 'formato',
        label: 'video.formato.title',
        predefinita: '16:9',
        opzioni: [
          { id: '16:9', label: 'video.formato.16_9' },
          { id: '9:16', label: 'video.formato.9_16' },
          { id: '1:1', label: 'video.formato.1_1' },
          { id: '4:3', label: 'video.formato.4_3' },
          { id: '3:4', label: 'video.formato.3_4' },
          { id: '21:9', label: 'video.formato.21_9' },
        ],
      },
    ],
  },

  strumenti: [
    { id: 'riferimenti', icon: 'image', label: 'video.riferimenti', quando: 'sempre' },
    { id: 'salva', icon: 'stella', label: 'video.salva', quando: 'con-risultato' },
  ],
};
