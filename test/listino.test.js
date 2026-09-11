import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LISTINO, prezzoDi, limitiDi } from '../src/engine/listino.js';
import { priceFor } from '../src/engine/ledger.js';

/*
 * Il preventivo e l'addebito leggono la STESSA tabella.
 *
 * E' la § 3.1 della spec di B1, ed e' la promessa piu' fragile del prodotto:
 * la home scrive «ogni generazione ti dice quanto costa prima che tu prema».
 * Se il numero mostrato e quello addebitato vengono da due posti, prima o poi
 * divergono — e il giorno che divergono hai mentito a un cliente che ti aveva
 * creduto sulla parola.
 *
 * Qui non divergono perche' sono la stessa funzione. Questi test difendono che
 * resti cosi'.
 */

test('ogni voce di listino ha un prezzo, e viene da priceFor', () => {
  for (const [id, voce] of Object.entries(LISTINO)) {
    assert.deepEqual(prezzoDi(id), priceFor(voce.costo), `${id} calcola il prezzo per conto suo`);
  }
});

test('il prezzo SALE coi riferimenti, e resta dentro il margine dichiarato', () => {
  /*
   * Misurato il 2026-09-10 (docs/2026-09-10-misura-nbp.md): un riferimento
   * costa 258 token, cioe' mezzo millesimo. Sette millesimi fra zero e
   * quattordici.
   *
   * Sembra poco, e su un margine di 18 non lo e': a PREZZO FISSO il margine
   * sarebbe il 15,4% su una richiesta nuda e il 10,7% su una con quattordici
   * riferimenti, mentre la home ne dichiara 12. Un prezzo fisso qui vuol dire
   * una frase falsa sulla propria home, in tutt'e due i versi.
   */
  const nudo = prezzoDi('immagine-nbp', { riferimenti: 0 });
  const pieno = prezzoDi('immagine-nbp', { riferimenti: 14 });

  assert.equal(nudo.cost, 128, 'la base non e’ quella misurata');
  assert.equal(nudo.total, 146);
  assert.equal(pieno.cost, 135);
  assert.equal(pieno.total, 154);
  assert.ok(pieno.total > nudo.total, 'quattordici riferimenti costano come zero');

  for (let n = 0; n <= 14; n += 1) {
    const { margin, total } = prezzoDi('immagine-nbp', { riferimenti: n });
    const quota = margin / total;
    assert.ok(quota > 0.115 && quota < 0.128, `con ${n} riferimenti il margine e’ il ${(quota * 100).toFixed(1)}%`);
  }
});

test('la stima non sta MAI sotto il costo misurato', () => {
  /*
   * Misurati: 126 a zero riferimenti, 131 a cinque, 133 a quattordici (lo
   * stesso 131 di `test/genera.test.js`, ricalcolato dal vero `usageMetadata`
   * — due file dello stesso task non possono dirsi due costi diversi per la
   * stessa chiamata misurata). La base e' 128 e non 126 perche' i token di
   * «pensiero» ballano di ±2 millesimi: meglio stimare sopra che trovarsi
   * sotto, e scoprire a fine mese che il margine dichiarato non c'era.
   */
  for (const [n, misurato] of [[0, 126], [5, 131], [14, 133]]) {
    assert.ok(
      prezzoDi('immagine-nbp', { riferimenti: n }).cost >= misurato,
      `con ${n} riferimenti stimiamo meno di quanto costa davvero`,
    );
  }
});

test('un servizio che non e’ a listino non ha un prezzo inventato', () => {
  assert.throws(() => prezzoDi('inventato'), /inventato/);
  assert.throws(() => prezzoDi(undefined));
});

test('il margine dichiarato vale per OGNI voce, non solo per la prima', () => {
  // Il giorno che si aggiunge Seedance o ElevenLabs, questo test guarda anche
  // loro senza che nessuno si ricordi di aggiungerlo.
  for (const id of Object.keys(LISTINO)) {
    const { margin, total } = prezzoDi(id);
    const quota = margin / total;
    assert.ok(quota > 0.115 && quota < 0.128, `${id}: margine al ${(quota * 100).toFixed(1)}%`);
  }
});

test('i limiti dei riferimenti vengono dal listino, non da una costante', () => {
  const l = limitiDi('immagine-nbp');
  assert.equal(l.totale, 14);
  assert.equal(l.personaggio, 5);
  assert.equal(l.oggetto, 6);
  assert.equal(l.stile, 3);
  // Un servizio che non dichiara riferimenti non ne accetta nessuno, invece di
  // mandarli a un fornitore che non sa cosa farsene.
  assert.deepEqual(limitiDi('inventato'), { personaggio: 0, oggetto: 0, stile: 0, totale: 0 });
});

test('la somma dei ruoli non supera il totale', () => {
  // 5 + 6 + 3 = 14. Se un giorno non tornasse, si accetterebbe una richiesta
  // che il fornitore rifiuta, dopo aver addebitato.
  for (const id of Object.keys(LISTINO)) {
    const l = limitiDi(id);
    assert.ok(l.personaggio + l.oggetto + l.stile <= l.totale, `${id}: i ruoli superano il totale`);
  }
});
