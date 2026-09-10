/**
 * Il browser che parla col Worker del conto.
 *
 * Una regola sola, e non è tecnica: **se il server non risponde, non si
 * conclude niente.** La licenza salvata resta valida per la sua grazia (spec
 * § 3.4), e un errore di rete non deve mai diventare «non hai pagato».
 */

import { SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA } from './supabase.js';

/**
 * Dove sta il Worker: **qui**, alla stessa origine del sito.
 *
 * La spec disegnava un `api.zack-app.com` a parte, e per un po' questo file
 * l'ha chiamato davvero — ma nessuno serviva quel nome. `wrangler.jsonc`
 * pubblica UN Worker su `zack-app.com`, che risponde a `/me` e lascia passare
 * tutto il resto ai file statici. Chiamare un dominio che non esiste voleva
 * dire: `/me` fallisce sempre, `chiediLicenza` torna sempre «non lo so», e
 * dopo sette giorni di grazia il muro si alza a TUTTI, paganti compresi.
 *
 * Stessa origine e' anche meglio di com'era disegnato: niente CORS, niente
 * preflight, niente sottodominio da configurare. Un pezzo che non c'e' non si
 * puo' rompere.
 */
const BASE = '';

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

/** La misura su cui il listino ha contato i token. Non è un caso: è una misura. */
const LATO_RIFERIMENTO = 768;

/**
 * Un asset della libreria, ridotto a 768 px di lato lungo, in `data:`.
 *
 * ⚠️ Non è un'ottimizzazione, è **il prezzo che resta vero**. I 258 token per
 * riferimento su cui il listino conta sono misurati a questa misura: se
 * qualcuno manda una foto da 12 megapixel i token salgono, e il numero che gli
 * abbiamo mostrato prima di premere diventa falso.
 *
 * E risolve altre due cose insieme: cinque immagini piene non si mangiano i
 * nove secondi che restano fra i 21 di Google e i 30 del limite, e il costo
 * diventa prevedibile invece che scommesso.
 */
async function riduci(blob) {
  const bitmap = await createImageBitmap(blob);
  const scala = Math.min(1, LATO_RIFERIMENTO / Math.max(bitmap.width, bitmap.height));
  const tela = new OffscreenCanvas(Math.round(bitmap.width * scala), Math.round(bitmap.height * scala));
  tela.getContext('2d').drawImage(bitmap, 0, 0, tela.width, tela.height);
  bitmap.close();

  const ridotto = await tela.convertToBlob({ type: 'image/png' });
  return await new Promise((risolvi) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(lettore.result);
    lettore.readAsDataURL(ridotto);
  });
}

/**
 * Chiede una generazione al Worker.
 *
 * I riferimenti partono dalla libreria e diventano `data:` **qui**, non nel
 * componente: il componente sa quali asset hai scelto, non come si spediscono.
 */
export async function generaImmagine({ prompt, riferimenti = [], misura = 'grande', leggiAsset }) {
  const token = await sessione();
  if (!token) throw Object.assign(new Error('non-collegato'), { code: 'non-collegato' });

  const conDati = [];
  for (const r of riferimenti) {
    const blob = await leggiAsset(r.assetId);
    // Ridotti QUI, prima di partire: e' cio' che tiene vero il prezzo mostrato.
    if (blob) conDati.push({ ruolo: r.ruolo, immagine: await riduci(blob) });
  }

  const res = await fetch(`${BASE}/genera`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ servizio: 'immagine-nbp', prompt, riferimenti: conDati, misura }),
  });

  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Il saldo torna comunque: dopo un fallimento il Worker ha gia' rimborsato,
    // e lo studio deve mostrare il numero giusto senza ricaricare la pagina.
    throw Object.assign(new Error(corpo.errore || 'genera'), {
      code: corpo.errore || 'genera',
      saldo: corpo.saldo,
      prezzo: corpo.prezzo,
    });
  }
  return corpo; // { dati, mime, prezzo, saldo, lavoro }
}

/**
 * Porta a Stripe.
 *
 * Il prezzo lo decide Stripe, non il browser: qui non c'e' nessuna cifra, e
 * non deve essercene nessuna. Una cifra scritta due volte diverge al primo
 * ripensamento, e divergere qui vuol dire aver mentito a un cliente che ci
 * aveva creduto sulla parola.
 */
export async function vaiAlPagamento() {
  const token = await sessione();
  if (!token) throw new Error('non-collegato');
  const res = await fetch(`${BASE}/checkout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('checkout');
  const { url } = await res.json();
  if (!url) throw new Error('checkout');
  location.href = url;
}
