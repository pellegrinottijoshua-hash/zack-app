import { useState } from 'react';

/**
 * Before/after wipe. When there is no `after` yet we just show the original,
 * so the same component covers "loaded" and "cut out".
 */
export default function Compare({ before, after, busy, busyNote }) {
  const [split, setSplit] = useState(50);
  const hasAfter = Boolean(after);

  return (
    <div className="plate" style={{ '--split': `${hasAfter ? split : 100}%` }}>
      {hasAfter && <img className="after" src={after} alt="Risultato scontornato" />}
      <img
        className={hasAfter ? 'before' : ''}
        src={before}
        alt="Immagine originale"
      />

      {hasAfter && (
        <>
          <div className="handle" />
          <span className="tag l">originale</span>
          <span className="tag r">scontornato</span>
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
