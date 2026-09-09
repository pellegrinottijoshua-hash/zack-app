/**
 * Il browser che parla col Worker del conto.
 *
 * Una regola sola, e non è tecnica: **se il server non risponde, non si
 * conclude niente.** La licenza salvata resta valida per la sua grazia (spec
 * § 3.4), e un errore di rete non deve mai diventare «non hai pagato».
 */

import { SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA } from './supabase.js';

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

/* ------------------------------------------------------------------ *
 * L'ingresso.
 *
 * Niente password. Una password e' una cosa da custodire, da reimpostare,
 * da limitare nei tentativi e da non farsi rubare: non averla toglie tutto
 * quel lavoro e tutta quella superficie. La scelta migliore e' quella che
 * non c'e'.
 * ------------------------------------------------------------------ */

let _cliente = null;

/**
 * Il collegamento a Supabase, caricato solo quando serve.
 *
 * L'`import()` e' dinamico apposta: `@supabase/supabase-js` porta con se'
 * anche archivio e realtime, che a questo prodotto non servono, e un pacco
 * del genere non deve stare sulla strada del primo disegno dello studio.
 * Chi apre lo studio vede prima gli strumenti, poi il conto.
 */
async function cliente() {
  if (_cliente) return _cliente;
  const { createClient } = await import('@supabase/supabase-js');
  _cliente = createClient(SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA);
  return _cliente;
}

/** Un link via email. */
export async function entraConEmail(email) {
  const sb = await cliente();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/app/` },
  });
  if (error) throw new Error(error.message);
}

export async function entraConGoogle() {
  const sb = await cliente();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/app/` },
  });
  if (error) throw new Error(error.message);
}

/**
 * Il token di adesso, o `null`.
 *
 * `null` vuol dire «non e' entrato nessuno», non «errore»: se Supabase non
 * risponde, chi ha gia' una licenza salvata continua a lavorare per la sua
 * grazia, e non deve accorgersi di niente.
 */
export async function sessione() {
  try {
    const sb = await cliente();
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function esci() {
  const sb = await cliente();
  await sb.auth.signOut();
}
