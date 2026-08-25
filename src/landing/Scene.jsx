import { useEffect, useRef, useState } from 'react';
import { attachScrollVideo } from './scrollVideo.js';

/**
 * Una scena: una sezione alta più di uno schermo con un livello che resta
 * fermo mentre si scorre.
 *
 * **Il posto per il video è già predisposto.** Passando `video` la sorgente
 * viene montata e il suo avanzamento seguirà lo scorrimento; senza, resta il
 * segnaposto. Aggiungere i video AI più avanti non richiederà di rifare la
 * pagina: è un attributo.
 *
 * `depth` decide quanto è alta la sezione, cioè quanto dura la scena.
 */
export default function Scene({ id, video, poster, depth = 2, children, align = 'center' }) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return attachScrollVideo(sectionRef.current, videoRef.current, { onProgress: setProgress });
  }, [video]);

  return (
    <section
      ref={sectionRef}
      className="scene"
      id={id}
      style={{ '--depth': depth, '--p': progress }}
    >
      <div className="scene-sticky">
        <div className="scene-visual" data-has-video={Boolean(video)}>
          {video ? (
            <video
              ref={videoRef}
              src={video}
              poster={poster}
              muted
              playsInline
              preload="auto"
              // Non si riproduce da sé: lo scorrimento ne muove la testina.
              aria-hidden="true"
            />
          ) : (
            <div className="scene-placeholder" aria-hidden="true">
              <span style={{ transform: `scale(${1 + progress * 0.12})` }} />
            </div>
          )}
        </div>

        <div className="scene-text" data-align={align}>
          {children}
        </div>
      </div>
    </section>
  );
}
