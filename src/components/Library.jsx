import { useEffect, useState } from 'react';
import { t } from '../i18n/index.js';
import AssetActions from './AssetActions.jsx';

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

  return (
    <div className="thumb">
      {url ? <img src={url} alt={item.name} /> : <span className="none">…</span>}
    </div>
  );
}

/**
 * La striscia dei lavori, con cartelle, moodboard, tag e ricerca.
 *
 * Tutto vive nel browser: nessun server, nessun account. Il rovescio è che
 * svuotare i dati del sito cancella l'archivio, e per questo l'avviso e il
 * pulsante di export completo sono in vista, non nascosti in un menu.
 */
export default function Library({ store, open, onToggle, onOpenInEditor, onDownloadAll, onAssetAction }) {
  const [newFolder, setNewFolder] = useState('');
  const [newBoard, setNewBoard] = useState('');
  const [tagFor, setTagFor] = useState(null);
  const [tagDraft, setTagDraft] = useState('');

  const f = store.filter;
  const set = (patch) => store.setFilter({ ...f, ...patch });

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
    <section className="library" data-open={open}>
      <header className="library-head" onClick={onToggle}>
        <span className="label" style={{ letterSpacing: '0.24em' }}>
          {t('library.title')}
        </span>
        <span className="count">{store.visible.length}</span>
        <span className="hint">{open ? '▾' : '▸'}</span>
        <span className="spacer" />
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
                value={f.search}
                onChange={(e) => set({ search: e.target.value })}
              />

              <button
                className="chip"
                aria-pressed={f.folderId === undefined && f.moodboardId === undefined && !f.tag}
                onClick={() => store.setFilter({ folderId: undefined, moodboardId: undefined, tag: null, search: f.search })}
              >
                {t('library.all')}
              </button>

              {store.folders.map((folder) => (
                <button
                  key={folder.id}
                  className="chip"
                  aria-pressed={f.folderId === folder.id}
                  onDoubleClick={() => store.deleteFolder(folder.id)}
                  title={t('library.folder.help')}
                  onClick={() => set({ folderId: f.folderId === folder.id ? undefined : folder.id, moodboardId: undefined })}
                >
                  ▸ {folder.name}
                </button>
              ))}

              {store.moodboards.map((board) => (
                <button
                  key={board.id}
                  className="chip board"
                  aria-pressed={f.moodboardId === board.id}
                  onDoubleClick={() => store.deleteMoodboard(board.id)}
                  title={t('library.moodboard.help')}
                  onClick={() => set({ moodboardId: f.moodboardId === board.id ? undefined : board.id, folderId: undefined })}
                >
                  ◈ {board.name}
                </button>
              ))}

              {store.tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  className="chip tag"
                  aria-pressed={f.tag === tag}
                  onClick={() => set({ tag: f.tag === tag ? null : tag })}
                >
                  {tag} <b>{count}</b>
                </button>
              ))}

              <form
                className="chip-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newFolder.trim()) store.createFolder(newFolder);
                  setNewFolder('');
                }}
              >
                <input
                  placeholder={t('library.newFolder')}
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                />
              </form>

              <form
                className="chip-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newBoard.trim()) store.createMoodboard(newBoard);
                  setNewBoard('');
                }}
              >
                <input
                  placeholder={t('library.newMoodboard')}
                  value={newBoard}
                  onChange={(e) => setNewBoard(e.target.value)}
                />
              </form>
            </div>

            <p className="lib-note">
              {t('library.localWarning')}
              {store.usage.used != null && ` · ${size(store.usage.used)}`}
            </p>

            {store.visible.length === 0 ? (
              <p className="empty-strip">{t('library.empty')}</p>
            ) : (
              <div className="strip" onClick={(e) => e.stopPropagation()}>
                {store.visible.map((item) => (
                  <figure className="work" key={item.id}>
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

                    <div className="acts">
                      <button onClick={() => download(item)}>{t('control.download.label')}</button>
                      <button onClick={() => setTagFor(item.id)}>{t('library.tag')}</button>
                      {item.kind === 'svg' && (
                        <button onClick={() => onOpenInEditor(item)}>{t('library.open.label')}</button>
                      )}
                      <button className="danger" onClick={() => store.remove(item.id)}>
                        {t('library.delete.label')}
                      </button>
                    </div>

                    {store.moodboards.length > 0 && (
                      <div className="boards">
                        {store.moodboards.map((b) => (
                          <button
                            key={b.id}
                            aria-pressed={(item.moodboardIds || []).includes(b.id)}
                            title={b.name}
                            onClick={() =>
                              store.setInMoodboard(item.id, b.id, !(item.moodboardIds || []).includes(b.id))
                            }
                          >
                            ◈
                          </button>
                        ))}
                      </div>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
