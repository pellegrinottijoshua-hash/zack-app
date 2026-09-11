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
import { addebita, rimborsa, rimborsoRiuscito, apriLavoro, chiudiLavoro } from './conto.js';
import { generaConGoogle, immagineValida } from './fornitori/google.js';

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
 * La riga di `conti` di questo utente, creandola con la prova se non c'e'
 * ancora. Torna la riga (nuova o esistente), o `null` se la scrittura non ha
 * preso.
 *
 * Usata da `/me` (dove la prova nasce e si racconta) e da `/ricarica` (Task
 * 1b della revisione): senza questa seconda chiamata, un cliente che paga
 * prima di aver mai aperto `/me` arriva a Stripe senza una riga di `conti` ad
 * aspettarlo, e `accredita` (Task 1a) solleva quando il webhook prova ad
 * accreditarlo — un guasto che Stripe ripete per tre giorni e poi abbandona.
 * `/ricarica` e' l'altro momento in cui sappiamo chi e' e che sta per pagare:
 * meglio garantire la riga qui, prima di aprire il pagamento, che sperare che
 * `/me` sia gia' passato di la'.
 */
async function contoOCrealo(id, env) {
  const esistente = await contoDi(id, env);
  if (esistente) return esistente;

  const prova = new Date(Date.now() + PROVA_GIORNI * GIORNO).toISOString();
  const scritta = await fetch(`${SUPABASE_URL}/rest/v1/conti`, {
    method: 'POST',
    headers: conServizio(env),
    body: JSON.stringify({ utente: id, prova_fino: prova }),
  });
  if (!scritta.ok) return null;
  return { prova_fino: prova, abbonato: false, crediti: 0 };
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

  /*
   * ⚠️ Task 1b della revisione: la riga di `conti` deve esistere PRIMA di
   * mandare il cliente a Stripe, non dopo. `accredita` (Task 1a) adesso
   * SOLLEVA quando il webhook prova ad accreditare un conto che non c'e' —
   * giusto, perche' altrimenti incasserebbe senza accreditare — ma sollevare
   * da sola lascia il rimedio ai soli tentativi di Stripe, che si arrende
   * dopo tre giorni. Qui e' il momento buono: sappiamo gia' chi e' e che sta
   * per pagare, e non serve sperare che `/me` sia gia' passato di la' prima.
   */
  const conto = await contoOCrealo(chi.id, env);
  if (!conto) return json({ errore: 'archivio' }, 500);

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

  const lavoro = crypto.randomUUID();
  // Diventa vero solo se la riga di `lavori` esiste DAVVERO. Serve nel
  // `catch`: `movimenti.lavoro` referenzia `lavori(id)`, e un rimborso che
  // passasse l'id di un lavoro mai creato violerebbe quella chiave esterna
  // — il rimborso fallirebbe proprio quando serve di più.
  let lavoroAperto = false;
  /*
   * ⚠️ Task 4 della revisione: resta `null` finche' `addebita()` non torna
   * DAVVERO — non solo quando il saldo non basta (quel ramo esce subito, sotto,
   * senza mai arrivare al `catch`), ma anche se la sua `fetch` rigetta per un
   * guasto di rete: in quel caso non sappiamo se l'addebito e' passato, e
   * `rimasto` resta questo valore iniziale. Nel `catch` distingue i due mondi:
   * `null` vuol dire «non lo so», un numero vuol dire «l'addebito e' successo
   * per certo».
   */
  let rimasto = null;

  try {
    /*
     * ⚠️ Task 4 della revisione: `addebita()` stava PRIMA di questo `try`.
     * La sua `fetch` verso Supabase puo' rigettare per un guasto di rete (non
     * uno status 4xx/5xx, quello lo dice `res.ok`: qui parliamo di un rigetto
     * vero), ed e' identico al problema che il commento sotto per
     * `apriLavoro` gia' risolveva nello stesso modo — portarla DENTRO,
     * cosi' finisce nello stesso `catch`. Se il rigetto arriva DOPO che
     * Postgres ha gia' commesso, il saldo e' sceso e non c'e' modo di
     * saperlo se non riprovando: si sceglie di fidarsi e tentare comunque il
     * rimborso, la stessa regola gia' scritta qui sotto — «hai incassato per
     * una cosa che non e' successa. Non e' negoziabile» — vale anche quando
     * non si e' sicuri di aver incassato: il dubbio si scioglie a favore del
     * cliente, non della cassa. (L'alternativa era un `try/catch` dentro
     * `addebita()` stessa, ma li' un guasto di rete diventerebbe
     * indistinguibile da «saldo insufficiente» — due esiti che qui devono
     * restare diversi, uno e' un rifiuto onesto, l'altro un guasto da
     * rimborsare.)
     */
    rimasto = await addebita(chi.id, prezzo, env);
    // `null` = il saldo non bastava, e non è successo niente. 402 è lo stato
    // che vuol dire esattamente «servono soldi». E' un `return` dentro il
    // `try`, non un `throw`: esce diretto, senza passare dal `catch` — non
    // c'e' niente da rimborsare per un addebito che non e' mai avvenuto.
    if (rimasto === null) return json({ errore: 'saldo', prezzo }, 402);

    // ⚠️ DENTRO il `try`, non prima: `apriLavoro` fa una `fetch` verso
    // Supabase, e una `fetch` che solleva per un guasto di rete (non uno
    // status 4xx, quello lo dice `res.ok`) uscirebbe da `genera()` senza che
    // nessuno la prenda — non c'è un catch a livello di `export default
    // { fetch }`. L'addebito sarebbe già avvenuto, nessun rimborso verrebbe
    // tentato, e non esisterebbe nemmeno una riga in `lavori` per lo
    // spazzino del Task 5. Sollevare qui invece finisce nel `catch` qui
    // sotto, e il cliente viene rimborsato come per ogni altro fallimento.
    lavoroAperto = await apriLavoro({ id: lavoro, utente: chi.id, servizio, prezzo }, env);
    if (!lavoroAperto) throw Object.assign(new Error('archivio'), { code: 'archivio' });

    // ⚠️ `Object.hasOwn`, non `?.` (Task 8): `?.[misura]` guarda anche la
    // catena dei prototipi come farebbe `in`, quindi `misura: 'toString'`
    // trova `Object.prototype.toString` — una funzione, non una misura. E'
    // truthy, quindi `||` non scatta: Google riceverebbe quella funzione al
    // posto di '1K'/'2K', `JSON.stringify` la elimina dal corpo (i valori
    // funzione spariscono dalle proprieta' degli oggetti), e Google vede un
    // `imageConfig` senza `imageSize` — 200, non 400. E' la stessa trappola
    // che `riferimentiStorti` evita quaranta righe sopra.
    const misuraGoogle = (voce.misure && Object.hasOwn(voce.misure, misura))
      ? voce.misure[misura]
      : voce.misure?.grande || '1K';
    const { dati, mime, costoReale } = await generaConGoogle({
      voce, prompt, riferimenti, misura: misuraGoogle, env,
    });

    /*
     * ⚠️ Task 3 della revisione: `chiudiLavoro` buttava via `res.ok`. Se la
     * PATCH `stato: 'fatto'` non prendeva, si rispondeva 200 col JPEG e il
     * lavoro restava 'in-corso' — un'ora dopo lo spazzino lo trovava e lo
     * rimborsava: il cliente teneva l'immagine E i soldi, e noi avevamo
     * pagato Google. Un secondo tentativo copre un guasto isolato (una PATCH
     * che scade, una rete che singhiozza); se fallisce anche quello, meglio
     * dirlo nella risposta e lasciarne traccia nei log che scoprirlo mesi
     * dopo da un saldo che non torna.
     */
    let chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) chiuso = await chiudiLavoro(lavoro, 'fatto', costoReale, env);
    if (!chiuso) {
      console.error(`chiudiLavoro('${lavoro}', 'fatto') ha fallito due volte: il lavoro resta 'in-corso' e lo spazzino lo rimborserebbe fra trenta minuti nonostante sia riuscito`);
    }
    return json({
      dati, mime, prezzo, saldo: rimasto, lavoro,
      ...(chiuso ? {} : { avviso: 'lavoro-non-chiuso' }),
    });
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
     *
     * L'id del lavoro si passa solo se la riga esiste davvero — altrimenti
     * `null`, che `accredita` accetta (`p_lavoro` ha default `null`): con la
     * riga mai creata, passare comunque `lavoro` violerebbe la chiave
     * esterna e farebbe fallire anche il rimborso.
     */
    const esito = await rimborsa(chi.id, prezzo, lavoroAperto ? lavoro : null, env);
    if (await rimborsoRiuscito(esito)) {
      if (lavoroAperto) await chiudiLavoro(lavoro, 'rimborsato', null, env);
      // `rimasto` resta `null` solo nel caso nuovo del Task 4: `addebita()`
      // stessa ha rigettato, e non si sa quale fosse il saldo prima. Meglio
      // dire «non lo so» (il browser tiene buono l'ultimo saldo noto, come
      // fa gia' per `/me`) che inventare un numero da un `rimasto` che non
      // e' mai esistito.
      return json({
        errore: 'fornitore', dettaglio: e.code || 'ignoto',
        saldo: rimasto === null ? null : rimasto + prezzo,
      }, 502);
    }
    /*
     * Il rimborso non ha preso: la riga (se esiste) NON si tocca, resta
     * 'in-corso' com'è nata — lo spazzino ci riprova fra trenta minuti.
     *
     * ⚠️ Caso peggiore: riga mai creata E rimborso fallito. Lì lo spazzino
     * non può aiutare — guarda solo `lavori`, e qui non c'è nessuna riga da
     * ritrovare. Il denaro uscito resta comunque tracciato: la funzione SQL
     * `addebita` ha già scritto il movimento di spesa nella stessa
     * transazione dell'addebito, prima ancora che si arrivasse qui. La
     * riconciliazione lo vede lì, non in `lavori`.
     */
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
    // Object) supererebbe il controllo. Da lì `conta['toString'] += 1` NON fa
    // `NaN`: forza la funzione ereditata `Object.prototype.toString` a
    // stringa e la scrive come proprietà PROPRIA di `conta` — che il
    // controllo dei limiti qui sotto legge con `Object.keys`. Quella
    // stringa, per puro caso, risulta lessicograficamente maggiore della
    // gemella non incrementata letta da `limiti['toString']` (la stessa
    // funzione ereditata, mai chiamata): il confronto dà `true` per
    // coincidenza e produce un 400 vero ma con l'errore sbagliato
    // (`troppi-toString` invece di `ruolo-sconosciuto`).
    if (!Object.hasOwn(conta, r?.ruolo)) return 'ruolo-sconosciuto';
    /*
     * ⚠️ Task 2 della revisione: senza questo controllo, un riferimento la
     * cui `immagine` non e' un `data:` valido passa QUI, viene ADDEBITATO
     * (il prezzo conta `riferimenti.length`, non quanti sopravvivono), e
     * sparisce in silenzio dietro `riferimenti.map(pezzo).filter(Boolean)`
     * in `worker/fornitori/google.js`: il cliente paga per N riferimenti,
     * Google ne vede M. Stesso criterio di `pezzo()` — non una copia — e
     * PRIMA dell'addebito, non dopo.
     */
    if (!immagineValida(r)) return 'riferimento-illeggibile';
    conta[r.ruolo] += 1;
  }
  for (const ruolo of Object.keys(conta)) {
    if (conta[ruolo] > limiti[ruolo]) return `troppi-${ruolo}`;
  }
  return null;
}

/** Oltre questo, un lavoro non sta lavorando: è appeso. */
const APPESO_MINUTI = 30;

/**
 * Ogni ora: i lavori rimasti a metà si rimborsano.
 *
 * Trenta minuti perché è molto più di qualunque generazione — le immagini sono
 * secondi, i video di B3 minuti — e molto meno della pazienza di chi ha pagato.
 *
 * Un lavoro davvero lento che finisce **dopo** il rimborso trova il proprio
 * `lavoro` già chiuso e non riaddebita: meglio regalare una generazione che
 * addebitarne una già restituita.
 *
 * ⚠️ Si guarda l'esito di OGNI passo, e non per zelo. Se si chiudesse il
 * lavoro senza guardare se `rimborsa()` è passato, un rimborso fallito
 * verrebbe marcato 'rimborsato' lo stesso — la stessa maschera che il
 * Task 4 ha tolto dal `catch` di `/genera`; qui il lavoro resta 'in-corso'
 * e ci si riprova al giro dopo, che è il mestiere di questa funzione. E se
 * invece `rimborsa()` passa ma la `chiudiLavoro` che segue fallisce (una
 * PATCH storta), il lavoro resta 'in-corso' e il giro dell'ora dopo ci
 * riprova: senza la chiave di idempotenza dentro `rimborsa()`, quel secondo
 * tentativo pagherebbe DI NUOVO lo stesso lavoro, e quello dopo ancora — una
 * perdita illimitata, un lavoro alla volta. `rimborsoRiuscito()` legge quel
 * secondo tentativo come «già rimborsato», non come un errore: il saldo non
 * si tocca due volte, ma il lavoro si chiude comunque.
 */
async function sbloccaAppesi(env) {
  const limite = new Date(Date.now() - APPESO_MINUTI * 60000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lavori?stato=eq.in-corso&creato_il=lt.${limite}&select=*`,
    { headers: conServizio(env) },
  );
  if (!res.ok) return;
  for (const l of await res.json()) {
    const esito = await rimborsa(l.utente, l.prezzo, l.id, env);
    if (await rimborsoRiuscito(esito)) {
      await chiudiLavoro(l.id, 'rimborsato', null, env);
    }
    // Se non e' riuscito (e non era un duplicato), il lavoro resta
    // 'in-corso' com'e' nato: ci si riprova al prossimo giro, fra un'ora.
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/me') {
      const chi = await chiEsegue(req, env);
      if (!chi) return json({ errore: 'non-collegato' }, 401);

      /*
       * La prova nasce alla PRIMA apparizione e poi si rilegge — la crea
       * `contoOCrealo` qui sopra, la stessa funzione che usa `/ricarica`
       * (Task 1b): un solo posto che sa come nasce una riga di `conti`.
       *
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
      const conto = await contoOCrealo(chi.id, env);
      if (!conto) return json({ errore: 'archivio' }, 500);

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

  async scheduled(evento, env) {
    await sbloccaAppesi(env);
  },
};
