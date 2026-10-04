/**
 * Le voci sono file (fetta 6b, spec voce §2.3).
 *
 * Una voce disegnata o clonata non è un'uscita: è un asset che resta, con la
 * sua icona in Brain, da riusare. Il file è un piccolo JSON — l'id della voce
 * presso ElevenLabs, il nome, la nota, da dove viene e il riferimento al
 * consenso — con `kind: 'voce'`. La stessa regola dei prompt della 5d: «un
 * prompt è un file», e una voce pure.
 *
 * Modulo puro: lo leggono il browser e le prove. Il testo del consenso sta qui
 * perché lo mostra il browser e lo scrive il Worker, e i due non possono
 * divergere: il Worker registra il testo **com'era quel giorno**.
 */

export const KIND_VOCE = 'voce';
export const ORIGINI = ['disegnata', 'clonata'];

/**
 * La dichiarazione, prima di ogni campione da clonare (§2.4). Si cambia solo
 * con una data nuova: le righe di `consensi` già scritte restano col testo che
 * il cliente aveva davanti.
 */
export const CONSENSO = {
  versione: '2026-10-04',
  mia: 'Questa voce è la mia. La registro io, e voglio clonarla per usarla nei miei lavori.',
  permesso:
    'Questa voce è di {nome}. Mi ha dato il permesso di registrarla e clonarla per usarla nei miei lavori, e posso dimostrarlo se mi viene chiesto.',
  nota:
    'Clonare la voce di qualcuno senza il suo permesso non è consentito. La tua risposta viene registrata insieme al campione.',
};

export const SCELTE_CONSENSO = ['mia', 'permesso'];
const MAX_NOME_PARLANTE = 80;

/**
 * Il consenso dato è in regola? `null` se sì, o il codice dell'errore. Lo
 * stesso controllo nel pannello (per non far partire niente) e nel Worker
 * (che resta il giudice: senza la riga, la clonazione non parte).
 */
export function consensoNonValido(consenso) {
  if (!consenso || !SCELTE_CONSENSO.includes(consenso.scelta)) return 'senza-consenso';
  if (consenso.scelta === 'permesso') {
    const nome = typeof consenso.chiParla === 'string' ? consenso.chiParla.trim() : '';
    if (!nome) return 'senza-nome-di-chi-parla';
    if (nome.length > MAX_NOME_PARLANTE) return 'nome-troppo-lungo';
  }
  return null;
}

/** La frase esatta che il cliente ha accettato, con il nome dentro. */
export function testoConsenso(consenso) {
  const base = consenso.scelta === 'mia' ? CONSENSO.mia : CONSENSO.permesso.replace('{nome}', consenso.chiParla.trim());
  return `${base} (${CONSENSO.versione})`;
}

/** Il contenuto del file di una voce. */
export function fileVoce({ id, nome, nota = '', origine, consenso = null }) {
  if (typeof id !== 'string' || !id) throw Object.assign(new Error('voce-senza-id'), { code: 'voce-senza-id' });
  return JSON.stringify({ tipo: 'voce', id, nome: String(nome || ''), nota, origine, consenso }, null, 2);
}

/** Il file di una voce, letto. `null` se non è una voce (meglio che un'eccezione a metà tela). */
export function leggiVoce(testo) {
  try {
    const d = JSON.parse(testo);
    if (d?.tipo !== 'voce' || typeof d.id !== 'string' || !d.id) return null;
    return { id: d.id, nome: String(d.nome || ''), nota: String(d.nota || ''), origine: d.origine, consenso: d.consenso ?? null };
  } catch {
    return null;
  }
}

/** Le voci vive della libreria, dalla più recente. */
export function vociDellaLibreria(assets) {
  return assets
    .filter((a) => a.kind === KIND_VOCE)
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/** Il nome del file di una voce: quello scelto, ripulito. */
export function nomeVoce(nome) {
  const pulito = String(nome || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  return pulito || 'voce';
}
