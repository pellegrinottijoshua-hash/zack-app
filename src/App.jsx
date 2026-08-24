import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone.jsx';
import Compare from './components/Compare.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import * as api from './lib/api.js';

export default function App() {
  const [caps, setCaps] = useState(null);
  const [apiState, setApiState] = useState('...');
  const [file, setFile] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [cutout, setCutout] = useState(null); // { blob, url }
  const [model, setModel] = useState('u2net');
  const [preset, setPreset] = useState('gelato-front');
  const [busy, setBusy] = useState(null);
  const [busyNote, setBusyNote] = useState(null);
  const [error, setError] = useState(null);
  const [exportMeta, setExportMeta] = useState(null);

  // Object URLs are revoked on replacement; this keeps the set we own.
  const urls = useRef(new Set());
  const own = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.add(u);
    return u;
  };
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  useEffect(() => {
    api
      .health()
      .then((h) => {
        setCaps(h);
        setApiState('pronta');
      })
      .catch(() => setApiState('offline'));
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setBeforeUrl(null);
    setCutout(null);
    setError(null);
    setExportMeta(null);
  }, []);

  function onFile(f) {
    setError(null);
    setCutout(null);
    setExportMeta(null);
    setFile(f);
    setBeforeUrl(own(f));
  }

  async function runRemoveBg() {
    setError(null);
    setBusy('Scontorno in corso');
    setBusyNote(
      `Modello ${model}. Se è la prima volta che lo usi lo sta scaricando: può volerci un minuto.`,
    );
    try {
      const blob = await api.removeBg(file, model);
      setCutout({ blob, url: own(blob) });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      setBusyNote(null);
    }
  }

  async function runExport() {
    setError(null);
    setBusy('Preparo il file');
    setBusyNote(null);
    try {
      const source = cutout ? new File([cutout.blob], 'cutout.png', { type: 'image/png' }) : file;
      const { blob, meta } = await api.exportPreset(source, preset);
      setExportMeta(meta);

      const a = document.createElement('a');
      a.href = own(blob);
      a.download = `${file.name.replace(/\.[^.]+$/, '')}-${preset}.png`;
      a.click();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          studio<span>.</span>lab
        </span>
        <span className="crumb">camera oscura — locale</span>
        <span className="spacer" />
        <span className="lamp" data-on={apiState === 'pronta' ? (busy ? 'true' : 'idle') : 'error'}>
          <i />
          api {apiState}
        </span>
      </header>

      <div className="main">
        <section className="stage">
          {error && <div className="alert">{error}</div>}
          {file ? (
            <Compare
              before={beforeUrl}
              after={cutout?.url}
              busy={busy}
              busyNote={busyNote}
            />
          ) : (
            <Dropzone onFile={onFile} />
          )}
        </section>

        <ExportPanel
          models={caps?.models || []}
          presets={caps?.presets || []}
          model={model}
          preset={preset}
          onModel={setModel}
          onPreset={setPreset}
          onRemoveBg={runRemoveBg}
          onExport={runExport}
          onReset={reset}
          busy={Boolean(busy)}
          hasFile={Boolean(file)}
          hasCutout={Boolean(cutout)}
          exportMeta={exportMeta}
        />
      </div>

      <footer className="statusbar">
        <span>
          file <b>{file ? file.name : '—'}</b>
        </span>
        <span>
          modello <b>{model}</b>
        </span>
        <span>
          formato <b>{preset}</b>
        </span>
      </footer>
    </div>
  );
}
