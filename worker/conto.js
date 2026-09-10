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
 * guardare l'esito con `rimborsoRiuscito()`, perché un rimborso che fallisce
 * (rete, 500, Supabase giù) è denaro del cliente perso in silenzio se
 * nessuno se ne accorge — vedi il ramo `catch` di `/genera` in `index.js`, e
 * `sbloccaAppesi` nello stesso file.
 *
 * ⚠️ `p_stripe` qui non è un evento Stripe: è presa in prestito come chiave
 * di idempotenza. La colonna si chiama `stripe_evento` e ha un vincolo
 * `unique` (Task 3, contro i webhook rimandati); un rimborso porta sempre lo
 * stesso `'rimborso:<id-lavoro>'`, quindi un secondo tentativo sullo STESSO
 * lavoro viola quell'unique e la transazione non tocca il saldo una seconda
 * volta. Senza questo, lo spazzino del Task 5 — che non sa se un rimborso
 * precedente è già passato — regalerebbe soldi a ogni giro sullo stesso
 * lavoro appeso, all'infinito. Non si rinomina la colonna: toccherebbe il
 * Task 3, già chiuso.
 *
 * `null` quando non c'è un id di lavoro (il caso peggiore del Task 4, riga
 * mai creata): `accredita` lo accetta come `p_lavoro`, e qui non c'è nessun
 * lavoro a cui legare una chiave.
 */
export async function rimborsa(utente, prezzo, lavoro, env) {
  return rpc('accredita', {
    p_utente: utente,
    p_millesimi: prezzo,
    p_genere: 'rimborso',
    p_lavoro: lavoro,
    p_stripe: lavoro ? `rimborso:${lavoro}` : null,
  }, env);
}

/**
 * Un rimborso è riuscito anche quando è un duplicato: la chiave di
 * idempotenza di `rimborsa()` fa fallire il secondo tentativo sullo stesso
 * lavoro con la stessa violazione `unique` (`23505`/409) che il Task 3 usa
 * contro i webhook rimandati — e lì significa «i soldi sono già tornati»,
 * non «è andato storto».
 *
 * Va riletto così sia nel `catch` di `/genera` sia in `sbloccaAppesi`: se un
 * duplicato venisse trattato come fallimento, il lavoro resterebbe
 * 'in-corso' per un rimborso che c'era già stato, e lo spazzino ci
 * girerebbe intorno in eterno.
 */
export async function rimborsoRiuscito(res) {
  if (res.ok) return true;
  const testo = await res.text().catch(() => '');
  return res.status === 409 || testo.includes('23505');
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
 *
 * Torna `res.ok`: chi chiama deve sapere se la riga esiste DAVVERO, perché
 * un rimborso che passasse l'id di un lavoro mai creato violerebbe la chiave
 * esterna di `movimenti.lavoro` — vedi il ramo `catch` di `genera()`.
 */
export async function apriLavoro({ id, utente, servizio, prezzo }, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/lavori`, {
    method: 'POST',
    headers: intestazioni(env),
    body: JSON.stringify({ id, utente, servizio, prezzo, stato: 'in-corso' }),
  });
  return res.ok;
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
