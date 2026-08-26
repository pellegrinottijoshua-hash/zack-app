import { useRef, useState } from 'react';

import { t } from '../i18n/index.js';

export default function Dropzone({ onFile, onEsempio, accept = 'image/*', title, hint }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);

  function take(list) {
    const f = [...(list || [])].find(
      (f) => f.type.startsWith('image/') || /\.svg$/i.test(f.name),
    );
    if (f) onFile(f);
  }

  return (
    <div
      className="drop"
      data-over={over}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
    >
      <span className="rule" />
      {/* Lo stato vuoto: Zack aspetta con la piuma in ala. È l'asset E-DROP
          del piano — una schermata senza niente dentro è il posto dove il
          personaggio serve davvero, perché è l'unico momento in cui non c'è
          il lavoro dell'utente da guardare. */}
      <img className="drop-zack" src="/zack/piuma.webp" alt="" />
      <h2>{title}</h2>
      <p>{hint}</p>
      {/* La via d'uscita da una tela vuota per chi non ha un file a portata di
          mano. Non è un tutorial: è il lavoro vero su un file vero, ed è il
          modo più corto per vedere cosa fa questo strumento. Ferma il clic,
          o aprirebbe anche il selettore di file del riquadro. */}
      {onEsempio && (
        <button
          type="button"
          className="btn ghost drop-esempio"
          onClick={(e) => {
            e.stopPropagation();
            onEsempio();
          }}
        >
          {t('prova.carica')}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
