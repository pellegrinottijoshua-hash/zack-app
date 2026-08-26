/**
 * Brain: la tela dove le idee si mettono in ordine.
 *
 * Non è un editor. È il posto dove butti dentro i lavori — immagini, suoni,
 * video — e li disponi finché la disposizione stessa non ti dice qualcosa:
 * questo va con quello, questi tre sono la stessa collezione, questo l'ho
 * fatto partendo da quello. È il ciclo dei riferimenti dichiarato «il cuore»
 * del prodotto, che finora non aveva un posto dove accadere.
 *
 * **Qui niente ha una misura.** È la riga che separa Brain dalla tela di
 * composizione: là si allinea al pixel e si esporta a 4000 px, qui si mette
 * storto e va bene. Se qualcuno chiede «allinea a sinistra» o «esporta a
 * misura», sta chiedendo l'altra tela.
 *
 * Tutto puro: coordinate e liste, nessun canvas. La tela vera disegna, questa
 * parte decide — ed è quella che può sbagliare in silenzio, spostando un
 * oggetto di mille pixel senza che nulla sollevi un errore.
 */

import { newId, cleanNote, FOLDER_COLORS } from '../store/model.js';

/** Cosa può stare su una tela. Lista chiusa: sei oggetti, non venti. */
export const TIPI = ['asset', 'nota', 'cerchio', 'freccia'];

/**
 * I colori delle note.
 *
 * Sono gli stessi delle cartelle, e non è pigrizia: due insiemi di colori per
 * due cose che l'utente percepisce come «etichette» produrrebbero un giallo
 * che nella libreria significa una cosa e in Brain un'altra. Se servono
 * tinte più distinguibili a colpo d'occhio, è una decisione di marchio — la
 * palette JAYL è nero, panna, grigio e oro, e aggiungere una tinta è una cosa
 * che si decide, non che scivola dentro da un pannello di note.
 */
export const COLORI = FOLDER_COLORS;

/** Misure di partenza. Si ridimensiona a mano: questi sono solo l'inizio. */
export const MISURE = {
  asset: { w: 180, h: 180 },
  nota: { w: 200, h: 120 },
  cerchio: { w: 320, h: 240 },
};

const numero = (v, standard = 0) => (Number.isFinite(v) ? v : standard);

/** Un lavoro della libreria messo sulla tela. */
export function nuovoAsset({ assetId, x = 0, y = 0, rand = Math.random }) {
  if (!assetId) throw new Error('Un oggetto asset senza lavoro dietro non esiste.');
  return { id: newId(rand), t: 'asset', assetId, x: numero(x), y: numero(y), ...MISURE.asset };
}

/** Una nota: il motivo per cui questa tela esiste più della moodboard. */
export function nuovaNota({ testo = '', colore = COLORI[0], x = 0, y = 0, rand = Math.random }) {
  return {
    id: newId(rand),
    t: 'nota',
    testo: cleanNote(testo),
    colore: COLORI.includes(colore) ? colore : COLORI[0],
    x: numero(x),
    y: numero(y),
    ...MISURE.nota,
  };
}

/** Un cerchio che raccoglie un gruppo. È la cartella, ma vista. */
export function nuovoCerchio({ titolo = '', colore = COLORI[0], x = 0, y = 0, rand = Math.random }) {
  return {
    id: newId(rand),
    t: 'cerchio',
    titolo: cleanNote(titolo),
    colore: COLORI.includes(colore) ? colore : COLORI[0],
    x: numero(x),
    y: numero(y),
    ...MISURE.cerchio,
  };
}

/**
 * Una freccia fra due oggetti.
 *
 * Fra **oggetti**, non fra punti: una freccia ancorata a coordinate resta
 * indietro appena sposti ciò che collegava, e una tela piena di frecce
 * scollegate è peggio di una tela senza frecce.
 */
export function nuovaFreccia({ da, a, rand = Math.random }) {
  if (!da || !a) throw new Error('Una freccia ha bisogno di due oggetti.');
  if (da === a) throw new Error('Una freccia che torna su se stessa non dice niente.');
  return { id: newId(rand), t: 'freccia', da, a };
}

/**
 * Ripulisce una tela che arriva dall'archivio.
 *
 * Come per le ricette del tasto Zack: tutto ciò che è salvato può tornare
 * indietro sbagliato. Qui in più si tolgono le frecce **orfane** — quelle che
 * puntano a un oggetto cancellato — perché disegnarle manderebbe la tela in
 * errore mentre l'utente guarda i suoi mesi di lavoro.
 */
export function normalizzaTela(items) {
  if (!Array.isArray(items)) return [];

  const puliti = items.filter(
    (o) => o && typeof o === 'object' && TIPI.includes(o.t) && typeof o.id === 'string',
  );
  const esiste = new Set(puliti.map((o) => o.id));

  return puliti.filter((o) => {
    if (o.t === 'freccia') return esiste.has(o.da) && esiste.has(o.a);
    if (o.t === 'asset') return Boolean(o.assetId);
    return true;
  });
}

/** Sposta un oggetto. Il primo gesto della tela, e quello che si ripete. */
export function muovi(items, id, dx, dy) {
  return items.map((o) => (o.id === id && o.t !== 'freccia' ? { ...o, x: o.x + dx, y: o.y + dy } : o));
}

/** Cambia una proprietà di un oggetto: testo, colore, misura. */
export function aggiorna(items, id, patch) {
  return items.map((o) => {
    if (o.id !== id) return o;
    const next = { ...o, ...patch };
    if ('colore' in patch && !COLORI.includes(patch.colore)) next.colore = o.colore;
    if ('testo' in patch) next.testo = cleanNote(patch.testo);
    if ('titolo' in patch) next.titolo = cleanNote(patch.titolo);
    // Sotto una certa misura un oggetto non si riesce più ad afferrare per
    // ingrandirlo: da lì in poi è perso sulla tela.
    if ('w' in patch) next.w = Math.max(60, numero(patch.w, o.w));
    if ('h' in patch) next.h = Math.max(48, numero(patch.h, o.h));
    return next;
  });
}

/**
 * Toglie un oggetto, e con lui le frecce che lo toccavano.
 *
 * Lasciarle sarebbe un errore che si vede solo al ricaricamento successivo:
 * `normalizzaTela` le butterebbe via in silenzio e l'utente vedrebbe la sua
 * tela cambiata da sola.
 */
export function togli(items, id) {
  return items.filter((o) => o.id !== id && o.da !== id && o.a !== id);
}

/** Porta un oggetto davanti a tutti: l'ordine della lista è l'ordine di disegno. */
export function davanti(items, id) {
  const o = items.find((x) => x.id === id);
  if (!o) return items;
  return [...items.filter((x) => x.id !== id), o];
}

/**
 * Il riquadro che contiene tutto, per l'inquadratura iniziale.
 *
 * Le frecce non hanno misura propria: stanno per definizione fra due oggetti
 * che il riquadro contiene già.
 */
export function riquadro(items) {
  const misurabili = items.filter((o) => o.t !== 'freccia');
  if (misurabili.length === 0) return null;

  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const o of misurabili) {
    if (o.x < l) l = o.x;
    if (o.y < t) t = o.y;
    if (o.x + o.w > r) r = o.x + o.w;
    if (o.y + o.h > b) b = o.y + o.h;
  }
  return { x: l, y: t, w: r - l, h: b - t };
}

/**
 * Dove mettere il prossimo oggetto perché non finisca sopra gli altri.
 *
 * Non è una griglia: è "a destra dell'ultimo, e a capo quando la fila è
 * lunga". Bastano dieci oggetti impilati nello stesso punto per rendere la
 * tela inservibile, e nessuno si mette a spostarli uno per uno.
 */
export function prossimoPosto(items, { perFila = 5, passo = 210 } = {}) {
  const n = items.filter((o) => o.t !== 'freccia').length;
  return { x: (n % perFila) * passo, y: Math.floor(n / perFila) * passo };
}
