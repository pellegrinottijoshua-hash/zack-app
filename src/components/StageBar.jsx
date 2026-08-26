import { t } from '../i18n/index.js';

/**
 * I comandi sopra la tela.
 *
 * Prima erano sparsi: lo scontorno in fondo alla colonna, il pennello dentro
 * una sezione, l'ingrandimento in un'altra, e togliere il file non si poteva
 * affatto. Chi lavora guarda l'immagine, non il pannello — i gesti che si
 * fanno di continuo devono stare dove si guarda.
 *
 * A destra c'è **una cosa sola**: il file pronto per la stampa. È l'unico
 * pulsante che porta a termine un lavoro intero, e si vede che è quello.
 */
const ICONS = {
  undo: 'M9 7L4 12l5 5M4 12h9a6 6 0 0 1 0 12h-2',
  eraser: 'M8 20H4l-1-4L14 5l6 6-9 9zM10 9l6 6',
  crop: 'M6 2v16h16M2 6h16v16',
  swap: 'M4 8h14l-4-4M20 16H6l4 4',
  clear: 'M6 6l12 12M18 6L6 18',
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Tool({ icon, label, disabled, active, onClick }) {
  return (
    <button
      className="sb-tool"
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

export default function StageBar({
  file,
  image,
  hasResult,
  canUndo,
  brushOpen,
  busy,
  plan,
  onReady,
  onUndo,
  onBrush,
  onCrop,
  onSwap,
  onClear,
}) {
  if (!file) return null;

  return (
    <div className="stagebar">
      <span className="sb-file" title={file.name}>
        {file.name}
        {image && <b>{`${image.w}×${image.h}`}</b>}
      </span>

      <span className="sb-tools">
        <Tool icon="undo" label={t('bar.undo')} disabled={busy || !canUndo} onClick={onUndo} />
        <Tool
          icon="eraser"
          label={t('bar.eraser')}
          disabled={busy || !hasResult}
          active={brushOpen}
          onClick={onBrush}
        />
        <Tool icon="crop" label={t('bar.crop')} disabled={busy || !image} onClick={onCrop} />
        <Tool icon="swap" label={t('bar.swap')} disabled={busy} onClick={onSwap} />
        <Tool icon="clear" label={t('bar.clear')} disabled={busy} onClick={onClear} />
      </span>

      {/* Il conto è scritto sul pulsante, non scoperto dopo averlo premuto. */}
      <button className="btn sb-ready" disabled={busy || !image} onClick={onReady}>
        <b>{t('bar.ready')}</b>
        {plan && (
          <em>
            {t('bar.readyNote', {
              size: `${plan.out.w}×${plan.out.h}`,
              wait: `${plan.wait.value} ${t(`common.${plan.wait.unit}`)}`,
            })}
          </em>
        )}
      </button>
    </div>
  );
}
