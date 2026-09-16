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

/** La vista nuova, dentro i limiti. Un ingrandimento fuori scala è un guasto. */
export function applica(vista, { dx = 0, dy = 0, fattore = 1 } = {}, { min = 1, max = 8 } = {}) {
  const z = Math.min(max, Math.max(min, vista.z * fattore));
  return { x: vista.x + dx, y: vista.y + dy, z };
}
