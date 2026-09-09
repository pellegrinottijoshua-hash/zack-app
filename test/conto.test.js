import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chiediLicenza } from '../src/lib/conto.js';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

/*
 * «Non lo so» non e' «non hai pagato».
 *
 * E' la distinzione da cui dipende la spec § 3.4, ed e' quella che sparisce
 * per prima scrivendo il codice piu' naturale del mondo: chiedi al server,
 * salvi cio' che torna. Il giorno che il server non torna, quel codice salva
 * «niente» — e chi ha pagato si trova chiuso fuori dai propri strumenti
 * locali per colpa di un wifi, che per questo prodotto e' il guasto peggiore
 * possibile.
 *
 * Gli strumenti girano sul computer del cliente. Il server serve a dire chi
 * e', non a dargli il permesso di accendere il proprio computer.
 */

const fetchVero = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchVero;
});

const risposta = (corpo, ok = true) => ({ ok, json: async () => corpo });

test('il server risponde: la licenza torna, con la data del BROWSER', async () => {
  globalThis.fetch = async () =>
    risposta({ abbonato: true, validoFino: '2026-10-09T00:00:00.000Z', crediti: 12 });

  const prima = Date.now();
  const l = await chiediLicenza('token-finto');

  assert.equal(l.abbonato, true);
  assert.equal(l.validoFino, '2026-10-09T00:00:00.000Z');
  assert.equal(l.crediti, 12);

  /*
   * Le due date della spec § 7.1 sono DUE, e questa e' la seconda: dice
   * «quando ho sentito il server», non «cosa ha detto». Se venisse dal server
   * anche lei, un server fermo a ieri terrebbe aperta la grazia per sempre.
   */
  const chiesto = new Date(l.chiestoIl).getTime();
  assert.ok(chiesto >= prima && chiesto <= Date.now(), 'chiestoIl non e’ l’ora del browser');
});

test('il server risponde male: «non lo so», non «non abbonato»', async () => {
  globalThis.fetch = async () => risposta({ abbonato: false }, false);
  assert.equal(await chiediLicenza('token-finto'), null);
});

test('la rete non c’e’: «non lo so», e non si conclude niente', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  assert.equal(await chiediLicenza('token-finto'), null);
});

test('abbonato e’ vero solo se il server dice VERO', async () => {
  /*
   * Un `if (d.abbonato)` aprirebbe lo studio a una stringa `"no"`, che e'
   * vera in JavaScript. Il campo che decide chi paga si legge stretto.
   */
  for (const bugia of ['si', 'true', 1, {}, [], 'no']) {
    globalThis.fetch = async () => risposta({ abbonato: bugia });
    const l = await chiediLicenza('token-finto');
    assert.equal(l.abbonato, false, `«${JSON.stringify(bugia)}» ha aperto lo studio`);
  }
});

test('i crediti esistono da subito, e valgono zero', async () => {
  // Spec § 4.1: il campo c'e' prima di B2. Aggiungerlo dopo vorrebbe dire
  // cambiare la risposta a cui lo studio si e' gia' abituato.
  globalThis.fetch = async () => risposta({ abbonato: true });
  assert.equal((await chiediLicenza('token-finto')).crediti, 0);
});

test('un «non lo so» non sovrascrive MAI la licenza salvata', () => {
  /*
   * Questa e' la meta' della regola che vive in `App.jsx` e che un test in
   * Node non puo' eseguire: `aggiornaLicenza` deve uscire PRIMA di salvare.
   * Si legge il sorgente, perche' il costo di sbagliarla e' un cliente
   * pagante chiuso fuori, e nessun altro test la guarda.
   */
  const i = APP.indexOf('const fresca = await chiediLicenza(');
  assert.notEqual(i, -1, 'App.jsx non chiede piu’ la licenza al server');
  const dopo = APP.slice(i, i + 200);
  const uscita = dopo.indexOf('if (!fresca) return;');
  const salva = dopo.indexOf('salvaLicenza(');
  assert.notEqual(uscita, -1, 'manca l’uscita su «non lo so»: § 3.4');
  assert.ok(uscita < salva, 'si salva prima di controllare: un wifi chiude fuori chi ha pagato');
});

test('la sessione di Supabase non sta sulla strada del primo disegno', () => {
  /*
   * `@supabase/supabase-js` si porta dietro archivio e realtime, che a questo
   * prodotto non servono. Se entra nel pezzo principale, chi apre lo studio
   * aspetta un pacco intero per usare uno strumento che gira da lui.
   */
  const conto = readFileSync(new URL('../src/lib/conto.js', import.meta.url), 'utf8');
  assert.doesNotMatch(
    conto,
    /^import .*@supabase\/supabase-js/m,
    'supabase e’ importato in cima: finisce nel pezzo principale',
  );
  assert.match(conto, /await import\('@supabase\/supabase-js'\)/);
});
