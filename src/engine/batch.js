/**
 * Le operazioni in blocco.
 *
 * Non è uno strumento nuovo: è il moltiplicatore di quelli che ci sono già.
 * Scontornare quaranta file uno per uno è il lavoro che nessuno vuole fare, ed
 * è esattamente ciò che un computer sa fare meglio di una persona.
 *
 * Qui c'è solo la pianificazione — quali lavori, in che ordine, a che punto
 * siamo — pura e verificabile. L'esecuzione sta nell'hook, dove può usare il
 * motore.
 */

export const OPS = {
  cutout: 'cutout',
  vector: 'vector',
  export: 'export',
};

/**
 * Costruisce la lista dei lavori da file × operazioni.
 *
 * L'ordine non è casuale: **prima tutte le operazioni su un file, poi il file
 * successivo.** Così chi guarda vede comparire risultati completi invece di
 * quaranta ritagli e nessun export, e può fermarsi a metà portandosi a casa
 * qualcosa di finito.
 */
export function planJobs(files, { cutout = false, vector = false, exportPresets = [] } = {}) {
  const jobs = [];
  for (const file of files) {
    if (cutout) jobs.push({ file, op: OPS.cutout });
    if (vector) jobs.push({ file, op: OPS.vector });
    for (const preset of exportPresets) jobs.push({ file, op: OPS.export, preset });
  }
  return jobs.map((j, i) => ({ ...j, id: `${i}`, state: 'attesa' }));
}

/** Nessuna operazione scelta: non si avvia un blocco che non farebbe nulla. */
export function isEmptyPlan(options) {
  return !options?.cutout && !options?.vector && !(options?.exportPresets?.length > 0);
}

export function progressOf(jobs) {
  const done = jobs.filter((j) => j.state === 'fatto').length;
  const failed = jobs.filter((j) => j.state === 'fallito').length;
  const total = jobs.length;
  return {
    done,
    failed,
    total,
    remaining: total - done - failed,
    ratio: total ? (done + failed) / total : 0,
  };
}

/**
 * Quanto manca, dai tempi già misurati in questa sessione.
 *
 * Una stima da una media reale è più onesta di una costante scritta a mano:
 * la stessa operazione dura diversamente su macchine diverse, e dire un numero
 * sbagliato è peggio che non dirlo.
 */
export function estimateRemaining(jobs, msPerJob) {
  const { remaining } = progressOf(jobs);
  if (!remaining || !msPerJob) return null;
  return Math.round((remaining * msPerJob) / 1000);
}

/** Media dei lavori già conclusi, per stimare quelli che restano. */
export function averageMs(durations) {
  const valid = durations.filter((d) => Number.isFinite(d) && d > 0);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Un fallimento non ferma il blocco.
 *
 * Su quaranta file uno sarà rotto, e fermarsi lì butterebbe via il lavoro già
 * fatto sugli altri trentanove. Si segna e si va avanti; alla fine si dice
 * quanti sono andati storti.
 */
export function markJob(jobs, id, state, extra = {}) {
  return jobs.map((j) => (j.id === id ? { ...j, state, ...extra } : j));
}

/** Il prossimo da fare, o null se non ce n'è. */
export function nextJob(jobs) {
  return jobs.find((j) => j.state === 'attesa') || null;
}

/** Un riassunto leggibile: quanti fatti, quanti falliti, quali file. */
export function summarize(jobs) {
  const failed = jobs.filter((j) => j.state === 'fallito');
  return {
    ...progressOf(jobs),
    // Un file può fallire su più operazioni: si nomina una volta sola.
    failedFiles: [...new Set(failed.map((j) => j.file?.name).filter(Boolean))],
  };
}
