import * as api from '../lib/api.js';
import { t } from '../i18n/index.js';

const KB = (n) => {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`; // a tidy SVG can be a few hundred bytes — "0 KB" reads as broken
};

/**
 * The bottom strip: every result ever produced, one click from the disk.
 * Files live in a plain folder, so this is a view onto it — not a database.
 */
export default function Library({ items, open, onToggle, onRefresh, onOpenInEditor, path }) {
  return (
    <section className="library" data-open={open}>
      <header className="library-head" onClick={onToggle}>
        <span className="label" style={{ letterSpacing: '0.24em' }}>
          {t('library.title')}
        </span>
        <span className="count">{items.length}</span>
        <span className="hint">{open ? '▾' : '▸'}</span>
        <span className="spacer" />
        {items.length > 0 && (
          <button
            className="btn small"
            onClick={(e) => {
              e.stopPropagation();
              api.download(api.bundleUrl());
            }}
          >
            {t('library.downloadAll.label')}
          </button>
        )}
        <button
          className="btn ghost small"
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
        >
          {t('library.refresh')}
        </button>
      </header>

      <div className="library-body">
        {items.length === 0 ? (
          <p className="empty-strip">
            {t('library.empty')}{' '}
            <code>{path || 'library/'}</code>.
          </p>
        ) : (
          <div className="strip">
            {items.map((it) => (
              <figure className="work" key={it.id}>
                <div className="thumb">
                  {it.thumb ? (
                    <img src={`data:image/png;base64,${it.thumb}`} alt={it.name} />
                  ) : (
                    <span className="none">nessuna anteprima</span>
                  )}
                </div>
                <figcaption>
                  <span className="kind">{it.kind}</span>
                  <br />
                  {it.name}
                  <br />
                  {KB(it.bytes)}
                </figcaption>
                <div className="acts">
                  <button onClick={() => api.download(api.fileUrl(it.id), it.file)}>{t('control.download.label')}</button>
                  {it.kind === 'svg' && (
                    <button onClick={() => onOpenInEditor(it)}>{t('library.open.label')}</button>
                  )}
                  <button
                    className="danger"
                    onClick={async () => {
                      await api.removeWork(it.id);
                      onRefresh();
                    }}
                  >
                    {t('library.delete.label')}
                  </button>
                </div>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
