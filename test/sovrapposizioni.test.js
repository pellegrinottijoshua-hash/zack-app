import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Chi sta sopra a chi, sulla scheda di un asset.
 *
 * Sulla scheda della libreria convivono tre cose sovrapposte: la miniatura, il
 * pannello nero delle azioni che compare al passaggio del mouse, e i comandi
 * negli angoli — la stella e la spunta della potatura.
 *
 * Il difetto che questo test impedisce di ripetere (2026-08-27): la spunta
 * aveva lo STESSO `z-index` del pannello. A parità di `z-index` vince chi
 * viene dopo nel DOM, il pannello viene dopo, e il pannello copre la fascia
 * dove sta la spunta. Peggio: il pannello compare su `:hover`, quindi muovere
 * il mouse verso la spunta evocava la cosa che la bloccava — irraggiungibile
 * col mouse SEMPRE, non ogni tanto. Da tastiera funzionava, ed è il motivo per
 * cui nessun test l'aveva vista.
 *
 * **La parità è già il difetto.** L'ordine nel DOM non si legge da qui e può
 * cambiare spostando due righe di JSX: un comando premibile sopra il pannello
 * deve stare sopra per numero dichiarato, non per fortuna.
 */
const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

/** Il `z-index` dichiarato in un selettore esatto, o null se non ce n'è. */
function zIndex(selettore) {
  const esatto = selettore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blocco = CSS.match(new RegExp(`(?:^|\\n)\\s*${esatto}\\s*\\{([^}]*)\\}`));
  if (!blocco) return null;
  const z = blocco[1].match(/z-index:\s*(-?\d+)/);
  return z ? Number(z[1]) : null;
}

/** I comandi che devono restare premibili mentre il pannello è aperto. */
const COMANDI = [
  ['.star', 'la stella dei preferiti'],
  ['.work-scelta', 'la spunta della potatura'],
];

test('il pannello delle azioni dichiara un z-index', () => {
  // Se sparisce, i confronti sotto passerebbero confrontando con null.
  assert.equal(typeof zIndex('.asset-actions'), 'number');
});

for (const [selettore, nome] of COMANDI) {
  test(`${nome} sta sopra il pannello delle azioni`, () => {
    const comando = zIndex(selettore);
    const pannello = zIndex('.asset-actions');
    assert.equal(typeof comando, 'number', `${selettore} non dichiara z-index`);
    assert.ok(
      comando > pannello,
      `${selettore} ha z-index ${comando}, il pannello ${pannello}: ` +
        'a parità o sotto, il pannello lo copre e il comando non si preme col mouse.',
    );
  });
}
