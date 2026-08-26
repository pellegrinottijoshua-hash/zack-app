/**
 * Il tasto Zack: la catena di passi che ogni servizio ricorda.
 *
 * Non è una funzione nuova, è «Pronto per la stampa» reso **tuo**. Quel
 * pulsante fa già due gesti in uno — scontorna e ingrandisce a 4000 px — ma è
 * uno solo, fisso, uguale per tutti. Qui la catena è una lista di passi che
 * l'utente accende e spegne, e che il servizio si ricorda.
 *
 * Due regole di fondo, che valgono più delle funzioni:
 *
 * 1. **Prima di premere si sa cosa farà.** `pianoZack` restituisce i passi
 *    veri, la misura d'uscita e i secondi d'attesa, così l'interfaccia li può
 *    scrivere accanto al pulsante. È la stessa promessa di «Pronto per la
 *    stampa» — dove non c'è una misura non c'è un avviso.
 * 2. **Niente rami condizionali.** Una catena è una lista, non un programma.
 *    Se qualcuno chiede un "se… allora", il tasto Zack non è il posto giusto:
 *    è diventato un costruttore di flussi di lavoro, cioè la cosa che stiamo
 *    esplicitamente evitando.
 *
 * Puro: nessun canvas, nessun modello. Decide, non esegue.
 */

import { planReady, TARGET_SIDE, CUTOUT_SECONDS } from './ready.js';

/**
 * I passi che una catena può contenere.
 *
 * Lista chiusa, e va tenuta chiusa: ogni passo in più è un'altra cosa che può
 * andare storta in silenzio dentro un tasto solo.
 */
export const PASSI = ['scontorna', 'buchi', 'ingrandisci', 'esporta', 'scarica'];

/**
 * Quanto costa richiudere i buchi, in secondi.
 *
 * VALORE PROVVISORIO, NON MISURATO (2026-08-26). È due passate sui pixel senza
 * modello, quindi molto meno dello scontorno — ma "molto meno" non è un
 * numero. Va misurato su un file da 4000 px e scritto qui con la data.
 */
export const BUCHI_SECONDI = 1;

/**
 * Le ricette di fabbrica, servizio per servizio.
 *
 * Un tasto che al primo clic non fa niente è un tasto morto: la prima volta
 * che si preme deve succedere la cosa che nove utenti su dieci volevano.
 */
export const RICETTE_DI_FABBRICA = {
  // Il caso raccontato dal committente: file grande, sfondo tolto, e i buchi
  // che lo scontorno apre dentro un logo già richiusi. Lo scaricamento resta
  // spento: un file che parte da solo verso la cartella Download sorprende.
  scontorna: ['scontorna', 'buchi', 'ingrandisci', 'esporta'],
  vettorializza: ['esporta'],
  suono: ['esporta'],
};

/** La ricetta di un servizio che non ne ha una: vuota, non rotta. */
export const RICETTA_VUOTA = [];

/**
 * Ripulisce una ricetta che arriva da fuori (archivio locale, account, file).
 *
 * Tutto ciò che è salvato può tornare indietro sbagliato: una versione
 * vecchia, un passo tolto dal programma, una chiave scritta a mano. Una
 * ricetta con un passo sconosciuto dentro non deve far esplodere il tasto, e
 * nemmeno eseguire qualcosa che l'utente non ha chiesto.
 */
export function normalizza(ricetta) {
  if (!Array.isArray(ricetta)) return RICETTA_VUOTA;
  const visti = new Set();
  return ricetta.filter((p) => {
    if (typeof p !== 'string' || !PASSI.includes(p) || visti.has(p)) return false;
    visti.add(p);
    return true;
  });
}

/**
 * Che cosa farà il tasto, prima di premerlo.
 *
 * @param {string[]} ricetta
 * @param {{w:number,h:number}} image
 * @param {object} [opts]
 * @param {number} [opts.target]  lato lungo desiderato dall'ingrandimento
 * @returns {{passi: string[], scaleId: string|null, out: {w:number,h:number},
 *            secondi: number, raggiunto: boolean, motivo: string|null}}
 */
export function pianoZack(ricetta, image, { target = TARGET_SIDE } = {}) {
  if (!image?.w || !image?.h) throw new Error('Nessuna immagine da preparare.');

  const scelti = normalizza(ricetta);
  const passi = [];
  let secondi = 0;

  if (scelti.includes('scontorna')) {
    passi.push('scontorna');
    secondi += CUTOUT_SECONDS;
  }
  if (scelti.includes('buchi')) {
    passi.push('buchi');
    secondi += BUCHI_SECONDI;
  }

  // L'ingrandimento non è una scelta libera: quanto e se ingrandire lo decide
  // già `planReady`, che conosce le scale del modello e il bersaglio di
  // stampa. Ripetere quella decisione qui significherebbe due risposte diverse
  // alla stessa domanda.
  let scaleId = null;
  let out = { w: image.w, h: image.h };
  let raggiunto = true;
  let motivo = null;

  if (scelti.includes('ingrandisci')) {
    const piano = planReady(image, { target, cutout: false });
    scaleId = piano.scaleId;
    out = piano.out;
    raggiunto = piano.reached;
    motivo = piano.reason;
    if (piano.steps.includes('upscale')) {
      passi.push('ingrandisci');
      secondi += piano.seconds;
    }
  }

  if (scelti.includes('esporta')) passi.push('esporta');
  if (scelti.includes('scarica')) passi.push('scarica');

  return { passi, scaleId, out, secondi, raggiunto, motivo };
}

/**
 * Due catene sono la stessa catena?
 *
 * Serve a «Zack può ricordarlo»: la proposta compare solo quando l'utente ha
 * rifatto a mano la stessa sequenza, e non deve comparire quando ha rifatto
 * quella che già ha.
 */
export function stessaRicetta(a, b) {
  const x = normalizza(a);
  const y = normalizza(b);
  return x.length === y.length && x.every((p, i) => p === y[i]);
}
