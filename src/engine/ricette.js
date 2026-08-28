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
import { estimateSeconds, getScale } from './upscale.js';

/**
 * L'attesa di un ingrandimento a fattore fisso.
 *
 * Chiede il numero a `upscale.js` invece di inventarlo: le piastrelle e i
 * secondi per piastrella li conosce quel file, che li ha misurati. Due stime
 * della stessa cosa in due posti divergono al primo cambio di modello, e
 * quella sbagliata resta scritta accanto al pulsante.
 */
function stimaIngrandimento(image, fattore) {
  return estimateSeconds(image.w, image.h, getScale(fattore === 4 ? 'x4' : 'x2'));
}

/**
 * I passi che una catena può contenere.
 *
 * Lista chiusa, e va tenuta chiusa: ogni passo in più è un'altra cosa che può
 * andare storta in silenzio dentro un tasto solo.
 */
export const PASSI = ['scontorna', 'buchi', 'ingrandisci', 'esporta', 'scarica'];

/**
 * I fattori di `ridimensiona`, e quanto moltiplicano.
 *
 * `ingrandisci` non è un fattore: vuol dire «portalo alla misura di stampa», e
 * di quanto lo decide il file. Serviva anche l'altra domanda — «moltiplica per
 * quattro» — perché è quella che il tasto Zack della home fa, ed è quella che
 * il committente ha disegnato nella tavola dei tasti: INGRANDISCI,
 * RIMPICCIOLISCI, 4X, 2X, :2, :4.
 *
 * E perché **lo studio non sapeva rimpicciolire affatto**.
 */
export const FATTORI = { x4: 4, x2: 2, d2: 0.5, d4: 0.25 };

/**
 * Il fattore di un passo `ridimensiona:x4`, o `null` se non è quel passo.
 *
 * Il fattore sta **dentro il nome**, non in un campo accanto: così una catena
 * resta una lista di stringhe, che è la regola scritta qui sopra — «una catena
 * è una lista, non un programma». Un passo con dei parametri di fianco sarebbe
 * il primo passo verso un costruttore di flussi di lavoro, cioè la cosa che
 * stiamo esplicitamente evitando.
 */
export function fattoreDi(passo) {
  if (typeof passo !== 'string') return null;
  const [nome, f] = passo.split(':');
  if (nome !== 'ridimensiona') return null;
  return Object.hasOwn(FATTORI, f) ? FATTORI[f] : null;
}

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
  const pulita = ricetta.filter((p) => {
    if (typeof p !== 'string' || visti.has(p)) return false;
    // Un solo ridimensionamento per catena: sono una SCELTA, non quattro
    // interruttori. `×4` e `:4` insieme farebbero aspettare mezzo minuto per
    // tornare esattamente da dove si è partiti.
    if (fattoreDi(p) !== null) {
      if (visti.has('ridimensiona')) return false;
      visti.add('ridimensiona');
      visti.add(p);
      return true;
    }
    if (!PASSI.includes(p)) return false;
    visti.add(p);
    return true;
  });

  // `ingrandisci` e `ridimensiona` rispondono alla stessa domanda — «quanto
  // grande?» — e non possono convivere: darebbero due misure d'uscita diverse
  // per lo stesso file. Vince il fattore esplicito, perché `ingrandisci` è il
  // valore di fabbrica e `ridimensiona:x4` è la scelta di qualcuno.
  if (visti.has('ridimensiona')) return pulita.filter((p) => p !== 'ingrandisci');
  return pulita;
}

/**
 * Accende o spegne un passo, **senza perdere quelli che non sa nominare**.
 *
 * Il difetto che questa funzione impedisce (2026-08-28): il pannello «Cosa
 * farà» ricostruiva la ricetta filtrando `PASSI`, che è una lista **chiusa** e
 * non contiene `ridimensiona:x4`. Bastava una spunta qualsiasi nello studio
 * per cancellare in silenzio la scelta fatta sulla home — e non si sarebbe
 * visto subito: si scopre quando il file esce della misura sbagliata.
 *
 * L'ordine di `PASSI` decide l'ordine delle spunte, non quello dei clic: una
 * catena che si riordina da sola a ogni tocco sarebbe imprevedibile. I passi
 * con un fattore si riattaccano in fondo, e non importa dove: l'ordine di
 * esecuzione lo decide `pianoZack`, non questa lista.
 */
export function commutaPasso(ricetta, passo) {
  const conFattore = ricetta.filter((p) => fattoreDi(p) !== null);
  const acceso = ricetta.includes(passo);
  const base = acceso
    ? ricetta.filter((p) => p !== passo && PASSI.includes(p))
    : PASSI.filter((p) => p === passo || ricetta.includes(p));
  return [...base, ...conFattore];
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

  /*
   * Il ridimensionamento a fattore fisso.
   *
   * Due mestieri diversi sotto lo stesso passo, e la differenza si vede
   * nell'attesa: **ingrandire passa dal modello** e costa secondi veri;
   * **rimpicciolire è una riscrittura di pixel** e non costa niente. Dirlo
   * insieme sarebbe comodo e falso, e qui l'attesa dichiarata è una promessa.
   */
  const passoRid = scelti.find((p) => fattoreDi(p) !== null);
  if (passoRid) {
    const f = fattoreDi(passoRid);
    out = {
      // Mai sotto un pixel: un'immagine da zero pixel non è piccola, è rotta.
      w: Math.max(1, Math.round(image.w * f)),
      h: Math.max(1, Math.round(image.h * f)),
    };
    if (f > 1) {
      scaleId = f === 4 ? 'x4' : 'x2';
      secondi += stimaIngrandimento(image, f);
    }
    passi.push(passoRid);
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
