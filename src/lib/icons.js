/**
 * I tracciati delle icone dello studio, tutti in un posto solo.
 *
 * Erano tre insiemi in tre file — barra servizi, barra sopra la tela,
 * cartelle della libreria — con tre tratti diversi e due bug di geometria che
 * nessuno vedeva perché un tracciato che esce dal riquadro non solleva niente,
 * viene solo tagliato. Un'icona sbagliata non rompe nulla e resta sbagliata
 * per sempre: è il motivo per cui stanno insieme e hanno una griglia sola.
 *
 * **La griglia.** Riquadro 24×24, margine di 3 su ogni lato: nessun tracciato
 * esce da 3…21. Tratto 1,75 — non 1,4 come prima: a 17 px un tratto sottile
 * sparisce contro il nero, e queste icone devono leggersi anche quando sono
 * l'unica cosa scritta su un pulsante.
 *
 * **Il filo d'oro.** Con `draw` l'icona si traccia invece di comparire, come
 * se la piuma la stesse disegnando. È il modo più economico di mettere Zack
 * dentro l'interfaccia: nessun video, nessun asset da generare, pesa zero.
 * `pathLength="1"` normalizza ogni tracciato a lunghezza 1, così l'animazione
 * è la stessa per tutti senza misurare niente in JavaScript.
 */

/** Un cerchio esatto, invece dell'arco quasi-chiuso che si usava prima. */
const cerchio = (cx, cy, r) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`;

/** Un punto pieno: si disegna come un cerchio minuscolo, resta visibile a 17px. */
const punto = (cx, cy) => cerchio(cx, cy, 0.9);

/**
 * Ogni icona è una lista di tracciati.
 *
 * Lista e non stringa unica: due tracciati separati si disegnano uno dopo
 * l'altro col filo d'oro, e un'unica stringa con più `M` dentro si
 * disegnerebbe tutta insieme, che è meno leggibile e meno bello.
 */
export const ICONS = {
  // ---- servizi ----------------------------------------------------------
  // Brain: tre idee e i legami fra loro. Un cervello anatomico a 17 px
  // diventa una macchia; tre nodi collegati dicono "riorganizza" e restano
  // leggibili anche piccoli.
  brain: [
    cerchio(7.5, 7.5, 2.6),
    cerchio(17, 7, 2.6),
    cerchio(12, 17.5, 2.6),
    'M10.1 7.3h4.3',
    'M8.6 9.9l2.2 5.2',
    'M15.9 9.4l-2.5 5.7',
  ],
  scissors: [
    'M6.5 4.5l9.5 12.2',
    'M17.5 4.5L8 16.7',
    cerchio(6.3, 18.4, 2.3),
    cerchio(17.7, 18.4, 2.3),
  ],
  vector: [
    'M5.5 18.5C5.5 10.5 18.5 13.5 18.5 5.5',
    'M3.6 16.6h3.8v3.8H3.6z',
    'M16.6 3.6h3.8v3.8h-3.8z',
  ],
  pencil: ['M4.5 19.5l1.2-4.2L15.8 5.2l3 3L8.6 18.3z', 'M13.8 7.2l3 3'],
  image: [
    'M3.5 5h17v14h-17z',
    'M3.5 15.5l4.5-4.5 3.5 3.5 3.2-3.2 5.8 5.8',
    punto(8.2, 9),
  ],
  film: ['M3.5 5h17v14h-17z', 'M8.5 5v14', 'M15.5 5v14', 'M3.5 9.5h5', 'M15.5 9.5h5', 'M3.5 14.5h5', 'M15.5 14.5h5'],
  wave: ['M3.5 12h2', 'M8 7.5v9', 'M12 4v16', 'M16 8.5v7', 'M18.5 12h2'],

  // ---- il tasto Zack ----------------------------------------------------
  // La piuma. È l'unico oggetto del canone che entra nell'interfaccia come
  // segno, ed è quello giusto: è il potere del personaggio, non la sua faccia.
  feather: [
    // Il vessillo: due curve che si toccano sulla punta e sulla base, con il
    // calamo che esce sotto. La versione precedente era una sola foglia
    // simmetrica e si leggeva come una foglia — la piuma è asimmetrica, ha una
    // punta affilata e un fusto che la attraversa fino in fondo.
    'M20 3.8C12.8 5.2 8.4 8.4 7 12.9c-.6 2-.5 3.6.1 4.9',
    'M20 3.8c-.7 6.6-3.1 10.8-6.9 13.1-1.8 1.1-3.8 1.4-5.9.9',
    'M20 3.8L6.6 17.7',
    'M6.6 17.7L3.6 20.6',
    'M12.4 11.9l3.1 1',
  ],

  // ---- oggetti di Brain -------------------------------------------------
  nota: ['M4.5 4.5h15v10.5l-4.5 4.5h-10.5z', 'M19.5 15h-4.5v4.5'],
  freccia: ['M3.5 20C7.5 10.5 13.5 5.5 20.5 4.5', 'M20.5 4.5l-5.3 1', 'M20.5 4.5l-1 5.3'],
  gruppo: [cerchio(12, 12, 8.3), punto(9, 11), punto(13.5, 9.8), punto(11.8, 14.5)],

  // ---- i cinque bollini -------------------------------------------------
  stella: ['M12 3.4l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9z'],
  domanda: ['M8.6 8.8a3.5 3.5 0 1 1 4.8 3.3c-1 .4-1.4 1.2-1.4 2.3v.6', punto(12, 18.3)],
  spunta: ['M4.5 12.5l5 5.2L19.5 6.5'],
  croce: ['M6 6l12 12', 'M18 6L6 18'],
  fuoco: ['M12 3.2s5 4.6 5 9.1a5 5 0 0 1-10 0c0-2 1-3.6 1-3.6s.1 2.6 2.1 2.6c1.5 0 .9-4.1.9-8.1z'],

  // ---- barra sopra la tela ----------------------------------------------
  // L'annulla vecchio finiva a y=24: la curva usciva dal riquadro e veniva
  // tagliata a metà senza che nessuno se ne accorgesse.
  undo: ['M9 6.5L4 11.5l5 5', 'M4 11.5h8.5a5 5 0 1 1 0 10H10'],
  // Il righello: una riga con le sue tacche. Non dipinge — guida chi dipinge,
  // ed e' il solo strumento della home che qui non aveva un disegno suo.
  righello: [
    'M3 8h18v8H3z',
    'M7 8v3M11 8v4M15 8v3M19 8v4',
  ],
  eraser: ['M8.5 19.5H4.5l-1.2-4L14 4.8l5.7 5.7-9 9z', 'M10 8.8l5.7 5.7'],
  crop: ['M6.5 3v14.5H21', 'M3 6.5h14.5V21'],
  swap: ['M3.5 8.5h15', 'M14.5 4.5l4 4-4 4', 'M20.5 15.5h-15', 'M9.5 11.5l-4 4 4 4'],
  clear: ['M6 6l12 12', 'M18 6L6 18'],

  // ---- cartelle della libreria ------------------------------------------
  cartella: ['M3.5 5.5h6l2 2h9v11h-17z'],
  maglietta: ['M8.5 4.5l-5 3 2 3.2 2-1.2v10h9v-10l2 1.2 2-3.2-5-3-2 1.8h-3z'],
  personaggio: [cerchio(12, 7.8, 3.4), 'M5 20a7 7 0 0 1 14 0'],
  occhio: ['M3 12s3.8-5.5 9-5.5 9 5.5 9 5.5-3.8 5.5-9 5.5S3 12 3 12z', cerchio(12, 12, 2.4)],
  tag: ['M3.5 12l8.5-8.5h7.5V11L11 19.5z', punto(16.2, 7.3)],
  cerchio: [cerchio(12, 12, 8)],
};
