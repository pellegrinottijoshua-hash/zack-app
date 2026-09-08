import { MISURE } from './brain.js';

/**
 * Il tasto Zack di Brain: riorganizza la tela.
 *
 * **Puro**, e per una ragione precisa: un riordino sbagliato non solleva
 * niente. Sposta le cose, l'utente guarda, e se il risultato è diverso a
 * ogni pressione non lo preme mai più. Il determinismo qui non è
 * un'eleganza, è la funzione: per questo è la prima cosa che i test
 * provano, su tutte e quattro le regole.
 *
 * La regola la sceglie l'utente nel punto oro, come i modelli e la catena
 * dello scontorno: sono tutt'e due «come deve comportarsi il tasto».
 */

/** Le quattro regole. Lista chiusa: una in più è una decisione. */
export const REGOLE = ['gruppi', 'tipo', 'compatta', 'frecce'];

/** Quanto spazio fra una cosa e l'altra. Un valore solo, per tutte le regole. */
const PASSO = 28;

/** L'ordine dei tipi in «per tipo»: dal più denso di senso al più accessorio. */
const ORDINE_TIPI = ['nota', 'asset', 'cerchio'];

const posizionabili = (items) => items.filter((o) => o.t !== 'freccia');
const larghezza = (o) => o.w ?? MISURE[o.t]?.w ?? 200;
const altezza = (o) => o.h ?? MISURE[o.t]?.h ?? 120;

/**
 * Impagina una lista di righe, ogni riga una fila orizzontale.
 *
 * Tutte e quattro le regole finiscono qui: cambia solo COME si formano le
 * righe. Tenere un impaginatore solo evita che le quattro divergano nello
 * spazio fra gli oggetti — e con quattro copie sarebbe successo.
 */
function impagina(righe) {
  const posizioni = new Map();
  let y = 0;
  for (const riga of righe) {
    let x = 0;
    let alta = 0;
    for (const o of riga) {
      posizioni.set(o.id, { x, y });
      x += larghezza(o) + PASSO;
      alta = Math.max(alta, altezza(o));
    }
    y += alta + PASSO;
  }
  return posizioni;
}

/** Applica le posizioni, lasciando intatto tutto il resto (frecce comprese). */
function applica(items, posizioni) {
  return items.map((o) => (posizioni.has(o.id) ? { ...o, ...posizioni.get(o.id) } : o));
}

/** Una riga per gruppo; chi non ha gruppo va in fondo, cinque per riga. */
function perGruppi(items) {
  const dentro = posizionabili(items);
  const gruppi = new Map();
  const sciolti = [];
  for (const o of dentro) {
    if (o.gruppo) {
      if (!gruppi.has(o.gruppo)) gruppi.set(o.gruppo, []);
      gruppi.get(o.gruppo).push(o);
    } else {
      sciolti.push(o);
    }
  }
  // I gruppi in ordine di nome: è l'unico ordine che non dipende da dove
  // stavano prima, quindi l'unico che non cambia a ogni pressione.
  const righe = [...gruppi.keys()].sort().map((k) => gruppi.get(k));
  for (let i = 0; i < sciolti.length; i += 5) righe.push(sciolti.slice(i, i + 5));
  return righe;
}

/** Una riga per tipo, nell'ordine dichiarato. */
function perTipo(items) {
  const dentro = posizionabili(items);
  return ORDINE_TIPI.map((t) => dentro.filter((o) => o.t === t)).filter((r) => r.length > 0);
}

/**
 * Toglie i buchi SENZA cambiare l'ordine.
 *
 * È il meno invasivo dei quattro, e deve restarlo: chi lo preme vuole
 * ritrovare le sue cose dove le aveva messe, solo più vicine. Se cambiasse
 * anche l'ordine sarebbe «per tipo» con un altro nome.
 */
function compatta(items) {
  const dentro = [...posizionabili(items)].sort((a, b) => a.y - b.y || a.x - b.x);
  const righe = [];
  for (let i = 0; i < dentro.length; i += 4) righe.push(dentro.slice(i, i + 4));
  return righe;
}

/**
 * Segue il verso delle frecce, dall'alto in basso.
 *
 * Chi non è toccato da nessuna freccia finisce in fondo: la tela può essere
 * metà schema e metà archivio, e lo schema non deve trascinarsi dietro
 * l'archivio.
 */
function perFrecce(items) {
  const dentro = posizionabili(items);
  const perId = new Map(dentro.map((o) => [o.id, o]));
  const frecce = items.filter((o) => o.t === 'freccia' && perId.has(o.da) && perId.has(o.a));

  const entranti = new Map(dentro.map((o) => [o.id, 0]));
  for (const f of frecce) entranti.set(f.a, entranti.get(f.a) + 1);

  const righe = [];
  const fatti = new Set();
  let livello = dentro.filter((o) => entranti.get(o.id) === 0);
  while (livello.length > 0) {
    righe.push(livello);
    livello.forEach((o) => fatti.add(o.id));
    const prossimo = [];
    for (const o of dentro) {
      if (fatti.has(o.id) || prossimo.includes(o)) continue;
      // Entra nel livello quando TUTTI quelli che puntano a lui sono già usciti.
      const chiPunta = frecce.filter((f) => f.a === o.id).map((f) => f.da);
      if (chiPunta.length > 0 && chiPunta.every((id) => fatti.has(id))) prossimo.push(o);
    }
    livello = prossimo;
  }
  // Un ciclo fra le frecce lascerebbe qualcuno fuori: va messo comunque, o
  // sparirebbe dalla tela.
  const rimasti = dentro.filter((o) => !fatti.has(o.id));
  if (rimasti.length > 0) righe.push(rimasti);
  return righe;
}

const COME = { gruppi: perGruppi, tipo: perTipo, compatta, frecce: perFrecce };

/**
 * La tela riordinata. Restituisce una lista NUOVA con gli stessi id.
 *
 * Una regola sconosciuta lascia la tela com'è: può arrivare da un archivio
 * vecchio, e spostare le cose a caso sarebbe peggio che non fare niente.
 */
export function riordina(items, regola) {
  if (!Array.isArray(items) || !COME[regola]) return items;
  return applica(items, impagina(COME[regola](items)));
}
