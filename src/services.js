/**
 * I sei servizi, in due gruppi.
 *
 * La divisione non è cosmetica: tre girano sul computer del cliente e sono
 * illimitati, tre costano denaro a ogni uso. Sono due modi di pensare diversi,
 * e mescolarli in una lista piatta nasconde proprio l'informazione che serve
 * prima di cliccare.
 *
 * `price` è indicativo e serve solo a dare l'ordine di grandezza nella barra;
 * il prezzo esatto lo calcola l'adattatore prima di ogni generazione.
 */

export const GROUP_LOCAL = 'local';
export const GROUP_PAID = 'paid';

/**
 * L'ordine della fila in basso, deciso dal committente il 2026-08-31:
 * Brain · Vettoriale · SCONTORNO · Suono · Filmato. Lo scontorno sta in mezzo
 * perche' e' il centro del prodotto, ed e' il posto che si raggiunge col
 * pollice senza spostare la mano. I due a consumo restano ultimi e fuori
 * dalla barra finche' non ci sara' cosa premere.
 *
 * Dal 2026-09-08 sono SEI: «suono» si e' diviso in Vocale ed Effetti. Lo
 * scontorno resta terzo, cioe' non piu' esattamente in mezzo — la regola del
 * pollice regge con sei, ma se un giorno diventassero sette va ridiscussa
 * invece che lasciata scivolare.
 */
export const SERVICES = [
  {
    // Primo della lista, e non per gerarchia: è l'unico servizio che ha senso
    // guardare senza aver caricato niente. Gli altri, senza un file, sono una
    // tela vuota con una colonna di comandi spenti; Brain aperto è il tuo
    // archivio. È anche il posto dove il ciclo dei riferimenti si chiude —
    // scontorni, l'asset entra in una tela, la tela è il set di riferimenti.
    id: 'brain',
    group: GROUP_LOCAL,
    key: 'tool.brain',
    icon: 'brain',
    ready: true,
  },
  {
    // Vettorializza ED editor SVG: un servizio solo, perche' sono un gesto
    // solo. Nessuno traccia un'immagine per lasciarla com'e' viene, e nessuno
    // apre l'editor senza qualcosa da modificare — erano due cerchi che si
    // rimandavano l'un l'altro. Dentro, `tool === 'editor'` resta il MODO in
    // cui si ritocca: si entra tracciando, o portando dentro un SVG.
    id: 'vettorializza',
    group: GROUP_LOCAL,
    key: 'tool.vector',
    icon: 'vector',
    ready: true,
  },
  {
    id: 'scontorna',
    group: GROUP_LOCAL,
    key: 'tool.cutout',
    icon: 'scissors',
    ready: true,
  },
  {
    /*
     * La voce. Sta fra i GRATUITI: non genera niente, filtra la voce
     * registrata. Nessun modello, nessun costo, nessuna attesa.
     *
     * Era «suono», ed erano DUE mestieri su una schermata sola: registrare
     * una voce e trasformarla, e costruire un tonfo da zero. Divisi il
     * 2026-09-08 su decisione del committente. `wave` resta qui perche'
     * un'onda registrata E' la voce.
     */
    id: 'vocale',
    group: GROUP_LOCAL,
    key: 'tool.vocale',
    icon: 'wave',
    ready: true,
  },
  {
    /*
     * Gli effetti sonori: qui non si registra niente, si COSTRUISCE. Un
     * whoosh e' rumore filtrato con un inviluppo — la matematica sta in
     * `engine/synth.js`, e per questo il servizio e' gratuito come l'altro.
     *
     * Il microfono serve anche qui, ma per un'altra cosa: battere un ritmo
     * che l'effetto poi segue. E' il ponte, non la materia.
     */
    id: 'effetti',
    group: GROUP_LOCAL,
    key: 'tool.effetti',
    icon: 'scoppio',
    ready: true,
  },
  {
    id: 'immagine',
    group: GROUP_PAID,
    key: 'tool.image',
    icon: 'image',
    ready: false,
    price: 0.13,
  },
  {
    id: 'video',
    group: GROUP_PAID,
    key: 'tool.video',
    icon: 'film',
    ready: false,
    price: 0.21,
  },
];

export const localServices = () => SERVICES.filter((s) => s.group === GROUP_LOCAL);
export const paidServices = () => SERVICES.filter((s) => s.group === GROUP_PAID);

/**
 * Il servizio a cui appartiene uno strumento.
 *
 * L'editor non e' piu' un servizio suo: e' il modo in cui si ritocca dentro
 * «Vettoriale». Chi deve accendere un cerchio nella barra passa di qui.
 */
export function servizioDelloStrumento(tool) {
  return tool === 'editor' ? 'vettorializza' : tool;
}

/**
 * I nomi vecchi che devono ancora portare da qualche parte.
 *
 * `?servizio=suono` e' un indirizzo che qualcuno puo' avere salvato. Senza
 * questa riga `SERVICES.find` non trova niente e si finisce sullo scontorno:
 * un collegamento che porta altrove senza dirlo e' peggio di uno rotto.
 */
export const NOMI_VECCHI = { suono: 'vocale' };

/*
 * ⚠️ `filmato` NON sta qui, ed è voluto.
 *
 * Il servizio è stato tolto il 2026-09-09: la rimozione dello sfondo da un
 * video richiede il modello su OGNI fotogramma — circa otto minuti per dieci
 * secondi — e il committente ha deciso che non ha senso. Mandare
 * `?servizio=filmato` a un altro servizio direbbe che c'è ancora qualcosa lì.
 * Non c'è: si finisce sullo scontorno, che è dove l'app comincia.
 */

export function getService(id) {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) throw new Error(`Servizio sconosciuto: ${id}`);
  return s;
}

/** Il primo servizio utilizzabile: non si apre mai l'app su una funzione spenta. */
export function firstReady() {
  return SERVICES.find((s) => s.ready) || SERVICES[0];
}
