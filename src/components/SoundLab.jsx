import { t } from '../i18n/index.js';
import { famiglia } from '../engine/synth.js';
import Registrazione from './Registrazione.jsx';

/**
 * Il laboratorio degli effetti sonori.
 *
 * Gli effetti si **sintetizzano**, non si scaricano: un whoosh è rumore
 * filtrato con un inviluppo, non un file da cercare in una libreria. Per
 * questo il servizio resta gratuito — non c'è nessun modello dietro, c'è la
 * fisica, e la matematica sta in `engine/synth.js` dove i test la vedono.
 *
 * Le manopole sono quattro al massimo per famiglia. Un sintetizzatore vero ne
 * ha quaranta, e chi apre questo pannello non vuole diventare un fonico:
 * vuole un tonfo per la sua clip.
 *
 * Qui restano **solo le manopole**. La famiglia si sceglie nel punto oro,
 * ascoltare è il tasto Zack, e «un altro così», il ritmo e il salvataggio
 * sono i cerchi dell'impianto: erano tutti comandi dentro la tela, e la tela
 * dell'impianto è vuota per contratto (§ 5.4).
 */
export default function SoundLab({ effetto, onEffetto, ritmo, registrando, errore, onScordaRitmo, onFermaRitmo }) {
  const f = famiglia(effetto.famiglia);
  const cambia = (dentro) => onEffetto({ ...effetto, ...dentro });

  // Stessa ragione del Vocale: si batte il ritmo, e si deve poterlo fermare.
  if (registrando) {
    return <Registrazione onFerma={onFermaRitmo} aiuto={t('sound.battiOra')} />;
  }

  return (
    <div className="sound">
      <div className="sound-manopole">
        {Object.keys(f.param).map((k) => (
          <label key={k} className="sound-manopola">
            <span>{t(`sound.par.${k}`)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effetto.param[k] ?? f.param[k]}
              onChange={(e) => cambia({ param: { ...effetto.param, [k]: Number(e.target.value) } })}
            />
          </label>
        ))}

        <label className="sound-manopola">
          <span>{t('sound.par.durata')}</span>
          <input
            type="range"
            min="0.05"
            max="4"
            step="0.05"
            value={effetto.durata}
            onChange={(e) => cambia({ durata: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Il ponte con la voce: il ritmo battuto diventa la posizione delle
          copie. È il gesto per cui il laboratorio esiste — e il microfono qui
          serve a QUESTO, non a registrare la materia. */}
      <div className="sound-ritmo">
        <span className="sound-nota">
          {ritmo ? t('sound.ritmoTrovato', { n: ritmo.length }) : t('sound.ritmoNiente')}
        </span>
        {ritmo && (
          <button className="btn ghost small" onClick={onScordaRitmo}>
            {t('sound.scordaRitmo')}
          </button>
        )}
      </div>

      {errore && (
        <p className="alert">
          {errore === 'mic-denied' ? t('sound.micDenied') : t('sound.illeggibile')}
        </p>
      )}
    </div>
  );
}
