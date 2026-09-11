import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARGIN, mils, toEuro, priceFor, formatEuro } from '../src/engine/ledger.js';

/*
 * Il denaro si conta in MILLESIMI di euro, interi.
 *
 * Non in centesimi, e la ragione non e' la precisione: e' l'onesta'. Il
 * margine e' il 14% del COSTO, cioe' il 12,3% del prezzo. Arrotondato al
 * centesimo su cifre piccole non lo e' piu': su un costo di 12 centesimi il
 * margine diventa 2, cioe' il 14,3%. E questo prodotto si vende scrivendo
 * «di ogni euro, Zack ne rimette 12 centesimi su di se'».
 *
 * Un numero pubblicato che non e' quello che incassi non e' un arrotondamento:
 * e' una frase falsa sulla propria home.
 *
 * E non in virgola mobile, mai: 0,1 + 0,2 fa 0,30000000000000004, e su denaro
 * vero quell'errore si accumula finche' qualcuno spende un millesimo che non
 * ha. E' il motivo per cui le banche non usano i float.
 */

test('gli euro diventano millesimi interi', () => {
  assert.equal(mils(1), 1000);
  assert.equal(mils(0.14), 140);
  assert.equal(mils(0.1) + mils(0.2), 300, 'in float farebbe 0,30000000000000004');
  assert.equal(Number.isInteger(mils(2.99)), true);
  assert.equal(mils(2.99), 2990);
});

test('il margine dichiarato e’ quello incassato', () => {
  // 127 e' un costo d'esempio per provare l'aritmetica PURA di `priceFor()`
  // — non deve piu' combaciare col costo base del listino (128 dal Task 6
  // della revisione, docs/2026-09-10-misura-nbp.md): qui si prova la
  // funzione, non una cifra specifica di Nano Banana Pro.
  const p = priceFor(127);
  assert.equal(p.cost, 127);
  assert.equal(p.margin, 18, '14% di 127 fa 17,78, arrotondato al piu’ vicino 18');
  assert.equal(p.total, 145);

  const quota = p.margin / p.total;
  assert.ok(quota > 0.115 && quota < 0.128, `il margine e’ il ${(quota * 100).toFixed(1)}% invece del 12%`);
});

test('⚠️ al centesimo la stessa cosa mentirebbe', () => {
  /*
   * La prova che il cambio di unita' serviva. Al centesimo il costo e' 13
   * (127 millesimi arrotondati), il margine per eccesso e' Math.ceil(13 *
   * 0,14) = 2, il totale 15: il 13,3% invece del 12,4 che si ottiene al
   * millesimo. E' sempre sopra il 12% che la home dichiara — ma non e' questo
   * il punto: il punto e' che il centesimo lo gonfia e il millesimo no. Questo
   * test non chiede al codice di fare qualcosa — descrive il difetto che il
   * codice adesso non ha, perche' fra sei mesi qualcuno proporra' di tornare
   * ai centesimi «che sono piu' semplici».
   */
  const alCentesimo = { cost: 13, margin: Math.ceil(13 * MARGIN), total: 13 + Math.ceil(13 * MARGIN) };
  const quotaCentesimo = alCentesimo.margin / alCentesimo.total;
  const alMillesimo = priceFor(127);
  const quotaMillesimo = alMillesimo.margin / alMillesimo.total;

  assert.ok(quotaCentesimo > quotaMillesimo, 'al centesimo il margine dichiarato dovrebbe gonfiarsi, non restare uguale');
  assert.ok(quotaCentesimo > 0.13, `al centesimo il margine e' il ${(quotaCentesimo * 100).toFixed(1)}%, non sopra il 13`);
  assert.ok(quotaMillesimo < 0.128, `al millesimo il margine e' il ${(quotaMillesimo * 100).toFixed(1)}%, non sotto il 12,8`);
});

test('arrotonda al PIU’ VICINO, non per eccesso', () => {
  // `ceil` al millesimo arrotonda su 0,1 centesimi ogni volta e rigonfia il
  // margine dichiarato. `round` sbaglia al massimo di 0,05 centesimi, e
  // sbaglia in tutt'e due i versi.
  assert.equal(priceFor(100).margin, 14, '14% di 100 fa esattamente 14');
  assert.equal(priceFor(101).margin, 14, '14,14 arrotonda a 14, non a 15');
  assert.equal(priceFor(110).margin, 15, '15,4 arrotonda a 15');
});

test('un costo storto non produce un prezzo', () => {
  // Un prezzo inventato e' peggio di un errore: si addebita.
  for (const brutto of [-1, NaN, Infinity, null, undefined, '12', {}]) {
    assert.throws(() => priceFor(brutto), `«${JSON.stringify(brutto)}» ha prodotto un prezzo`);
  }
});

test('i millesimi si scrivono come euro veri', () => {
  // Il separatore fra cifra e simbolo, in italiano, e' uno spazio
  // UNIFICATORE (U+00A0), non uno spazio normale (U+0020): e' cosi' che lo
  // scrive `Intl.NumberFormat('it-IT', …)`, ed e' la cosa giusta da tenere,
  // perche' impedisce che «0,14» e «€» finiscano su due righe diverse. Scritto
  // come escape apposta, perche' nessuno lo «aggiusti» incollandoci uno
  // spazio normale che sembra identico e non lo e'.
  assert.equal(formatEuro(140, 'it'), '0,14\u00A0€');
  assert.equal(formatEuro(5000, 'it'), '5,00\u00A0€');
  assert.equal(formatEuro(140, 'en'), '€0.14');
  assert.equal(toEuro(140), 0.14);
});
