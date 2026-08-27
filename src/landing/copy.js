/**
 * I testi della pagina di presentazione.
 *
 * Separati dai componenti perché sono la parte che si riscrive di più: una
 * pagina che deve convincere si corregge a parole, non a codice. E perché il
 * tono lo decide chi conosce il brand, non chi conosce React.
 *
 * Regole JAYL rispettate: niente linguaggio da televendita, niente
 * giustificazioni, mostrare invece di dichiarare, e «Art finds a way.» chiude.
 */

export const COPY = {
  it: {
    nav: { app: 'Apri lo studio', price: '3,99 €/mese' },

    hero: {
      kicker: 'Per chi crea con l’AI',
      title: 'Genera dove vuoi.\nRifinisci qui.',
      body:
        'Scontorno, vettoriale, ritocco e archivio per la valanga di immagini che i generatori sputano fuori. Tutto sul tuo computer, illimitato, a 3,99 € al mese.',
      cta: 'Comincia',
      note: 'Nessun file lascia il tuo computer.',
    },

    problem: {
      kicker: 'Il problema',
      title: 'Generare è la parte facile.',
      body:
        'Quaranta immagini in un pomeriggio, e poi? Scontornare a mano, ritagliare per la stampa, ritrovare quella di martedì. Il tempo se ne va tutto dopo la generazione, e nessuno strumento è fatto per quel dopo.',
    },

    tools: {
      kicker: 'Incluso, illimitato',
      title: 'Tre strumenti che non ti costano a ogni clic.',
      body:
        'Girano sulla tua macchina, non su un server. Per questo possono essere illimitati: non costano niente a nessuno.',
      items: [
        { name: 'Scontorna', desc: 'Sfondo via in un secondo. Poi correggi a mano dove serve, col pennello.' },
        { name: 'Vettorializza', desc: 'Da pixel a forme che puoi ingrandire quanto vuoi. E un editor per modificarle.' },
        { name: 'Esporta', desc: 'Gelato, A4, formati social. La grafica non viene mai ingrandita a forza.' },
      ],
    },

    library: {
      kicker: 'La differenza',
      title: 'I tuoi asset restano vivi.',
      body:
        'Ritagli un personaggio una volta e diventa un ingrediente: lo metti in una moodboard, ci generi sopra, torna nella stessa moodboard. Canva ha le cartelle ma i file dentro sono morti. I generatori hanno i riferimenti ma dimenticano tutto fra una sessione e l’altra.',
      quote: 'Nessuno dei due tiene insieme le due cose.',
    },

    generate: {
      kicker: 'A consumo',
      title: 'Paghi la generazione. Al centesimo.',
      body:
        'Immagini, video e suoni dai modelli migliori, con il prezzo scritto prima di premere. Nessun abbonamento gonfiato per funzioni che non usi.',
      example: 'Questo video costa 0,39 € — 0,34 € di calcolo, 0,05 € a noi.',
      note: 'Il margine è dichiarato. Nessun altro lo fa.',
    },

    privacy: {
      kicker: 'Dove stanno i tuoi file',
      title: 'Sul tuo computer. Punto.',
      body:
        'Lo scontorno gira nel tuo browser. L’archivio sta nel tuo disco. Non c’è un server che li guarda, perché non c’è un server.',
    },

    compare: {
      kicker: 'Il conto',
      title: 'Quanto paghi oggi.',
      rows: [
        { name: 'Canva Pro', price: '~12 €/mese', note: 'a prescindere da quanto lo usi' },
        { name: 'Adobe', price: '~24 €/mese', note: 'a prescindere da quanto lo usi' },
        { name: 'Zack App', price: '3,99 €/mese', note: 'strumenti illimitati, generazione a consumo' },
      ],
    },

    final: {
      title: 'Prova con un tuo file.',
      body: 'Non serve registrarsi per capire se ti serve.',
      cta: 'Apri lo studio',
      payoff: 'Art finds a way.',
    },
  },

  en: {
    nav: { app: 'Open the studio', price: '€3.99/month' },

    hero: {
      kicker: 'For people who create with AI',
      title: 'Generate anywhere.\nFinish here.',
      body:
        'Cutout, vector, retouching and an archive for the flood of images generators produce. All on your own machine, unlimited, for €3.99 a month.',
      cta: 'Get started',
      note: 'No file leaves your computer.',
    },

    problem: {
      kicker: 'The problem',
      title: 'Generating is the easy part.',
      body:
        'Forty images in an afternoon, and then what? Cutting out by hand, cropping for print, finding the one from Tuesday. All the time goes after the generation, and no tool is built for that after.',
    },

    tools: {
      kicker: 'Included, unlimited',
      title: "Three tools that don't charge you per click.",
      body:
        "They run on your machine, not on a server. That's why they can be unlimited: they cost nobody anything.",
      items: [
        { name: 'Remove background', desc: 'Background gone in a second. Then fix it by hand where it matters, with the brush.' },
        { name: 'Vectorise', desc: 'Pixels into shapes you can scale as far as you like. Plus an editor to change them.' },
        { name: 'Export', desc: 'Gelato, A4, social formats. Your artwork is never forced larger than it is.' },
      ],
    },

    library: {
      kicker: 'The difference',
      title: 'Your assets stay alive.',
      body:
        'Cut out a character once and it becomes an ingredient: put it in a moodboard, generate from it, and it comes back to the same moodboard. Canva has folders but the files inside are dead. Generators have references but forget everything between sessions.',
      quote: 'Neither of them holds the two together.',
    },

    generate: {
      kicker: 'Pay per use',
      title: 'You pay for generation. To the cent.',
      body:
        'Images, video and sound from the best models, with the price written before you press. No inflated subscription for features you never touch.',
      example: 'This video costs €0.39 — €0.34 of compute, €0.05 to us.',
      note: 'The margin is stated. Nobody else does that.',
    },

    privacy: {
      kicker: 'Where your files live',
      title: 'On your computer. That’s it.',
      body:
        "The cutout runs in your browser. The archive sits on your disk. There's no server watching them, because there's no server.",
    },

    compare: {
      kicker: 'The bill',
      title: 'What you pay today.',
      rows: [
        { name: 'Canva Pro', price: '~€12/month', note: 'no matter how much you use it' },
        { name: 'Adobe', price: '~€24/month', note: 'no matter how much you use it' },
        { name: 'Zack App', price: '€3.99/month', note: 'unlimited tools, generation pay per use' },
      ],
    },

    final: {
      title: 'Try it with a file of your own.',
      body: "You don't need to sign up to find out whether it's for you.",
      cta: 'Open the studio',
      payoff: 'Art finds a way.',
    },
  },
};
