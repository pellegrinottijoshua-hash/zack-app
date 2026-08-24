const MODEL_NOTES = {
  'u2net': 'veloce',
  'isnet-general-use': 'equilibrato',
  'isnet-anime': 'illustrazioni',
  'birefnet-general-lite': 'fine',
  'birefnet-general': 'massimo',
};

export default function ExportPanel({
  models,
  presets,
  model,
  preset,
  onModel,
  onPreset,
  onRemoveBg,
  onExport,
  onReset,
  busy,
  hasFile,
  hasCutout,
  exportMeta,
}) {
  return (
    <aside className="rail">
      <div className="field">
        <span className="label">
          <span>Modello</span>
          <span>scontorno</span>
        </span>
        {models.map((m) => (
          <button
            key={m}
            className="opt"
            aria-pressed={model === m}
            disabled={busy}
            onClick={() => onModel(m)}
          >
            <span className="dot" />
            {m}
            <span className="note">{MODEL_NOTES[m] || ''}</span>
          </button>
        ))}
        <button className="btn" disabled={!hasFile || busy} onClick={onRemoveBg}>
          Scontorna
        </button>
      </div>

      <div className="field">
        <span className="label">
          <span>Formato</span>
          <span>export</span>
        </span>
        {presets.map((p) => (
          <button
            key={p.id}
            className="opt"
            aria-pressed={preset === p.id}
            disabled={busy}
            onClick={() => onPreset(p.id)}
          >
            <span className="dot" />
            {p.label}
          </button>
        ))}
        <button className="btn" disabled={!hasFile || busy} onClick={onExport}>
          Esporta PNG
        </button>
        {!hasCutout && hasFile && (
          <span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>
            Esporta usa l'originale finché non scontorni.
          </span>
        )}
      </div>

      {exportMeta && (
        <div className="field">
          <span className="label">
            <span>Ultimo export</span>
          </span>
          <dl className="meta">
            <dt>tela</dt>
            <dd>
              {exportMeta.canvas.w}×{exportMeta.canvas.h}
            </dd>
            <dt>grafica</dt>
            <dd>
              {exportMeta.placed.w}×{exportMeta.placed.h}
            </dd>
            <dt>sorgente</dt>
            <dd>
              {exportMeta.source.w}×{exportMeta.source.h}
            </dd>
          </dl>
          {exportMeta.upscaleLimited && (
            <span className="label warn" style={{ textTransform: 'none', letterSpacing: 0 }}>
              Sorgente troppo piccola per riempire l'area di stampa. Non l'ho
              ingrandita: su tessuto si vedrebbe sgranata.
            </span>
          )}
        </div>
      )}

      <button className="btn ghost" disabled={!hasFile || busy} onClick={onReset}>
        Ricomincia
      </button>
    </aside>
  );
}
