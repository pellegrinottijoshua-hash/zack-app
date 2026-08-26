import { useState } from 'react';
import { t } from '../i18n/index.js';
import { Choice, Help } from './Panels.jsx';
import Section from './Section.jsx';
import { PRESETS } from '../engine/export.js';
import { isEmptyPlan } from '../engine/batch.js';

/**
 * Le operazioni in blocco.
 *
 * Non è uno strumento nuovo: è ciò che rende utili quelli che ci sono già.
 * Scontornare quaranta file uno per uno è il lavoro che nessuno vuole fare.
 */
export default function BatchPanel({ files, batch, onPickFiles, onClearFiles, onFix }) {
  const [opts, setOpts] = useState({
    cutout: true,
    upscale: true,
    vector: false,
    exportPresets: ['gelato-front-350'],
  });

  const togglePreset = (id) =>
    setOpts((o) => ({
      ...o,
      exportPresets: o.exportPresets.includes(id)
        ? o.exportPresets.filter((p) => p !== id)
        : [...o.exportPresets, id],
    }));

  const { done, failed, total, ratio } = batch.summary;
  const nothingToDo = isEmptyPlan(opts);

  return (
    /* Come ogni altro gruppo di comandi: si chiude per dare spazio alla tela.
       Era l'ultimo pannello rimasto fuori dalla regola, e con quaranta file
       dentro era anche il più lungo — cioè quello che il lavoro copriva di
       più. Il conteggio resta sull'intestazione: chiusa, la sezione dice
       comunque quanti file ha in coda. */
    <Section
      id="batch"
      title={t('batch.title')}
      badge={files.length ? t('batch.count', { n: files.length }) : t('batch.none')}
      helpKey="batch.help"
    >
      <div className="row">
        <button className="btn ghost small" disabled={batch.running} onClick={onPickFiles}>
          {t('batch.pick')}
        </button>
        {files.length > 0 && (
          <button className="btn ghost small" disabled={batch.running} onClick={onClearFiles}>
            {t('batch.clear')}
          </button>
        )}
      </div>

      {files.length > 0 && (
        <>
          <Choice
            label={t('tool.cutout.label')}
            active={opts.cutout}
            disabled={batch.running}
            onClick={() => setOpts((o) => ({ ...o, cutout: !o.cutout }))}
          />
          <Choice
            label={t('batch.upscale')}
            note={t('batch.upscaleNote')}
            active={opts.upscale}
            disabled={batch.running}
            onClick={() => setOpts((o) => ({ ...o, upscale: !o.upscale }))}
          />
          <Choice
            label={t('tool.vector.label')}
            active={opts.vector}
            disabled={batch.running}
            onClick={() => setOpts((o) => ({ ...o, vector: !o.vector }))}
          />

          <span className="label" style={{ marginTop: 6 }}>
            <span>{t('control.format.label')}</span>
          </span>
          {PRESETS.map((p) => (
            <Choice
              key={p.id}
              label={p.label}
              active={opts.exportPresets.includes(p.id)}
              disabled={batch.running}
              onClick={() => togglePreset(p.id)}
            />
          ))}

          {batch.running ? (
            <>
              <div className="batch-bar" role="progressbar" aria-valuenow={Math.round(ratio * 100)}>
                <span style={{ width: `${ratio * 100}%` }} />
              </div>
              <p className="help">
                {t('batch.progress', { done: done + failed, total })}
                {batch.eta != null && ` · ${t('batch.eta', { sec: batch.eta })}`}
              </p>
              {batch.current && (
                <p className="help">{batch.current.file?.name}</p>
              )}
              <button className="btn ghost small" onClick={batch.stop}>
                {t('batch.stop')}
              </button>
            </>
          ) : (
            <button
              className="btn"
              disabled={nothingToDo}
              onClick={() => batch.run(files, opts)}
            >
              {t('batch.start', { n: files.length })}
            </button>
          )}

          {!batch.running && total > 0 && (
            <p className="help">
              {t('batch.doneMsg', { done, total })}
              {failed > 0 && ` · ${t('batch.failed', { n: failed })}`}
            </p>
          )}

          {/* Su quaranta file il modello ne sbaglia qualcuno, e trovarli poi
              nell'archivio significa cercarli. Qui stanno già in fila, e ci si
              apre sopra il pennello con l'originale accanto. */}
          {!batch.running && batch.results.length > 0 && onFix && (
            <div className="field">
              <span className="label">
                <span>{t('batch.fixTitle')}</span>
                <b>{t('batch.count', { n: batch.results.length })}</b>
              </span>
              <Help k="batch.fixHelp" />
              <ul className="batch-results">
                {batch.results.map((r, i) => (
                  <li key={`${r.file.name}-${i}`}>
                    <button onClick={() => onFix(r)} title={t('batch.fix')}>
                      <img src={URL.createObjectURL(r.blob)} alt="" loading="lazy" />
                      <span>{r.file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
