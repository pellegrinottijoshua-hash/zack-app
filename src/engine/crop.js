/**
 * Il ritaglio intelligente.
 *
 * «Intelligente» qui ha un significato preciso e piccolo: il taglio si decide
 * dal soggetto già ritagliato, non dal centro della tela. Un soggetto sta quasi
 * mai al centro dell'immagine, e centrare la tela invece del soggetto è il
 * motivo per cui i ritagli automatici tagliano le teste.
 *
 * Due regole che non si negoziano:
 *  - **non si inventano pixel**: il ritaglio resta dentro l'immagine, sempre.
 *    Se il formato richiesto non ci sta, si perde margine, non si aggiunge
 *    tela finta;
 *  - **il soggetto viene prima del baricentro**: si parte dal baricentro, poi
 *    la finestra scivola quanto basta a tenere dentro tutto il soggetto.
 *    Il baricentro decide solo quando la scelta è libera.
 */

/**
 * `ratio` è larghezza / altezza. `null` significa "come viene": si tiene la
 * forma del soggetto, che per un logo o una stampa è spesso la cosa giusta.
 */
export const ASPECTS = [
  { id: 'auto', ratio: null, labelKey: 'crop.auto' },
  { id: 'quadrato', ratio: 1, labelKey: 'crop.square' },
  { id: 'ritratto', ratio: 4 / 5, labelKey: 'crop.portrait' },
  { id: 'storia', ratio: 9 / 16, labelKey: 'crop.story' },
  { id: 'largo', ratio: 16 / 9, labelKey: 'crop.wide' },
];

export function getAspect(id) {
  const a = ASPECTS.find((x) => x.id === id);
  if (!a) throw new Error(`Formato di ritaglio sconosciuto: ${id}`);
  return a;
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Allarga il riquadro del soggetto di un margine, espresso come frazione del
 * suo lato maggiore.
 *
 * Frazione e non pixel: un margine di 40 px è aria attorno a un francobollo e
 * una linea attorno a un manifesto.
 */
export function withMargin(box, margin, image) {
  const pad = Math.round(Math.max(box.w, box.h) * Math.max(0, margin));
  const x = clamp(box.x - pad, 0, image.w);
  const y = clamp(box.y - pad, 0, image.h);
  return {
    x,
    y,
    w: clamp(box.x + box.w + pad, 0, image.w) - x,
    h: clamp(box.y + box.h + pad, 0, image.h) - y,
  };
}

/**
 * La dimensione della finestra per un dato rapporto.
 *
 * Restituisce anche `cut`: vero quando il soggetto NON ci sta comunque, perché
 * a quel punto qualcosa verrà tagliato ed è un'informazione che l'utente deve
 * avere prima di premere, non dopo aver guardato il risultato.
 */
export function windowFor(rect, ratio, image) {
  if (!ratio) {
    return { w: Math.min(rect.w, image.w), h: Math.min(rect.h, image.h), cut: false };
  }

  // Il più piccolo riquadro con quel rapporto che contiene la richiesta.
  let w = rect.w;
  let h = rect.h;
  if (w / h < ratio) w = h * ratio;
  else h = w / ratio;

  // Se sfora l'immagine si rimpicciolisce fino a entrarci: perdere margine è
  // accettabile, uscire dall'immagine no.
  const shrink = Math.min(1, image.w / w, image.h / h);
  w = Math.max(1, Math.floor(w * shrink));
  h = Math.max(1, Math.floor(h * shrink));

  return { w, h, cut: w < rect.w || h < rect.h };
}

/**
 * Dove mettere una finestra lunga `size` su un asse.
 *
 * Si parte dalla preferenza (il baricentro), ma la finestra scivola quanto
 * serve a contenere il soggetto: è tutta qui la differenza fra un ritaglio che
 * funziona e uno che taglia una mano.
 */
export function slideToContain(preferred, size, from, to, limit) {
  // Estremi entro cui la finestra copre ancora tutto il soggetto.
  const lo = to - size;
  const hi = from;
  let pos = preferred;
  // lo > hi significa che il soggetto è più lungo della finestra: non c'è
  // posizione che lo contenga e si resta sulla preferenza.
  if (lo <= hi) pos = clamp(pos, lo, hi);
  return Math.round(clamp(pos, 0, Math.max(0, limit - size)));
}

/**
 * @param {object} stats  da `analyzePixels`
 * @param {object} [opts]
 * @param {string} [opts.aspect]  id in ASPECTS
 * @param {number} [opts.margin]  frazione del lato maggiore del soggetto
 * @returns {{x,y,w,h,cut,margin}|null}  null quando non c'è alcun soggetto
 */
export function smartCrop(stats, { aspect = 'auto', margin = 0.06 } = {}) {
  if (!stats?.box) return null;

  const { ratio } = getAspect(aspect);
  const image = stats.image;
  const padded = withMargin(stats.box, margin, image);
  const size = windowFor(padded, ratio, image);

  const c = stats.centroid || {
    x: stats.box.x + stats.box.w / 2,
    y: stats.box.y + stats.box.h / 2,
  };

  const x = slideToContain(c.x - size.w / 2, size.w, stats.box.x, stats.box.x + stats.box.w, image.w);
  const y = slideToContain(c.y - size.h / 2, size.h, stats.box.y, stats.box.y + stats.box.h, image.h);

  return { x, y, w: size.w, h: size.h, cut: size.cut, margin };
}

/** Quanto si guadagna: un ritaglio che toglie il 3% non vale un clic. */
export function savedRatio(crop, image) {
  if (!crop) return 0;
  return 1 - (crop.w * crop.h) / (image.w * image.h);
}
