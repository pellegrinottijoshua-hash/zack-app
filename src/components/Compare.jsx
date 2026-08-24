import { useState } from 'react';

/**
 * Before/after wipe. With no `after` yet it simply shows the original, so the
 * same component covers "loaded" and "processed".
 */
export default function Compare({ before, after, busy, busyNote, labels }) {
  const [split, setSplit] = useState(50);
  const hasAfter = Boolean(after);

  return (
    <div className="plate" style={{ '--split': `${hasAfter ? split : 100}%` }}>
      {hasAfter && <img className="after" src={after} alt={labels?.[1] || 'Risultato'} />}
      <img className={hasAfter ? 'before' : ''} src={before} alt={labels?.[0] || 'Originale'} />

      {hasAfter && (
        <>
          <div className="handle" />
          <span className="tag l">{labels?.[0] || 'originale'}</span>
          <span className="tag r">{labels?.[1] || 'risultato'}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={split}
            aria-label="Confronta prima e dopo"
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
