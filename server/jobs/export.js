import sharp from 'sharp';

/**
 * Export presets. `safeArea` is the fraction of the canvas the artwork may
 * occupy — Gelato needs margin so nothing lands in the seam or the cut.
 */
export const PRESETS = [
  { id: 'gelato-front', w: 3661, h: 4843, safeArea: 0.9, label: 'Gelato stampa 3661×4843', group: 'stampa' },
  { id: 'print-a4-300', w: 2480, h: 3508, safeArea: 0.9, label: 'A4 a 300 dpi', group: 'stampa' },
  { id: 'square', w: 2048, h: 2048, safeArea: 0.85, label: 'Quadrato 1:1', group: 'social' },
  { id: 'portrait', w: 1638, h: 2048, safeArea: 0.85, label: 'Verticale 4:5', group: 'social' },
  { id: 'story', w: 1152, h: 2048, safeArea: 0.8, label: 'Story 9:16', group: 'social' },
  { id: 'wide', w: 2048, h: 1152, safeArea: 0.85, label: 'Orizzontale 16:9', group: 'social' },
  { id: 'og', w: 1200, h: 630, safeArea: 0.85, label: 'Anteprima link 1200×630', group: 'web' },
  { id: 'favicon', w: 512, h: 512, safeArea: 1, label: 'Icona 512×512', group: 'web' },
];

export const BACKGROUNDS = {
  transparent: null,
  nero: '#111111',
  panna: '#F5F0E8',
  bianco: '#FFFFFF',
};

const MAX_PIXELS = 400_000_000;

/**
 * Fit the artwork inside a preset canvas, centred.
 *
 * Never upscales past the source: blowing a 500px PNG up to 3661px would look
 * like mush on fabric, so we letterbox and report the gap instead. Accepts SVG
 * input too — sharp rasterises it, and because it is vector it IS allowed to
 * scale up, so vector sources render crisp at any preset.
 */
export async function exportPreset(
  inputBuffer,
  { preset = 'gelato-front', background = 'transparent', isVector = false } = {},
) {
  const spec = PRESETS.find((p) => p.id === preset);
  if (!spec) {
    throw new Error(
      `Formato sconosciuto "${preset}". Disponibili: ${PRESETS.map((p) => p.id).join(', ')}`,
    );
  }
  if (!(background in BACKGROUNDS)) {
    throw new Error(`Sfondo sconosciuto "${background}".`);
  }

  const boxW = Math.round(spec.w * spec.safeArea);
  const boxH = Math.round(spec.h * spec.safeArea);

  // Rasterise vectors at a density derived from the target box. A fixed high
  // dpi looks safe but is not: an SVG that already measures 3661px would render
  // at 30000px and blow the pixel limit. Scale to the box, then cap.
  let loaded;
  if (isVector) {
    const intrinsic = await sharp(inputBuffer).metadata();
    const scale = Math.min(boxW / (intrinsic.width || boxW), boxH / (intrinsic.height || boxH));
    const density = Math.round(Math.min(2400, Math.max(72, 72 * scale)));
    loaded = sharp(inputBuffer, { density, limitInputPixels: MAX_PIXELS });
  } else {
    loaded = sharp(inputBuffer, { limitInputPixels: MAX_PIXELS });
  }

  const trimmed = loaded.trim({ threshold: 0 });
  let srcMeta;
  try {
    srcMeta = await trimmed.metadata();
  } catch {
    srcMeta = await loaded.metadata();
  }

  const artwork = await trimmed
    .resize(boxW, boxH, {
      fit: 'inside',
      // Vectors may be enlarged; raster pixels may not.
      withoutEnlargement: !isVector,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const bg = BACKGROUNDS[background];
  const canvas = await sharp({
    create: {
      width: spec.w,
      height: spec.h,
      channels: 4,
      background: bg ? bg : { r: 0, g: 0, b: 0, alpha: 0 },
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
      background,
      canvas: { w: spec.w, h: spec.h },
      placed: { w: artwork.info.width, h: artwork.info.height },
      upscaleLimited: !isVector && artwork.info.width < boxW && artwork.info.height < boxH,
      source: { w: srcMeta.width, h: srcMeta.height },
      vector: isVector,
    },
  };
}
