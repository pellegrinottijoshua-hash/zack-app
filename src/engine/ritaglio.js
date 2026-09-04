/**
 * Il ritaglio **senza modello**, e la decisione se basta.
 *
 * Sta in `engine/` e non accanto a un componente per la ragione di sempre: è
 * la parte capace di sbagliare in silenzio — un alfa premoltiplicato, un
 * modello scaricato a metà, una misura che non torna — e va dove i test la
 * vedono, in Node.
 *
 * **Lo usano tutt'e due le entrate.** È nato per la home il 2026-08-27 ed è
 * rimasto lì fino al 2026-09-04: nel frattempo lo studio scendeva ai 175 MB
 * del modello anche per un fondo piatto che qui costa venti millisecondi.
 * Un pezzo di prodotto in una cartella sola diventa un pezzo di prodotto per
 * metà utenti.
 *
 * `MAX_FILE`, `scaricaModello` e `mb` viaggiano con lui: sono della home, ma
 * spezzare il file in due per tre esportazioni costerebbe più di quanto rende.
 */

import { alphaDaFondoPiatto } from './keying.js';

/**
 * Quanto dev'essere piatto il fondo perché il ritaglio istantaneo sia
 * affidabile.
 *
 * MISURATO il 2026-08-27 su file veri: illustrazioni e sticker stanno fra 0.96
 * e 1.00, un soggetto panna su fondo panna crolla a 0.64. Sotto questa soglia
 * si passa al modello: meglio far aspettare che consegnare un ritaglio bucato.
 */
export const UNIFORMITA_MIN = 0.9;

/** Quanti file per volta accetta la home. Il quarto è l'invito allo studio. */
export const MAX_FILE = 3;

/**
 * I pixel di un file immagine, già su tela.
 *
 * `createImageBitmap` invece di un `<img>`: non passa dal layout, non aspetta
 * un ciclo di disegno, e soprattutto non ridimensiona di nascosto in base al
 * `devicePixelRatio`.
 */
export async function pixelDaFile(file) {
  const bitmap = await createImageBitmap(file);
  const { width: w, height: h } = bitmap;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return { rgba: ctx.getImageData(0, 0, w, h).data, w, h };
}

/**
 * Prova il ritaglio istantaneo: fondo piatto, nessun modello, nessuna attesa.
 *
 * Restituisce `null` quando il fondo non è piatto abbastanza — non un
 * risultato scadente. Uno strumento che consegna comunque qualcosa quando sa
 * di sbagliare insegna all'utente a non fidarsi del prossimo risultato.
 */
export function ritaglioIstantaneo({ rgba, w, h }) {
  const r = alphaDaFondoPiatto(rgba, w, h);
  if (r.uniformita < UNIFORMITA_MIN) return null;
  return { alpha: r.alpha, uniformita: r.uniformita, isole: r.isole };
}

/**
 * Applica un canale alfa ai pixel di partenza.
 *
 * **I pixel di partenza, sempre.** È la trappola già pagata: il canvas
 * premoltiplica, quindi rileggere un ritaglio per rimetterci l'alfa restituisce
 * nero dove l'alfa era zero. La sorgente non si butta mai via finché c'è un
 * pennello che può servirsene.
 */
export function applicaAlfa({ rgba, w, h }, alpha) {
  const out = new Uint8ClampedArray(rgba.length);
  out.set(rgba);
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = alpha[i];
  return new ImageData(out, w, h);
}

/** Da ImageData a PNG, che è l'unico formato che tiene la trasparenza. */
export function aPng(imageData) {
  const cv = document.createElement('canvas');
  cv.width = imageData.width;
  cv.height = imageData.height;
  cv.getContext('2d').putImageData(imageData, 0, 0);
  return new Promise((r) => cv.toBlob(r, 'image/png'));
}

/**
 * Scarica il modello dicendo quanto manca.
 *
 * Il difetto che questa funzione ripara (2026-08-27): `EngineBanner` disegnava
 * già una barra con la percentuale, e **nessuno emetteva mai quella fase**.
 * Chi aspettava 175 MB guardava una pagina ferma.
 *
 * Non passa i byte al motore: li mette nella cache HTTP del browser. Quando
 * poi ONNX Runtime chiede lo stesso URL se li ritrova già lì, e noi non
 * dobbiamo toccare il worker per avere una barra onesta.
 */
export async function scaricaModello(url, onProgress, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`modello non raggiungibile: ${res.status}`);

  const totale = Number(res.headers.get('content-length')) || 0;
  if (!res.body) {
    await res.arrayBuffer();
    onProgress?.({ fatti: totale, totale, frazione: 1 });
    return;
  }

  const reader = res.body.getReader();
  let fatti = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    fatti += value.length;
    // Senza `content-length` la frazione non esiste: si dicono i megabyte e
    // basta. Una barra che finge di sapere quanto manca è peggio di nessuna
    // barra, perché la seconda volta non le si crede più.
    onProgress?.({ fatti, totale, frazione: totale ? fatti / totale : null });
  }
}

/** I megabyte, come si scrivono a un umano. */
export function mb(bytes) {
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
}
