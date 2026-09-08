import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiDescrizione, PAROLE } from '../src/engine/dizionarioVoce.js';

/*
 * Dalla descrizione ai filtri, SENZA AI.
 *
 * Il committente aveva chiesto che il tasto usasse un modello linguistico per
 * capire la frase; l'AI e' stata rimandata il 2026-09-04 perche' sarebbe stata
 * la prima cosa a non girare nel browser del cliente. Qui c'e' un dizionario
 * locale: gratis, istantaneo, e soprattutto ONESTO — se non conosce una
 * parola lo dice, invece di indovinare.
 *
 * «Il tasto imposta, non decide»: i filtri restano tutti modificabili a mano.
 */

test('capisce le parole che conosce, e le somma', () => {
  const r = leggiDescrizione('piu calda e meno sibilante');
  assert.deepEqual(r.capito.sort(), ['calda', 'sibilante']);
  assert.deepEqual(r.nonCapito, []);
  assert.ok(r.filtri.formants < 0, '«calda» dovrebbe scurire il timbro');
});

test('dice quello che NON ha capito, invece di indovinare', () => {
  /*
   * E' la regola che rende il tasto affidabile: un dizionario che inventa
   * qualcosa su una parola sconosciuta insegna a non fidarsi del prossimo
   * risultato. Meglio dire «questa non la so».
   */
  const r = leggiDescrizione('voce da flangiatore quantistico');
  assert.deepEqual(r.capito, []);
  assert.ok(r.nonCapito.length > 0, 'non ha segnalato niente di sconosciuto');
});

test('senza NIENTE di riconosciuto non tocca i filtri', () => {
  const r = leggiDescrizione('asdf qwerty');
  assert.deepEqual(r.filtri, {}, 'ha toccato i filtri pur non avendo capito niente');
});

test('una descrizione vuota non e’ un errore', () => {
  for (const vuota of ['', '   ', null, undefined]) {
    const r = leggiDescrizione(vuota);
    assert.deepEqual(r.capito, []);
    assert.deepEqual(r.filtri, {});
  }
});

test('e’ deterministico: la stessa frase da’ gli stessi filtri', () => {
  const a = leggiDescrizione('grave, da radio, un po’ sporca');
  const b = leggiDescrizione('grave, da radio, un po’ sporca');
  assert.deepEqual(b, a);
});

test('l’ordine delle parole non cambia il risultato', () => {
  // «calda e grave» e «grave e calda» sono la stessa richiesta.
  const a = leggiDescrizione('calda e grave');
  const b = leggiDescrizione('grave e calda');
  assert.deepEqual(b.filtri, a.filtri);
});

test('accenti e maiuscole non contano', () => {
  assert.deepEqual(leggiDescrizione('PIÙ CALDA').filtri, leggiDescrizione('piu calda').filtri);
});

test('ogni parola del dizionario produce almeno un filtro', () => {
  // Una voce che non fa niente e' una promessa non mantenuta: l'utente la
  // scrive, il tasto dice «capito», e non cambia nulla.
  for (const p of Object.keys(PAROLE)) {
    const r = leggiDescrizione(p);
    assert.ok(Object.keys(r.filtri).length > 0, `«${p}» non produce nessun filtro`);
  }
});

test('due parole opposte non si annullano in silenzio', () => {
  // «grave e acuta» e' una richiesta contraddittoria: va detto, non risolto
  // di nascosto a favore dell'ultima.
  const r = leggiDescrizione('grave e acuta');
  assert.ok(r.contraddizioni.length > 0, 'non ha segnalato la contraddizione');
});

test('«meno» inverte i numeri, ma non capovolge un problema', () => {
  /*
   * L'inversione funziona sui numeri: «grave» e' -5, «meno grave» e' +5.
   * Su un FILTRO no — un oggetto non ha un contrario — e senza distinguere,
   * «meno sibilante» applicava lo stesso de-esser di «sibilante»: la cosa
   * giusta, ma per caso. Il primo filtro numerico aggiunto al dizionario si
   * sarebbe comportato male in silenzio.
   *
   * «Sibilante» nomina un PROBLEMA: nessuno chiede «più sibilante», quindi le
   * due frasi sono la stessa richiesta e devono dare lo stesso filtro.
   */
  assert.equal(leggiDescrizione('grave').filtri.semitones, -5);
  assert.equal(leggiDescrizione('meno grave').filtri.semitones, 5, '«meno» non ha invertito il numero');

  assert.deepEqual(
    leggiDescrizione('meno sibilante').filtri,
    leggiDescrizione('sibilante').filtri,
    'un problema non si capovolge: «meno sibilante» e «sibilante» chiedono la stessa cosa',
  );
});
