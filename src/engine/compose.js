/**
 * Funzioni pure per trasformare l'uscita della rete in un canale alfa.
 *
 * Nessuna dipendenza dal DOM: girano identiche nel worker e nei test Node, ed è
 * per questo che si possono verificare davvero. Il compositing è già stato
 * fonte di un bug silenzioso (`sharp.joinChannel` scartava la maschera senza
 * sollevare errori), quindi qui ogni incoerenza deve fallire rumorosamente.
 */

/**
 * Le reti restituiscono valori non limitati. rembg riscala su min/max effettivi
 * prima di trasformarli in maschera: replicato qui, altrimenti il ritaglio esce
 * o tutto opaco o tutto trasparente.
 */
export function normalizeMask(mask) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1; // una maschera piatta non deve produrre NaN
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = (mask[i] - lo) / span;
  return out;
}

export function maskToU8(mask) {
  const norm = normalizeMask(mask);
  const out = new Uint8ClampedArray(norm.length);
  for (let i = 0; i < norm.length; i++) out[i] = Math.round(norm[i] * 255);
  return out;
}

/**
 * Applica la maschera come canale alfa sui pixel originali.
 *
 * I canali RGB non vengono mai toccati: è la garanzia che un file di stampa
 * esca alla stessa risoluzione con cui è entrato.
 */
export function applyMaskToRgba(rgba, maskU8, pixelCount) {
  if (rgba.length !== pixelCount * 4 || maskU8.length !== pixelCount) {
    throw new Error(
      `Maschera e immagine: la dimensione non combacia (${maskU8.length} contro ${pixelCount})`,
    );
  }
  for (let i = 0; i < pixelCount; i++) rgba[i * 4 + 3] = maskU8[i];
  return rgba;
}

/**
 * Estende i colori del soggetto nel vuoto attorno.
 *
 * Serve prima di ingrandire un ritaglio. Il canvas premoltiplica: fuori dal
 * soggetto i pixel non sono "trasparenti e colorati", sono **neri**. Dare in
 * pasto quel nero al modello di super-risoluzione gli fa ricostruire un bordo
 * scuro nitidissimo, che ricomparirà come alone appena si riapplica l'alfa.
 *
 * Qui il colore del bordo cola verso l'esterno per qualche pixel, quanto basta
 * a coprire il raggio su cui guarda il modello. L'alfa **non viene toccata**:
 * si riapplica dopo, e il vuoto resta vuoto.
 *
 * @param {Uint8ClampedArray} rgba  modificato sul posto
 * @param {number} passes  quanti pixel di colatura
 * @returns {Uint8ClampedArray} lo stesso array, per comodità
 */
export function bleedEdges(rgba, w, h, passes = 12, alphaMin = 8) {
  const count = w * h;
  if (rgba.length !== count * 4) {
    throw new Error(`Pixel e dimensioni non combaciano (${rgba.length} contro ${count * 4})`);
  }

  // Chi ha già un colore valido. Parte dai pixel opachi e cresce a ogni giro.
  const filled = new Uint8Array(count);
  for (let i = 0; i < count; i++) filled[i] = rgba[i * 4 + 3] >= alphaMin ? 1 : 0;

  // Tutto vuoto o tutto pieno: non c'è nessun bordo da estendere.
  let anyFilled = false;
  let anyEmpty = false;
  for (let i = 0; i < count; i++) {
    if (filled[i]) anyFilled = true;
    else anyEmpty = true;
    if (anyFilled && anyEmpty) break;
  }
  if (!anyFilled || !anyEmpty) return rgba;

  for (let pass = 0; pass < passes; pass++) {
    // I nuovi pixel di questo giro si segnano a parte, o la colatura
    // attraverserebbe l'immagine in un solo giro seguendo l'ordine di lettura.
    const grown = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (filled[i]) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w || (dx === 0 && dy === 0)) continue;
            const j = (ny * w + nx) * 4;
            if (!filled[ny * w + nx]) continue;
            r += rgba[j];
            g += rgba[j + 1];
            b += rgba[j + 2];
            n++;
          }
        }
        if (!n) continue;
        grown.push(i, Math.round(r / n), Math.round(g / n), Math.round(b / n));
      }
    }
    if (!grown.length) break;
    for (let k = 0; k < grown.length; k += 4) {
      const i = grown[k];
      rgba[i * 4] = grown[k + 1];
      rgba[i * 4 + 1] = grown[k + 2];
      rgba[i * 4 + 2] = grown[k + 3];
      filled[i] = 1;
    }
  }
  return rgba;
}

/** Il solo canale alfa, per poterlo ingrandire per conto suo. */
export function extractAlpha(rgba, pixelCount) {
  const a = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i++) a[i] = rgba[i * 4 + 3];
  return a;
}

/** Vero se c'è almeno un pixel non completamente opaco: c'è un'alfa da salvare. */
export function hasAlpha(rgba, pixelCount) {
  for (let i = 0; i < pixelCount; i++) if (rgba[i * 4 + 3] < 255) return true;
  return false;
}
