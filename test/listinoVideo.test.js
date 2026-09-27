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
      // Il 1080p Higgsfield non lo ha: nemmeno il sì esplicito lo fa esistere.
      assert.equal(canaleConsentito({ canale: 'higgsfield', durata, risoluzione, accettaPerdita: true }), risoluzione !== '1080p');
    }
  }
  assert.equal(canaleConsentito({ canale: 'inventato', durata: 5, risoluzione: '720p', accettaPerdita: true }), false);
});

test('durata, risoluzione e formato sono liste chiuse', () => {
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '720p', formato: '16:9' }), null);
  assert.equal(richiestaVideoNonValida({ durata: 7, risoluzione: '720p', formato: '16:9' }), 'durata');
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '4K', formato: '16:9' }), 'risoluzione');
  assert.equal(richiestaVideoNonValida({ durata: 5, risoluzione: '720p', formato: '2:1' }), 'formato');
  assert.throws(() => prezzoVideo({ durata: '5', risoluzione: '720p' }), /durata/);
  assert.ok(FORMATI.includes('9:16'));
});

/* ── fetta 3d: 1080p, immagini, e da quale canale ─────────────────── */

import { canalePer, immaginiVideoStorte, costoDaToken as costoToken } from '../src/engine/listinoVideo.js';

test('1080p esiste solo sul canale ufficiale, a 11,70 $/M token, e costa più del 720p', () => {
  const p1080 = prezzoVideo({ durata: 5, risoluzione: '1080p' });
  assert.ok(p1080.total > prezzoVideo({ durata: 5, risoluzione: '720p' }).total * 2);
  assert.throws(() => costoVideo({ durata: 5, risoluzione: '1080p', canale: 'higgsfield' }), /canale-sconosciuto/);
  // 1920×1080 vero, stima sopra
  const vero = Math.ceil(Math.ceil((1920 * 1080 * 5 * 24) / 1024) * (11.7 / 1e6) * CAMBIO_USD_EUR * 1000);
  assert.ok(costoVideo({ durata: 5, risoluzione: '1080p' }) >= vero);
});

test('⚠️ il canale per la richiesta: Higgsfield solo col testo e fino a 720p; il resto va all’ufficiale', () => {
  /*
   * Rompere apposta: fai tornare sempre `acceso` a `canalePer` → una
   * richiesta a 1080p o con immagini andrebbe a Higgsfield, che non la sa
   * fare (400, o peggio le immagini ignorate e il video addebitato).
   */
  assert.equal(canalePer({ acceso: 'higgsfield', risoluzione: '720p' }), 'higgsfield');
  assert.equal(canalePer({ acceso: 'higgsfield', risoluzione: '1080p' }), 'byteplus');
  assert.equal(canalePer({ acceso: 'higgsfield', risoluzione: '720p', immagini: [{ ruolo: 'primo' }] }), 'byteplus');
  assert.equal(canalePer({ acceso: 'byteplus', risoluzione: '1080p', immagini: [{ ruolo: 'riferimento' }] }), 'byteplus');
  assert.equal(canalePer({ acceso: 'boh', risoluzione: '720p' }), 'byteplus');
});

test('⚠️ le immagini del video: ruoli chiusi, tetti, e fotogrammi e riferimenti non si mescolano', () => {
  const im = (ruolo) => ({ ruolo, immagine: 'data:image/jpeg;base64,AA' });
  assert.equal(immaginiVideoStorte([]), null);
  assert.equal(immaginiVideoStorte([im('primo')]), null);
  assert.equal(immaginiVideoStorte([im('primo'), im('ultimo')]), null);
  assert.equal(immaginiVideoStorte(Array.from({ length: 9 }, () => im('riferimento'))), null);
  assert.equal(immaginiVideoStorte(Array.from({ length: 10 }, () => im('riferimento'))), 'troppe-immagini');
  assert.equal(immaginiVideoStorte([im('ultimo')]), 'ultimo-senza-primo');
  assert.equal(immaginiVideoStorte([im('primo'), im('primo')]), 'troppi-primo');
  assert.equal(immaginiVideoStorte([im('primo'), im('riferimento')]), 'fotogrammi-e-riferimenti');
  assert.equal(immaginiVideoStorte([im('toString')]), 'ruolo-sconosciuto');
  assert.equal(immaginiVideoStorte('no'), 'immagini');
});

test('il costo vero dai token segue la risoluzione (il 1080p ha la sua tariffa)', () => {
  assert.ok(costoToken(100000, 'byteplus', '1080p') > costoToken(100000, 'byteplus', '720p'));
  assert.equal(costoToken(100000, 'higgsfield', '1080p'), null);
});
