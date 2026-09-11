/**
 * Nano Banana Pro, tradotto.
 *
 * Un adattatore per fornitore, e l'unico posto che sa com'è fatto Google.
 * Seedance ed ElevenLabs ne avranno uno ciascuno e `/genera` non cambierà:
 * è il banco di prova che la spec § 3.3 si è imposta.
 *
 * Dentro entra la stessa cosa per tutti — prompt, riferimenti, la voce di
 * listino — e fuori esce la stessa cosa per tutti.
 */
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Il `data:` d'immagine che Google accetta. Una fonte sola per il criterio. */
const DATA_IMMAGINE = /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,(.+)$/;

/** Un `data:` in ciò che Google si aspetta, o `null` se non è un'immagine. */
function pezzo(riferimento) {
  const m = DATA_IMMAGINE.exec(riferimento.immagine || '');
  return m ? { inlineData: { mimeType: m[1], data: m[2] } } : null;
}

/**
 * L'`immagine` di un riferimento è quella che Google accetta?
 *
 * Esportata perché `riferimentiStorti` (worker/index.js, Task 2 della
 * revisione) deve rifiutare PRIMA di addebitare un riferimento che questo
 * modulo scarterebbe DOPO: `riferimenti.map(pezzo).filter(Boolean)` toglie in
 * silenzio ogni riferimento che il regex non riconosce, ma il prezzo si è
 * già calcolato su `riferimenti.length` — il cliente paga per N, Google ne
 * vede M. Stesso criterio, non una copia che potrebbe divergere.
 */
export function immagineValida(riferimento) {
  return DATA_IMMAGINE.test(riferimento?.immagine || '');
}

/** Il listino di Google, in dollari per milione di token (misurato 2026-09-10). */
const TARIFFE = { entrata: 2.0, uscitaTesto: 12.0, uscitaImmagine: 120.0 };
const CAMBIO = 0.92; // €/$

/**
 * Il costo VERO di questa chiamata, in millesimi, dai token che Google dichiara.
 *
 * ⚠️ Si **calcola**. La prima stesura scriveva `costoReale: voce.costo`, cioè
 * registrava la stima come se fosse il costo vero: un numero che non prova
 * niente, mentre è precisamente il numero che deve provare *«di ogni euro,
 * Zack ne rimette 12 centesimi»* (spec § 4.2).
 */
function costoVero(u) {
  if (!u) return null;
  const immagine = (u.candidatesTokensDetails || []).find((d) => d.modality === 'IMAGE')?.tokenCount || 0;
  const testo = (u.candidatesTokenCount || 0) - immagine + (u.thoughtsTokenCount || 0);
  const dollari =
    ((u.promptTokenCount || 0) * TARIFFE.entrata +
      testo * TARIFFE.uscitaTesto +
      immagine * TARIFFE.uscitaImmagine) / 1e6;
  return Math.round(dollari * CAMBIO * 1000);
}

/**
 * @param misura `'1K'` o `'2K'` — la sceglie il cliente e **costano uguale**:
 *   stessi 1120 token d'immagine, quattro volte i pixel (misurato).
 * @returns `{ dati, mime, costoReale }`, oppure solleva.
 */
export async function generaConGoogle({ voce, prompt, riferimenti = [], misura = '1K', env }) {
  const parti = [{ text: prompt }, ...riferimenti.map(pezzo).filter(Boolean)];

  const res = await fetch(`${BASE}/${voce.modello}:generateContent?key=${env.GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: parti }],
      /*
       * ⚠️ NIENTE `thinkingLevel`: non esiste, e Google risponde
       * `400 Unknown name` a ogni chiamata. La prima stesura ce l'aveva,
       * presa da una guida di ottimizzazione: sarebbe fallita ogni singola
       * generazione, e il difetto si sarebbe visto col primo cliente.
       * `imageConfig` invece è vero — misurato il 2026-09-10.
       */
      generationConfig: { imageConfig: { imageSize: misura } },
    }),
  });

  if (!res.ok) {
    throw Object.assign(new Error('fornitore'), { code: 'fornitore', stato: res.status });
  }

  const d = await res.json();
  const inline = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  // Una risposta `200` senza immagine è comunque un fallimento: se non si
  // trattasse così, il cliente pagherebbe per un `null`.
  if (!inline?.data) throw Object.assign(new Error('vuoto'), { code: 'fornitore', stato: 200 });

  // Google risponde JPEG, sempre. `mime` viene da lui, non da noi.
  return { dati: inline.data, mime: inline.mimeType || 'image/jpeg', costoReale: costoVero(d.usageMetadata) };
}
