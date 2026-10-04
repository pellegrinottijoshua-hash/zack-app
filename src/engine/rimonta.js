/**
 * La voce dentro un video (fetta 6c): il video di prima con l'audio nuovo.
 *
 * Nel browser, senza librerie: il video gira muto, il suo fotogramma si
 * cattura (`captureStream`), l'audio cambiato si suona dentro la stessa
 * ripresa, e `MediaRecorder` scrive un WebM. Costa il tempo del video — un
 * minuto per un minuto — ed è il prezzo di non mandare il video a nessuno:
 * a ElevenLabs va solo la voce.
 *
 * Safari non sa catturare un `<video>`: lì si solleva `rimonta-non-supportata`
 * e chi chiama consegna l'audio da solo, dicendolo.
 */

const errore = (code) => Object.assign(new Error(code), { code });

/** Il primo tipo WebM che questo browser sa scrivere, o `null`. */
export function tipoRegistrabile(sa = (t) => globalThis.MediaRecorder?.isTypeSupported?.(t)) {
  for (const t of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
    if (sa(t)) return t;
  }
  return null;
}

/** Si può rimontare qui? */
export function rimontaPossibile() {
  return (
    typeof HTMLVideoElement !== 'undefined' &&
    typeof HTMLVideoElement.prototype.captureStream === 'function' &&
    Boolean(tipoRegistrabile())
  );
}

/**
 * @param video il file del video di partenza
 * @param audio il Blob dell'audio nuovo (l'MP3 di ElevenLabs)
 * @returns un Blob `video/webm`, o solleva con `code`
 */
export async function rimontaVideo(video, audio) {
  if (!rimontaPossibile()) throw errore('rimonta-non-supportata');
  const tipo = tipoRegistrabile();

  const el = document.createElement('video');
  const url = URL.createObjectURL(video);
  el.src = url;
  el.muted = true;
  el.playsInline = true;
  el.preload = 'auto';

  const ctx = new AudioContext();
  try {
    await new Promise((ok, ko) => {
      el.onloadeddata = ok;
      el.onerror = () => ko(errore('video-illeggibile'));
    });
    const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
    const uscita = ctx.createMediaStreamDestination();
    const voce = ctx.createBufferSource();
    voce.buffer = buffer;
    voce.connect(uscita);

    const ripresa = el.captureStream();
    const tracce = [...ripresa.getVideoTracks(), ...uscita.stream.getAudioTracks()];
    const rec = new MediaRecorder(new MediaStream(tracce), { mimeType: tipo });
    const pezzi = [];
    rec.ondataavailable = (e) => e.data.size && pezzi.push(e.data);
    const fermo = new Promise((ok) => {
      rec.onstop = ok;
    });

    if (ctx.state === 'suspended') await ctx.resume();
    rec.start(250);
    await el.play();
    voce.start();
    await new Promise((ok) => {
      el.onended = ok;
    });
    voce.stop();
    rec.stop();
    await fermo;
    return new Blob(pezzi, { type: 'video/webm' });
  } finally {
    el.pause();
    URL.revokeObjectURL(url);
    ctx.close().catch(() => {});
  }
}
