import { useEffect, useState } from 'react';
import { t } from '../i18n/index.js';
import { Help } from './Panels.jsx';

const PALETTE = ['#111111', '#F5F0E8', '#FFFFFF', '#8A8A85', '#C4A35A', 'none'];

const swatchStyle = (c) =>
  c === 'none' ? 'repeating-linear-gradient(45deg,#222 0 4px,#333 4px 8px)' : c;

/** Campo numerico che scrive solo quando il valore è valido e diverso. */
function Num({ label, value, onChange, step = 1, disabled }) {
  const [draft, setDraft] = useState('');
  useEffect(() => {
    setDraft(value == null ? '' : String(Math.round(value * 10) / 10));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    // Un campo svuotato o incomprensibile non deve spostare nulla: torna al
    // valore reale invece di scrivere NaN nel documento.
    if (draft === '' || Number.isNaN(n)) {
      setDraft(value == null ? '' : String(Math.round(value * 10) / 10));
      return;
    }
    if (n !== value) onChange(n);
  };

  return (
    <label className="num">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

/**
 * Il pannello dell'editor vettoriale.
 *
 * I campi numerici esistono perché "trascina finché non sembra giusto" non è
 * un metodo: chi prepara un file di stampa ha bisogno di dire 240 e ottenere
 * 240. Il pannello si aggiorna a ogni cambio di selezione.
 */
export default function VectorTools({ editor, selCount, nodeMode, onNodeMode, tick }) {
  const [box, setBox] = useState(null);
  const [rot, setRot] = useState(0);
  const [linked, setLinked] = useState(true);

  useEffect(() => {
    setBox(editor.current?.box?.() ?? null);
  }, [selCount, tick, editor]);

  const has = selCount > 0;
  const many = selCount > 1;
  const e = () => editor.current;

  return (
    <>
      {/* ─── nodi ─────────────────────────────────────────────────────── */}
      <div className="field">
        <span className="label">
          <span>{t('nodes.title')}</span>
          <b>{nodeMode ? t('common.on') : t('common.off')}</b>
        </span>
        <Help k="nodes.help" />
        <button
          className="opt"
          aria-pressed={nodeMode}
          onClick={() => onNodeMode(!nodeMode)}
        >
          {t('nodes.toggle')}
        </button>
        {nodeMode && (
          <>
            <div className="row">
              <button className="btn ghost small" onClick={() => e()?.addNode()}>
                {t('nodes.add')}
              </button>
              <button className="btn ghost small" onClick={() => e()?.removeNode()}>
                {t('nodes.remove')}
              </button>
            </div>
            <div className="row">
              <button className="btn ghost small" onClick={() => e()?.segmentType(true)}>
                {t('nodes.curve')}
              </button>
              <button className="btn ghost small" onClick={() => e()?.segmentType(false)}>
                {t('nodes.straight')}
              </button>
            </div>
            <button
              className="opt"
              aria-pressed={linked}
              onClick={() => {
                const next = !linked;
                setLinked(next);
                e()?.linkHandles(next);
              }}
            >
              {t('nodes.handles')}
              <span className="note">{linked ? t('nodes.symmetric') : t('nodes.free')}</span>
            </button>
            <div className="row">
              <button className="btn ghost small" onClick={() => e()?.closePath()}>
                {t('nodes.close')}
              </button>
              <button className="btn ghost small" onClick={() => e()?.smooth()}>
                {t('nodes.smooth')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── posizione e misura ───────────────────────────────────────── */}
      <div className="field">
        <span className="label">
          <span>{t('transform.title')}</span>
          <b>{has ? `${selCount}` : t('editor.nothing')}</b>
        </span>
        <Help k="transform.help" />
        <div className="nums">
          <Num
            label="X"
            value={box?.x}
            disabled={!has}
            onChange={(v) => {
              e()?.moveTo(v, box.y);
              setBox(e()?.box?.() ?? null);
            }}
          />
          <Num
            label="Y"
            value={box?.y}
            disabled={!has}
            onChange={(v) => {
              e()?.moveTo(box.x, v);
              setBox(e()?.box?.() ?? null);
            }}
          />
          <Num label={t('transform.w')} value={box?.w} disabled />
          <Num label={t('transform.h')} value={box?.h} disabled />
        </div>
        <Num
          label={t('transform.rotation')}
          value={rot}
          step={15}
          disabled={!has}
          onChange={(v) => {
            setRot(v);
            e()?.rotate(v);
          }}
        />
        <div className="row">
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.nudge(-1, 0)}>
            ←
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.nudge(1, 0)}>
            →
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.nudge(0, -1)}>
            ↑
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.nudge(0, 1)}>
            ↓
          </button>
        </div>
      </div>

      {/* ─── allineamento ─────────────────────────────────────────────── */}
      <div className="field">
        <span className="label">
          <span>{t('align.title')}</span>
        </span>
        <Help k="align.help" />
        <div className="row">
          {['left', 'centerX', 'right'].map((w) => (
            <button
              key={w}
              className="btn ghost small"
              disabled={!many}
              title={t(`align.${w}`)}
              onClick={() => e()?.align(w)}
            >
              {t(`align.short.${w}`)}
            </button>
          ))}
        </div>
        <div className="row">
          {['top', 'centerY', 'bottom'].map((w) => (
            <button
              key={w}
              className="btn ghost small"
              disabled={!many}
              title={t(`align.${w}`)}
              onClick={() => e()?.align(w)}
            >
              {t(`align.short.${w}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── aspetto ──────────────────────────────────────────────────── */}
      <div className="field">
        <span className="label">
          <span>{t('editor.fill')}</span>
          <b>JAYL</b>
        </span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={`f-${c}`}
              title={c}
              disabled={!has}
              style={{ background: swatchStyle(c) }}
              onClick={() => e()?.paint('fill', c)}
            />
          ))}
        </div>
        <span className="label">
          <span>{t('editor.stroke')}</span>
        </span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={`s-${c}`}
              title={c}
              disabled={!has}
              style={{ background: swatchStyle(c) }}
              onClick={() => e()?.paint('stroke', c)}
            />
          ))}
        </div>
        <div className="nums">
          <Num
            label={t('appearance.strokeWidth')}
            value={undefined}
            disabled={!has}
            onChange={(v) => e()?.attr('stroke-width', v)}
          />
          <Num
            label={t('appearance.opacity')}
            step={0.1}
            value={undefined}
            disabled={!has}
            onChange={(v) => e()?.attr('opacity', Math.min(1, Math.max(0, v)))}
          />
        </div>
        <Help k="appearance.help" />
      </div>

      {/* ─── disposizione ─────────────────────────────────────────────── */}
      <div className="field">
        <span className="label">
          <span>{t('arrange.title')}</span>
        </span>
        <div className="row">
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.duplicate()}>
            {t('arrange.duplicate')}
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.del()}>
            {t('editor.remove.label')}
          </button>
        </div>
        <div className="row">
          <button className="btn ghost small" disabled={!many} onClick={() => e()?.group()}>
            {t('editor.group.label')}
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.ungroup()}>
            {t('editor.ungroup.label')}
          </button>
        </div>
        <div className="row">
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.toFront()}>
            {t('editor.front.label')}
          </button>
          <button className="btn ghost small" disabled={!has} onClick={() => e()?.toBack()}>
            {t('editor.back.label')}
          </button>
        </div>
        <div className="row">
          <button className="btn ghost small" onClick={() => e()?.undo()}>
            {t('editor.undo.label')}
          </button>
          <button className="btn ghost small" onClick={() => e()?.redo()}>
            {t('editor.redo.label')}
          </button>
        </div>
      </div>
    </>
  );
}
