#!/usr/bin/env node
/**
 * La prova di raggiungibilità — la regola §3.1 di docs/2026-09-18-riprendi-qui.md.
 *
 * Apre l'app nel browser VERO (Chrome headless, comandato via DevTools
 * Protocol, senza dipendenze nuove) e, per ogni comando visibile, in ogni
 * stato dichiarato e a ogni larghezza, afferma tre cose:
 *
 *   1. `elementFromPoint` al centro del comando restituisce QUEL comando;
 *   2. il rettangolo del comando sta dentro la finestra (o ci arriva
 *      scorrendo un contenitore che scorre davvero);
 *   3. il testo contro lo sfondo DAVVERO dipinto supera 4,5:1.
 *
 * Più il cancello duro: a muro acceso, Immagine mostra il prezzo e non
 * «Entra per usare lo studio».
 *
 * Non sta in `npm test` apposta: il divieto di jsdom resta, e questa prova
 * vive nel browser. Non guarda quale regola CSS vince: guarda il pixel.
 *
 * Uso (i due server li avvia `.claude/launch.json`, o a mano):
 *   npx vite --port 5173              # muro spento
 *   npx vite --port 5174 --mode muro  # muro acceso
 *   node scripts/raggiungibilita.mjs [--spento URL] [--acceso URL] [--rapido] [--finestra 844x390]
 *
 * Esce con 1 se c'è anche un solo difetto non messo a verbale in
 * scripts/raggiungibilita-noti.json. Un difetto noto che sparisce viene
 * segnalato, così la lista non invecchia di nascosto.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (nome, difetto) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : difetto;
};
const SPENTO = arg('--spento', 'http://localhost:5173');
const ACCESO = arg('--acceso', 'http://localhost:5174');
const RAPIDO = args.includes('--rapido');
const CHROME = process.env.CHROME ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ------------------------------------------------------------------ *
 * La matrice: tutto ciò che la prova percorre, dichiarato qui e basta.
 * ------------------------------------------------------------------ */

const SOLA = arg('--finestra', null); // «844x390»: una misura sola, per i giri veloci
const TUTTE = RAPIDO
  ? [[390, 844], [800, 700], [1280, 800]]
  // 844×390: il telefono in orizzontale, dove la fase 1 ha perso la testata
  // della libreria. Senza uno schermo basso quella porta non si vede.
  : [[390, 844], [760, 900], [761, 900], [800, 700], [1280, 800], [844, 390]];
const FINESTRE = SOLA ? [SOLA.split('x').map(Number)] : TUTTE;

const SERVIZI = ['brain', 'vettorializza', 'scontorna', 'vocale', 'effetti', 'immagine'];

/** Ogni prova parte da uno stato dichiarato: mai da un saldo già carico per caso. */
function statoIniziale({ saldo, libreria, primo = false }) {
  const s = { 'jayl.libOpen': libreria ? '1' : '0' };
  // Il benvenuto e il file di prova si presentano al primo ingresso, e il
  // file di prova arriva quando è pronta la libreria: un momento che cambia
  // fra un caricamento e l'altro. Si dichiarano visti, così lo studio parte
  // vuoto e uguale ogni volta. Il benvenuto si misura a parte (`primo`).
  if (!primo) {
    s['jayl.seenOnboarding'] = '1';
    s['jayl.provaVista'] = '1';
  }
  if (saldo === 'carico') {
    const tra30 = new Date(Date.now() + 30 * 864e5).toISOString();
    s['jayl.licenza'] = JSON.stringify({
      abbonato: true, validoFino: tra30, provaFino: null,
      crediti: 100000, chiestoIl: new Date().toISOString(),
    });
  }
  return s;
}

const MURI = [['spento', SPENTO], ['acceso', ACCESO]];
const SALDI = ['zero', 'carico'];
const LIBRERIE = RAPIDO ? [false] : [false, true];

/* ------------------------------------------------------------------ *
 * La sonda: gira DENTRO la pagina. Deve bastare a se stessa.
 * ------------------------------------------------------------------ */

function sonda(solo) {
  const SEL = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [tabindex]:not([tabindex="-1"])';
  const W = innerWidth, H = innerHeight;

  const rgba = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const sopra = (f, b) => { // f sopra b, b opaco
    const a = f[3];
    return [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a)).concat(1);
  };
  const lum = (c) => {
    const l = c.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const rapporto = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  /**
   * Lo sfondo davvero dipinto dietro il testo di `el`.
   *
   * Non si risale il DOM: un'etichetta in `position: absolute` può stare
   * fuori dal proprio bottone, sopra un altro colore (è successo: nome nero
   * sotto un cerchio nero, misurato 1:1). Si chiede al browser cosa sta
   * SOTTO il centro del testo, nell'ordine in cui è dipinto, e si
   * compongono gli strati dall'alto finché uno è opaco.
   */
  function sfondo(el) {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 0), W - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), H - 1);
    const pila = document.elementsFromPoint(x, y);
    const strati = [];
    for (const n of pila) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // immagine: non misurabile
      const c = rgba(cs.backgroundColor);
      if (c && c[3] > 0) {
        strati.push([c[0], c[1], c[2], c[3] * Number(cs.opacity)]);
        if (c[3] >= 1 && Number(cs.opacity) >= 1) break;
      }
    }
    let base = [255, 255, 255, 1];
    for (let i = strati.length - 1; i >= 0; i--) base = sopra(strati[i], base);
    return base;
  }

  const nome = (el) => {
    const t = (el.getAttribute('aria-label') || el.title || el.textContent || el.value || '')
      .trim().replace(/\s+/g, ' ').slice(0, 40);
    const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${t ? ` «${t}»` : ''}`;
  };

  const visibile = (el) => {
    if (el.closest('[inert], [aria-hidden=true]')) return false;
    if (el.disabled) return true; // si vede, e deve vedersi bene
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };

  /** C'è un antenato che scorre davvero e può portarlo nella finestra? */
  const scorribile = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const sy = /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
      const sx = /(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
      if (sy || sx) return true;
    }
    const d = document.scrollingElement;
    return d.scrollHeight > H + 1 && getComputedStyle(document.body).overflowY !== 'hidden';
  };

  const difetti = [];
  const visti = new Set();
  let contati = 0;
  for (const el of document.querySelectorAll(SEL)) {
    if (solo && !el.closest(solo)) continue;
    if (!visibile(el)) continue;
    if (el.disabled && el.getBoundingClientRect().width < 1) continue;
    // Un <input> dentro una <label> cliccabile: il comando è la label.
    const cmd = el.matches('input') && el.closest('label') ? el.closest('label') : el;
    if (visti.has(cmd)) continue;
    visti.add(cmd);
    contati++;
    const n = nome(cmd);
    let r = cmd.getBoundingClientRect();

    // 2 — dentro la finestra
    const fuori = r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5;
    if (fuori) {
      if (!scorribile(cmd)) {
        difetti.push({ regola: 'fuori', comando: n, rett: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        continue;
      }
      cmd.scrollIntoView({ block: 'center', inline: 'center' });
      r = cmd.getBoundingClientRect();
      if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) {
        difetti.push({ regola: 'fuori', comando: n, rett: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        continue;
      }
    }

    // 1 — al centro c'è lui. Se è coperto ma la pagina scorre, si prova a
    // portarlo al centro e si rimisura: una testata incollata (`sticky`) che
    // copre il fondo non chiude niente, se scorrendo il comando le esce da
    // sotto. Chiude se resta coperto anche al centro.
    const colpisce = () => {
      const q = cmd.getBoundingClientRect();
      const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return { hit, ok: Boolean(hit && (hit === cmd || cmd.contains(hit) ||
        (cmd.matches('label') && hit === cmd.control))) };
    };
    let prova = colpisce();
    if (!prova.ok && scorribile(cmd)) {
      cmd.scrollIntoView({ block: 'center', inline: 'center' });
      prova = colpisce();
    }
    if (!prova.ok) {
      difetti.push({ regola: 'coperto', comando: n, da: prova.hit ? nome(prova.hit) : '(niente)' });
    }

    // 3 — contrasto, solo dove c'è testo DIPINTO: un'etichetta nascosta
    // (0×0, o `display:none` dentro un bottone visibile) non si legge e non
    // si misura. Si misura ogni nodo che porta testo proprio, non solo il primo.
    const proprio = (c) => [...c.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim());
    const dipinto = (c) => {
      const q = c.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) return false;
      for (let n = c; n && n !== cmd.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    const portatori = [cmd, ...cmd.querySelectorAll('*')].filter((c) => proprio(c) && dipinto(c));
    let peggiore = null;
    for (const portatore of cmd.disabled ? [] : portatori) {
      const cs = getComputedStyle(portatore);
      const fg = rgba(cs.color);
      const bg = sfondo(portatore);
      if (fg && bg) {
        const k = rapporto(sopra(fg, bg), bg);
        if (peggiore === null || k < peggiore) peggiore = k;
      }
    }
    if (peggiore !== null && peggiore < 4.5) {
      difetti.push({ regola: 'contrasto', comando: n, rapporto: Math.round(peggiore * 100) / 100 });
    }
  }

  const corpo = document.body.innerText;
  return {
    studio: Boolean(document.querySelector('.shell')),
    home: Boolean(document.querySelector('.banco')),
    contati,
    difetti,
    muroEntra: corpo.includes('Entra per usare lo studio'),
    prezzo: /\d+(?:[.,]\d+)?\s*(?:€|crediti|credit)/i.test(corpo),
  };
}

/* ------------------------------------------------------------------ *
 * Chrome via DevTools Protocol, col WebSocket di Node 22.
 * ------------------------------------------------------------------ */

async function apriChrome() {
  const dir = mkdtempSync(join(tmpdir(), 'jayl-ragg-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });
  const porta = await new Promise((ok, ko) => {
    const t0 = Date.now();
    const giro = () => {
      const f = join(dir, 'DevToolsActivePort');
      if (existsSync(f)) {
        const [p] = readFileSync(f, 'utf8').split('\n');
        if (p) return ok(p);
      }
      if (Date.now() - t0 > 15000) return ko(new Error('Chrome non si è aperto'));
      setTimeout(giro, 100);
    };
    giro();
  });
  const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  const pagina = lista.find((x) => x.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let id = 0;
  const attese = new Map();
  const eventi = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && attese.has(m.id)) {
      const { ok, ko } = attese.get(m.id);
      attese.delete(m.id);
      m.error ? ko(new Error(m.error.message)) : ok(m.result);
    } else if (m.method) {
      for (const f of eventi) f(m);
    }
  });
  const cdp = (method, params = {}) => new Promise((ok, ko) => {
    attese.set(++id, { ok, ko });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const chiudi = async () => {
    try { ws.close(); } catch {}
    const uscito = new Promise((ok) => proc.once('exit', ok));
    proc.kill();
    await uscito;
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  };
  return { cdp, eventi, chiudi };
}

async function valuta(cdp, espr) {
  const r = await cdp('Runtime.evaluate', { expression: espr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

async function carica(cdp, eventi, url) {
  const fatto = new Promise((ok) => {
    const f = (m) => {
      if (m.method === 'Page.loadEventFired') {
        eventi.splice(eventi.indexOf(f), 1);
        ok();
      }
    };
    eventi.push(f);
  });
  await cdp('Page.navigate', { url });
  await fatto;
}

/** Aspetta che React abbia disegnato e che il layout sia fermo. */
async function assesta(cdp) {
  await valuta(cdp, `new Promise((ok) => {
    let prima = '', fermi = 0;
    const giro = () => {
      const ora = document.body.innerHTML.length + ':' + document.querySelectorAll('button').length;
      fermi = ora === prima ? fermi + 1 : 0;
      prima = ora;
      if (fermi >= 3) return ok();
      setTimeout(giro, 120);
    };
    setTimeout(giro, 200);
  })`);
  // Le transizioni della libreria: si lasciano finire.
  await valuta(cdp, 'new Promise((ok) => setTimeout(ok, 450))');
}

/* ------------------------------------------------------------------ */

async function main() {
  const noti = JSON.parse(readFileSync(join(QUI, 'raggiungibilita-noti.json'), 'utf8'));
  const chiaviNote = new Set(noti.difetti.map((d) => d.chiave));
  const visteNote = new Set();

  const { cdp, eventi, chiudi } = await apriChrome();
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  const nuovi = [];
  let pagine = 0, comandi = 0;
  const cancello = [];

  try {
    for (const [muro, base] of MURI) {
      try {
        await fetch(base);
      } catch {
        throw new Error(`Il server del muro ${muro} non risponde su ${base}. Avvialo prima (vedi l'intestazione).`);
      }
      for (const saldo of SALDI) {
        for (const libreria of LIBRERIE) {
          for (const [w, h] of FINESTRE) {
            await cdp('Emulation.setDeviceMetricsOverride', {
              width: w, height: h, deviceScaleFactor: 1, mobile: w < 768,
            });
            await cdp('Emulation.setTouchEmulationEnabled', { enabled: w < 768 });
            const giri = SERVIZI.map((servizio) => ({ servizio, primo: false, solo: null }));
            // Il primo ingresso: si misura il benvenuto, che sta sopra tutto.
            if (saldo === 'zero' && !libreria) giri.push({ servizio: 'scontorna', primo: true, solo: '.onboarding' });
            // La home (fetta 2c): il banco a tre corsie. La libreria lì non
            // esiste, quindi si misura una volta sola per stato.
            if (!libreria) giri.push({ servizio: 'home', primo: false, solo: null });
            for (const { servizio, primo, solo } of giri) {
              const indirizzo = servizio === 'home' ? `${base}/` : `${base}/app/?servizio=${servizio}`;
              // Stato dichiarato: memoria vuota, poi solo ciò che la matrice dice.
              await carica(cdp, eventi, indirizzo);
              const s = JSON.stringify(statoIniziale({ saldo, libreria, primo }));
              await valuta(cdp, `localStorage.clear(); sessionStorage.clear();
                for (const [k, v] of Object.entries(${s})) localStorage.setItem(k, v);`);
              await carica(cdp, eventi, indirizzo);
              await assesta(cdp);
              const r = await valuta(cdp, `(${sonda})(${JSON.stringify(solo)})`);
              if (servizio === 'home' ? !r.home : !r.studio) {
                throw new Error(`Non è la pagina attesa (manca ${servizio === 'home' ? '.banco' : '.shell'}): ${indirizzo}`);
              }
              pagine++;
              comandi += r.contati;
              const dove = `muro ${muro} · saldo ${saldo} · libreria ${libreria ? 'aperta' : 'chiusa'} · ${w}×${h} · ${servizio}${primo ? ' · primo ingresso' : ''}`;

              for (const d of r.difetti) {
                const chiave = `${d.regola}|${d.comando}`;
                if (chiaviNote.has(chiave)) { visteNote.add(chiave); continue; }
                nuovi.push({ dove, chiave, ...d });
              }

              if (muro === 'acceso' && servizio === 'immagine' && saldo === 'zero' && !primo) {
                if (r.muroEntra || !r.prezzo) {
                  cancello.push(`${dove}: ${r.muroEntra ? '«Entra per usare lo studio»' : 'nessun prezzo a schermo'}`);
                }
              }
              process.stdout.write('.');
            }
          }
        }
      }
    }
  } finally {
    await chiudi();
  }

  console.log(`\n\n${pagine} pagine, ${comandi} comandi misurati.`);

  const cancelloNoto = noti.cancello === 'rosso-noto';
  if (cancello.length) {
    console.log(`\n${cancelloNoto ? '⚠️' : '❌'} CANCELLO DURO (a muro acceso Immagine deve mostrare il prezzo):`);
    for (const c of [...new Set(cancello)].slice(0, 5)) console.log('   ' + c);
    if (cancelloNoto) console.log('   (noto: va chiuso in 2b, prima di accendere il muro)');
  } else {
    console.log('\n✅ Cancello duro: Immagine mostra il prezzo a muro acceso.');
    if (cancelloNoto) console.log('   Il cancello è chiuso: togli "cancello": "rosso-noto" dai noti.');
  }

  const spariti = [...chiaviNote].filter((k) => !visteNote.has(k));
  if (spariti.length && !RAPIDO && !SOLA) {
    console.log(`\n🧹 ${spariti.length} difetti noti non si presentano più — toglili da raggiungibilita-noti.json:`);
    for (const k of spariti) console.log('   ' + k);
  }

  if (nuovi.length) {
    const per = new Map();
    for (const d of nuovi) {
      if (!per.has(d.chiave)) per.set(d.chiave, { ...d, dovunque: new Set(), larghezze: new Set(), volte: 0 });
      const x = per.get(d.chiave);
      x.volte++;
      x.larghezze.add(d.dove.match(/(\d+)×/)[1]);
      x.dovunque.add(d.dove.split(' · ').filter((p) => !/×/.test(p)).join(' · '));
    }
    console.log(`\n❌ ${per.size} difetti nuovi (${nuovi.length} occorrenze):`);
    for (const d of per.values()) {
      const extra = d.regola === 'coperto' ? `coperto da ${d.da}`
        : d.regola === 'fuori' ? `rettangolo ${d.rett.join(',')}`
        : `rapporto ${d.rapporto}:1`;
      console.log(`   [${d.regola}] ${d.comando} — ${extra}  (×${d.volte}, a ${[...d.larghezze].join('/')} px)`);
      console.log(`      primo: ${d.dove}`);
      console.log(`      chiave: ${d.chiave}`);
    }
  } else {
    console.log('\n✅ Nessun difetto nuovo.');
  }

  process.exit(nuovi.length || (cancello.length && !cancelloNoto) ? 1 : 0);
}

main().catch((e) => {
  console.error('\n' + e.message);
  process.exit(2);
});
