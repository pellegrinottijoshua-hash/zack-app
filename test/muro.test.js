import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puoiLavorare } from '../src/engine/licenza.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

/*
 * Il muro chiude gli STRUMENTI. Mai i file di chi li ha fatti.
 *
 * E' la promessa della spec § 3.5, ed e' quella che si rompe per prima
 * mettendo il muro nel posto sbagliato: avvolgere tutta l'app e' la cosa piu'
 * comoda da scrivere, e chiude anche la libreria.
 */

test('la libreria si vede ANCHE col muro alzato', () => {
  /*
   * La prima stesura di questo test cercava che la libreria non fosse dietro
   * un `puoiLavorare(...) &&`, e passava — ma passava a VUOTO: la libreria era
   * dietro `!DESCRITTORI[tool]`, e dal 2026-09-09 tutti e cinque i servizi
   * hanno un descrittore. Non era dietro il muro perche' non c'era proprio.
   *
   * Un test che puo' passare senza che la cosa esista non prova niente. Questo
   * chiede il contrario: che la condizione NOMINI il muro, e nel verso giusto.
   */
  const i = APP.indexOf('<Library');
  assert.notEqual(i, -1, 'la libreria non e’ montata in App.jsx');
  const condizione = APP.slice(Math.max(0, i - 300), i);
  assert.match(
    condizione,
    /chiuso \|\|/,
    'la libreria non si vede col muro alzato: § 3.5 dice che non si chiude mai',
  );
});

test('il muro e’ SPENTO finche’ non c’e’ da che parte entrare', () => {
  /*
   * Il 2026-09-09 il muro e' finito in produzione coi Task 4 e 5 — quelli che
   * permettono di ENTRARE — ancora da fare, e Cloudflare ricostruisce da solo:
   * lo studio si e' chiuso per tutti, e non c'era nemmeno la porta.
   *
   * Adesso e' un interruttore spento per difetto. Questo test esiste perche'
   * il giorno che qualcuno lo accende sia una DECISIONE e non una distrazione.
   */
  assert.match(APP, /VITE_MURO === '1'/, 'il muro non e’ piu’ dietro un interruttore');
  assert.match(APP, /const chiuso = muroAcceso &&/, 'il muro si alza senza passare dall’interruttore');
});

test('il muro prende il posto del PIANO, non della schermata', () => {
  assert.match(APP, /<Muro\b/, 'il muro non e’ montato in App.jsx');
  // Se il muro avvolgesse `.shell` chiuderebbe anche la striscia e la libreria.
  const i = APP.indexOf('<Muro');
  const intorno = APP.slice(Math.max(0, i - 600), i);
  assert.doesNotMatch(intorno, /<div className="shell"/, 'il muro avvolge tutta la schermata');
});

test('gli stati che fanno lavorare restano due', () => {
  // Se questo numero cambia e' una decisione, non una cosa che scivola dentro.
  const quali = ['aperto', 'prova', 'scaduto', 'da-ricollegare', 'mai-entrato'].filter(puoiLavorare);
  assert.deepEqual(quali, ['aperto', 'prova']);
});
