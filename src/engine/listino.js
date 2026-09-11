/**
 * Cosa costa ogni servizio a pagamento, e quanti riferimenti accetta.
 *
 * Un posto solo. I fornitori che arrivano — Seedance per i video, ElevenLabs
 * per le voci — aggiungono **una riga qui** e un adattatore: se aggiungerne
 * uno costasse di più, il giro della generazione avrebbe sbagliato forma
 * (spec § 3.3).
 *
 * I costi sono in **millesimi di euro**, e sono una fotografia: il fornitore
 * incassa in dollari e noi in euro, quindi vanno riguardati. `lavori.costo_reale`
 * dice quando questa riga ha smesso di essere vera.
 */
import { priceFor } from './ledger.js';

export const LISTINO = {
  'immagine-nbp': {
    fornitore: 'google',
    // Entrambi rispondono; si usa lo stabile (misura del 2026-09-10).
    modello: 'gemini-3-pro-image',
    /*
     * MISURATO, non letto da un listino pubblicato: 126 millesimi a zero
     * riferimenti, 131 a cinque, 133 a quattordici. La base è 128 e non 126
     * perché i token di «pensiero» ballano di ±2 fra una chiamata e l'altra:
     * a 127 la stima a cinque riferimenti (127 + 3 = 130) sarebbe scesa
     * SOTTO il 131 misurato quella volta — un millesimo che basta a rompere
     * «la stima non sta mai sotto il costo vero» (revisione, Task 6). A 128
     * resta sopra in tutt'e tre i casi, anche quando il conteggio dei token
     * di pensiero sale.
     *
     * Il 4K costa il doppio e non lo facciamo. Il 2K invece **costa uguale al
     * 1K**: stessi 1120 token d'immagine, quattro volte i pixel.
     */
    costo: 128,
    /** Mezzo millesimo per riferimento: 258 token l'uno, a 768 px. */
    costoPerRiferimento: 0.5,
    // Google risponde JPEG, sempre. Non PNG, come diceva la prima stesura.
    resa: 'jpeg',
    etichetta: 'listino.immagine',
    riferimenti: { personaggio: 5, oggetto: 6, stile: 3, totale: 14 },
    /** Le due misure fra cui sceglie il cliente. Stesso prezzo. */
    misure: { rapida: '1K', grande: '2K' },
  },
};

const NESSUN_RIFERIMENTO = { personaggio: 0, oggetto: 0, stile: 0, totale: 0 };

/**
 * Quanto costa una generazione, **coi suoi riferimenti**.
 *
 * Il prezzo sale con loro perché il costo sale con loro: un riferimento vale
 * 258 token, cioè mezzo millesimo (misurato il 2026-09-10). A prezzo fisso il
 * margine dichiarato sarebbe il 15,4% su una richiesta nuda e il 10,7% su una
 * con quattordici — cioè una frase falsa sulla home in tutt'e due i versi.
 *
 * E il numero si sa **prima di premere**, perché i riferimenti sono già stati
 * scelti quando si preme. La promessa resta letterale.
 */
export function prezzoDi(servizio, { riferimenti = 0 } = {}) {
  const voce = LISTINO[servizio];
  if (!voce) {
    throw Object.assign(new Error(`servizio-sconosciuto: ${servizio}`), {
      code: 'servizio-sconosciuto',
    });
  }
  const n = Number.isInteger(riferimenti) && riferimenti > 0 ? riferimenti : 0;
  return priceFor(voce.costo + Math.round(n * (voce.costoPerRiferimento || 0)));
}

/**
 * Quanti riferimenti accetta, per ruolo.
 *
 * Un servizio che non li dichiara ne accetta **zero**, invece di lasciar
 * passare immagini a un fornitore che non sa cosa farsene — e che le
 * addebiterebbe lo stesso.
 */
export function limitiDi(servizio) {
  return LISTINO[servizio]?.riferimenti || NESSUN_RIFERIMENTO;
}
