import { newId, cleanNote } from '../store/model.js';
import { ICONA, togli } from './brain.js';

/**
 * Le cartelle di Brain (fase 5c, B5 / B6 / B-f).
 *
 * Un'icona posata su un'altra fa una **cartella**: tiene la faccia della
 * madre (il file su cui hai posato), si rinomina, si annida, ci si entra e
 * se ne esce. Un file in cartella resta nell'archivio per data: la cartella
 * è un modo di guardare la tela, non un posto dove i file traslocano.
 *
 * Il disegno è uno solo: ogni oggetto della tela può avere `in`, l'id della
 * cartella che lo contiene (assente = la tela di fuori). La tela resta UNA
 * lista piatta — si salva, si annulla e si impacchetta com'era — e un livello
 * è solo un filtro su `in`. Tutto puro: è qui che una cartella può finire
 * dentro se stessa senza che niente lo dica.
 */

/** Il livello di un oggetto: `null` è la tela di fuori. */
export const livelloDi = (o) => o?.in ?? null;

/** Le cose su cui si posa: un file o una cartella. Un gruppo non è un'icona. */
export const eIcona = (o) => o?.t === 'asset' || o?.t === 'cartella';

/**
 * Cosa si vede a un livello: gli oggetti che ci stanno, e le frecce che hanno
 * TUTTI E DUE i capi lì. Una freccia che esce dalla cartella si nasconde, non
 * si cancella: torna quando i due capi tornano allo stesso livello.
 */
export function livello(items, dentro = null) {
  const qui = new Set(items.filter((o) => o.t !== 'freccia' && livelloDi(o) === dentro).map((o) => o.id));
  return items.filter((o) => (o.t === 'freccia' ? qui.has(o.da) && qui.has(o.a) : qui.has(o.id)));
}

/** Tutto ciò che sta dentro una cartella, a qualunque profondità. */
export function discendenti(items, id) {
  const fuori = new Set();
  let cerca = [id];
  while (cerca.length > 0) {
    const figli = items.filter((o) => o.t !== 'freccia' && cerca.includes(livelloDi(o)) && !fuori.has(o.id));
    figli.forEach((o) => fuori.add(o.id));
    cerca = figli.filter((o) => o.t === 'cartella').map((o) => o.id);
  }
  return fuori;
}

/**
 * La strada dalla tela di fuori fino a `dentro`: le cartelle, nell'ordine.
 * Una cartella che non c'è più dà la strada vuota — si torna fuori.
 */
export function percorso(items, dentro) {
  const strada = [];
  const visti = new Set();
  let id = dentro;
  while (id) {
    const c = items.find((o) => o.id === id && o.t === 'cartella');
    if (!c || visti.has(id)) return [];
    visti.add(id);
    strada.unshift(c);
    id = livelloDi(c);
  }
  return strada;
}

/** Il livello più vicino che esiste ancora (una cartella tolta ti rimette fuori). */
export function livelloValido(items, dentro) {
  return dentro && percorso(items, dentro).length > 0 ? dentro : null;
}

/**
 * Dove mettere un oggetto che arriva in un livello: accanto agli altri, non
 * sopra. Stessa regola di `prossimoPosto`, contata sul livello.
 */
function postoLibero(items, dentro, { perFila = 5, passo = 170 } = {}) {
  const n = items.filter((o) => o.t !== 'freccia' && livelloDi(o) === dentro).length;
  return { x: (n % perFila) * passo, y: Math.floor(n / perFila) * passo };
}

/** `in` scritto o tolto: un oggetto di fuori non ha il campo, non `in: null`. */
function conLivello(o, dentro) {
  const { in: _via, ...resto } = o;
  return dentro ? { ...resto, in: dentro } : resto;
}

/**
 * Sposta un oggetto in un livello (una cartella, o `null` = fuori), al primo
 * posto libero. Rifiuta — restituisce la tela com'era — se la cartella è
 * l'oggetto stesso o sta dentro di lui: una cartella dentro se stessa
 * sparirebbe dalla tela con tutto quello che tiene.
 */
export function mettiIn(items, id, dentro) {
  const o = items.find((x) => x.id === id);
  if (!o || o.t === 'freccia' || livelloDi(o) === dentro) return items;
  if (dentro && (dentro === id || discendenti(items, id).has(dentro))) return items;
  if (dentro && !items.some((x) => x.id === dentro && x.t === 'cartella')) return items;
  const posto = postoLibero(items, dentro);
  return items.map((x) => (x.id === id ? conLivello({ ...x, ...posto }, dentro) : x));
}

/**
 * Un'icona posata su un'altra (B5).
 *
 * - su una **cartella**: ci entra;
 * - su un **file**: nasce una cartella al posto del file, con la sua faccia
 *   (`faccia` = l'asset della madre) e il suo nome, e dentro ci vanno tutti e
 *   due, la madre per prima.
 *
 * Restituisce `{ items, cartella }` — `cartella` è l'id dove è finito, o
 * `null` se il gesto non vale (stesso oggetto, un gruppo, una cartella su un
 * suo discendente): in quel caso la tela è quella di prima.
 */
export function posaSu(items, id, suId, { nome = '', rand = Math.random } = {}) {
  const preso = items.find((o) => o.id === id);
  const su = items.find((o) => o.id === suId);
  const niente = { items, cartella: null };
  if (!eIcona(preso) || !eIcona(su) || id === suId) return niente;
  if (preso.t === 'cartella' && discendenti(items, id).has(suId)) return niente;

  if (su.t === 'cartella') {
    const dopo = mettiIn(items, id, suId);
    return dopo === items ? niente : { items: dopo, cartella: suId };
  }

  const cartella = conLivello(
    {
      id: newId(rand),
      t: 'cartella',
      titolo: cleanNote(nome),
      faccia: su.assetId,
      x: su.x,
      y: su.y,
      w: ICONA,
      h: ICONA,
    },
    livelloDi(su),
  );
  // La cartella prende il posto della madre nella lista (l'ordine è l'ordine
  // di disegno), e la madre con l'altro file ci finiscono dentro.
  let dopo = items.flatMap((o) => (o.id === suId ? [cartella, o] : [o]));
  dopo = dopo.map((o) => (o.id === suId ? conLivello({ ...o, x: 0, y: 0 }, cartella.id) : o));
  dopo = dopo.map((o) => (o.id === id ? conLivello({ ...o, x: 170, y: 0 }, cartella.id) : o));
  return { items: dopo, cartella: cartella.id };
}

/**
 * Toglie dalla tela un oggetto e, se è una cartella, tutto quello che tiene
 * (B-c: si toglie dalla tela, non si cancella — i file restano nell'archivio
 * e tornano nella pool).
 */
export function togliTutto(items, id) {
  let dopo = items;
  for (const via of [id, ...discendenti(items, id)]) dopo = togli(dopo, via);
  return dopo;
}

/**
 * Applica una trasformazione a UN livello solo e lascia stare il resto: il
 * riordino e l'inquadratura parlano di quello che si vede, e una cartella
 * aperta non deve rimescolare la tela di fuori.
 */
export function suLivello(items, dentro, f) {
  const qui = livello(items, dentro);
  const cambiati = new Map(f(qui).map((o) => [o.id, o]));
  return items.map((o) => cambiati.get(o.id) ?? o);
}

/**
 * L'icona sotto il punto (coordinate della tela), escluso l'oggetto in mano.
 * Il cerchio è il disegno: si conta il raggio, non il quadrato attorno. Fra
 * due sovrapposte vince quella disegnata sopra, cioè l'ultima della lista.
 */
export function iconaSotto(items, x, y, { escluso = null, dentro = null } = {}) {
  for (let i = items.length - 1; i >= 0; i--) {
    const o = items[i];
    if (!eIcona(o) || o.id === escluso || livelloDi(o) !== dentro) continue;
    const r = o.w / 2;
    const dx = x - (o.x + r);
    const dy = y - (o.y + o.h / 2);
    if (dx * dx + dy * dy <= r * r) return o;
  }
  return null;
}
