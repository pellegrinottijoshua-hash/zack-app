/**
 * La rete finta delle prove della voce (fase 6). Supabase tiene il saldo, le
 * voci del conto e i consensi; ElevenLabs risponde come gli dice la prova.
 * Ogni chiamata si registra, in ordine. Nessuna chiave vera.
 */

export const MP3 = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]);

const leggiCorpo = (b) => {
  if (typeof b !== 'string') return b ?? null; // FormData, Blob: si tengono come sono
  try {
    return JSON.parse(b);
  } catch {
    return b;
  }
};

export function mondo({
  saldo = 100000,
  fornitore = () => new Response(MP3, { headers: { 'x-character-count': '16' } }),
  accredita = () => new Response('1'),
  voci = [],
  archivioVoci = true,
  archivioConsensi = true,
} = {}) {
  const chiamate = [];
  const tabellaVoci = [...voci];
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    const metodo = o.method || 'GET';
    const corpo = leggiCorpo(o.body);
    chiamate.push({ url, metodo, corpo, intestazioni: o.headers || {} });
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u-1', email: 'c@e.it' }));
    if (url.includes('/rpc/addebita')) {
      return new Response(JSON.stringify(saldo >= corpo.p_prezzo ? saldo - corpo.p_prezzo : null));
    }
    if (url.includes('/rpc/accredita')) return accredita();
    if (url.includes('/rest/v1/lavori')) return new Response('{}', { status: metodo === 'POST' ? 201 : 200 });
    if (url.includes('/rest/v1/voci')) {
      if (!archivioVoci) return new Response('{}', { status: 500 });
      if (metodo === 'GET') return new Response(JSON.stringify(tabellaVoci.map((eleven_id) => ({ eleven_id }))));
      if (metodo === 'POST') {
        tabellaVoci.push(corpo.eleven_id);
        return new Response('{}', { status: 201 });
      }
      if (metodo === 'DELETE') return new Response('{}');
    }
    if (url.includes('/rest/v1/consensi')) {
      return new Response('{}', { status: archivioConsensi ? 201 : 500 });
    }
    if (url.includes('api.elevenlabs.io')) return fornitore(url, o);
    return new Response('{}');
  };
  chiamate.voci = tabellaVoci;
  return chiamate;
}
