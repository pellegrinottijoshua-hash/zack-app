import { useEffect, useState } from 'react';
import { t } from '../i18n/index.js';
import AssetActions from './AssetActions.jsx';
import Icon from './Icon.jsx';
import { KIND_TESTO, KIND_SENZA_ANTEPRIMA, iconaDocumento } from '../store/model.js';
import { vistaLibreria, cartelleDellaTela } from '../engine/prompt.js';
import { POOL_VISIBILI } from '../engine/archivio.js';

const size = (n) => {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`; // un SVG pulito può essere di poche centinaia di byte
};

/** Anteprima da un file su disco privato: l'URL va rilasciato, o la memoria cresce. */
function Thumb({ item, read }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    let made = null;
    read(item.id)
      .then(({ file }) => {
        if (!alive) return;
        made = URL.createObjectURL(file);
        setUrl(made);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [item.id, read]);

  // Un documento non ha un'anteprima da guardare: `<img src>` su un .md
  // mostrerebbe l'icona di immagine rotta, cioè un asset che sembra
  // danneggiato quando invece sta benissimo. Al suo posto l'icona scelta,
  // che è anche il modo in cui lo si riconosce sulla tela di Brain.
  if (KIND_SENZA_ANTEPRIMA.includes(item.kind)) {
    return (
      <div className="thumb" data-doc="true">
        <Icon name={iconaDocumento(item)} />
      </div>
    );
  }

  return (
    <div className="thumb">
      {url ? <img src={url} alt={item.name} /> : <span className="none">…</span>}
    </div>
  );
}

/**
 * La striscia dei lavori: una vista di Brain (fase 5d, T6).
 *
 * Le cartelle e le moodboard di prima se ne sono andate: le cartelle sono
 * quelle di Brain (5c), e qui si vedono come filtri accanto a «tutto» e ai
 * prompt salvati. L'ordine e la ricerca sono quelli della pool — dal più
 * recente, nome, nota e tag, venti per volta — perché è lo stesso archivio
 * guardato da un'altra porta, e due porte che ordinano in modo diverso
 * sembrano due archivi.
 *
 * Tutto vive nel browser: nessun server, nessun account. Il rovescio è che
 * svuotare i dati del sito cancella l'archivio, e per questo l'avviso e il
 * pulsante di export completo sono in vista, non nascosti in un menu.
 */
export default function Library({
  store,
  tela = [],
  open,
  big,
  onToggleBig,
  onToggle,
  onOpenInEditor,
  onDownloadAll,
  onAssetAction,
}) {
  const [cerca, setCerca] = useState('');
  const [filtro, setFiltro] = useState('tutto');
  const [quanti, setQuanti] = useState(POOL_VISIBILI);
  const [tagFor, setTagFor] = useState(null);
  const [tagDraft, setTagDraft] = useState('');

  /**
   * La potatura.
   *
   * In una sessione di prova sono finiti in archivio 128 lavori e 645 MB,
   * quasi tutti scarti, e non c'era modo di sceglierne dieci e buttarli. Da
   * qui in poi si può — ma solo entrando in una modalità apposta: mettere una
   * spunta su ogni lavoro in permanenza avrebbe fatto della libreria un
   * modulo da compilare invece di un archivio da guardare.
   *
   * «Togli i doppioni» **non cancella**: seleziona. Chi sta per buttare
   * cinquanta file deve vederli prima, e vedere quanto spazio libera.
   */
  const [potatura, setPotatura] = useState(false);
  const [scelti, setScelti] = useState(() => new Set());

  const chiudiPotatura = () => {
    setPotatura(false);
    setScelti(new Set());
  };

  const commutaScelto = (id) =>
    setScelti((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(id)) dopo.delete(id);
      else dopo.add(id);
      return dopo;
    });

  const scegliDoppioni = () => {
    const ids = store.doppioni().flatMap((g) => g.scarti.map((a) => a.id));
    setScelti(new Set(ids));
  };

  const cartelle = cartelleDellaTela(tela);
  const { mostrati, restano } = vistaLibreria(store.assets, { filtro, cartelle, cerca, quanti });
  const scegliFiltro = (id) => {
    setFiltro(id);
    setQuanti(POOL_VISIBILI);
  };

  const download = async (item) => {
    const { file } = await store.read(item.id);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Rilascio differito: revocare subito annulla lo scaricamento in corso.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <section className="library" data-open={open} data-size={big ? 'grande' : 'striscia'}>
      <header className="library-head" onClick={onToggle}>
        <span className="label" style={{ letterSpacing: '0.24em' }}>
          {t('library.title')}
        </span>
        <span className="count">{store.assets.length}</span>
        <span className="hint">{open ? '▾' : '▸'}</span>
        <span className="spacer" />
        {/* Ottantasei lavori in una striscia alta 260 px sono irraggiungibili:
            si scorre di lato all'infinito e i comandi restano sotto il taglio.
            Aperta in grande, la libreria diventa una griglia che scorre in
            basso — ed è li' che si sceglie, non mentre si lavora. */}
        {open && (
          <button
            className="btn ghost small"
            aria-pressed={big}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBig();
            }}
          >
            {big ? t('library.shrink') : t('library.expand')}
          </button>
        )}
        {open && store.assets.length > 0 && (
          <button
            className="btn ghost small"
            aria-pressed={potatura}
            onClick={(e) => {
              e.stopPropagation();
              if (potatura) chiudiPotatura();
              else setPotatura(true);
            }}
          >
            {potatura ? t('prune.exit') : t('prune.enter')}
          </button>
        )}
        {store.assets.length > 0 && (
          <button
            className="btn small"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadAll();
            }}
          >
            {t('library.downloadAll.label')}
          </button>
        )}
      </header>

      <div className="library-body">
        {!store.supported ? (
          <p className="empty-strip">{t('library.unsupported')}</p>
        ) : (
          <>
            <div className="lib-filters" onClick={(e) => e.stopPropagation()}>
              <input
                className="search"
                type="search"
                placeholder={t('library.search')}
                value={cerca}
                onChange={(e) => {
                  setCerca(e.target.value);
                  setQuanti(POOL_VISIBILI);
                }}
              />

              <button className="chip" aria-pressed={filtro === 'tutto'} onClick={() => scegliFiltro('tutto')}>
                {t('library.all')}
              </button>
              <button className="chip" aria-pressed={filtro === 'prompts'} onClick={() => scegliFiltro('prompts')}>
                {t('prompt.titolo')}
              </button>
              {/* Le cartelle di Brain (5c), viste di lato: un filtro, non un
                  secondo posto dove mettere le cose. */}
              {cartelle.map((c) => (
                <button
                  key={c.id}
                  className="chip"
                  aria-pressed={filtro === c.id}
                  onClick={() => scegliFiltro(filtro === c.id ? 'tutto' : c.id)}
                >
                  <Icon name="cartella" className="folder-icon" />
                  {c.titolo || store.assets.find((a) => a.id === c.faccia)?.name || t('brain.cartella.senzaNome')}{' '}
                  <b>{c.assetIds.size}</b>
                </button>
              ))}
            </div>

            <p className="lib-note">
              {t('library.localWarning')}
              {store.usage.used != null && ` · ${size(store.usage.used)}`}
            </p>

            {potatura && (
              <div className="lib-potatura" onClick={(e) => e.stopPropagation()}>
                <p className="help">{t('prune.help')}</p>
                <button className="btn ghost small" onClick={scegliDoppioni}>
                  {t('prune.duplicates')}
                </button>
                <button
                  className="btn ghost small"
                  disabled={scelti.size === 0}
                  onClick={() => setScelti(new Set())}
                >
                  {t('prune.none')}
                </button>
                <span className="lib-potatura-conto">
                  {t('prune.selected', { n: scelti.size, peso: size(store.pesoDi(scelti)) })}
                </span>
                {/* Un solo passo di conferma, e dice **cosa** sparisce e
                    **quanto** libera: la cancellazione non si annulla, e un
                    «sei sicuro?» senza numeri non aiuta a essere sicuri. */}
                <button
                  className="btn small danger"
                  disabled={scelti.size === 0}
                  onClick={async () => {
                    const quanti = scelti.size;
                    const peso = size(store.pesoDi(scelti));
                    if (!window.confirm(t('prune.confirm', { n: quanti, peso }))) return;
                    await store.removeMany([...scelti]);
                    setScelti(new Set());
                  }}
                >
                  {t('prune.delete', { n: scelti.size })}
                </button>
              </div>
            )}

            {mostrati.length === 0 ? (
              <p className="empty-strip">{t('library.empty')}</p>
            ) : (
              <div className="strip" onClick={(e) => e.stopPropagation()}>
                {mostrati.map((item) => (
                  <figure
                    className="work"
                    key={item.id}
                    data-scelto={(potatura && scelti.has(item.id)) || undefined}
                  >
                    {potatura && (
                      <label className="work-scelta">
                        <input
                          type="checkbox"
                          checked={scelti.has(item.id)}
                          onChange={() => commutaScelto(item.id)}
                        />
                        <span className="sr-only">{item.name}</span>
                      </label>
                    )}
                    <Thumb item={item} read={store.read} />
                    <AssetActions
                      item={item}
                      onCutout={(i) => onAssetAction('cutout', i)}
                      onVector={(i) => onAssetAction('vector', i)}
                      onEdit={onOpenInEditor}
                      onReference={(i) => onAssetAction('reference', i)}
                    />
                    <figcaption>
                      <span className="kind">{item.kind}</span>
                      <br />
                      {item.name}
                      <br />
                      {size(item.bytes)}
                      {(() => {
                        const chain = store.lineageOf(item.id);
                        return chain.length > 1 ? (
                          <span className="lineage" title={chain.map((a) => a.name).join(' → ')}>
                            {t('library.lineage')} {chain[chain.length - 2].name}
                          </span>
                        ) : null;
                      })()}
                      {item.tags.length > 0 && (
                        <span className="tags">
                          {item.tags.map((tg) => (
                            <button key={tg} onClick={() => store.removeTag(item.id, tg)} title={t('library.removeTag')}>
                              {tg} ×
                            </button>
                          ))}
                        </span>
                      )}
                    </figcaption>

                    {tagFor === item.id ? (
                      <form
                        className="tag-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          store.addTag(item.id, tagDraft);
                          setTagDraft('');
                          setTagFor(null);
                        }}
                      >
                        <input
                          autoFocus
                          placeholder={t('library.newTag')}
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onBlur={() => setTagFor(null)}
                        />
                      </form>
                    ) : null}

                    <button
                      className="star"
                      aria-pressed={Boolean(item.starred)}
                      title={item.starred ? t('library.unstar') : t('library.star')}
                      onClick={() => store.toggleStar(item.id)}
                    >
                      ★
                    </button>

                    <div className="acts">
                      {/* Riprendere un lavoro è il gesto più frequente della
                          libreria e non aveva un pulsante: si passava da
                          «Scontorna», che pero' promette un'altra cosa. */}
                      {/* «Riprendi» mette il file sul piano di lavoro, che è
                          una tela per immagini: su un documento aprirebbe in
                          silenzio qualcosa che non si sa disegnare. Un .md si
                          riprende da Brain. */}
                      {!KIND_SENZA_ANTEPRIMA.includes(item.kind) && (
                        <button className="primary" onClick={() => onAssetAction('open', item)}>
                          {t('library.resume')}
                        </button>
                      )}
                      <button onClick={() => download(item)}>{t('control.download.label')}</button>
                      <button onClick={() => setTagFor(item.id)}>{t('library.tag')}</button>
                      {item.kind === 'svg' && (
                        <button onClick={() => onOpenInEditor(item)}>{t('library.open.label')}</button>
                      )}
                      <button className="danger" onClick={() => store.remove(item.id)}>
                        {t('library.delete.label')}
                      </button>
                    </div>

                  </figure>
                ))}
                {restano > 0 && (
                  <button className="btn ghost small lib-altri" onClick={() => setQuanti((n) => n + POOL_VISIBILI)}>
                    {t('brain.pool.altri', { n: Math.min(restano, POOL_VISIBILI) })}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
