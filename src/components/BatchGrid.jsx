import { useEffect, useMemo, useState } from 'react';
import { t } from '../i18n/index.js';

/**
 * I risultati del blocco, tutti sulla stessa tela.
 *
 * Prima stavano in una lista minuscola dentro la colonna di destra: su
 * quaranta file era un elenco di francobolli, e per accorgersi che il modello
 * ne aveva sbagliato uno bisognava aprirli a uno a uno. Il senso del lavoro in
 * blocco è **guardarli insieme**: l'errore si vede per differenza, non
 * ispezionando.
 *
 * Ogni risultato porta con sé le tre cose che servono subito dopo:
 *
 * - **il nome**, modificabile qui. I nomi automatici col suffisso li abbiamo
 *   tolti: si scrive quello vero mentre si guarda il file, che è l'unico
 *   momento in cui si sa come chiamarlo;
 * - **correggi**, che apre il pennello con l'originale accanto;
 * - **scarica**, per portarsi via quel file e basta senza passare dallo zip
 *   di tutto.
 *
 * Lo sfondo a scacchi non è decorazione: senza, un ritaglio con un buco nel
 * mezzo sembra riuscito, e il buco si scopre in stampa.
 */

function Riquadro({ r, onFix, onRename, onDownload }) {
  const [nome, setNome] = useState(() => r.file.name.replace(/\.[^.]+$/, ''));
  const url = useMemo(() => URL.createObjectURL(r.blob), [r.blob]);

  // L'URL va rilasciato o la memoria cresce a ogni blocco: su quaranta file
  // di stampa sono centinaia di megabyte che restano appesi.
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <li className="bg-cella">
      <div className="bg-tela">
        <img src={url} alt={nome} loading="lazy" />
      </div>

      <input
        className="bg-nome"
        value={nome}
        aria-label={t('batch.rename')}
        onChange={(e) => setNome(e.target.value)}
        // Si salva quando si esce dal campo, non a ogni tasto: rinominare
        // scrivendo produrrebbe una scrittura in archivio per lettera.
        onBlur={() => onRename(r, nome.trim())}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          // Salvare qui e non solo affidarsi all'uscita dal campo: chi preme
          // Invio si aspetta che sia fatto, e in certi casi il fuoco non se
          // ne va davvero — il nome resterebbe scritto e non salvato.
          onRename(r, nome.trim());
          e.currentTarget.blur();
        }}
      />

      <div className="bg-azioni">
        <button onClick={() => onFix(r)}>{t('batch.fix')}</button>
        <button onClick={() => onDownload(r, nome.trim())}>{t('batch.download')}</button>
      </div>
    </li>
  );
}

export default function BatchGrid({ results, onFix, onRename, onDownload, onDownloadAll, onClose }) {
  if (!results.length) return null;

  return (
    <div className="batch-grid">
      <div className="bg-testa">
        <h2>{t('batch.gridTitle', { n: results.length })}</h2>
        <span className="bg-spazio" />
        <button onClick={onDownloadAll}>{t('batch.downloadAll')}</button>
        <button onClick={onClose}>{t('batch.close')}</button>
      </div>

      <ul className="bg-elenco">
        {results.map((r, i) => (
          <Riquadro
            key={`${r.file.name}-${i}`}
            r={r}
            onFix={onFix}
            onRename={onRename}
            onDownload={onDownload}
          />
        ))}
      </ul>
    </div>
  );
}
