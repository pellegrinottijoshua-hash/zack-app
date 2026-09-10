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
/*
 * Le due chiavi pubbliche le importa dallo STESSO file del browser.
 *
 * Non perche' sia comodo: perche' devono combaciare. Se il Worker
 * interrogasse un progetto Supabase e lo studio un altro, i token del secondo
 * non varrebbero niente per il primo, e `/me` risponderebbe 401 a chi e'
 * entrato regolarmente. Un valore scritto in due posti diverge al primo
 * ripensamento — e' la stessa regola del prezzo.
 *
 * Sono pubbliche: stanno nel bundle comunque. La chiave di servizio, quella
 * sì pericolosa, resta un segreto vero e non compare da nessuna parte.
 */
import { SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA } from '../src/lib/supabase.js';
import { verificaFirma } from './firma.js';
import { cosaFare, ricaricaDa, PACCHETTI } from './eventi.js';
import { LISTINO, prezzoDi, limitiDi } from '../src/engine/listino.js';
import { addebita, rimborsa, apriLavoro, chiudiLavoro } from './conto.js';
import { generaConGoogle } from './fornitori/google.js';

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

  /*
   * Se qualcosa va storto si dice «non collegato», non si esplode.
   *
   * Un'eccezione non gestita in un Worker e' una pagina d'errore di Cloudflare
   * al posto del sito — e questo Worker serve anche il sito. Supabase giu', un
   * timeout, una risposta che non e' JSON: fallire chiuso e in silenzio e'
   * l'unica risposta che non fa danno a chi stava solo aprendo la home.
   */
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_CHIAVE_PUBBLICA },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u?.id ? { id: u.id, email: u.email } : null;
  } catch {
    return null;
  }
}

const conServizio = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
});

/** La riga di `conti` di questo utente, o `null`. */
async function contoDi(id, env) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/conti?utente=eq.${id}&select=*`, {
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

/**
 * Apre il pagamento di un pacchetto di crediti.
 *
 * `price_data` invece di un Price su Stripe: tre pacchetti sono tre righe qui,
 * non tre prodotti da creare a mano nel pannello e da tenere allineati.
 */
async function ricarica(req, env) {
  const chi = await chiEsegue(req, env);
  if (!chi) return json({ errore: 'non-collegato' }, 401);
  if (!env.STRIPE_SECRET_KEY) return json({ errore: 'non-configurato' }, 503);

  const { pacchetto } = await req.json().catch(() => ({}));
  const scelto = PACCHETTI[pacchetto];
  // ⚠️ Il prezzo viene dall'ID, non dal corpo. Un client che dichiara «25 €»
  // pagandone 5 non deve poter esistere.
  if (!scelto) return json({ errore: 'pacchetto-sconosciuto' }, 400);

  const sito = new URL(req.url).origin;
  const corpo = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(scelto.centesimi),
    'line_items[0][price_data][product_data][name]': `Crediti Zack — ${scelto.centesimi / 100} €`,
    'line_items[0][quantity]': '1',
    customer_email: chi.email,
    'metadata[utente]': chi.id,
    'metadata[millesimi]': String(scelto.millesimi),
    success_url: `${sito}/app/?ricaricato=1`,
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

  const soldi = ricaricaDa(evento);
  if (soldi) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/accredita`, {
      method: 'POST',
      headers: conServizio(env),
      body: JSON.stringify({
        p_utente: soldi.utente,
        p_millesimi: soldi.millesimi,
        p_genere: 'ricarica',
        p_stripe: soldi.evento,
      }),
    });
    if (!res.ok) {
      /*
       * ⚠️ Il duplicato si riconosce con una condizione ALLARGATA, apposta.
       *
       * Il vincolo `unique` su `movimenti.stripe_evento` fa fallire l'insert
       * con l'errore Postgres `23505`, e PostgREST lo traduce in HTTP 409 —
       * quasi certamente. Ma il 409 e' l'UNICA difesa contro un rinvio che
       * gira in tondo: se PostgREST rispondesse alla stessa violazione con un
       * altro stato, «solo 409 = va bene» risponderebbe 500, e Stripe
       * riproverebbe lo STESSO webhook per giorni, respinto ogni volta. Si
       * guarda anche dentro il corpo, per lo stesso `23505` — letto come
       * testo, non come JSON, cosi' un corpo vuoto o non-JSON non fa
       * esplodere niente, semplicemente non contiene quella stringa.
       */
      const testo = await res.text().catch(() => '');
      const duplicato = res.status === 409 || testo.includes('23505');
      if (!duplicato) return json({ errore: 'archivio' }, 500);
    }
    return json({ ok: true });
  }

  const fatto = cosaFare(evento);
  // Niente da fare non è un errore: Stripe manda decine di eventi che non ci
  // riguardano, e rispondere male gli farebbe riprovare all'infinito.
  if (!fatto) return json({ ok: true });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/conti`, {
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

/**
 * Genera. **Addebita prima, chiama dopo, e se fallisce restituisce.**
 *
 * L'ordine non è comodità: addebitare dopo la chiamata vorrebbe dire che due
 * schede in parallelo fanno due generazioni col credito per una, e la seconda
 * la paghiamo noi al fornitore.
 */
async function genera(req, env) {
  const chi = await chiEsegue(req, env);
  if (!chi) return json({ errore: 'non-collegato' }, 401);

  // ⚠️ `'grande'` (2K) e non `'rapida'` (1K): costano uguale — stessi 1120
  // token d'immagine, misurato — e il 2K dà quattro volte i pixel per tre
  // secondi in più. Non c'è ragione di offrire di meno per default.
  const { servizio, prompt, riferimenti = [], misura = 'grande' } = await req.json().catch(() => ({}));

  const voce = LISTINO[servizio];
  if (!voce) return json({ errore: 'servizio-sconosciuto' }, 400);
  if (typeof prompt !== 'string' || !prompt.trim()) return json({ errore: 'senza-prompt' }, 400);

  // I limiti vengono dal listino, non da costanti scritte qui: il fornitore
  // successivo porta i suoi e questo codice non si tocca.
  const errRif = riferimentiStorti(riferimenti, limitiDi(servizio));
  if (errRif) return json({ errore: errRif }, 400);

  // ⚠️ Il prezzo dipende da QUANTI riferimenti, e questo e' lo stesso conto
  // che il browser ha mostrato prima del tasto: stessa funzione, stesso
  // numero. Se qui si dimenticasse `{ riferimenti }`, si addebiterebbe una
  // cifra diversa da quella promessa — che e' esattamente il § 3.1.
  const { total: prezzo } = prezzoDi(servizio, { riferimenti: riferimenti.length });

  const rimasto = await addebita(chi.id, prezzo, env);
  // `null` = il saldo non bastava, e non è successo niente. 402 è lo stato che
  // vuol dire esattamente «servono soldi».
  if (rimasto === null) return json({ errore: 'saldo', prezzo }, 402);

  const lavoro = crypto.randomUUID();
  await apriLavoro({ id: lavoro, utente: chi.id, servizio, prezzo }, env);

  try {
    const misuraGoogle = voce.misure?.[misura] || voce.misure?.grande || '1K';
    const { dati, mime, costoReale } = await generaConGoogle({
      voce, prompt, riferimenti, misura: misuraGoogle, env,
    });
    await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    return json({ dati, mime, prezzo, saldo: rimasto, lavoro });
  } catch (e) {
    /*
     * Hai incassato per una cosa che non è successa. Non è negoziabile — ma
     * il rimborso stesso può fallire (rete, un 500, Supabase giù), e
     * `rimborsa()` torna la `Response` grezza apposta perché quell'esito si
     * possa guardare.
     *
     * Se non prendesse e si rispondesse lo stesso «rimborsato», il cliente
     * leggerebbe soldi tornati che non sono tornati, il lavoro passerebbe a
     * 'rimborsato', e lo spazzino del Task 5 — che raccoglie SOLO i lavori
     * 'in-corso' — non lo ritroverebbe mai più. Nessuno se ne accorgerebbe.
     *
     * Si lascia invece il lavoro 'in-corso': lo spazzino ci riprova fra
     * trenta minuti, che è il mestiere per cui esiste. E si risponde col
     * saldo che risulta DAVVERO (`rimasto`, il saldo dopo l'addebito), non
     * con quello sperato (`rimasto + prezzo`).
     */
    const esito = await rimborsa(chi.id, prezzo, lavoro, env);
    if (esito.ok) {
      await chiudiLavoro(lavoro, 'rimborsato', null, env);
      return json({ errore: 'fornitore', dettaglio: e.code || 'ignoto', saldo: rimasto + prezzo }, 502);
    }
    return json({ errore: 'fornitore', dettaglio: e.code || 'ignoto', saldo: rimasto }, 502);
  }
}

/** I riferimenti stanno nei limiti? Il nome del limite rotto, o `null`. */
function riferimentiStorti(riferimenti, limiti) {
  if (!Array.isArray(riferimenti)) return 'riferimenti-storti';
  if (riferimenti.length > limiti.totale) return 'troppi-riferimenti';
  const conta = { personaggio: 0, oggetto: 0, stile: 0 };
  for (const r of riferimenti) {
    // ⚠️ `Object.hasOwn`, non `in`: `in` guarda anche la catena dei
    // prototipi, quindi un riferimento con `ruolo: 'toString'` (ereditato da
    // Object) supererebbe il controllo e `conta['toString'] += 1` farebbe
    // NaN — scavalcando i limiti per ruolo senza che nessuno se ne accorga.
    if (!Object.hasOwn(conta, r?.ruolo)) return 'ruolo-sconosciuto';
    conta[r.ruolo] += 1;
  }
  for (const ruolo of Object.keys(conta)) {
    if (conta[ruolo] > limiti[ruolo]) return `troppi-${ruolo}`;
  }
  return null;
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
        const scritta = await fetch(`${SUPABASE_URL}/rest/v1/conti`, {
          method: 'POST',
          headers: conServizio(env),
          body: JSON.stringify({ utente: chi.id, prova_fino: prova }),
        });

        /*
         * ⚠️ Se la scrittura non prende, NON si regala la prova lo stesso.
         *
         * Ignorare l'esito era il difetto che il piano avvertiva di evitare,
         * entrato dalla porta di servizio: ricalcolare la prova a ogni
         * chiamata da' una prova che non finisce mai — e una scrittura che
         * fallisce in silenzio fa esattamente quello, perche' la volta dopo
         * `conto` e' ancora vuoto e nascono altri quattordici giorni.
         *
         * Il guasto vero e' che non si vede: sullo schermo la prova c'e', e
         * uno la prova, la vede, e va via convinto. Si scoprirebbe fra due
         * settimane, quando non ha ancora pagato nessuno.
         *
         * Rispondere male e' l'unica cosa onesta: il browser lo legge come
         * «non lo so» e tiene buona l'ultima risposta salvata (§ 3.4), e
         * l'errore diventa rumoroso invece che invisibile.
         */
        if (!scritta.ok) return json({ errore: 'archivio' }, 500);

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
    if (url.pathname === '/ricarica' && req.method === 'POST') return ricarica(req, env);
    if (url.pathname === '/genera' && req.method === 'POST') return genera(req, env);

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
