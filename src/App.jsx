import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import Library from './components/Library.jsx';
import SvgEditor from './components/SvgEditor.jsx';
import { RemovePanel, TracePanel, ExportPanel, MetaBlock } from './components/Panels.jsx';
import EngineBanner from './components/EngineBanner.jsx';
import LanguageSwitch from './components/LanguageSwitch.jsx';
import HelpToggle from './components/HelpToggle.jsx';
import Onboarding, { hasSeenOnboarding } from './components/Onboarding.jsx';
import VectorTools from './components/VectorTools.jsx';
import { useEngine } from './hooks/useEngine.js';
import { t, setLang, detectLang, onLangChange } from './i18n/index.js';
import { onHelpChange, isHelpOn } from './i18n/help.js';
import { renderExport } from './engine/render.js';
import { PRESETS, BACKGROUNDS } from './engine/export.js';
import { traceToSvg, TRACE_PRESETS } from './engine/trace.js';
import * as api from './lib/api.js';

const TOOLS = [
  { id: 'scontorna', key: 'tool.cutout' },
  { id: 'vettorializza', key: 'tool.vector' },
  { id: 'editor', key: 'tool.editor' },
];

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

  const [works, setWorks] = useState([]);
  const [libOpen, setLibOpen] = useState(true);
  const [libPath, setLibPath] = useState('');

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
    // Il backend serve solo alla libreria su disco. Se non c'è, l'app funziona
    // lo stesso: si perde solo il salvataggio automatico dei lavori.
    api
      .health()
      .then((h) => {
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
      } else {
        // Anche il tracciato gira nel browser: VTracer in WebAssembly, 140 KB.
        setBusy(t('vector.working'));
        setBusyNote(null);
        const { svg: text, meta } = await traceToSvg(file, { preset: s.tracePreset, clean: s.clean });
        const blob = new Blob([text], { type: 'image/svg+xml' });
        setResult({ url: own(blob), blob, text, kind: 'svg', meta });
      }
      refreshLibrary();
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
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          JAYL <em>STUDIO</em>
        </span>
        <nav className="tabs" role="tablist">
          {/* `tab`, non `t`: `t` è la funzione di traduzione e verrebbe oscurata. */}
          {TOOLS.map((tab) => (
            <button
              key={tab.id}
              className="tab"
              role="tab"
              aria-selected={tool === tab.id}
              title={t(`${tab.key}.help`)}
              onClick={() => setTool(tab.id)}
            >
              {t(`${tab.key}.label`)}
            </button>
          ))}
        </nav>
        {/* La spiegazione della scheda attiva, quando «Spiegami» è acceso:
            è il punto in cui un nuovo utente si blocca per primo. */}
        {isHelpOn() && (
          <span className="tabhelp">{t(`${TOOLS.find((x) => x.id === tool).key}.help`)}</span>
        )}
        <span className="spacer" />
        <HelpToggle />
        <LanguageSwitch />
      </header>

      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      <div className="main">
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
            <RemovePanel models={engine.models} s={s} set={set} busy={Boolean(busy)} />
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
        items={works}
        open={libOpen}
        onToggle={() => setLibOpen((v) => !v)}
        onRefresh={refreshLibrary}
        onOpenInEditor={openWorkInEditor}
        path={libPath}
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
