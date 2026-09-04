import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { FORMATI } from '../engine/clip.js';
import { estraiFotogrammi, tagliaFilmato, togliSfondo } from '../engine/filmato.js';
import Icon from './Icon.jsx';

/**
 * Il filmato: tre gesti, e nient'altro.
 *
 * **Taglia**, **estrai i fotogrammi**, **togli lo sfondo**. Sono gesti
 * singoli su un file solo, la stessa forma di ogni altro strumento dello
 * studio. Il confine è dichiarato e va tenuto: appena servisse una traccia
 * con più clip in fila saremmo in Premiere, e Premiere non lo facciamo.
 *
 * Ogni attesa si dichiara prima. Il taglio costa il **tempo reale** della
 * clip perché si registra mentre scorre, e far partire un'attesa lunga senza
 * dirne la durata è il modo più sicuro di far chiudere la scheda a metà.
 */
export default function FilmLab({ file, onPick, onSave, onNotice, onError }) {
  const video = useRef(null);
  const [meta, setMeta] = useState(null);
  const [da, setDa] = useState(0);
  const [a, setA] = useState(null);
  const [form, setForm] = useState('originale');
  const [quanti, setQuanti] = useState(12);
  const [lavoro, setLavoro] = useState(null);

  useEffect(() => {
    setMeta(null);
    setDa(0);
    setA(null);
  }, [file]);

  /*
   * L'URL della clip si fa una volta per file.
   *
   * Dentro il render ne nasceva uno a ogni ridisegno, e nessuno veniva
   * revocato: qui non è una miniatura, è un filmato intero che resta in
   * memoria a ogni copia. Sta sopra il `return` anticipato perché un hook
   * dopo un `return` condizionale gira in alcuni render e non in altri.
   */
  const urlClip = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => urlClip && URL.revokeObjectURL(urlClip), [urlClip]);

  if (!file) {
    return (
      <div className="film film-vuoto">
        <img src="/zack/libreria.webp" alt="" />
        <h2>{t('film.vuoto')}</h2>
        <p>{t('film.vuotoNota')}</p>
        <label className="btn">
          {t('film.scegli')}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => {
              const f = e.target.files[0];
              e.target.value = '';
              if (f) onPick(f);
            }}
          />
        </label>
      </div>
    );
  }

  const durata = meta?.durata ?? 0;
  const fine = a ?? durata;
  const scelto = Math.max(0, fine - da);
  const occupato = Boolean(lavoro);

  async function conAttesa(nome, fai) {
    setLavoro({ nome, fatto: 0, totale: 1 });
    try {
      await fai((fatto, totale) => setLavoro({ nome, fatto, totale }));
    } catch (e) {
      console.error(e);
      onError(e.message);
    } finally {
      setLavoro(null);
    }
  }

  return (
    <div className="film">
      <video
        ref={video}
        className="film-video"
        src={urlClip}
        controls
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setMeta({ durata: v.duration, w: v.videoWidth, h: v.videoHeight });
          setA(v.duration);
        }}
      />

      <div className="film-comandi">
        {/* ── TAGLIA ────────────────────────────────────────────────── */}
        <section className="film-gesto">
          <h3>{t('film.taglia')}</h3>
          <div className="film-tempi">
            <label>
              <span>{t('film.da')}</span>
              <input
                type="range"
                min="0"
                max={durata || 1}
                step="0.05"
                value={da}
                onChange={(e) => setDa(Math.min(Number(e.target.value), fine - 0.1))}
              />
              <b>{da.toFixed(1)}s</b>
            </label>
            <label>
              <span>{t('film.a')}</span>
              <input
                type="range"
                min="0"
                max={durata || 1}
                step="0.05"
                value={fine}
                onChange={(e) => setA(Math.max(Number(e.target.value), da + 0.1))}
              />
              <b>{fine.toFixed(1)}s</b>
            </label>
          </div>

          <div className="film-formati">
            {FORMATI.map((f) => (
              <button key={f.id} className="btn small" aria-pressed={form === f.id} onClick={() => setForm(f.id)}>
                {t(`film.formato.${f.id}`)}
              </button>
            ))}
          </div>

          {/* L'attesa scritta prima di premere, come per l'ingrandimento. */}
          <button
            className="btn"
            disabled={occupato || !durata}
            onClick={() =>
              conAttesa(t('film.taglia'), async (avanza) => {
                const f = FORMATI.find((x) => x.id === form);
                const { blob, durata: d } = await tagliaFilmato(file, {
                  da,
                  a: fine,
                  formato: f?.rapporto ?? null,
                  onProgress: avanza,
                });
                await onSave(blob, { kind: 'webm', op: 'clip' });
                onNotice(t('film.tagliato', { s: d.toFixed(1) }));
              })
            }
          >
            {t('film.tagliaOra', { s: scelto.toFixed(1) })}
          </button>
        </section>

        {/* ── FOTOGRAMMI ───────────────────────────────────────────── */}
        <section className="film-gesto">
          <h3>{t('film.frames')}</h3>
          <label className="film-quanti">
            <span>{t('film.quanti', { n: quanti })}</span>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={quanti}
              onChange={(e) => setQuanti(Number(e.target.value))}
            />
          </label>
          <button
            className="btn"
            disabled={occupato}
            onClick={() =>
              conAttesa(t('film.frames'), async (avanza) => {
                const fuori = await estraiFotogrammi(file, { quanti, onProgress: avanza });
                for (const { blob } of fuori) await onSave(blob, { kind: 'png', op: 'frame' });
                onNotice(t('film.estratti', { n: fuori.length }));
              })
            }
          >
            {t('film.estraiOra')}
          </button>
        </section>

        {/* ── SFONDO ───────────────────────────────────────────────── */}
        <section className="film-gesto">
          <h3>{t('film.sfondo')}</h3>
          <p className="help">{t('film.sfondoNota')}</p>
          <button
            className="btn"
            disabled={occupato}
            onClick={() =>
              conAttesa(t('film.sfondo'), async (avanza) => {
                const { blob, isole } = await togliSfondo(file, { onProgress: avanza });
                await onSave(blob, { kind: 'webm', op: 'keyed' });
                // Il numero da guardare: zero isole su una clip col becco di
                // Zack in campo significa che il key se l'è mangiato.
                onNotice(isole > 0 ? t('film.tolto', { n: isole }) : t('film.toltoDubbio'));
              })
            }
          >
            <Icon name="feather" draw />
            {/* «Almeno», non «circa»: il filmato viene rigiocato in tempo
                reale da MediaRecorder, quindi l'attesa non scende mai sotto la
                sua durata — e il key fotogramma per fotogramma può stare
                indietro. Promettere «circa» sarebbe promettere il minimo. */}
            {t('film.togliOraAttesa', { s: (durata || 0).toFixed(1) })}
          </button>
        </section>
      </div>

      {lavoro && (
        <p className="film-attesa">
          {lavoro.nome} · {Math.round((lavoro.fatto / Math.max(1, lavoro.totale)) * 100)}%
        </p>
      )}
    </div>
  );
}
