/**
 * Il Worker del conto.
 *
 * Sa **chi sei** e **se hai pagato**. Non vede i tuoi file, la tua libreria, le
 * tue tele né le tue registrazioni: quelli non escono dal browser, ed è un
 * vincolo del prodotto, non una preferenza (spec § 4.1).
 *
 * Sta su Cloudflare perché il sito è già lì: stesso deploy, stessa bolletta,
 * nessun fornitore nuovo per l'infrastruttura.
 */

import { PROVA_GIORNI } from '../src/engine/licenza.js';

const GIORNO = 86400000;

const json = (dati, stato = 200) =>
  new Response(JSON.stringify(dati), {
    status: stato,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': 'https://zack-app.com',
    },
  });

/**
 * Chi sta chiedendo.
 *
 * Il token viene da Supabase e **lo verifica Supabase**: gli si chiede invece
 * di controllare noi una firma JWT. Verificare i token a mano è precisamente
 * il genere di codice che sembra giusto per anni e non lo è.
 */
async function chiEsegue(req, env) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: env.SUPABASE_CHIAVE_PUBBLICA },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? { id: u.id, email: u.email } : null;
}

const conServizio = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
});

/** La riga di `conti` di questo utente, o `null`. */
async function contoDi(id, env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/conti?utente=eq.${id}&select=*`, {
    headers: conServizio(env),
  });
  if (!res.ok) return null;
  const righe = await res.json();
  return righe[0] || null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': 'https://zack-app.com',
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        },
      });
    }

    if (url.pathname === '/me') {
      const chi = await chiEsegue(req, env);
      if (!chi) return json({ errore: 'non-collegato' }, 401);

      let conto = await contoDi(chi.id, env);

      /*
       * La prova nasce alla PRIMA apparizione e poi si rilegge.
       *
       * Calcolarla a ogni chiamata — «da adesso, quattordici giorni» — dà una
       * prova che non finisce mai: un difetto che non si vede provando, si
       * vede fra due settimane quando nessuno ha ancora pagato.
       */
      if (!conto) {
        const prova = new Date(Date.now() + PROVA_GIORNI * GIORNO).toISOString();
        await fetch(`${env.SUPABASE_URL}/rest/v1/conti`, {
          method: 'POST',
          headers: conServizio(env),
          body: JSON.stringify({ utente: chi.id, prova_fino: prova }),
        });
        conto = { prova_fino: prova, abbonato: false, crediti: 0 };
      }

      return json({
        email: chi.email,
        abbonato: conto.abbonato === true,
        validoFino: conto.valido_fino || null,
        provaFino: conto.prova_fino || null,
        // Il campo esiste da subito e vale zero finché B2 non lo riempie:
        // aggiungerlo dopo vorrebbe dire cambiare una risposta a cui lo studio
        // si è già abituato.
        crediti: conto.crediti ?? 0,
      });
    }

    // Tutto il resto lo servono i file statici, come prima.
    return env.ASSETS.fetch(req);
  },
};
