/**
 * I sei servizi, in due gruppi.
 *
 * La divisione non è cosmetica: tre girano sul computer del cliente e sono
 * illimitati, tre costano denaro a ogni uso. Sono due modi di pensare diversi,
 * e mescolarli in una lista piatta nasconde proprio l'informazione che serve
 * prima di cliccare.
 *
 * `price` NON è più un campo che ogni servizio a pagamento porta: un servizio
 * che il listino già conosce (`immagine`) mostra in barra lo stesso numero del
 * preventivo, calcolato da `prezzoDi` in `ToolRail.jsx` — due cifre diverse
 * per la stessa generazione, visibili insieme sulla stessa schermata,
 * romperebbero la promessa della home («ogni generazione ti dice quanto
 * costa prima che tu prema»). `price` resta SOLO sui servizi che il listino
 * non conosce ancora perché non hanno un fornitore costruito (`video`, in
 * arrivo con B3): lì è l'unica stima possibile, e resta dichiaratamente tale.
 */

export const GROUP_LOCAL = 'local';
export const GROUP_PAID = 'paid';

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
    /*
     * Acceso da Task 8: prima non c'era modo di comprare crediti, quindi chi
     * avesse trovato «Immagine» in barra avrebbe avuto zero crediti e nessun
     * modo di procurarsene. `Ricarica.jsx` e `/ricarica` lo risolvono, e con
     * loro l'interruttore puo' girare.
     */
    id: 'immagine',
    group: GROUP_PAID,
    key: 'tool.image',
    icon: 'image',
    ready: true,
    // NIENTE `price` qui: il listino (`immagine-nbp`) esiste già, e la barra
    // legge il prezzo vero da lì — vedi `ToolRail.jsx`. Un letterale qui
    // sarebbe una seconda fonte, ed è esattamente il difetto della
    // correzione 1: 0,13 € indicativi accanto a 0,15 € veri, sulla stessa
    // schermata.
  },
  {
    id: 'video',
    group: GROUP_PAID,
    key: 'tool.video',
    icon: 'film',
    ready: true,
    // Fase 3: Seedance 2.5. Niente `price` scritto a mano: la barra legge il
    // «da» da `listinoVideo.js`, lo stesso modulo che addebita.
  },
];

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

/**
 * L'ordine della fila dei servizi, **senza Brain**.
 *
 * Deciso dal committente il 2026-09-15 (quaderno, H1-bis). In basso sull'app,
 * in alto sulla webapp: è la stessa fila.
 *
 *   vettoriale · [editor di testo] · immagine · SCONTORNA · video · vocale · effetti
 *
 * **Scontorna sta in mezzo**, ed è il motivo dell'ordine: immagine alla sua
 * sinistra, video alla sua destra, come nel disegno. Chi non è abbonato vede
 * quei tre e basta — se ne occupa `mostraInFila`, che lo decide con la stessa
 * regola del muro invece che con una sua.
 *
 * ⚠️ **L'«editor di testo» non è in questa lista**, pur avendo il suo posto
 * nell'ordine (il secondo): il servizio non esiste ancora — oggi si scrive
 * dentro Brain — e un cerchio che si accende senza fare niente è il difetto
 * del righello del 2026-09-04. Quando il servizio ci sarà, entra qui in
 * seconda posizione e scontorna diventa il quarto di sette, cioè il centro
 * esatto.
 *
 * Brain non è in fila: è un cerchio a sé, in alto a sinistra, sempre presente
 * (H2), perché è la libreria e ci si pesca dentro mentre si lavora.
 */
const FILA = ['vettorializza', 'immagine', 'scontorna', 'video', 'vocale', 'effetti'];

export const ordineDellaFila = () => FILA.map(getService);

/** Il primo servizio utilizzabile: non si apre mai l'app su una funzione spenta. */
export function firstReady() {
  return SERVICES.find((s) => s.ready) || SERVICES[0];
}
