/**
 * Il righello: un pennello che non trema.
 *
 * Nasce dal difetto che il committente ha descritto il 2026-08-27: «se lo
 * scontorno fallisce totalmente, non vedendo neanche il cerchio, è un incubo
 * rifare a mano». Lo zoom a 8× e la matita da 3 px hanno reso possibile il
 * lavoro fine; questo lo rende **veloce**, che è un'altra cosa.
 *
 * Due modi, dalla stessa matematica, e servono a due guasti diversi:
 *
 * - **binario** — il tratto scorre SULLA guida. Serve a tirare un bordo dritto
 *   o una curva pulita dove il modello ha lasciato una scalinata;
 * - **barriera** — si dipinge liberamente, ma il colore **non passa
 *   dall'altra parte** della guida. Serve al guasto vero, quello del disco
 *   verde: si mette la guida dove il bordo DOVREBBE stare e si riempie di
 *   getto, senza ricalcare niente.
 *
 * La barriera è il modo che risolve il caso raccontato, ed è il motivo per cui
 * questo file esiste. Il binario viene gratis dalla stessa funzione.
 *
 * Tutto puro, su byte e numeri: nessun canvas, nessun evento. È esattamente il
 * tipo di codice che sbaglia di segno e cancella il lavoro di qualcuno senza
 * sollevare niente.
 */

// `stamp` del motore: e' l'unico pennello del prodotto. Ce n'erano due — questo
// e una `pennella` scritta per la home — e sono stati collassati il 2026-08-28,
// perche' due pennelli divergono al primo ritocco di uno solo e i bordi
// smettono di combaciare fra studio e home.
import { stamp } from './brush.js';

/**
 * La guida è una curva di Bézier quadratica: due estremi e un punto di
 * controllo.
 *
 * Non due curve separate «riga» e «curva»: un righello dritto è una curva il
 * cui controllo sta esattamente a metà. Tenerne una sola significa che
 * raddrizzare e incurvare sono lo stesso gesto, e che non esiste uno stato in
 * cui il codice non sa quale delle due ha in mano.
 */
export function guidaDritta(a, b) {
  return { a, b, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

/** Il punto della curva al parametro `t`. */
export function puntoDellaGuida({ a, b, c }, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * Quanti campioni per cercare il punto più vicino.
 *
 * 64 più un affinamento locale: su una guida lunga mille pixel sono sedici
 * pixel fra un campione e l'altro, e l'affinamento chiude il resto. Cercare
 * la soluzione esatta di una cubica per ogni pixel del pennello costerebbe
 * più della pennellata.
 */
const CAMPIONI = 64;

/**
 * Il punto della guida più vicino a `p`, e da che parte sta `p`.
 *
 * `lato` è il segno del prodotto vettoriale fra la tangente e il vettore verso
 * il punto: **+1 e −1 non hanno un significato assoluto**, dicono solo che due
 * punti stanno dalla stessa parte o da parti opposte. È tutto ciò che serve
 * alla barriera, e legarli a «sopra/sotto» sarebbe falso su una curva che si
 * piega.
 */
export function puntoPiuVicino(guida, p) {
  let miglioreT = 0;
  let migliore = Infinity;

  const prova = (t) => {
    const q = puntoDellaGuida(guida, t);
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < migliore) {
      migliore = d;
      miglioreT = t;
    }
  };

  for (let i = 0; i <= CAMPIONI; i++) prova(i / CAMPIONI);
  // Affinamento attorno al campione vincente, con passi sempre più corti.
  let passo = 1 / CAMPIONI;
  for (let giro = 0; giro < 12; giro++) {
    passo /= 2;
    prova(Math.max(0, miglioreT - passo));
    prova(Math.min(1, miglioreT + passo));
  }

  const q = puntoDellaGuida(guida, miglioreT);
  const t = miglioreT;
  const u = 1 - t;
  // Tangente = derivata della quadratica.
  const tang = {
    x: 2 * u * (guida.c.x - guida.a.x) + 2 * t * (guida.b.x - guida.c.x),
    y: 2 * u * (guida.c.y - guida.a.y) + 2 * t * (guida.b.y - guida.c.y),
  };
  const cross = tang.x * (p.y - q.y) - tang.y * (p.x - q.x);

  return {
    punto: q,
    t,
    distanza: Math.sqrt(migliore),
    // Zero solo esattamente sulla guida: un punto sulla linea non appartiene a
    // nessuna delle due parti, e la barriera lo lascia stare.
    lato: cross > 0 ? 1 : cross < 0 ? -1 : 0,
  };
}

/**
 * Una pennellata guidata.
 *
 * `modo`:
 * - `'binario'` — il centro del tratto viene proiettato sulla guida prima di
 *   dipingere. La mano può tremare quanto vuole;
 * - `'barriera'` — si dipinge dove sta la mano, ma **solo** dai pixel che
 *   stanno dalla stessa parte del centro del tratto.
 *
 * Restituisce l'alfa, modificato in luogo come `stamp`.
 */
export function pennellaGuidato(alpha, w, h, tratto, guida, { modo = 'barriera' } = {}) {
  const timbra = (x, y) => stamp(alpha, w, h, x, y, tratto.raggio, tratto.valore);

  if (!guida) return timbra(tratto.x, tratto.y);

  if (modo === 'binario') {
    const { punto } = puntoPiuVicino(guida, { x: tratto.x, y: tratto.y });
    return timbra(punto.x, punto.y);
  }

  // Barriera: si dipinge su una copia e si riporta solo la metà buona. Costa
  // una copia del quadrato del pennello, non dell'immagine.
  const { raggio } = tratto;
  const x0 = Math.max(0, Math.floor(tratto.x - raggio));
  const x1 = Math.min(w - 1, Math.ceil(tratto.x + raggio));
  const y0 = Math.max(0, Math.floor(tratto.y - raggio));
  const y1 = Math.min(h - 1, Math.ceil(tratto.y + raggio));

  const nostro = puntoPiuVicino(guida, { x: tratto.x, y: tratto.y }).lato;
  const prima = new Uint8ClampedArray((x1 - x0 + 1) * (y1 - y0 + 1));
  const larg = x1 - x0 + 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) prima[(y - y0) * larg + (x - x0)] = alpha[y * w + x];
  }

  timbra(tratto.x, tratto.y);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const lato = puntoPiuVicino(guida, { x, y }).lato;
      // Un pixel esattamente sulla guida (lato 0) non si tocca: è il confine,
      // e ridipingerlo farebbe sbavare la barriera di un pixel a ogni passata.
      if (lato !== nostro) alpha[y * w + x] = prima[(y - y0) * larg + (x - x0)];
    }
  }
  return alpha;
}

/**
 * Quale maniglia si sta afferrando.
 *
 * Tre, e tre bastano: gli estremi allungano e ruotano in un gesto solo, la
 * maniglia di mezzo incurva, e il corpo della linea sposta tutto. È la
 * divisione che il committente ha chiesto — «se si prende in centro si sposta,
 * si possono prendere gli estremi e modificarlo» — con l'aggiunta della
 * maniglia di curvatura, che senza un pallino suo non si scopre mai.
 */
export function maniglia(guida, p, { presa = 12 } = {}) {
  const vicino = (q) => Math.hypot(q.x - p.x, q.y - p.y) <= presa;
  if (vicino(guida.a)) return 'a';
  if (vicino(guida.b)) return 'b';
  if (vicino(puntoDellaGuida(guida, 0.5))) return 'curva';
  if (puntoPiuVicino(guida, p).distanza <= presa) return 'corpo';
  return null;
}

/**
 * Sposta una maniglia, restituendo una guida nuova.
 *
 * Non muta: una guida è piccola, e uno stato che cambia sotto i piedi mentre
 * si trascina è il modo più veloce per avere un annulla che non funziona.
 *
 * Spostando un estremo il punto di controllo **segue a metà**: senza, tirando
 * un estremo la curva si deforma in modo che nessuno si aspetta. Un righello
 * dritto tirato per un capo resta dritto.
 */
export function spostaManiglia(guida, quale, d) {
  const piu = (q) => ({ x: q.x + d.x, y: q.y + d.y });
  switch (quale) {
    case 'a':
      return { ...guida, a: piu(guida.a), c: { x: guida.c.x + d.x / 2, y: guida.c.y + d.y / 2 } };
    case 'b':
      return { ...guida, b: piu(guida.b), c: { x: guida.c.x + d.x / 2, y: guida.c.y + d.y / 2 } };
    case 'curva':
      // Il controllo si sposta del DOPPIO: il punto a metà curva sta a metà
      // strada fra la corda e il controllo, quindi trascinandolo di dieci
      // pixel la curva ne seguirebbe cinque, e il pallino scapperebbe da sotto
      // il dito.
      return { ...guida, c: { x: guida.c.x + d.x * 2, y: guida.c.y + d.y * 2 } };
    case 'corpo':
      return { a: piu(guida.a), b: piu(guida.b), c: piu(guida.c) };
    default:
      return guida;
  }
}

/**
 * Un tratto guidato: dal punto precedente a quello attuale.
 *
 * Il pennello dello studio non timbra un punto, traccia una linea fra due
 * posizioni del dito — altrimenti muovendo veloce restano buchi. Questa è la
 * stessa cosa, con la guida che vale a ogni passo.
 *
 * Il passo è **un quarto del raggio**, lo stesso di `stroke` in `brush.js`:
 * più fitto è tempo sprecato, più rado si vede. Tenerlo uguale non è
 * pignoleria — due pennelli che avanzano a passi diversi lasciano due bordi
 * diversi sulla stessa immagine.
 */
export function tracciaGuidata(alpha, w, h, da, a, tratto, guida, opts) {
  const dx = a.x - da.x;
  const dy = a.y - da.y;
  const passo = Math.max(1, tratto.raggio / 4);
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / passo));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pennellaGuidato(alpha, w, h, { ...tratto, x: da.x + dx * k, y: da.y + dy * k }, guida, opts);
  }
  return alpha;
}
