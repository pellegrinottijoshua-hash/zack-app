import { t } from '../i18n/index.js';

/**
 * Scegli un asset dalla libreria e mettilo sulla tela.
 *
 * Era un **cassetto fisso** a sinistra della tela di Brain, e il committente
 * il 2026-09-09 l'ha barrato insieme al resto: *«quando devo lavorare devo
 * avere solo le icone che ho messo visibili, deve essere una mappa
 * concettuale»*.
 *
 * Ma toglierlo e basta avrebbe chiuso l'unica strada per mettere sulla tela un
 * asset che hai già — e quella strada serve. Quindi è diventato un **momento**:
 * si apre dal `+`, si sceglie, si chiude. Come il menu del `+` e come l'ovale
 * del punto oro, che sono momenti anche loro.
 */
export default function ScegliAsset({ assets, tuttiSulPiano, onScegli, onChiudi }) {
  return (
    <div className="scegli-asset">
      <div className="scegli-testa">
        <h3>{t('brain.drawer')}</h3>
        <button className="btn ghost small" onClick={onChiudi} aria-label={t('bar.clear')}>
          ×
        </button>
      </div>

      {/* Due vuoti diversi: «non hai ancora salvato niente» e «sono già tutti
          sulla tela» sono situazioni opposte, e dire la seconda a chi si trova
          nella prima lo lascia a cercare un archivio che non esiste. */}
      {assets.length === 0 ? (
        <p className="brain-vuoto">
          {tuttiSulPiano ? t('brain.drawerEmpty') : t('brain.libraryEmpty')}
        </p>
      ) : (
        <div className="brain-elenco">
          {assets.map((a) => (
            <button key={a.id} className="brain-chip" title={a.name} onClick={() => onScegli(a)}>
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
