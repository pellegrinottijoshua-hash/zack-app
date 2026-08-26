import { t } from '../i18n/index.js';
import Icon from './Icon.jsx';
import ZackButton from './ZackButton.jsx';

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
  ricetta,
  pianoZack,
  onZack,
  onRicetta,
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

      {/* Il pulsante che porta a termine un lavoro intero. Era «Pronto per
          la stampa», uno e uguale per tutti; ora è la catena che l'utente ha
          scelto — e continua a dire cosa farà prima di essere premuto. */}
      <ZackButton
        ricetta={ricetta}
        piano={pianoZack}
        disabled={!image}
        busy={busy}
        onRun={onZack}
        onChange={onRicetta}
      />
    </div>
  );
}
