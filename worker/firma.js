/**
 * La firma di Stripe, verificata a mano.
 *
 * ⚠️ **È la riga che, se manca, non rompe niente e regala il prodotto.** Un
 * webhook non verificato è un abbonamento gratis per chiunque sappia fare una
 * POST al nostro `/webhook` con dentro un finto «pagamento riuscito». Non
 * solleva errori e non compare nei log come un problema: si scopre guardando i
 * conti di Stripe che non tornano.
 *
 * A mano e non con la libreria di Stripe: sono venti righe di Web Crypto, che
 * gira sia nel Worker sia in Node — quindi **si può provare**. La libreria
 * dentro un Worker si prova molto peggio, e questa è la parte che va provata.
 */

/** Oltre questo scarto un webhook è vecchio: uno intercettato non vale per sempre. */
const TOLLERANZA_SECONDI = 5 * 60;

const esadecimale = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Confronto a tempo costante.
 *
 * Un `===` su stringhe esce al primo carattere diverso, e la differenza di
 * tempo racconta quanti caratteri erano giusti. Con abbastanza tentativi si
 * indovina una firma un carattere per volta.
 */
function ugualiSenzaFretta(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * La firma è autentica, recente, e sul corpo che abbiamo ricevuto?
 *
 * @param {string} corpo il corpo GREZZO, esattamente come è arrivato
 * @param {string} intestazione l'header `Stripe-Signature`
 * @param {string} segreto `STRIPE_WEBHOOK_SECRET`
 */
export async function verificaFirma(corpo, intestazione, segreto, { adesso = new Date() } = {}) {
  // Senza segreto si CHIUDE. È il caso della configurazione dimenticata, e
  // aprire sarebbe il difetto peggiore: capita in produzione, al primo deploy
  // fatto di fretta, e non si vede.
  if (!segreto || typeof intestazione !== 'string') return false;

  const parti = Object.fromEntries(
    intestazione.split(',').map((p) => p.split('=').map((x) => x.trim())),
  );
  const t = Number(parti.t);
  const v1 = parti.v1;
  if (!Number.isFinite(t) || !v1) return false;

  if (Math.abs(Math.floor(adesso.getTime() / 1000) - t) > TOLLERANZA_SECONDI) return false;

  const chiave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const atteso = esadecimale(
    await crypto.subtle.sign('HMAC', chiave, new TextEncoder().encode(`${t}.${corpo}`)),
  );
  return ugualiSenzaFretta(atteso, v1);
}
