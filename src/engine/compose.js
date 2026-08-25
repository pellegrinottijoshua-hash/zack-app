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
