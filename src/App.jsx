import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, TracePanel, ExportPanel, MetaBlock, Help } from './components/Panels.jsx';
import EngineBanner from './components/EngineBanner.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import HelpToggle from './components/HelpToggle.jsx';
import Onboarding, { hasSeenOnboarding } from './components/Onboarding.jsx';
import VectorTools from './components/VectorTools.jsx';
import { resolveShortcut } from './engine/shortcuts.js';
import { useLibrary } from './hooks/useLibrary.js';
import ToolRail from './components/ToolRail.jsx';
import MaskBrush from './components/MaskBrush.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import { useBatch } from './hooks/useBatch.js';
import { SCALES, canUpscale, estimateSeconds, getScale } from './engine/upscale.js';
import { getService, firstReady } from './services.js';
import { bundleAll } from './store/bundle.js';
import { useEngine } from './hooks/useEngine.js';
import { t, setLang, detectLang, onLangChange } from './i18n/index.js';
import { onHelpChange, isHelpOn } from './i18n/help.js';
import { renderExport } from './engine/render.js';
import { PRESETS, BACKGROUNDS } from './engine/export.js';
import { traceToSvg, TRACE_PRESETS } from './engine/trace.js';
import * as api from './lib/api.js';

const PALETTE = ['#111111', '#F5F0E8', '#FFFFFF', '#8A8A85', '#C4A35A', 'none'];

const px = (d) => (d ? `${d.w}×${d.h}` : '—');
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

export default function App() {
  const [apiState, setApiState] = useState('offline');
  const [tool, setTool] = useState('scontorna');

  const [file, setFile] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [result, setResult] = useState(null); // { blob|text, url, kind, meta }
  const [busy, setBusy] = useState(null);
  const [busyNote, setBusyNote] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const library = useLibrary();
  // La striscia dei lavori parte chiusa: mangia un quinto dello schermo, e
  // chi apre l'app vuole lavorare su un file, non sfogliare l'archivio.
  const [libOpen, setLibOpen] = useState(() => {
    try {
      return localStorage.getItem('jayl.libOpen') === '1';
    } catch {
      return false;
    }
  });

  const [s, setS] = useState({
    // Sovrascritto appena il motore sa cosa può fare questo browser: scegliere
    // qui un default fisso significherebbe proporre a un browser lento un
    // modello che non regge.
    model: null,
    tracePreset: 'poster',
    clean: true,
    preset: 'gelato-front',
    background: 'transparent',
  });
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const editorRef = useRef(null);
  const [selCount, setSelCount] = useState(0);
  const [nodeMode, setNodeMode] = useState(false);
  // I riferimenti scelti dalla libreria per la prossima generazione. Vivono
  // qui perché attraversano gli strumenti: si scelgono guardando l'archivio e
  // si usano generando.
  const [references, setReferences] = useState([]);
  const [brushOpen, setBrushOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  // Da quale lavoro in libreria viene il file aperto: serve a registrare la
  // provenienza, che è ciò che rende ritrovabile un file di cui non si
  // ricorda il nome.
  const [sourceAssetId, setSourceAssetId] = useState(null);
  // Cambia a ogni azione sull'editor per far rileggere al pannello la
  // posizione della selezione, che la libreria muta fuori da React.
  const [editorTick, setEditorTick] = useState(0);

  // ─── motore nel browser ────────────────────────────────────────────────
  const engine = useEngine();
  const [bannerOpen, setBannerOpen] = useState(true);
  const [, forceRender] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding());

  useEffect(() => {
    setLang(detectLang(navigator.languages));
    forceRender((n) => n + 1);
    // Lingua e spiegazioni devono ridisegnare tutta l'interfaccia, non solo il
    // proprio interruttore.
    const offLang = onLangChange(() => forceRender((n) => n + 1));
    const offHelp = onHelpChange(() => forceRender((n) => n + 1));
    return () => {
      offLang();
      offHelp();
    };
  }, []);

  const batch = useBatch({
    engine,
    library,
    model: s.model || engine.defaultModelId,
  });

  /** Sceglie più file in una volta: è il gesto che apre il lavoro in blocco. */
  function pickBatchFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const list = [...(input.files || [])].filter((f) => f.type.startsWith('image/'));
      if (list.length) {
        setBatchFiles(list);
        batch.clear();
      }
    };
    input.click();
  }

  // Scorciatoie da tastiera: attive solo nell'editor, e mai mentre si scrive.
  // La decisione su quale azione eseguire sta in una funzione pura testata a
  // parte; qui resta solo il collegamento.
  useEffect(() => {
    if (tool !== 'editor') return undefined;
    const onKey = (ev) => {
      const action = resolveShortcut(ev);
      if (!action) return;
      const e = editorRef.current;
      if (!e) return;
      ev.preventDefault();

      if (action.startsWith('tool:')) {
        const id = action.slice(5);
        const ok = e.setMode(id);
        setNodeMode(ok && id === 'pathedit');
      } else if (action.startsWith('nudge:')) {
        const [dx, dy] = action.slice(6).split(',').map(Number);
        e.nudge(dx, dy);
      } else if (action === 'delete') e.del();
      else if (action === 'duplicate') e.duplicate();
      else if (action === 'group') e.group();
      else if (action === 'ungroup') e.ungroup();
      else if (action === 'undo') e.undo();
      else if (action === 'redo') e.redo();

      setEditorTick((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // Il motore decide il default: l'utente deve poter premere Scontorna senza
  // aver scelto nulla.
  useEffect(() => {
    if (engine.defaultModelId) setS((prev) => ({ ...prev, model: prev.model ?? engine.defaultModelId }));
  }, [engine.defaultModelId]);

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


  function onFile(f) {
    setError(null);
    setNotice(null);
    setResult(null);
    setFile(f);
    setBeforeUrl(own(f));
    // Un file trascinato da fuori non ha un'origine in libreria.
    setSourceAssetId(null);

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
        // Gira nel browser: nessuna chiamata di rete, nessun costo per noi.
        setBusy(t('engine.working'));
        setBusyNote(null);
        const started = Date.now();
        const blob = await engine.cutout(file, s.model);
        setResult({
          url: own(blob),
          blob,
          kind: 'png',
          meta: { strategy: 'browser', model: s.model, ms: Date.now() - started },
        });
        await library.save(blob, {
          name: `${file.name.replace(/\.[^.]+$/, '')}-scontornato`,
          kind: 'png',
          meta: { fromId: sourceAssetId, op: 'remove-bg', model: s.model },
        });
      } else {
        // Anche il tracciato gira nel browser: VTracer in WebAssembly, 140 KB.
        setBusy(t('vector.working'));
        setBusyNote(null);
        const { svg: text, meta } = await traceToSvg(file, { preset: s.tracePreset, clean: s.clean });
        const blob = new Blob([text], { type: 'image/svg+xml' });
        setResult({ url: own(blob), blob, text, kind: 'svg', meta });
        await library.save(blob, {
          name: `${file.name.replace(/\.[^.]+$/, '')}-vettoriale`,
          kind: 'svg',
          meta: { fromId: sourceAssetId, op: 'vectorize', preset: s.tracePreset, paths: meta.paths },
        });
      }
    } catch (e) {
      // Un codice interno non è un messaggio: lo traduciamo in una frase che
      // dice cosa è successo e cosa fare. Lo stack resta in console.
      console.error(e);
      if (e.code === 'trace-empty') setError(`${t('trace.empty.title')} — ${t('trace.empty.body')}`);
      else if (e.code) setError(`${t('engine.error.title')} — ${t('engine.error.body')}`);
      else setError(e.message);
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
    setBusy(t('action.preparing'));
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

      // Anche l'export gira nel browser: il flusso principale non ha piu'
      // bisogno che il backend sia acceso.
      const { blob, meta } = await renderExport(source, {
        preset: s.preset,
        background: s.background,
        isVector,
      });
      api.download(own(blob), `${source.name.replace(/\.[^.]+$/, '')}-${s.preset}.png`);
      await library.save(blob, {
        name: `${source.name.replace(/\.[^.]+$/, '')}-${s.preset}`,
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'export', preset: s.preset, background: s.background },
      });
      setNotice(
        `${meta.canvas.w}×${meta.canvas.h}${meta.upscaleLimited ? ` — ${t('result.tooSmall')}` : ''}`,
      );
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
      const work = await library.save(new Blob([svg], { type: 'image/svg+xml' }), {
        name: (file?.name || 'disegno').replace(/\.[^.]+$/, ''),
        kind: 'svg',
        meta: { fromId: sourceAssetId, op: 'editor' },
      });
      setNotice(work.file);
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
      const { file: f } = await library.read(item.id);
      const txt = await f.text();
      setTool('editor');
      setTimeout(() => editorRef.current?.setSvg(txt), 120);
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    }
  }

  /** Ingrandimento: ricostruisce il dettaglio invece di interpolare. */
  async function runUpscale() {
    const src = result?.blob || file;
    if (!src) return;
    setError(null);
    setNotice(null);
    try {
      const bmp = await createImageBitmap(src);
      if (!canUpscale(bmp.width, bmp.height)) {
        bmp.close?.();
        setNotice(t('upscale.tooBig'));
        return;
      }
      const secs = estimateSeconds(bmp.width, bmp.height, getScale('x4'));
      setBusy(t('upscale.working'));
      setBusyNote(t('upscale.estimate', { sec: secs }));

      const out = await engine.upscale(bmp, 'x4', (phase, d) => {
        if (d?.done) setBusyNote(`${d.done}/${d.total} · ${t('upscale.estimate', { sec: secs })}`);
      });

      const cv = document.createElement('canvas');
      cv.width = out.width;
      cv.height = out.height;
      cv.getContext('2d').putImageData(new ImageData(out.rgba, out.width, out.height), 0, 0);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      setResult({ url: own(blob), blob, kind: 'png', meta: { strategy: 'upscale', output: { w: out.width, h: out.height } } });
      await library.save(blob, {
        name: `${(file?.name || 'immagine').replace(/\.[^.]+$/, '')}-ingrandita`,
        kind: 'png',
        meta: { fromId: sourceAssetId, op: 'upscale', scale: 'x4' },
      });
    } catch (e) {
      console.error(e);
      setError(e.code === 'upscale-too-large' ? t('upscale.tooBig') : t('engine.error.body'));
    } finally {
      setBusy(null);
      setBusyNote(null);
    }
  }

  /**
   * Un'azione partita da un lavoro in libreria: il file diventa quello su cui
   * si sta lavorando e lo strumento giusto si apre da solo. È la scorciatoia
   * che evita "scegli lo strumento, poi ritrova il file".
   */
  async function assetAction(kind, item) {
    setError(null);
    setNotice(null);
    try {
      const { file: f } = await library.read(item.id);
      const asFile = new File([f], item.file, { type: f.type });

      if (kind === 'reference') {
        setReferences((prev) =>
          prev.some((r) => r.id === item.id) ? prev : [...prev, { id: item.id, name: item.name }],
        );
        setNotice(`${t('actions.added')}: ${item.name}`);
        return;
      }

      setResult(null);
      setFile(asFile);
      setBeforeUrl(own(asFile));
      setSourceAssetId(item.id);
      setTool(kind === 'cutout' ? 'scontorna' : 'vettorializza');
    } catch (e) {
      console.error(e);
      setError(t('engine.error.body'));
    }
  }

  /** Zip di tutto l'archivio, costruito qui: nessun server coinvolto. */
  async function downloadAll() {
    setError(null);
    setBusy(t('action.preparing'));
    try {
      const blob = await bundleAll();
      api.download(own(blob), `jayl-studio-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (e) {
      console.error(e);
      setError(e.code === 'library-empty' ? t('library.empty') : t('engine.error.body'));
    } finally {
      setBusy(null);
    }
  }

  // L'attesa dipende dal MOTORE, non dal server. Il backend serve solo alla
  // libreria su disco: legare tutta l'interfaccia alla sua risposta rendeva
  // l'app inutilizzabile senza backend, cioè l'esatto contrario della promessa.
  if (!engine.ready) {
    return (
      <div className="shell">
        <header className="topbar">
          <span className="wordmark">
            JAYL <em>STUDIO</em>
          </span>
          <span className="spacer" />
          <LanguageSwitch />
        </header>
        <div className="stage">
          <p className="editorial">{t('engine.starting')}</p>
        </div>
      </div>
    );
  }

  const isEditor = tool === 'editor';
  const canExport = isEditor || Boolean(file);

  return (
    <div className="shell" data-working={isEditor}>
      <header className="topbar">
        <span className="wordmark">
          JAYL <em>STUDIO</em>
        </span>
        <span className="spacer" />
        <HelpToggle />
        <LanguageSwitch />
      </header>

      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      <div className="main">
        <ToolRail
          current={tool}
          collapsed={isEditor}
          balance={null}
          onPick={(svc) => {
            if (!svc.ready) {
              setNotice(`${t('soon.title')} — ${t('soon.body')}`);
              return;
            }
            setNotice(null);
            setTool(svc.id);
          }}
        />

        <section className="stage">
          {bannerOpen && engine.ready && (
            <EngineBanner
              tier={engine.tier}
              phase={engine.phase}
              onDismiss={() => setBannerOpen(false)}
            />
          )}
          {error && <div className="alert">{error}</div>}
          {notice && !error && <div className="alert">{notice}</div>}

          {isEditor ? (
            <SvgEditor
              ref={editorRef}
              onSelection={setSelCount}
              onRefuseNodes={() => setNotice(t('nodes.needPath'))}
            />
          ) : brushOpen && result?.kind === 'png' ? (
            <MaskBrush
              source={file}
              cutout={result.blob}
              onDone={async (blob) => {
                setResult({ url: own(blob), blob, kind: 'png', meta: { ...result.meta, retouched: true } });
                setBrushOpen(false);
                await library.save(blob, {
                  name: `${(file?.name || 'immagine').replace(/\.[^.]+$/, '')}-corretto`,
                  kind: 'png',
                  meta: { fromId: sourceAssetId, op: 'brush' },
                });
              }}
            />
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
              title={t(tool === 'scontorna' ? 'drop.title' : 'drop.vectorTitle')}
              hint={t(tool === 'scontorna' ? 'drop.hint' : 'drop.vectorHint')}
            />
          )}
        </section>

        <aside className="rail">
          {isEditor ? (
            <>
              <VectorTools
                editor={editorRef}
                selCount={selCount}
                nodeMode={nodeMode}
                tick={editorTick}
                onNodeMode={(on) => {
                  setNodeMode(on);
                  editorRef.current?.nodeMode(on);
                }}
              />

              <button className="btn ghost" onClick={cleanFromEditor}>
                {t('editor.clean.label')}
              </button>
            </>
          ) : tool === 'scontorna' ? (
            <>
              <RemovePanel models={engine.models} s={s} set={set} busy={Boolean(busy)} />

              {result?.kind === 'png' && (
                <div className="field">
                  <span className="label">
                    <span>{t('brush.title')}</span>
                  </span>
                  <Help k="brush.help" />
                  <button
                    className="opt"
                    aria-pressed={brushOpen}
                    disabled={Boolean(busy)}
                    onClick={() => setBrushOpen((v) => !v)}
                  >
                    {t('brush.open')}
                  </button>
                </div>
              )}

              <BatchPanel
                files={batchFiles}
                batch={batch}
                onPickFiles={pickBatchFiles}
                onClearFiles={() => {
                  setBatchFiles([]);
                  batch.clear();
                }}
              />

              <div className="field">
                <span className="label">
                  <span>{t('upscale.title')}</span>
                </span>
                <Help k="upscale.help" />
                <button
                  className="opt"
                  disabled={!file || Boolean(busy)}
                  onClick={runUpscale}
                >
                  {t('upscale.x4')}
                </button>
              </div>
            </>
          ) : (
            <TracePanel presets={TRACE_PRESETS} s={s} set={set} busy={Boolean(busy)} />
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

          <ExportPanel
            presets={PRESETS}
            backgrounds={Object.keys(BACKGROUNDS)}
            s={s}
            set={set}
            busy={Boolean(busy)}
          />

          {file && !isEditor && (
            <button className="btn ghost" onClick={reset}>
              {t('control.reset.label')}
            </button>
          )}

          {/* One sticky bar so the primary action is never below the fold. */}
          <div className="cta">
            {isEditor ? (
              <button className="btn" onClick={saveFromEditor}>
                {t('editor.save.label')}
              </button>
            ) : (
              <button
                className="btn"
                disabled={!file || Boolean(busy)}
                onClick={() => run(tool === 'scontorna' ? 'remove' : 'trace')}
              >
                {t(tool === 'scontorna' ? 'tool.cutout.label' : 'tool.vector.label')}
              </button>
            )}
            <button
              className="btn ghost"
              disabled={!canExport || Boolean(busy)}
              onClick={runExport}
            >
              {t('action.export.label')}
            </button>
          </div>
        </aside>
      </div>

      <Library
        store={library}
        open={libOpen}
        onToggle={() =>
          setLibOpen((v) => {
            const next = !v;
            try {
              localStorage.setItem('jayl.libOpen', next ? '1' : '0');
            } catch {
              /* la sessione corrente funziona lo stesso */
            }
            return next;
          })
        }
        onOpenInEditor={openWorkInEditor}
        onDownloadAll={downloadAll}
        onAssetAction={assetAction}
      />

      <footer className="statusbar">
        <span>
          {t('status.file')} <b>{file ? file.name : t('status.none')}</b>
        </span>
        {!isEditor && (
          <span>
            {t('status.mode')}{' '}
            {/* Il nome amichevole, non l'id tecnico: "isnet-general-use" non
                dice niente a nessuno. */}
            <b>
              {tool === 'scontorna'
                ? t(engine.models.find((m) => m.id === s.model)?.labelKey || 'status.none')
                : s.tracePreset}
            </b>
          </span>
        )}
        <span>
          {t('status.format')} <b>{s.preset}</b>
        </span>
        <span className="payoff">{t('app.payoff')}</span>
      </footer>
    </div>
  );
}
