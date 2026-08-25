import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { t } from '../i18n/index.js';

/** Misura della tavola da disegno, in pixel del documento. */
const CANVAS_W = 1200;
const CANVAS_H = 1200;

const TOOLS = [
  { id: 'select', key: 'tools.select' },
  // `pathedit` è la modifica dei nodi: seleziona un tracciato e poi entra qui
  // per spostarne i punti e le maniglie.
  { id: 'pathedit', key: 'tools.nodes' },
  { id: 'path', key: 'tools.pen' },
  { id: 'fhpath', key: 'tools.pencil' },
  { id: 'line', key: 'tools.line' },
  { id: 'rect', key: 'tools.rect' },
  { id: 'ellipse', key: 'tools.ellipse' },
  { id: 'text', key: 'tools.text' },
];

/**
 * Wrapper around @svgedit/svgcanvas — the headless core of SVG-Edit.
 *
 * The library is not React-aware: it owns its DOM subtree and mutates it
 * directly. We therefore build it exactly once, hand it an empty container,
 * and never re-render into that container. All interaction goes through the
 * imperative handle rather than props, which keeps React out of its way.
 */
/**
 * La modifica dei nodi opera su UN tracciato. Entrarci senza selezione manda
 * in errore il modulo interno della libreria ("reading 'elem' of null") e da
 * lì l'editor resta bloccato: nessun cambio di strumento funziona più.
 */
function canEditNodes(canvas) {
  const els = canvas?.getSelectedElements?.().filter(Boolean) || [];
  return els.length === 1 && els[0].tagName.toLowerCase() === 'path';
}

const SvgEditor = forwardRef(function SvgEditor({ onReady, onSelection, onRefuseNodes }, ref) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('select');
  const [error, setError] = useState(null);
  const [nodesReady, setNodesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;

    (async () => {
      try {
        const { default: SvgCanvas } = await import('@svgedit/svgcanvas');
        if (cancelled || !host) return;

        // A stale subtree from a previous mount would confuse the library.
        host.innerHTML = '';

        const canvas = new SvgCanvas(host, {
          initFill: { color: '111111', opacity: 1 },
          initStroke: { color: 'C4A35A', opacity: 1, width: 2 },
          text: { stroke_width: 0, font_size: 48, font_family: "'Space Grotesk', sans-serif" },
          initOpacity: 1,
          imgPath: '/svgedit-images',
          dimensions: [CANVAS_W, CANVAS_H],
          baseUnit: 'px',
          selectionColor: '#C4A35A',
        });

        canvasRef.current = canvas;

        // Senza questa chiamata il documento resta a +1200,+1200 dentro la
        // radice: l'area bianca visibile NON è la tavola, e ogni coordinata
        // esce negativa. Il difetto è invisibile finché non si mostrano i
        // numeri — è il pannello numerico che l'ha fatto emergere.
        canvas.updateCanvas?.(CANVAS_W, CANVAS_H);

        const textInput = document.getElementById('svgcanvas-text-input');
        if (textInput && canvas.textActions?.setInputElem) {
          canvas.textActions.setInputElem(textInput);
          textInput.addEventListener('keyup input', (e) =>
            canvas.setTextContent(e.currentTarget.value),
          );
        }

        canvas.bind?.('selected', (win, elems) => {
          const list = (elems || []).filter(Boolean);
          onSelection?.(list.length);
          setNodesReady(canEditNodes(canvas));
        });

        onReady?.(canvas);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();

    return () => {
      cancelled = true;
      if (host) host.innerHTML = '';
      canvasRef.current = null;
    };
    // Built once for the life of the component — deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Un cambio di modalità non deve MAI poter bloccare l'editor: se la libreria
   * solleva, si torna a "seleziona" invece di restare in uno stato morto.
   */
  const applyMode = (m) => {
    const c = canvasRef.current;
    if (!c) return false;
    if (m === 'pathedit') {
      if (!canEditNodes(c)) {
        onRefuseNodes?.();
        return false;
      }
      // `toEditMode` è ciò che consegna davvero il tracciato all'editor di
      // nodi e ne disegna le maniglie. Esiste nel core ma NON è dichiarato nei
      // tipi: lo chiamiamo solo se c'è, e se un domani sparisce il pulsante si
      // disabilita invece di entrare in una modalità che non mostra nulla.
      const toEdit = c.pathActions?.toEditMode;
      if (typeof toEdit !== 'function') {
        onRefuseNodes?.();
        return false;
      }
    }
    try {
      c.setMode(m);
      if (m === 'pathedit') {
        c.pathActions.toEditMode(c.getSelectedElements().filter(Boolean)[0]);
      }
      setMode(m);
      return true;
    } catch (err) {
      console.error(err);
      try {
        c.setMode('select');
      } catch {
        /* niente da fare: almeno non propaghiamo */
      }
      setMode('select');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    canvas: () => canvasRef.current,
    setMode: applyMode,
    canEditNodes: () => canEditNodes(canvasRef.current),
    getSvg: () => canvasRef.current?.getSvgString() || '',
    setSvg(svg) {
      const c = canvasRef.current;
      if (!c) return false;
      const ok = c.setSvgString(svg);
      c.setMode('select');
      setMode('select');
      return ok !== false;
    },
    undo: () => canvasRef.current?.undo(),
    redo: () => canvasRef.current?.redo(),
    del: () => canvasRef.current?.deleteSelectedElements(),
    group: () => canvasRef.current?.groupSelectedElements(),
    ungroup: () => canvasRef.current?.ungroupSelectedElement(),
    toFront: () => canvasRef.current?.moveToTopSelectedElement(),
    toBack: () => canvasRef.current?.moveToBottomSelectedElement(),
    zoom(z) {
      canvasRef.current?.setZoom(z);
    },
    getZoom: () => canvasRef.current?.getZoom?.() ?? 1,
    /** Applied directly to the DOM: the fastest reliable path for colour. */
    paint(attr, colour) {
      const c = canvasRef.current;
      if (!c) return 0;
      const els = c.getSelectedElements().filter(Boolean);
      els.forEach((el) => el.setAttribute(attr, colour));
      return els.length;
    },

    // ─── selezione ──────────────────────────────────────────────────────
    selection: () => canvasRef.current?.getSelectedElements().filter(Boolean) || [],

    /** Posizione e misura della selezione, in coordinate del documento. */
    box() {
      const els = canvasRef.current?.getSelectedElements().filter(Boolean) || [];
      if (!els.length) return null;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const el of els) {
        const b = el.getBBox();
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width);
        y1 = Math.max(y1, b.y + b.height);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },

    /** Sposta la selezione a una posizione assoluta. */
    moveTo(x, y) {
      const c = canvasRef.current;
      const b = this.box?.() ?? null;
      if (!c || !b) return;
      c.moveSelectedElements(x - b.x, y - b.y);
    },

    nudge(dx, dy) {
      canvasRef.current?.moveSelectedElements(dx, dy);
    },

    /** Attributo numerico o testuale sulla selezione, con undo. */
    attr(name, value) {
      canvasRef.current?.changeSelectedAttribute(name, value);
    },

    /**
     * Rotazione applicata come transform attorno al centro dell'elemento.
     * Non uso l'API di rotazione di svgedit perché non è dichiarata nei tipi:
     * appoggiarsi a funzioni non documentate è come si rompono le cose al
     * primo aggiornamento della libreria.
     */
    rotate(deg) {
      const els = canvasRef.current?.getSelectedElements().filter(Boolean) || [];
      for (const el of els) {
        const b = el.getBBox();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const base = (el.getAttribute('transform') || '').replace(/rotate\([^)]*\)/g, '').trim();
        const rot = deg ? `rotate(${deg} ${cx} ${cy})` : '';
        const next = [base, rot].filter(Boolean).join(' ');
        if (next) el.setAttribute('transform', next);
        else el.removeAttribute('transform');
      }
      return els.length;
    },

    duplicate() {
      const c = canvasRef.current;
      if (!c) return;
      c.cloneSelectedElements?.(12, 12);
    },

    /**
     * Allinea più elementi fra loro. Implementato qui perché la libreria non
     * lo espone: si seleziona un elemento alla volta e lo si sposta, così ogni
     * passaggio entra nella cronologia di annullamento.
     */
    align(where) {
      const c = canvasRef.current;
      const els = c?.getSelectedElements().filter(Boolean) || [];
      if (els.length < 2) return 0;

      const boxes = els.map((el) => ({ el, b: el.getBBox() }));
      const x0 = Math.min(...boxes.map((o) => o.b.x));
      const x1 = Math.max(...boxes.map((o) => o.b.x + o.b.width));
      const y0 = Math.min(...boxes.map((o) => o.b.y));
      const y1 = Math.max(...boxes.map((o) => o.b.y + o.b.height));

      for (const { el, b } of boxes) {
        let dx = 0;
        let dy = 0;
        if (where === 'left') dx = x0 - b.x;
        else if (where === 'right') dx = x1 - (b.x + b.width);
        else if (where === 'centerX') dx = (x0 + x1) / 2 - (b.x + b.width / 2);
        else if (where === 'top') dy = y0 - b.y;
        else if (where === 'bottom') dy = y1 - (b.y + b.height);
        else if (where === 'centerY') dy = (y0 + y1) / 2 - (b.y + b.height / 2);
        if (dx || dy) {
          c.selectOnly([el]);
          c.moveSelectedElements(dx, dy);
        }
      }
      c.selectOnly(els);
      return els.length;
    },

    // ─── nodi e maniglie ────────────────────────────────────────────────
    /** Entra o esce dalla modifica dei nodi di un tracciato. */
    nodeMode(on) {
      return applyMode(on ? 'pathedit' : 'select');
    },
    addNode: () => canvasRef.current?.pathActions?.clonePathNode(),
    removeNode: () => canvasRef.current?.pathActions?.deletePathNode(),
    /** Maniglie simmetriche: muovendo un raggio si muove anche l'opposto. */
    linkHandles: (on) => canvasRef.current?.pathActions?.linkControlPoints(on),
    /** 4 = curva, 2 = segmento dritto (valori dell'enum SVG PathSeg). */
    segmentType: (curve) => canvasRef.current?.pathActions?.setSegType(curve ? 4 : 2),
    closePath: () => canvasRef.current?.pathActions?.opencloseSubPath(),
    smooth: () => canvasRef.current?.pathActions?.smoothPolylineIntoPath(),

    // ─── livelli ────────────────────────────────────────────────────────
    layers() {
      const c = canvasRef.current;
      if (!c) return [];
      const out = [];
      for (let i = c.getNumLayers() - 1; i >= 0; i--) {
        const d = c.getCurrentDrawing?.();
        const name = d?.getLayerName ? d.getLayerName(i) : null;
        if (name) out.push({ name, current: name === c.getCurrentLayerName() });
      }
      return out;
    },
    addLayer: () => canvasRef.current?.cloneLayer?.(),
    selectLayer: (name) => canvasRef.current?.setCurrentLayer(name),
    layerVisible: (name, on) => canvasRef.current?.setLayerVisibility(name, on),
    deleteLayer: () => canvasRef.current?.deleteCurrentLayer(),
  }));

  return (
    <div className="editor-wrap">
      <div className="tools">
        {/* `tool`, non `t`: `t` è la funzione di traduzione e verrebbe oscurata. */}
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className="tool"
            aria-pressed={mode === tool.id}
            disabled={Boolean(error) || (tool.id === 'pathedit' && !nodesReady)}
            title={t(`${tool.key}.help`)}
            onClick={() => applyMode(tool.id)}
          >
            {t(`${tool.key}.label`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert">
          {t('editor.failed')}
        </div>
      )}

      <div className="canvas-host" ref={hostRef} />
    </div>
  );
});

export default SvgEditor;
