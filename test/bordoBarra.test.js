import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * La barra dei servizi non ha un fianco destro.
 *
 * Dal Task 9 `.toolrail` non è mai una colonna: riga in cima (≥761px) o
 * barra fissa in fondo (≤760px). Eppure il foglio diceva quattro cose sul
 * suo bordo destro — `1px` nella regola base, `0` in tutte e due le media
 * query, `2px solid var(--nero)` in una regola nuda più in basso — e a
 * specificità pari vinceva la nuda, che veniva dopo: un moncone nero di
 * 2×112px al bordo destro del desktop (2×122 sul telefono), con gli zeri
 * morti. Chiesto dal committente, revisione finale della fase 1
 * (2026-09-23).
 *
 * ⚠️ DICHIARATA stretta: legge `src/styles.css` come testo e guarda solo le
 * regole il cui selettore È la barra (`.toolrail`, `.toolrail[…]`, anche
 * dentro un elenco di selettori). Il valore calcolato
 * (`getComputedStyle(...).borderRightWidth` a 390, 760, 761, 800, 1280) è
 * nel rapporto finale.
 */
const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('nessuna regola della barra dei servizi dichiara un bordo destro', () => {
  const colpevoli = [];
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selettori = m[1].split(',').map((x) => x.trim());
    const eBarra = selettori.some((x) => x === '.toolrail' || x.startsWith('.toolrail['));
    if (eBarra && /(?:^|;|\s)border-right(?:-width|-style|-color)?\s*:/.test(m[2])) {
      colpevoli.push(`${m[1].trim()} { …${m[2].match(/border-right[^;]*/)[0]}… }`);
    }
  }
  assert.deepEqual(colpevoli, [], 'la barra non è mai una colonna: un bordo destro non ha lavoro da fare');
});
