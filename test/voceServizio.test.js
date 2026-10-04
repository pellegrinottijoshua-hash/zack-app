import { test } from 'node:test';
import assert from 'node:assert/strict';
import vocale from '../src/servizi/vocale.js';
import { pianoVuoto, statoDelPiano } from '../src/servizi/piano.js';
import { VOCI_PRONTE } from '../src/engine/listinoVoce.js';
import it from '../src/i18n/it.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };

/*
 * «Leggi questo» nel servizio Vocale (fetta 6a): il `+`, il punto oro, il piano.
 */

const gruppo = (id) => vocale.tasto.gruppi.find((g) => g.id === id);
const chiave = (d, k) => k.split('.').reduce((o, p) => o?.[p], d);

test('il `+` del Vocale ha «scrivi», dopo i due gesti di sempre', () => {
  assert.deepEqual(vocale.accetta.menu, ['registra', 'aggiungi', 'scrivi']);
  assert.ok(it.menu.scrivi && en.menu.scrivi);
});

test('il punto oro: il gesto parte da «trasforma», gratis', () => {
  const g = gruppo('gesto');
  assert.equal(g.predefinita, 'trasforma');
  assert.deepEqual(g.opzioni.map((o) => o.id), ['trasforma', 'leggi', 'cambia']);
});

test('⚠️ le voci del punto oro sono ESATTAMENTE quelle che il Worker accetta', () => {
  const g = gruppo('voce');
  assert.deepEqual(g.opzioni.map((o) => o.id), VOCI_PRONTE.map((v) => v.id));
  assert.equal(g.predefinita, VOCI_PRONTE[0].id);
});

test('ogni etichetta nuova esiste in tutt’e due le lingue', () => {
  for (const g of ['gesto', 'voce'].map(gruppo)) {
    for (const k of [g.label, ...g.opzioni.map((o) => o.label)]) {
      assert.ok(chiave(it, k), `manca in it: ${k}`);
      assert.ok(chiave(en, k), `manca in en: ${k}`);
    }
  }
  for (const k of Object.keys(it.voce.leggi)) assert.ok(en.voce.leggi[k], `manca in en: voce.leggi.${k}`);
});

test('col tasto su «leggi» il piano non è vuoto (il testo è la tela), ma nulla è «in corso»', () => {
  assert.equal(pianoVuoto('vocale', {}), true);
  assert.equal(pianoVuoto('vocale', { letturaVoce: true }), false);
  assert.equal(statoDelPiano('vocale', { letturaVoce: true }).inCorso, false);
});

test('lo strumento «nuova voce» c’è sempre, con etichetta nelle due lingue (6b)', () => {
  const s = vocale.strumenti.find((x) => x.id === 'nuovaVoce');
  assert.equal(s?.quando, 'sempre');
  assert.ok(chiave(it, s.label) && chiave(en, s.label));
  for (const k of Object.keys(it.voce.nuova)) assert.ok(en.voce.nuova[k], `manca in en: voce.nuova.${k}`);
});
