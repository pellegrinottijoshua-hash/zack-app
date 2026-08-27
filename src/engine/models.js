/**
 * Registro dei modelli di segmentazione usabili nel browser.
 *
 * Il vincolo che conta qui non è tecnico ma commerciale: Zack è un servizio a
 * pagamento, e un modello con licenza non commerciale lo rende illegale da
 * vendere. Il test `test/engine.test.js` fallisce se questo file smette di
 * rispettare la regola.
 */
import { origine, risolviUrl } from './origine.js';

// In locale sono file statici sotto /models/. In produzione, dove Cloudflare
// Pages rifiuta un file sopra 25 MiB e questi ne pesano fino a 179M, la base
// punta a un bucket R2 impostando VITE_MODELS_BASE — vedi src/engine/origine.js.
const MODELS_BASE = origine(import.meta.env, 'VITE_MODELS_BASE', '/models/');

/**
 * Modelli mai ammessi, con la ragione.
 *
 * `bria-rmbg` è il default della CLI di rembg: se un giorno qualcuno smette di
 * passare `-m` esplicito, deve rompersi un test, non arrivare in produzione un
 * modello non vendibile.
 *
 * `u2net_portrait` viene dallo stesso repo Apache-2.0 degli altri U²-Net, ma è
 * addestrato su APDrawing, che porta un vincolo non commerciale.
 */
export const BLOCKED_MODELS = ['bria-rmbg', 'u2net_portrait'];

const IMAGENET = { mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] };
// isnet/DIS: preso da rembg `dis_general_use.py`. NON è ImageNet, e sbagliarlo
// produce una maschera del tutto errata senza sollevare alcun errore.
const HALF = { mean: [0.5, 0.5, 0.5], std: [1, 1, 1] };

export const TIERS = {
  accelerato: 'accelerato',
  compatibilita: 'compatibilita',
};

export const MODELS = [
  {
    id: 'u2net',
    labelKey: 'engine.tier.fast.name',
    license: 'Apache-2.0',
    commercial: true,
    size: 320,
    norm: IMAGENET,
    tier: TIERS.compatibilita,
    bytes: 175_000_000,
    url: risolviUrl(MODELS_BASE, 'u2net.onnx'),
  },
  {
    id: 'isnet-general-use',
    labelKey: 'engine.tier.quality.name',
    license: 'Apache-2.0',
    commercial: true,
    size: 1024,
    norm: HALF,
    tier: TIERS.accelerato,
    bytes: 179_000_000,
    url: risolviUrl(MODELS_BASE, 'isnet-general-use.onnx'),
  },
  {
    id: 'isnet-anime',
    labelKey: 'engine.tier.anime.name',
    license: 'Apache-2.0',
    commercial: true,
    size: 1024,
    norm: HALF,
    tier: TIERS.accelerato,
    bytes: 176_000_000,
    url: risolviUrl(MODELS_BASE, 'isnet-anime.onnx'),
  },
];

export function getModel(id) {
  const m = MODELS.find((x) => x.id === id);
  if (!m) throw new Error(`Modello sconosciuto: ${id}`);
  return m;
}
