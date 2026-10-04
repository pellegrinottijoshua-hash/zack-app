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
export const TIPI = ['asset', 'nota', 'cerchio', 'freccia', 'cartella'];

/**
 * Le facce del cast come icone pronte (fase 5c): un file o una cartella può
 * portare la faccia di un personaggio al posto della sua. Sono i ritratti da
 * 96 px che il sito usa già, e la lista è chiusa come quella dei colori.
 */
export const FACCE_CAST = ['zack', 'ant', 'cat', 'moth', 'pigeon', 'seagull'];
export const facciaCast = (id) => (FACCE_CAST.includes(id) ? `/zack/cast/i${id}-96.webp` : null);

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

/**
 * Le categorie di una nota.
 *
 * Il colore da solo non basta e non bastava: cinque tinte del marchio — oro,
 * panna e tre grigi — non si distinguono a colpo d'occhio, e soprattutto non
 * *significano* niente. Una nota gialla è gialla; una nota **Da fare** è una
 * cosa da fare, e si può contare, cercare ed estrarre.
 *
 * Ogni categoria porta con sé il suo colore: si sceglie il senso, non la
 * tinta. Restano cinque perché cinque significati distinti coprono quasi
 * tutto, e il ventunesimo non lo ritrova più nessuno.
 */
export const CATEGORIE = [
  { id: 'idea', colore: '#C4A35A' },
  { id: 'task', colore: '#F5F0E8' },
  { id: 'domanda', colore: '#8A8A85' },
  { id: 'riferimento', colore: '#6E6E6A' },
  { id: 'fatto', colore: '#3D3D3A' },
];

export const categoria = (id) => CATEGORIE.find((c) => c.id === id) || CATEGORIE[0];

/**
 * Il diametro dell'icona di un file (fase 5b, B2): un cerchio con l'immagine
 * centrata, la stessa forma dell'icona output. Uguale per tutti i file —
 * l'icona è il segno del file, non la sua anteprima — e il titolo sta sotto.
 */
export const ICONA = 112;

/** Misure di partenza. Si ridimensiona a mano: questi sono solo l'inizio. */
export const MISURE = {
  asset: { w: ICONA, h: ICONA },
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
export function nuovaNota({ testo = '', cat = CATEGORIE[0].id, x = 0, y = 0, rand = Math.random }) {
  const c = categoria(cat);
  return {
    id: newId(rand),
    t: 'nota',
    testo: cleanNote(testo),
    cat: c.id,
    // Il colore resta nel dato invece di essere calcolato ogni volta: una tela
    // salvata oggi deve restare com'era anche se domani cambiamo una tinta.
    colore: c.colore,
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

  const tenuti = puliti
    .filter((o) => {
      if (o.t === 'freccia') return esiste.has(o.da) && esiste.has(o.a);
      if (o.t === 'asset') return Boolean(o.assetId);
      return true;
    })
    .map(aIcona);
  return fuoriDaCartellePerse(tenuti);
}

/**
 * Un oggetto dentro una cartella che non c'è più — o in un giro di cartelle
 * l'una dentro l'altra, che nessun gesto fa ma un archivio rotto sì — torna
 * sulla tela di fuori. Restare in `in` verso il nulla vorrebbe dire sparire.
 */
function fuoriDaCartellePerse(items) {
  const cartelle = new Map(items.filter((o) => o.t === 'cartella').map((o) => [o.id, o]));
  const arrivaFuori = (o) => {
    const visti = new Set();
    let id = o.in;
    while (id) {
      if (visti.has(id) || !cartelle.has(id)) return false;
      visti.add(id);
      id = cartelle.get(id).in;
    }
    return true;
  };
  return items.map((o) => {
    if (o.in === undefined) return o;
    if (o.t !== 'freccia' && typeof o.in === 'string' && arrivaFuori(o)) return o;
    const { in: _via, ...resto } = o;
    return resto;
  });
}

/**
 * Un file salvato col riquadro di prima (180×180, o ridimensionato a mano)
 * diventa un'icona, con lo STESSO centro: le frecce partono dal centro, e una
 * tela riaperta non deve vedere i suoi file scivolare in alto a sinistra.
 */
function aIcona(o) {
  if (o.t !== 'asset' || (o.w === ICONA && o.h === ICONA)) return o;
  const w = numero(o.w, ICONA);
  const h = numero(o.h, ICONA);
  return { ...o, x: numero(o.x) + (w - ICONA) / 2, y: numero(o.y) + (h - ICONA) / 2, w: ICONA, h: ICONA };
}

/**
 * Le note diventano file (fase 5b, B4): in Brain ci sono solo file, e il
 * titolo e la nota stanno sull'icona. Ma quello che uno ha scritto su una
 * scheda non si butta: ogni nota diventa un `.md`, al suo posto.
 *
 * `daNota` dice quale file scrivere; il testo resta quello della nota, il
 * nome è la sua prima riga (o la categoria, se è vuota).
 */
export function daNota(nota) {
  const testo = String(nota.testo ?? '');
  const prima = testo.split('\n').map((r) => r.replace(/^#+\s*/, '').trim()).find(Boolean);
  const nome = (prima || nota.cat || 'nota').slice(0, 40);
  return { nome, testo };
}

/**
 * La tela con le note sostituite dai loro file. L'oggetto tiene il suo `id`
 * — le frecce che toccavano la nota restano attaccate — e il suo centro.
 * `fatti` è la mappa id-della-nota → id-dell'asset; una nota che non c'è
 * nella mappa resta com'era (la si riprova la volta dopo).
 */
export function noteInFile(items, fatti) {
  return items.map((o) => {
    if (o.t !== 'nota' || !fatti.has(o.id)) return o;
    const { testo, cat, colore, ...resto } = o;
    return aIcona({ ...resto, t: 'asset', assetId: fatti.get(o.id) });
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
    if ('icona' in patch && patch.icona !== null && !FACCE_CAST.includes(patch.icona)) next.icona = o.icona;
    // Cambiare categoria cambia il colore: sono la stessa scelta vista da due
    // lati, e lasciarli scollegati produce una nota "Da fare" color idea.
    if ('cat' in patch) {
      const c = categoria(patch.cat);
      next.cat = c.id;
      next.colore = c.colore;
    }
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
export function prossimoPosto(items, { perFila = 5, passo = 170 } = {}) {
  const n = items.filter((o) => o.t !== 'freccia').length;
  return { x: (n % perFila) * passo, y: Math.floor(n / perFila) * passo };
}
