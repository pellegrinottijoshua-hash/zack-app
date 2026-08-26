import { useEffect, useRef, useState } from 'react';
import { blockAt } from './scrollVideo.js';

/**
 * Il video della home: a schermo intero, sempre visibile, cinque clip che si
 * susseguono mentre scorrono solo le parole.
 *
 * **Sono cinque video separati, non uno diviso in cinque.** Ognuno riprende
 * dall'ultimo fotogramma del precedente, quindi il passaggio non si vede: chi
 * scorre vede Zack fare una cosa sola dall'inizio alla fine della pagina.
 * Erano nati come un file unico spezzato a tempo — sbagliato, perché i cinque
 * pezzi si generano e si rifanno uno alla volta, e un file unico costringe a
 * rimontare tutto per cambiarne uno.
 *
 * Stanno tutti nel DOM, sovrapposti, e si mostra quello del blocco corrente.
 * L'alternativa — un `<video>` solo a cui si cambia `src` — costringe a
 * ricaricare e decodificare a ogni passaggio, e il salto si vede proprio nel
 * momento in cui deve essere invisibile.
 *
 * Il carico è misurato: il video attivo e il successivo si preparano davvero,
 * gli altri non scaricano niente finché non servono. Cinque clip caricate
 * tutte all'apertura sarebbero il peso che le due entrate separate volevano
 * evitare.
 */
export default function HomeVideo({ clip, sezioni }) {
  const riferimenti = useRef([]);
  const [attivo, setAttivo] = useState(0);

  useEffect(() => {
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (calmo?.matches) return undefined;

    let frame = null;

    const aggiorna = () => {
      frame = null;
      const riquadri = sezioni.current.filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, height: r.height };
      });

      const { indice, progresso } = blockAt(riquadri, window.innerHeight);
      // Un blocco può non avere ancora il suo video: finché mancano, si resta
      // sull'ultimo girato invece di mostrare un riquadro vuoto.
      const quale = Math.min(indice, clip.length - 1);
      setAttivo(quale);

      const v = riferimenti.current[quale];
      if (!v || !Number.isFinite(v.duration)) return;
      const target = Math.max(0, Math.min(v.duration, progresso * v.duration));
      // Sotto un fotogramma il salto non si vede, e cercare a ogni evento di
      // scorrimento inonda il decoder: il video scatterebbe invece di scorrere.
      if (Math.abs(v.currentTime - target) > 1 / 30) v.currentTime = target;
    };

    const programma = () => {
      if (frame == null) frame = requestAnimationFrame(aggiorna);
    };
    const risincronizza = () => {
      if (!document.hidden) programma();
    };

    window.addEventListener('scroll', programma, { passive: true });
    window.addEventListener('resize', programma);
    document.addEventListener('visibilitychange', risincronizza);
    riferimenti.current.forEach((v) => v?.addEventListener('loadedmetadata', programma));
    programma();

    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', programma);
      window.removeEventListener('resize', programma);
      document.removeEventListener('visibilitychange', risincronizza);
      riferimenti.current.forEach((v) => v?.removeEventListener('loadedmetadata', programma));
    };
  }, [clip, sezioni]);

  return (
    <div className="home-video" data-blocco={attivo}>
      {clip.map((c, i) => (
        <video
          key={c.src}
          ref={(el) => {
            riferimenti.current[i] = el;
          }}
          src={c.src}
          poster={c.poster}
          data-on={i === attivo || undefined}
          muted
          playsInline
          preload={i === attivo || i === attivo + 1 ? 'auto' : 'none'}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
