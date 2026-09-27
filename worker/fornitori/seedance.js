/**
 * Seedance 2.5, dai due canali (fase 3).
 *
 * `byteplus` è il canale ufficiale di ByteDance (ModelArk), il default.
 * `higgsfield` è l'opzione: costa il doppio a listino, e serve quando una
 * promozione o un modello nuovo la rendono conveniente. Lo sceglie
 * `VIDEO_FORNITORE`; il cancello sul prezzo sta in `listinoVideo.js`.
 *
 * REST puro, con `fetch`: l'SDK di Higgsfield usa axios, che in un Worker di
 * Cloudflare non è garantito, e il REST sono due chiamate.
 *
 * Tutti e due gli adattatori parlano la stessa lingua verso il Worker:
 *   crea(...)  → { rif }                          (o solleva con `code`)
 *   leggi(...) → { stato: 'in-corso' | 'fatto' | 'fallito', url?, token?, motivo? }
 * Il Worker non sa niente degli stati dei fornitori: se ne sapesse, il terzo
 * canale gli insegnerebbe un terzo dialetto.
 */

import { tokenVideo } from '../../src/engine/listinoVideo.js';

const BYTEPLUS = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
const MODELLO_BYTEPLUS = 'dreamina-seedance-2-5-260628';
const HIGGSFIELD = 'https://api.higgsfield.ai';
const MODELLO_HIGGSFIELD = 'bytedance/seedance-2.5/text-to-video';

/**
 * Dopo un'ora un task di BytePlus muore da solo. È ciò che rende sicuro il
 * rimborso del giro orario: un task scaduto non può più finire e farsi
 * pagare da noi dopo che il cliente è stato rimborsato.
 */
export const SCADENZA_SECONDI = 3600;

const errore = (code, extra = {}) => Object.assign(new Error(code), { code, ...extra });

/** Traduce lo stato di un fornitore nei tre del Worker. Uno ignoto resta «in corso». */
export const STATI = {
  byteplus: { queued: 'in-corso', running: 'in-corso', succeeded: 'fatto', failed: 'fallito', cancelled: 'fallito', expired: 'fallito' },
  higgsfield: { queued: 'in-corso', in_progress: 'in-corso', completed: 'fatto', failed: 'fallito', nsfw: 'fallito', canceled: 'fallito', cancelled: 'fallito' },
};

function chiave(canale, env) {
  const k = canale === 'byteplus' ? env.ARK_API_KEY : env.HF_CREDENTIALS;
  if (!k) throw errore('non-configurato');
  return canale === 'byteplus' ? `Bearer ${k}` : `Key ${k}`;
}

async function jsonOErrore(res, code) {
  const corpo = await res.json().catch(() => ({}));
  // Mai il corpo intero nell'errore: potrebbe citare la richiesta. Lo stato basta.
  if (!res.ok) throw errore(code, { http: res.status });
  return corpo;
}

/** Crea il task. `utente` va a BytePlus come identificativo per la moderazione. */
/** I ruoli delle nostre immagini, nella lingua di BytePlus. */
const RUOLI_BYTEPLUS = { primo: 'first_frame', ultimo: 'last_frame', riferimento: 'reference_image' };

export async function crea({ canale, prompt, durata, risoluzione, formato, utente, immagini = [] }, env) {
  const authorization = chiave(canale, env);
  if (canale === 'byteplus') {
    /*
     * Le immagini viaggiano in base64 (`data:image/...`), un formato che
     * BytePlus accetta: non pubblichiamo le immagini dei clienti su un URL.
     * Col primo fotogramma il formato lo decide l'immagine: BytePlus accetta
     * solo `adaptive` (tutorial Seedance 2.5).
     */
    const primo = immagini.some((im) => im.ruolo === 'primo');
    const res = await fetch(BYTEPLUS, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELLO_BYTEPLUS,
        content: [
          { type: 'text', text: prompt },
          ...immagini.map((im) => ({
            type: 'image_url',
            image_url: { url: im.immagine },
            role: RUOLI_BYTEPLUS[im.ruolo],
          })),
        ],
        resolution: risoluzione,
        ratio: primo ? 'adaptive' : formato,
        duration: durata,
        generate_audio: true,
        watermark: false,
        execution_expires_after: SCADENZA_SECONDI,
        safety_identifier: utente,
      }),
    });
    const d = await jsonOErrore(res, 'fornitore');
    if (!d.id) throw errore('fornitore');
    return { rif: d.id };
  }
  if (canale === 'higgsfield') {
    // Le immagini da Higgsfield vorrebbero un URL pubblico: non ne diamo.
    // `canalePer` non ci manda mai qui con delle immagini; se succedesse,
    // si rifiuta PRIMA di generare un video diverso da quello chiesto.
    if (immagini.length) throw errore('canale-senza-immagini');
    const res = await fetch(`${HIGGSFIELD}/${MODELLO_HIGGSFIELD}`, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt,
        duration: durata,
        resolution: risoluzione,
        aspect_ratio: formato,
        output_format: 'mp4',
        generate_audio: true,
      }),
    });
    const d = await jsonOErrore(res, 'fornitore');
    if (!d.request_id) throw errore('fornitore');
    return { rif: d.request_id };
  }
  throw errore('canale-sconosciuto');
}

/** Legge il task. `durata`/`risoluzione` servono a stimare i token di Higgsfield. */
export async function leggi({ canale, rif, durata, risoluzione }, env) {
  const authorization = chiave(canale, env);
  const id = encodeURIComponent(rif);
  if (canale === 'byteplus') {
    const d = await jsonOErrore(await fetch(`${BYTEPLUS}/${id}`, { headers: { authorization } }), 'fornitore');
    const stato = STATI.byteplus[d.status] || 'in-corso';
    const url = d.content?.video_url;
    if (stato === 'fatto' && !url) return { stato: 'fallito', motivo: 'senza-url' };
    return { stato, url, token: d.usage?.total_tokens, motivo: stato === 'fallito' ? d.status : undefined };
  }
  if (canale === 'higgsfield') {
    const d = await jsonOErrore(await fetch(`${HIGGSFIELD}/requests/${id}/status`, { headers: { authorization } }), 'fornitore');
    const stato = STATI.higgsfield[d.status] || 'in-corso';
    const url = d.video?.url;
    if (stato === 'fatto' && !url) return { stato: 'fallito', motivo: 'senza-url' };
    // Higgsfield non dice i token: si stima per eccesso, come il prezzo.
    const token = stato === 'fatto' && durata && risoluzione ? tokenVideo({ durata, risoluzione }) : undefined;
    return { stato, url, token, motivo: stato === 'fallito' ? d.status : undefined };
  }
  throw errore('canale-sconosciuto');
}
