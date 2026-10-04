import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  testoPrompt,
  nomePrompt,
  ePrompt,
  promptSalvati,
  cartelleDellaTela,
  PROMPT_MAX,
} from '../src/engine/prompt.js';
import { destinazioniDi, destinazioniSu, bersagliAccesi } from '../src/engine/pocket.js';
import { nuovoAsset } from '../src/engine/brain.js';
import { posaSu } from '../src/engine/cartelle.js';

test('il titolo markdown è il nome, non la richiesta', () => {
  assert.equal(testoPrompt('# Notte sul molo\n\nun gabbiano al neon'), 'un gabbiano al neon');
  // Un titolo da solo resta: è tutto quello che c'è.
  assert.equal(testoPrompt('# solo questo'), '# solo questo');
  assert.equal(testoPrompt('\n\n  una riga  \n\n'), 'una riga');
  assert.equal(testoPrompt('a\r\nb'), 'a\nb');
  assert.equal(testoPrompt('x'.repeat(PROMPT_MAX + 50)).length, PROMPT_MAX);
  assert.equal(testoPrompt(null), '');
});

test('il nome di un prompt sono le sue prime parole', () => {
  assert.equal(nomePrompt('un gabbiano al neon sul molo di notte'), 'un gabbiano al neon sul molo…');
  assert.equal(nomePrompt('corto'), 'corto');
  assert.equal(nomePrompt('   '), '');
});

test('un prompt salvato è un .md nato dal salvataggio, vivo', () => {
  assert.ok(ePrompt({ kind: 'md', meta: { op: 'prompt' } }));
  assert.ok(!ePrompt({ kind: 'md', meta: {} }), 'una nota qualunque');
  // `meta.prompt` su un'immagine è il testo che l'ha fatta: non un prompt salvato.
  assert.ok(!ePrompt({ kind: 'jpg', meta: { op: 'prompt', prompt: 'x' } }));
  assert.ok(!ePrompt({ kind: 'md', meta: { op: 'prompt' }, cestinatoIl: '2026-10-04' }));
});

test('i prompt salvati vanno dal più recente', () => {
  const a = { id: 'a', kind: 'md', meta: { op: 'prompt' }, createdAt: '2026-10-01T00:00:00Z' };
  const b = { id: 'b', kind: 'md', meta: { op: 'prompt' }, createdAt: '2026-10-03T00:00:00Z' };
  const c = { id: 'c', kind: 'png', meta: {}, createdAt: '2026-10-04T00:00:00Z' };
  assert.deepEqual(promptSalvati([a, c, b]).map((x) => x.id), ['b', 'a']);
});

test('un .md si posa su Immagine e su Video come prompt, e solo come prompt', () => {
  assert.deepEqual(destinazioniSu('immagine', 'md'), ['immagine-prompt']);
  assert.deepEqual(destinazioniSu('video', 'md'), ['video-prompt']);
  assert.ok(!destinazioniSu('immagine', 'png').includes('immagine-prompt'));
  assert.ok(!destinazioniSu('video', 'jpg').includes('video-prompt'));
  assert.ok(!destinazioniDi('md').includes('scontorna'));
  const accesi = bersagliAccesi('md', 'brain');
  assert.ok(accesi.includes('immagine') && accesi.includes('video') && !accesi.includes('brain'));
});

test('le cartelle della tela, viste dalla libreria, contano anche i file annidati', () => {
  const a = nuovoAsset({ assetId: 'A' });
  const b = nuovoAsset({ assetId: 'B', x: 200 });
  const c = nuovoAsset({ assetId: 'C', x: 400 });
  const { items: uno, cartella: fuori } = posaSu([a, b, c], a.id, b.id, { nome: 'Fuori' });
  const { items: due } = posaSu(uno, c.id, fuori);
  const [vista] = cartelleDellaTela(due);
  assert.equal(vista.titolo, 'Fuori');
  assert.deepEqual([...vista.assetIds].sort(), ['A', 'B', 'C']);
});
