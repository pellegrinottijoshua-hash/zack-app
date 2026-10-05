import { useEffect, useRef, useState } from 'react';
import { t, getLang } from '../i18n/index.js';
import { FAMIGLIE, cercaEffetti, nomeEffetto } from '../engine/pacchetto.js';

/**
 * Il pacchetto di effetti (fase 7b): sfoglia, ascolta, prendi.
 *
 * Le famiglie sono chip, la ricerca guarda il nome in tutt'e due le lingue.
 * Un tocco sul nome lo fa sentire — un lettore solo per tutto il pannello,
 * non centocinquanta `<audio>` — e «prendi» lo consegna come risultato:
 * l'icona output lo porta in Brain o nel pocket.
 */
export default function Pacchetto({ onPrendi, onChiudi }) {
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
    </div>
  );
}
