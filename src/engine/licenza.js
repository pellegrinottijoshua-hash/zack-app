/**
 * Chi può lavorare, e chi no.
 *
 * È la parte che decide se un cliente pagante apre lo studio o resta fuori.
 * Pura, e in `engine/` dove i test la vedono in Node: un muro sbagliato non
 * solleva niente — si scopre quando qualcuno che ha pagato non riesce a
 * entrare, cioè nel momento peggiore.
 *
 * **Le date sono DUE** (spec § 7.1), e confonderle sbaglia in tutt'e due i
 * versi:
 *
 * - `validoFino` — fino a quando è pagato l'abbonamento. Lo dice Stripe.
 * - `chiestoIl` — quando il server ha risposto l'ultima volta. Lo dice il
 *   browser.
 *
 * Guardare solo la prima tiene aperto un mese a chi ha disdetto e non è più
 * tornato online. Guardare solo la seconda tiene aperto per sempre a chi non
 * ha mai pagato, purché stacchi la rete.
 */

/**
 * Quanti giorni si lavora senza sentire il server.
 *
 * Gli strumenti girano sul computer del cliente: chiuderlo fuori dai propri
 * strumenti perché un server è giù è il guasto peggiore possibile per questo
 * prodotto. Sette giorni coprono un guasto, un viaggio, una settimana senza
 * rete — e non si possono abusare, perché per allungarli bisogna restare
 * offline, e offline non si genera niente, cioè non si spende niente di chi
 * offre il servizio.
 */
export const GRAZIA_GIORNI = 7;

/** Quanti giorni ha chi usava lo studio quando era gratis (spec § 7.4). */
export const PROVA_GIORNI = 14;

const GIORNO = 86400000;

/** Una data che non si legge non è una data: vale «no», non «adesso». */
function quando(iso) {
  if (typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * Lo stato della licenza.
 *
 * @returns {'aperto'|'prova'|'scaduto'|'da-ricollegare'|'mai-entrato'}
 */
export function statoLicenza(licenza, { adesso = new Date() } = {}) {
  if (!licenza || typeof licenza !== 'object') return 'mai-entrato';

  const ora = adesso.getTime();
  const chiesto = quando(licenza.chiestoIl);
  if (chiesto === null) return 'mai-entrato';

  // Prima la freschezza: una risposta troppo vecchia non dice più niente su
  // niente, nemmeno sulla prova.
  if (ora - chiesto >= GRAZIA_GIORNI * GIORNO) return 'da-ricollegare';

  const fino = quando(licenza.validoFino);
  if (licenza.abbonato === true && fino !== null && ora < fino) return 'aperto';

  const prova = quando(licenza.provaFino);
  if (prova !== null && ora < prova) return 'prova';

  return 'scaduto';
}

/**
 * Si lavora?
 *
 * Lista chiusa e non «diverso da scaduto»: uno stato che un domani si aggiunge
 * verrebbe fatto passare per distrazione. Il danno di chiudere per sbaglio si
 * ripara con un tasto; quello di aprire per sbaglio no.
 */
export function puoiLavorare(stato) {
  return stato === 'aperto' || stato === 'prova';
}

/**
 * Quanti giorni restano di prova. Zero se non è in prova.
 *
 * Per **eccesso**: dire «restano 0 giorni» a chi ne ha ancora mezzo è una
 * bugia che fa chiudere l'app e non riaprirla.
 */
export function giorniAllaProva(licenza, { adesso = new Date() } = {}) {
  const fine = quando(licenza?.provaFino);
  if (fine === null) return 0;
  return Math.max(0, Math.ceil((fine - adesso.getTime()) / GIORNO));
}
