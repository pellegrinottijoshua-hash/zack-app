import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUANDO,
  SERVE,
  getDescrittore,
  strumentiVisibili,
  validaDescrittore,
  servizioAperto,
  DESCRITTORI,
} from '../src/servizi/index.js';
import it from '../src/i18n/it.json' with { type: 'json' };
import en from '../src/i18n/en.json' with { type: 'json' };

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

test('un servizio tolto non risponde piu’', () => {
  /*
   * «Filmato» e' stato tolto il 2026-09-09: la rimozione dello sfondo da un
   * video vuole il modello su OGNI fotogramma — circa otto minuti per dieci
   * secondi di clip — e il committente ha deciso che non ha senso.
   *
   * Il test non e' cerimonia: `getDescrittore` deve DIRLO, non restituire
   * `undefined`, o una schermata resterebbe vuota senza errore.
   */
  assert.throws(() => getDescrittore('filmato'), /filmato/);
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

test('ogni etichetta di ogni descrittore esiste in tutt’e due le lingue', () => {
  /*
   * `claim` e `label` sono CHIAVI i18n, non testo. Una scritta storta non fa
   * fallire niente: `t()` restituisce la chiave, e sullo schermo compare
   * «sound.saveVoice» sotto un'icona. E' il tipo di difetto che si nota solo
   * guardando la sezione giusta nella lingua giusta — cioe' quasi mai.
   */
  const at = (dict, key) => key.split('.').reduce((o, p) => (o == null ? o : o[p]), dict);
  for (const [id, d] of Object.entries(DESCRITTORI)) {
    const opzioni = (d.tasto.opzioni || []).map((o) => o.label);
    for (const chiave of [d.claim, ...d.strumenti.map((s) => s.label), ...opzioni]) {
      for (const [lang, dict] of [['it', it], ['en', en]]) {
        assert.equal(
          typeof at(dict, chiave),
          'string',
          `${id}: la chiave «${chiave}» non esiste in ${lang}`,
        );
      }
    }
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

test('ogni strumento «con-risultato» puo’ davvero comparire', () => {
  /*
   * `strumentiVisibili` prende un booleano `risultato`, e chi lo calcola in
   * App.jsx deve sapere COSA conta come risultato per quel servizio: un PNG
   * per lo scontorno, un SVG per il vettoriale. Con la sola condizione del
   * PNG, «apri nell'editor» del vettoriale non sarebbe comparso mai — un
   * cerchio dichiarato, un gesto scritto, e nessun modo di arrivarci.
   *
   * Qui si prova la meta' che si puo' provare in Node: che ogni strumento
   * dichiarato con-risultato compaia quando il risultato c'e'. L'altra meta'
   * — che App.jsx passi il tipo giusto — la difende `test/impianto.test.js`.
   */
  for (const [id, d] of Object.entries(DESCRITTORI)) {
    const dichiarati = d.strumenti.filter((s) => s.quando === 'con-risultato').map((s) => s.id);
    if (dichiarati.length === 0) continue;
    const visti = strumentiVisibili(d, { file: true, risultato: true }).map((s) => s.id);
    for (const x of dichiarati) {
      assert.ok(visti.includes(x), `${id}: «${x}» non compare nemmeno col risultato`);
    }
  }
});

/*
 * Il muro era UNO SOLO per tutto lo studio (`chiuso = muroAcceso &&
 * !puoiLavorare(statoConto)`), e chiudeva anche la generazione. Ma il
 * committente ha deciso che i crediti restano a chi disdice e si possono
 * spendere: chi ha 18 € di credito e nessun abbonamento troverebbe una porta
 * chiusa davanti a soldi suoi. Da qui in poi la chiusura sta nel
 * DESCRITTORE, non in un interruttore unico.
 */

test('ogni servizio dichiara COSA gli serve, e da una lista chiusa', () => {
  // Chiusa come `QUANDO` e `LATI`: un valore inventato non chiuderebbe e non
  // aprirebbe, e nessuno saprebbe perche'.
  for (const [id, d] of Object.entries(DESCRITTORI)) {
    assert.ok(SERVE.includes(d.serve), `${id}: «${d.serve}» non e’ nella lista`);
  }
});

test('i cinque strumenti locali chiedono l’abbonamento', () => {
  for (const id of ['scontorna', 'brain', 'vocale', 'effetti', 'vettorializza']) {
    assert.equal(DESCRITTORI[id].serve, 'abbonamento', `${id} ha cambiato regola`);
  }
});

test('chi ha crediti e non ha l’abbonamento GENERA', () => {
  // E' la decisione del committente resa raggiungibile. Senza questo, i suoi
  // soldi sarebbero dietro una porta chiusa.
  const gen = { id: 'immagine', serve: 'saldo' };
  assert.equal(servizioAperto(gen, { stato: 'scaduto', crediti: 5000, prezzo: 140 }), true);
  assert.equal(servizioAperto(gen, { stato: 'mai-entrato', crediti: 5000, prezzo: 140 }), true);
});

test('senza crediti la generazione e’ chiusa anche a chi e’ abbonato', () => {
  // L'abbonamento paga gli strumenti locali, non il fornitore.
  const gen = { id: 'immagine', serve: 'saldo' };
  assert.equal(servizioAperto(gen, { stato: 'aperto', crediti: 100, prezzo: 140 }), false);
  assert.equal(servizioAperto(gen, { stato: 'aperto', crediti: 140, prezzo: 140 }), true);
});

test('gli strumenti locali non si aprono coi crediti', () => {
  // Il verso opposto, e sbagliarlo regalerebbe lo studio a chi carica 5 €.
  const loc = { id: 'scontorna', serve: 'abbonamento' };
  assert.equal(servizioAperto(loc, { stato: 'scaduto', crediti: 99999, prezzo: 0 }), false);
  assert.equal(servizioAperto(loc, { stato: 'prova', crediti: 0, prezzo: 0 }), true);
});

test('uno strumento senza descrittore resta chiuso, non passa gratis quando il muro si accende', () => {
  /*
   * Il capitolato proponeva `Boolean(DESCRITTORI[tool]) &&` come guardia. Ma
   * `tool` non e' sempre un descrittore — l'editor, e le altre viste fuori
   * dall'impianto (App.jsx righe 2103, 2477, 2482) — ed erano murate come
   * tutto il resto. Con quella guardia avrebbero smesso di esserlo
   * nell'istante in cui il muro si accende, e il prodotto sarebbe diventato
   * in parte gratuito. `servizioAperto` senza descrittore ricade da solo su
   * `puoiLavorare(stato)`, cioe' esattamente il comportamento di prima — la
   * guardia non serviva a niente e faceva danno.
   */
  assert.equal(servizioAperto(undefined, { stato: 'scaduto', crediti: 99999, prezzo: 0 }), false);
  assert.equal(servizioAperto(undefined, { stato: 'aperto', crediti: 0, prezzo: 0 }), true);
});
