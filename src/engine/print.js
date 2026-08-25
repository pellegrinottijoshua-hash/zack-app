import { getPreset, computePlacement } from './export.js';

/**
 * Il controllo di stampa.
 *
 * È lo strumento che nessuno offre e che serve a tutti: un file va benissimo
 * sullo schermo e arriva sbagliato sulla maglietta, e te ne accorgi quando hai
 * in mano il campione — cioè quando hai già pagato.
 *
 * Nessuno di questi controlli è un'opinione: sono misure sui pixel e sui
 * centimetri. Dove non c'è una misura non c'è un avviso.
 */

/** I colori di capo previsti, gli stessi della palette JAYL. */
export const GARMENTS = [
  { id: 'nero', rgb: [17, 17, 17] },
  { id: 'panna', rgb: [245, 240, 232] },
  { id: 'bianco', rgb: [255, 255, 255] },
  { id: 'grigio', rgb: [138, 138, 133] },
];

export function getGarment(id) {
  const g = GARMENTS.find((x) => x.id === id);
  if (!g) throw new Error(`Colore capo sconosciuto: ${id}`);
  return g;
}

/** Soglie dichiarate qui perché un numero magico dentro un `if` non si discute. */
export const MIN_CM = 12; // sotto, la grafica sparisce sul petto
export const SOFT_RATIO_MAX = 0.18; // bordi mezzi trasparenti: aloni in stampa diretta
export const CONTRAST_MIN = 1.6; // sotto, la grafica si confonde col capo
export const CONTRAST_BAD = 1.25; // sotto, non si vede proprio

export const cmFromPx = (px, dpi) => (px / dpi) * 2.54;

/** Luminanza relativa secondo la formula WCAG: percettiva, non aritmetica. */
export function relativeLuminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const finding = (id, level, values) => ({ id, level, values: values || {} });

/**
 * @param {object} stats      da `analyzePixels`
 * @param {object} opts
 * @param {string} opts.preset   id di un formato
 * @param {string} opts.garment  id di un colore capo
 * @param {boolean} [opts.isVector]
 * @returns {{printable: boolean, findings: Array, size: object|null}}
 */
export function checkPrint(stats, { preset: presetId, garment: garmentId, isVector = false } = {}) {
  const preset = getPreset(presetId);
  const garment = getGarment(garmentId);

  // Su un formato social i centimetri non esistono: dirlo è più utile che
  // inventare un controllo che non si applica.
  if (!preset.dpi) return { printable: false, findings: [], size: null };
  if (!stats?.box) return { printable: true, findings: [finding('empty', 'errore')], size: null };

  const place = computePlacement(stats.box.w, stats.box.h, preset, { isVector });
  const size = {
    w: cmFromPx(place.draw.w, preset.dpi),
    h: cmFromPx(place.draw.h, preset.dpi),
    areaW: cmFromPx(Math.round(preset.w * preset.safeArea), preset.dpi),
  };

  const findings = [];
  const cm = (v) => v.toFixed(1).replace('.', ',');

  // 1. Quanto grande verrà davvero.
  const wide = Math.max(size.w, size.h);
  findings.push(
    finding(
      'size',
      wide < MIN_CM ? 'errore' : place.upscaleLimited ? 'attenzione' : 'ok',
      { w: cm(size.w), h: cm(size.h), area: cm(size.areaW) },
    ),
  );

  // 2. Sfondo. Senza trasparenza la stampa è un rettangolo di inchiostro, e
  //    su un capo scuro si vede eccome.
  findings.push(finding('background', stats.hasTransparency ? 'ok' : 'attenzione'));

  // 3. Bordi mezzi trasparenti: la stampa diretta non sa fare il 50% di
  //    inchiostro, lo simula a puntini e si vede come un alone.
  //
  //    Su un vettore il controllo NON si fa: un tracciato non ha pixel mezzo
  //    trasparenti, quelli che si misurerebbero sono l'antialiasing della
  //    nostra rasterizzazione. Sarebbe un avviso su un difetto nostro.
  if (!isVector) {
    findings.push(
      finding('edges', stats.softRatio > SOFT_RATIO_MAX ? 'attenzione' : 'ok', {
        pct: Math.round(stats.softRatio * 100),
      }),
    );
  }

  // 4. Contrasto col capo: una grafica nera su capo nero è un file perfetto e
  //    una maglietta vuota.
  if (stats.color) {
    const ratio = contrastRatio(stats.color, garment.rgb);
    findings.push(
      finding(
        'contrast',
        ratio < CONTRAST_BAD ? 'errore' : ratio < CONTRAST_MIN ? 'attenzione' : 'ok',
        { ratio: ratio.toFixed(1).replace('.', ','), garment: garmentId },
      ),
    );
  }

  // 5. Soggetto già tagliato dal bordo dell'immagine.
  const t = stats.touches;
  findings.push(finding('clipped', t.left || t.right || t.top || t.bottom ? 'attenzione' : 'ok'));

  return { printable: true, findings, size, placement: place };
}

/** Il verdetto complessivo è il peggiore dei singoli: uno rosso basta. */
export function worstLevel(findings) {
  if (findings.some((f) => f.level === 'errore')) return 'errore';
  if (findings.some((f) => f.level === 'attenzione')) return 'attenzione';
  return 'ok';
}
