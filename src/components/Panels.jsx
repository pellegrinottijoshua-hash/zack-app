import { Fragment } from 'react';
import { t } from '../i18n/index.js';
import { help } from '../i18n/help.js';

/** Mostra la spiegazione solo quando l'utente ha acceso «Spiegami». */
export function Help({ k }) {
  const text = help(k);
  return text ? <p className="help">{text}</p> : null;
}

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

/**
 * Una sola scelta: la qualità.
 *
 * Prima erano otto controlli — cinque modelli più tre livelli di dettaglio — da
 * capire prima di poter premere un bottone, e l'elenco arrivava dal vecchio
 * backend: comprendeva anche modelli che nel browser non partono affatto.
 * Offrire un'opzione che si rompe è peggio che non offrirla.
 *
 * `models` arriva dal motore e contiene solo ciò che questo browser sa fare.
 */
export function RemovePanel({ models, s, set, busy }) {
  return (
    <div className="field">
      <span className="label">
        <span>{t('control.quality.label')}</span>
      </span>
      <Help k="control.quality.help" />
      {models.map((m) => (
        <Choice
          key={m.id}
          label={t(m.labelKey)}
          note={t(m.labelKey.replace(/\.name$/, '.note'))}
          active={s.model === m.id}
          disabled={busy}
          onClick={() => set({ model: m.id })}
        />
      ))}
    </div>
  );
}

export function TracePanel({ caps, s, set, busy }) {
  return (
    <>
      <div className="field">
        <span className="label">
          <span>{t('vector.kind.label')}</span>
        </span>
        <Help k="vector.kind.help" />
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
          label={t('vector.clean.label')}
          note={s.clean ? t('common.on') : t('common.off')}
          active={s.clean}
          disabled={busy}
          onClick={() => set({ clean: !s.clean })}
        />
        <Help k="vector.clean.help" />
      </div>

    </>
  );
}

export function ExportPanel({ caps, s, set, busy }) {
  const groups = [...new Set(caps.presets.map((p) => p.group))];
  return (
    <div className="field">
      <span className="label">
        <span>{t('control.format.label')}</span>
      </span>
      <Help k="control.format.help" />
      {groups.map((g) => (
        <div className="field" key={g}>
          <span className="label" style={{ letterSpacing: '0.14em' }}>
            <span>{t(`group.${g}`)}</span>
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
        <span>{t('control.background.label')}</span>
      </span>
      <Help k="control.background.help" />
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
