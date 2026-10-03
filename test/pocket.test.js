import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  giornoLocale,
  leggiPocket,
  metti,
  togli,
  vivi,
  finestra,
  destinazioniDi,
  destinazioniSu,
  bersagliAccesi,
  eTrascinamento,
  SOGLIA,
  TETTO,
  VISIBILI,
} from '../src/engine/pocket.js';

// Ogni prova dichiara il pocket da cui parte: mai uno stato ereditato.

test('il giorno è la data LOCALE, non quella UTC', () => {
  // 23:30 locali del 27: in UTC potrebbe già essere il 28 (o ancora il 27).
  assert.equal(giornoLocale(new Date(2026, 8, 27, 23, 30)), '2026-09-27');
  assert.equal(giornoLocale(new Date(2026, 8, 28, 0, 1)), '2026-09-28');
});

test('leggere: un pocket di ieri si svuota', () => {
  const ieri = JSON.stringify({ giorno: '2026-09-26', ids: ['a', 'b'] });
  assert.deepEqual(leggiPocket(ieri, '2026-09-27'), { giorno: '2026-09-27', ids: [] });
});

test('leggere: un pocket di oggi resta', () => {
  const oggi = JSON.stringify({ giorno: '2026-09-27', ids: ['a', 'b'] });
  assert.deepEqual(leggiPocket(oggi, '2026-09-27').ids, ['a', 'b']);
});

test('leggere: niente, rotto o di forma sbagliata → vuoto, senza errori', () => {
  for (const t of [null, '', '{', '"x"', '{"giorno":"2026-09-27","ids":"a"}']) {
    assert.deepEqual(leggiPocket(t, '2026-09-27'), { giorno: '2026-09-27', ids: [] });
  }
  const sporco = JSON.stringify({ giorno: '2026-09-27', ids: ['a', 3, null, 'a', ''] });
  assert.deepEqual(leggiPocket(sporco, '2026-09-27').ids, ['a']);
});

test('mettere: un id già dentro torna in cima, non si doppia', () => {
  const { pocket, uscito } = metti({ giorno: 'g', ids: ['a', 'b', 'c'] }, 'a');
  assert.deepEqual(pocket.ids, ['b', 'c', 'a']);
  assert.equal(uscito, null);
});

test('mettere: l\'undicesimo fa uscire il più vecchio, e lo dice', () => {
  const pieno = { giorno: 'g', ids: Array.from({ length: TETTO }, (_, i) => `id${i}`) };
  const { pocket, uscito } = metti(pieno, 'nuovo');
  assert.equal(pocket.ids.length, TETTO);
  assert.equal(uscito, 'id0');
  assert.equal(pocket.ids.at(-1), 'nuovo');
  assert.equal(pieno.ids.length, TETTO); // puro
});

test('togliere', () => {
  assert.deepEqual(togli({ giorno: 'g', ids: ['a', 'b'] }, 'a').ids, ['b']);
});

test('vivi: gli id spariti dalla libreria si saltano; il più recente è primo', () => {
  const assets = [{ id: 'a' }, { id: 'c' }];
  assert.deepEqual(vivi({ giorno: 'g', ids: ['a', 'b', 'c'] }, assets).map((x) => x.id), ['c', 'a']);
});

test('finestra: 4 visibili, e il carosello gira', () => {
  const l = [1, 2, 3, 4, 5, 6];
  assert.equal(VISIBILI, 4);
  assert.deepEqual(finestra(l, 0), [1, 2, 3, 4]);
  assert.deepEqual(finestra(l, 4), [5, 6, 1, 2]);
  assert.deepEqual(finestra(l, 6), [1, 2, 3, 4]);
  assert.deepEqual(finestra([1, 2], 3), [1, 2]);
});

test('destinazioni: per tipo, pocket e Brain sempre', () => {
  assert.ok(destinazioniDi('png').includes('scontorna'));
  assert.ok(destinazioniDi('jpg').includes('video-primo'));
  assert.deepEqual(destinazioniDi('mp4'), ['pocket', 'brain']);
  assert.ok(!destinazioniDi('svg').includes('scontorna'));
  assert.deepEqual(destinazioniDi('toString'), ['pocket', 'brain']);
  for (const k of ['png', 'jpg', 'svg', 'mp4', 'wav', 'boh']) {
    assert.ok(destinazioniDi(k).includes('pocket') && destinazioniDi(k).includes('brain'));
  }
});

// ── 4b: il trascinamento ────────────────────────────────────────────────

test('trascinare accende ESATTAMENTE le destinazioni dell\'ovale, per ogni tipo', () => {
  // La regola del §2.3: «le destinazioni accese sono esattamente quelle
  // dell'ovale». Se un giorno una destinazione entra nella tabella e nessun
  // cerchio la porta, o un cerchio si accende per un tipo che l'ovale non
  // offre, questa prova lo dice.
  for (const k of ['png', 'jpg', 'svg', 'mp4', 'wav', 'boh']) {
    const accese = bersagliAccesi(k).flatMap((b) => destinazioniSu(b, k));
    assert.deepEqual([...accese].sort(), [...destinazioniDi(k)].sort(), k);
  }
});

test('trascinare: Video chiede quale ruolo, gli altri cerchi vanno dritti', () => {
  assert.deepEqual(destinazioniSu('video', 'png'), ['video-primo', 'video-riferimento']);
  assert.deepEqual(destinazioniSu('scontorna', 'png'), ['scontorna']);
  // Un video posato su Scontorna: spento, non un errore.
  assert.deepEqual(destinazioniSu('scontorna', 'mp4'), []);
  assert.deepEqual(destinazioniSu('vocale', 'wav'), []);
  assert.deepEqual(destinazioniSu('toString', 'png'), []);
});

test('trascinare: un file del pocket non si accende sul pocket', () => {
  assert.ok(bersagliAccesi('png').includes('pocket'));
  assert.ok(!bersagliAccesi('png', 'pocket').includes('pocket'));
  assert.deepEqual(bersagliAccesi('mp4', 'pocket'), ['brain']);
});

test('trascinare: sotto la soglia resta un tocco', () => {
  assert.equal(eTrascinamento(0, 0), false);
  assert.equal(eTrascinamento(SOGLIA - 1, 0), false);
  assert.equal(eTrascinamento(5, 6), false); // ~7,8 px: un dito che trema
  assert.equal(eTrascinamento(SOGLIA, 0), true);
  assert.equal(eTrascinamento(-6, -6), true);
});
