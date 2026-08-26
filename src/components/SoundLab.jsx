import { useState } from 'react';
import { t } from '../i18n/index.js';
import { FAMIGLIE, famiglia, genera, suRitmo, SR } from '../engine/synth.js';
import Icon from './Icon.jsx';

/**
 * Il laboratorio dei suoni.
 *
 * Il gesto completo, in quattro mosse: **scegli un effetto → regoli →
 * ascolti → esporti**. E se hai battuto un ritmo con la voce, l'effetto lo
 * segue: «tum tum tum» diventa passi di gigante.
 *
 * Gli effetti si **sintetizzano**, non si scaricano: un whoosh è rumore
 * filtrato con un inviluppo, non un file da cercare in una libreria. Per
 * questo il servizio resta gratuito — non c'è nessun modello dietro, c'è la
 * fisica, e la matematica sta in `engine/synth.js` dove i test la vedono.
 *
 * Le manopole sono quattro al massimo per famiglia. Un sintetizzatore vero ne
 * ha quaranta, e chi apre questo pannello non vuole diventare un fonico:
 * vuole un tonfo per la sua clip.
 */
export default function SoundLab({ sound, onSave }) {
  const [scelto, setScelto] = useState(FAMIGLIE[0].id);
  const [param, setParam] = useState({ ...FAMIGLIE[0].param });
  const [durata, setDurata] = useState(FAMIGLIE[0].durata);
  const [seme, setSeme] = useState(1);
  const [suonando, setSuonando] = useState(false);

  const f = famiglia(scelto);
  const ritmo = sound.rhythm?.onsets?.length ? sound.rhythm.onsets : null;

  function scegli(id) {
    const nuova = famiglia(id);
    setScelto(id);
    setParam({ ...nuova.param });
    setDurata(nuova.durata);
  }

  /** Il suono di adesso: le manopole più, se c'è, il ritmo battuto. */
  function costruisci() {
    const colpo = genera(scelto, { param, durata, seme });
    return ritmo ? suRitmo(colpo, ritmo) : colpo;
  }

  async function ascolta() {
    setSuonando(true);
    try {
      await sound.suona(costruisci(), SR);
    } finally {
      setSuonando(false);
    }
  }

  return (
    <div className="sound">
      <div className="sound-famiglie">
        {FAMIGLIE.map((x) => (
          <button
            key={x.id}
            className="btn"
            aria-pressed={x.id === scelto}
            onClick={() => scegli(x.id)}
          >
            <Icon name="wave" draw />
            {t(`sound.fam.${x.id}`)}
          </button>
        ))}
      </div>

      <div className="sound-manopole">
        {Object.keys(f.param).map((k) => (
          <label key={k} className="sound-manopola">
            <span>{t(`sound.par.${k}`)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={param[k]}
              onChange={(e) => setParam((p) => ({ ...p, [k]: Number(e.target.value) }))}
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
            value={durata}
            onChange={(e) => setDurata(Number(e.target.value))}
          />
        </label>

        {/* Un altro suono della stessa famiglia. Lo stesso seme dà sempre lo
            stesso suono, quindi «un altro» è un numero che cambia — non un
            dado nascosto che rende irripetibile ciò che hai appena trovato. */}
        <button className="btn ghost" onClick={() => setSeme((s) => s + 1)}>
          {t('sound.altro')}
        </button>
      </div>

      {/* Il ponte con la voce: il ritmo battuto diventa la posizione delle
          copie. È il gesto per cui il laboratorio esiste. */}
      <div className="sound-ritmo">
        {sound.recording ? (
          <button className="btn" onClick={sound.stop}>
            {t('sound.stopRec')}
          </button>
        ) : (
          <button className="btn ghost" onClick={sound.start}>
            {t('sound.rec')}
          </button>
        )}
        <span className="sound-nota">
          {ritmo ? t('sound.ritmoTrovato', { n: ritmo.length }) : t('sound.ritmoNiente')}
        </span>
        {ritmo && (
          <button className="btn ghost small" onClick={sound.reset}>
            {t('sound.scordaRitmo')}
          </button>
        )}
      </div>

      {sound.error && <p className="alert">{sound.error}</p>}

      <div className="sound-azioni">
        <button className="btn" disabled={suonando} onClick={ascolta}>
          {suonando ? t('sound.suona') : t('sound.ascolta')}
        </button>
        <button
          className="btn"
          onClick={() => onSave(sound.comeFile(costruisci(), SR), { id: scelto })}
        >
          {t('sound.salva')}
        </button>
      </div>
    </div>
  );
}
