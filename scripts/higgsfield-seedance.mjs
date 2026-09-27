#!/usr/bin/env node
/**
 * Prova di Higgsfield + Seedance 2.5 (text-to-video), con l'SDK ufficiale.
 *
 * ⚠️ OGNI ESECUZIONE È UNA GENERAZIONE A PAGAMENTO.
 *
 * Le credenziali stanno in `.env.local` (ignorato da git), nel formato
 * `HF_CREDENTIALS=key-id:key-secret`, e le carica Node stesso:
 *
 *   npm run seedance:prova
 *   (= node --env-file=.env.local scripts/higgsfield-seedance.mjs)
 *
 * Questo file non stampa, non registra e non scrive mai la chiave: la passa
 * all'SDK e basta. L'SDK v2 gira solo lato server (rifiuta il browser), che
 * è esattamente dove una chiave deve stare.
 */

import { config, higgsfield } from '@higgsfield/client/v2';

const MODELLO = 'bytedance/seedance-2.5/text-to-video';

if (!process.env.HF_CREDENTIALS) {
  console.error('Manca HF_CREDENTIALS in .env.local (formato key-id:key-secret).');
  process.exit(2);
}

config({ credentials: process.env.HF_CREDENTIALS });

try {
  const risultato = await higgsfield.subscribe(MODELLO, {
    input: {
      prompt: 'A cinematic scene at sunset',
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
    },
    withPolling: true,
  });

  /*
   * Si dice «fatto» SOLO con `completed` e un URL in mano. Tutto il resto —
   * fallito, bloccato dalla moderazione (`nsfw`), annullato, o uno stato che
   * l'SDK di oggi non conosce ancora — esce con errore e lo nomina.
   */
  const stato = risultato?.status;
  const url = risultato?.video?.url;
  if (stato === 'completed' && url) {
    console.log(`Completato. Video: ${url}`);
    console.log(`Richiesta: ${risultato.request_id ?? '(senza id)'}`);
  } else {
    const perche = {
      failed: 'la generazione è fallita',
      nsfw: 'bloccata dalla moderazione',
      canceled: 'annullata',
      cancelled: 'annullata',
    }[stato] || `stato inatteso: ${stato ?? 'nessuno'}${stato === 'completed' ? ' (senza URL del video)' : ''}`;
    console.error(`Non riuscita: ${perche}. Richiesta: ${risultato?.request_id ?? '(senza id)'}`);
    process.exit(1);
  }
} catch (e) {
  // Il nome della classe d'errore dell'SDK (AuthenticationError,
  // NotEnoughCreditsError, ValidationError, TimeoutError…) e il messaggio:
  // mai l'oggetto intero, che potrebbe portarsi dietro le intestazioni.
  console.error(`Non riuscita: ${e?.name || 'Errore'} — ${e?.message || 'senza messaggio'}`);
  process.exit(1);
}
