import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { stroke, maskFromRgba, applyMask, changedPixels, ERASE, RESTORE } from '../engine/brush.js';

const SIZES = [10, 25, 60, 120];
const MAX_UNDO = 12;

/**
 * Correzione a mano del ritaglio.
 *
 * L'AI sbaglia sempre in qualche punto, e senza un modo di correggere l'utente
 * deve buttare via tutto il risultato per un capello di troppo. Qui si dipinge
 * sull'alfa: si toglie ciò che è rimasto, si recupera ciò che è sparito.
 *
 * Funziona a mouse e a dito: su un telefono il pennello è l'unico modo
 * praticabile di rifinire un ritaglio.
 */
export default function MaskBrush({ source, cutout, onChange, onDone }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [mode, setMode] = useState('erase');
  const [size, setSize] = useState(25);
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // Prepara i pixel una volta: il colore non cambia mai, solo l'alfa.
  useEffect(() => {
    let alive = true;
    (async () => {
      const bmp = await createImageBitmap(cutout);
      if (!alive) return;
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0);
      bmp.close?.();

      const img = ctx.getImageData(0, 0, c.width, c.height);
      stateRef.current = {
        w: c.width,
        h: c.height,
        rgba: img.data,
        mask: maskFromRgba(img.data, c.width * c.height),
        undo: [],
        last: null,
      };
      paint();
    })();
    return () => {
      alive = false;
    };
    // Si prepara una volta per ogni ritaglio ricevuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout]);

  const paint = useCallback(() => {
    const s = stateRef.current;
    const cv = canvasRef.current;
    if (!s || !cv) return;
    cv.width = s.w;
    cv.height = s.h;
    const copy = new Uint8ClampedArray(s.rgba);
    applyMask(copy, s.mask, s.w * s.h);
    cv.getContext('2d').putImageData(new ImageData(copy, s.w, s.h), 0, 0);
  }, []);

  /** Dal punto sullo schermo al pixel dell'immagine, qualunque sia lo zoom. */
  const toImage = (ev) => {
    const cv = canvasRef.current;
    const r = cv.getBoundingClientRect();
    const p = ev.touches?.[0] || ev;
    return {
      x: ((p.clientX - r.left) / r.width) * cv.width,
      y: ((p.clientY - r.top) / r.height) * cv.height,
    };
  };

  const begin = (ev) => {
    const s = stateRef.current;
    if (!s) return;
    ev.preventDefault();
    // La cronologia si limita: dodici passi bastano e non mangiano memoria.
    s.undo.push(s.mask.slice());
    if (s.undo.length > MAX_UNDO) s.undo.shift();
    setCanUndo(true);
    s.last = toImage(ev);
    move(ev);
  };

  const move = (ev) => {
    const s = stateRef.current;
    if (!s || !s.last) return;
    ev.preventDefault();
    const p = toImage(ev);
    // Il raggio è in pixel dell'immagine, così il pennello ha la stessa
    // dimensione percepita a qualsiasi zoom.
    const scale = s.w / canvasRef.current.getBoundingClientRect().width;
    stroke(s.mask, s.w, s.h, s.last, p, (size / 2) * scale, mode === 'erase' ? ERASE : RESTORE, 0.55);
    s.last = p;
    paint();
    setDirty(true);
  };

  const end = () => {
    const s = stateRef.current;
    if (!s) return;
    s.last = null;
    // Una passata che non ha cambiato nulla non entra nella cronologia:
    // un annulla che non annulla niente sembra rotto.
    const prev = s.undo[s.undo.length - 1];
    if (prev && changedPixels(prev, s.mask) === 0) s.undo.pop();
    setCanUndo(s.undo.length > 0);
  };

  const undo = () => {
    const s = stateRef.current;
    if (!s?.undo.length) return;
    s.mask = s.undo.pop();
    setCanUndo(s.undo.length > 0);
    paint();
  };

  const commit = async () => {
    const s = stateRef.current;
    if (!s) return;
    const cv = canvasRef.current;
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    onDone(blob);
    setDirty(false);
  };

  return (
    <div className="brush">
      <div className="brush-bar">
        <button
          className="opt"
          aria-pressed={mode === 'erase'}
          onClick={() => setMode('erase')}
          title={t('brush.eraseHelp')}
        >
          {t('brush.erase')}
        </button>
        <button
          className="opt"
          aria-pressed={mode === 'restore'}
          onClick={() => setMode('restore')}
          title={t('brush.restoreHelp')}
        >
          {t('brush.restore')}
        </button>

        <span className="brush-sizes">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={size === s} onClick={() => setSize(s)} aria-label={`${s}px`}>
              <i style={{ width: Math.min(18, s / 6), height: Math.min(18, s / 6) }} />
            </button>
          ))}
        </span>

        <button className="btn ghost small" disabled={!canUndo} onClick={undo}>
          {t('editor.undo.label')}
        </button>
        <button className="btn small" disabled={!dirty} onClick={commit}>
          {t('brush.apply')}
        </button>
      </div>

      <div className="brush-stage">
        <canvas
          ref={canvasRef}
          onPointerDown={begin}
          onPointerMove={(e) => e.buttons && move(e)}
          onPointerUp={end}
          onPointerLeave={end}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
