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
