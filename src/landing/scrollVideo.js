/**
 * Video guidato dallo scorrimento.
 *
 * La tecnica: una sezione alta più di uno schermo contiene un livello
 * `sticky`; quanto si è scorsi dentro quella sezione diventa la posizione del
 * video. Non si riproduce da solo — lo si "trascina" scorrendo.
 *
 * Qui c'è solo la matematica, pura e verificabile. Il collegamento al DOM sta
 * in `attachScrollVideo`, e il video vero si aggiunge dopo senza toccare nulla:
 * il posto è già predisposto.
 */

/**
 * Quanto si è avanzati dentro una sezione, da 0 a 1.
 *
 * `top` è la distanza del bordo superiore della sezione dal bordo superiore
 * della finestra: negativa quando la sezione è già scorsa oltre.
 */
export function sectionProgress(top, sectionHeight, viewportHeight) {
  const scrollable = sectionHeight - viewportHeight;
  // Una sezione alta quanto lo schermo non ha spazio di scorrimento: senza
  // questo controllo si dividerebbe per zero e il video salterebbe.
  if (scrollable <= 0) return top <= 0 ? 1 : 0;
  const p = -top / scrollable;
  return Math.max(0, Math.min(1, p));
}

/** Il punto del video corrispondente, in secondi. */
export function timeFor(progress, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(duration, progress * duration));
}

/**
 * Cerca solo se vale la pena.
 *
 * Impostare `currentTime` a ogni evento di scorrimento inonda il decoder e il
 * video scatta invece di scorrere. Sotto una soglia il salto non si vede
 * comunque.
 */
export function shouldSeek(current, target, threshold = 1 / 30) {
  return Math.abs(current - target) > threshold;
}

/**
 * Il tempo del video quando i blocchi sono più di uno.
 *
 * La home non è cinque video in cinque scene: è **un video solo, sempre
 * visibile**, che avanza per blocchi mentre le informazioni gli scorrono
 * davanti. Ogni sezione di testo possiede un blocco: scorrendo dentro la
 * terza sezione, il video va dal secondo al terzo quinto della sua durata.
 *
 * Il conto sta qui e non nel componente perché è esattamente il tipo di
 * calcolo che sbaglia in silenzio: un blocco fuori posto non solleva niente,
 * fa solo vedere il gesto sbagliato accanto alla frase giusta.
 *
 * @param {number} indice     quale blocco, da 0
 * @param {number} progresso  quanto si è avanzati dentro quel blocco, 0…1
 * @param {number} durata     durata totale del video
 * @param {number} blocchi    quanti blocchi contiene il video
 */
export function timeForBlock(indice, progresso, durata, blocchi) {
  if (!Number.isFinite(durata) || durata <= 0 || !blocchi) return 0;
  const passo = durata / blocchi;
  const dentro = Math.max(0, Math.min(1, progresso));
  const i = Math.max(0, Math.min(blocchi - 1, indice));
  return Math.max(0, Math.min(durata, i * passo + dentro * passo));
}

/**
 * Quale blocco sta guardando chi scorre, e quanto è dentro.
 *
 * Prende i riquadri delle sezioni già misurati: chi chiama sa quali sono, e
 * misurarli qui costringerebbe questa funzione a toccare il DOM — cioè a
 * diventare non verificabile.
 *
 * @param {{top:number,height:number}[]} riquadri
 * @param {number} altezzaFinestra
 */
export function blockAt(riquadri, altezzaFinestra) {
  if (!riquadri?.length) return { indice: 0, progresso: 0 };

  // L'ultima sezione il cui bordo alto è già passato sopra la metà dello
  // schermo: è quella che si sta leggendo, non quella che sta arrivando.
  const meta = altezzaFinestra / 2;
  let indice = 0;
  for (let i = 0; i < riquadri.length; i++) {
    if (riquadri[i].top <= meta) indice = i;
  }
  const r = riquadri[indice];
  const percorso = r.height || 1;
  const progresso = Math.max(0, Math.min(1, (meta - r.top) / percorso));
  return { indice, progresso };
}

/**
 * Collega un video allo scorrimento della sua sezione.
 *
 * @returns {() => void} funzione per staccare tutto
 */
export function attachScrollVideo(section, video, { onProgress } = {}) {
  if (!section) return () => {};

  // Chi ha chiesto meno movimento non deve subire un video che si trascina.
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (calm?.matches) return () => {};

  let frame = null;

  const update = () => {
    frame = null;
    const rect = section.getBoundingClientRect();
    const p = sectionProgress(rect.top, rect.height, window.innerHeight);
    onProgress?.(p);

    if (!video || !Number.isFinite(video.duration)) return;
    const target = timeFor(p, video.duration);
    if (shouldSeek(video.currentTime, target)) video.currentTime = target;
  };

  const schedule = () => {
    // Un solo aggiornamento per fotogramma: lo scorrimento ne genera decine.
    if (frame == null) frame = requestAnimationFrame(update);
  };

  // Tornando su una scheda lasciata in background la posizione sarebbe
  // vecchia: mentre la pagina è nascosta requestAnimationFrame non viene
  // eseguito affatto, quindi nessun aggiornamento è avvenuto nel frattempo.
  const resync = () => {
    if (!document.hidden) schedule();
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', resync);
  schedule();

  return () => {
    if (frame != null) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('visibilitychange', resync);
  };
}
