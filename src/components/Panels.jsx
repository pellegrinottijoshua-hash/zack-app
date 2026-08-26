import { Fragment } from 'react';
import { t } from '../i18n/index.js';
import { help } from '../i18n/help.js';
import Section from './Section.jsx';
import {
  SCALES,
  canUpscale,
  estimateSeconds,
  getScale,
  humanSeconds,
  inputLimits,
} from '../engine/upscale.js';

/** Mostra la spiegazione solo quando l'utente ha acceso «Spiegami». */
export function Help({ k }) {
  const text = help(k);
  return text ? <p className="help">{text}</p> : null;
}

const BG_SWATCH = {
  // Scacchiera grigia come nel piano di lavoro: su fondo scuro una
  // scacchiera scura non si distingue da un campione nero.
  transparent: 'repeating-conic-gradient(#8a8a85 0% 25%, #6e6e6a 0% 50%) 0 / 8px 8px',
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
  // Richiudibile come tutte le altre: si chiude per dare spazio alla tela,
  // non per far stare la lista. Vedi `Section.jsx`.
  return (
    <Section id="quality" title={t('control.quality.label')} helpKey="control.quality.help">
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
    </Section>
  );
}

export function TracePanel({ presets, s, set, busy }) {
  return (
    <Section id="trace" title={t('vector.kind.label')} helpKey="vector.kind.help">
      <div className="field">
        {presets.map((p) => (
          <Choice
            key={p.id}
            label={t(p.labelKey)}
            note={t(p.noteKey)}
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
    </Section>
  );
}

export function ExportPanel({ presets, backgrounds, s, set, busy }) {
  const groups = [...new Set(presets.map((p) => p.group))];
  return (
    <Section id="format" title={t('control.format.label')} helpKey="control.format.help">
      {groups.map((g) => (
        <div className="field" key={g}>
          <span className="label" style={{ letterSpacing: '0.14em' }}>
            <span>{t(`group.${g}`)}</span>
          </span>
          {presets
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
      {backgrounds.map((b) => (
        <Choice
          key={b}
          label={b}
          swatch={BG_SWATCH[b]}
          active={s.background === b}
          disabled={busy}
          onClick={() => set({ background: b })}
        />
      ))}
    </Section>
  );
}

/**
 * L'ingrandimento, con il conto in chiaro prima di premere.
 *
 * Ci vogliono minuti su un file di stampa. Far partire un'attesa lunga senza
 * dire quanto durera' e' il modo piu' sicuro di far chiudere la scheda a meta'.
 */
export function UpscalePanel({ image, scaleId = 'x4', onScale, busy, running, onRun, onStop }) {
  const scale = getScale(scaleId);
  const verdict = image ? canUpscale(image.w, image.h, scale.factor) : null;
  const out = image && { w: image.w * scale.factor, h: image.h * scale.factor };
  const wait = image && verdict?.ok ? humanSeconds(estimateSeconds(image.w, image.h, scale)) : null;
  const limits = inputLimits(scale.factor);

  return (
    <Section id="upscale" title={t('upscale.title')} helpKey="upscale.help">

      {SCALES.map((sc) => (
        <Choice
          key={sc.id}
          label={t(sc.labelKey)}
          note={image ? `${image.w * sc.factor}×${image.h * sc.factor}` : null}
          active={sc.id === scaleId}
          disabled={busy || running}
          onClick={() => onScale(sc.id)}
        />
      ))}

      {image && (
        verdict.ok ? (
          <p className="measure">
            {t('upscale.plan', {
              from: `${image.w}×${image.h}`,
              to: `${out.w}×${out.h}`,
              wait: `${wait.value} ${t(`common.${wait.unit}`)}`,
            })}
          </p>
        ) : (
          <p className="verdict" data-level="attenzione">
            {t(`upscale.tooBig.${verdict.reason}`, {
              side: limits.side,
              mp: Math.round(limits.pixels / 1e6),
            })}
          </p>
        )
      )}

      {running ? (
        <button className="btn ghost small" onClick={onStop}>
          {t('upscale.stop')}
        </button>
      ) : (
        <button className="btn ghost small" disabled={busy || !image || !verdict?.ok} onClick={onRun}>
          {t('upscale.run')}
        </button>
      )}
    </Section>
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
