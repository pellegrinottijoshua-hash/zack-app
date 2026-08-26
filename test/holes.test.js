import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findHoles, fillHoles, PIENO, AREA_MAX } from '../src/engine/holes.js';

const W = 40;
const H = 40;

/** Una maschera tutta vuota: sfondo puro, nessun soggetto. */
const vuota = () => new Uint8ClampedArray(W * H).fill(0);

/** Disegna un rettangolo pieno (255) nella maschera. */
function rettangolo(m, x0, y0, x1, y1, v = 255) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) m[y * W + x] = v;
  }
}

/**
 * Una "o": un anello pieno con dentro una controforma trasparente.
 * È il caso vero per cui esiste questo file — il buco che lo scontorno apre
 * dentro una lettera cava e che l'utente non vuole.
 */
function lettera(spessore = 4, lato = 20) {
  const m = vuota();
  const x0 = 10, y0 = 10, x1 = x0 + lato - 1, y1 = y0 + lato - 1;
  rettangolo(m, x0, y0, x1, y1);
  rettangolo(m, x0 + spessore, y0 + spessore, x1 - spessore, y1 - spessore, 0);
  return m;
}

const at = (m, x, y) => m[y * W + x];

test('lo sfondo che tocca il bordo non è mai un buco', () => {
  // Se questo test cade, la funzione riempie l'intera immagine: è il modo in
  // cui questo tipo di codice fallisce, e fallisce restituendo un rettangolo
  // nero senza sollevare niente.
  const m = vuota();
  rettangolo(m, 15, 15, 25, 25);
  assert.deepEqual(findHoles(m, W, H), []);
});

test('la controforma di una lettera è un buco', () => {
  const buchi = findHoles(lettera(), W, H);
  assert.equal(buchi.length, 1, 'dentro la "o" c\'è esattamente un buco');
  assert.equal(buchi[0].area, 12 * 12, 'il buco è il quadrato interno');
});

test('richiudere un buco riempie solo il buco', () => {
  const m = lettera();
  // La soglia è dichiarata qui e non lasciata a quella di fabbrica: su una
  // tela da 40×40 la controforma è il 9% dell'immagine, mentre su un file
  // vero da 4000 px la stessa lettera è una frazione minuscola. Un test che
  // dipendesse dal valore di fabbrica misurerebbe la tela, non la regola —
  // e cadrebbe il giorno in cui quel numero provvisorio verrà corretto.
  const esito = fillHoles(m, W, H, { areaMax: 0.2 });

  assert.equal(esito.richiusi, 1);
  assert.equal(esito.lasciati, 0);
  assert.equal(at(m, 20, 20), 255, 'il centro della controforma ora è pieno');
  assert.equal(at(m, 2, 2), 0, 'lo sfondo fuori dal soggetto resta trasparente');
});

test('un buco più grande della soglia si lascia stare', () => {
  // Il motivo per cui la soglia esiste: una cornice o una ciambella hanno un
  // buco voluto ed enorme. Riempirlo distrugge la grafica, e l'utente non ha
  // modo di accorgersene finché non stampa.
  const m = vuota();
  rettangolo(m, 2, 2, 37, 37);
  rettangolo(m, 8, 8, 31, 31, 0); // 24×24 = 576 px su 1600 = 36% dell'immagine

  const esito = fillHoles(m, W, H);
  assert.equal(esito.richiusi, 0);
  assert.equal(esito.lasciati, 1);
  assert.equal(at(m, 20, 20), 0, 'il buco voluto resta aperto');
});

test('la soglia si può alzare per richiudere anche i buchi grandi', () => {
  // Serve al tasto Zack: la ricetta dell'utente può decidere di essere più
  // aggressiva di quella di fabbrica.
  const m = vuota();
  rettangolo(m, 2, 2, 37, 37);
  rettangolo(m, 8, 8, 31, 31, 0);

  const esito = fillHoles(m, W, H, { areaMax: 1 });
  assert.equal(esito.richiusi, 1);
  assert.equal(at(m, 20, 20), 255);
});

test('più buchi nello stesso file si contano uno per uno', () => {
  // Il resoconto serve a dirlo a parole ("richiusi due buchi"): un'immagine
  // cambiata in silenzio è una sorpresa, non una rifinitura.
  const m = vuota();
  rettangolo(m, 4, 4, 16, 16);
  rettangolo(m, 8, 8, 12, 12, 0);
  rettangolo(m, 22, 22, 34, 34);
  rettangolo(m, 26, 26, 30, 30, 0);

  const esito = fillHoles(m, W, H);
  assert.equal(esito.richiusi, 2);
  assert.equal(esito.pixels, 5 * 5 * 2);
});

test('i bordi antialiasati non spaccano il contorno in mille regioni', () => {
  // Un contorno morbido sta a 251-254: trattarlo come vuoto genererebbe
  // centinaia di buchi finti lungo ogni bordo, e il conteggio mostrato
  // all'utente diventerebbe rumore.
  const m = lettera();
  rettangolo(m, 10, 10, 29, 10, PIENO + 2);
  const buchi = findHoles(m, W, H);
  assert.equal(buchi.length, 1);
});

test('un pixel isolato dentro il soggetto è comunque un buco', () => {
  // Il caso più frequente sui loghi veri non è la controforma grande: sono i
  // puntini che il modello apre dentro un tratto pieno.
  const m = vuota();
  rettangolo(m, 10, 10, 29, 29);
  m[20 * W + 20] = 0;

  const esito = fillHoles(m, W, H);
  assert.equal(esito.richiusi, 1);
  assert.equal(esito.pixels, 1);
  assert.equal(at(m, 20, 20), 255);
});

test('una maschera che non coincide con le dimensioni si rifiuta di partire', () => {
  // Meglio un errore che un'immagine corrotta: qui un indice sbagliato non
  // solleva niente, scrive semplicemente nel posto sbagliato.
  assert.throws(() => findHoles(new Uint8ClampedArray(10), W, H), /Maschera non leggibile/);
});

test('la soglia di fabbrica è dichiarata come frazione, non come pixel', () => {
  // Una soglia in pixel assoluti significherebbe una cosa diversa su un
  // francobollo e su un file da 4000 px. Questo test esiste perché il numero
  // è ancora provvisorio: se qualcuno lo sostituisce con una costante in
  // pixel, il ragionamento è cambiato e va riscritto il commento in cima.
  assert.ok(AREA_MAX > 0 && AREA_MAX < 1);
});
