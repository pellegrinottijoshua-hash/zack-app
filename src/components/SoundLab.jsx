import { useState } from 'react';
import { t } from '../i18n/index.js';
import { RECIPES } from '../engine/sound.js';

/**
 * Il laboratorio dei suoni.
 *
 * Registri, scegli una ricetta, esce un altro suono. Niente modelli, niente
 * attesa, niente costo: è la tua voce passata attraverso dei filtri.
 */
export default function SoundLab({ sound, onSave }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(null);

  const applica = async (recipe) => {
    setBusy(recipe.id);
    try {
      const out = await sound.apply(recipe.id);
      if (out) {
        if (result?.url) URL.revokeObjectURL(result.url);
        setResult({ ...out, url: URL.createObjectURL(out.blob), recipe });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="soundlab">
      <div className="sl-rec">
        {sound.recording ? (
          <button className="btn" onClick={sound.stop}>
            <span className="rec-dot" aria-hidden="true" />
            {t('sound.stop')}
          </button>
        ) : (
          <button className="btn" onClick={sound.start}>
            {sound.clip ? t('sound.again') : t('sound.record')}
          </button>
        )}

        {sound.clip && !sound.recording && (
          <audio controls src={sound.clip.url} className="sl-player" />
        )}
      </div>

      {sound.error === 'mic-denied' && <p className="alert">{t('sound.micDenied')}</p>}

      {sound.rhythm && (
        <p className="help">
          {t('sound.heard', {
            n: sound.rhythm.count,
            bpm: sound.rhythm.bpm ?? '—',
          })}
        </p>
      )}

      {sound.clip && (
        <div className="sl-recipes">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              className="opt"
              aria-pressed={result?.recipe?.id === r.id}
              disabled={Boolean(busy)}
              onClick={() => applica(r)}
            >
              {t(r.labelKey)}
              <span className="note">{t(r.hintKey)}</span>
            </button>
          ))}
        </div>
      )}

      {result && (
        <div className="sl-result">
          <audio controls src={result.url} />
          <div className="row">
            <button className="btn small" onClick={() => onSave(result.blob, result.recipe)}>
              {t('sound.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
