#!/usr/bin/env node
/**
 * Il pacchetto di effetti (fase 7a): sceglie, converte, cataloga.
 *
 * Parte dai pacchetti CC0 di Kenney scompattati in `tmp/kenney/` (fuori da
 * git; si riscaricano da kenney.nl — i link sono nella spec
 * `docs/superpowers/specs/2026-10-05-effetti-design.md`). Scrive:
 *   - `public/effetti/<famiglia>/<id>.mp3`  (MP3 mono 96 kbps: lo leggono tutti)
 *   - `public/effetti/CREDITI.txt`
 *   - `src/engine/pacchetto.json`           (il catalogo)
 *
 * La SCELTA sta qui sotto, gruppo per gruppo: rifare il pacchetto deve dare
 * lo stesso pacchetto. Vuole `ffmpeg` e `ffprobe`.
 *
 * Uso: node scripts/prepara-effetti.mjs
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SORGENTE = join(RADICE, 'tmp', 'kenney');
const USCITA = join(RADICE, 'public', 'effetti');
const CATALOGO = join(RADICE, 'src', 'engine', 'pacchetto.json');

const PACCHETTI = {
  impact: 'kenney_impact-sounds',
  interface: 'kenney_interface-sounds',
  ui: 'kenney_ui-audio',
  rpg: 'kenney_rpg-audio',
  casino: 'kenney_casino-audio',
  digital: 'kenney_digital-audio',
  scifi: 'kenney_sci-fi-sounds',
};

/** [pacchetto, base del nome del file, quanti, nome it, nome en] per famiglia. */
const SCELTA = {
  colpi: [
    ['impact', 'impactWood_light', 1, 'Legno leggero', 'Light wood'],
    ['impact', 'impactWood_medium', 2, 'Legno', 'Wood'],
    ['impact', 'impactWood_heavy', 2, 'Legno forte', 'Heavy wood'],
    ['impact', 'impactMetal_light', 1, 'Metallo leggero', 'Light metal'],
    ['impact', 'impactMetal_medium', 2, 'Metallo', 'Metal'],
    ['impact', 'impactMetal_heavy', 2, 'Metallo forte', 'Heavy metal'],
    ['impact', 'impactGlass_light', 1, 'Vetro leggero', 'Light glass'],
    ['impact', 'impactGlass_medium', 2, 'Vetro', 'Glass'],
    ['impact', 'impactGlass_heavy', 2, 'Vetro forte', 'Heavy glass'],
    ['impact', 'impactPlate_light', 1, 'Piatto leggero', 'Light plate'],
    ['impact', 'impactPlate_medium', 1, 'Piatto', 'Plate'],
    ['impact', 'impactPlate_heavy', 1, 'Piatto forte', 'Heavy plate'],
    ['impact', 'impactPunch_medium', 2, 'Pugno', 'Punch'],
    ['impact', 'impactPunch_heavy', 2, 'Pugno forte', 'Heavy punch'],
    ['impact', 'impactSoft_medium', 1, 'Colpo morbido', 'Soft hit'],
    ['impact', 'impactSoft_heavy', 1, 'Colpo morbido forte', 'Heavy soft hit'],
    ['impact', 'impactBell_heavy', 2, 'Campana', 'Bell'],
    ['impact', 'impactTin_medium', 2, 'Latta', 'Tin'],
    ['impact', 'impactMining', 2, 'Piccone', 'Pickaxe'],
    ['impact', 'impactPlank_medium', 1, 'Asse', 'Plank'],
    ['impact', 'impactGeneric_light', 1, 'Colpo secco', 'Dry hit'],
  ],
  passi: [
    ['impact', 'footstep_wood', 2, 'Passi sul legno', 'Steps on wood'],
    ['impact', 'footstep_concrete', 2, 'Passi sul cemento', 'Steps on concrete'],
    ['impact', 'footstep_grass', 2, "Passi sull'erba", 'Steps on grass'],
    ['impact', 'footstep_snow', 2, 'Passi sulla neve', 'Steps on snow'],
    ['impact', 'footstep_carpet', 2, 'Passi sulla moquette', 'Steps on carpet'],
    ['rpg', 'footstep', 4, 'Passo', 'Step'],
  ],
  interfaccia: [
    ['interface', 'click', 1, 'Clic', 'Click'],
    ['ui', 'click', 2, 'Clic morbido', 'Soft click'],
    ['interface', 'select', 2, 'Seleziona', 'Select'],
    ['interface', 'confirmation', 2, 'Conferma', 'Confirm'],
    ['interface', 'error', 2, 'Errore', 'Error'],
    ['interface', 'open', 1, 'Apri', 'Open'],
    ['interface', 'close', 1, 'Chiudi', 'Close'],
    ['interface', 'toggle', 2, 'Interruttore', 'Toggle'],
    ['interface', 'switch', 1, 'Scatto', 'Switch'],
    ['interface', 'scroll', 1, 'Scorri', 'Scroll'],
    ['interface', 'drop', 1, 'Lascia', 'Drop'],
    ['interface', 'back', 1, 'Indietro', 'Back'],
    ['interface', 'tick', 1, 'Tic', 'Tick'],
    ['interface', 'question', 1, 'Domanda', 'Question'],
    ['interface', 'maximize', 1, 'Ingrandisci', 'Maximize'],
    ['interface', 'minimize', 1, 'Riduci', 'Minimize'],
    ['interface', 'bong', 1, 'Bong', 'Bong'],
    ['interface', 'pluck', 1, 'Pizzico', 'Pluck'],
    ['ui', 'rollover', 2, 'Sfiora', 'Rollover'],
  ],
  oggetti: [
    ['rpg', 'doorOpen', 2, 'Porta che si apre', 'Door opening'],
    ['rpg', 'doorClose', 2, 'Porta che si chiude', 'Door closing'],
    ['rpg', 'creak', 2, 'Cigolio', 'Creak'],
    ['rpg', 'cloth', 2, 'Stoffa', 'Cloth'],
    ['rpg', 'bookFlip', 2, 'Pagine', 'Page flip'],
    ['rpg', 'bookOpen', 1, 'Libro che si apre', 'Book opening'],
    ['rpg', 'bookClose', 1, 'Libro che si chiude', 'Book closing'],
    ['rpg', 'bookPlace', 1, 'Libro posato', 'Book placed'],
    ['rpg', 'drawKnife', 2, 'Coltello sguainato', 'Knife drawn'],
    ['rpg', 'knifeSlice', 1, 'Taglio', 'Slice'],
    ['rpg', 'chop', 1, 'Colpo di scure', 'Chop'],
    ['rpg', 'handleCoins', 1, 'Monete', 'Coins'],
    ['rpg', 'metalPot', 2, 'Pentola', 'Pot'],
    ['rpg', 'metalLatch', 1, 'Chiavistello', 'Latch'],
    ['rpg', 'metalClick', 1, 'Scatto di metallo', 'Metal click'],
    ['rpg', 'beltHandle', 1, 'Cintura', 'Belt'],
    ['rpg', 'dropLeather', 1, 'Cuoio che cade', 'Leather drop'],
  ],
  carte: [
    ['casino', 'card-slide', 2, 'Carta che scivola', 'Card slide'],
    ['casino', 'card-shuffle', 1, 'Mescolare le carte', 'Card shuffle'],
    ['casino', 'card-place', 2, 'Carta posata', 'Card placed'],
    ['casino', 'card-fan', 1, 'Carte a ventaglio', 'Card fan'],
    ['casino', 'cards-pack-open', 1, 'Mazzo aperto', 'Deck opened'],
    ['casino', 'chips-stack', 2, 'Fiches impilate', 'Chips stacked'],
    ['casino', 'chips-collide', 1, 'Fiches', 'Chips'],
    ['casino', 'dice-throw', 2, 'Dadi lanciati', 'Dice thrown'],
    ['casino', 'dice-shake', 2, 'Dadi agitati', 'Dice shaken'],
  ],
  arcade: [
    ['digital', 'powerUp', 3, 'Potenziamento', 'Power-up'],
    ['digital', 'laser', 3, 'Laser arcade', 'Arcade laser'],
    ['digital', 'phaserUp', 2, 'Fase che sale', 'Phaser up'],
    ['digital', 'phaserDown', 2, 'Fase che scende', 'Phaser down'],
    ['digital', 'zap', 2, 'Zap', 'Zap'],
    ['digital', 'pepSound', 2, 'Bip allegro', 'Pep'],
    ['digital', 'phaseJump', 2, 'Salto', 'Jump'],
    ['digital', 'twoTone', 1, 'Due toni', 'Two tones'],
    ['digital', 'threeTone', 1, 'Tre toni', 'Three tones'],
    ['digital', 'highUp', 1, 'Su', 'Up'],
    ['digital', 'highDown', 1, 'Giù', 'Down'],
  ],
  fantascienza: [
    ['scifi', 'laserSmall', 2, 'Laser piccolo', 'Small laser'],
    ['scifi', 'laserLarge', 2, 'Laser grande', 'Large laser'],
    ['scifi', 'laserRetro', 2, 'Laser rétro', 'Retro laser'],
    ['scifi', 'forceField', 2, 'Campo di forza', 'Force field'],
    ['scifi', 'thrusterFire', 2, 'Propulsore', 'Thruster'],
    ['scifi', 'engineCircular', 1, 'Motore che gira', 'Circular engine'],
    ['scifi', 'spaceEngine', 1, 'Motore spaziale', 'Space engine'],
    ['scifi', 'computerNoise', 2, 'Computer', 'Computer'],
    ['scifi', 'doorOpen', 1, 'Portellone che si apre', 'Hatch opening'],
    ['scifi', 'doorClose', 1, 'Portellone che si chiude', 'Hatch closing'],
    ['scifi', 'slime', 1, 'Melma', 'Slime'],
  ],
  esplosioni: [
    ['scifi', 'explosionCrunch', 3, 'Esplosione', 'Explosion'],
    ['scifi', 'lowFrequency_explosion', 2, 'Esplosione sorda', 'Deep explosion'],
    ['scifi', 'impactMetal', 2, 'Schianto di metallo', 'Metal crash'],
  ],
};

const slug = (s) => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
const tondo = (n) => Math.round(n * 100) / 100;

/** Il picco vero di un file, in dB (può superare lo zero). */
function piccoDi(percorso) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', percorso, '-af', 'astats=metadata=0', '-f', 'null', '-']);
  const picchi = [...r.stderr.toString().matchAll(/Peak level dB: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  return Math.max(...picchi.filter(Number.isFinite), -60);
}

function fileDi(pacchetto, base) {
  const cartella = join(SORGENTE, PACCHETTI[pacchetto], 'Audio');
  const esatto = new RegExp(`^${base}(?:[-_]?\\d+)?\\.ogg$`);
  return readdirSync(cartella)
    .filter((f) => esatto.test(f))
    .sort()
    .map((f) => join(cartella, f))
    // Sotto i 50 ms non si sente un effetto, si sente un difetto (Kenney ha
    // clic da 10 ms): si salta alla variante dopo.
    .filter((f) => durataDi(f) >= DURATA_MINIMA);
}

const DURATA_MINIMA = 0.05;

function durataDi(percorso) {
  return Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', percorso]).toString().trim(),
  );
}

if (!existsSync(SORGENTE)) {
  console.error(`Manca ${SORGENTE}: scarica e scompatta i pacchetti (vedi l'intestazione).`);
  process.exit(1);
}
rmSync(USCITA, { recursive: true, force: true });

const effetti = [];
const crediti = [];
for (const [famiglia, gruppi] of Object.entries(SCELTA)) {
  mkdirSync(join(USCITA, famiglia), { recursive: true });
  for (const [pacchetto, base, quanti, it, en] of gruppi) {
    const presi = fileDi(pacchetto, base).slice(0, quanti);
    if (presi.length < quanti) throw new Error(`${pacchetto}/${base}: ne servono ${quanti}, ce ne sono ${presi.length}`);
    presi.forEach((sorgente, i) => {
      const n = quanti > 1 ? ` ${i + 1}` : '';
      const id = `${famiglia}-${slug(base)}${quanti > 1 ? `-${i + 1}` : ''}`;
      const file = `effetti/${famiglia}/${id}.mp3`;
      // Il picco a −1,5 dB per tutti: nel pacchetto originale vanno da −23 a 0,
      // e un effetto che esce sottovoce sembra un effetto rotto. Due passate,
      // perché è l'MP3 a sforare (fino a +2 dB sui colpi secchi): si codifica,
      // si misura il file VERO, e si ricodifica corretto. `astats` e non
      // `volumedetect`, che taglia a 0 dB e non vede gli sforamenti.
      const destinazione = join(RADICE, 'public', file);
      const codifica = (guadagno) =>
        execFileSync('ffmpeg', [
          '-loglevel', 'error', '-y', '-i', sorgente,
          '-af', `aformat=channel_layouts=mono,volume=${guadagno}dB`, '-b:a', '96k', destinazione,
        ]);
      let guadagno = 0;
      for (let passata = 0; passata < 2; passata++) {
        codifica(guadagno);
        guadagno = tondo(guadagno + (-1.5 - piccoDi(destinazione)));
      }
      codifica(guadagno);
      const durata = durataDi(destinazione);
      effetti.push({ id, famiglia, nome: { it: `${it}${n}`, en: `${en}${n}` }, durata: tondo(durata), file });
      crediti.push(`${file}  ←  Kenney, ${PACCHETTI[pacchetto].replace('kenney_', '')}/${sorgente.split('/').pop()}  (CC0)`);
    });
  }
}

writeFileSync(
  join(USCITA, 'CREDITI.txt'),
  [
    'Effetti sonori del pacchetto di Zack App.',
    '',
    'Tutti da Kenney (www.kenney.nl), licenza Creative Commons Zero (CC0):',
    'http://creativecommons.org/publicdomain/zero/1.0/',
    'Convertiti in MP3 mono. Il credito non è obbligatorio; lo diamo lo stesso.',
    '',
    ...crediti,
    '',
  ].join('\n'),
);
writeFileSync(
  CATALOGO,
  `${JSON.stringify({ fonte: 'Kenney (CC0)', famiglie: Object.keys(SCELTA), effetti }, null, 2)}\n`,
);
console.log(`${effetti.length} effetti in ${Object.keys(SCELTA).length} famiglie.`);
