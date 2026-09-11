/**
 * I tre pacchetti di crediti: cosa può comprare il cliente.
 *
 * Sta a parte da `listino.js` di proposito: quel file dice «cosa costa un
 * servizio», questo dice «cosa si compra». Due domande diverse — mescolarle
 * in un file solo vuol dire che cambiando l'una si tocca anche l'altra per
 * sbaglio, ed è esattamente la regola che tiene questo repo su file a una
 * responsabilità sola.
 *
 * La forma è quella di `ledger.js` e `listino.js`: un modulo puro, importato
 * COSÌ COM'È dal browser (per disegnare i tre tasti di `Ricarica.jsx`) e dal
 * Worker (per decidere quanto far incassare a Stripe in `/ricarica`).
 * `worker/eventi.js` non ne tiene una copia — ri-esporta questo oggetto,
 * proprio perché due copie degli stessi numeri divergono al primo pacchetto
 * nuovo: il browser mostrerebbe un prezzo, Stripe ne incasserebbe un altro, e
 * lo si scoprirebbe sulla schermata del pagamento.
 *
 * Due unità perché i due mondi ne usano due: il saldo vive in **millesimi**
 * di euro, Stripe incassa in **centesimi**. Il fattore mille scritto in due
 * posti è la stessa trappola spostata di una riga — `test/pacchetti.test.js`
 * lega le due colonne, non solo i nomi.
 */
export const PACCHETTI = {
  p5: { millesimi: 5000, centesimi: 500 },
  p10: { millesimi: 10000, centesimi: 1000 },
  p25: { millesimi: 25000, centesimi: 2500 },
};
