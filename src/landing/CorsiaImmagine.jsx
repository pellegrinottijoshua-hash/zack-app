import { useEffect, useRef, useState } from 'react';
import { formatEuro } from '../engine/ledger.js';
import { PACCHETTI } from '../engine/pacchetti.js';
import { chiediLicenza, generaImmagine, riduci, sessione, vaiAllaRicarica } from '../lib/conto.js';
import { aggiungiRiferimenti, prezzoCorsia, statoTasto, RUOLO_HOME, TETTO } from './corsia.js';

/**
 * La corsia Immagine della home (fetta 2c): prompt, riferimenti a pallini,
 * il prezzo accanto al tasto, e la ricarica da ospite quando il saldo non
 * basta. Le regole stanno in `corsia.js`; qui c'è solo il disegno.
 *
 * I riferimenti vengono dal computer, non dalla libreria (sulla home non
 * c'è): si riducono SUBITO a 768 px con la stessa `riduci` dello studio —
 * è ciò che tiene vero il prezzo mostrato, e rende la bozza abbastanza
 * piccola da stare in `sessionStorage` durante il giro su Stripe.
 */

/** Dove la corsia tiene la bozza mentre il cliente è su Stripe. */
const BOZZA = 'jayl.home.bozza';

const scrivi = (frase, valori) => frase.replace(/\{(\w+)\}/g, (_, k) => valori[k] ?? '');

export default function CorsiaImmagine({ c, lang }) {
  const t = c.corsie;
  const [prompt, setPrompt] = useState('');
  const [riferimenti, setRiferimenti] = useState([]); // [{ id, url }] — url `data:` già ridotto
  const [avviso, setAvviso] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ospite, setOspite] = useState(true);
  const [inCorso, setInCorso] = useState(false);
  const [risultato, setRisultato] = useState(null);
  const [ricarica, setRicarica] = useState(false);
  const [pagando, setPagando] = useState(null);
  const input = useRef(null);

  /*
   * Il saldo si chiede SOLO se c'è già una sessione: aprire la home non crea
   * un ospite. E la bozza lasciata prima di Stripe si rimette al suo posto.
   */
  useEffect(() => {
    try {
      const b = JSON.parse(sessionStorage.getItem(BOZZA) || 'null');
      if (b) {
        setPrompt(b.prompt || '');
        setRiferimenti(Array.isArray(b.riferimenti) ? b.riferimenti.slice(0, TETTO) : []);
        sessionStorage.removeItem(BOZZA);
      }
    } catch {
      /* bozza illeggibile: si riparte vuoti */
    }
    (async () => {
      const token = await sessione();
      if (!token) return;
      const l = await chiediLicenza(token);
      if (!l) return;
      setSaldo(l.crediti ?? 0);
      setOspite(l.ospite === true);
    })();
  }, []);

  const prezzo = prezzoCorsia(riferimenti);
  const stato = statoTasto({ prompt, saldo, prezzo, inCorso });

  async function aggiungi(files) {
    const immagini = [...files].filter((f) => f.type.startsWith('image/'));
    const ridotti = [];
    for (const f of immagini) {
      try {
        ridotti.push({ id: `${Date.now()}-${ridotti.length}-${f.name}`, url: await riduci(f) });
      } catch {
        /* un file che non si legge non entra: non è un riferimento */
      }
    }
    setRiferimenti((prima) => {
      const { lista, fuori } = aggiungiRiferimenti(prima, ridotti);
      setAvviso(fuori ? scrivi(t.fuori, { n: TETTO }) : null);
      return lista;
    });
  }

  async function genera() {
    setInCorso(true);
    setAvviso(null);
    setRisultato(null);
    try {
      const corpo = await generaImmagine({
        prompt,
        riferimenti: riferimenti.map((r) => ({ assetId: r.id, ruolo: RUOLO_HOME })),
        // I riferimenti sono già `data:` ridotti: `leggiAsset` li ridà come
        // blob, e `generaImmagine` li riduce di nuovo senza cambiarli.
        leggiAsset: async (id) => {
          const r = riferimenti.find((x) => x.id === id);
          return r ? (await fetch(r.url)).blob() : null;
        },
      });
      const byte = Uint8Array.from(atob(corpo.dati), (ch) => ch.charCodeAt(0));
      setRisultato(URL.createObjectURL(new Blob([byte], { type: corpo.mime || 'image/jpeg' })));
      if (typeof corpo.saldo === 'number') setSaldo(corpo.saldo);
    } catch (e) {
      if (e.code === 'saldo' || e.code === 'non-collegato') setRicarica(true);
      else setAvviso(e.rimborsato ? t.rimborsato : t.errore);
      if (typeof e.saldo === 'number') setSaldo(e.saldo);
    } finally {
      setInCorso(false);
    }
  }

  async function paga(id) {
    setPagando(id);
    try {
      sessionStorage.setItem(BOZZA, JSON.stringify({ prompt, riferimenti }));
    } catch {
      /* troppo grande o negato: si paga lo stesso, il prompt si riscrive */
    }
    try {
      await vaiAllaRicarica(id, { ritorno: 'home' });
    } catch {
      setPagando(null);
      setAvviso(t.pagamentoNo);
    }
  }

  return (
    <section className="corsia corsia-immagine" aria-labelledby="corsia-immagine-t">
      <h2 id="corsia-immagine-t" className="corsia-titolo">{t.immagine}</h2>
      <p className="corsia-claim">{t.claim}</p>

      <textarea
        className="corsia-prompt"
        value={prompt}
        placeholder={t.prompt}
        aria-label={t.prompt}
        rows={3}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="corsia-pallini">
        {riferimenti.map((r) => (
          <span key={r.id} className="corsia-pallino">
            <img src={r.url} alt="" />
            <button
              type="button"
              aria-label={t.togli}
              onClick={() => setRiferimenti((p) => p.filter((x) => x.id !== r.id))}
            >
              ×
            </button>
          </span>
        ))}
        {riferimenti.length < TETTO && (
          <button type="button" className="corsia-piu" aria-label={t.aggiungi} onClick={() => input.current?.click()}>
            +
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            aggiungi(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="corsia-zack">
        {/* Il prezzo ACCANTO al tasto, prima di premere: la promessa della
            home, detta dove si decide (D-c). */}
        <p className="corsia-prezzo">
          <b>{scrivi(t.prezzo, { p: formatEuro(prezzo, lang) })}</b>
          {stato === 'ricarica' && <span>{t.manca}</span>}
        </p>
        <button
          type="button"
          className="zack-oval corsia-tasto"
          aria-label={stato === 'ricarica' ? t.ricarica : t.genera}
          disabled={stato === 'spento'}
          onClick={() => (stato === 'genera' ? genera() : setRicarica(true))}
        >
          <img src="/zack/tasto-zack-600.webp" alt="" width="600" height="335" />
        </button>
      </div>

      {inCorso && <p className="corsia-nota" role="status">{t.inCorso}</p>}
      {avviso && <p className="corsia-nota" role="status">{avviso}</p>}

      {ricarica && (
        <div className="corsia-ricarica">
          <div className="corsia-pacchetti">
            {Object.entries(PACCHETTI).map(([id, p]) => (
              <button key={id} type="button" className="lp-cta small" disabled={pagando !== null} onClick={() => paga(id)}>
                {formatEuro(p.millesimi, lang)}
              </button>
            ))}
          </div>
          {ospite && <p className="corsia-ospite">{t.ospite}</p>}
          <button type="button" className="comelink" onClick={() => setRicarica(false)}>
            {t.chiudi}
          </button>
        </div>
      )}

      {risultato && (
        <figure className="corsia-risultato">
          <img src={risultato} alt="" />
          <a className="lp-cta small" href={risultato} download="zack-immagine.jpg">
            {t.scarica}
          </a>
        </figure>
      )}
    </section>
  );
}
