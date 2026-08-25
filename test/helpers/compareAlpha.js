import sharp from 'sharp';

/**
 * Soglie dichiarate nello spec, sezione 9. Sono numeri e non impressioni:
 * senza una soglia scritta il criterio diventa "sembra uguale", ed è così che
 * si accumulano regressioni invisibili.
 */
export const IOU_MIN = 0.98;
export const MEAN_DIFF_MAX = 2;

/** Confronta due PNG sul solo canale alfa: è lì che vive il ritaglio. */
export async function compareAlpha(bufA, bufB) {
  const [a, b] = await Promise.all(
    [bufA, bufB].map((buf) =>
      sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    throw new Error(
      `Dimensioni diverse (${a.info.width}×${a.info.height} contro ${b.info.width}×${b.info.height}): non confrontabili`,
    );
  }

  const n = a.info.width * a.info.height;
  let inter = 0;
  let union = 0;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    const av = a.data[i * a.info.channels + 3];
    const bv = b.data[i * b.info.channels + 3];
    diff += Math.abs(av - bv);
    const ao = av > 127;
    const bo = bv > 127;
    if (ao && bo) inter++;
    if (ao || bo) union++;
  }

  const iou = union === 0 ? 1 : inter / union;
  const meanDiff = diff / n;
  return { iou, meanDiff, pass: iou >= IOU_MIN && meanDiff <= MEAN_DIFF_MAX };
}
