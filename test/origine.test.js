import { test } from 'node:test';
import assert from 'node:assert/strict';
import { origine, risolviUrl } from '../src/engine/origine.js';

test('senza variabile d\'ambiente usa il percorso locale predefinito', () => {
  assert.equal(origine({}, 'VITE_MODELS_BASE', '/models/'), '/models/');
  assert.equal(origine(undefined, 'VITE_MODELS_BASE', '/models/'), '/models/');
});

test('una variabile vuota o di soli spazi non conta come impostata', () => {
  // Un campo lasciato in bianco nel pannello di Cloudflare non deve
  // silenziosamente far puntare i modelli alla radice del sito.
  assert.equal(origine({ VITE_MODELS_BASE: '' }, 'VITE_MODELS_BASE', '/models/'), '/models/');
  assert.equal(origine({ VITE_MODELS_BASE: '   ' }, 'VITE_MODELS_BASE', '/models/'), '/models/');
});

test('una base personalizzata senza barra finale la riceve', () => {
  const env = { VITE_MODELS_BASE: 'https://modelli.zack-app.com' };
  assert.equal(origine(env, 'VITE_MODELS_BASE', '/models/'), 'https://modelli.zack-app.com/');
});

test('una base personalizzata con barra finale non la raddoppia', () => {
  const env = { VITE_MODELS_BASE: 'https://modelli.zack-app.com/' };
  assert.equal(origine(env, 'VITE_MODELS_BASE', '/models/'), 'https://modelli.zack-app.com/');
});

test('spazi intorno alla base configurata vengono tolti', () => {
  const env = { VITE_MODELS_BASE: '  https://modelli.zack-app.com/  ' };
  assert.equal(origine(env, 'VITE_MODELS_BASE', '/models/'), 'https://modelli.zack-app.com/');
});

test('due chiavi diverse restano indipendenti nello stesso ambiente', () => {
  // VITE_MODELS_BASE e VITE_ORT_BASE convivono: models.js e worker.js non
  // devono finire a leggere la base sbagliata.
  const env = {
    VITE_MODELS_BASE: 'https://modelli.zack-app.com/',
    VITE_ORT_BASE: 'https://runtime.zack-app.com/',
  };
  assert.equal(origine(env, 'VITE_MODELS_BASE', '/models/'), 'https://modelli.zack-app.com/');
  assert.equal(origine(env, 'VITE_ORT_BASE', '/ort/'), 'https://runtime.zack-app.com/');
});

test('risolviUrl compone base e nome senza barre doppie', () => {
  assert.equal(risolviUrl('/models/', 'u2net.onnx'), '/models/u2net.onnx');
  assert.equal(risolviUrl('/models', 'u2net.onnx'), '/models/u2net.onnx');
});

test('un nome file con barra iniziale non spezza il percorso della base', () => {
  // La concatenazione ingenua (base + nome) con nome='/u2net.onnx' e una base
  // con un sotto-percorso perderebbe quel sotto-percorso: '/u2net.onnx' letto
  // come assoluto scavalca 'https://cdn.esempio.com/modelli'.
  assert.equal(
    risolviUrl('https://cdn.esempio.com/modelli', '/u2net.onnx'),
    'https://cdn.esempio.com/modelli/u2net.onnx',
  );
});

test('risolviUrl su base predefinita produce lo stesso URL di oggi', () => {
  // Non deve cambiare nulla in sviluppo locale: è il punto della base
  // predefinita.
  assert.equal(risolviUrl('/models/', 'isnet-general-use.onnx'), '/models/isnet-general-use.onnx');
  assert.equal(risolviUrl('/models/', 'upscale-x4.onnx'), '/models/upscale-x4.onnx');
});
