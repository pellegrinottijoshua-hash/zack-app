import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COPY } from '../src/landing/copy.js';
import { prezzoDi } from '../src/engine/listino.js';
import { DESCRITTORI } from '../src/servizi/index.js';

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
   * Dove sono finiti i file lo dicono i test qui sotto: quella promessa e'
   * cambiata di nuovo l'11-09, quando i riferimenti hanno cominciato a
   * mandare un'immagine a un fornitore. Non si ripete qui il confronto con
   * una frase precisa: invecchierebbe due volte invece di una.
   */
  assert.doesNotMatch(
    JSON.stringify(COPY),
    /non c.è un server|no server watching|there.s no server/i,
    'la home promette ancora che un server non esiste',
  );
});

test('la home non promette piu’ che NESSUN file esce', () => {
  /*
   * «I tuoi file non escono da questo computer» e' stata scritta il
   * 2026-09-09 per sostituirne un'altra diventata falsa. Con i riferimenti
   * diventa falsa a meta': un riferimento va a Google, per forza.
   *
   * Resta vera per gli strumenti locali, quindi si SPACCA IN DUE invece di
   * cancellarla: la parte vera e' il vantaggio piu' grande del prodotto.
   */
  const tutto = JSON.stringify(COPY);
  assert.doesNotMatch(tutto, /non escono da questo computer/, 'promette ancora che niente esce');
  assert.doesNotMatch(tutto, /never leave this computer/);
  assert.match(tutto, /Quando generi|When you generate/i, 'non dice cosa succede generando');
});

test('la home dice che i crediti non scadono', () => {
  // Chi compra 25 € ha diritto di saperlo PRIMA. Ed e' un vantaggio, non una
  // postilla: quasi nessuno lo fa.
  assert.match(JSON.stringify(COPY), /non scadono/);
  assert.match(JSON.stringify(COPY), /never expire/);
});

test('la frase dei dodici centesimi dice il numero vero', () => {
  /*
   * Il 12 non e' una cifra tonda scelta a occhio: e' `margin / total` del
   * listino. Il giorno che il listino cambia e il numero non torna, si cambia
   * la FRASE — non si lascia li'.
   */
  const { margin, total } = prezzoDi('immagine-nbp');
  const centesimiPerEuro = Math.round((margin / total) * 100);
  assert.equal(centesimiPerEuro, 12, `il margine e’ ${centesimiPerEuro} centesimi per euro, non 12`);
  assert.match(JSON.stringify(COPY), /12 centesimi/);
  assert.match(JSON.stringify(COPY), /12 cents/);
});

test('privacy.body conta gli strumenti locali com’è nel listino, non a occhio', () => {
  /*
   * Il capitolato di questo task scrive «I sei strumenti non mandano niente
   * da nessuna parte» — ma i descrittori con `serve: 'abbonamento'`, cioè
   * quelli che girano davvero sul computer del cliente, sono CINQUE:
   * scontorna, brain, vocale, effetti, vettorializza. Il sesto, «Immagine»,
   * ha `serve: 'saldo'` e manda al fornitore per mestiere — esattamente
   * quello che la frase pretende di escludere.
   *
   * Il numero non si scrive a mano nella frase e non si scrive a mano qui:
   * si CONTA in `src/servizi/index.js`. B3 aggiunge servizi (Seedance,
   * ElevenLabs); il giorno che un servizio locale si aggiunge o si toglie,
   * deve essere questo conto a dirlo — non un cliente che legge un numero
   * sbagliato.
   */
  const locali = Object.values(DESCRITTORI).filter((d) => d.serve === 'abbonamento').length;
  const inLettere = {
    3: ['tre', 'three'],
    4: ['quattro', 'four'],
    5: ['cinque', 'five'],
    6: ['sei', 'six'],
    7: ['sette', 'seven'],
    8: ['otto', 'eight'],
  };
  const parole = inLettere[locali];
  assert.ok(parole, `nessuna parola prevista per ${locali} strumenti locali — allarga la mappa`);
  const [it, en] = parole;
  assert.match(
    JSON.stringify(COPY.it),
    new RegExp(`\\b${it}\\b`, 'i'),
    `la home italiana non dice «${it}» strumenti`,
  );
  assert.match(
    JSON.stringify(COPY.en),
    new RegExp(`\\b${en}\\b`, 'i'),
    `la home inglese non dice «${en}» tools`,
  );
});
