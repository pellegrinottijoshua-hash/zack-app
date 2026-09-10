/**
 * L'aritmetica del prezzo. Pura, e **di tutt'e due**: la importa il browser
 * per il preventivo e il Worker per l'addebito.
 *
 * È la § 3.1 della spec di B1 — «il preventivo e l'addebito leggono la stessa
 * tabella» — resa impossibile da violare: non sono due tabelle che si
 * assomigliano, è la stessa funzione.
 *
 * **Tutto in millesimi di euro, interi.** Non centesimi: il margine è il 14%
 * del costo, cioè il 12,3% del prezzo, e arrotondato al centesimo su cifre
 * piccole diventa il 14,3% — un numero pubblicato che non è quello che
 * incassi. Non virgola mobile: 0,1 + 0,2 fa 0,30000000000000004, e su denaro
 * vero quell'errore si accumula finché qualcuno spende un millesimo che non ha.
 *
 * Qui non c'è nessun saldo. Il saldo vive in Postgres e si muove solo con le
 * due funzioni SQL del Task 2: un saldo in JavaScript sarebbe un saldo che si
 * riscrive dalla console.
 */

/** Il margine dichiarato, applicato al costo del fornitore. */
export const MARGIN = 0.14;

/** Euro → millesimi interi. */
export const mils = (euro) => Math.round(Number(euro) * 1000);

/** Millesimi → euro, per chi deve scrivere un numero. */
export const toEuro = (m) => m / 1000;

/**
 * Prezzo finale al cliente, dal costo del fornitore. Tutto in millesimi.
 *
 * `Math.round` e non `Math.ceil`: al millesimo, arrotondare per eccesso alza
 * di 0,1 centesimi ogni volta e rigonfia il margine dichiarato. Al più vicino
 * si sbaglia di 0,05 centesimi, e si sbaglia in tutt'e due i versi — che è ciò
 * che rende vera la frase «di ogni euro, 12 centesimi».
 */
export function priceFor(costoMillesimi) {
  const cost = costoMillesimi;
  if (typeof cost !== 'number' || !Number.isInteger(cost) || cost < 0) {
    throw Object.assign(new Error('costo-non-valido'), { code: 'costo-non-valido' });
  }
  const margin = Math.round(cost * MARGIN);
  return { total: cost + margin, cost, margin };
}

/** Il numero che il cliente legge, nella sua lingua. */
export function formatEuro(millesimi, lang = 'it') {
  return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(toEuro(millesimi));
}
