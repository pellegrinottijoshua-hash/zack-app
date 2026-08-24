import { useRef, useState } from 'react';

export default function Dropzone({ onFile }) {
  const [over, setOver] = useState(false);
  const input = useRef(null);

  function take(fileList) {
    const f = [...(fileList || [])].find((f) => f.type.startsWith('image/'));
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
      <div className="aperture" />
      <h2>Trascina un'immagine</h2>
      <p>
        PNG, JPG, WebP. Resta tutto su questa macchina — nessun file lascia il
        tuo disco.
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
