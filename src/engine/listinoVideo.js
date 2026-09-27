/**
 * Il listino del video — Seedance 2.5 (fase 3).
 *
 * A parte da `listino.js` perché ha un'altra forma: l'immagine costa una cifra
 * fissa, il video costa **a secondo**, e il secondo costa diverso secondo la
 * risoluzione e il CANALE da cui lo si compra. Modulo puro: lo leggono il
 * browser (il prezzo accanto al tasto) e il Worker (l'addebito), e i due
 * numeri non possono divergere perché sono lo stesso codice.
 *
 * Fonti, lette il 2026-09-27 sulle pagine ufficiali (spec
 * `docs/superpowers/specs/2026-09-27-video-seedance-design.md` §1):
 * - BytePlus ModelArk: 10,70 $ per milione di token;
 * - Higgsfield: 0,0214 $ ogni 1.000 token (il doppio);
 * - token = ceil(larghezza × altezza × secondi × 24 / 1024), uguale per tutti e due.
 */

import { priceFor } from './ledger.js';

/**
 * Dollari → euro. Una FOTOGRAFIA prudente: il dollaro contato più caro di
 * com'è, così un cambio che si muove un po' non porta il costo sopra il
 * prezzo. Va riguardata; `lavori.costo_reale` dice quando ha smesso di valere.
 */
export const CAMBIO_USD_EUR = 0.95;

/**
 * I pixel del formato PIÙ GRANDE di ogni risoluzione. Il prezzo si fa su
 * questo, così qualunque formato si scelga la stima resta sopra il costo vero
 * (la regola del listino: «la stima non sta mai sotto il costo»).
 * 720p: il 4:3 a 1112×834. 480p: il 21:9, arrotondato per eccesso.
 * 1080p (fetta 3d): 1920×1080 fa 2.073.600; il tetto a 2.100.000 copre gli
 * altri formati, che BytePlus non pubblica pixel per pixel.
 */
export const PIXEL_MASSIMI = { '480p': 424000, '720p': 927408, '1080p': 2100000 };

/**
 * Dollari per token, per canale e risoluzione (pagine ufficiali, 2026-09-27).
 * Un canale che non ha una risoluzione non la ha qui: è così che il resto del
 * codice sa che non la sa fare.
 */
export const DOLLARI_PER_TOKEN = {
  byteplus: { '480p': 10.7 / 1e6, '720p': 10.7 / 1e6, '1080p': 11.7 / 1e6 },
  higgsfield: { '480p': 0.0214 / 1e3, '720p': 0.0214 / 1e3 },
};

export const CANALI = Object.keys(DOLLARI_PER_TOKEN);

/**
 * Cosa sa fare ogni canale, oltre al testo (fetta 3d). Higgsfield vuole le
 * immagini come URL pubblici, e noi non pubblichiamo le immagini dei clienti:
 * per noi, da Higgsfield, si va solo col testo.
 */
export const CAPACITA = {
  byteplus: { immagini: true },
  higgsfield: { immagini: false },
};

/**
 * I ruoli delle immagini di un video. `primo`/`ultimo` sono i fotogrammi di
 * partenza e di arrivo; `riferimento` è un'immagine a cui ispirarsi (un
 * personaggio, un oggetto, uno stile). BytePlus ne accetta 30: qui 9, perché
 * viaggiano in base64 dentro una richiesta sola (tetto: 64 MB).
 */
export const LIMITI_IMMAGINI = { primo: 1, ultimo: 1, riferimento: 9, totale: 9 };
export const RUOLI_VIDEO = ['primo', 'ultimo', 'riferimento'];
/** Il canale su cui si fa il PREZZO: quello ufficiale, il meno caro. */
export const CANALE_DEL_PREZZO = 'byteplus';

export const DURATE = [5, 10, 15];
export const RISOLUZIONI = ['480p', '720p', '1080p'];
export const FORMATI = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

export const VOCE_VIDEO = 'video-seedance25';

const nonValido = (code) => Object.assign(new Error(code), { code });

/** Controlla la richiesta; torna `null` se va bene, o il codice dell'errore. */
export function richiestaVideoNonValida({ durata, risoluzione, formato }) {
  if (!DURATE.includes(durata)) return 'durata';
  if (!RISOLUZIONI.includes(risoluzione)) return 'risoluzione';
  if (!FORMATI.includes(formato)) return 'formato';
  return null;
}

/** Quanti token si pagano, al massimo, per questa durata e risoluzione. */
export function tokenVideo({ durata, risoluzione }) {
  return Math.ceil((PIXEL_MASSIMI[risoluzione] * durata * 24) / 1024);
}

/** Il costo in millesimi di euro, da un canale. Per eccesso: è un costo. */
export function costoVideo({ durata, risoluzione, canale = CANALE_DEL_PREZZO }) {
  const tariffa = DOLLARI_PER_TOKEN[canale]?.[risoluzione];
  if (!tariffa) throw nonValido('canale-sconosciuto');
  const euro = tokenVideo({ durata, risoluzione }) * tariffa * CAMBIO_USD_EUR;
  return Math.ceil(euro * 1000);
}

/**
 * Il prezzo al cliente: sempre sul canale UFFICIALE, qualunque sia acceso.
 * Chi preme vede un numero solo, e non cambia perché il committente ha
 * spostato un interruttore.
 */
export function prezzoVideo({ durata, risoluzione, formato = '16:9' }) {
  const errore = richiestaVideoNonValida({ durata, risoluzione, formato });
  if (errore) throw nonValido(errore);
  return priceFor(costoVideo({ durata, risoluzione, canale: CANALE_DEL_PREZZO }));
}

/**
 * Il cancello del canale: si può generare da `canale` a questo prezzo?
 *
 * No se il canale costa più di quanto il cliente paga — Higgsfield, a listino,
 * costa il doppio. Si passa solo se il committente l'ha deciso
 * (`accettaPerdita`, cioè `VIDEO_ACCETTA_PERDITA=1`): è così che si usa una
 * promozione, apposta e mai per sbaglio.
 */
export function canaleConsentito({ canale, durata, risoluzione, accettaPerdita = false }) {
  if (!DOLLARI_PER_TOKEN[canale]?.[risoluzione]) return false;
  if (accettaPerdita) return true;
  return costoVideo({ durata, risoluzione, canale }) <= prezzoVideo({ durata, risoluzione }).total;
}

/** Il costo VERO, dai token che il fornitore ha contato (o stimato per eccesso). */
export function costoDaToken(token, canale, risoluzione = '720p') {
  const tariffa = DOLLARI_PER_TOKEN[canale]?.[risoluzione];
  if (!Number.isFinite(token) || !tariffa) return null;
  return Math.ceil(token * tariffa * CAMBIO_USD_EUR * 1000);
}

/**
 * Le immagini di una richiesta video sono in regola? `null` se sì, o il
 * codice dell'errore. La stessa funzione la usano il pannello (per non
 * lasciar scegliere una combinazione impossibile) e il Worker (che resta il
 * giudice): due regole scritte in due posti divergono.
 *
 * - i ruoli sono tre, chiusi (`Object.hasOwn`: «toString» non è un ruolo);
 * - al massimo un primo e un ultimo fotogramma; l'ultimo vuole il primo;
 * - i fotogrammi e i riferimenti non si mescolano: sono due tipi di lavoro
 *   diversi per il modello (partire da un'immagine, o ispirarsi a più).
 */
export function immaginiVideoStorte(immagini) {
  if (!Array.isArray(immagini)) return 'immagini';
  if (immagini.length > LIMITI_IMMAGINI.totale) return 'troppe-immagini';
  const conta = { primo: 0, ultimo: 0, riferimento: 0 };
  for (const im of immagini) {
    if (!im || !Object.hasOwn(conta, im.ruolo)) return 'ruolo-sconosciuto';
    conta[im.ruolo] += 1;
  }
  for (const r of RUOLI_VIDEO) if (conta[r] > LIMITI_IMMAGINI[r]) return `troppi-${r}`;
  if (conta.ultimo && !conta.primo) return 'ultimo-senza-primo';
  if ((conta.primo || conta.ultimo) && conta.riferimento) return 'fotogrammi-e-riferimenti';
  return null;
}

/**
 * Da quale canale si genera QUESTA richiesta. Il canale acceso, se la sa
 * fare; altrimenti il canale ufficiale, che sa fare tutto quello che offriamo
 * (1080p e immagini). Il prezzo non cambia: si fa sempre sul canale ufficiale.
 */
export function canalePer({ acceso, risoluzione, immagini = [] }) {
  const sa = (c) => Boolean(DOLLARI_PER_TOKEN[c]?.[risoluzione]) && (immagini.length === 0 || CAPACITA[c]?.immagini);
  if (CANALI.includes(acceso) && sa(acceso)) return acceso;
  return sa(CANALE_DEL_PREZZO) ? CANALE_DEL_PREZZO : null;
}

/** Il «da» della barra: il video più piccolo che si può chiedere. */
export function prezzoMinimoVideo() {
  return prezzoVideo({ durata: DURATE[0], risoluzione: RISOLUZIONI[0] });
}
