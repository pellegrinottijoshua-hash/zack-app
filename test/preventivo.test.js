import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prezzoDi, limitiDi } from '../src/engine/listino.js';
import { formatEuro } from '../src/engine/ledger.js';
import immagine from '../src/servizi/immagine.js';

const PREVENTIVO = readFileSync(new URL('../src/components/Preventivo.jsx', import.meta.url), 'utf8');

/*
 * «Ogni generazione ti dice quanto costa prima che tu prema.»
 *
 * E' pubblicata sulla home, quindi non e' una preferenza dell'interfaccia: e'
 * una promessa operativa. Questi test la difendono.
 */

test('il preventivo non contiene nessuna cifra scritta a mano', () => {
  /*
   * Una cifra scritta nel componente sarebbe una seconda fonte del prezzo, e
   * il giorno che il listino cambia resterebbe indietro — mostrando un numero
   * e addebitandone un altro. E' la § 3.1: un posto solo.
   */
  assert.doesNotMatch(PREVENTIVO, /\b\d+[.,]\d{2}\s*€/, 'c’e’ un prezzo scritto a mano');
  assert.match(PREVENTIVO, /prezzoDi\(/, 'il preventivo non legge il listino');
  assert.match(PREVENTIVO, /formatEuro\(/);
});

test('il prezzo mostrato e’ quello che il Worker addebita', () => {
  /*
   * Le due strade partono dalla stessa funzione: qui si verifica che il
   * numero che finisce sullo schermo sia proprio quello.
   *
   * 145 e non 140: il costo misurato di NBP e' 127 millesimi (Task 0), non i
   * 123 di una stesura precedente — 127 + 18 di margine fa 145. Lo stesso
   * numero e' gia' verificato in test/listino.test.js; qui si controlla che
   * ARRIVI FINO ALLO SCHERMO, formattato.
   */
  const { total } = prezzoDi('immagine-nbp');
  assert.equal(total, 145);
  // U+00A0 (spazio unificatore) fra numero e simbolo, non uno spazio normale:
  // e' cio' che `Intl.NumberFormat('it-IT')` scrive davvero (ruling Task 1),
  // e impedisce che «0,15» e «€» finiscano su due righe in pagina.
  assert.equal(formatEuro(total, 'it'), '0,15 €');
});

test('il servizio immagine e’ dichiarato per intero', () => {
  assert.equal(immagine.id, 'immagine');
  assert.equal(immagine.serve, 'saldo');
  assert.equal(immagine.listino, 'immagine-nbp');
  assert.ok(limitiDi(immagine.listino).totale > 0);
});

test('i limiti duplicati in «accetta» restano uguali a quelli del listino', () => {
  /*
   * Il listino e' la FONTE — e' l'unico posto che sa cosa accetta il
   * fornitore — e `immagine.accetta` ne e' una COPIA: due letterali scritti a
   * mano (`quanti: 14`, `menu: ['personaggio','oggetto','stile']`), non
   * calcolati. Restano letterali perche' i descrittori sono dati puri,
   * un'invariante di questo progetto: importare `limitiDi` dentro il
   * descrittore lo renderebbe calcolato, e romperebbe quell'invariante per
   * risparmiarsi due righe.
   *
   * Una copia scritta a mano puo' divergere dall'originale al primo
   * fornitore nuovo — e quel giorno si addebiterebbe (o si offrirebbe) una
   * richiesta che il fornitore rifiuta. Questo test non impedisce la
   * divergenza: la fa scoppiare qui, rossa, invece che in produzione.
   */
  const limiti = limitiDi(immagine.listino);
  assert.equal(immagine.accetta.quanti, limiti.totale, 'il tetto dei riferimenti diverge dal listino');

  const ruoli = Object.keys(limiti).filter((k) => k !== 'totale');
  assert.deepEqual(
    [...immagine.accetta.menu].sort(),
    [...ruoli].sort(),
    'i ruoli offerti divergono da quelli del listino',
  );
});
