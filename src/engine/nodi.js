/**
 * Il modello dei nodi di un tracciato (fase 8a, spec `2026-10-05-nodi-design.md`).
 *
 * Un `d` SVG diventa sottopercorsi di nodi, e torna `d`:
 *
 *   { sottopercorsi: [{ chiuso, nodi: [{ x, y, dentro, fuori, liscio }] }] }
 *
 * `dentro` e `fuori` sono le due maniglie del nodo (`{ x, y }` o `null`): il
 * segmento dal nodo i al nodo i+1 è curvo se `nodi[i].fuori` o
 * `nodi[i+1].dentro` c'è, dritto se mancano tutte e due. `liscio` dice che le
 * due maniglie stanno sulla stessa retta: muoverne una muove l'altra.
 *
 * Tutto puro e immutabile: ogni operazione torna un modello nuovo. L'editor
 * (8b) ci disegna sopra e riscrive `d` a ogni movimento.
 *
 * Si leggono `M L H V C S Q T Z`, assoluti e relativi. Gli archi (`A`) no:
 * un tracciato con archi si dichiara non modificabile (`code: 'archi'`)
 * invece di rovinarlo convertendolo male.
 */

const EPS = 1e-6;

const errore = (code) => Object.assign(new Error(code), { code });
const P = (x, y) => ({ x, y });
const uguali = (a, b, eps = 0.01) => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/* ------------------------------ lettura -------------------------------- */

const PARAMETRI = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0, A: 7 };

function gettoni(d) {
  const out = [];
  const re = /([MmLlHhVvCcSsQqTtZzAa])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m;
  while ((m = re.exec(String(d || '')))) out.push(m[1] ? m[1] : Number(m[2]));
  return out;
}

/** Le due maniglie stanno sulla stessa retta, dalle due parti del nodo? */
function allineate(n) {
  if (!n.dentro || !n.fuori) return false;
  const a = P(n.x - n.dentro.x, n.y - n.dentro.y);
  const b = P(n.fuori.x - n.x, n.fuori.y - n.y);
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (la < EPS || lb < EPS) return false;
  // Coseno dell'angolo fra le due direzioni: 1 = stessa retta, stesso verso.
  return (a.x * b.x + a.y * b.y) / (la * lb) > 0.999;
}

/** Un `d` → il modello. Solleva `archi` se ci sono archi, `d-vuoto` se non c'è niente. */
export function leggiPercorso(d) {
  const g = gettoni(d);
  const sottopercorsi = [];
  let corrente = null;
  let punto = P(0, 0);
  let inizio = P(0, 0);
  let ultimoC = null; // seconda maniglia dell'ultimo cubico, per S
  let ultimoQ = null; // maniglia dell'ultimo quadratico, per T
  let i = 0;
  let cmd = null;

  const nuovoNodo = (p, dentro = null) => {
    corrente.nodi.push({ x: p.x, y: p.y, dentro, fuori: null, liscio: false });
  };
  const curva = (c1, c2, p) => {
    corrente.nodi[corrente.nodi.length - 1].fuori = c1;
    nuovoNodo(p, c2);
  };

  while (i < g.length) {
    if (typeof g[i] === 'string') {
      cmd = g[i];
      i += 1;
    } else if (cmd === null) {
      throw errore('d-storto');
    }
    const C = cmd.toUpperCase();
    if (C === 'A') throw errore('archi');
    const rel = cmd !== C;
    const n = PARAMETRI[C];
    if (C === 'Z') {
      if (corrente) {
        corrente.chiuso = true;
        const primo = corrente.nodi[0];
        const ultimo = corrente.nodi[corrente.nodi.length - 1];
        // VTracer (e molti altri) ripetono il primo punto prima della Z: il
        // nodo è uno solo, con la maniglia d'ingresso dell'ultimo segmento.
        if (corrente.nodi.length > 1 && uguali(primo, ultimo)) {
          primo.dentro = ultimo.dentro;
          corrente.nodi.pop();
        }
      }
      punto = inizio;
      ultimoC = null;
      ultimoQ = null;
      cmd = null; // dopo Z serve un comando nuovo
      continue;
    }
    const v = g.slice(i, i + n);
    if (v.length < n || v.some((x) => typeof x !== 'number')) throw errore('d-storto');
    i += n;
    const ox = rel ? punto.x : 0;
    const oy = rel ? punto.y : 0;
    const pt = (a, b) => P(a + ox, b + oy);

    if (C === 'M') {
      corrente = { chiuso: false, nodi: [] };
      sottopercorsi.push(corrente);
      punto = pt(v[0], v[1]);
      inizio = punto;
      nuovoNodo(punto);
      cmd = rel ? 'l' : 'L'; // le coppie dopo una M sono L implicite
      ultimoC = ultimoQ = null;
      continue;
    }
    if (!corrente) throw errore('d-storto');
    // Dopo una Z, un disegno senza M riparte dal punto d'inizio (regola SVG).
    if (corrente.chiuso) {
      corrente = { chiuso: false, nodi: [] };
      sottopercorsi.push(corrente);
      nuovoNodo(inizio);
    }
    if (C === 'L') {
      punto = pt(v[0], v[1]);
      nuovoNodo(punto);
      ultimoC = ultimoQ = null;
    } else if (C === 'H') {
      punto = P(v[0] + ox, punto.y);
      nuovoNodo(punto);
      ultimoC = ultimoQ = null;
    } else if (C === 'V') {
      punto = P(punto.x, v[0] + oy);
      nuovoNodo(punto);
      ultimoC = ultimoQ = null;
    } else if (C === 'C') {
      const c1 = pt(v[0], v[1]);
      const c2 = pt(v[2], v[3]);
      const p = pt(v[4], v[5]);
      curva(c1, c2, p);
      punto = p;
      ultimoC = c2;
      ultimoQ = null;
    } else if (C === 'S') {
      const c1 = ultimoC ? P(2 * punto.x - ultimoC.x, 2 * punto.y - ultimoC.y) : punto;
      const c2 = pt(v[0], v[1]);
      const p = pt(v[2], v[3]);
      curva(c1, c2, p);
      punto = p;
      ultimoC = c2;
      ultimoQ = null;
    } else if (C === 'Q' || C === 'T') {
      const q = C === 'Q' ? pt(v[0], v[1]) : ultimoQ ? P(2 * punto.x - ultimoQ.x, 2 * punto.y - ultimoQ.y) : punto;
      const p = C === 'Q' ? pt(v[2], v[3]) : pt(v[0], v[1]);
      // Un quadratico è un cubico con le maniglie a due terzi verso il controllo.
      curva(lerp(punto, q, 2 / 3), lerp(p, q, 2 / 3), p);
      punto = p;
      ultimoQ = q;
      ultimoC = null;
    }
  }

  const pieni = sottopercorsi.filter((s) => s.nodi.length > 0);
  if (!pieni.length) throw errore('d-vuoto');
  for (const s of pieni) for (const n of s.nodi) n.liscio = allineate(n);
  return { sottopercorsi: pieni };
}

/* ------------------------------ scrittura ------------------------------ */

const num = (x) => {
  const r = Math.round(x * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};
const coppia = (p) => `${num(p.x)} ${num(p.y)}`;

function segmento(da, a) {
  if (!da.fuori && !a.dentro) return `L ${coppia(a)}`;
  return `C ${coppia(da.fuori || da)} ${coppia(a.dentro || a)} ${coppia(a)}`;
}

/** Il modello → un `d` assoluto, con due decimali. */
export function scriviPercorso(modello) {
  return modello.sottopercorsi
    .map(({ chiuso, nodi }) => {
      const parti = [`M ${coppia(nodi[0])}`];
      for (let i = 1; i < nodi.length; i++) parti.push(segmento(nodi[i - 1], nodi[i]));
      if (chiuso) {
        const ultimo = nodi[nodi.length - 1];
        // Il segmento che chiude: se è curvo va scritto, se è dritto lo fa la Z.
        if (nodi.length > 1 && (ultimo.fuori || nodi[0].dentro)) parti.push(segmento(ultimo, nodi[0]));
        parti.push('Z');
      }
      return parti.join(' ');
    })
    .join(' ');
}

/* ------------------------------ operazioni ----------------------------- */

const copia = (m) => ({
  sottopercorsi: m.sottopercorsi.map((s) => ({
    chiuso: s.chiuso,
    nodi: s.nodi.map((n) => ({ ...n, dentro: n.dentro && { ...n.dentro }, fuori: n.fuori && { ...n.fuori } })),
  })),
});

const sposta = (p, dx, dy) => p && P(p.x + dx, p.y + dy);

/** Quanti nodi, in tutto. */
export function contaNodi(m) {
  return m.sottopercorsi.reduce((n, s) => n + s.nodi.length, 0);
}

/** L'indice del nodo dopo `n` nel sottopercorso (o `null` se aperto e ultimo). */
function dopo(s, n) {
  if (n < s.nodi.length - 1) return n + 1;
  return s.chiuso && s.nodi.length > 1 ? 0 : null;
}

/** Quanti segmenti ha un sottopercorso. */
export function segmentiDi(s) {
  return s.chiuso ? s.nodi.length : Math.max(0, s.nodi.length - 1);
}

/** Muovi un nodo: le sue maniglie lo seguono. */
export function muoviNodo(m, { s, n }, dx, dy) {
  const r = copia(m);
  const nodo = r.sottopercorsi[s].nodi[n];
  Object.assign(nodo, { x: nodo.x + dx, y: nodo.y + dy, dentro: sposta(nodo.dentro, dx, dy), fuori: sposta(nodo.fuori, dx, dy) });
  return r;
}

/** Sposta tutto il modello (le traslazioni del tracciato entrano qui). */
export function traslaModello(m, dx, dy) {
  const r = copia(m);
  for (const sp of r.sottopercorsi) {
    for (const n of sp.nodi) Object.assign(n, { x: n.x + dx, y: n.y + dy, dentro: sposta(n.dentro, dx, dy), fuori: sposta(n.fuori, dx, dy) });
  }
  return r;
}

/**
 * Muovi una maniglia a `(x, y)`. Se il nodo è liscio, l'altra maniglia si
 * gira dall'altra parte tenendo la SUA lunghezza (come Illustrator).
 */
export function muoviManiglia(m, { s, n, lato }, x, y) {
  const r = copia(m);
  const nodo = r.sottopercorsi[s].nodi[n];
  nodo[lato] = P(x, y);
  const altro = lato === 'dentro' ? 'fuori' : 'dentro';
  if (nodo.liscio && nodo[altro]) {
    const dir = P(nodo.x - x, nodo.y - y);
    const l = Math.hypot(dir.x, dir.y);
    const lAltro = Math.hypot(nodo[altro].x - nodo.x, nodo[altro].y - nodo.y);
    if (l > EPS) nodo[altro] = P(nodo.x + (dir.x / l) * lAltro, nodo.y + (dir.y / l) * lAltro);
  }
  return r;
}

/** I quattro punti di un segmento (dritto: le maniglie sui suoi estremi). */
function puntiSegmento(sp, i) {
  const a = sp.nodi[i];
  const b = sp.nodi[dopo(sp, i)];
  return [P(a.x, a.y), a.fuori || P(a.x, a.y), b.dentro || P(b.x, b.y), P(b.x, b.y)];
}

/** Un punto del segmento `i` a `t` ∈ [0, 1]. */
export function puntoSu(sp, i, t) {
  const [p0, c1, c2, p3] = puntiSegmento(sp, i);
  const u = 1 - t;
  return P(
    u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  );
}

/**
 * Un nodo nuovo sul segmento `segmento`, a `t` (de Casteljau): la forma non
 * cambia, si aggiunge solo un punto da prendere.
 */
export function aggiungiNodo(m, { s, segmento }, t = 0.5) {
  const r = copia(m);
  const sp = r.sottopercorsi[s];
  const j = dopo(sp, segmento);
  if (j === null) return r;
  const a = sp.nodi[segmento];
  const b = sp.nodi[j];
  let nuovo;
  if (!a.fuori && !b.dentro) {
    const p = lerp(a, b, t);
    nuovo = { x: p.x, y: p.y, dentro: null, fuori: null, liscio: false };
  } else {
    const [p0, c1, c2, p3] = puntiSegmento(sp, segmento);
    const q0 = lerp(p0, c1, t);
    const q1 = lerp(c1, c2, t);
    const q2 = lerp(c2, p3, t);
    const r0 = lerp(q0, q1, t);
    const r1 = lerp(q1, q2, t);
    const p = lerp(r0, r1, t);
    a.fuori = q0;
    b.dentro = q2;
    nuovo = { x: p.x, y: p.y, dentro: r0, fuori: r1, liscio: true };
  }
  sp.nodi.splice(segmento + 1, 0, nuovo);
  return r;
}

/**
 * Togli un nodo. Un sottopercorso che resta con un nodo solo se ne va; un
 * modello senza più sottopercorsi non si può fare (`null`: chi chiama
 * toglie il tracciato intero, o non fa niente).
 */
export function togliNodo(m, { s, n }) {
  const r = copia(m);
  const sp = r.sottopercorsi[s];
  sp.nodi.splice(n, 1);
  if (sp.nodi.length < 2) r.sottopercorsi.splice(s, 1);
  return r.sottopercorsi.length ? r : null;
}

/** Segmento curvo ↔ dritto. Dritto → curvo mette le maniglie a un terzo e due terzi. */
export function curvaODritto(m, { s, segmento }) {
  const r = copia(m);
  const sp = r.sottopercorsi[s];
  const j = dopo(sp, segmento);
  if (j === null) return r;
  const a = sp.nodi[segmento];
  const b = sp.nodi[j];
  if (a.fuori || b.dentro) {
    a.fuori = null;
    b.dentro = null;
    a.liscio = false;
    b.liscio = false;
  } else {
    a.fuori = lerp(a, b, 1 / 3);
    b.dentro = lerp(a, b, 2 / 3);
  }
  return r;
}

/** Apri ↔ chiudi un sottopercorso. */
export function apriChiudi(m, { s }) {
  const r = copia(m);
  r.sottopercorsi[s].chiuso = !r.sottopercorsi[s].chiuso;
  return r;
}

/**
 * Nodo angolo ↔ liscio. Liscio raddrizza le maniglie sulla retta media,
 * tenendo le loro lunghezze; angolo le lascia dove sono e le slega.
 */
export function angoloOLiscio(m, { s, n }) {
  const r = copia(m);
  const nodo = r.sottopercorsi[s].nodi[n];
  if (nodo.liscio) {
    nodo.liscio = false;
    return r;
  }
  if (nodo.dentro && nodo.fuori) {
    const a = P(nodo.x - nodo.dentro.x, nodo.y - nodo.dentro.y);
    const b = P(nodo.fuori.x - nodo.x, nodo.fuori.y - nodo.y);
    const la = Math.hypot(a.x, a.y);
    const lb = Math.hypot(b.x, b.y);
    const dir = P(a.x / (la || 1) + b.x / (lb || 1), a.y / (la || 1) + b.y / (lb || 1));
    const l = Math.hypot(dir.x, dir.y);
    if (l > EPS) {
      const u = P(dir.x / l, dir.y / l);
      nodo.dentro = P(nodo.x - u.x * la, nodo.y - u.y * la);
      nodo.fuori = P(nodo.x + u.x * lb, nodo.y + u.y * lb);
    }
  }
  nodo.liscio = true;
  return r;
}

/** Distanza di un punto dalla retta per `a` e `b`. */
function distanzaRetta(p, a, b) {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  if (l < EPS) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / l;
}

/** La proiezione di `p` sul segmento a→b sta dentro il segmento? */
function dentroSegmento(p, a, b) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 < EPS) return true;
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  return t >= -0.001 && t <= 1.001;
}

/**
 * I segmenti curvi con le maniglie sulla retta tornano dritti: VTracer scrive
 * i lati di un quadrato come curve, e sono il doppio delle maniglie, tutte
 * inutili. `tolleranza` in unità del documento.
 */
export function raddrizza(m, tolleranza = 0.5) {
  const r = copia(m);
  for (const sp of r.sottopercorsi) {
    for (let i = 0; i < segmentiDi(sp); i++) {
      const a = sp.nodi[i];
      const b = sp.nodi[dopo(sp, i)];
      if (!a.fuori && !b.dentro) continue;
      const c1 = a.fuori || a;
      const c2 = b.dentro || b;
      const dritto =
        distanzaRetta(c1, a, b) <= tolleranza &&
        distanzaRetta(c2, a, b) <= tolleranza &&
        dentroSegmento(c1, a, b) &&
        dentroSegmento(c2, a, b);
      if (dritto) {
        a.fuori = null;
        b.dentro = null;
      }
    }
    for (const n of sp.nodi) n.liscio = allineate(n);
  }
  return r;
}

/* ------------------------------ al tocco ------------------------------- */

/** Il nodo più vicino a `(x, y)` entro `raggio`, o `null`. */
export function nodoVicino(m, x, y, raggio) {
  let meglio = null;
  m.sottopercorsi.forEach((sp, s) =>
    sp.nodi.forEach((nodo, n) => {
      const d = Math.hypot(nodo.x - x, nodo.y - y);
      if (d <= raggio && (!meglio || d < meglio.d)) meglio = { s, n, d };
    }),
  );
  return meglio && { s: meglio.s, n: meglio.n };
}

/**
 * Il segmento più vicino a `(x, y)` entro `raggio`, con il `t` del punto più
 * vicino (campionato: 24 passi bastano a un dito o a un mouse), o `null`.
 */
export function segmentoVicino(m, x, y, raggio, passi = 24) {
  let meglio = null;
  m.sottopercorsi.forEach((sp, s) => {
    for (let i = 0; i < segmentiDi(sp); i++) {
      for (let k = 0; k <= passi; k++) {
        const t = k / passi;
        const p = puntoSu(sp, i, t);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= raggio && (!meglio || d < meglio.d)) meglio = { s, segmento: i, t, d };
      }
    }
  });
  return meglio && { s: meglio.s, segmento: meglio.segmento, t: meglio.t };
}
