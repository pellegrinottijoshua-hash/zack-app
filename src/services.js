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

export const SERVICES = [
  {
    id: 'scontorna',
    group: GROUP_LOCAL,
    key: 'tool.cutout',
    icon: 'scissors',
    ready: true,
  },
  {
    id: 'vettorializza',
    group: GROUP_LOCAL,
    key: 'tool.vector',
    icon: 'vector',
    ready: true,
  },
  {
    id: 'editor',
    group: GROUP_LOCAL,
    key: 'tool.editor',
    icon: 'pencil',
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
  {
    id: 'suono',
    group: GROUP_PAID,
    key: 'tool.sound',
    icon: 'wave',
    ready: false,
    price: 0.04,
  },
];

export const localServices = () => SERVICES.filter((s) => s.group === GROUP_LOCAL);
export const paidServices = () => SERVICES.filter((s) => s.group === GROUP_PAID);

export function getService(id) {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) throw new Error(`Servizio sconosciuto: ${id}`);
  return s;
}

/** Il primo servizio utilizzabile: non si apre mai l'app su una funzione spenta. */
export function firstReady() {
  return SERVICES.find((s) => s.ready) || SERVICES[0];
}
