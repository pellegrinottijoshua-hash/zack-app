import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tipoRegistrabile } from '../src/engine/rimonta.js';

/* Il rimontaggio del video (6c) vive nel browser; qui solo la scelta del formato. */

test('il WebM migliore che il browser sa scrivere, o nessuno', () => {
  assert.equal(tipoRegistrabile(() => true), 'video/webm;codecs=vp9,opus');
  assert.equal(tipoRegistrabile((t) => t === 'video/webm'), 'video/webm');
  assert.equal(tipoRegistrabile(() => false), null);
});
