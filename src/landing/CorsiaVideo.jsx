import { useEffect, useState } from 'react';
import { formatEuro } from '../engine/ledger.js';
import { DURATE, RISOLUZIONI, prezzoVideo } from '../engine/listinoVideo.js';
import { eOspite } from '../engine/licenza.js';
import { chiediLavoro, chiediLicenza, generaVideo, scaricaVideo, sessione } from '../lib/conto.js';
import { statoTasto } from './corsia.js';
import RicaricaCorsia from './RicaricaCorsia.jsx';

/**
 * La corsia Video della home (fase 3c): Seedance 2.5, con le stesse regole
 * della corsia Immagine — il prezzo accanto al tasto prima di premere, la
 * ricarica da ospite se il saldo non basta, il ritorno sulla home.
 *
 * In più c'è l'attesa: un video impiega minuti. Il lavoro si ricorda in
 * `localStorage` con una chiave SUA (non quella dello studio: due pagine che
 * aspettano lo stesso lavoro lo scaricherebbero due volte).
 */

const LAVORO = 'jayl.home.video.lavoro';
const BOZZA = 'jayl.home.video.bozza';
const OGNI_MS = 6000;
/** Sulla home tre forme bastano: orizzontale, verticale, quadrata. */
const FORMATI_HOME = ['16:9', '9:16', '1:1'];

const scrivi = (frase, valori) => frase.replace(/\{(\w+)\}/g, (_, k) => valori[k] ?? '');
const leggi = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const scriviLocale = (k, v) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* archivio negato: vale finché la scheda resta aperta */
  }
};

export default function CorsiaVideo({ c, lang }) {
  const t = c.corsie;
  const [prompt, setPrompt] = useState('');
  const [durata, setDurata] = useState(DURATE[0]);
  const [risoluzione, setRisoluzione] = useState('720p');
  const [formato, setFormato] = useState('16:9');
  const [saldo, setSaldo] = useState(0);
  /* Chi pagherebbe da ospite: la regola dello studio (`eOspite`); nel dubbio si tace. */
  const [licenza, setLicenza] = useState(null);
  const [haSessione, setHaSessione] = useState(null);
  const ospite = eOspite({ licenza, sessione: haSessione });
  const [avviso, setAvviso] = useState(null);
  const [chiedendo, setChiedendo] = useState(false);
  const [lavoro, setLavoro] = useState(() => leggi(LAVORO));
  const [risultato, setRisultato] = useState(null);
  const [ricarica, setRicarica] = useState(false);

  function ricordaLavoro(id) {
    setLavoro(id);
    scriviLocale(LAVORO, id);
  }

  /* Il saldo SOLO con una sessione già aperta; la bozza lasciata prima di Stripe. */
  useEffect(() => {
    try {
      const b = JSON.parse(sessionStorage.getItem(BOZZA) || 'null');
      if (b) {
        setPrompt(b.prompt || '');
        if (DURATE.includes(b.durata)) setDurata(b.durata);
        if (RISOLUZIONI.includes(b.risoluzione)) setRisoluzione(b.risoluzione);
        if (FORMATI_HOME.includes(b.formato)) setFormato(b.formato);
        sessionStorage.removeItem(BOZZA);
      }
    } catch {
      /* bozza illeggibile: si riparte vuoti */
    }
    (async () => {
      const token = await sessione();
      setHaSessione(Boolean(token));
      if (!token) return;
      const l = await chiediLicenza(token);
      if (!l) return;
      setSaldo(l.crediti ?? 0);
      setLicenza(l);
    })();
  }, []);

  /* L'attesa: stessa regola dello studio — «non lo so» è «in corso». */
  useEffect(() => {
    if (!lavoro) return undefined;
    let vivo = true;
    let timer = null;
    const giro = async () => {
      const r = await chiediLavoro(lavoro);
      if (!vivo) return;
      if (r.stato === 'fatto') {
        try {
          const blob = await scaricaVideo(lavoro);
          if (!vivo) return;
          setRisultato(URL.createObjectURL(blob));
          ricordaLavoro(null);
        } catch {
          if (vivo) setAvviso(t.videoScaduto);
        }
        return;
      }
      if (r.stato === 'rimborsato') {
        setAvviso(t.rimborsato);
        ricordaLavoro(null);
        return;
      }
      if (r.stato === 'sconosciuto') {
        ricordaLavoro(null);
        return;
      }
      timer = setTimeout(giro, OGNI_MS);
    };
    giro();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [lavoro, t]);

  const prezzo = prezzoVideo({ durata, risoluzione, formato }).total;
  const stato = statoTasto({ prompt, saldo, prezzo, inCorso: chiedendo || Boolean(lavoro) });

  async function genera() {
    setChiedendo(true);
    setAvviso(null);
    setRisultato(null);
    try {
      const d = await generaVideo({ prompt, durata, risoluzione, formato });
      if (typeof d.saldo === 'number') setSaldo(d.saldo);
      ricordaLavoro(d.lavoro);
    } catch (e) {
      if (e.code === 'saldo' || e.code === 'non-collegato') setRicarica(true);
      else setAvviso(e.rimborsato === true ? t.rimborsato : t.errore);
      if (typeof e.saldo === 'number') setSaldo(e.saldo);
    } finally {
      setChiedendo(false);
    }
  }

  const pastiglie = (valori, scelto, cambia, etichetta) => (
    <div className="corsia-scelte" role="group" aria-label={etichetta}>
      {valori.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={scelto === v}
          disabled={Boolean(lavoro)}
          onClick={() => cambia(v)}
        >
          {typeof v === 'number' ? `${v} s` : v}
        </button>
      ))}
    </div>
  );

  return (
    <section className="corsia corsia-video" aria-labelledby="corsia-video-t">
      <h2 id="corsia-video-t" className="corsia-titolo">{t.video}</h2>
      <p className="corsia-claim">{t.videoClaim}</p>

      <textarea
        className="corsia-prompt"
        value={prompt}
        placeholder={t.prompt}
        aria-label={t.prompt}
        rows={3}
        disabled={Boolean(lavoro)}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {pastiglie(DURATE, durata, setDurata, t.durata)}
      {pastiglie(RISOLUZIONI, risoluzione, setRisoluzione, t.risoluzione)}
      {pastiglie(FORMATI_HOME, formato, setFormato, t.formato)}

      <div className="corsia-zack">
        <p className="corsia-prezzo">
          <b>{scrivi(t.prezzoVideo, { p: formatEuro(prezzo, lang) })}</b>
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

      {lavoro && <p className="corsia-nota" role="status">{t.girando}</p>}
      {avviso && <p className="corsia-nota" role="status">{avviso}</p>}

      {ricarica && (
        <RicaricaCorsia
          t={t}
          lang={lang}
          ospite={ospite}
          salvaBozza={() => sessionStorage.setItem(BOZZA, JSON.stringify({ prompt, durata, risoluzione, formato }))}
          onChiudi={() => setRicarica(false)}
          onErrore={setAvviso}
        />
      )}

      {risultato && (
        <figure className="corsia-risultato">
          <video src={risultato} controls playsInline />
          <a className="lp-cta small" href={risultato} download="zack-video.mp4">
            {t.scarica}
          </a>
        </figure>
      )}
    </section>
  );
}
