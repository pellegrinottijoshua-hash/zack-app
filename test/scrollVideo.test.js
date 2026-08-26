import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockAt } from '../src/landing/scrollVideo.js';

const VH = 800;

// ---------------------------------------------------------------------------
// La home a blocchi: un video solo, sempre visibile, che avanza mentre le
// informazioni gli scorrono davanti.
// ---------------------------------------------------------------------------

test('si sta leggendo la sezione che ha già passato la metà dello schermo', async () => {
  // Non quella che sta arrivando: il testo si legge quando è al centro, e il
  // gesto di Zack deve corrispondere a ciò che si legge adesso.
  const { blockAt } = await import('../src/landing/scrollVideo.js');
  const riquadri = [
    { top: -600, height: 800 },
    { top: 200, height: 800 },
    { top: 1000, height: 800 },
  ];
  const { indice } = blockAt(riquadri, 800);
  assert.equal(indice, 1, 'la seconda ha superato la metà, la terza no');
});

test('senza sezioni il video resta al principio invece di esplodere', async () => {
  const { blockAt } = await import('../src/landing/scrollVideo.js');
  assert.deepEqual(blockAt([], 800), { indice: 0, progresso: 0 });
});
