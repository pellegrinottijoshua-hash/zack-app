/**
 * I tre gesti sul filmato: taglia, ritaglia, estrai.
 *
 * **Non è un montaggio.** Sono tre gesti singoli su un file solo — la stessa
 * forma di tutti gli altri strumenti dello studio. Il confine è netto e va
 * tenuto: appena serve una traccia con più clip in fila siamo in Premiere, e
 * Premiere non lo facciamo. Una timeline multi-traccia con il render è il
 * problema più costoso del settore, e ci metterebbe a competere con due
 * prodotti gratuiti fatti da centinaia di persone.
 *
 * Qui c'è solo il conto: quali fotogrammi, in che riquadro, a che passo. Il
 * disegno e la codifica stanno dove c'è il browser.
 */

/** Quanti fotogrammi si possono estrarre in un colpo solo. */
export const MAX_FOTOGRAMMI = 120;

/**
 * Il taglio: da dove a dove, riportato dentro il filmato.
 *
 * Un `da` oltre la fine o un `a` prima del `da` non sollevano niente in un
 * `<video>`: si ottiene un file vuoto, e l'utente scopre di aver perso il
 * lavoro quando lo riapre.
 */
export function taglio(durata, { da = 0, a = null } = {}) {
  if (!Number.isFinite(durata) || durata <= 0) {
    throw new Error('Questo filmato non dichiara una durata.');
  }
  const inizio = Math.max(0, Math.min(durata, Number(da) || 0));
  const fine = Math.max(inizio, Math.min(durata, a == null ? durata : Number(a) || 0));
  if (fine - inizio < 0.04) {
    throw new Error('Un taglio più corto di un fotogramma non contiene niente.');
  }
  return { da: inizio, a: fine, durata: fine - inizio };
}

/**
 * Il riquadro di ritaglio, dentro le misure del filmato.
 *
 * I lati vengono resi pari: i codec video rifiutano un lato dispari, e il
 * rifiuto arriva alla fine della codifica — dopo aver fatto aspettare.
 */
export function riquadro(w, h, { x = 0, y = 0, larghezza = null, altezza = null } = {}) {
  const pari = (n) => Math.max(2, Math.floor(n / 2) * 2);
  const px = Math.max(0, Math.min(w - 2, Math.floor(x)));
  const py = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const pw = pari(Math.max(2, Math.min(w - px, larghezza == null ? w - px : larghezza)));
  const ph = pari(Math.max(2, Math.min(h - py, altezza == null ? h - py : altezza)));
  return { x: px, y: py, w: pw, h: ph };
}

/**
 * Il riquadro che riempie un formato dato, centrato.
 *
 * Serve al «porta a 9:16» che chiunque monti per i social fa dieci volte al
 * giorno. Si ritaglia il lato lungo invece di deformare: una persona
 * schiacciata si vede, una inquadratura più stretta no.
 */
export function riquadroFormato(w, h, rapporto) {
  if (!Number.isFinite(rapporto) || rapporto <= 0) throw new Error('Formato non valido.');
  let larghezza = w;
  let altezza = Math.round(w / rapporto);
  if (altezza > h) {
    altezza = h;
    larghezza = Math.round(h * rapporto);
  }
  return riquadro(w, h, {
    x: Math.round((w - larghezza) / 2),
    y: Math.round((h - altezza) / 2),
    larghezza,
    altezza,
  });
}

/**
 * A che istanti prendere i fotogrammi.
 *
 * `quanti` e non «uno ogni tot secondi»: su una clip di quattro secondi e su
 * una di quattro minuti la stessa cadenza dà due o duecento immagini, e la
 * seconda riempie la libreria senza che nessuno l'abbia chiesto.
 */
export function istanti(durata, quanti = 12) {
  if (!Number.isFinite(durata) || durata <= 0) throw new Error('Questo filmato non dichiara una durata.');
  const n = Math.max(1, Math.min(MAX_FOTOGRAMMI, Math.floor(quanti) || 1));
  if (n === 1) return [durata / 2];
  // Si evitano il primo e l'ultimo istante: il fotogramma a 0 è spesso nero,
  // e quello esatto alla fine può non esistere.
  const passo = durata / (n + 1);
  return Array.from({ length: n }, (_, i) => +(passo * (i + 1)).toFixed(3));
}

/** I formati che si usano davvero, e nient'altro. */
export const FORMATI = [
  { id: 'originale', rapporto: null },
  { id: 'quadrato', rapporto: 1 },
  { id: 'verticale', rapporto: 9 / 16 },
  { id: 'orizzontale', rapporto: 16 / 9 },
  { id: 'ritratto', rapporto: 4 / 5 },
];

export function formato(id) {
  const f = FORMATI.find((x) => x.id === id);
  if (!f) throw new Error(`Formato sconosciuto: ${id}`);
  return f;
}
