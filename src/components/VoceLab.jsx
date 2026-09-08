import { useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * Il vocale: registri una voce, o ne porti una, e la trasformi.
 *
 * **Nessun modello, nessuna API, nessun costo:** è tutta elaborazione del
 * segnale dentro Web Audio, in `hooks/useSound.js`. La ricetta di partenza si
 * sceglie nel punto oro, la frase si scrive qui sotto, e il tasto Zack le
 * unisce con `engine/dizionarioVoce.js` — che quando non conosce una parola
 * lo dice, invece di indovinare.
 *
 * Era metà di `SoundLab`, insieme al laboratorio degli effetti sintetizzati.
 * Erano due mestieri su una schermata sola: chi ha una voce da trasformare
 * non vuole sei manopole di sintesi. Divisi il 2026-09-08.
 */
export default function VoceLab({ sound, descrizione = '', onDescrizione, ricetta, onSalva }) {
  const [lavorando, setLavorando] = useState(false);

  /**
   * La voce con i filtri addosso: è il gesto per cui il servizio esiste.
   *
   * `sound.apply` sapeva farlo dal principio e nessuno lo chiamava — sei
   * ricette scritte, provate e irraggiungibili.
   */
  async function ascolta() {
    setLavorando(true);
    try {
      const out = await sound.apply(ricetta);
      if (!out) return;
      await sound.suona(out.buffer.getChannelData(0), out.buffer.sampleRate);
    } finally {
      setLavorando(false);
    }
  }

  return (
    <div className="voce-lab">
      {/* La voce sta in ALTO, sopra tutto il resto: contratto UX § 7.3. È la
          cosa su cui si lavora, e il resto sono i comandi che la toccano. */}
      {sound.clip && (
        <div className="voce">
          <audio className="voce-onda" src={sound.clip.url} controls preload="metadata" />
          <div className="voce-azioni">
            <button className="btn" disabled={lavorando} onClick={ascolta}>
              {lavorando ? t('sound.suona') : t('sound.ascolta')}
            </button>
            <button className="btn" disabled={lavorando} onClick={onSalva}>
              {t('sound.salva')}
            </button>
          </div>
        </div>
      )}

      {sound.recording && <p className="voce-registra">{t('sound.registrando')}</p>}

      {/* Un codice non è un messaggio: qui usciva «mic-denied» a schermo,
          mentre `sound.micDenied` era scritto in due lingue e non lo chiamava
          nessuno. */}
      {sound.error && (
        <p className="alert">
          {sound.error === 'mic-denied' ? t('sound.micDenied') : t('sound.illeggibile')}
        </p>
      )}

      {/* La descrizione in BASSO, contratto UX § 7.3: si scrive dopo aver
          ascoltato, non prima. */}
      <label className="voce-descrizione">
        <span>{t('sound.descrivi')}</span>
        <input
          type="text"
          value={descrizione}
          placeholder={t('sound.descriviAiuto')}
          onChange={(e) => onDescrizione(e.target.value)}
        />
      </label>
    </div>
  );
}
