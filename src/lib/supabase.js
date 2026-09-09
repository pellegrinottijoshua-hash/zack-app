/**
 * Le due chiavi pubbliche di Supabase.
 *
 * **Stanno in chiaro nel codice apposta.** `sb_publishable_…` è fatta per
 * vivere nel browser: finisce comunque dentro il bundle, quindi nasconderla in
 * una variabile d'ambiente non la nasconde a nessuno — la sposta soltanto in
 * un posto dove ci si dimentica di metterla.
 *
 * E questo progetto quel prezzo l'ha già pagato: il 2026-09-04 il deploy
 * falliva da giorni perché la configurazione viveva **solo** nel pannello
 * Cloudflare. Ciò che serve alla build sta nel repository.
 *
 * ⚠️ La chiave `sb_secret_…` è un'altra cosa e **non entra mai qui**: legge e
 * scrive tutto il database ignorando i permessi. Vive solo nel Worker, messa
 * con `npx wrangler secret put SUPABASE_SERVICE_KEY`.
 */
export const SUPABASE_URL = 'https://hnbrjihzoxtsnqxeqxtr.supabase.co';
export const SUPABASE_CHIAVE_PUBBLICA = 'sb_publishable_x0QPwI7VibEVAG28G1MxGg_FTP6due1';
