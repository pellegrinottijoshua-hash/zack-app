import { vectorize, Preset } from '@neplex/vectorizer';
import sharp from 'sharp';
import { optimize } from 'svgo';

export const TRACE_PRESETS = [
  { id: 'poster', label: 'Poster', note: 'colori piatti', preset: Preset.Poster },
  { id: 'photo', label: 'Foto', note: 'molte sfumature', preset: Preset.Photo },
  { id: 'bw', label: 'Bianco e nero', note: 'line art, loghi', preset: Preset.Bw },
];

/**
 * VTracer cost grows with pixel count, and past a point extra pixels only add
 * noise paths, not fidelity. Tracing a 3661px print file at full size yields a
 * multi-megabyte SVG that no editor can open comfortably.
 */
const TRACE_MAX = 1400;

/**
 * Raster → SVG.
 *
 * The traced geometry is scaled back to the source dimensions via viewBox, so
 * the result still measures the original size despite being traced smaller —
 * it is vector, so nothing is lost by tracing at a working resolution.
 */
export async function traceToSvg(inputBuffer, { preset = 'poster', clean = true } = {}) {
  const chosen = TRACE_PRESETS.find((p) => p.id === preset);
  if (!chosen) {
    throw new Error(
      `Preset sconosciuto "${preset}". Disponibili: ${TRACE_PRESETS.map((p) => p.id).join(', ')}`,
    );
  }

  const started = Date.now();
  const meta = await sharp(inputBuffer).metadata();
  const hadAlpha = Boolean(meta.hasAlpha);

  // Transparent art is usually a small subject on a huge empty canvas (a print
  // file is 3661×4843 of mostly nothing). Trim first, or the trace is spent on
  // emptiness and the subject ends up a few pixels wide.
  const trimmed = hadAlpha
    ? await sharp(inputBuffer).trim({ threshold: 0 }).png().toBuffer({ resolveWithObject: true })
    : { data: inputBuffer, info: { width: meta.width, height: meta.height } };

  // Flatten onto white: VTracer reads alpha as a colour, so transparency would
  // otherwise be traced as a solid black shape.
  const flat = await sharp(trimmed.data)
    .resize(TRACE_MAX, TRACE_MAX, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer({ resolveWithObject: true });

  const width = trimmed.info.width;
  const height = trimmed.info.height;

  let svg = await vectorize(flat.data, chosen.preset);
  const rawSize = svg.length;

  // The white we just added comes back as shapes behind and around the art.
  // Deleting "white paths" is the wrong tool — it would also delete white that
  // belongs to the artwork. Instead trace the ALPHA channel into a silhouette
  // and use it as a vector clip: whatever was transparent stays transparent.
  if (hadAlpha) {
    const silhouette = await sharp(trimmed.data)
      .ensureAlpha()
      .extractChannel('alpha')
      .resize(flat.info.width, flat.info.height, { fit: 'fill' })
      // Bw traces dark shapes, so invert: opaque subject becomes black.
      .negate()
      .png()
      .toBuffer();

    const maskSvg = await vectorize(silhouette, Preset.Bw);
    const clipPaths = (maskSvg.match(/<path[^>]*\/>/g) || [])
      // Drop any full-canvas rectangle: that is the frame, not the subject.
      .filter((p) => !p.includes(`d="M0 0h${flat.info.width}v${flat.info.height}H0z"`))
      // Only the geometry matters inside a clipPath; colour would be ignored.
      .map((p) => p.replace(/\sfill="[^"]*"/g, ''))
      .join('');

    if (clipPaths) {
      svg = svg.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, (m, open, body, close) => {
        const inner = body.replace(
          new RegExp(`<path[^>]*\\sd="M0 0h${flat.info.width}v${flat.info.height}H0z"[^>]*/>`, 'g'),
          '',
        );
        return (
          `${open}<defs><clipPath id="jc-alpha">${clipPaths}</clipPath></defs>` +
          `<g clip-path="url(#jc-alpha)">${inner}</g>${close}`
        );
      });
    }
  }

  // Make it resolution-independent: give it a viewBox and the source size.
  svg = svg.replace(
    /<svg([^>]*)>/,
    (m, attrs) => {
      const stripped = attrs
        .replace(/\s(width|height|viewBox)="[^"]*"/g, '');
      return `<svg${stripped} width="${width}" height="${height}" viewBox="0 0 ${flat.info.width} ${flat.info.height}">`;
    },
  );

  let cleaned = null;
  if (clean) {
    // Keep viewBox — removing it is svgo's default and would break scaling.
    const res = optimize(svg, {
      multipass: true,
      plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
    });
    svg = res.data;
    cleaned = svg.length;
  }

  const paths = (svg.match(/<path/g) || []).length;
  if (paths === 0) {
    // Real case: "Bianco e nero" folds a light subject into a light background
    // and traces nothing at all. Saving an empty SVG would look like success.
    throw new Error(
      `Il tracciato "${chosen.label}" non ha trovato nessuna forma: il soggetto ha ` +
        'troppo poco contrasto con lo sfondo. Prova "Poster", oppure scontorna prima.',
    );
  }

  return {
    svg,
    meta: {
      preset: chosen.id,
      source: { w: width, h: height },
      traced: { w: flat.info.width, h: flat.info.height },
      paths,
      bytes: svg.length,
      bytesBeforeClean: rawSize,
      saved: cleaned ? Math.round((1 - cleaned / rawSize) * 100) : 0,
      ms: Date.now() - started,
    },
  };
}

/** Shrink an SVG without changing how it renders. */
export function cleanSvg(svgString) {
  const before = svgString.length;
  const res = optimize(svgString, {
    multipass: true,
    plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
  });
  return {
    svg: res.data,
    meta: {
      before,
      after: res.data.length,
      saved: Math.max(0, Math.round((1 - res.data.length / before) * 100)),
    },
  };
}
