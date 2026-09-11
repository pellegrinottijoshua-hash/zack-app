import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACCHETTI } from '../src/engine/pacchetti.js';
import { PACCHETTI as DA_WORKER } from '../worker/eventi.js';

/*
 * I pacchetti hanno UNA fonte, letta da due mondi.
 *
 * Il capitolato di Task 8 disegnava una seconda lista dentro `Ricarica.jsx`,
 * con gli stessi importi ricopiati a mano. Sarebbero stati due elenchi degli
 * stessi numeri in due file: il browser avrebbe mostrato il suo, Stripe
 * avrebbe incassato l'altro, e il giorno in cui divergono si mostra un prezzo
 * e se ne addebita un altro — sulla schermata del pagamento.
 *
 * Un `deepEqual` fra le due importazioni non lo proverebbe: due copie con
 * esattamente gli stessi numeri lo passerebbero comunque, e sarebbero comunque
 * due fonti pronte a divergere al primo pacchetto nuovo. Solo l'IDENTITÀ
 * dell'oggetto dimostra che `worker/eventi.js` non ha una copia, ma un
 * `export ... from` verso `src/engine/pacchetti.js`.
 */

test('il Worker rilegge lo STESSO oggetto del browser, non una copia', () => {
  assert.equal(DA_WORKER, PACCHETTI, 'worker/eventi.js definisce una seconda copia di PACCHETTI');
});

test('i tre pacchetti, e le due unità che li legano', () => {
  // Ripete la forma già difesa in `test/eventiStripe.test.js` (che guarda
  // `worker/eventi.js`): qui è il file che DICHIARA la forma, non solo chi la
  // usa, e deve valere anche letto da solo.
  assert.deepEqual(Object.keys(PACCHETTI).sort(), ['p10', 'p25', 'p5']);
  assert.deepEqual(PACCHETTI.p5, { millesimi: 5000, centesimi: 500 });
  assert.deepEqual(PACCHETTI.p10, { millesimi: 10000, centesimi: 1000 });
  assert.deepEqual(PACCHETTI.p25, { millesimi: 25000, centesimi: 2500 });
  // Il saldo vive in millesimi, Stripe incassa in centesimi: il fattore mille
  // scritto in due posti è la stessa trappola del file, spostata di una riga.
  for (const p of Object.values(PACCHETTI)) {
    assert.equal(p.millesimi, p.centesimi * 10, 'il fattore mille non torna fra le due unità');
  }
});
