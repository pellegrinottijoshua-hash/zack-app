/**
 * Il pacchetto di effetti (fase 7a): il catalogo, letto.
 *
 * Il catalogo (`pacchetto.json`) lo scrive `scripts/prepara-effetti.mjs` dai
 * pacchetti CC0 di Kenney; i file stanno in `public/effetti/`. Qui solo le
 * domande che lo studio gli fa: quali famiglie, quali effetti, cerca per nome.
 * Modulo puro: nessun DOM, nessuna rete.
 */

import CATALOGO from './pacchetto.json' with { type: 'json' };

export const FAMIGLIE = CATALOGO.famiglie;
export const EFFETTI = CATALOGO.effetti;
export const FONTE = CATALOGO.fonte;

/** Il nome nella lingua data (l'italiano se l'altra manca). */
export function nomeEffetto(effetto, lang = 'it') {
  return effetto?.nome?.[lang] || effetto?.nome?.it || effetto?.id || '';
}

/** Minuscolo e senza accenti: «rétro» si trova scrivendo «retro». */
const piano = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Gli effetti di una famiglia (o di tutte, con `null`), filtrati per nome.
 * Ogni parola cercata deve comparire nel nome, in una lingua o nell'altra:
 * chi scrive «metal» in italiano trova lo stesso il metallo.
 */
export function cercaEffetti({ famiglia = null, testo = '' } = {}, effetti = EFFETTI) {
  const parole = piano(testo).split(/\s+/).filter(Boolean);
  return effetti.filter((e) => {
    if (famiglia && e.famiglia !== famiglia) return false;
    if (!parole.length) return true;
    const dove = `${piano(e.nome?.it)} ${piano(e.nome?.en)}`;
    return parole.every((p) => dove.includes(p));
  });
}

