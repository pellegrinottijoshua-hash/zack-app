/**
 * Due dita muovono e ingrandiscono, un dito lavora.
 *
 * La regola trasversale T5 del quaderno, e la condizione perché la penna e lo
 * zoom possano convivere: senza, si contendono lo stesso dito e uno dei due
 * deve sparire — è il motivo per cui oggi lo zoom è affidato a due pulsanti
 * `+` e `−` invece che al gesto che tutti fanno per istinto.
 *
 * Puro apposta, come `pixels.js` e `righello.js`: qui dentro c'è la
 * matematica che sbaglia in silenzio (un centro che salta, un fattore che
 * diverge), e in Node si guarda invece di indovinarla su un telefono.
 *
 * Niente `Math.hypot` sulla distanza zero: due dita nello stesso punto danno
 * fattore 1, non `Infinity`.
 */

export function nuovoGesto() {
  return { dita: new Map() };
}

export function dueDita(g) {
  return g.dita.size >= 2;
}

export function giu(g, { id, x, y }) {
  g.dita.set(id, { x, y });
}

export function su(g, id) {
  g.dita.delete(id);
}

/** I due punti attivi, in ordine stabile. */
function coppia(g) {
  const v = [...g.dita.values()];
  return [v[0], v[1]];
}

function distanza(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return d < 1 ? 1 : d;
}

/**
 * Un dito si muove.
 *
 * Torna `null` con un dito solo — **è il segnale che il gesto è lavoro**, e
 * chi chiama deve dipingere invece di spostare la vista. Con due dita torna
 * lo spostamento del loro centro e il fattore di ingrandimento **di questa
 * mossa** (non assoluto: chi chiama lo moltiplica sulla vista che ha).
 */
export function muove(g, { id, x, y }) {
  if (!g.dita.has(id)) return null;
  if (g.dita.size < 2) {
    g.dita.set(id, { x, y });
    return null;
  }
  const [a1, b1] = coppia(g);
  const prima = { cx: (a1.x + b1.x) / 2, cy: (a1.y + b1.y) / 2, d: distanza(a1, b1) };
  g.dita.set(id, { x, y });
  const [a2, b2] = coppia(g);
  const dopo = { cx: (a2.x + b2.x) / 2, cy: (a2.y + b2.y) / 2, d: distanza(a2, b2) };
  return { dx: dopo.cx - prima.cx, dy: dopo.cy - prima.cy, fattore: dopo.d / prima.d };
}

/**
 * Quanto puo' allontanarsi lo zoom grezzo dai limiti veri prima di essere
 * comunque fermato.
 *
 * Non e' il pavimento vero (quello lo mette `limita`, sulla vista mostrata):
 * e' una banda piu' larga, il cui unico scopo e' impedire che una stretta
 * violenta mandi `z` lontanissimo da `min` (o da `max`), lasciando poi lo
 * schermo muto per piu' raddoppi delle dita mentre `z` grezzo torna dentro
 * la vista (Giro di correzione 2, Nuovo Problema 2).
 *
 * Meta' via (`min/2`, `max*2`): abbastanza stretta da rispondere quasi
 * subito quando il pizzico si inverte, abbastanza larga da non toccare MAI
 * un pan vero che sfiora il pavimento a meta' gesto — i due numeri del Giro
 * di correzione 1 (0.9 e 0.75, con `min=1`) restano ben dentro la banda, e
 * il pan torna esatto dov'era partito.
 */
function bandaGrezza(z, { min = 1, max = 8 } = {}) {
  return Math.min(max * 2, Math.max(min / 2, z));
}

/**
 * Accumula uno spostamento SENZA pinzare ai limiti dichiarati.
 *
 * Serve a chi chiama quando un gesto dura più eventi (il pizzico a due dita
 * è così: un `pointermove` per dito, non uno per gesto): il valore grezzo
 * si accumula per tutta la durata del gesto e si pinza *una sola volta*,
 * con `applica` qui sotto, quando si scrive lo stato mostrato.
 *
 * Pinzare a ogni evento e poi ripartire dal risultato già pinzato è il
 * difetto del giro di correzione 1 (Critico 2): un pavimento toccato per un
 * istante intermedio (il dito che per caso arriva per primo) diventa la
 * nuova base, e un pan puro — che non cambia la distanza fra le dita — non
 * torna più esattamente dove era partito.
 *
 * Non pinza ai limiti veri, ma pinza a una banda molto più larga
 * (`bandaGrezza`, Giro di correzione 2): senza, una stretta che chiude le
 * dita quasi a zero manda `z` grezzo a un valore lontanissimo dal pavimento,
 * e serve poi più di un raddoppio delle dita solo per rientrare in vista —
 * un vuoto morto che chi tocca legge come "il pizzico non risponde più".
 */
export function accumula(grezza, { dx = 0, dy = 0, fattore = 1 } = {}, limiti) {
  return { x: grezza.x + dx, y: grezza.y + dy, z: bandaGrezza(grezza.z * fattore, limiti) };
}

/**
 * La vista dentro i limiti — di zoom, e di geometria.
 *
 * Un ingrandimento fuori scala è un guasto: si pinza. Lo spostamento (`x`,
 * `y`) si pinza sulla geometria VERA del palco (`palco: {w,h}`, le misure
 * visibili dello stage) e della tela (`tela: {w,h}`, le misure NATURALI —
 * non quelle rese — dell'immagine): la tela resa e' sempre larga
 * `palco.w * z` (e' cosi' che la CSS la disegna, anche a 1x — vedi il
 * commento su `MaskBrush.jsx`), alta in proporzione al rapporto di `tela`.
 * Il margine e' meta' dello sconfinamento su ciascun asse: e' lo spazio che
 * serve per portare il bordo lontano della tela a filo col bordo del palco,
 * senza mai scoprire un vuoto oltre — ne' MAI lasciare che la tela esca
 * dalla cornice.
 *
 * **Giro di correzione 2 — corretto un errore del giro precedente:** qui NON
 * si azzera più `x`/`y` quando `z` tocca il pavimento. La ragione data
 * allora — «a 1x l'immagine intera e' visibile, non c'e' niente da
 * spostare» — è falsa in generale: dipende dalla geometria vera (un palco
 * più basso della tela lascia margine anche a 1x), ed era proprio quel
 * azzeramento a togliere l'unico modo che un dito aveva di raggiungere il
 * fondo dell'immagine a 1x, con `touch-action: none` a spegnere lo
 * scorrimento nativo. Il margine geometrico basta da solo: quando la tela
 * combacia col palco (`tela*z <= palco` su un asse) il margine E' zero, e
 * lo spostamento torna a zero DI CONSEGUENZA — non per un caso speciale, e
 * senza salti a metà gesto (Nuovo Problema 3).
 *
 * Senza geometria (`palco`/`tela` mancanti) si pinza solo `z`: e' il caso
 * dei test che non hanno un palco da misurare.
 */
function limita({ x, y, z }, { min = 1, max = 8, palco, tela } = {}) {
  const zl = Math.min(max, Math.max(min, z));
  if (!palco || !tela) return { x, y, z: zl };
  const larghezzaTela = palco.w * zl;
  const altezzaTela = larghezzaTela * (tela.h / tela.w);
  const margineX = Math.max(0, (larghezzaTela - palco.w) / 2);
  const margineY = Math.max(0, (altezzaTela - palco.h) / 2);
  // `|| 0` non `?? 0`: qui serve proprio a normalizzare un -0 (Math.min/max
  // possono tornarlo quando il margine è 0) a 0, non a sostituire un valore
  // assente — un -0 confonderebbe solo chi confronta con `Object.is`.
  return {
    x: Math.min(margineX, Math.max(-margineX, x)) || 0,
    y: Math.min(margineY, Math.max(-margineY, y)) || 0,
    z: zl,
  };
}

/** La vista nuova, dentro i limiti. Un ingrandimento fuori scala è un guasto. */
export function applica(vista, mossa = {}, limiti) {
  return limita(accumula(vista, mossa, limiti), limiti);
}
