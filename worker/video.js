/**
 * Il video nel Worker (fase 3): chiedere, aspettare, consegnare o rimborsare.
 *
 * Un'immagine torna dentro la stessa richiesta; un video impiega minuti.
 * Quindi due porte:
 *   POST /genera (servizio video) → addebita, apre il lavoro, crea il task,
 *                                   risponde 202 { lavoro, prezzo, saldo };
 *   GET  /lavoro?id=…             → chiede al fornitore e consegna l'URL,
 *                                   oppure rimborsa, oppure «ancora in corso».
 *
 * La regola del file, la stessa di tutto il conto: **se il fornitore non
 * risponde non si conclude niente.** Un errore di rete non diventa né un
 * video consegnato né un rimborso: si risponde «in corso» e si richiede.
 */

import { SUPABASE_URL } from '../src/lib/supabase.js';
import {
  CANALI, VOCE_VIDEO, canaleConsentito, costoDaToken, prezzoVideo, richiestaVideoNonValida,
} from '../src/engine/listinoVideo.js';
import { addebita, rimborsa, rimborsoRiuscito, apriLavoro, chiudiLavoro } from './conto.js';
import { crea, leggi } from './fornitori/seedance.js';

const json = (dati, stato = 200) =>
  new Response(JSON.stringify(dati), { status: stato, headers: { 'content-type': 'application/json' } });

const conServizio = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
});

/** Il canale acceso. Uno sconosciuto non ricade su un default: è un errore di configurazione. */
export function canaleAcceso(env) {
  return env.VIDEO_FORNITORE || 'byteplus';
}

async function annotaTask(lavoro, dati, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/lavori?id=eq.${lavoro}`, {
    method: 'PATCH',
    headers: conServizio(env),
    body: JSON.stringify(dati),
  });
  return res.ok;
}

async function lavoroDi(id, utente, env) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lavori?id=eq.${encodeURIComponent(id)}&utente=eq.${utente}&select=*`,
    { headers: conServizio(env) },
  );
  if (!res.ok) return undefined; // «non lo so», diverso da «non c'è»
  const righe = await res.json();
  return righe[0] || null;
}

/** Rimborsa una volta sola e chiude. Torna vero se il cliente ha riavuto i soldi. */
async function rimborsaEChiudi(l, env) {
  const esito = await rimborsa(l.utente, l.prezzo, l.id, env);
  if (!(await rimborsoRiuscito(esito))) return false;
  await chiudiLavoro(l.id, 'rimborsato', null, env);
  return true;
}

/** POST /genera per il video. `chi` è già verificato dal chiamante. */
export async function generaVideo(corpo, chi, env) {
  const { prompt, durata, risoluzione, formato } = corpo;
  if (typeof prompt !== 'string' || !prompt.trim()) return json({ errore: 'senza-prompt' }, 400);
  const storta = richiestaVideoNonValida({ durata, risoluzione, formato });
  if (storta) return json({ errore: storta }, 400);

  const canale = canaleAcceso(env);
  if (!CANALI.includes(canale)) return json({ errore: 'non-configurato' }, 503);
  /*
   * La chiave del canale PRIMA dell'addebito: senza, il fornitore non si
   * chiama nemmeno, e addebitare per poi rimborsare subito è un giro di soldi
   * che il cliente vede per niente (il Worker in produzione prima che il
   * committente metta la chiave).
   */
  if (!(canale === 'byteplus' ? env.ARK_API_KEY : env.HF_CREDENTIALS)) {
    return json({ errore: 'non-configurato' }, 503);
  }
  /*
   * ⚠️ Il cancello del canale, PRIMA dell'addebito: un canale che costa più
   * del prezzo (Higgsfield a listino) non genera, a meno che il committente
   * non l'abbia deciso con VIDEO_ACCETTA_PERDITA=1.
   */
  if (!canaleConsentito({ canale, durata, risoluzione, accettaPerdita: env.VIDEO_ACCETTA_PERDITA === '1' })) {
    return json({ errore: 'canale-in-perdita' }, 503);
  }

  const { total: prezzo } = prezzoVideo({ durata, risoluzione, formato });
  const lavoro = crypto.randomUUID();
  let lavoroAperto = false;
  let rimasto = null;
  try {
    rimasto = await addebita(chi.id, prezzo, env);
    if (rimasto === null) return json({ errore: 'saldo', prezzo }, 402);

    lavoroAperto = await apriLavoro({ id: lavoro, utente: chi.id, servizio: VOCE_VIDEO, prezzo }, env);
    if (!lavoroAperto) throw Object.assign(new Error('archivio'), { code: 'archivio' });

    const { rif } = await crea({ canale, prompt, durata, risoluzione, formato, utente: chi.id }, env);

    const dati = { fornitore: canale, fornitore_rif: rif, richiesta: { durata, risoluzione, formato } };
    if (!(await annotaTask(lavoro, dati, env)) && !(await annotaTask(lavoro, dati, env))) {
      // Il task gira ma il lavoro non lo sa: il giro orario rimborserà, e se
      // il video arriva lo paghiamo noi. Raro, e rumoroso apposta.
      console.error(`annotaTask('${lavoro}') ha fallito due volte: task ${canale}/${rif} senza lavoro`);
    }
    return json({ lavoro, prezzo, saldo: rimasto }, 202);
  } catch (e) {
    if (rimasto === null) return json({ errore: 'archivio' }, 500);
    // Addebitato ma non partito: si rimborsa. Senza la riga di `lavori` il
    // rimborso non può citarla (chiave esterna), quindi si passa `null`.
    const esito = await rimborsa(chi.id, prezzo, lavoroAperto ? lavoro : null, env);
    const rimborsato = await rimborsoRiuscito(esito);
    if (rimborsato && lavoroAperto) await chiudiLavoro(lavoro, 'rimborsato', null, env);
    return json({ errore: e.code === 'non-configurato' ? 'non-configurato' : 'fornitore', rimborsato }, 502);
  }
}

/** GET /lavoro?id=… — solo il padrone del lavoro. */
export async function statoLavoro(id, chi, env) {
  if (!id) return json({ errore: 'senza-id' }, 400);
  const l = await lavoroDi(id, chi.id, env);
  if (l === undefined) return json({ stato: 'in-corso' }); // archivio muto: non si conclude
  if (!l) return json({ errore: 'lavoro-sconosciuto' }, 404);
  if (l.stato === 'rimborsato' || l.stato === 'fallito') return json({ stato: 'rimborsato' });
  if (!l.fornitore_rif) return json({ stato: 'in-corso' });

  let r;
  try {
    r = await leggi({ canale: l.fornitore, rif: l.fornitore_rif, ...(l.richiesta || {}) }, env);
  } catch {
    return json({ stato: 'in-corso' }); // il fornitore non risponde: non si conclude niente
  }

  if (r.stato === 'fatto') {
    if (l.stato === 'in-corso') await chiudiLavoro(l.id, 'fatto', costoDaToken(r.token, l.fornitore), env);
    return json({ stato: 'fatto', url: r.url });
  }
  if (r.stato === 'fallito') {
    // Un lavoro già «fatto» non si rimborsa mai, qualunque cosa dica dopo il fornitore.
    if (l.stato === 'fatto') return json({ stato: 'fatto' });
    const ok = await rimborsaEChiudi(l, env);
    return json(ok ? { stato: 'rimborsato', motivo: r.motivo } : { stato: 'in-corso' });
  }
  return json({ stato: 'in-corso' });
}

/**
 * Dopo quanto un video «in corso» si rimborsa senza che il fornitore l'abbia
 * detto fallito. BytePlus fa morire il task dopo un'ora (SCADENZA_SECONDI):
 * a due ore è morto di sicuro. Higgsfield non ha scadenza: due ore, e il
 * rischio residuo è scritto nella spec (§6).
 */
export const VIDEO_ABBANDONATO_MINUTI = 120;

/**
 * Il giro orario per UN lavoro video appeso. Chiede al fornitore PRIMA di
 * rimborsare: rimborsare un video che sta ancora girando lo regalerebbe.
 */
export async function sbloccaVideo(l, env, adesso = Date.now()) {
  const eta = (adesso - new Date(l.creato_il).getTime()) / 60000;
  if (!l.fornitore_rif) return rimborsaEChiudi(l, env);
  let r;
  try {
    r = await leggi({ canale: l.fornitore, rif: l.fornitore_rif, ...(l.richiesta || {}) }, env);
  } catch {
    // Fornitore muto: si riprova al prossimo giro, e dopo un giorno si chiude.
    return eta > 24 * 60 ? rimborsaEChiudi(l, env) : false;
  }
  if (r.stato === 'fatto') {
    await chiudiLavoro(l.id, 'fatto', costoDaToken(r.token, l.fornitore), env);
    return false;
  }
  if (r.stato === 'fallito' || eta > VIDEO_ABBANDONATO_MINUTI) return rimborsaEChiudi(l, env);
  return false;
}

/**
 * GET /lavoro/video?id=… — i byte del video, dalla stessa origine.
 *
 * L'URL del fornitore sta su un altro dominio: il browser lo può MOSTRARE, ma
 * non può leggerlo in un blob per salvarlo nella libreria (CORS). Il Worker
 * lo passa, e solo al padrone del lavoro. Non lo conserva: lo attraversa.
 */
export async function scaricaVideo(id, chi, env) {
  if (!id) return json({ errore: 'senza-id' }, 400);
  const l = await lavoroDi(id, chi.id, env);
  if (!l) return json({ errore: 'lavoro-sconosciuto' }, 404);
  if (l.stato !== 'fatto' || !l.fornitore_rif) return json({ errore: 'non-pronto' }, 409);
  let r;
  try {
    r = await leggi({ canale: l.fornitore, rif: l.fornitore_rif, ...(l.richiesta || {}) }, env);
  } catch {
    return json({ errore: 'fornitore' }, 502);
  }
  if (r.stato !== 'fatto' || !r.url) return json({ errore: 'scaduto' }, 410);
  const video = await fetch(r.url).catch(() => null);
  if (!video?.ok) return json({ errore: 'scaduto' }, 410);
  return new Response(video.body, {
    headers: {
      'content-type': video.headers.get('content-type') || 'video/mp4',
      'cache-control': 'private, no-store',
    },
  });
}
