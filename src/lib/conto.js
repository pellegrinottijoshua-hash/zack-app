/**
 * Il browser che parla col Worker del conto.
 *
 * Una regola sola, e non è tecnica: **se il server non risponde, non si
 * conclude niente.** La licenza salvata resta valida per la sua grazia (spec
 * § 3.4), e un errore di rete non deve mai diventare «non hai pagato».
 */

const BASE = 'https://api.zack-app.com';

/**
 * Chiede al server chi siamo e se abbiamo pagato.
 *
 * @returns la licenza da salvare, oppure `null` se il server non ha risposto —
 *   che **non** vuol dire «non abbonato»: vuol dire «non lo so», e chi non lo
 *   sa tiene buona l'ultima risposta.
 */
export async function chiediLicenza(token) {
  try {
    const res = await fetch(`${BASE}/me`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      abbonato: d.abbonato === true,
      validoFino: d.validoFino,
      provaFino: d.provaFino,
      crediti: d.crediti ?? 0,
      // La seconda data (spec § 7.1): la mette il browser, adesso, perché dice
      // «quando ho sentito il server», non «cosa ha detto».
      chiestoIl: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
