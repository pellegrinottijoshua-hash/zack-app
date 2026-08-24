import { Fragment } from 'react';
const DETAIL_LABELS = {
  fast: ['Rapido', '1024 px'],
  balanced: ['Equilibrato', '1536 px'],
  fine: ['Fine', '2048 px'],
};

const BG_SWATCH = {
  transparent: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 / 8px 8px',
  nero: '#111111',
  panna: '#F5F0E8',
  bianco: '#FFFFFF',
};

export function Choice({ label, note, active, disabled, onClick, swatch }) {
  return (
    <button className="opt" aria-pressed={active} disabled={disabled} onClick={onClick}>
      {swatch && <span className="swatch" style={{ background: swatch }} />}
      {label}
      {note && <span className="note">{note}</span>}
    </button>
  );
}

export function RemovePanel({ caps, s, set, busy }) {
  return (
    <>
      <div className="field">
        <span className="label">
          <span>Modello</span>
          <b>rete neurale</b>
        </span>
        {caps.models.map((m) => (
          <Choice
            key={m.id}
            label={m.label}
            note={m.note}
            active={s.model === m.id}
            disabled={busy}
            onClick={() => set({ model: m.id })}
          />
        ))}
      </div>

      <div className="field">
        <span className="label">
          <span>Dettaglio</span>
          <b>file grandi</b>
        </span>
        {Object.keys(DETAIL_LABELS).map((d) => (
          <Choice
            key={d}
            label={DETAIL_LABELS[d][0]}
            note={DETAIL_LABELS[d][1]}
            active={s.detail === d}
            disabled={busy}
            onClick={() => set({ detail: d })}
          />
        ))}
        <p className="hint">
          Oltre questa misura l'immagine non viene rimpicciolita: la rete
          analizza una copia ridotta e la maschera viene riapplicata
          all'originale a piena risoluzione.
        </p>
      </div>

      <div className="field">
        <Choice
          label="Togli l'alone sui bordi"
          note={s.decontaminate ? 'attivo' : 'spento'}
          active={s.decontaminate}
          disabled={busy}
          onClick={() => set({ decontaminate: !s.decontaminate })}
        />
      </div>

    </>
  );
}

export function TracePanel({ caps, s, set, busy }) {
  return (
    <>
      <div className="field">
        <span className="label">
          <span>Tipo di tracciato</span>
          <b>vtracer</b>
        </span>
        {caps.tracePresets.map((p) => (
          <Choice
            key={p.id}
            label={p.label}
            note={p.note}
            active={s.tracePreset === p.id}
            disabled={busy}
            onClick={() => set({ tracePreset: p.id })}
          />
        ))}
      </div>

      <div className="field">
        <Choice
          label="Pulisci l'SVG"
          note={s.clean ? 'attivo' : 'spento'}
          active={s.clean}
          disabled={busy}
          onClick={() => set({ clean: !s.clean })}
        />
        <p className="hint">
          Converte i pixel in forme scalabili. Su una foto genera migliaia di
          path: per loghi e line art scegli "Bianco e nero".
        </p>
      </div>

    </>
  );
}

export function ExportPanel({ caps, s, set, busy }) {
  const groups = [...new Set(caps.presets.map((p) => p.group))];
  return (
    <div className="field">
      <span className="label">
        <span>Esporta</span>
        <b>png</b>
      </span>
      {groups.map((g) => (
        <div className="field" key={g}>
          <span className="label" style={{ letterSpacing: '0.14em' }}>
            <span>{g}</span>
          </span>
          {caps.presets
            .filter((p) => p.group === g)
            .map((p) => (
              <Choice
                key={p.id}
                label={p.label}
                active={s.preset === p.id}
                disabled={busy}
                onClick={() => set({ preset: p.id })}
              />
            ))}
        </div>
      ))}

      <span className="label" style={{ marginTop: 6 }}>
        <span>Sfondo</span>
      </span>
      {caps.backgrounds.map((b) => (
        <Choice
          key={b}
          label={b}
          swatch={BG_SWATCH[b]}
          active={s.background === b}
          disabled={busy}
          onClick={() => set({ background: b })}
        />
      ))}

    </div>
  );
}

export function MetaBlock({ title, rows }) {
  return (
    <div className="field">
      <span className="label">
        <span>{title}</span>
      </span>
      <dl className="meta">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
