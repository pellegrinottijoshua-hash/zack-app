/**
 * Gli effetti sonori, sintetizzati invece che scaricati.
 *
 * Un whoosh, un impatto, un click, il vento, i passi: non sono suoni da
 * cercare in una libreria, sono **rumore filtrato con un inviluppo**. Venti
 * righe l'uno, zero byte da scaricare, illimitati e senza una licenza da
 * inseguire — che è la differenza fra un pacchetto scaricato dal web e uno
 * strumento che è tuo.
 *
 * Resta fra i servizi **gratuiti** perché non c'è nessun modello dietro: c'è
 * la fisica. È la stessa ragione per cui il laboratorio audio era già gratis.
 *
 * Qui c'è solo la matematica: i campioni si generano in un array di float,
 * senza Web Audio e senza browser, quindi si verificano in Node. Il suono si
 * ascolta altrove.
 */

/** La frequenza di campionamento di lavoro. 44,1 kHz è quella dei WAV che esportiamo. */
export const SR = 44100;

/**
 * Un generatore di rumore prevedibile.
 *
 * `Math.random` renderebbe ogni generazione diversa dalla precedente, e un
 * suono che non si può rifare uguale non si può nemmeno correggere: si
 * regola una manopola e cambia anche tutto il resto.
 */
export function rumore(seme = 1) {
  let s = seme >>> 0 || 1;
  return () => {
    // xorshift32: veloce, deterministico, abbastanza scorrelato per il rumore.
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

/**
 * L'inviluppo: come il suono cresce e come muore.
 *
 * È la parte che distingue un impatto da un vento pur partendo dallo stesso
 * rumore. `curva` sopra 1 fa spegnere prima — un colpo secco; sotto 1 lo fa
 * strascicare.
 */
export function inviluppo(n, { attacco = 0.005, coda = 1, curva = 2 } = {}) {
  const out = new Float32Array(n);
  const campioniAttacco = Math.max(1, Math.floor(attacco * SR));
  for (let i = 0; i < n; i++) {
    const a = i < campioniAttacco ? i / campioniAttacco : 1;
    const t = Math.max(0, 1 - i / (n * coda));
    out[i] = a * Math.pow(t, curva);
  }
  return out;
}

/**
 * Un passa-basso a un polo.
 *
 * Un polo solo e non quattro: su rumore la pendenza ripida non aggiunge
 * niente che si senta, e costa quattro volte tanto su un suono di tre
 * secondi. Dove serve davvero si incatena due volte.
 */
export function passaBasso(dati, taglio) {
  const out = new Float32Array(dati.length);
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * Math.max(20, taglio));
  const a = dt / (rc + dt);
  let prec = 0;
  for (let i = 0; i < dati.length; i++) {
    prec += a * (dati[i] - prec);
    out[i] = prec;
  }
  return out;
}

/** Passa-alto, per lo stesso motivo e con lo stesso conto al contrario. */
export function passaAlto(dati, taglio) {
  const basso = passaBasso(dati, taglio);
  const out = new Float32Array(dati.length);
  for (let i = 0; i < dati.length; i++) out[i] = dati[i] - basso[i];
  return out;
}

/** Normalizza al volume di picco chiesto, senza superarlo mai. */
export function normalizza(dati, picco = 0.9) {
  let max = 0;
  // Un ciclo e non `Math.max(...dati)`: lo spread esplode lo stack sopra
  // ~100k elementi, e tre secondi a 44,1 kHz sono 132.300 campioni.
  for (let i = 0; i < dati.length; i++) {
    const v = Math.abs(dati[i]);
    if (v > max) max = v;
  }
  if (max === 0) return dati;
  const k = picco / max;
  const out = new Float32Array(dati.length);
  for (let i = 0; i < dati.length; i++) out[i] = dati[i] * k;
  return out;
}

/**
 * Le famiglie di effetti.
 *
 * Ognuna è una ricetta: che rumore, che filtro, che inviluppo. I parametri
 * sono quelli che l'utente regola — non ci sono manopole nascoste, e non ce
 * ne sono venti: quattro per famiglia, o si torna a un sintetizzatore.
 */
export const FAMIGLIE = [
  {
    id: 'whoosh',
    durata: 1.1,
    param: { corpo: 0.5, velocita: 0.5, sporco: 0.2 },
    fai: (p, rnd, n) => {
      const grezzo = new Float32Array(n);
      for (let i = 0; i < n; i++) grezzo[i] = rnd();
      // Il taglio si muove nel tempo: è questo che fa "passare" il suono
      // invece di lasciarlo fermo. Un filtro fisso dà un soffio, non un whoosh.
      const out = new Float32Array(n);
      let prec = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const centro = 300 + 5200 * Math.sin(Math.PI * t) * (0.4 + p.velocita);
        const rc = 1 / (2 * Math.PI * Math.max(60, centro));
        const a = 1 / SR / (rc + 1 / SR);
        prec += a * (grezzo[i] - prec);
        out[i] = prec * (0.5 + p.corpo);
      }
      return out;
    },
  },
  {
    id: 'impatto',
    durata: 0.7,
    param: { corpo: 0.6, tono: 0.35, sporco: 0.3 },
    fai: (p, rnd, n) => {
      const out = new Float32Array(n);
      const f = 40 + 160 * p.tono;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        // Un seno che scende di tono più il rumore: il seno è il "tonfo", il
        // rumore è il materiale che si rompe.
        const tonfo = Math.sin(2 * Math.PI * f * t * Math.exp(-3 * t)) * (0.4 + p.corpo);
        out[i] = tonfo + rnd() * p.sporco;
      }
      return out;
    },
  },
  {
    id: 'click',
    durata: 0.09,
    param: { tono: 0.5, sporco: 0.15 },
    fai: (p, rnd, n) => {
      const out = new Float32Array(n);
      const f = 900 + 2600 * p.tono;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        out[i] = Math.sin(2 * Math.PI * f * t) * 0.8 + rnd() * p.sporco;
      }
      return out;
    },
  },
  {
    id: 'vento',
    durata: 3,
    param: { corpo: 0.4, velocita: 0.25 },
    fai: (p, rnd, n) => {
      const grezzo = new Float32Array(n);
      for (let i = 0; i < n; i++) grezzo[i] = rnd();
      const banda = passaBasso(passaBasso(grezzo, 400 + 900 * p.corpo), 400 + 900 * p.corpo);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        // Le raffiche: un'ampiezza che respira, altrimenti è un soffio piatto
        // che si riconosce subito come finto.
        const respiro = 0.5 + 0.5 * Math.sin((2 * Math.PI * i * (0.2 + p.velocita)) / SR);
        out[i] = banda[i] * respiro;
      }
      return out;
    },
  },
  {
    id: 'passi',
    durata: 0.28,
    param: { corpo: 0.5, sporco: 0.6 },
    fai: (p, rnd, n) => {
      const grezzo = new Float32Array(n);
      for (let i = 0; i < n; i++) grezzo[i] = rnd();
      const alto = passaAlto(grezzo, 900 + 2500 * p.sporco);
      const basso = passaBasso(grezzo, 120 + 200 * p.corpo);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = alto[i] * 0.6 + basso[i];
      return out;
    },
  },
  {
    id: 'ronzio',
    durata: 2.4,
    param: { tono: 0.3, corpo: 0.5 },
    fai: (p, rnd, n) => {
      const out = new Float32Array(n);
      const f = 50 + 150 * p.tono;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        // Tre armoniche: una sola dà un tono da test dell'udito.
        out[i] =
          (Math.sin(2 * Math.PI * f * t) +
            0.5 * Math.sin(4 * Math.PI * f * t) +
            0.25 * Math.sin(6 * Math.PI * f * t)) *
            (0.3 + p.corpo * 0.5) +
          rnd() * 0.02;
      }
      return out;
    },
  },
];

export function famiglia(id) {
  const f = FAMIGLIE.find((x) => x.id === id);
  if (!f) throw new Error(`Effetto sconosciuto: ${id}`);
  return f;
}

/**
 * Genera un effetto.
 *
 * @param {string} id
 * @param {object} [opts]
 * @param {object} [opts.param]   le manopole, 0…1
 * @param {number} [opts.durata]  in secondi
 * @param {number} [opts.seme]    lo stesso seme dà lo stesso suono
 * @returns {Float32Array} campioni mono, fra -1 e 1
 */
export function genera(id, { param = {}, durata = null, seme = 1 } = {}) {
  const f = famiglia(id);
  const secondi = Math.max(0.02, Math.min(10, durata ?? f.durata));
  const n = Math.floor(secondi * SR);
  const p = { ...f.param, ...param };
  // Le manopole arrivano anche da una ricetta salvata mesi fa: una fuori
  // scala produrrebbe un filtro impazzito o un volume che spacca le casse.
  for (const k of Object.keys(p)) p[k] = Math.max(0, Math.min(1, Number(p[k]) || 0));

  const grezzo = f.fai(p, rumore(seme), n);
  const env = inviluppo(n, {
    attacco: id === 'vento' || id === 'ronzio' ? 0.2 : 0.004,
    curva: id === 'vento' || id === 'ronzio' ? 0.4 : 2.4,
  });
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = grezzo[i] * env[i];
  return normalizza(out);
}

/**
 * Ripete un effetto sul ritmo che l'utente ha battuto.
 *
 * È il ponte con la parte che già funzionava: `detectOnsets` legge il ritmo
 * dalla voce, e qui quel ritmo diventa la posizione delle copie. Dire «tum
 * tum tum» e sentirlo tornare come passi di gigante è il gesto completo.
 *
 * @param {Float32Array} colpo
 * @param {number[]} tempi  in secondi
 */
export function suRitmo(colpo, tempi, { coda = 0.4 } = {}) {
  if (!tempi?.length) return colpo;
  const ultimo = Math.max(...tempi.slice(0, 5000));
  const n = Math.floor((ultimo + coda) * SR) + colpo.length;
  const out = new Float32Array(n);
  for (const t of tempi) {
    const inizio = Math.max(0, Math.floor(t * SR));
    for (let i = 0; i < colpo.length && inizio + i < n; i++) {
      // Si somma invece di sovrascrivere: due colpi vicini si accavallano
      // come farebbero davvero, e sovrascrivere taglierebbe la coda del primo.
      out[inizio + i] += colpo[i];
    }
  }
  return normalizza(out);
}
