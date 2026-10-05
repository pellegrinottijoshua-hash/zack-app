import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leggiPercorso, scriviPercorso, contaNodi, muoviNodo, muoviManiglia, aggiungiNodo, togliNodo, curvaODritto,
  apriChiudi, angoloOLiscio, raddrizza, traslaModello, nodoVicino, segmentoVicino, puntoSu, segmentiDi,
} from '../src/engine/nodi.js';

/* Il modello dei nodi (fase 8a): leggere, scrivere, toccare. */

const QUADRATO = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
const sp = (m, s = 0) => m.sottopercorsi[s];
const vicino = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test('un quadrato: quattro nodi, chiuso, e torna uguale', () => {
  const m = leggiPercorso(QUADRATO);
  assert.equal(contaNodi(m), 4);
  assert.equal(sp(m).chiuso, true);
  assert.equal(segmentiDi(sp(m)), 4);
  assert.equal(scriviPercorso(m), QUADRATO);
});

test('relativi, H, V e L implicite dopo la M', () => {
  const m = leggiPercorso('m 5 5 10 0 v 10 h -10 z');
  assert.deepEqual(sp(m).nodi.map((n) => [n.x, n.y]), [[5, 5], [15, 5], [15, 15], [5, 15]]);
});

test('⚠️ il primo punto ripetuto prima della Z (VTracer) è UN nodo, con la maniglia d’ingresso', () => {
  const m = leggiPercorso('M 0 0 C 5 0 10 5 10 10 C 5 10 0 5 0 0 Z');
  assert.equal(contaNodi(m), 2);
  assert.deepEqual(sp(m).nodi[0].dentro, { x: 0, y: 5 });
  // E si riscrive con il segmento curvo che chiude, non con una retta.
  const di = scriviPercorso(m);
  assert.equal(di, 'M 0 0 C 5 0 10 5 10 10 C 5 10 0 5 0 0 Z');
});

test('S riflette la maniglia, Q e T diventano cubici esatti', () => {
  const s = leggiPercorso('M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0');
  assert.deepEqual(sp(s).nodi[1].fuori, { x: 10, y: -10 });
  const q = leggiPercorso('M 0 0 Q 15 30 30 0');
  assert.deepEqual(sp(q).nodi[0].fuori, { x: 10, y: 20 });
  assert.deepEqual(sp(q).nodi[1].dentro, { x: 20, y: 20 });
  const t = leggiPercorso('M 0 0 Q 15 30 30 0 T 60 0');
  // T riflette il controllo (15,30) attorno a (30,0) → (45,-30).
  assert.deepEqual(sp(t).nodi[1].fuori, { x: 40, y: -20 });
});

test('più sottopercorsi, e un disegno dopo la Z senza M riparte dall’inizio', () => {
  const m = leggiPercorso('M 0 0 L 10 0 L 10 10 Z M 20 20 L 30 20 L 30 30 Z');
  assert.equal(m.sottopercorsi.length, 2);
  const z = leggiPercorso('M 0 0 L 10 0 Z L 0 10');
  assert.equal(z.sottopercorsi.length, 2);
  assert.deepEqual(sp(z, 1).nodi.map((n) => [n.x, n.y]), [[0, 0], [0, 10]]);
});

test('⚠️ gli archi non si leggono: il tracciato si dichiara non modificabile', () => {
  assert.throws(() => leggiPercorso('M 0 0 A 5 5 0 0 1 10 0'), (e) => e.code === 'archi');
  assert.throws(() => leggiPercorso(''), (e) => e.code === 'd-vuoto');
  assert.throws(() => leggiPercorso('M 0'), (e) => e.code === 'd-storto');
  assert.throws(() => leggiPercorso('10 10'), (e) => e.code === 'd-storto');
});

test('muovere un nodo porta con sé le maniglie; il modello di prima non cambia', () => {
  const m = leggiPercorso('M 0 0 C 5 0 10 5 10 10');
  const r = muoviNodo(m, { s: 0, n: 0 }, 3, 4);
  assert.deepEqual([sp(r).nodi[0].x, sp(r).nodi[0].y], [3, 4]);
  assert.deepEqual(sp(r).nodi[0].fuori, { x: 8, y: 4 });
  assert.deepEqual([sp(m).nodi[0].x, sp(m).nodi[0].y], [0, 0], 'immutabile');
});

test('⚠️ maniglia di un nodo liscio: l’altra gira dall’altra parte, con la SUA lunghezza', () => {
  const m = leggiPercorso('M 0 0 C 0 0 5 -5 10 0 C 20 10 20 10 30 0');
  assert.equal(sp(m).nodi[1].liscio, true, '(5,-5)→(10,0)→(20,10) sono allineati');
  const r = muoviManiglia(m, { s: 0, n: 1, lato: 'dentro' }, 10, -10);
  const n = sp(r).nodi[1];
  assert.deepEqual(n.dentro, { x: 10, y: -10 });
  vicino(n.fuori.x, 10);
  vicino(n.fuori.y, Math.hypot(10, 10)); // lunghezza di prima, ora verso il basso
  // Un nodo angolo: l’altra resta dov’era.
  const a = muoviManiglia(angoloOLiscio(m, { s: 0, n: 1 }), { s: 0, n: 1, lato: 'dentro' }, 10, -10);
  assert.deepEqual(sp(a).nodi[1].fuori, { x: 20, y: 10 });
});

test('⚠️ aggiungere un nodo non cambia la forma (de Casteljau)', () => {
  const m = leggiPercorso('M 0 0 C 0 20 30 20 30 0');
  const prima = [0.1, 0.3, 0.7, 0.9].map((t) => puntoSu(sp(m), 0, t));
  const r = aggiungiNodo(m, { s: 0, segmento: 0 }, 0.5);
  assert.equal(contaNodi(r), 3);
  // I punti di prima stanno sulla curva nuova: t ∈ [0,0.5] → primo segmento.
  for (const [i, t] of [0.1, 0.3, 0.7, 0.9].entries()) {
    const p = t < 0.5 ? puntoSu(sp(r), 0, t * 2) : puntoSu(sp(r), 1, (t - 0.5) * 2);
    vicino(p.x, prima[i].x, 1e-9);
    vicino(p.y, prima[i].y, 1e-9);
  }
  // Su un segmento dritto: un punto in mezzo, senza maniglie.
  const q = aggiungiNodo(leggiPercorso(QUADRATO), { s: 0, segmento: 0 }, 0.5);
  assert.deepEqual(sp(q).nodi[1], { x: 5, y: 0, dentro: null, fuori: null, liscio: false });
  // E sul segmento che chiude.
  const z = aggiungiNodo(leggiPercorso(QUADRATO), { s: 0, segmento: 3 }, 0.5);
  assert.deepEqual([sp(z).nodi[4].x, sp(z).nodi[4].y], [0, 5]);
});

test('togliere un nodo; con un nodo solo il sottopercorso se ne va; senza niente `null`', () => {
  const m = leggiPercorso(QUADRATO);
  assert.equal(contaNodi(togliNodo(m, { s: 0, n: 1 })), 3);
  const due = leggiPercorso('M 0 0 L 10 0 M 20 20 L 30 30');
  assert.equal(togliNodo(due, { s: 0, n: 0 }).sottopercorsi.length, 1);
  assert.equal(togliNodo(leggiPercorso('M 0 0 L 1 1'), { s: 0, n: 0 }), null);
});

test('curvo ↔ dritto, aperto ↔ chiuso', () => {
  const m = leggiPercorso('M 0 0 L 30 0');
  const c = curvaODritto(m, { s: 0, segmento: 0 });
  assert.deepEqual(sp(c).nodi[0].fuori, { x: 10, y: 0 });
  assert.deepEqual(sp(c).nodi[1].dentro, { x: 20, y: 0 });
  assert.equal(scriviPercorso(curvaODritto(c, { s: 0, segmento: 0 })), 'M 0 0 L 30 0');
  assert.equal(scriviPercorso(apriChiudi(m, { s: 0 })), 'M 0 0 L 30 0 Z');
});

test('angolo → liscio raddrizza le maniglie tenendo le lunghezze', () => {
  const m = leggiPercorso('M 0 0 C 0 0 0 -10 10 0 C 20 0 30 0 30 0');
  assert.equal(sp(m).nodi[1].liscio, false);
  const r = angoloOLiscio(m, { s: 0, n: 1 });
  const n = sp(r).nodi[1];
  assert.equal(n.liscio, true);
  vicino(Math.hypot(n.dentro.x - 10, n.dentro.y), Math.hypot(10, 10));
  vicino(Math.hypot(n.fuori.x - 10, n.fuori.y), 10);
  // Allineate: il coseno fra le due direzioni è 1.
  const a = { x: 10 - n.dentro.x, y: 0 - n.dentro.y };
  const b = { x: n.fuori.x - 10, y: n.fuori.y };
  vicino((a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y)), 1, 1e-9);
});

test('⚠️ raddrizza: le curve con le maniglie sulla retta tornano L, le curve vere restano', () => {
  // Il quadrato come lo scrive VTracer: lati come curve, maniglie a un terzo.
  const vt = leggiPercorso('M0 0 C168.96 0 337.92 0 512 0 C512 168.96 512 337.92 512 512 C343.04 512 174.08 512 0 512 C0 343.04 0 174.08 0 0 Z');
  assert.equal(scriviPercorso(raddrizza(vt)), 'M 0 0 L 512 0 L 512 512 L 0 512 Z');
  const curva = leggiPercorso('M 0 0 C 0 20 30 20 30 0');
  assert.equal(scriviPercorso(raddrizza(curva)), 'M 0 0 C 0 20 30 20 30 0');
  // Maniglie sulla retta ma OLTRE gli estremi: non è un segmento dritto.
  const oltre = leggiPercorso('M 0 0 C -10 0 40 0 30 0');
  assert.equal(scriviPercorso(raddrizza(oltre)), 'M 0 0 C -10 0 40 0 30 0');
});

test('traslare sposta nodi e maniglie', () => {
  const r = traslaModello(leggiPercorso('M 0 0 C 5 0 10 5 10 10'), 100, 50);
  assert.equal(scriviPercorso(r), 'M 100 50 C 105 50 110 55 110 60');
});

test('al tocco: il nodo più vicino nel raggio, il segmento col suo t', () => {
  const m = leggiPercorso(QUADRATO);
  assert.deepEqual(nodoVicino(m, 9, 1, 3), { s: 0, n: 1 });
  assert.equal(nodoVicino(m, 5, 5, 3), null);
  const sv = segmentoVicino(m, 5, 0.5, 2);
  assert.equal(sv.segmento, 0);
  vicino(sv.t, 0.5, 0.05);
  assert.equal(segmentoVicino(m, 5, 5, 2), null);
});

test('⚠️ aggiungere un nodo FUORI dal mezzo (t = 0,3) non cambia la forma', () => {
  const m = leggiPercorso('M 0 0 C 0 20 30 20 30 0');
  const r = aggiungiNodo(m, { s: 0, segmento: 0 }, 0.3);
  for (const t of [0.1, 0.2, 0.5, 0.8]) {
    const atteso = puntoSu(sp(m), 0, t);
    const p = t < 0.3 ? puntoSu(sp(r), 0, t / 0.3) : puntoSu(sp(r), 1, (t - 0.3) / 0.7);
    vicino(p.x, atteso.x, 1e-9);
    vicino(p.y, atteso.y, 1e-9);
  }
});
