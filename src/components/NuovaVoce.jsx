import { useState } from 'react';
import { t, getLang } from '../i18n/index.js';
import { formatEuro } from '../engine/ledger.js';
import { CONSENSO, consensoNonValido } from '../engine/voci.js';
import { DESCRIZIONE_MAX, descrizioneNonValida, nomeVoceNonValido } from '../engine/listinoVoce.js';

/**
 * Una voce nuova (fetta 6b): **descrivila** (ElevenLabs ne disegna tre, ne
 * tieni una) o **clonala** (dalla registrazione sul piano, col consenso).
 *
 * Il pannello tiene solo il modulo; i soldi e il salvataggio li fa App, con
 * le stesse regole di Immagine: il prezzo prima del tasto, il rimborso detto.
 * Finché una misura manca, il suo tasto è spento e lo si dice.
 */
export default function NuovaVoce({
  prezzoDisegno,
  prezzoClonazione,
  haCampione,
  busy,
  onDisegna,
  onTieni,
  onClona,
  onChiudi,
}) {
  const [modo, setModo] = useState('descrivi');
  const [descrizione, setDescrizione] = useState('');
  const [anteprime, setAnteprime] = useState([]);
  const [scelta, setScelta] = useState(null);
  const [nome, setNome] = useState('');
  const [consenso, setConsenso] = useState({ scelta: null, chiParla: '' });
  const lang = getLang();

  const prezzo = (p) =>
    p === null ? <p className="preventivo">{t('voce.nuova.nonMisurato')}</p> : (
      <p className="preventivo"><strong>{formatEuro(p, lang)}</strong></p>
    );

  const nomeOk = !nomeVoceNonValido(nome);

  return (
    <div className="scegli-asset nuova-voce">
      <div className="scegli-testa">
        <h3>{t('voce.nuova.titolo')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      <div className="nuova-voce-modi" role="group" aria-label={t('voce.nuova.titolo')}>
        {['descrivi', 'clona'].map((m) => (
          <button key={m} className="chip" aria-pressed={modo === m} onClick={() => setModo(m)}>
            {t(`voce.nuova.${m}`)}
          </button>
        ))}
      </div>

      {modo === 'descrivi' ? (
        <>
          <textarea
            className="immagine-prompt"
            value={descrizione}
            maxLength={DESCRIZIONE_MAX}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder={t('voce.nuova.descrizione')}
            aria-label={t('voce.nuova.descrizione')}
            disabled={Boolean(busy)}
          />
          {prezzo(prezzoDisegno)}
          <button
            className="btn"
            disabled={Boolean(busy) || prezzoDisegno === null || Boolean(descrizioneNonValida(descrizione))}
            onClick={async () => {
              const fatte = await onDisegna(descrizione);
              if (fatte?.length) {
                setAnteprime(fatte);
                setScelta(fatte[0].id);
              }
            }}
          >
            {t('voce.nuova.fammiSentire')}
          </button>
          {anteprime.length > 0 && (
            <>
              <ul className="nuova-voce-anteprime">
                {anteprime.map((a, i) => (
                  <li key={a.id}>
                    <button className="chip" aria-pressed={scelta === a.id} onClick={() => setScelta(a.id)}>
                      {t('voce.nuova.anteprima', { n: i + 1 })}
                    </button>
                    <audio src={`data:${a.mime};base64,${a.dati}`} controls aria-label={t('voce.nuova.anteprima', { n: i + 1 })} />
                  </li>
                ))}
              </ul>
              <input
                className="nuova-voce-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={t('voce.nuova.nome')}
                aria-label={t('voce.nuova.nome')}
              />
              <button
                className="btn"
                disabled={Boolean(busy) || !nomeOk || !scelta}
                onClick={() => onTieni({ anteprima: scelta, nome, descrizione })}
              >
                {t('voce.nuova.tieni')}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {/* La dichiarazione PRIMA di tutto (§2.4): senza, il tasto non parte. */}
          <fieldset className="nuova-voce-consenso">
            <legend>{t('voce.nuova.consenso')}</legend>
            <label>
              <input
                type="radio"
                name="consenso"
                checked={consenso.scelta === 'mia'}
                onChange={() => setConsenso({ scelta: 'mia', chiParla: '' })}
              />
              {CONSENSO.mia}
            </label>
            <label>
              <input
                type="radio"
                name="consenso"
                checked={consenso.scelta === 'permesso'}
                onChange={() => setConsenso((c) => ({ ...c, scelta: 'permesso' }))}
              />
              {CONSENSO.permesso.replace('{nome}', consenso.chiParla.trim() || '…')}
            </label>
            {consenso.scelta === 'permesso' && (
              <input
                className="nuova-voce-nome"
                value={consenso.chiParla}
                onChange={(e) => setConsenso((c) => ({ ...c, chiParla: e.target.value }))}
                placeholder={t('voce.nuova.chiParla')}
                aria-label={t('voce.nuova.chiParla')}
              />
            )}
            <p className="nuova-voce-nota">{CONSENSO.nota}</p>
          </fieldset>
          <p className="nuova-voce-nota">{haCampione ? t('voce.nuova.campioneSi') : t('voce.nuova.campioneNo')}</p>
          <input
            className="nuova-voce-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t('voce.nuova.nome')}
            aria-label={t('voce.nuova.nome')}
          />
          {prezzo(prezzoClonazione)}
          <button
            className="btn"
            disabled={
              Boolean(busy) || prezzoClonazione === null || !haCampione || !nomeOk || Boolean(consensoNonValido(consenso))
            }
            onClick={() => onClona({ nome, consenso })}
          >
            {t('voce.nuova.clona')}
          </button>
        </>
      )}
    </div>
  );
}
