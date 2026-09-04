import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzip } from 'fflate';
import { bundleBlobs } from '../src/store/bundle.js';

/*
 * Lo zip di cio' che sta SUL PIANO, non della libreria.
 *
 * Il difetto (2026-09-04): il tasto «scarica» in alto a destra passava
 * `downloadAll`, che zippa l'intera libreria. Con la libreria vuota rispondeva
 * «libreria vuota» mentre sul piano c'erano tre risultati pronti — e il
 * commento sopra la riga diceva gia' la cosa giusta, «scarica CIO' CHE C'E'»,
 * mentre il codice ne faceva un'altra.
 */

/** I nomi dentro uno zip, per controllare che non se ne sia perso nessuno. */
async function nomiNelloZip(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  return new Promise((ok, ko) => unzip(buf, (err, out) => (err ? ko(err) : ok(Object.keys(out)))));
}

test('lo zip contiene tutti i file del piano', async () => {
  const z = await bundleBlobs([
    { nome: 'gatto.png', blob: new Blob(['uno']) },
    { nome: 'cane.png', blob: new Blob(['due']) },
  ]);
  assert.deepEqual((await nomiNelloZip(z)).sort(), ['cane.png', 'gatto.png']);
});

test('due file con lo stesso nome non si sovrascrivono', async () => {
  /*
   * La trappola gia' pagata il 2026-08-28: `hero.png` → `insegna.webp` ha
   * sovrascritto un altro file in silenzio. Tre scatti dallo stesso originale
   * arrivano qui con lo stesso nome, e perderne uno senza dirlo e' il modo
   * piu' rapido di far perdere fiducia a un tasto che serve a portarsi via il
   * proprio lavoro.
   */
  const z = await bundleBlobs([
    { nome: 'gatto.png', blob: new Blob(['uno']) },
    { nome: 'gatto.png', blob: new Blob(['due']) },
    { nome: 'gatto.png', blob: new Blob(['tre']) },
  ]);
  assert.deepEqual((await nomiNelloZip(z)).sort(), ['gatto-2.png', 'gatto-3.png', 'gatto.png']);
});

test('il suffisso non si perde: il numero va prima del punto', async () => {
  // `gatto.png-2` non si apre con un doppio clic. Si accorcia il nome, mai
  // l'estensione — la stessa regola gia' scritta per i suffissi degli asset.
  const z = await bundleBlobs([
    { nome: 'a.png', blob: new Blob(['x']) },
    { nome: 'a.png', blob: new Blob(['y']) },
  ]);
  assert.ok((await nomiNelloZip(z)).includes('a-2.png'));
});

test('un piano vuoto lo dice, non consegna uno zip vuoto', async () => {
  await assert.rejects(
    () => bundleBlobs([]),
    (e) => e.code === 'piano-vuoto',
  );
});
