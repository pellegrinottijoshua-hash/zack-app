import { useState } from 'react';
import { t } from '../i18n/index.js';
import { pool, livelloSpazio, pesoLeggibile, POOL_VISIBILI } from '../engine/archivio.js';

/**
 * La pool di Brain (fase 5a, T4 + P1): una lente sull'archivio, non una
 * scatola. I file dal più recente, 20 per volta, e si continua indietro nel
 * tempo fino al primo; la ricerca guarda nome, nota e tag (P2).
 *
 * Ha preso il posto di `ScegliAsset`: lo stesso momento — si apre, si sceglie,
 * si chiude — ma ordinato per data e con la ricerca, perché con quaranta file
 * si scorre e con quattrocento si cerca.
 */
export default function Pool({ assets, tuttiSulPiano, usage, onScegli, onChiudi }) {
  const [cerca, setCerca] = useState('');
  const [quanti, setQuanti] = useState(POOL_VISIBILI);
  const { mostrati, restano } = pool(assets, { cerca, quanti });
  const spazio = livelloSpazio(usage);

  return (
    <div className="scegli-asset pool">
      <div className="scegli-testa">
        <h3>{t('brain.pool.title')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      <input
        className="pool-cerca"
        type="search"
        value={cerca}
        onChange={(e) => {
          setCerca(e.target.value);
          setQuanti(POOL_VISIBILI);
        }}
        placeholder={t('brain.pool.cerca')}
        aria-label={t('brain.pool.cerca')}
      />

      {/* Lo spazio si dice solo quando serve, e con la misura: dove non c'è
          una misura non c'è un avviso. */}
      {(spazio === 'attento' || spazio === 'pieno') && (
        <p className="pool-spazio" role="status">
          {t(`brain.spazio.${spazio}`, { usato: pesoLeggibile(usage.used), quota: pesoLeggibile(usage.quota) })}
        </p>
      )}

      {assets.length === 0 ? (
        <p className="brain-vuoto">{tuttiSulPiano ? t('brain.drawerEmpty') : t('brain.libraryEmpty')}</p>
      ) : mostrati.length === 0 ? (
        <p className="brain-vuoto">{t('brain.pool.niente')}</p>
      ) : (
        <div className="brain-elenco">
          {mostrati.map((a) => (
            <button key={a.id} className="brain-chip" title={a.name} onClick={() => onScegli(a)}>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {restano > 0 && (
        <button className="btn ghost small" onClick={() => setQuanti((q) => q + POOL_VISIBILI)}>
          {t('brain.pool.altri', { n: Math.min(restano, POOL_VISIBILI) })}
        </button>
      )}
    </div>
  );
}
