/**
 * Dalla descrizione ai filtri, senza AI.
 *
 * Il committente aveva chiesto un modello linguistico che leggesse la frase.
 * L'AI è stata rimandata il 2026-09-04: sarebbe stata la prima cosa nell'app
 * a non girare nel browser del cliente, contro *«tutto gratis e in locale, è
 * il motivo dell'abbonamento»* (allora 3,99 €, dal 2026-09-09 2,99).
 *
 * Un dizionario fa il 90% di quel lavoro, gratis e all'istante — e fa una cosa
 * che un modello linguistico non fa: **dice quando non ha capito**. Un tasto
 * che indovina insegna a non fidarsi del prossimo risultato; uno che dichiara
 * «questa parola non la so» resta credibile anche quando sbaglia.
 *
 * *«Il tasto imposta, non decide»*: ciò che esce è un punto di partenza, e
 * tutte le manopole restano dove sono.
 */

/**
 * Le parole che il dizionario conosce, e cosa spostano.
 *
 * I nomi dei campi sono quelli di una ricetta in `sound.js`, così ciò che
 * esce si applica senza traduzioni in mezzo.
 *
 * ⚠️ `formants` lì è **una pendenza spettrale, non un vero spostamento delle
 * formanti** — lo dice il commento in `useSound.js`, ed è onesto. Quindi qui
 * si promette solo «scurisce/schiarisce»: per fare voci di persone diverse
 * servirebbe uno spostamento vero, che è un altro lavoro.
 */
export const PAROLE = {
  calda: { formants: -3, filter: { type: 'lowpass', freq: 5200, q: 0.7 } },
  scura: { formants: -4 },
  chiara: { formants: 3 },
  brillante: { formants: 4 },
  grave: { semitones: -5 },
  acuta: { semitones: 5 },
  profonda: { semitones: -8, formants: -2 },
  radio: { drive: 0.4, filter: { type: 'bandpass', freq: 1600, q: 1.4 } },
  telefono: { filter: { type: 'bandpass', freq: 1800, q: 3 } },
  sporca: { drive: 0.6 },
  pulita: { drive: 0 },
  // Nomina un PROBLEMA, non un desiderio: nessuno chiede «più sibilante».
  // Vedi `PROBLEMI` qui sotto — «meno sibilante» e «sibilante» sono la
  // stessa richiesta, e trattarle diversamente sarebbe una finezza che
  // nessuno capirebbe.
  sibilante: { filter: { type: 'lowpass', freq: 4200, q: 1.2 } },
  ampia: { reverb: { seconds: 2.8, decay: 2.2, mix: 0.45 } },
  vicina: { reverb: { seconds: 0.4, decay: 1, mix: 0.08 } },
  lontana: { reverb: { seconds: 3.4, decay: 2.6, mix: 0.6 } },
};

/**
 * Le parole che nominano un problema invece di un desiderio.
 *
 * «Meno sibilante» e «sibilante» chiedono la stessa cosa: togliere le
 * sibilanti. Invertire la seconda vorrebbe dire AGGIUNGERLE, che nessuno ha
 * mai chiesto in vita sua.
 *
 * Serve perché l'inversione di `meno` funziona sui numeri — «grave» −5
 * diventa +5 — ma su un filtro no: un oggetto non ha un contrario. Senza
 * questa lista «meno sibilante» applicava il de-esser identico a
 * «sibilante», che per fortuna e' anche la cosa giusta, ma per caso: il
 * primo filtro numerico aggiunto qui si sarebbe comportato male in silenzio.
 */
const PROBLEMI = ['sibilante'];

/** Le coppie che non possono convivere: si segnalano, non si risolvono. */
const OPPOSTI = [
  ['grave', 'acuta'],
  ['calda', 'chiara'],
  ['scura', 'brillante'],
  ['sporca', 'pulita'],
  ['vicina', 'lontana'],
];

/**
 * «Meno X» va inteso al contrario di «più X».
 *
 * Senza questo, «meno sibilante» accenderebbe il filtro delle sibilanti
 * invece di spegnerlo — e sarebbe il tipo di errore che sembra un guasto del
 * dizionario e invece è una parola non letta.
 */
const NEGAZIONI = ['meno', 'poco', 'senza'];

/**
 * Le parole di legatura.
 *
 * Non sono «non capite»: nessuno si aspetta che «e» faccia qualcosa, e
 * segnalarle renderebbe l'avviso illeggibile proprio quando serve.
 */
const LEGATURE = ['piu', 'e', 'un', 'una', 'po', 'da', 'la', 'il', 'di', 'molto', 'voce'];

/** Via accenti e maiuscole: «PIÙ CALDA» e «piu calda» sono la stessa cosa. */
const pulisci = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Fonde due insiemi di filtri: i numeri si sommano, gli oggetti si sostituiscono. */
function fondi(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') out[k] = (out[k] ?? 0) + v;
    else out[k] = v;
  }
  return out;
}

/** Inverte un filtro, per «meno X». */
const inverti = (f) =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'number' ? -v : v]));

/**
 * Legge una descrizione.
 *
 * @returns {{capito: string[], nonCapito: string[], contraddizioni: string[][], filtri: object}}
 */
export function leggiDescrizione(testo) {
  const parole = pulisci(testo);
  const capito = [];
  const nonCapito = [];
  let filtri = {};
  let nega = false;

  for (const p of parole) {
    if (NEGAZIONI.includes(p)) {
      nega = true;
      continue;
    }
    if (LEGATURE.includes(p)) continue;

    if (PAROLE[p]) {
      capito.push(p);
      // Un problema si toglie sia che tu dica «sibilante» sia «meno
      // sibilante»: la negazione non lo capovolge.
      const effetto = nega && !PROBLEMI.includes(p) ? inverti(PAROLE[p]) : PAROLE[p];
      filtri = fondi(filtri, effetto);
    } else {
      nonCapito.push(p);
    }
    nega = false;
  }

  const contraddizioni = OPPOSTI.filter(([x, y]) => capito.includes(x) && capito.includes(y));
  return { capito, nonCapito, contraddizioni, filtri };
}
