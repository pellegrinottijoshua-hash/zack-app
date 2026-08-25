/**
 * Il pennello che corregge la maschera a mano.
 *
 * L'AI sbaglia sempre da qualche parte — un capello, un manico, un riflesso —
 * e senza un modo di correggere l'utente deve buttare via tutto il risultato.
 * Qui si dipinge direttamente sul canale alfa: si recupera ciò che è stato
 * tolto per errore, si toglie ciò che è rimasto.
 *
 * Tutto puro, su un array di byte: si verifica senza browser, ed è la parte in
 * cui un errore di indice corrompe l'immagine senza sollevare nulla.
 */

export const ERASE = 0;
export const RESTORE = 255;

/**
 * Un timbro circolare con bordo morbido.
 *
 * La morbidezza non è estetica: un bordo netto sul canale alfa lascia una
 * scalinata visibile a ogni passata, e il ritaglio sembra fatto con le forbici
 * anche dove è corretto.
 *
 * @param {Uint8ClampedArray} mask  un byte per pixel
 * @param {number} value  ERASE o RESTORE
 * @param {number} hardness  0 = tutto sfumato, 1 = bordo netto
 */
export function stamp(mask, w, h, cx, cy, radius, value, hardness = 0.6, flow = 1) {
  if (radius <= 0) return mask;

  const r2 = radius * radius;
  const inner = radius * Math.max(0, Math.min(1, hardness));
  const inner2 = inner * inner;
  const band = r2 - inner2 || 1;

  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(h - 1, Math.ceil(cy + radius));

  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;

      // 1 al centro, 0 sul bordo esterno.
      const t = d2 <= inner2 ? 1 : 1 - (d2 - inner2) / band;
      const a = t * flow;
      const i = y * w + x;
      mask[i] = Math.round(mask[i] * (1 - a) + value * a);
    }
  }
  return mask;
}

/**
 * Traccia fra due punti.
 *
 * Il mouse manda posizioni a scatti: senza interpolare, muovendolo in fretta
 * si ottengono cerchi staccati invece di una linea. È il difetto che fa
 * sembrare rotto un pennello che funziona.
 */
export function stroke(mask, w, h, from, to, radius, value, hardness = 0.6, flow = 1) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  // Un passo pari a un quarto del raggio: più fitto è spreco, più rado si vede.
  const step = Math.max(1, radius / 4);
  const n = Math.max(1, Math.ceil(dist / step));

  for (let i = 0; i <= n; i++) {
    const k = i / n;
    stamp(mask, w, h, from.x + dx * k, from.y + dy * k, radius, value, hardness, flow);
  }
  return mask;
}

/** Il canale alfa di un'immagine RGBA, come maschera indipendente. */
export function maskFromRgba(rgba, pixelCount) {
  const mask = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i++) mask[i] = rgba[i * 4 + 3];
  return mask;
}

/** Riporta la maschera nel canale alfa, lasciando intatti i colori. */
export function applyMask(rgba, mask, pixelCount) {
  if (rgba.length !== pixelCount * 4 || mask.length !== pixelCount) {
    throw new Error('Maschera e immagine: la dimensione non combacia');
  }
  for (let i = 0; i < pixelCount; i++) rgba[i * 4 + 3] = mask[i];
  return rgba;
}

/**
 * Quanto ha cambiato una passata: serve a non salvare nella cronologia
 * un'azione che non ha toccato nulla, perché un annulla che non annulla niente
 * fa credere all'utente che il comando sia rotto.
 */
export function changedPixels(before, after) {
  let n = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) n++;
  return n;
}
