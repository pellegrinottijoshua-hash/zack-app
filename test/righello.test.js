import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  guidaDritta,
  puntoDellaGuida,
  puntoPiuVicino,
  pennellaGuidato,
  maniglia,
  spostaManiglia,
} from '../src/engine/righello.js';

/*
 * Il righello.
 *
 * Serve al guasto raccontato dal committente il 2026-08-27: lo scontorno che
 * fallisce del tutto e mangia anche il disco colorato dietro il soggetto. Con
 * la matita, anche da 3 px a 8x, rifare quel bordo significa ricalcarlo a
 * mano. Con la barriera si mette la guida dove il bordo DOVREBBE stare e si
 * riempie di getto.
 *
 * Qui sta solo la matematica, che è la parte che sbaglia di segno e cancella
 * il lavoro di qualcuno senza sollevare niente.
 */

const A = { x: 10, y: 50 };
const B = { x: 90, y: 50 };

test('un righello dritto passa davvero per la retta', () => {
  const g = guidaDritta(A, B);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const p = puntoDellaGuida(g, t);
    assert.ok(Math.abs(p.y - 50) < 1e-9, `a t=${t} la y e' ${p.y}, doveva essere 50`);
  }
});

test('il punto piu vicino su un righello dritto e la proiezione', () => {
  const g = guidaDritta(A, B);
  const r = puntoPiuVicino(g, { x: 50, y: 80 });
  assert.ok(Math.abs(r.punto.x - 50) < 0.5, `x=${r.punto.x}`);
  assert.ok(Math.abs(r.punto.y - 50) < 0.5, `y=${r.punto.y}`);
  assert.ok(Math.abs(r.distanza - 30) < 0.5, `distanza=${r.distanza}`);
});

test('due punti opposti alla guida stanno da parti diverse', () => {
  // `lato` non ha un significato assoluto — non dice «sopra» o «sotto», che su
  // una curva che si piega sarebbe falso. Dice solo «stessa parte o no», ed e'
  // tutto cio' che serve alla barriera.
  const g = guidaDritta(A, B);
  const su = puntoPiuVicino(g, { x: 50, y: 20 }).lato;
  const giu = puntoPiuVicino(g, { x: 50, y: 80 }).lato;
  assert.notEqual(su, giu);
  assert.notEqual(su, 0);
});

test('un punto esattamente sulla guida non sta da nessuna parte', () => {
  const g = guidaDritta(A, B);
  assert.equal(puntoPiuVicino(g, { x: 50, y: 50 }).lato, 0);
});

/** Una maschera vuota su cui dipingere. */
const tela = (w, h) => ({ alpha: new Uint8ClampedArray(w * h), w, h });

test('la barriera non lascia passare il colore dall altra parte', () => {
  // È il test che descrive il difetto per cui il righello esiste: si dipinge
  // a cavallo del bordo e il colore si ferma dove deve, senza ricalcare.
  const { alpha, w, h } = tela(100, 100);
  const g = guidaDritta(A, B);
  pennellaGuidato(alpha, w, h, { x: 50, y: 60, raggio: 25, valore: 255 }, g, { modo: 'barriera' });

  const at = (x, y) => alpha[y * w + x];
  assert.ok(at(50, 60) > 200, 'dalla parte del tratto si dipinge');
  assert.equal(at(50, 40), 0, 'dall altra parte della guida non arriva niente');
  assert.equal(at(50, 30), 0);
});

test('senza barriera lo stesso tratto passa dall altra parte', () => {
  // La controprova: senza guida il pennello attraversa, ed e' esattamente il
  // motivo per cui rifare un bordo a mano e' un incubo.
  const { alpha, w, h } = tela(100, 100);
  pennellaGuidato(alpha, w, h, { x: 50, y: 60, raggio: 25, valore: 255 }, null);
  assert.ok(alpha[40 * w + 50] > 0, 'senza guida il colore attraversa');
});

test('il binario riporta il tratto sulla guida anche se la mano trema', () => {
  const { alpha, w, h } = tela(100, 100);
  const g = guidaDritta(A, B);
  // La mano e' venti pixel fuori bersaglio.
  pennellaGuidato(alpha, w, h, { x: 50, y: 70, raggio: 6, valore: 255 }, g, { modo: 'binario' });
  assert.ok(alpha[50 * w + 50] > 200, 'il tratto e finito sulla guida');
  assert.equal(alpha[70 * w + 50], 0, 'e non dove stava la mano');
});

test('le tre maniglie si distinguono, e il resto non e una maniglia', () => {
  const g = guidaDritta(A, B);
  assert.equal(maniglia(g, { x: 10, y: 50 }), 'a');
  assert.equal(maniglia(g, { x: 90, y: 50 }), 'b');
  assert.equal(maniglia(g, { x: 50, y: 50 }), 'curva');
  assert.equal(maniglia(g, { x: 30, y: 52 }), 'corpo');
  assert.equal(maniglia(g, { x: 50, y: 200 }), null);
});

test('tirare un capo di un righello dritto lo lascia dritto', () => {
  // Senza far seguire il controllo a meta', tirando un estremo la curva si
  // deforma in un modo che nessuno si aspetta: si crede di allungare e si
  // ottiene una gobba.
  const g = spostaManiglia(guidaDritta(A, B), 'b', { x: 40, y: 0 });
  for (const t of [0.25, 0.5, 0.75]) {
    assert.ok(Math.abs(puntoDellaGuida(g, t).y - 50) < 1e-9, `gobba a t=${t}`);
  }
  assert.equal(g.b.x, 130);
});

test('spostare il corpo non cambia la forma', () => {
  const g = guidaDritta(A, B);
  const m = spostaManiglia(g, 'corpo', { x: 5, y: 7 });
  const prima = puntoDellaGuida(g, 0.3);
  const dopo = puntoDellaGuida(m, 0.3);
  assert.ok(Math.abs(dopo.x - prima.x - 5) < 1e-9);
  assert.ok(Math.abs(dopo.y - prima.y - 7) < 1e-9);
});

test('la maniglia di curvatura resta sotto il dito', () => {
  // Il controllo si sposta del DOPPIO, perche' il punto a meta' curva sta a
  // meta' strada fra la corda e il controllo. Senza, si trascina di dieci e la
  // curva ne segue cinque: il pallino scappa da sotto il dito.
  const g = guidaDritta(A, B);
  const m = spostaManiglia(g, 'curva', { x: 0, y: -20 });
  const meta = puntoDellaGuida(m, 0.5);
  assert.ok(Math.abs(meta.y - 30) < 1e-9, `il punto a meta' e' a y=${meta.y}, doveva essere 30`);
});

test('spostare una maniglia non muta la guida di partenza', () => {
  // Uno stato che cambia sotto i piedi mentre si trascina e' il modo piu'
  // veloce per avere un annulla che non funziona.
  const g = guidaDritta(A, B);
  spostaManiglia(g, 'a', { x: 100, y: 100 });
  assert.deepEqual(g.a, A);
});
