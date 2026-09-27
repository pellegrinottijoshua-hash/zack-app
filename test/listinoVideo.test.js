import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMBIO_USD_EUR, DURATE, RISOLUZIONI, FORMATI,
  tokenVideo, costoVideo, prezzoVideo, canaleConsentito, richiestaVideoNonValida,
} from '../src/engine/listinoVideo.js';

/*
 * Il listino del video (fase 3). I numeri dei fornitori sono quelli delle
 * pagine ufficiali del 2026-09-27 (spec §1): se cambiano, cambiano qui.
 */

test('i token seguono la formula ufficiale, sul formato più grande', () => {
  // 720p, 5 s: 927.408 px × 5 × 24 / 1024 = 108.680,6 → 108.681.
  assert.equal(tokenVideo({ durata: 5, risoluzione: '720p' }), 108681);
});

test('⚠️ la stima non sta mai sotto il costo di NESSUN formato vero', () => {
  /*
   * Le misure vere di Seedance 2.x a 720p. Rompere apposta: metti 921600
   * (il 16:9) in PIXEL_MASSIMI['720p'] → il 4:3 costa più della stima.
   */
  const veri720 = { '16:9': 1280 * 720, '4:3': 1112 * 834, '1:1': 960 * 960, '21:9': 1470 * 630 };
  for (const [f, px] of Object.entries(veri720)) {
    for (const durata of DURATE) {
      const tokenVeri = Math.ceil((px * durata * 24) / 1024);
      const costoVero = Math.ceil(tokenVeri * (10.7 / 1e6) * CAMBIO_USD_EUR * 1000);
      assert.ok(costoVideo({ durata, risoluzione: '720p' }) >= costoVero, `${f} a ${durata}s costa più della stima`);
    }
  }
});

test('il canale ufficiale costa la metà di Higgsfield, come dicono i due listini', () => {
  const a = costoVideo({ durata: 10, risoluzione: '720p', canale: 'byteplus' });
  const b = costoVideo({ durata: 10, risoluzione: '720p', canale: 'higgsfield' });
  assert.ok(Math.abs(b / a - 2) < 0.01, `rapporto ${b / a}`);
});

test('il prezzo è il costo del canale ufficiale più il 14%, ed è lo stesso qualunque canale sia acceso', () => {
  const p = prezzoVideo({ durata: 5, risoluzione: '720p' });
  assert.equal(p.cost, costoVideo({ durata: 5, risoluzione: '720p', canale: 'byteplus' }));
  assert.equal(p.total, p.cost + Math.round(p.cost * 0.14));
  // 5 s a 720p: circa 1,10 € di costo, 1,26 € al cliente. Un numero scritto
  // qui perché chi cambia il cambio o il margine se ne accorga.
  assert.ok(p.total > 1100 && p.total < 1400, `5 s a 720p: ${p.total} millesimi`);
});

test('⚠️ il cancello: Higgsfield a listino costa più del prezzo, e non passa senza il sì esplicito', () => {
  /*
   * Rompere apposta: fai tornare `true` a `canaleConsentito` senza guardare
   * il costo → il Worker genererebbe in perdita appena si sposta
   * l'interruttore del canale.
   */
  for (const risoluzione of RISOLUZIONI) {
    for (const durata of DURATE) {
      assert.equal(canaleConsentito({ canale: 'byteplus', durata, risoluzione }), true);
      assert.equal(canaleConsentito({ canale: 'higgsfield', durata, risoluzione }), false);
      assert.equal(canaleConsentito({ canale: 'higgsfield', durata, risoluzione, accettaPerdita: true }), true);
    }
  }
  assert.equal(canaleConsentito({ canale: 'inventato', durata: 5, risoluzione: '720p', accettaPerdita: true }), false);
});

test('durata, risoluzione e formato sono liste chiuse', () => {
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '720p', formato: '16:9' }), null);
  assert.equal(richiestaVideoNonValida({ durata: 7, risoluzione: '720p', formato: '16:9' }), 'durata');
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '1080p', formato: '16:9' }), 'risoluzione');
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '720p', formato: '2:1' }), 'formato');
  assert.throws(() => prezzoVideo({ durata: '5', risoluzione: '720p' }), /durata/);
  assert.ok(FORMATI.includes('9:16'));
});
