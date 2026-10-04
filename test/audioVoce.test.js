import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wavPcm16, base64Di } from '../src/engine/audioVoce.js';
import { durataWav, WAV_CAMBIO } from '../src/engine/listinoVoce.js';

/* L'audio che parte verso ElevenLabs (6b/6c): la parte pura. */

test('⚠️ il WAV che il browser manda è quello che il Worker sa misurare', () => {
  const due = wavPcm16(new Float32Array(WAV_CAMBIO.frequenza * 2), WAV_CAMBIO.frequenza);
  assert.equal(durataWav(due), 2);
});

test('i campioni si tagliano a [-1, 1] e diventano interi a 16 bit', () => {
  const b = wavPcm16(Float32Array.from([1, -1, 2, 0]), 16000);
  const v = new DataView(b.buffer);
  assert.deepEqual([0, 1, 2, 3].map((i) => v.getInt16(44 + i * 2, true)), [32767, -32768, 32767, 0]);
});

test('base64 a pezzi, uguale a quello intero', () => {
  const b = new Uint8Array(100000).map((_, i) => i % 256);
  assert.equal(base64Di(b), Buffer.from(b).toString('base64'));
});
