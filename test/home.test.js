import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ordineDellaFila, SERVICES, getService } from '../src/services.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('l’ordine della fila è quello deciso, e scontorna sta in mezzo', () => {
  const ids = ordineDellaFila().map((s) => s.id);
  assert.deepEqual(ids, ['vettorializza', 'immagine', 'scontorna', 'video', 'vocale', 'effetti']);
  // Sei oggi, sette il giorno che l'editor di testo esiste: allora scontorna
  // sarà il quarto di sette, cioè esattamente il centro. Con sei è il terzo,
  // e va bene lo stesso — quello che conta è che immagine gli stia a sinistra
  // e video a destra, che è il disegno.
  const i = ids.indexOf('scontorna');
  assert.equal(ids[i - 1], 'immagine');
  assert.equal(ids[i + 1], 'video');
});

test('Brain non sta nella fila: sta in alto a sinistra, sempre', () => {
  assert.equal(ordineDellaFila().some((s) => s.id === 'brain'), false);
  // Ma esiste ancora come servizio: il suo cerchio è solo altrove.
  assert.equal(getService('brain').ready, true);
});

test('nessun servizio sparisce dal prodotto', () => {
  // ⚠️ La regola che B2 ha insegnato: ripulire non deve chiudere porte.
  const nella = new Set([...ordineDellaFila().map((s) => s.id), 'brain']);
  for (const s of SERVICES) assert.ok(nella.has(s.id), `${s.id} non è raggiungibile da nessuna parte`);
});

test('non si dichiara un cerchio per un servizio che non esiste', () => {
  // L'«editor di testo» ha il posto prenotato nell'ordine, ma finché non c'è
  // il servizio non c'è il cerchio: un cerchio che si accende e non fa niente
  // è il difetto del righello del 2026-09-04.
  for (const s of ordineDellaFila()) assert.ok(s?.id, 'la fila nomina un servizio che non esiste');
});

test('video dice che arriva, e non finge', () => {
  assert.equal(getService('video').ready, false);
});

// Prova DI SORGENTE (come in `muro.test.js`): App.jsx non si monta in prova
// (niente DOM), quindi qui si legge cosa c'è scritto nel file, come già fa
// `test/pelle.test.js` per i tre Critici del Giro 1.
test('se il servizio aperto sparisce dalla fila, App.jsx ripiega su scontorna', () => {
  /*
   * ⚠️ Decisione del committente (H1-bis, 2026-09-15): se il muro si accende
   * (o l'abbonamento scade) mentre si è su un servizio da abbonamento,
   * `mostraInFila` lo toglie dalla barra — e nessun cerchio resterebbe
   * acceso. App.jsx deve ripiegare su `scontorna`, non restare su una
   * schermata che nella fila non ha più nessuna porta d'ingresso.
   */
  const i = APP.indexOf('mostraInFila(DESCRITTORI[tool]');
  assert.notEqual(i, -1, 'App.jsx non consulta più `mostraInFila` per il servizio aperto: il ripiego è scollegato dalla fila');
  const finestra = APP.slice(i, i + 300);
  assert.match(
    finestra,
    /apriServizio\('scontorna'\)/,
    'quando il servizio sparisce dalla fila, App.jsx non ripiega più su scontorna',
  );
});
