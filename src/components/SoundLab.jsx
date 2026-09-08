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
export default function SoundLab({
  sound,
  onSave,
  /* La voce: la frase scritta in basso, e la ricetta gia' fusa coi filtri che
     il tasto ha impostato. Arrivano da `App.jsx` perche' il tasto Zack vive
     nell'impianto: se lo stato stesse qui, il tasto non potrebbe toccarlo. */
  descrizione = '',
  onDescrizione,
  ricettaVoce,
  onSalvaLavorata,
}) {
  const [scelto, setScelto] = useState(FAMIGLIE[0].id);
  const [param, setParam] = useState({ ...FAMIGLIE[0].param });
  const [durata, setDurata] = useState(FAMIGLIE[0].durata);
  const [seme, setSeme] = useState(1);
  const [suonando, setSuonando] = useState(false);
  const [lavorando, setLavorando] = useState(false);

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

  /**
   * La voce con i filtri addosso: e' il gesto per cui il servizio esiste.
   *
   * `sound.apply` sapeva farlo dal principio e NESSUNO lo chiamava — sei
   * ricette scritte, provate e irraggiungibili. Senza questa funzione la
   * frase dell'utente si fermava sullo schermo: i numeri si muovevano e il
   * suono restava identico.
   */
  async function ascoltaVoce() {
    setLavorando(true);
    try {
      const out = await sound.apply(ricettaVoce);
      if (!out) return;
      await sound.suona(out.buffer.getChannelData(0), out.buffer.sampleRate);
    } finally {
      setLavorando(false);
    }
  }

  return (
    <div className="sound">
      {/* La voce sta in ALTO, sopra tutto il resto: contratto UX § 7.3. E' la
          cosa su cui si sta lavorando, e il resto sono i comandi che la
          toccano. */}
      {sound.clip && (
        <div className="voce">
          <audio className="voce-onda" src={sound.clip.url} controls preload="metadata" />
          <div className="voce-azioni">
            <button className="btn" disabled={lavorando} onClick={ascoltaVoce}>
              {lavorando ? t('sound.suona') : t('sound.ascolta')}
            </button>
            <button className="btn" disabled={lavorando} onClick={onSalvaLavorata}>
              {t('sound.salva')}
            </button>
          </div>
        </div>
      )}

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

      {/* Un codice non e' un messaggio: qui usciva «mic-denied» a schermo,
          mentre `sound.micDenied` era scritto in due lingue e non lo chiamava
          nessuno. */}
      {sound.error && (
        <p className="alert">
          {sound.error === 'mic-denied' ? t('sound.micDenied') : t('sound.illeggibile')}
        </p>
      )}

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

      {/* La descrizione in BASSO, contratto UX § 7.3: si scrive dopo aver
          ascoltato, non prima. Il tasto Zack la legge col dizionario locale —
          niente AI, e se non conosce una parola lo dice. */}
      {onDescrizione && (
        <label className="voce-descrizione">
          <span>{t('sound.descrivi')}</span>
          <input
            type="text"
            value={descrizione}
            placeholder={t('sound.descriviAiuto')}
            onChange={(e) => onDescrizione(e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
