/**
 * Cosa c'è davvero dentro un'immagine.
 *
 * Una sola passata sui pixel produce tutto ciò che serve alle tre rifiniture:
 * dove sta il soggetto, dov'è il suo baricentro, di che colore è, quanto bordo
 * sfumato ha. Farne tre passate separate costerebbe tre volte tanto su un file
 * da dodici milioni di pixel, e i numeri sarebbero gli stessi.
 *
 * La funzione è **pura**: prende i byte, non un canvas. È il motivo per cui si
 * può verificare senza browser — ed è la parte capace di sbagliare in
 * silenzio, quindi è la parte che va verificata.
 */

/**
 * @param {Uint8ClampedArray|number[]} data  RGBA, quattro byte per pixel
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number} [opts.alphaMin]  sotto questo valore il pixel è "vuoto"
 * @param {number} [opts.softMax]   sopra questo valore il pixel è "pieno"
 */
export function analyzePixels(data, w, h, { alphaMin = 8, softMax = 250 } = {}) {
  const total = w * h;
  if (!data || !w || !h || data.length < total * 4) {
    throw new Error('Pixel non leggibili: dimensioni e byte non coincidono.');
  }

  let opaque = 0;
  let soft = 0;
  let left = w;
  let right = -1;
  let top = h;
  let bottom = -1;
  let sumA = 0;
  let sumAX = 0;
  let sumAY = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < alphaMin) continue;

      if (a >= softMax) {
        opaque++;
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
      } else {
        soft++;
      }

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;

      // Il baricentro è pesato sull'opacità: un contorno sfumato deve contare
      // meno del corpo del soggetto, o un alone sposta il centro.
      sumA += a;
      sumAX += a * x;
      sumAY += a * y;
    }
  }

  // Immagine interamente vuota: non si inventa un soggetto che non c'è.
  if (right < 0) {
    return {
      image: { w, h },
      total,
      opaque: 0,
      soft: 0,
      clear: total,
      box: null,
      centroid: null,
      color: null,
      touches: { left: false, right: false, top: false, bottom: false },
      hasTransparency: true,
      softRatio: 0,
      coverage: 0,
    };
  }

  const box = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  const filled = opaque + soft;

  return {
    image: { w, h },
    total,
    opaque,
    soft,
    clear: total - filled,
    box,
    centroid: { x: sumAX / sumA, y: sumAY / sumA },
    color: opaque
      ? [Math.round(sumR / opaque), Math.round(sumG / opaque), Math.round(sumB / opaque)]
      : null,
    // Il soggetto tocca il bordo: quasi sempre significa che è già tagliato.
    touches: { left: left === 0, right: right === w - 1, top: top === 0, bottom: bottom === h - 1 },
    hasTransparency: filled < total,
    // Quanta parte del soggetto è mezza trasparente. Su stampa diretta è la
    // causa numero uno degli aloni: l'inchiostro non sa fare il 50%.
    softRatio: filled ? soft / filled : 0,
    coverage: filled / total,
  };
}
