/**
 * La voce nel Worker (fetta 6a): «leggi questo».
 *
 * Sincrona come l'immagine: si addebita, si chiama, si risponde con l'audio
 * dentro la stessa richiesta — oppure si rimborsa e lo si dice. Lo stesso giro
 * di `genera()` in `index.js`, nessun secondo meccanismo di soldi.
 *
 * Tutto ciò che può rifiutare rifiuta **prima** dell'addebito: testo, voce,
 * chiave, misura. Addebitare per poi rimborsare subito è un giro di soldi che
 * il cliente vede per niente.
 */

import { addebita, rimborsa, rimborsoRiuscito, apriLavoro, chiudiLavoro } from './conto.js';
import { leggiConElevenLabs } from './fornitori/elevenlabs.js';
import {
  MISURA_VOCE, VOCE_LEGGI, caratteriDi, costoLettura, letturaNonValida, prezzoLettura,
} from '../src/engine/listinoVoce.js';

const json = (dati, stato = 200) =>
  new Response(JSON.stringify(dati), { status: stato, headers: { 'content-type': 'application/json' } });

/**
 * POST /genera per la lettura. `chi` è già verificato dal chiamante.
 *
 * @param opzioni.misura la misura del listino. Solo le prove la cambiano: la
 *   rotta passa sempre quella scritta in `listinoVoce.js`, così il prezzo che
 *   il Worker addebita è per costruzione quello che il browser ha mostrato.
 */
export async function generaVoce(corpo, chi, env, { misura = MISURA_VOCE } = {}) {
  const { testo, voce } = corpo;
  const storta = letturaNonValida({ testo, voce });
  if (storta) return json({ errore: storta }, 400);

  // La chiave PRIMA dell'addebito, come il video: il Worker in produzione
  // prima che il committente metta la chiave.
  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  // Senza misura non c'è prezzo: il tasto è spento, e il Worker non si fida
  // di un browser che lo premesse lo stesso.
  const conto = prezzoLettura(testo, misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  const prezzo = conto.total;
  const pulito = testo.trim();
  const lavoro = crypto.randomUUID();
  let lavoroAperto = false;
  // `null` = «non so se l'addebito è passato» (Task 4 della revisione di
  // `genera`): nel `catch` si tenta il rimborso lo stesso, a favore del cliente.
  let rimasto = null;

  try {
    rimasto = await addebita(chi.id, prezzo, env);
    if (rimasto === null) return json({ errore: 'saldo', prezzo }, 402);

    lavoroAperto = await apriLavoro({ id: lavoro, utente: chi.id, servizio: VOCE_LEGGI, prezzo }, env);
    if (!lavoroAperto) throw Object.assign(new Error('archivio'), { code: 'archivio' });

    const { dati, mime, caratteri } = await leggiConElevenLabs({ testo: pulito, voce, env });

    // Il costo vero dai caratteri che ElevenLabs ha contato, alla tariffa
    // misurata; se non li dichiara, dal conto nostro (per eccesso).
    const costoReale = costoLettura(caratteri ?? caratteriDi(pulito), misura);
    let chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) {
      console.error(`chiudiLavoro('${lavoro}', 'fatto') ha fallito due volte: lo spazzino rimborserebbe una lettura riuscita`);
    }
    return json({
      dati, mime, prezzo, saldo: rimasto, lavoro,
      ...(chiuso ? {} : { avviso: 'lavoro-non-chiuso' }),
    });
  } catch (e) {
    // Hai incassato per una cosa che non è successa: si rimborsa, e si dice
    // com'è andata davvero — `rimborsato: true` solo se il rimborso ha preso.
    const esito = await rimborsa(chi.id, prezzo, lavoroAperto ? lavoro : null, env);
    if (await rimborsoRiuscito(esito)) {
      if (lavoroAperto) await chiudiLavoro(lavoro, 'rimborsato', null, env);
      return json({
        errore: 'fornitore', dettaglio: e.code || 'ignoto', rimborsato: true,
        saldo: rimasto === null ? null : rimasto + prezzo,
      }, 502);
    }
    // Il rimborso non ha preso: il lavoro resta 'in-corso' e lo spazzino orario
    // lo raccoglie (`sbloccaAppesi`).
    return json({ errore: 'fornitore', dettaglio: e.code || 'ignoto', rimborsato: false, saldo: rimasto }, 502);
  }
}
