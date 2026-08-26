import { zip, unzip } from 'fflate';
import * as lib from './library.js';
import { KIND_TESTO, kindFromFile } from './model.js';
import { manifesto, scriviIdee, leggiManifesto } from '../engine/brainPacco.js';
import { normalizzaTela } from '../engine/brain.js';

/**
 * Il pacco di Brain, lato browser: costruirlo e riaprirlo.
 *
 * Le decisioni — cosa ci va dentro, com'è scritto — stanno in
 * `engine/brainPacco.js`. Qui c'è solo ciò che ha bisogno del browser: i byte
 * dei file, lo zip, e il disegno della mappa.
 */

/** Quanto è larga la mappa. Abbastanza per leggere le note, non tanto da pesare. */
const MAPPA_LARGA = 1600;

/**
 * Disegna la tela com'era.
 *
 * Non è un salvataggio — quello è `idea.json` — è il modo di **riconoscere**
 * un'idea aprendo una cartella piena di zip. Per questo conta la disposizione,
 * non la fedeltà: i colori delle note, i titoli dei gruppi, le miniature.
 */
async function disegnaMappa(items, perId, testi = {}) {
  const misurabili = items.filter((o) => o.t !== 'freccia');
  if (misurabili.length === 0) return null;

  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const o of misurabili) {
    l = Math.min(l, o.x); t = Math.min(t, o.y);
    r = Math.max(r, o.x + o.w); b = Math.max(b, o.y + o.h);
  }
  const bordo = 60;
  const larg = r - l + bordo * 2;
  const alt = b - t + bordo * 2;
  const k = Math.min(1, MAPPA_LARGA / larg);

  const c = document.createElement('canvas');
  c.width = Math.round(larg * k);
  c.height = Math.round(alt * k);
  const g = c.getContext('2d');

  g.fillStyle = '#111111';
  g.fillRect(0, 0, c.width, c.height);
  g.setTransform(k, 0, 0, k, (-l + bordo) * k, (-t + bordo) * k);

  // Le frecce sotto tutto: sopra una nota ne coprirebbero il testo.
  g.strokeStyle = '#C4A35A';
  g.lineWidth = 2;
  for (const f of items.filter((o) => o.t === 'freccia')) {
    const a = items.find((o) => o.id === f.da);
    const z = items.find((o) => o.id === f.a);
    if (!a || !z) continue;
    g.beginPath();
    g.moveTo(a.x + a.w / 2, a.y + a.h / 2);
    g.lineTo(z.x + z.w / 2, z.y + z.h / 2);
    g.stroke();
  }

  for (const o of misurabili) {
    if (o.t === 'cerchio') {
      g.strokeStyle = o.colore || '#C4A35A';
      g.setLineDash([8, 6]);
      g.beginPath();
      g.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = o.colore || '#C4A35A';
      g.font = '600 22px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText((o.titolo || '').toUpperCase(), o.x + o.w / 2, o.y + 30);
      continue;
    }

    if (o.t === 'nota') {
      g.fillStyle = '#1a1a18';
      g.fillRect(o.x, o.y, o.w, o.h);
      g.fillStyle = o.colore || '#C4A35A';
      g.fillRect(o.x, o.y, 5, o.h);
      g.fillStyle = '#F5F0E8';
      g.font = '16px system-ui, sans-serif';
      g.textAlign = 'left';
      // A capo a mano: `fillText` non lo fa, e una nota lunga uscirebbe dal
      // suo riquadro finendo sopra ciò che le sta accanto.
      let riga = '';
      let y = o.y + 26;
      for (const parola of String(o.testo || '').split(/\s+/)) {
        const prova = riga ? `${riga} ${parola}` : parola;
        if (g.measureText(prova).width > o.w - 24) {
          g.fillText(riga, o.x + 14, y);
          riga = parola;
          y += 20;
          if (y > o.y + o.h - 8) break;
        } else riga = prova;
      }
      if (riga && y <= o.y + o.h - 8) g.fillText(riga, o.x + 14, y);
      continue;
    }

    const a = perId.get(o.assetId);

    // Un documento non si disegna: si scrive. `createImageBitmap` su un .md
    // fallirebbe e finirebbe nel ramo del riquadro col nome — corretto ma
    // muto, e su una tela di venti documenti sarebbe una fila di rettangoli
    // identici. Qui esce una scheda: il titolo, e da dove comincia il testo.
    if (a && KIND_TESTO.includes(a.kind)) {
      g.fillStyle = '#16160f';
      g.fillRect(o.x, o.y, o.w, o.h);
      g.strokeStyle = '#C4A35A';
      g.strokeRect(o.x, o.y, o.w, o.h);
      g.fillStyle = '#C4A35A';
      g.font = '600 15px system-ui, sans-serif';
      g.textAlign = 'left';
      g.fillText(a.name, o.x + 14, o.y + 26, o.w - 24);
      g.fillStyle = '#8A8A85';
      g.font = '13px ui-monospace, monospace';
      let y = o.y + 50;
      for (const riga of String(testi?.[a.id] || '').split('\n')) {
        if (y > o.y + o.h - 8) break;
        g.fillText(riga, o.x + 14, y, o.w - 24);
        y += 17;
      }
      continue;
    }

    g.strokeStyle = '#3d3d3a';
    g.strokeRect(o.x, o.y, o.w, o.h);
    try {
      const { file } = await lib.readAsset(a.id);
      const bmp = await createImageBitmap(file);
      const s = Math.min(o.w / bmp.width, o.h / bmp.height);
      g.drawImage(bmp, o.x + (o.w - bmp.width * s) / 2, o.y + (o.h - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
      bmp.close?.();
    } catch {
      // Un suono o un video non si disegnano: restano il riquadro e il nome,
      // che è quanto serve a riconoscere l'idea.
      g.fillStyle = '#8A8A85';
      g.font = '15px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(a?.name || '—', o.x + o.w / 2, o.y + o.h / 2);
    }
  }

  return new Promise((res) => c.toBlob(res, 'image/png'));
}

/**
 * L'immagine della tela, da sola.
 *
 * È lo stesso disegno che finisce nel pacco come `mappa.png`, ma fuori: era
 * sepolto dentro uno zip, cioè invisibile a chi voleva solo far vedere a
 * qualcuno com'è messa un'idea. Note col loro colore, gruppi coi loro titoli,
 * frecce, miniature dei file e schede dei documenti — tutta la tela in
 * un'immagine sola.
 *
 * Non è un salvataggio e non prova a esserlo: è una fotografia, e non si
 * rimette dentro. Quello resta il compito del pacco.
 *
 * @returns {Promise<{blob: Blob, nomeFile: string}|null>} null se la tela è vuota.
 */
export async function fotografaTela(tela, assets, nome = 'Brain') {
  const perId = new Map(assets.map((a) => [a.id, a]));

  const testi = {};
  for (const o of tela) {
    const a = o.t === 'asset' ? perId.get(o.assetId) : null;
    if (!a || !KIND_TESTO.includes(a.kind)) continue;
    try {
      const { file } = await lib.readAsset(a.id);
      testi[a.id] = await file.text();
    } catch {
      // Vedi `impacchetta`: resta la scheda col nome.
    }
  }

  const blob = await disegnaMappa(normalizzaTela(tela), perId, testi);
  if (!blob) return null;
  const pulito = nome.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'brain';
  return { blob, nomeFile: `${pulito}-tela.png` };
}

/**
 * Costruisce il pacco.
 *
 * @returns {Promise<{blob: Blob, nomeFile: string, dentro: number}>}
 */
export async function impacchetta(tela, assets, nome = 'Brain') {
  const perId = new Map(assets.map((a) => [a.id, a]));

  // I documenti si leggono PRIMA del manifesto: la sezione «Documenti» di
  // IDEE.md porta il titolo scritto dentro il file, e quel titolo sta nei
  // byte, non nei metadati. È una lettura in più solo sui .md, che sono
  // kilobyte — non sui file veri, che sono megabyte.
  const testi = {};
  for (const o of tela) {
    const a = o.t === 'asset' ? perId.get(o.assetId) : null;
    if (!a || !KIND_TESTO.includes(a.kind)) continue;
    try {
      const { file } = await lib.readAsset(a.id);
      testi[a.id] = await file.text();
    } catch {
      // Un documento illeggibile finisce nel pacco col nome del file: è
      // esattamente ciò che succedeva prima, non una perdita.
    }
  }

  // Il nome va passato: senza, ogni pacco si chiamava «Brain» dentro e con il
  // nome dell'idea fuori — due nomi per la stessa cosa, e quello che conta
  // (il titolo in cima a IDEE.md) era quello sbagliato.
  const m = manifesto(tela, assets, { nome, testi });
  const files = {};

  for (const f of m.file) {
    const suTela = m.tela.find((o) => o.file === f.percorso);
    const a = perId.get(suTela?.assetId);
    if (!a) continue;
    try {
      const { file } = await lib.readAsset(a.id);
      files[f.percorso] = new Uint8Array(await file.arrayBuffer());
    } catch {
      // Un file mancante non ferma il pacco: meglio consegnare il pensiero
      // senza un'immagine che non consegnare niente.
    }
  }

  files['idea.json'] = new TextEncoder().encode(JSON.stringify(m, null, 2));
  files['IDEE.md'] = new TextEncoder().encode(scriviIdee(m));

  const mappa = await disegnaMappa(m.tela, perId, testi);
  if (mappa) files['mappa.png'] = new Uint8Array(await mappa.arrayBuffer());

  const dati = await new Promise((res, rej) =>
    zip(files, { level: 6 }, (e, out) => (e ? rej(e) : res(out))),
  );

  const pulito = nome.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'brain';
  return {
    blob: new Blob([dati], { type: 'application/zip' }),
    nomeFile: `${pulito}.brain.zip`,
    dentro: Object.keys(files).length,
  };
}

/**
 * Riapre un pacco: i file tornano in libreria, la tela torna com'era.
 *
 * Gli id si rifanno da capo: quelli di chi ha esportato non esistono qui. Il
 * legame fra un oggetto sulla tela e il suo file passa dal **percorso**, che
 * è la sola cosa che sopravvive al viaggio.
 *
 * @returns {Promise<{nome: string, tela: object[], entrati: number}>}
 */
export async function spacchetta(blob) {
  const dati = new Uint8Array(await blob.arrayBuffer());
  const dentro = await new Promise((res, rej) =>
    unzip(dati, (e, out) => (e ? rej(new Error('Questo file non si apre come pacco.')) : res(out))),
  );

  if (!dentro['idea.json']) throw new Error('Questo pacco non contiene un Brain.');
  const m = leggiManifesto(JSON.parse(new TextDecoder().decode(dentro['idea.json'])));

  // percorso nel pacco → id nuovo nella libreria di chi importa
  const nuovi = new Map();
  let entrati = 0;

  for (const f of m.file) {
    const byte = dentro[f.percorso];
    if (!byte) continue;
    const nomeFile = f.percorso.replace(/^file\//, '');
    const kind = f.tipo || kindFromFile(nomeFile);
    if (!kind) continue;
    const asset = await lib.saveAsset(new Blob([byte]), {
      name: f.nome || nomeFile,
      kind,
      meta: { op: 'brain-import' },
    });
    nuovi.set(f.percorso, asset.id);
    entrati++;
  }

  const tela = m.tela
    .map((o) => {
      if (o.t !== 'asset') return o;
      const id = nuovi.get(o.file);
      // Un oggetto il cui file non è arrivato sparisce invece di restare come
      // riquadro vuoto: un buco muto è peggio di un'assenza.
      return id ? { ...o, assetId: id } : null;
    })
    .filter(Boolean);

  return { nome: m.nome, tela, entrati };
}
