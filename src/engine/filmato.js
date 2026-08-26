import { istanti, riquadro as calcolaRiquadro, riquadroFormato, taglio } from './clip.js';
import { alphaFromCreamVoid, interlaceRgba } from './keying.js';

/**
 * I tre gesti sul filmato, lato browser.
 *
 * Le decisioni stanno in `clip.js`, il colore in `keying.js`. Qui c'è solo
 * ciò che ha bisogno di un `<video>` e di un canvas: portarsi su un istante,
 * disegnare, e — per il taglio — registrare mentre scorre.
 *
 * **Perché il taglio si registra invece di essere ricodificato.** Ricodificare
 * un video nel browser vuol dire WebCodecs, che non c'è ovunque, oppure un
 * ffmpeg compilato in WASM da 25 MB — più di tutti i modelli dello studio
 * messi insieme, per un gesto solo. `MediaRecorder` invece è ovunque e fa
 * esattamente questo: si riproduce il tratto scelto e si registra ciò che
 * esce. Costa il tempo reale della clip, ed è un prezzo che si dichiara
 * prima di premere.
 */

/** Un `<video>` pronto all'uso, con i metadati già letti. */
async function apri(blob) {
  const v = document.createElement('video');
  v.src = URL.createObjectURL(blob);
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  await new Promise((ok, no) => {
    v.onloadedmetadata = ok;
    v.onerror = () => no(new Error('Questo filmato non si apre.'));
  });
  return v;
}

const chiudi = (v) => URL.revokeObjectURL(v.src);

/** Si porta esattamente su un istante e aspetta che il fotogramma ci sia. */
function vaiA(v, t) {
  return new Promise((ok) => {
    const fatto = () => {
      v.removeEventListener('seeked', fatto);
      ok();
    };
    v.addEventListener('seeked', fatto);
    v.currentTime = t;
  });
}

/**
 * Estrae dei fotogrammi come immagini.
 *
 * @returns {Promise<{blob: Blob, t: number}[]>}
 */
export async function estraiFotogrammi(filmato, { quanti = 12, onProgress } = {}) {
  const v = await apri(filmato);
  try {
    const tempi = istanti(v.duration, quanti);
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const g = c.getContext('2d');

    const fuori = [];
    for (let i = 0; i < tempi.length; i++) {
      await vaiA(v, tempi[i]);
      g.drawImage(v, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      fuori.push({ blob, t: tempi[i] });
      onProgress?.(i + 1, tempi.length);
    }
    return fuori;
  } finally {
    chiudi(v);
  }
}

/**
 * Toglie lo sfondo panna a un filmato, fotogramma per fotogramma.
 *
 * Riusa il ragionamento di `keying.js`: si toglie il panna raggiungibile dal
 * bordo, quello circondato dal personaggio resta. `isole` è il numero da
 * guardare — su una clip col becco di Zack in campo, zero isole significa che
 * il key se l'è mangiato.
 *
 * Esce in WebM con alfa. Un mp4 con alfa il browser non lo sa scrivere.
 */
export async function togliSfondo(filmato, { onProgress, dentro, fuori: soglia } = {}) {
  const v = await apri(filmato);
  try {
    const w = v.videoWidth;
    const h = v.videoHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });

    const tipo = ['video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!tipo) throw new Error('Questo browser non sa scrivere un filmato con lo sfondo tolto.');

    const flusso = c.captureStream(25);
    const rec = new MediaRecorder(flusso, { mimeType: tipo, videoBitsPerSecond: 6_000_000 });
    const pezzi = [];
    rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    const finito = new Promise((ok) => (rec.onstop = ok));
    rec.start();

    const passo = 1 / 25;
    let isoleTotali = 0;
    const totale = Math.max(1, Math.floor(v.duration / passo));

    for (let i = 0; i < totale; i++) {
      await vaiA(v, i * passo);
      g.clearRect(0, 0, w, h);
      g.drawImage(v, 0, 0);

      const img = g.getImageData(0, 0, w, h);
      const rgb = new Uint8ClampedArray(w * h * 3);
      for (let k = 0; k < w * h; k++) {
        rgb[k * 3] = img.data[k * 4];
        rgb[k * 3 + 1] = img.data[k * 4 + 1];
        rgb[k * 3 + 2] = img.data[k * 4 + 2];
      }

      const { alpha, isole } = alphaFromCreamVoid(rgb, w, h, { dentro, fuori: soglia });
      isoleTotali += isole;
      const rgba = interlaceRgba(rgb, alpha, w, h);
      img.data.set(rgba);
      g.putImageData(img, 0, 0);
      onProgress?.(i + 1, totale);
      // Un giro di fotogramma: senza, il registratore non vede il disegno.
      await new Promise((r) => requestAnimationFrame(r));
    }

    rec.stop();
    await finito;
    return { blob: new Blob(pezzi, { type: 'video/webm' }), isole: isoleTotali };
  } finally {
    chiudi(v);
  }
}

/**
 * Taglia e ritaglia, registrando mentre scorre.
 *
 * Costa il tempo reale del tratto scelto — un minuto di clip, un minuto di
 * attesa. Va scritto accanto al pulsante prima di premere, come per
 * l'ingrandimento: far partire un'attesa lunga senza dirne la durata è il
 * modo più sicuro di far chiudere la scheda a metà.
 */
export async function tagliaFilmato(filmato, { da = 0, a = null, formato = null, onProgress } = {}) {
  const v = await apri(filmato);
  try {
    const t = taglio(v.duration, { da, a });
    const box = formato
      ? riquadroFormato(v.videoWidth, v.videoHeight, formato)
      : calcolaRiquadro(v.videoWidth, v.videoHeight, {});

    const c = document.createElement('canvas');
    c.width = box.w;
    c.height = box.h;
    const g = c.getContext('2d');

    const tipo = ['video/webm;codecs=vp9', 'video/webm'].find((x) => MediaRecorder.isTypeSupported(x));
    if (!tipo) throw new Error('Questo browser non sa scrivere un filmato.');

    const rec = new MediaRecorder(c.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 8_000_000 });
    const pezzi = [];
    rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    const finito = new Promise((ok) => (rec.onstop = ok));

    await vaiA(v, t.da);
    rec.start();
    await v.play();

    await new Promise((ok) => {
      const disegna = () => {
        if (v.currentTime >= t.a || v.ended) {
          ok();
          return;
        }
        g.drawImage(v, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
        onProgress?.(v.currentTime - t.da, t.durata);
        requestAnimationFrame(disegna);
      };
      disegna();
    });

    v.pause();
    rec.stop();
    await finito;
    return { blob: new Blob(pezzi, { type: 'video/webm' }), durata: t.durata, misura: box };
  } finally {
    chiudi(v);
  }
}
