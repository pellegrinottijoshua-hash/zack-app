import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPY } from '../src/landing/copy.js';

/*
 * Le parole della home, in due lingue.
 *
 * Il buco trovato il 2026-08-27: `i18n.test.js` copre `src/i18n/`, e la copy
 * della presentazione **non era coperta da niente**. Era l'unico posto del
 * prodotto dove una frase scritta in una lingua sola andava online senza che
 * niente si lamentasse — e la home nuova ne aggiunge una trentina.
 *
 * Il confronto è sulla FORMA, non sul contenuto: nessun test può dire se una
 * traduzione è buona. Può dire se c'è.
 */

/** Tutti i percorsi delle foglie, come `tool.steps.x4`. */
function chiavi(obj, prefisso = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefisso ? `${prefisso}.${k}` : k;
    if (Array.isArray(v)) {
      // Le liste (gli strumenti, le righe del confronto) devono avere la
      // stessa LUNGHEZZA: una voce in più da una parte è una riga che compare
      // in una lingua e non nell'altra.
      out.push(`${path}[]=${v.length}`);
      v.forEach((el, i) => {
        if (el && typeof el === 'object') out.push(...chiavi(el, `${path}[${i}]`));
      });
    } else if (v && typeof v === 'object') {
      out.push(...chiavi(v, path));
    } else {
      out.push(path);
    }
  }
  return out.sort();
}

test('italiano e inglese hanno esattamente le stesse chiavi', () => {
  const it = chiavi(COPY.it);
  const en = chiavi(COPY.en);
  const soloIt = it.filter((k) => !en.includes(k));
  const soloEn = en.filter((k) => !it.includes(k));
  assert.deepEqual(soloIt, [], `scritte solo in italiano: ${soloIt.join(', ')}`);
  assert.deepEqual(soloEn, [], `scritte solo in inglese: ${soloEn.join(', ')}`);
});

test('nessuna frase è vuota', () => {
  // Una chiave che esiste con dentro '' passa il confronto sopra e sulla
  // pagina lascia un buco bianco.
  for (const lingua of ['it', 'en']) {
    const cerca = (obj, dove) => {
      for (const [k, v] of Object.entries(obj)) {
        const path = `${lingua}.${dove}${k}`;
        if (typeof v === 'string') assert.ok(v.trim().length > 0, `${path} è vuota`);
        else if (v && typeof v === 'object') cerca(v, `${dove}${k}.`);
      }
    };
    cerca(COPY[lingua], '');
  }
});

test('«asset» resta la parola, e «lavoro/work/piece» non tornano dentro', () => {
  // La stessa regola che vale nello studio vale nella pagina che lo vende:
  // due nomi per la stessa cosa sono due cose, per chi legge.
  //
  // Il divieto è sul SOSTANTIVO. «Zack doesn't work alone» è il verbo, e
  // vietarlo non difende il vocabolario: rende solo la copy inglese peggiore.
  // Per questo `works` si vieta solo dov'è preceduto da un articolo o da un
  // possessivo — cioè dove sta nominando una cosa in libreria.
  const vietate = /\b(lavori|lavoro|pieces?)\b|\b(the|your|my|a|these|those|all)\s+works?\b/i;
  for (const lingua of ['it', 'en']) {
    const cerca = (obj, dove) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
          assert.equal(vietate.test(v), false, `${lingua}.${dove}${k}: «${v}»`);
        } else if (v && typeof v === 'object') cerca(v, `${dove}${k}.`);
      }
    };
    cerca(COPY[lingua], '');
  }
});

test('i segnaposto delle frasi con numeri esistono in tutte e due le lingue', () => {
  // `{fatti} di {totale}` senza i segnaposto stampa la frase e nessun numero:
  // e dove non c'è una misura non c'è un avviso.
  const segnaposto = (s) => (s.match(/\{[a-z]+\}/g) || []).sort().join(',');
  assert.equal(segnaposto(COPY.it.tool.progress), segnaposto(COPY.en.tool.progress));
  assert.ok(segnaposto(COPY.it.tool.progress).includes('{totale}'));
});

test('il prezzo sulla home e’ quello che Stripe fa pagare', () => {
  /*
   * Il 2026-09-09 il prodotto su Stripe e' stato creato a 2,99 € e la home ne
   * diceva 3,99 in tre punti, tabella di confronto compresa. Chi paga vede
   * quello di Stripe: un prezzo pubblicato piu' alto di quello vero non e'
   * generosita', e' una pagina che non corrisponde al prodotto — e un cliente
   * che se ne accorge si chiede cos'altro non corrisponde.
   *
   * ⚠️ Questo test NON puo' controllare Stripe: il numero va cambiato QUI ogni
   * volta che si cambia di la'. E' il promemoria che serve.
   */
  const tutto = JSON.stringify(COPY);
  assert.doesNotMatch(tutto, /3[.,]99/, 'la home dice ancora 3,99: su Stripe il prodotto e’ 2,99');
  assert.match(tutto, /2,99 €\/mese/, 'la home non dice piu’ il prezzo in italiano');
  assert.match(tutto, /€2\.99\/month/, 'la home non dice piu’ il prezzo in inglese');
});

test('la home non promette piu’ che non c’e’ un server', () => {
  /*
   * «Non c'e' un server che li guarda, perche' non c'e' un server» era vero
   * fino al 2026-09-09 ed e' diventato falso alla lettera: la Fase B ne mette
   * uno, che sa chi sei e se hai pagato. Una promessa smentita dal prodotto la
   * trova un cliente, non noi — e vale meno di zero, perche' fa mettere in
   * dubbio anche quelle vere.
   *
   * Cio' che resta vero e' la parte che conta, e si continua a dire: i file non
   * escono dal computer di chi lavora. Regge lo stesso confronto con Canva e
   * Adobe, e ha il pregio di essere ancora vera.
   *
   * ⚠️ Resta scritto — ed e' giusto — che gli STRUMENTI non girano su un
   * server. Quello non e' cambiato: e' il motivo per cui possono essere
   * illimitati. Il test guarda la promessa sull'archivio, non quella sul
   * calcolo.
   */
  const tutto = JSON.stringify(COPY);
  assert.doesNotMatch(
    tutto,
    /non c.è un server|no server watching|there.s no server/i,
    'la home promette ancora che un server non esiste',
  );
  assert.match(
    tutto,
    /non escono da questo computer/,
    'la home non dice piu’ dove stanno i file, in italiano',
  );
  assert.match(
    tutto,
    /never leave this computer/,
    'la home non dice piu’ dove stanno i file, in inglese',
  );
});
