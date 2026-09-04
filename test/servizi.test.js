import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUANDO,
  getDescrittore,
  strumentiVisibili,
  validaDescrittore,
  DESCRITTORI,
} from '../src/servizi/index.js';

/*
 * Il descrittore di un servizio: cosa accetta il `+`, cosa fa il tasto Zack,
 * quali strumenti compaiono e quando.
 *
 * Il difetto che questi test impediscono di ripetere (2026-09-04): il
 * comportamento di ogni servizio era sparso in liste di `id` dentro App.jsx —
 * `['brain','suono','filmato','scontorna'].includes(tool)` compariva TRE
 * volte, piu' `FACCIA`, piu' otto `tool === 'scontorna'`. Ogni servizio nuovo
 * era una caccia a quelle liste, e una lista dimenticata era un bug: e' gia'
 * successo con `filmato`, rimasto fuori mentre veniva aggiunto altrove, e chi
 * apriva Filmato si trovava sopra il nome di un JPG.
 *
 * Qui il comportamento e' DATI, quindi si guarda invece di cercarlo.
 */

test('lo scontorno con un risultato mostra i quattro strumenti di correzione', () => {
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: true, risultato: true });
  assert.deepEqual(s.map((x) => x.id), ['righello', 'restore', 'erase', 'undo']);
});

test('lo scontorno col solo file mostra annulla e cambia file', () => {
  // Prima del risultato non c'e' niente da correggere: il righello e i due
  // pennelli non hanno su cosa lavorare.
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: true, risultato: false });
  assert.deepEqual(s.map((x) => x.id), ['undo', 'swap']);
});

test('il piano vuoto non mostra nessuno strumento', () => {
  const s = strumentiVisibili(getDescrittore('scontorna'), { file: false, risultato: false });
  assert.deepEqual(s, []);
});

test('il filmato mostra i suoi tre gesti, e solo con un file sul piano', () => {
  const d = getDescrittore('filmato');
  assert.deepEqual(
    strumentiVisibili(d, { file: true, risultato: false }).map((x) => x.id),
    ['taglia', 'fotogrammi', 'sfondo'],
  );
  assert.deepEqual(strumentiVisibili(d, { file: false, risultato: false }), []);
});

test('un servizio sconosciuto lo dice, non restituisce undefined', () => {
  // Un `undefined` qui diventerebbe una schermata vuota senza errore: il tipo
  // di guasto che si scopre solo guardandolo.
  assert.throws(() => getDescrittore('teletrasporto'), /teletrasporto/);
});

test('ogni descrittore registrato e’ valido', () => {
  for (const [id, d] of Object.entries(DESCRITTORI)) {
    assert.doesNotThrow(() => validaDescrittore(d), `${id} non passa il validatore`);
    assert.equal(d.id, id, `${id}: l’id dentro non combacia con la chiave`);
  }
});

test('uno stato «quando» inventato viene rifiutato', () => {
  // La lista e' chiusa apposta: uno stato nuovo si aggiunge li', e allora
  // `strumentiVisibili` sa cosa farne. Uno scritto a mano nel descrittore
  // sparirebbe in silenzio — lo strumento non comparirebbe mai, e nessuno
  // saprebbe perche'.
  assert.throws(
    () =>
      validaDescrittore({
        id: 'finto',
        claim: 'drop.claim',
        accetta: { file: ['image/*'], quanti: 1 },
        tasto: { azione: 'catena' },
        strumenti: [{ id: 'x', icon: 'undo', label: 'bar.undo', quando: 'quando-mi-va' }],
      }),
    /quando-mi-va/,
  );
});

test('la lista degli stati resta chiusa', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  assert.equal(QUANDO.length, 4);
});
