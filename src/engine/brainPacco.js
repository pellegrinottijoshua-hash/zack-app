/**
 * Il pacco di Brain: portarsi via un'idea intera, e rimetterla dentro.
 *
 * È la risposta al lato debole del prodotto — tutto vive nel browser
 * dell'utente, e un clic sbagliato nelle impostazioni cancella mesi di lavoro.
 * `downloadAll()` salva i file ma perde la disposizione, le note e i legami,
 * cioè proprio il pensiero. Qui esce **l'idea intera**.
 *
 * **Perché uno zip e non un .md, e nemmeno un .png.**
 * - un `.md` non può contenere le immagini, i suoni e i video: sarebbe un
 *   indice di file che non ci sono più;
 * - un `.png` si guarda e non si rimette dentro: è una fotografia, non un
 *   salvataggio;
 * - uno zip li contiene **entrambi**, più i file veri e la tela in JSON. Si
 *   apre con un doppio clic anche fra dieci anni, e non ha bisogno di noi.
 *
 * Dentro:
 *
 *   idea.json     la tela: posizioni, note, colori, legami
 *   IDEE.md       la stessa cosa scritta per un umano — e per un'AI
 *   mappa.png     com'era disposta, per riconoscerla a colpo d'occhio
 *   file/…        i lavori veri, coi nomi leggibili
 *
 * Qui sta solo la parte pura: cosa scrivere. Lo zip e il disegno della mappa
 * stanno dove c'è il browser.
 */

import { normalizzaTela } from './brain.js';

/** La versione del pacco. Serve a chi lo riaprirà fra due anni, non a noi. */
export const VERSIONE = 1;

/**
 * Il manifesto: la tela, più il minimo che serve a rimetterla insieme.
 *
 * Gli asset si riferiscono al **percorso nel pacco**, non al loro id: un id
 * della libreria di chi esporta non significa niente nella libreria di chi
 * importa, e un pacco che si riapre solo sul computer che l'ha fatto non è un
 * salvataggio.
 */
export function manifesto(tela, assets, { nome = 'Brain', quando = () => new Date() } = {}) {
  const items = normalizzaTela(tela);
  const perId = new Map(assets.map((a) => [a.id, a]));

  const dentro = new Map();
  for (const o of items) {
    if (o.t !== 'asset') continue;
    const a = perId.get(o.assetId);
    if (a) dentro.set(a.id, a);
  }

  return {
    versione: VERSIONE,
    nome,
    esportatoIl: quando().toISOString(),
    tela: items.map((o) => (o.t === 'asset' ? { ...o, file: percorso(perId.get(o.assetId)) } : o)),
    file: [...dentro.values()].map((a) => ({
      percorso: percorso(a),
      nome: a.name,
      tipo: a.kind,
      nota: a.note || '',
      tag: a.tags || [],
    })),
  };
}

/** Dove finisce un lavoro dentro il pacco. Nome leggibile, non un codice. */
export function percorso(asset) {
  if (!asset) return null;
  return `file/${asset.file || `${asset.name}.${asset.kind}`}`;
}

/**
 * La stessa idea, scritta.
 *
 * Serve a due lettori diversi e per fortuna vogliono la stessa cosa: un umano
 * che riapre il pacco fra sei mesi, e un modello a cui si chiede di
 * analizzarlo. Per entrambi conta la **struttura** — cosa sta dentro cosa —
 * più delle coordinate, che a parole non dicono niente.
 *
 * I gruppi diventano titoli, e ciò che sta dentro un gruppo gli finisce sotto:
 * è l'unica informazione che l'utente ha davvero espresso disponendo le cose.
 */
export function scriviIdee(manifest) {
  const items = manifest.tela;
  const gruppi = items.filter((o) => o.t === 'cerchio');
  const dentro = (g, o) =>
    o.t !== 'cerchio' &&
    o.t !== 'freccia' &&
    o.x + o.w / 2 >= g.x &&
    o.x + o.w / 2 <= g.x + g.w &&
    o.y + o.h / 2 >= g.y &&
    o.y + o.h / 2 <= g.y + g.h;

  const righe = [`# ${manifest.nome}`, '', `Esportato il ${manifest.esportatoIl.slice(0, 10)}.`, ''];

  const assegnati = new Set();
  for (const g of gruppi) {
    const suoi = items.filter((o) => dentro(g, o));
    suoi.forEach((o) => assegnati.add(o.id));
    righe.push(`## ${g.titolo || 'Gruppo senza nome'}`, '');
    if (suoi.length === 0) righe.push('_Vuoto._', '');
    for (const o of suoi) righe.push(descrivi(o, manifest));
    righe.push('');
  }

  const sciolti = items.filter((o) => o.t !== 'cerchio' && o.t !== 'freccia' && !assegnati.has(o.id));
  if (sciolti.length) {
    righe.push('## Fuori dai gruppi', '');
    for (const o of sciolti) righe.push(descrivi(o, manifest));
    righe.push('');
  }

  const frecce = items.filter((o) => o.t === 'freccia');
  if (frecce.length) {
    righe.push('## Legami', '');
    const etichetta = (id) => {
      const o = items.find((x) => x.id === id);
      if (!o) return '?';
      if (o.t === 'nota') return `nota «${taglia(o.testo)}»`;
      if (o.t === 'cerchio') return `gruppo «${o.titolo || 'senza nome'}»`;
      return o.file ? o.file.replace('file/', '') : 'lavoro';
    };
    for (const f of frecce) righe.push(`- ${etichetta(f.da)} → ${etichetta(f.a)}`);
    righe.push('');
  }

  return righe.join('\n');
}

const taglia = (s = '', max = 60) => (s.length > max ? `${s.slice(0, max)}…` : s);

function descrivi(o, manifest) {
  if (o.t === 'nota') return `- **Nota:** ${o.testo || '_vuota_'}`;
  const f = manifest.file.find((x) => x.percorso === o.file);
  if (!f) return '- Un lavoro che non è nel pacco.';
  const coda = [f.tipo, f.tag?.length ? f.tag.join(', ') : null, f.nota || null].filter(Boolean).join(' · ');
  return `- **${f.nome}** — ${coda}`;
}

/**
 * Legge un manifesto che arriva da un pacco.
 *
 * Un pacco è un file che ha viaggiato: può essere di una versione futura,
 * può essere stato modificato a mano, può essere un altro zip rinominato.
 * Rifiutarlo con una frase chiara è meglio che aprirlo a metà e lasciare
 * all'utente una tela con dentro pezzi di qualcos'altro.
 */
export function leggiManifesto(dati) {
  if (!dati || typeof dati !== 'object') throw new Error('Questo pacco non contiene un Brain.');
  if (dati.versione > VERSIONE) {
    throw new Error('Questo pacco viene da una versione più nuova dello studio.');
  }
  return {
    versione: dati.versione || 1,
    nome: typeof dati.nome === 'string' ? dati.nome : 'Brain',
    esportatoIl: dati.esportatoIl || null,
    tela: normalizzaTela(dati.tela),
    file: Array.isArray(dati.file) ? dati.file.filter((f) => f && typeof f.percorso === 'string') : [],
  };
}
