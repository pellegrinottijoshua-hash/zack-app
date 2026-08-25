import { useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * Before/after wipe. With no `after` yet it simply shows the original, so the
 * same component covers "loaded" and "processed".
 */
export default function Compare({ before, after, busy, busyNote, labels }) {
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
          <div className="bar" />
          <p>{busy}</p>
          {busyNote && <small>{busyNote}</small>}
        </div>
      )}
    </div>
  );
}
