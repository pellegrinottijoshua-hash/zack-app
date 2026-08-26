/**
 * Il primo minuto.
 *
 * Chi apre lo studio per la prima volta trovava un fondo panna, una colonna di
 * strumenti e una tela vuota: niente che dicesse *cosa fare per primo*.
 * L'onboarding spiegava i comandi, non il lavoro — e il cliente di questo
 * prodotto prova quaranta strumenti al mese e ne tiene due.
 *
 * La risposta è un file già sul piano di lavoro. Non un tour: si apre lo
 * studio, c'è un'immagine vera — una maglietta JAYL su fondo bianco, cioè
 * esattamente il lavoro per cui esiste lo scontorno — e il tasto Zack fa un
 * lampo solo per dire da dove si comincia.
 *
 * Perché una maglietta e non una foto qualunque: il primo minuto deve mostrare
 * *il mestiere*, non la funzione. Un capo su fondo bianco che diventa un PNG
 * alla misura di stampa è il ciclo intero del prodotto in una pressione sola.
 *
 * La matematica sta qui, separata dal disegno, perché è la parte capace di
 * sbagliare in silenzio: un file di prova che ricompare a ogni apertura è più
 * fastidioso di nessun file di prova.
 */

/** Dove sta il file, e come si chiama una volta sul piano. */
export const FILE_DI_PROVA = {
  url: '/prova/maglietta-jayl.jpg',
  nome: 'maglietta-jayl.jpg',
  tipo: 'image/jpeg',
};

/** La chiave che ricorda che il file di prova è già stato offerto. */
export const CHIAVE_PROVA = 'jayl.provaVista';

/**
 * Va caricato il file di prova all'apertura?
 *
 * Solo alla **primissima** apertura, e solo se non c'è già del lavoro:
 *
 * - chi ha dei lavori in libreria ha già passato il primo minuto, e trovarsi
 *   una maglietta altrui sul piano è un'intrusione;
 * - chi l'ha già visto una volta l'ha già visto. Resta il tasto «prova con un
 *   esempio» nel riquadro vuoto, che è un invito e non un'imposizione.
 *
 * L'archivio negato (finestra anonima, cookie bloccati) non è un caso da
 * proteggere: si mostra. Un file di prova in più è un difetto piccolo, un
 * primo minuto vuoto è il difetto che costa di più.
 */
export function deveMostrareProva({ archivio, lavori = 0 } = {}) {
  if (lavori > 0) return false;
  try {
    return archivio?.getItem(CHIAVE_PROVA) !== '1';
  } catch {
    return true;
  }
}

/** Segna il file di prova come già offerto. */
export function segnaProvaVista(archivio) {
  try {
    archivio?.setItem(CHIAVE_PROVA, '1');
  } catch {
    // Archivio negato: ricomparirà alla prossima apertura. È il male minore.
  }
}

/**
 * Scarica il file di prova e lo restituisce come `File`, pronto per lo stesso
 * percorso di un file trascinato: da lì in poi non è più «un esempio», è un
 * file di lavoro come gli altri, e tutto quello che si impara su di lui vale.
 */
export async function caricaFileDiProva(fetchImpl = fetch) {
  const risposta = await fetchImpl(FILE_DI_PROVA.url);
  if (!risposta.ok) throw new Error(`file di prova non raggiungibile: ${risposta.status}`);
  const blob = await risposta.blob();
  return new File([blob], FILE_DI_PROVA.nome, { type: FILE_DI_PROVA.tipo });
}
