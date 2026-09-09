import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHIAVE, leggiLicenza, salvaLicenza } from '../src/store/licenza.js';

/*
 * La licenza si ricorda, perche' lo studio deve aprirsi anche senza rete
 * (spec § 3.4). Senza memoria la grazia dei sette giorni non esisterebbe: a
 * ogni apertura si ripartirebbe da «mai entrato».
 */

const finto = () => {
  const dentro = new Map();
  return {
    getItem: (k) => (dentro.has(k) ? dentro.get(k) : null),
    setItem: (k, v) => dentro.set(k, String(v)),
  };
};

test('quello che si salva si rilegge', () => {
  const a = finto();
  const l = { abbonato: true, validoFino: '2026-11-01T00:00:00Z', chiestoIl: '2026-10-01T00:00:00Z' };
  assert.equal(salvaLicenza(l, a), true);
  assert.deepEqual(leggiLicenza(a), l);
});

test('senza niente salvato si risponde «niente», non si esplode', () => {
  assert.equal(leggiLicenza(finto()), null);
});

test('una memoria illeggibile vale «niente»', () => {
  // Puo' venire da una versione vecchia o essere stata rovinata a mano. Non
  // deve ne' esplodere ne' far passare: `statoLicenza(null)` dice «mai-entrato».
  const a = finto();
  a.setItem(CHIAVE, '{rotto');
  assert.equal(leggiLicenza(a), null);
});

test('un archivio NEGATO non ferma lo studio', () => {
  /*
   * Finestra anonima, o impostazioni che vietano i dati del sito: `setItem`
   * solleva. Lo studio deve continuare a funzionare per questa sessione —
   * rifiutarsi di partire perche' non si puo' RICORDARE sarebbe peggio del
   * problema che la memoria risolve.
   */
  const negato = {
    getItem: () => { throw new Error('negato'); },
    setItem: () => { throw new Error('negato'); },
  };
  assert.equal(salvaLicenza({ abbonato: true }, negato), false);
  assert.equal(leggiLicenza(negato), null);
});
