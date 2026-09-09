/**
 * Leggere gli eventi di Stripe: a chi vanno, e fino a quando.
 *
 * Sta a parte da `index.js` perché è **puro** — dentro entra l'evento, fuori
 * esce cosa farne — e quindi `node --test` lo vede. Dentro un Worker questa
 * roba si prova malissimo, e questa è roba che va provata: se sbaglia,
 * qualcuno paga e resta chiuso fuori, oppure smette di pagare e resta dentro.
 */

const GIORNO = 86400000;

/**
 * ⚠️ **Chi ha pagato non sta sempre nello stesso posto.**
 *
 * È il difetto che il piano portava scritto dentro: leggere `metadata.utente`
 * e basta. Funziona alla prima iscrizione e **poi mai più**, perché quel
 * `metadata` è quello della *sessione di pagamento*, che esiste una volta
 * sola. Al rinnovo arriva una *fattura*, alla disdetta un *abbonamento*: due
 * oggetti diversi, con due `metadata` diversi.
 *
 * Cosa sarebbe successo: il primo mese giusto, il secondo il rinnovo arriva,
 * non trova nessuno a cui accreditarlo, ed esce da una porta che risponde
 * `{ok: true}` senza lamentarsi. Trentadue giorni dopo il cliente paga
 * regolarmente e trova il muro. Non un errore nei log, non un allarme:
 * un cliente che se ne va.
 *
 * La cura sta in due punti, e servono tutt'e due: il `metadata` si mette
 * ANCHE sull'abbonamento quando si apre il pagamento (`index.js`), e qui si
 * guarda in tutti i posti dove Stripe lo mette.
 */
export function chiPaga(oggetto = {}) {
  return (
    oggetto.metadata?.utente || // sessione di pagamento, e abbonamento
    oggetto.subscription_details?.metadata?.utente || // fattura
    oggetto.lines?.data?.[0]?.metadata?.utente || // fattura, altre versioni API
    null
  );
}

/** Gli eventi che aprono, e quelli che chiudono. Il resto non ci riguarda. */
const APRONO = new Set(['checkout.session.completed', 'invoice.paid']);
const CHIUDONO = new Set(['customer.subscription.deleted']);

/**
 * Fino a quando vale l'abbonamento, secondo Stripe.
 *
 * Quando Stripe la data ce la manda già dentro l'evento, si usa quella: Stripe
 * è la fonte di verità sui pagamenti (spec § 6), e inventarsi una scadenza
 * accanto alla sua è il modo di trovarsi due risposte alla stessa domanda.
 *
 * Quando non c'è — la sessione di pagamento non porta il periodo — valgono 32
 * giorni. Sbaglia dalla parte giusta: un mese di calendario è al massimo 31,
 * quindi chi paga non si trova chiuso fuori un giorno prima del rinnovo. Al
 * primo rinnovo arriva la data vera e la sostituisce.
 */
function finoA(oggetto, adesso) {
  const secondi =
    oggetto.lines?.data?.[0]?.period?.end ??
    oggetto.current_period_end ??
    oggetto.period?.end ??
    null;
  if (Number.isFinite(secondi) && secondi > 0) return new Date(secondi * 1000).toISOString();
  return new Date(adesso.getTime() + 32 * GIORNO).toISOString();
}

/**
 * Cosa scrivere in `conti` per questo evento, o `null` se non c'è niente da
 * fare.
 *
 * @param evento l'evento di Stripe, già verificato nella firma
 */
export function cosaFare(evento, { adesso = new Date() } = {}) {
  const tipo = evento?.type;
  const apre = APRONO.has(tipo);
  const chiude = CHIUDONO.has(tipo);
  if (!apre && !chiude) return null;

  const oggetto = evento.data?.object || {};
  const utente = chiPaga(oggetto);
  // Senza sapere a chi, non si scrive niente: meglio non fare che accreditare
  // l'abbonamento alla persona sbagliata.
  if (!utente) return null;

  return {
    utente,
    abbonato: apre,
    valido_fino: apre ? finoA(oggetto, adesso) : new Date(adesso).toISOString(),
    stripe_cliente: typeof oggetto.customer === 'string' ? oggetto.customer : null,
  };
}
