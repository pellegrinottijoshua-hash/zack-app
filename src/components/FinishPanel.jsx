import { useMemo } from 'react';
import Section from './Section.jsx';
import { Choice, Help } from './Panels.jsx';
import { t } from '../i18n/index.js';
import { ASPECTS, smartCrop, savedRatio } from '../engine/crop.js';
import { GARMENTS, checkPrint, worstLevel } from '../engine/print.js';
import { GARMENT_SHAPES, getShape, placeOnGarment } from '../engine/mockup.js';

const SWATCH = { nero: '#111111', panna: '#F5F0E8', bianco: '#FFFFFF', grigio: '#8A8A85' };
const pct = (v) => Math.round(v * 100);

/**
 * Le tre rifiniture, in un solo posto.
 *
 * Stanno insieme perché sono la stessa domanda in tre momenti: **il file è
 * pronto per finire su qualcosa di fisico?** Separarle in tre strumenti
 * costringerebbe a passare da uno all'altro per rispondere una volta sola.
 */
export default function FinishPanel({ stats, reading, s, set, busy, isVector, onCrop, onMockup, mockup }) {
  const crop = useMemo(
    () => (stats ? smartCrop(stats, { aspect: s.aspect }) : null),
    [stats, s.aspect],
  );
  const check = useMemo(
    () => (stats ? checkPrint(stats, { preset: s.preset, garment: s.garment, isVector }) : null),
    [stats, s.preset, s.garment, isVector],
  );
  const place = useMemo(
    () => (stats?.box ? placeOnGarment(stats.box.w, stats.box.h, getShape(s.shape)) : null),
    [stats, s.shape],
  );

  if (reading) {
    return (
      <Section id="finish" title={t('finish.title')} helpKey="finish.help">
        <p className="help">{t('finish.reading')}</p>
      </Section>
    );
  }
  if (!stats) {
    return (
      <Section id="finish" title={t('finish.title')} helpKey="finish.help">
        <p className="help">{t('finish.needsRaster')}</p>
      </Section>
    );
  }

  const saved = crop ? savedRatio(crop, stats.image) : 0;
  const worthIt = saved > 0.02;

  return (
    <>
      <Section id="crop" title={t('crop.title')} helpKey="crop.help" defaultOpen={false}>
        {ASPECTS.map((a) => (
          <Choice
            key={a.id}
            label={t(a.labelKey)}
            active={s.aspect === a.id}
            disabled={busy}
            onClick={() => set({ aspect: a.id })}
          />
        ))}

        {!crop ? (
          <p className="help">{t('crop.none')}</p>
        ) : (
          <>
            <p className="measure">
              {worthIt
                ? t('crop.saved', {
                    from: `${stats.image.w}×${stats.image.h}`,
                    to: `${crop.w}×${crop.h}`,
                    pct: pct(saved),
                  })
                : t('crop.nothing')}
            </p>
            {crop.cut && <p className="verdict" data-level="attenzione">{t('crop.cut')}</p>}
            <button className="btn ghost small" disabled={busy || !worthIt} onClick={() => onCrop(crop)}>
              {t('crop.apply')}
            </button>
          </>
        )}
      </Section>

      <Section id="print" title={t('print.title')} helpKey="print.help" defaultOpen={false}>
        <span className="label">
          <span>{t('print.garment')}</span>
        </span>
        {GARMENTS.map((g) => (
          <Choice
            key={g.id}
            label={g.id}
            swatch={SWATCH[g.id]}
            active={s.garment === g.id}
            disabled={busy}
            onClick={() => set({ garment: g.id })}
          />
        ))}

        {!check?.printable ? (
          <p className="help">{t('print.onlyPrint')}</p>
        ) : (
          <>
            <p className="verdict" data-level={worstLevel(check.findings)}>
              {t(`print.verdict.${worstLevel(check.findings)}`)}
            </p>
            <ul className="checks">
              {check.findings.map((f) => (
                <li key={f.id} data-level={f.level}>
                  <span className="dot" aria-hidden="true" />
                  {t(`print.${f.id}.${f.level}`, f.values)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section id="mockup" title={t('mockup.title')} helpKey="mockup.help" defaultOpen={false}>
        {GARMENT_SHAPES.map((g) => (
          <Choice
            key={g.id}
            label={t(g.labelKey)}
            active={s.shape === g.id}
            disabled={busy}
            onClick={() => set({ shape: g.id })}
          />
        ))}

        {place && (
          <>
            <p className="measure">{t('mockup.fill', { pct: pct(place.fill) })}</p>
            {place.fill < 0.33 && (
              <p className="verdict" data-level="attenzione">{t('mockup.small')}</p>
            )}
          </>
        )}

        <button className="btn ghost small" disabled={busy || !stats.box} onClick={onMockup}>
          {t('mockup.make')}
        </button>

        {mockup && (
          <a className="mockup-preview" href={mockup.url} download={mockup.name}>
            <img src={mockup.url} alt={t('mockup.title')} />
            <span>{t('mockup.download')}</span>
          </a>
        )}
      </Section>
    </>
  );
}
