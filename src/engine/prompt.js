import { KIND_TESTO } from '../store/model.js';
import { discendenti } from './cartelle.js';

/**
 * I prompt salvati (fase 5d, D-d).
 *
 * Un prompt è **un file di testo**: un `.md` come gli altri, un'icona in
 * Brain, sta nelle cartelle, ha una nota, si trascina su Immagine o Video e
 * ne riempie il prompt. Non c'è un secondo tipo di oggetto da inventare.
 *
 * Cosa lo distingue da una nota qualunque è `meta.op === 'prompt'`, come
 * ogni asset dice da che operazione è nato: lo scrive chi lo salva dal
 * servizio. (`meta.prompt`, su un'immagine generata, è il testo che l'ha
 * fatta — un'altra cosa.) Qualunque `.md` posato su un
 * servizio riempie il prompt lo stesso — è il gesto che conta, non il segno.
 */

/** Quanto testo entra in un prompt. Oltre, è una bibbia, non un prompt. */
export const PROMPT_MAX = 4000;

/** Quanti prompt si vedono nel punto oro: «prompt 1, 2, 3, 4» (E1). */
export const PROMPT_NEL_PUNTO = 4;

export const eTesto = (a) => Boolean(a) && KIND_TESTO.includes(a.kind);
export const ePrompt = (a) => eTesto(a) && a.meta?.op === 'prompt' && !a.cestinatoIl;

/**
 * Il testo di un `.md` pronto per il campo del prompt: senza il titolo
 * markdown della prima riga (`# Notte sul molo` è il nome, non la richiesta),
 * senza righe vuote ai bordi, col tetto.
 */
export function testoPrompt(testo) {
  const righe = String(testo ?? '').replace(/\r\n?/g, '\n').split('\n');
  while (righe.length && !righe[0].trim()) righe.shift();
  if (righe.length > 1 && /^#{1,6}\s/.test(righe[0])) righe.shift();
  return righe.join('\n').trim().slice(0, PROMPT_MAX);
}

/**
 * Il nome di un prompt salvato: le prime parole, non tutta la frase. Due
 * prompt con lo stesso inizio prendono nomi uguali, e va bene: la libreria
 * li distingue per impronta, e il nome si cambia dalla scheda.
 */
export function nomePrompt(testo, parole = 6) {
  const pulito = testoPrompt(testo).replace(/\s+/g, ' ').trim();
  if (!pulito) return '';
  const pezzi = pulito.split(' ');
  const nome = pezzi.slice(0, parole).join(' ');
  return (pezzi.length > parole ? `${nome}…` : nome).slice(0, 60);
}

/** I prompt salvati, dal più recente: quelli del punto oro sono i primi. */
export function promptSalvati(assets) {
  return assets
    .filter(ePrompt)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

/**
 * Le cartelle di una tela di Brain viste dalla libreria (5d, T6): per ogni
 * cartella, gli asset che tiene a qualunque profondità. La striscia della
 * libreria le usa come filtri — è Brain visto di lato, non un secondo
 * sistema di cartelle.
 */
export function cartelleDellaTela(items) {
  return items
    .filter((o) => o.t === 'cartella')
    .map((c) => {
      const dentro = discendenti(items, c.id);
      const assetIds = new Set(
        items.filter((o) => o.t === 'asset' && dentro.has(o.id)).map((o) => o.assetId),
      );
      return { id: c.id, titolo: c.titolo, faccia: c.faccia, assetIds };
    });
}
