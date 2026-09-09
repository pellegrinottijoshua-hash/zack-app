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
import { verificaFirma } from './firma.js';
import { cosaFare } from './eventi.js';

const GIORNO = 86400000;

/*
 * Niente intestazioni CORS: il Worker e' lo STESSO che serve il sito, quindi
 * lo studio e `/me` stanno alla stessa origine e non c'e' nessun confine da
 * attraversare. Il `api.zack-app.com` della spec non e' mai esistito — e un
 * pezzo che non c'e' non si puo' rompere.
 */
const json = (dati, stato = 200) =>
  new Response(JSON.stringify(dati), {
    status: stato,
    headers: { 'content-type': 'application/json' },
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

/**
 * Apre il pagamento su Stripe.
 *
 * Il prezzo non si inventa qui: `STRIPE_PREZZO` è l'id del prodotto su
 * Stripe, e la cifra che il cliente vede è quella che Stripe gli fa pagare.
 * Un prezzo scritto due volte diverge al primo ripensamento — e divergere qui
 * vuol dire aver mentito a un cliente che ci aveva creduto sulla parola.
 */
async function checkout(req, env) {
  const sito = new URL(req.url).origin;
  const chi = await chiEsegue(req, env);
  if (!chi) return json({ errore: 'non-collegato' }, 401);
  if (!env.STRIPE_PREZZO || !env.STRIPE_SECRET_KEY) return json({ errore: 'non-configurato' }, 503);

  const corpo = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': env.STRIPE_PREZZO,
    'line_items[0][quantity]': '1',
    customer_email: chi.email,
    // Chi ha pagato lo dice Stripe rimandandoci indietro QUESTO: senza, il
    // webhook arriverebbe senza sapere a chi accreditarlo.
    'metadata[utente]': chi.id,
    /*
     * ⚠️ E ANCHE sull'abbonamento, che è l'altra metà della stessa cura.
     *
     * Il `metadata` della sessione vive quanto la sessione: una volta. Al
     * rinnovo Stripe manda una fattura che discende dall'ABBONAMENTO, e se
     * l'abbonamento non sa di chi è, il rinnovo arriva e non trova nessuno a
     * cui accreditarlo. Il cliente paga il secondo mese e trova il muro,
     * senza che niente si lamenti da nessuna parte.
     */
    'subscription_data[metadata][utente]': chi.id,
    // L'origine da cui e' arrivata la richiesta: sempre giusta, anche in un
    // deploy di prova, e una cosa in meno da configurare a mano.
    success_url: `${sito}/app/?pagato=1`,
    cancel_url: `${sito}/app/`,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: corpo,
  });
  if (!res.ok) return json({ errore: 'stripe' }, 502);
  const s = await res.json();
  return json({ url: s.url });
}

/** Stripe che dice chi ha pagato. */
async function webhookStripe(req, env) {
  /*
   * Il corpo GREZZO, prima di qualunque `json()`: la firma è su quei byte, e
   * un `JSON.parse` seguito da uno `stringify` li cambia — chiavi riordinate,
   * spazi diversi — e la firma non torna più.
   */
  const corpo = await req.text();
  const ok = await verificaFirma(
    corpo,
    req.headers.get('stripe-signature'),
    env.STRIPE_WEBHOOK_SECRET,
  );
  // ⚠️ Qui si esce, e non si discute: un webhook non verificato è un
  // abbonamento gratis per chiunque sappia fare una POST.
  if (!ok) return json({ errore: 'firma' }, 400);

  let evento;
  try {
    evento = JSON.parse(corpo);
  } catch {
    return json({ errore: 'corpo' }, 400);
  }

  const fatto = cosaFare(evento);
  // Niente da fare non è un errore: Stripe manda decine di eventi che non ci
  // riguardano, e rispondere male gli farebbe riprovare all'infinito.
  if (!fatto) return json({ ok: true });

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/conti`, {
    method: 'POST',
    headers: {
      ...conServizio(env),
      // Se la riga c'è si aggiorna, se non c'è nasce: il primo pagamento può
      // arrivare prima che il conto esista.
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(fatto),
  });
  /*
   * Se l'archivio non ha preso, si risponde MALE apposta: Stripe riprova per
   * tre giorni. Rispondere «va bene» a un pagamento che non abbiamo scritto
   * vuol dire perderlo per sempre, in silenzio.
   */
  if (!res.ok) return json({ errore: 'archivio' }, 500);

  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

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

    if (url.pathname === '/checkout' && req.method === 'POST') return checkout(req, env);

    /*
     * Il webhook NON ha l'intestazione CORS e non ne ha bisogno: non lo chiama
     * un browser, lo chiama Stripe. Ed e' l'unica porta che accetta qualcosa
     * da chi non ha fatto il login — per questo la firma si verifica sempre.
     */
    if (url.pathname === '/webhook' && req.method === 'POST') return webhookStripe(req, env);

    // Tutto il resto lo servono i file statici, come prima.
    return env.ASSETS.fetch(req);
  },
};
