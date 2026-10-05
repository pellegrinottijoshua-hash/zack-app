/**
 * La voce nel Worker (fase 6): leggere (6a), disegnare e clonare (6b),
 * cambiare la voce di una registrazione (6c).
 *
 * Sincrona come l'immagine: si addebita, si chiama, si risponde dentro la
 * stessa richiesta — oppure si rimborsa e lo si dice. Il giro di soldi è uno
 * solo (`conAddebito`), lo stesso di `genera()` in `index.js`.
 *
 * Tutto ciò che può rifiutare rifiuta **prima** dell'addebito: richiesta,
 * chiave, misura, consenso. Addebitare per poi rimborsare subito è un giro di
 * soldi che il cliente vede per niente.
 */

import { SUPABASE_URL } from '../src/lib/supabase.js';
import { addebita, rimborsa, rimborsoRiuscito, apriLavoro, chiudiLavoro } from './conto.js';
import {
  leggiConElevenLabs, disegnaConElevenLabs, creaDaAnteprima, clonaConElevenLabs, cancellaConElevenLabs,
  cambiaConElevenLabs, inventaConElevenLabs,
} from './fornitori/elevenlabs.js';
import {
  MISURA_VOCE, MISURA_DISEGNO, MISURA_CLONAZIONE, MISURA_CAMBIO, MAX_SECONDI_CAMBIO, CAMPIONE_MAX_BYTE,
  VOCE_LEGGI, VOCE_DISEGNA, VOCE_CLONA, VOCE_CAMBIA, VOCI_PRONTE,
  caratteriDi, costoLettura, letturaNonValida, prezzoLettura, prezzoDisegno, prezzoClonazione, prezzoCambio,
  descrizioneNonValida, nomeVoceNonValido, voceAmmessa, durataWav,
  EFFETTO_INVENTA, MISURA_EFFETTO, effettoNonValido, prezzoEffetto,
} from '../src/engine/listinoVoce.js';
import { consensoNonValido, testoConsenso } from '../src/engine/voci.js';

const json = (dati, stato = 200) =>
  new Response(JSON.stringify(dati), { status: stato, headers: { 'content-type': 'application/json' } });

const conServizio = (env, extra = {}) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
  ...extra,
});

/**
 * Quante voci proprie per conto. Le voci stanno tutte nello STESSO conto
 * ElevenLabs, che ne tiene un numero limitato per piano: senza un tetto, un
 * cliente le finirebbe per tutti.
 */
export const MAX_VOCI_PER_CONTO = 3;

/* ---------------------------- l'archivio ------------------------------- */

/** Gli id delle voci di questo conto; `undefined` = «non lo so» (archivio muto). */
async function vociDi(utente, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/voci?utente=eq.${utente}&select=eleven_id`, {
    headers: conServizio(env),
  });
  if (!res.ok) return undefined;
  const righe = await res.json().catch(() => null);
  return Array.isArray(righe) ? righe.map((r) => r.eleven_id) : undefined;
}

async function registraVoce(riga, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/voci`, {
    method: 'POST',
    headers: conServizio(env),
    body: JSON.stringify(riga),
  });
  return res.ok;
}

async function togliVoce(elevenId, utente, env) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/voci?eleven_id=eq.${encodeURIComponent(elevenId)}&utente=eq.${utente}`,
    { method: 'DELETE', headers: conServizio(env) },
  );
  return res.ok;
}

async function scriviConsenso(riga, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/consensi`, {
    method: 'POST',
    headers: conServizio(env),
    body: JSON.stringify(riga),
  });
  return res.ok;
}

/** L'impronta del campione: SHA-256 in esadecimale. */
async function impronta(byte) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', byte));
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Base64 → byte, o `null` se non è base64. */
function byteDa(base64) {
  if (typeof base64 !== 'string' || !base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) return null;
  try {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/* ---------------------------- i soldi ---------------------------------- */

/**
 * Addebita, apre il lavoro, lavora, chiude — o rimborsa e lo dice.
 *
 * `lavora()` torna `{ dati, costoReale }`: `dati` va nella risposta.
 * `rimasto = null` vuol dire «non so se l'addebito è passato» (Task 4 della
 * revisione di `genera`): nel `catch` si tenta il rimborso lo stesso.
 */
async function conAddebito({ chi, prezzo, servizio, env }, lavora) {
  const lavoro = crypto.randomUUID();
  let lavoroAperto = false;
  let rimasto = null;
  try {
    rimasto = await addebita(chi.id, prezzo, env);
    if (rimasto === null) return json({ errore: 'saldo', prezzo }, 402);

    lavoroAperto = await apriLavoro({ id: lavoro, utente: chi.id, servizio, prezzo }, env);
    if (!lavoroAperto) throw Object.assign(new Error('archivio'), { code: 'archivio' });

    const { dati, costoReale = null } = await lavora();

    let chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) {
      console.error(`chiudiLavoro('${lavoro}', 'fatto') ha fallito due volte: lo spazzino rimborserebbe un lavoro riuscito`);
    }
    return json({ ...dati, prezzo, saldo: rimasto, lavoro, ...(chiuso ? {} : { avviso: 'lavoro-non-chiuso' }) });
  } catch (e) {
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

/**
 * Le voci proprie che servono a questa richiesta: niente se la voce è una
 * pronta, altrimenti quelle del conto. `undefined` = archivio muto.
 */
async function proprieSeServe(voce, chi, env) {
  if (VOCI_PRONTE.some((v) => v.id === voce)) return [];
  return vociDi(chi.id, env);
}

/* ---------------------------- 6a: leggi -------------------------------- */

/**
 * @param opzioni.misura solo le prove la cambiano: la rotta passa sempre
 *   quella del listino, così il prezzo addebitato è quello mostrato.
 */
export async function generaVoce(corpo, chi, env, { misura = MISURA_VOCE } = {}) {
  const { testo, voce } = corpo;
  // La forma prima, senza rete: una richiesta storta non tocca l'archivio.
  const forma = letturaNonValida({ testo, voce, proprie: [voce] });
  if (forma) return json({ errore: forma }, 400);

  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  const conto = prezzoLettura(testo, misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  const proprie = await proprieSeServe(voce, chi, env);
  if (proprie === undefined) return json({ errore: 'archivio' }, 500);
  if (!voceAmmessa(voce, proprie)) return json({ errore: 'voce-sconosciuta' }, 400);

  const pulito = testo.trim();
  return conAddebito({ chi, prezzo: conto.total, servizio: VOCE_LEGGI, env }, async () => {
    const { dati, mime, caratteri } = await leggiConElevenLabs({ testo: pulito, voce, env });
    // Il costo vero dai caratteri che ElevenLabs ha contato, alla tariffa
    // misurata; se non li dichiara, dal conto nostro (per eccesso).
    return { dati: { dati, mime }, costoReale: costoLettura(caratteri ?? caratteriDi(pulito), misura) };
  });
}

/* ---------------------------- 6b: disegna ------------------------------ */

/** Una descrizione → tre anteprime da ascoltare. Si paga il disegno. */
export async function disegnaVoce(corpo, chi, env, { misura = MISURA_DISEGNO } = {}) {
  const { descrizione } = corpo;
  const storta = descrizioneNonValida(descrizione);
  if (storta) return json({ errore: storta }, 400);
  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  const conto = prezzoDisegno(misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  return conAddebito({ chi, prezzo: conto.total, servizio: VOCE_DISEGNA, env }, async () => ({
    dati: { anteprime: await disegnaConElevenLabs({ descrizione: descrizione.trim(), env }) },
    costoReale: conto.cost,
  }));
}

/**
 * POST /voce/tieni — un'anteprima diventa una voce del conto. Non si paga:
 * il disegno è già stato pagato. Ma c'è il tetto di voci per conto.
 */
export async function tieniVoce(corpo, chi, env) {
  const { anteprima, nome, descrizione } = corpo;
  if (typeof anteprima !== 'string' || !anteprima) return json({ errore: 'senza-anteprima' }, 400);
  const nomeStorto = nomeVoceNonValido(nome);
  if (nomeStorto) return json({ errore: nomeStorto }, 400);
  if (descrizioneNonValida(descrizione)) return json({ errore: 'descrizione' }, 400);
  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);

  const gia = await vociDi(chi.id, env);
  if (gia === undefined) return json({ errore: 'archivio' }, 500);
  if (gia.length >= MAX_VOCI_PER_CONTO) return json({ errore: 'troppe-voci', massimo: MAX_VOCI_PER_CONTO }, 409);

  let elevenId;
  try {
    elevenId = await creaDaAnteprima({ nome: nome.trim(), descrizione: descrizione.trim(), anteprima, env });
  } catch (e) {
    return json({ errore: 'fornitore', dettaglio: e.code || 'ignoto' }, 502);
  }
  const riga = { eleven_id: elevenId, utente: chi.id, nome: nome.trim(), origine: 'disegnata', consenso: null };
  if (!(await registraVoce(riga, env)) && !(await registraVoce(riga, env))) {
    // Una voce presso ElevenLabs che il conto non sa di avere: non si potrebbe
    // né usare né cancellare. Si toglie subito.
    await cancellaConElevenLabs({ voce: elevenId, env }).catch(() => {});
    return json({ errore: 'archivio' }, 500);
  }
  return json({ voce: { id: elevenId, nome: nome.trim(), origine: 'disegnata', consenso: null } });
}

/* ---------------------------- 6b: clona -------------------------------- */

/**
 * Clonare un campione. ⚠️ Il consenso lo controlla e lo SCRIVE il Worker,
 * prima di addebitare e prima di chiamare: senza la riga in `consensi`, la
 * clonazione non parte (spec §2.4).
 */
export async function clonaVoce(corpo, chi, env, { misura = MISURA_CLONAZIONE } = {}) {
  const { nome, consenso, campione, mime } = corpo;
  const nomeStorto = nomeVoceNonValido(nome);
  if (nomeStorto) return json({ errore: nomeStorto }, 400);
  const consensoStorto = consensoNonValido(consenso);
  if (consensoStorto) return json({ errore: consensoStorto }, 400);
  if (typeof mime !== 'string' || !/^audio\/[a-z0-9.+-]+$/i.test(mime)) return json({ errore: 'campione' }, 400);
  if (typeof campione !== 'string' || campione.length > Math.ceil((CAMPIONE_MAX_BYTE * 4) / 3) + 4) {
    return json({ errore: 'campione-troppo-grande' }, 413);
  }
  const byte = byteDa(campione);
  if (!byte || !byte.length) return json({ errore: 'campione' }, 400);

  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  const conto = prezzoClonazione(misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  const gia = await vociDi(chi.id, env);
  if (gia === undefined) return json({ errore: 'archivio' }, 500);
  if (gia.length >= MAX_VOCI_PER_CONTO) return json({ errore: 'troppe-voci', massimo: MAX_VOCI_PER_CONTO }, 409);

  const idConsenso = crypto.randomUUID();
  const scritto = await scriviConsenso({
    id: idConsenso,
    utente: chi.id,
    scelta: consenso.scelta,
    chi_parla: consenso.scelta === 'permesso' ? consenso.chiParla.trim() : null,
    impronta: await impronta(byte),
    testo: testoConsenso(consenso),
  }, env);
  if (!scritto) return json({ errore: 'archivio' }, 500);

  const pulito = nome.trim();
  return conAddebito({ chi, prezzo: conto.total, servizio: VOCE_CLONA, env }, async () => {
    const elevenId = await clonaConElevenLabs({ nome: pulito, campione: byte, mime, env });
    const riga = { eleven_id: elevenId, utente: chi.id, nome: pulito, origine: 'clonata', consenso: idConsenso };
    if (!(await registraVoce(riga, env)) && !(await registraVoce(riga, env))) {
      await cancellaConElevenLabs({ voce: elevenId, env }).catch(() => {});
      throw Object.assign(new Error('archivio'), { code: 'archivio' });
    }
    return {
      dati: { voce: { id: elevenId, nome: pulito, origine: 'clonata', consenso: idConsenso } },
      costoReale: conto.cost,
    };
  });
}

/* ---------------------------- 6b: cancella ----------------------------- */

/**
 * POST /voce/cancella — svuotare il cestino cancella la voce ANCHE presso
 * ElevenLabs (§2.3). Solo una voce di questo conto. `{ ok: true }` vuol dire
 * che non esiste più da nessuna parte; altrimenti il browser la tiene nel
 * cestino e lo dice.
 */
export async function cancellaVoce(corpo, chi, env) {
  const { voce } = corpo;
  if (typeof voce !== 'string' || !voce) return json({ errore: 'senza-voce' }, 400);
  if (VOCI_PRONTE.some((v) => v.id === voce)) return json({ errore: 'voce-pronta' }, 400);
  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);

  const mie = await vociDi(chi.id, env);
  if (mie === undefined) return json({ errore: 'archivio' }, 500);
  // Una voce che il conto non ha (già cancellata, o di un altro): per questo
  // conto non esiste, e il file nel cestino si può togliere.
  if (!mie.includes(voce)) return json({ ok: true, gia: true });

  try {
    await cancellaConElevenLabs({ voce, env });
  } catch (e) {
    return json({ errore: 'fornitore', dettaglio: e.code || 'ignoto' }, 502);
  }
  if (!(await togliVoce(voce, chi.id, env))) await togliVoce(voce, chi.id, env);
  return json({ ok: true });
}

/* ---------------------------- 6c: cambia ------------------------------- */

/**
 * La voce di una registrazione diventa un'altra. Entra un WAV a 16 kHz mono
 * (`WAV_CAMBIO`): la durata la legge il Worker dall'intestazione, e il prezzo
 * si fa su quella — mai su un numero dichiarato dal browser.
 */
export async function cambiaVoce(corpo, chi, env, { misura = MISURA_CAMBIO } = {}) {
  const { voce, audio } = corpo;
  if (typeof voce !== 'string' || !voce) return json({ errore: 'voce-sconosciuta' }, 400);
  if (typeof audio !== 'string') return json({ errore: 'audio' }, 400);
  if (audio.length > 4 * 1024 * 1024) return json({ errore: 'audio-troppo-lungo' }, 413);
  const byte = byteDa(audio);
  const secondi = byte && durataWav(byte);
  if (!secondi) return json({ errore: 'audio' }, 400);
  if (secondi > MAX_SECONDI_CAMBIO) return json({ errore: 'audio-troppo-lungo' }, 413);

  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  const conto = prezzoCambio(secondi, misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  const proprie = await proprieSeServe(voce, chi, env);
  if (proprie === undefined) return json({ errore: 'archivio' }, 500);
  if (!voceAmmessa(voce, proprie)) return json({ errore: 'voce-sconosciuta' }, 400);

  return conAddebito({ chi, prezzo: conto.total, servizio: VOCE_CAMBIA, env }, async () => ({
    dati: await cambiaConElevenLabs({ voce, audio: byte, env }),
    costoReale: conto.cost,
  }));
}

/* ---------------------------- 7c: inventa ------------------------------ */

/** Un effetto sonoro da una descrizione (fase 7c). Si paga a durata. */
export async function inventaEffetto(corpo, chi, env, { misura = MISURA_EFFETTO } = {}) {
  const { descrizione, durata } = corpo;
  const storta = effettoNonValido({ descrizione, durata });
  if (storta) return json({ errore: storta }, 400);
  if (!env.ELEVENLABS_API_KEY) return json({ errore: 'non-configurato' }, 503);
  const conto = prezzoEffetto(durata, misura);
  if (!conto) return json({ errore: 'non-misurato' }, 503);

  return conAddebito({ chi, prezzo: conto.total, servizio: EFFETTO_INVENTA, env }, async () => ({
    dati: await inventaConElevenLabs({ descrizione: descrizione.trim(), durata, env }),
    costoReale: conto.cost,
  }));
}

/** I servizi a crediti della voce (e dell'effetto inventato), per `/genera`. */
export const GENERA_VOCE = {
  [VOCE_LEGGI]: generaVoce,
  [VOCE_DISEGNA]: disegnaVoce,
  [VOCE_CLONA]: clonaVoce,
  [VOCE_CAMBIA]: cambiaVoce,
  [EFFETTO_INVENTA]: inventaEffetto,
};
