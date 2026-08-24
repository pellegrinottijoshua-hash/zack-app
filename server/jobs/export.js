import sharp from 'sharp';

/**
 * Export presets. `safeArea` is the fraction of the canvas the artwork may
 * occupy — Gelato needs margin so nothing lands in the seam or the cut.
 */
export const PRESETS = {
  'gelato-front': { w: 3661, h: 4843, safeArea: 0.9, label: 'Gelato front/back 3661×4843' },
  'square': { w: 2048, h: 2048, safeArea: 0.85, label: 'Social 1:1' },
  'portrait': { w: 1638, h: 2048, safeArea: 0.85, label: 'Social 4:5' },
  'story': { w: 1152, h: 2048, safeArea: 0.8, label: 'Story 9:16' },
};

/**
 * Fit the artwork inside a preset canvas, centred, on transparency.
 * Never upscales past the source: blowing a 500px PNG up to 3661px would
 * look like mush on fabric, so we letterbox instead and report the gap.
 */
export async function exportPreset(inputBuffer, { preset = 'gelato-front' } = {}) {
  const spec = PRESETS[preset];
  if (!spec) {
    throw new Error(`Unknown preset "${preset}". Known: ${Object.keys(PRESETS).join(', ')}`);
  }

  const source = sharp(inputBuffer).trim({ threshold: 0 });
  const { width: srcW, height: srcH } = await source.metadata();

  const boxW = Math.round(spec.w * spec.safeArea);
  const boxH = Math.round(spec.h * spec.safeArea);

  const artwork = await source
    .resize(boxW, boxH, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  const canvas = await sharp({
    create: {
      width: spec.w,
      height: spec.h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: artwork.data, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    buffer: canvas,
    meta: {
      preset,
      label: spec.label,
      canvas: { w: spec.w, h: spec.h },
      placed: { w: artwork.info.width, h: artwork.info.height },
      // True when the source was too small to fill the safe area.
      upscaleLimited: artwork.info.width < boxW && artwork.info.height < boxH,
      source: { w: srcW, h: srcH },
    },
  };
}
