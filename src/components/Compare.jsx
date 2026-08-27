import { useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * Before/after wipe. With no `after` yet it simply shows the original, so the
 * same component covers "loaded" and "processed".
 */
export default function Compare({ before, after, busy, busyNote, quanto, labels }) {
  const [split, setSplit] = useState(50);
  const hasAfter = Boolean(after);

  return (
    <div className="plate" style={{ '--split': `${hasAfter ? split : 100}%` }}>
      {hasAfter && <img className="after" src={after} alt={labels?.[1] || t('result.after')} />}
      <img className={hasAfter ? 'before' : ''} src={before} alt={labels?.[0] || t('result.before')} />

      {hasAfter && (
        <>
          <div className="handle" />
          <span className="tag l">{labels?.[0] || t('result.before')}</span>
          <span className="tag r">{labels?.[1] || t('result.after')}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={split}
            aria-label={t('result.compare')}
            onChange={(e) => setSplit(Number(e.target.value))}
          />
        </>
      )}

      {busy && (
        <div className="scanner">
          {/* La barra si riempie davvero quando sappiamo quanto manca, e
              striscia quando non lo sappiamo. Sono due informazioni diverse e
              devono sembrare diverse: su un'attesa di ottanta secondi una
              barra che striscia sempre uguale è indistinguibile da un blocco.
              Il numero resta scritto sotto — la barra non è mai l'unico
              segnale. */}
          <div
            className="bar"
            data-quanto={Number.isFinite(quanto) || undefined}
            style={Number.isFinite(quanto) ? { '--quanto': `${Math.round(quanto * 100)}%` } : undefined}
            role={Number.isFinite(quanto) ? 'progressbar' : undefined}
            aria-valuenow={Number.isFinite(quanto) ? Math.round(quanto * 100) : undefined}
          />
          <p>{busy}</p>
          {busyNote && <small>{busyNote}</small>}
        </div>
      )}
    </div>
  );
}
