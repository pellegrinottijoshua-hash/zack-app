import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chiediLicenza, generaImmagine, vaiAllaRicarica } from '../src/lib/conto.js';

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

test('un riferimento che non si legge piu’: NON si genera, e niente parte verso /genera', async () => {
  /*
   * Il Critical della revisione: `Preventivo` e il controllo del saldo
   * contano `riferimenti.length`, ma scartare in silenzio un riferimento il
   * cui asset e' stato cancellato fra la scelta e il tasto significherebbe
   * mostrare N riferimenti e addebitarne N-1 — la promessa della home rotta
   * in due punti insieme. Qui si verifica che non parta NESSUNA richiesta.
   */
  let chiamato = false;
  globalThis.fetch = async () => {
    chiamato = true;
    return risposta({});
  };

  await assert.rejects(
    () =>
      generaImmagine({
        prompt: 'una prova',
        riferimenti: [{ ruolo: 'personaggio', assetId: 'cancellato' }],
        leggiAsset: async () => null, // l’asset non c’e’ piu’: il cammino disegnato in App.jsx
      }),
    (e) => e.code === 'asset-mancante',
    'generaImmagine non ha sollevato l’errore che nomina il problema',
  );
  assert.equal(chiamato, false, 'generaImmagine ha chiamato /genera con un riferimento mancante');
});

test('⚠️ Giro di correzioni 1 — generaImmagine porta fuori RIMBORSATO come l’ha detto il worker, in tutt’e due i valori', async () => {
  /*
   * Il rilievo: le prove di `test/genera.test.js` si fermano al corpo della
   * risposta del Worker, e nessuna prova tocca il `throw` di `generaImmagine`
   * — che e' proprio dove App.jsx legge `e.rimborsato` per scegliere il
   * messaggio. Un refuso qui (`corpo.rimborso` invece di `corpo.rimborsato`,
   * o il campo dimenticato nel `throw`) lascerebbe passare `undefined` senza
   * che nessuna prova se ne accorgesse.
   *
   * `otteniSessione` finto scavalca `sessione()` (sempre `null` in
   * `node --test`, vedi sopra), esattamente come `leggiAsset` scavalca la
   * libreria: la tratta verso /genera si raggiunge senza una sessione vera.
   */
  for (const rimborsato of [true, false]) {
    globalThis.fetch = async () =>
      risposta({ errore: 'fornitore', dettaglio: 'ignoto', rimborsato, saldo: 4000 }, false);

    await assert.rejects(
      () =>
        generaImmagine({
          prompt: 'una prova',
          riferimenti: [],
          leggiAsset: async () => null,
          otteniSessione: async () => 'token-finto',
        }),
      (e) => e.rimborsato === rimborsato,
      `generaImmagine non ha portato fuori rimborsato: ${rimborsato}`,
    );
  }
});

test('⚠️ Giro di correzioni 1 — il messaggio del rimborso parte dal ramo PRUDENTE, non da quello ottimista', () => {
  /*
   * Il rilievo: `e.rimborsato === false ? rimborsoInCorso : rimborsato`
   * cade sul ramo OTTIMISTA («non hai pagato niente») ogni volta che
   * `e.rimborsato` e' `undefined` — cioe' ogni volta che qualcosa a monte
   * (un refuso in `conto.js`, un campo dimenticato) rompe la catena. Si
   * legge il sorgente perche' questo file, come gli altri qui sopra, non
   * puo' montare `App.jsx` (niente jsdom).
   */
  const i = APP.indexOf("t(e.rimborsato ===");
  assert.notEqual(i, -1, 'il ternario del messaggio di rimborso non c’e’ più in App.jsx');
  const riga = APP.slice(i, APP.indexOf('\n', i));
  assert.match(
    riga,
    /e\.rimborsato\s*===\s*true\s*\?\s*'immagine\.rimborsato'\s*:\s*'immagine\.rimborsoInCorso'/,
    'il ternario riparte dal ramo ottimista: un `rimborsato` mancante mentirebbe di nuovo',
  );
});

/* ---------------------------------------------------------------- *
 * `vaiAllaRicarica` — Task 8.
 *
 * In `node --test` non esiste mai una sessione Supabase vera (nessun
 * `localStorage`, nessun flusso OAuth reale): `sessione()` torna sempre
 * `null`, cioè lo stesso stato di un cliente che non si è collegato. È lo
 * stesso limite per cui questo file, più sopra, legge App.jsx come testo
 * invece di eseguirlo — qui si legge conto.js per la stessa ragione, per la
 * metà del comportamento che il guasto reale non lascia raggiungere.
 * ---------------------------------------------------------------- */

// «Senza sessione non apre nessun pagamento» era la regola fino alla fetta
// 2b: ora senza sessione si entra come ospite. Il caso in cui ci si ferma
// davvero (nemmeno l'ospite nasce) e' difeso in fondo al file.

test('vaiAllaRicarica manda al Worker SOLO l’id del pacchetto', () => {
  /*
   * Un browser che dichiara un importo è un browser che paga quanto vuole
   * (già difeso lato Worker da `test/workerConto.test.js`). Qui si legge il
   * sorgente perché la richiesta vera non si può eseguire in questo
   * ambiente: si prova che il corpo che PARTIREBBE non porta mai una cifra.
   */
  const conto = readFileSync(new URL('../src/lib/conto.js', import.meta.url), 'utf8');
  const inizio = conto.indexOf('export async function vaiAllaRicarica');
  assert.notEqual(inizio, -1, 'vaiAllaRicarica non esiste più in conto.js');
  // `\n}\n` e non `\n}`: dalla fetta 2b la firma ha le opzioni su piu'
  // righe, e il primo `\n}` e' la loro chiusura, non quella della funzione.
  const fine = conto.indexOf('\n}\n', inizio);
  const corpo = conto.slice(inizio, fine);
  assert.match(
    corpo,
    // Dalla fetta 2c viaggia anche `ritorno`: un NOME fra due, non una cifra.
    /body:\s*JSON\.stringify\(\{\s*pacchetto,\s*ritorno\s*\}\)/,
    'il corpo della richiesta non manda SOLO il pacchetto (e il ritorno)',
  );
  assert.doesNotMatch(
    corpo,
    /millesimi|centesimi|prezzo|importo|amount/i,
    'una cifra viaggia verso /ricarica: il prezzo lo deve decidere il Worker',
  );
});

test('il tasto del saldo — l’unico ingresso alla ricarica — si vede ANCHE a saldo zero', () => {
  /*
   * Critical del giro di correzioni: era `{crediti > 0 && (<button
   * className="saldo" ...>)}`, ed e’ l’UNICO ingresso al pannello della
   * ricarica in tutta l’app — i due montaggi di `<Ricarica>` dipendono
   * entrambi da `sopraLaTela === 'ricarica'`, che solo questo tasto imposta.
   * A saldo zero — lo stato di OGNI cliente nuovo, il primo momento
   * d’acquisto per cui Task 8 esiste — il tasto spariva e non c’era
   * alternativa: vicolo chiuso. Si legge il sorgente perche’ questo
   * progetto non disegna componenti (niente jsdom, niente testing-library).
   */
  const i = APP.indexOf('className="saldo"');
  assert.notEqual(i, -1, 'il tasto del saldo non c’e’ piu’ in App.jsx');
  const prima = APP.slice(Math.max(0, i - 400), i);
  assert.doesNotMatch(
    prima,
    /crediti\s*[><]/,
    'il tasto del saldo e’ tornato dietro una condizione sui crediti: a saldo zero sparirebbe di nuovo',
  );
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

/* ---------------------------------------------------------------- *
 * Fetta 2b — la ricarica da ospite. Stato dichiarato: NESSUNA sessione.
 * ---------------------------------------------------------------- */

test('⚠️ senza sessione la ricarica entra come ospite e paga, invece di fermarsi', async () => {
  /*
   * Rompere apposta: togli `if (!token) token = await ospite();` da
   * `vaiAllaRicarica` → senza email non si paga, cioè la porta sui soldi
   * torna chiusa a chi non riceve il link.
   */
  const fetchVero = globalThis.fetch;
  const viste = [];
  globalThis.fetch = async (u, o) => {
    viste.push({ u: String(u), auth: o.headers.authorization, corpo: o.body });
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/x' }), { status: 200 });
  };
  let andato = null;
  let ospiti = 0;
  try {
    await vaiAllaRicarica('p2', {
      otteniSessione: async () => null,
      ospite: async () => { ospiti++; return 'tok-ospite'; },
      vai: (url) => { andato = url; },
    });
  } finally {
    globalThis.fetch = fetchVero;
  }
  assert.equal(ospiti, 1, 'non e’ entrato come ospite');
  assert.equal(viste.length, 1);
  assert.equal(viste[0].auth, 'Bearer tok-ospite', 'la ricarica non porta il token dell’ospite');
  assert.equal(JSON.parse(viste[0].corpo).pacchetto, 'p2');
  assert.equal(andato, 'https://checkout.stripe.com/x');
});

test('chi ha gia’ una sessione non diventa un ospite nuovo', async () => {
  const fetchVero = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ url: 'https://x' }), { status: 200 });
  let ospiti = 0;
  try {
    await vaiAllaRicarica('p5', {
      otteniSessione: async () => 'tok-vero',
      ospite: async () => { ospiti++; return 'tok-ospite'; },
      vai: () => {},
    });
  } finally {
    globalThis.fetch = fetchVero;
  }
  assert.equal(ospiti, 0, 'ha buttato la sessione di chi era gia’ entrato');
});

test('se nemmeno l’ospite si riesce a creare, lo dice e non chiama il Worker', async () => {
  const fetchVero = globalThis.fetch;
  let chiamate = 0;
  globalThis.fetch = async () => { chiamate++; return new Response('{}'); };
  try {
    await assert.rejects(
      vaiAllaRicarica('p2', { otteniSessione: async () => null, ospite: async () => null, vai: () => {} }),
      /non-collegato/,
    );
  } finally {
    globalThis.fetch = fetchVero;
  }
  assert.equal(chiamate, 0);
});

test('⚠️ l’avviso dell’ospite sta nella ricarica, cioè PRIMA di pagare, e arriva da /me', () => {
  /*
   * Fetta 2b. Rompere apposta: togli `ospite={ospite}` da uno dei due
   * `<Ricarica` di App.jsx → chi paga senza email da quel pannello non sa che
   * il credito vive solo in questo browser.
   */
  const RIC = readFileSync(new URL('../src/components/Ricarica.jsx', import.meta.url), 'utf8');
  assert.match(RIC, /ospite && <p className="ricarica-ospite">\{t\('ricarica\.ospite'\)\}/);
  const montaggi = APP.match(/<Ricarica\b[\s\S]*?\/>/g) || [];
  assert.equal(montaggi.length, 2, 'i montaggi di <Ricarica> non sono piu’ due: rileggi questa prova');
  for (const m of montaggi) assert.match(m, /ospite=\{ospite\}/, 'un <Ricarica> non sa se chi paga e’ un ospite');
  const LIB = readFileSync(new URL('../src/lib/conto.js', import.meta.url), 'utf8');
  assert.match(LIB, /ospite: d\.ospite === true/, 'la licenza non ricorda di essere di un ospite');
});

test('chiediLicenza ricorda se e’ un ospite, e un sì solo se il server dice true', async () => {
  const fetchVero = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ ospite: true, crediti: 2000 }), { status: 200 });
    assert.equal((await chiediLicenza('t')).ospite, true);
    globalThis.fetch = async () => new Response(JSON.stringify({ ospite: 'si', crediti: 0 }), { status: 200 });
    assert.equal((await chiediLicenza('t')).ospite, false);
  } finally {
    globalThis.fetch = fetchVero;
  }
});

test('⚠️ chi è entrato con un nome e aspetta ancora /me non legge «paghi senza email»', async () => {
  /*
   * Correzione della code-review della 2b. Era `!licenza || licenza.ospite`:
   * senza licenza salvata, anche chi aveva appena fatto l'ingresso con
   * Google leggeva di essere un ospite. Rompere apposta: rimetti
   * `return true;` al posto di `return sessione === false;` in `eOspite`.
   */
  const { eOspite } = await import('../src/engine/licenza.js');
  assert.equal(eOspite({ licenza: null, sessione: true }), false, 'un utente con nome trattato da ospite');
  assert.equal(eOspite({ licenza: null, sessione: null }), false, 'nel dubbio l’avviso deve tacere');
  assert.equal(eOspite({ licenza: null, sessione: false }), true, 'chi non è nessuno pagherà da ospite');
  assert.equal(eOspite({ licenza: { ospite: true }, sessione: true }), true);
  assert.equal(eOspite({ licenza: { ospite: false }, sessione: false }), false, 'la licenza vince sulla sessione');
});

/* ── fase 3: il video, lato browser ─────────────────────────────── */

test('generaVideo manda al Worker solo la richiesta, mai una cifra, e vuole un 202', async () => {
  const { generaVideo } = await import('../src/lib/conto.js');
  const fetchVero = globalThis.fetch;
  let corpo;
  globalThis.fetch = async (u, o) => {
    corpo = JSON.parse(o.body);
    return new Response(JSON.stringify({ lavoro: 'l-1', prezzo: 1260, saldo: 740 }), { status: 202 });
  };
  try {
    const d = await generaVideo({ prompt: 'x', durata: 5, risoluzione: '720p', formato: '16:9', otteniSessione: async () => 't' });
    assert.equal(d.lavoro, 'l-1');
  } finally {
    globalThis.fetch = fetchVero;
  }
  assert.deepEqual(Object.keys(corpo).sort(), ['durata', 'formato', 'prompt', 'risoluzione', 'servizio']);
});

test('generaVideo: un 402 diventa l’errore «saldo» col prezzo, non un successo', async () => {
  const { generaVideo } = await import('../src/lib/conto.js');
  const fetchVero = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ errore: 'saldo', prezzo: 1260 }), { status: 402 });
  try {
    await assert.rejects(
      generaVideo({ prompt: 'x', durata: 5, risoluzione: '720p', formato: '16:9', otteniSessione: async () => 't' }),
      (e) => e.code === 'saldo' && e.prezzo === 1260,
    );
  } finally {
    globalThis.fetch = fetchVero;
  }
});

test('⚠️ chiediLavoro: la rete giù è «in corso», mai «fallito» né «fatto»', async () => {
  const { chiediLavoro } = await import('../src/lib/conto.js');
  const fetchVero = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('offline'); };
    assert.deepEqual(await chiediLavoro('l-1', { otteniSessione: async () => 't' }), { stato: 'in-corso' });
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    assert.deepEqual(await chiediLavoro('l-1', { otteniSessione: async () => 't' }), { stato: 'in-corso' });
    globalThis.fetch = async () => new Response(JSON.stringify({ stato: 'inventato' }));
    assert.deepEqual(await chiediLavoro('l-1', { otteniSessione: async () => 't' }), { stato: 'in-corso' });
    globalThis.fetch = async () => new Response(JSON.stringify({ stato: 'fatto', url: 'https://v' }));
    assert.equal((await chiediLavoro('l-1', { otteniSessione: async () => 't' })).stato, 'fatto');
  } finally {
    globalThis.fetch = fetchVero;
  }
});
