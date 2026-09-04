/**
 * Il filmato: «uguale a scontorna, solo per i video» (committente,
 * 2026-09-04). Uguale l'IMPIANTO — i tre gesti che già esistono diventano
 * i cerchi, e non se ne inventa nessuno.
 *
 * Il confine resta quello dichiarato in `engine/clip.js`: tre gesti su un
 * file solo, niente montaggio, niente timeline.
 */
export default {
  id: 'filmato',
  claim: 'film.vuotoNota',

  /** Un filmato per volta: i tre gesti sono su un file solo. */
  accetta: { file: ['video/mp4', 'video/webm', 'video/quicktime'], quanti: 1 },

  tasto: { azione: 'catena', modelli: [], fattori: false },

  strumenti: [
    { id: 'taglia', icon: 'crop', label: 'film.taglia', quando: 'con-file' },
    { id: 'fotogrammi', icon: 'film', label: 'film.frames', quando: 'con-file' },
    { id: 'sfondo', icon: 'scissors', label: 'film.sfondo', quando: 'con-file' },
  ],
};
