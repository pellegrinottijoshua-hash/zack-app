import { t } from '../i18n/index.js';

/**
 * Le azioni che si possono fare su un lavoro, mostrate sul lavoro stesso.
 *
 * Fino a ora il flusso era: scegli lo strumento, poi il file. È l'opposto di
 * come si pensa — si guarda una cosa e ci si chiede cosa farne. Qui le azioni
 * vanno all'asset, e quelle che non hanno senso non compaiono affatto: un
 * comando spento è una domanda senza risposta.
 */
export default function AssetActions({ item, onCutout, onVector, onEdit, onReference }) {
  const isRaster = item.kind === 'png';
  const isVector = item.kind === 'svg';

  return (
    <div className="asset-actions" onClick={(e) => e.stopPropagation()}>
      <span className="aa-title">{t('actions.title')}</span>
      {isRaster && (
        <>
          <button onClick={() => onCutout(item)}>{t('actions.cutout')}</button>
          <button onClick={() => onVector(item)}>{t('actions.vector')}</button>
        </>
      )}
      {isVector && <button onClick={() => onEdit(item)}>{t('actions.edit')}</button>}
      <button
        className="primary"
        title={t('actions.referenceHelp')}
        onClick={() => onReference(item)}
      >
        {t('actions.reference')}
      </button>
    </div>
  );
}
