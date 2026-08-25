import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import {
  stroke,
  maskFromRgba,
  applyMask,
  colorsFrom,
  changedPixels,
  ERASE,
  RESTORE,
} from '../engine/brush.js';

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
 *
 * **Serve il file di partenza, non solo il ritaglio.** Il canvas premoltiplica
 * i colori per l'opacità: ciò che è stato portato a trasparente ha perso il
 * colore sul posto, e recuperarlo dal solo ritaglio ridipinge nero. I colori
 * vivi stanno soltanto nella sorgente.
 */
/** I pixel di un'immagine, senza riscalarla: una scala sbagliata qui
 *  sposterebbe i colori di posto. */
async function toPixels(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
}

export default function MaskBrush({ source, cutout, onChange, onDone }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [mode, setMode] = useState('erase');
  const [size, setSize] = useState(25);
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  // Vero quando la sorgente non è utilizzabile: il recupero funziona ancora
  // dove il colore è sopravvissuto, ma va detto prima, non scoperto dipingendo.
  const [limited, setLimited] = useState(false);

  // Prepara i pixel una volta: il colore non cambia mai, solo l'alfa.
  useEffect(() => {
    let alive = true;
    (async () => {
      const cut = await toPixels(cutout);
      if (!alive) return;

      // La sorgente può mancare, essere un vettore, o avere un'altra
      // dimensione dopo un ritaglio o un ingrandimento. In tutti questi casi
      // si continua con quello che c'è invece di fermarsi.
      let src = null;
      try {
        src = source ? await toPixels(source) : null;
      } catch (e) {
        console.error(e);
      }
      if (!alive) return;

      const count = cut.w * cut.h;
      const usable = src && src.w === cut.w && src.h === cut.h;
      setLimited(!usable);

      stateRef.current = {
        w: cut.w,
        h: cut.h,
        rgba: colorsFrom(usable ? src.data : null, cut.data, count),
        mask: maskFromRgba(cut.data, count),
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
  }, [cutout, source]);

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

      {limited && mode === 'restore' && <p className="verdict" data-level="attenzione">{t('brush.limited')}</p>}

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
