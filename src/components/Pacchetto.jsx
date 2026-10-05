import { useEffect, useRef, useState } from 'react';
import { t, getLang } from '../i18n/index.js';
import { FAMIGLIE, cercaEffetti, nomeEffetto } from '../engine/pacchetto.js';
import { DURATE_EFFETTO, EFFETTO_DESCRIZIONE_MAX, effettoNonValido } from '../engine/listinoVoce.js';
import { formatEuro } from '../engine/ledger.js';

/**
 * Il pacchetto di effetti (fase 7b): sfoglia, ascolta, prendi.
 *
 * Le famiglie sono chip, la ricerca guarda il nome in tutt'e due le lingue.
 * Un tocco sul nome lo fa sentire — un lettore solo per tutto il pannello,
 * non centocinquanta `<audio>` — e «prendi» lo consegna come risultato:
 * l'icona output lo porta in Brain o nel pocket.
 *
 * «Inventane uno» (7c) è la seconda scheda: una descrizione e una durata, a
 * crediti. Finché la misura manca, il tasto è spento e lo si dice.
 */
export default function Pacchetto({ onPrendi, onChiudi, prezzoInventa, onInventa, busy }) {
  const [scheda, setScheda] = useState('pacchetto');
  const [descrizione, setDescrizione] = useState('');
  const [durata, setDurata] = useState(DURATE_EFFETTO[1]);
  const prezzo = prezzoInventa(durata);
  const [famiglia, setFamiglia] = useState(null);
  const [testo, setTesto] = useState('');
  const [suona, setSuona] = useState(null);
  const lettore = useRef(null);
  const lang = getLang();
  const elenco = cercaEffetti({ famiglia, testo });

  useEffect(() => () => lettore.current?.pause(), []);

  function ascolta(e) {
    lettore.current?.pause();
    const a = new Audio(`/${e.file}`);
    lettore.current = a;
    setSuona(e.id);
    a.onended = () => setSuona((x) => (x === e.id ? null : x));
    a.play().catch(() => setSuona(null));
  }

  return (
    <div className="scegli-asset pacchetto">
      <div className="scegli-testa">
        <h3>{t('effetti.pacchetto.titolo')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      <div className="nuova-voce-modi" role="group" aria-label={t('effetti.pacchetto.titolo')}>
        {['pacchetto', 'inventa'].map((m) => (
          <button key={m} className="chip" aria-pressed={scheda === m} onClick={() => setScheda(m)}>
            {t(`effetti.${m === 'pacchetto' ? 'pacchetto.titolo' : 'inventa.titolo'}`)}
          </button>
        ))}
      </div>

      {scheda === 'inventa' ? (
        <>
          <textarea
            className="immagine-prompt"
            value={descrizione}
            maxLength={EFFETTO_DESCRIZIONE_MAX}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder={t('effetti.inventa.descrizione')}
            aria-label={t('effetti.inventa.descrizione')}
            disabled={Boolean(busy)}
          />
          <div className="pacchetto-famiglie" role="group" aria-label={t('effetti.inventa.durata')}>
            {DURATE_EFFETTO.map((d) => (
              <button key={d} className="chip" aria-pressed={durata === d} onClick={() => setDurata(d)}>
                {t('effetti.inventa.secondi', { n: d })}
              </button>
            ))}
          </div>
          {prezzo === null ? (
            <p className="preventivo">{t('effetti.inventa.nonMisurato')}</p>
          ) : (
            <p className="preventivo"><strong>{formatEuro(prezzo, getLang())}</strong></p>
          )}
          <button
            className="btn"
            disabled={Boolean(busy) || prezzo === null || Boolean(effettoNonValido({ descrizione, durata }))}
            onClick={() => onInventa({ descrizione, durata })}
          >
            {t('effetti.inventa.vai')}
          </button>
        </>
      ) : (
        <>
          <input
            className="nuova-voce-nome"
            type="search"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder={t('effetti.pacchetto.cerca')}
            aria-label={t('effetti.pacchetto.cerca')}
          />

          <div className="pacchetto-famiglie" role="group" aria-label={t('effetti.pacchetto.titolo')}>
            <button className="chip" aria-pressed={famiglia === null} onClick={() => setFamiglia(null)}>
              {t('effetti.pacchetto.tutti')}
            </button>
            {FAMIGLIE.map((f) => (
              <button key={f} className="chip" aria-pressed={famiglia === f} onClick={() => setFamiglia(f)}>
                {t(`effetti.pacchetto.famiglia.${f}`)}
              </button>
            ))}
          </div>

          {elenco.length === 0 ? (
            <p className="brain-vuoto">{t('effetti.pacchetto.nessuno')}</p>
          ) : (
            <ul className="pacchetto-elenco">
              {elenco.map((e) => (
                <li key={e.id}>
                  <button
                    className="pacchetto-ascolta"
                    aria-pressed={suona === e.id}
                    aria-label={t('effetti.pacchetto.ascolta', { nome: nomeEffetto(e, lang) })}
                    onClick={() => ascolta(e)}
                  >
                    <span aria-hidden="true">{suona === e.id ? '■' : '▶'}</span> {nomeEffetto(e, lang)}
                    <span className="pacchetto-durata">{e.durata.toFixed(1)} s</span>
                  </button>
                  <button className="btn ghost small" onClick={() => onPrendi(e)}>
                    {t('effetti.pacchetto.prendi')}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="nuova-voce-nota">{t('effetti.pacchetto.crediti')}</p>
        </>
      )}
    </div>
  );
}
