import { MODELS, TIERS, getModel } from './models.js';

/**
 * Decide con cosa può lavorare questo browser.
 *
 * Sta fuori dal worker di proposito: l'interfaccia deve poter dire all'utente
 * cosa aspettarsi *prima* che il motore parta, non dopo il primo ritaglio
 * andato lento.
 */

export function pickTier(hasWebGpu) {
  return hasWebGpu ? TIERS.accelerato : TIERS.compatibilita;
}

export function defaultModelFor(tier) {
  return tier === TIERS.accelerato ? getModel('isnet-general-use') : getModel('u2net');
}

/**
 * Nel livello lento i modelli a 1024px non vengono nemmeno offerti: durante la
 * sonda del 2026-08-25 uno di essi ha bloccato il tab per oltre tre minuti.
 * Mostrare un'opzione che rovina la sessione è peggio che non mostrarla.
 */
export function modelsFor(tier) {
  return tier === TIERS.accelerato ? MODELS : MODELS.filter((m) => m.size <= 320);
}

/**
 * `gpu` è iniettato per essere testabile. Non solleva mai: un browser che
 * risponde male alla richiesta di adapter deve degradare, non rompere l'app.
 */
export async function detectWebGpu(gpu) {
  if (!gpu || typeof gpu.requestAdapter !== 'function') return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}
