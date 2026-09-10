/**
 * I quattro gesti che muovono il conto. Un posto solo.
 *
 * Sparsi dentro `index.js` diventerebbero quattro varianti leggermente diverse
 * al terzo fornitore, e una di quelle varianti dimenticherebbe il rimborso.
 */
import { SUPABASE_URL } from '../src/lib/supabase.js';

const intestazioni = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
});

const rpc = (nome, dati, env) =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: intestazioni(env),
    body: JSON.stringify(dati),
  });

/**
 * Toglie il prezzo dal saldo. Torna quel che resta, o `null` se non bastava.
 *
 * ⚠️ `null` vuol dire **non è successo niente**: la guardia sta dentro
 * l'`UPDATE` (Task 2), quindi o si addebita o non si tocca il saldo. Non c'è
 * un caso di mezzo, ed è per questo che due schede non possono spendere lo
 * stesso denaro.
 */
export async function addebita(utente, prezzo, env) {
  const res = await rpc('addebita', { p_utente: utente, p_prezzo: prezzo }, env);
  if (!res.ok) return null;
  const rimasto = await res.json();
  return rimasto === null ? null : Number(rimasto);
}

/**
 * Ridà i soldi. È la risposta a ogni fallimento, e non è negoziabile.
 *
 * Torna la `Response` grezza e non un booleano: chi chiama deve poter
 * guardare `.ok`, perché un rimborso che fallisce (rete, 500, Supabase giù)
 * è denaro del cliente perso in silenzio se nessuno se ne accorge — vedi il
 * ramo `catch` di `/genera` in `index.js`.
 */
export async function rimborsa(utente, prezzo, lavoro, env) {
  return rpc('accredita', {
    p_utente: utente, p_millesimi: prezzo, p_genere: 'rimborso', p_lavoro: lavoro,
  }, env);
}

/**
 * Apre il lavoro: quel che è stato chiesto, e quanto.
 *
 * Crea **solo** la riga di `lavori`. Il movimento di spesa non si scrive
 * qui: lo scrive `addebita()` del Task 2 (la funzione SQL, non questa),
 * dentro la STESSA transazione dell'`UPDATE` che toglie il saldo — vedi
 * `docs/2026-09-10-schema-b2.sql`. Se questa funzione ne inserisse un
 * secondo, ogni generazione lascerebbe DUE movimenti di spesa invece di uno,
 * e lo storico conterebbe il doppio delle uscite: proprio il numero con cui
 * si dimostra «di ogni euro, Zack ne rimette 12 centesimi» direbbe il falso.
 */
export async function apriLavoro({ id, utente, servizio, prezzo }, env) {
  await fetch(`${SUPABASE_URL}/rest/v1/lavori`, {
    method: 'POST',
    headers: intestazioni(env),
    body: JSON.stringify({ id, utente, servizio, prezzo, stato: 'in-corso' }),
  });
}

/** Chiude il lavoro, col costo vero se c'è. */
export async function chiudiLavoro(id, stato, costoReale, env) {
  await fetch(`${SUPABASE_URL}/rest/v1/lavori?id=eq.${id}`, {
    method: 'PATCH',
    headers: intestazioni(env),
    body: JSON.stringify({
      stato,
      costo_reale: costoReale ?? null,
      chiuso_il: new Date().toISOString(),
    }),
  });
}
