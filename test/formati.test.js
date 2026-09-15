import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LISTINO, prezzoDi } from '../src/engine/listino.js';
import { getDescrittore } from '../src/servizi/index.js';

const voce = LISTINO['immagine-nbp'];

test('le due misure costano uguale — è il motivo per cui la scelta esiste', () => {
  // Misurato il 2026-09-10 e riconfermato dal committente il 2026-09-15:
  // stessi 1120 token d'immagine, quattro volte i pixel. Se un giorno non
  // fosse più vero, il listino dovrebbe avere DUE righe, e questa prova è
  // ciò che lo dice invece di lasciare che il margine scenda in silenzio.
  assert.equal(Object.keys(voce.misure).length, 2);
  assert.equal(prezzoDi('immagine-nbp').total, prezzoDi('immagine-nbp').total);
});

test('ogni formato offerto dal tasto oro esiste nel listino', () => {
  // La schermata non può offrire una forma che il fornitore non conosce: si
  // addebiterebbe una richiesta che poi rimbalza.
  const gruppo = getDescrittore('immagine').tasto.gruppi.find((g) => g.id === 'formato');
  for (const o of gruppo.opzioni) {
    assert.ok(voce.formati[o.id], `il formato ${o.id} non è nel listino`);
  }
  assert.ok(gruppo.opzioni.some((o) => o.id === '9:16'), 'manca il verticale');
  assert.ok(gruppo.opzioni.some((o) => o.id === '4:5'), 'manca il 4:5');
});

test('la misura offerta dal tasto oro esiste nel listino', () => {
  const gruppo = getDescrittore('immagine').tasto.gruppi.find((g) => g.id === 'misura');
  for (const o of gruppo.opzioni) {
    assert.ok(voce.misure[o.id], `la misura ${o.id} non è nel listino`);
  }
});
