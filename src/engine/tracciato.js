/**
 * Il tracciato pulito (fase 8a, spec `2026-10-05-nodi-design.md` §2.1).
 *
 * Ciò che esce da VTracer è giusto da guardare e sbagliato da toccare:
 * - ogni `<path>` ha un `transform="translate(…)"`, e un editor di nodi lavora
 *   nelle coordinate del tracciato — le maniglie finiscono dove il tracciato
 *   non è. Le traslazioni entrano nelle coordinate;
 * - il primo strato è un **fondo** che copre tutta la tela: dove clicchi,
 *   prendi lui. Si toglie, ma solo se è quasi bianco (≥ 240 su tre canali):
 *   è il bianco che `traceToSvg` mette sotto la trasparenza. Un fondo
 *   colorato è parte del disegno, e resta;
 * - i lati dritti sono scritti come curve: tornano `L`;
 * - in «bianco e nero» il riempimento è `none`: diventa nero.
 *
 * Puro, senza DOM: lavora sulla forma che VTracer scrive (un `<path …/>` per
 * riga, attributi `d`, `fill`, `transform`). Un tracciato che non sa leggere
 * (archi, una trasformazione che non è una traslazione) lo lascia com'è:
 * meglio intatto che rovinato.
 */

import { leggiPercorso, scriviPercorso, traslaModello, raddrizza } from './nodi.js';

const ATTRIBUTO = (nome) => new RegExp(`\\s${nome}="([^"]*)"`);

function attributo(tag, nome) {
  return ATTRIBUTO(nome).exec(tag)?.[1] ?? null;
}

function conAttributo(tag, nome, valore) {
  if (valore === null) return tag.replace(ATTRIBUTO(nome), '');
  if (ATTRIBUTO(nome).test(tag)) return tag.replace(ATTRIBUTO(nome), ` ${nome}="${valore}"`);
  return tag.replace(/\s*\/?>$/, (fine) => ` ${nome}="${valore}"${fine}`);
}

/** `translate(x,y)` / `translate(x y)` / `translate(x)` → `{ x, y }`, altrimenti `null`. */
export function traslazione(transform) {
  const m = /^\s*translate\(\s*(-?[\d.eE+-]+)(?:[\s,]+(-?[\d.eE+-]+))?\s*\)\s*$/.exec(transform || '');
  return m ? { x: Number(m[1]), y: Number(m[2] ?? 0) } : null;
}

/** `#rrggbb` o `#rgb` quasi bianco? */
export function quasiBianco(colore) {
  const c = String(colore || '').trim().toLowerCase();
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/.exec(c);
  if (!m) return c === 'white';
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].every((i) => parseInt(h.slice(i, i + 2), 16) >= 240);
}

/** `#rrggbb` / `#rgb` → `[r, g, b]`, o `null`. */
export function rgbDi(colore) {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(colore || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const distanza = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** I colori chiave possibili per il vuoto: saturi, lontani da quelli di un logo qualunque. */
export const CHIAVI = ['#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#0000ff', '#ff0000'];

/** Nei pixel RGBA c'è almeno un pixel non del tutto opaco? */
export function haTrasparenza(px) {
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

/**
 * Il colore chiave più lontano da tutti i colori opachi dell'immagine
 * (campionati: uno ogni 7 pixel basta a vedere un logo, e costa poco).
 */
export function coloreChiave(px, chiavi = CHIAVI) {
  const colori = [];
  for (let i = 0; i < px.length; i += 28) if (px[i + 3] >= 128) colori.push([px[i], px[i + 1], px[i + 2]]);
  let meglio = chiavi[0];
  let lontano = -1;
  for (const k of chiavi) {
    const c = rgbDi(k);
    let vicina = Infinity;
    for (const x of colori) vicina = Math.min(vicina, distanza(c, x));
    if (vicina > lontano) {
      lontano = vicina;
      meglio = k;
    }
  }
  return meglio;
}

/** Il riquadro di un modello. */
function riquadro(modello) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of modello.sottopercorsi) {
    for (const n of s.nodi) {
      x0 = Math.min(x0, n.x);
      y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x);
      y1 = Math.max(y1, n.y);
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * Il modello copre tutta la tela `w × h` (con un pixel di tolleranza)? Anche
 * con dei buchi: ritagliato sul logo, il fondo ha i buchi dove il logo tocca
 * i bordi, ed è proprio quello che si prende cliccando.
 */
function copreTutto(modello, w, h) {
  const r = riquadro(modello);
  return r.x0 <= 1 && r.y0 <= 1 && r.x1 >= w - 1 && r.y1 >= h - 1;
}

/** Le misure della tela da `<svg width height>` o dal `viewBox`. */
function misure(svg) {
  const testa = /<svg\b[^>]*>/.exec(svg)?.[0] || '';
  const w = Number(attributo(testa, 'width'));
  const h = Number(attributo(testa, 'height'));
  if (w > 0 && h > 0) return { w, h };
  const vb = (attributo(testa, 'viewBox') || '').split(/[\s,]+/).map(Number);
  return vb.length === 4 && vb[2] > 0 ? { w: vb[2], h: vb[3] } : null;
}

/**
 * Pulisce l'SVG di VTracer per l'editor dei nodi.
 *
 * @param opzioni.fondo il colore chiave con cui `traceToSvg` ha dipinto il
 *   vuoto: i tracciati di quel colore se ne vanno, qualunque forma abbiano.
 * @returns `{ svg, tolti, puliti }`: quanti fondi tolti e quanti tracciati
 *   riscritti (per chi vuole dirlo, e per le prove).
 */
export function pulisciTracciato(svg, { tolleranza = 0.5, fondo = null } = {}) {
  const tela = misure(svg);
  const chiave = fondo && rgbDi(fondo);
  let tolti = 0;
  let puliti = 0;
  const fuori = svg.replace(/<path\b[^>]*\/>/g, (tag) => {
    const d = attributo(tag, 'd');
    // Il colore chiave del vuoto (VTracer lo arrotonda un poco): si toglie, qualunque forma abbia.
    const colore = rgbDi(attributo(tag, 'fill'));
    if (chiave && colore && distanza(colore, chiave) <= 48) {
      tolti += 1;
      return '';
    }
    const transform = attributo(tag, 'transform');
    const t = transform ? traslazione(transform) : { x: 0, y: 0 };
    if (!d || !t) return tag; // una rotazione, una scala: si lascia stare
    let modello;
    try {
      modello = leggiPercorso(d);
    } catch {
      return tag; // archi, o un d che non sappiamo leggere
    }
    modello = traslaModello(modello, t.x, t.y);
    if (tela && quasiBianco(attributo(tag, 'fill')) && copreTutto(modello, tela.w, tela.h)) {
      tolti += 1;
      return '';
    }
    puliti += 1;
    let nuovo = conAttributo(tag, 'd', scriviPercorso(raddrizza(modello, tolleranza)));
    // VTracer in «bianco e nero» scrive `fill="none"` e nessun contorno: il
    // tracciato c'è ma non si vede (0 pixel dipinti, misurato il 2026-10-05).
    // Bianco e nero vuol dire nero.
    if (attributo(tag, 'fill') === 'none' && !attributo(tag, 'stroke')) nuovo = conAttributo(nuovo, 'fill', '#000000');
    return conAttributo(nuovo, 'transform', null);
  });
  return { svg: fuori, tolti, puliti };
}
