import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, TracePanel, ExportPanel, MetaBlock } from './components/Panels.jsx';
import * as api from './lib/api.js';

const TOOLS = [
  { id: 'scontorna', label: 'Scontorna' },
  { id: 'vettorializza', label: 'Vettorializza' },
  { id: 'editor', label: 'Editor SVG' },
];

const PALETTE = ['#111111', '#F5F0E8', '#FFFFFF', '#8A8A85', '#C4A35A', 'none'];

const px = (d) => (d ? `${d.w}×${d.h}` : '—');
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

export default function App() {
  const [caps, setCaps] = useState(null);
  const [apiState, setApiState] = useState('offline');
  const [tool, setTool] = useState('scontorna');

  const [file, setFile] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [result, setResult] = useState(null); // { blob|text, url, kind, meta }
  const [busy, setBusy] = useState(null);
  const [busyNote, setBusyNote] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [works, setWorks] = useState([]);
  const [libOpen, setLibOpen] = useState(true);
  const [libPath, setLibPath] = useState('');

  const [s, setS] = useState({
    model: 'u2net',
    detail: 'balanced',
    decontaminate: true,
    tracePreset: 'poster',
    clean: true,
    preset: 'gelato-front',
    background: 'transparent',
  });
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const editorRef = useRef(null);
  const [selCount, setSelCount] = useState(0);

  // Object URLs we created and must revoke on unmount.
  const urls = useRef(new Set());
  const own = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  };
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach(URL.revokeObjectURL);
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const { items, path } = await api.library();
      setWorks(items);
      setLibPath(path);
    } catch {
      // A library read failure must not take the workspace down.
    }
  }, []);

  useEffect(() => {
    api
      .health()
      .then((h) => {
        setCaps(h);
        setApiState('pronta');
        setLibPath(h.libraryPath);
      })
      .catch(() => setApiState('offline'));
    refreshLibrary();
  }, [refreshLibrary]);

  function onFile(f) {
    setError(null);
    setNotice(null);
    setResult(null);
    setFile(f);
    setBeforeUrl(own(f));

    // An SVG dropped anywhere belongs in the editor.
    if (/\.svg$/i.test(f.name)) {
      f.text().then((txt) => {
        setTool('editor');
        setTimeout(() => editorRef.current?.setSvg(txt), 120);
      });
    }
  }

  function reset() {
    setFile(null);
    setBeforeUrl(null);
    setResult(null);
    setError(null);
    setNotice(null);
  }

  async function run(kind) {
    setError(null);
    setNotice(null);
    setApiState('lavora');
    try {
      if (kind === 'remove') {
        setBusy('Scontorno in corso');
        setBusyNote(
          `Modello ${s.model}. Al primo utilizzo di un modello serve il download: può volerci un minuto.`,
        );
        const { blob, meta } = await api.removeBg(file, s);
        setResult({ url: own(blob), blob, kind: 'png', meta });
      } else {
        setBusy('Vettorializzazione in corso');
        setBusyNote('Converto i pixel in forme.');
        const { text, meta } = await api.vectorize(file, {
          preset: s.tracePreset,
          clean: s.clean,
        });
        const blob = new Blob([text], { type: 'image/svg+xml' });
        setResult({ url: own(blob), blob, text, kind: 'svg', meta });
      }
      refreshLibrary();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      setBusyNote(null);
      setApiState('pronta');
    }
  }

  /** Export whatever is currently the best version of the work. */
  async function runExport() {
    setError(null);
    setApiState('lavora');
    setBusy('Preparo il file');
    try {
      let source = file;
      let isVector = false;

      if (tool === 'editor') {
        const svg = editorRef.current?.getSvg();
        if (!svg) throw new Error("L'editor è vuoto.");
        source = new File([svg], `${(file?.name || 'disegno').replace(/\.[^.]+$/, '')}.svg`, {
          type: 'image/svg+xml',
        });
        isVector = true;
      } else if (result) {
        const ext = result.kind === 'svg' ? 'svg' : 'png';
        source = new File([result.blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, {
          type: result.kind === 'svg' ? 'image/svg+xml' : 'image/png',
        });
        isVector = result.kind === 'svg';
      }

      const { blob, meta } = await api.exportPreset(source, {
        preset: s.preset,
        background: s.background,
        isVector,
      });
      api.download(own(blob), `${source.name.replace(/\.[^.]+$/, '')}-${s.preset}.png`);
      setNotice(
        `Esportato ${px(meta.canvas)}${
          meta.upscaleLimited ? ' — sorgente troppo piccola per riempire l’area, non l’ho ingrandita.' : ''
        }`,
      );
      refreshLibrary();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      setApiState('pronta');
    }
  }

  async function saveFromEditor() {
    setError(null);
    try {
      const svg = editorRef.current?.getSvg();
      if (!svg) throw new Error("L'editor è vuoto.");
      const { work } = await api.saveSvg(svg, (file?.name || 'disegno').replace(/\.[^.]+$/, ''));
      setNotice(`Salvato come ${work.file}`);
      refreshLibrary();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cleanFromEditor() {
    setError(null);
    try {
      const svg = editorRef.current?.getSvg();
      if (!svg) throw new Error("L'editor è vuoto.");
      const { svg: out, meta } = await api.cleanSvg(svg);
      editorRef.current?.setSvg(out);
      setNotice(`SVG ripulito: ${meta.saved}% in meno (${meta.before} → ${meta.after} byte).`);
    } catch (e) {
      setError(e.message);
    }
  }

  /** Send the traced SVG straight into the editor — the whole point of having both. */
  function sendToEditor() {
    if (result?.kind !== 'svg') return;
    setTool('editor');
    setTimeout(() => {
      const ok = editorRef.current?.setSvg(result.text);
      if (!ok) setError("L'editor non è riuscito ad aprire questo SVG.");
    }, 120);
  }

  async function openWorkInEditor(item) {
    try {
      const res = await fetch(api.fileUrl(item.id));
      const txt = await res.text();
      setTool('editor');
      setTimeout(() => editorRef.current?.setSvg(txt), 120);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!caps) {
    return (
      <div className="shell">
        <header className="topbar">
          <span className="wordmark">
            JAYL <em>CRAFT</em>
          </span>
        </header>
        <div className="stage">
          <p className="editorial">
            {apiState === 'offline'
              ? 'API non raggiungibile. Avvia con npm run dev.'
              : 'Avvio…'}
          </p>
        </div>
      </div>
    );
  }

  const isEditor = tool === 'editor';
  const canExport = isEditor || Boolean(file);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          JAYL <em>CRAFT</em>
        </span>
        <nav className="tabs" role="tablist">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className="tab"
              role="tab"
              aria-selected={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <span className="lamp" data-state={apiState}>
          <i />
          {apiState === 'lavora' ? 'al lavoro' : apiState}
        </span>
      </header>

      <div className="main">
        <section className="stage">
          {error && <div className="alert">{error}</div>}
          {notice && !error && <div className="alert">{notice}</div>}

          {isEditor ? (
            <SvgEditor ref={editorRef} onSelection={setSelCount} />
          ) : file ? (
            <Compare
              before={beforeUrl}
              after={result?.url}
              busy={busy}
              busyNote={busyNote}
              labels={['originale', tool === 'scontorna' ? 'scontornato' : 'vettoriale']}
            />
          ) : (
            <Dropzone
              onFile={onFile}
              title={
                tool === 'scontorna' ? "Trascina un'immagine" : 'Trascina un raster da vettorializzare'
              }
              hint={
                tool === 'scontorna'
                  ? 'PNG, JPG, WebP — anche file di stampa da 3661×4843. Resta tutto su questa macchina.'
                  : 'Da pixel a forme scalabili. Funziona meglio su grafiche a colori piatti, loghi e line art.'
              }
            />
          )}
        </section>

        <aside className="rail">
          {isEditor ? (
            <>
              <div className="field">
                <span className="label">
                  <span>Modifica</span>
                  <b>{selCount ? `${selCount} selezionati` : 'niente selezionato'}</b>
                </span>
                <div className="row">
                  <button className="btn ghost small" onClick={() => editorRef.current?.undo()}>
                    Annulla
                  </button>
                  <button className="btn ghost small" onClick={() => editorRef.current?.redo()}>
                    Ripeti
                  </button>
                </div>
                <div className="row">
                  <button className="btn ghost small" onClick={() => editorRef.current?.group()}>
                    Raggruppa
                  </button>
                  <button className="btn ghost small" onClick={() => editorRef.current?.ungroup()}>
                    Separa
                  </button>
                </div>
                <div className="row">
                  <button className="btn ghost small" onClick={() => editorRef.current?.toFront()}>
                    Avanti
                  </button>
                  <button className="btn ghost small" onClick={() => editorRef.current?.toBack()}>
                    Dietro
                  </button>
                </div>
                <button className="btn ghost small" onClick={() => editorRef.current?.del()}>
                  Elimina selezione
                </button>
              </div>

              <div className="field">
                <span className="label">
                  <span>Riempimento</span>
                  <b>palette jayl</b>
                </span>
                <div className="swatches">
                  {PALETTE.map((c) => (
                    <button
                      key={`f-${c}`}
                      title={`Riempi ${c}`}
                      style={{
                        background:
                          c === 'none'
                            ? 'repeating-linear-gradient(45deg,#222 0 4px,#333 4px 8px)'
                            : c,
                      }}
                      onClick={() => editorRef.current?.paint('fill', c)}
                    />
                  ))}
                </div>
                <span className="label">
                  <span>Contorno</span>
                </span>
                <div className="swatches">
                  {PALETTE.map((c) => (
                    <button
                      key={`s-${c}`}
                      title={`Contorna ${c}`}
                      style={{
                        background:
                          c === 'none'
                            ? 'repeating-linear-gradient(45deg,#222 0 4px,#333 4px 8px)'
                            : c,
                      }}
                      onClick={() => editorRef.current?.paint('stroke', c)}
                    />
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="label">
                  <span>Zoom</span>
                </span>
                <div className="row">
                  {[0.5, 1, 2].map((z) => (
                    <button
                      key={z}
                      className="btn ghost small"
                      onClick={() => editorRef.current?.zoom(z)}
                    >
                      {z * 100}%
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn ghost" onClick={cleanFromEditor}>
                Ripulisci l'SVG
              </button>
            </>
          ) : tool === 'scontorna' ? (
            <RemovePanel caps={caps} s={s} set={set} busy={Boolean(busy)} />
          ) : (
            <TracePanel caps={caps} s={s} set={set} busy={Boolean(busy)} />
          )}

          {result?.meta && !isEditor && (
            <>
              <MetaBlock
                title="Risultato"
                rows={
                  result.kind === 'svg'
                    ? [
                        ['path', String(result.meta.paths)],
                        ['peso', `${Math.round(result.meta.bytes / 1024)} KB`],
                        ['risparmio', `${result.meta.saved}%`],
                        ['tempo', secs(result.meta.ms)],
                      ]
                    : [
                        ['strategia', result.meta.strategy === 'mask' ? 'maschera' : 'diretta'],
                        ['sorgente', px(result.meta.source)],
                        ['uscita', px(result.meta.output)],
                        ['la rete ha visto', px(result.meta.modelSaw)],
                        ['tempo', secs(result.meta.ms)],
                      ]
                }
              />
              {result.kind === 'svg' && (
                <button className="btn ghost small" onClick={sendToEditor}>
                  Apri nell'editor
                </button>
              )}
            </>
          )}

          <ExportPanel caps={caps} s={s} set={set} busy={Boolean(busy)} />

          {file && !isEditor && (
            <button className="btn ghost" onClick={reset}>
              Ricomincia
            </button>
          )}

          {/* One sticky bar so the primary action is never below the fold. */}
          <div className="cta">
            {isEditor ? (
              <button className="btn" onClick={saveFromEditor}>
                Salva nei lavori
              </button>
            ) : (
              <button
                className="btn"
                disabled={!file || Boolean(busy)}
                onClick={() => run(tool === 'scontorna' ? 'remove' : 'trace')}
              >
                {tool === 'scontorna' ? 'Scontorna' : 'Vettorializza'}
              </button>
            )}
            <button
              className="btn ghost"
              disabled={!canExport || Boolean(busy)}
              onClick={runExport}
            >
              Esporta e scarica
            </button>
          </div>
        </aside>
      </div>

      <Library
        items={works}
        open={libOpen}
        onToggle={() => setLibOpen((v) => !v)}
        onRefresh={refreshLibrary}
        onOpenInEditor={openWorkInEditor}
        path={libPath}
      />

      <footer className="statusbar">
        <span>
          file <b>{file ? file.name : '—'}</b>
        </span>
        {!isEditor && (
          <span>
            {tool === 'scontorna' ? 'modello' : 'tracciato'}{' '}
            <b>{tool === 'scontorna' ? s.model : s.tracePreset}</b>
          </span>
        )}
        <span>
          formato <b>{s.preset}</b>
        </span>
        <span className="payoff">Art finds a way.</span>
      </footer>
    </div>
  );
}
