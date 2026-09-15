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
  //
  // Come si prova che il prezzo NON dipende dalla misura, senza confrontare
  // un'espressione con sé stessa (rilievo di revisione, Giro 1):
  // 1. `prezzoDi` non accetta affatto un argomento `misura` — la sua firma è
  //    `prezzoDi(servizio, { riferimenti })` — quindi non c'è nessuna misura
  //    da passargli per farla variare;
  // 2. la voce del listino non ha nessun campo di costo per misura (niente
  //    `costoPerMisura` e simili): `misure` è solo una tabella di traduzione
  //    per il fornitore, esattamente come `formati`;
  // 3. il totale di `immagine-nbp` è quindi quello del listino e basta — 128
  //    millesimi di costo, 146 di totale, a zero riferimenti — e QUESTO
  //    diventa rosso se domani qualcuno mette un prezzo diverso su 2K.
  assert.equal(Object.keys(voce.misure).length, 2);
  assert.ok(
    !('costoPerMisura' in voce) && !('costo1K' in voce) && !('costo2K' in voce),
    'il listino non deve avere un costo legato alla misura: le due misure costano uguale',
  );
  assert.equal(
    prezzoDi('immagine-nbp').total,
    146,
    'il totale a zero riferimenti deve essere quello del listino, senza riferimento alla misura',
  );
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
