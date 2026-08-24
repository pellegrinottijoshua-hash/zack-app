import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';

const TOOLS = [
  { id: 'select', label: 'Seleziona' },
  { id: 'path', label: 'Penna' },
  { id: 'fhpath', label: 'Matita' },
  { id: 'line', label: 'Linea' },
  { id: 'rect', label: 'Rettangolo' },
  { id: 'ellipse', label: 'Ellisse' },
  { id: 'text', label: 'Testo' },
];

/**
 * Wrapper around @svgedit/svgcanvas — the headless core of SVG-Edit.
 *
 * The library is not React-aware: it owns its DOM subtree and mutates it
 * directly. We therefore build it exactly once, hand it an empty container,
 * and never re-render into that container. All interaction goes through the
 * imperative handle rather than props, which keeps React out of its way.
 */
const SvgEditor = forwardRef(function SvgEditor({ onReady, onSelection }, ref) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('select');
  const [error, setError] = useState(null);

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
          dimensions: [1200, 1200],
          baseUnit: 'px',
          selectionColor: '#C4A35A',
        });

        canvasRef.current = canvas;

        const textInput = document.getElementById('svgcanvas-text-input');
        if (textInput && canvas.textActions?.setInputElem) {
          canvas.textActions.setInputElem(textInput);
          textInput.addEventListener('keyup input', (e) =>
            canvas.setTextContent(e.currentTarget.value),
          );
        }

        canvas.bind?.('selected', (win, elems) => {
          onSelection?.((elems || []).filter(Boolean).length);
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

  useImperativeHandle(ref, () => ({
    canvas: () => canvasRef.current,
    setMode(m) {
      canvasRef.current?.setMode(m);
      setMode(m);
    },
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
  }));

  return (
    <div className="editor-wrap">
      <div className="tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className="tool"
            aria-pressed={mode === t.id}
            disabled={Boolean(error)}
            onClick={() => {
              canvasRef.current?.setMode(t.id);
              setMode(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert">
          L'editor vettoriale non si è avviato: {error}
        </div>
      )}

      <div className="canvas-host" ref={hostRef} />
    </div>
  );
});

export default SvgEditor;
