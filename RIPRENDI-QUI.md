# RIPRENDI QUI — JAYL STUDIO

Documento di passaggio. Serve ad aprire una chat nuova e ripartire senza
ricostruire il contesto. Se leggi solo una cosa, leggi la sezione 2.

- **Repo:** `~/jayl-studio` — ramo `main`, 59 commit, **216 test verdi**
- **Data di questo passaggio:** 25 agosto 2026
- **Il resto:** [README.md](README.md) descrive il prodotto per intero;
  `docs/superpowers/specs/` contiene i due disegni approvati.

```bash
cd ~/jayl-studio && npm run dev
```

`http://localhost:5173/` è la pagina di presentazione, `http://localhost:5173/app/`
è lo studio. Il backend può restare spento: serve solo alla libreria su disco.

```bash
npm test && npm run build
```

Entrambi devono passare prima di qualunque commit.

---

## 1. Cos'è

Lo strato di **post-produzione per chi genera con l'AI**. Non un altro
generatore: il posto dove l'asset generato viene rifinito, organizzato e
preparato per finire su qualcosa di fisico.

Nasce da `jayl-craft`, uno strumento locale, ed è diventato un servizio:
**3,99 €/mese**, e la generazione a consumo separata.

Il cliente: designer, movie maker, AI director. L'alternativa cheap a Canva e
Adobe, e in parte a Higgsfield e Suno.

---

## 2. Le regole che non si negoziano

Sono decisioni prese, non preferenze. Cambiarne una richiede una ragione
esplicita, non una svista.

**Tutto gratis e in locale, per i servizi gratuiti.** È il vincolo che il
committente ha posto per primo e da cui discende l'architettura intera: *«se devo
usare api estranee tipo canva a pagamento piuttosto uso canva»*. Scontorno,
vettoriale, export, editor, suono, rifiniture girano **nel browser del cliente**.
Nessun file esce dal suo computer, nessun costo di elaborazione per noi. È il
motivo per cui il prodotto può stare a 3,99 € senza erodersi i margini.

**Licenze dei pesi, non solo del codice.** `bria-rmbg` e `u2net_portrait` sono
vietati: non commerciali. Un test fallisce se rientrano. `bria-rmbg` è per
giunta il default della CLI di rembg — è entrato da solo una volta.

**La generazione non è mai inclusa nell'abbonamento.** Si paga a consumo da un
saldo ricaricato **prima**. Un abbonamento con generazione inclusa perde denaro
sull'utente migliore, e il post-pagamento muore al primo storno.

**Il nome del modello è l'etichetta.** Non «cosa sa fare»: *Seedance 2.5*, non
«video cinematico». Deciso dal committente contro la mia proposta iniziale, e
aveva ragione: un AI director sceglie per nome.

**Margine dichiarato: 14%.** Costo del fornitore + 14%, scritto prima di premere.
In `src/store/ledger.js`, in centesimi interi — mai float, mai euro decimali.

**Modificare non è generare.** Il laboratorio audio filtra la voce registrata e
sta fra i servizi **gratuiti**. Anche questa è una correzione del committente che
si è rivelata giusta.

**I riferimenti sono il cuore.** *«l'utilizzo di reference per img e video è
importantissimo»*. Il ciclo che nessun altro chiude: scontorni un personaggio →
diventa asset → lo metti in una moodboard → la moodboard **è** il set di
riferimenti → il risultato torna nella stessa moodboard.

**Dove non c'è una misura non c'è un avviso.** Vale per il controllo di stampa e
in generale: non si dichiarano numeri stimati come se fossero misurati.

---

## 3. Cosa è costruito

| servizio | gruppo | stato |
|---|---|---|
| Scontorna (+ pennello, + ingrandimento x4) | locale | **fatto** |
| Vettorializza | locale | **fatto** |
| Editor SVG | locale | **fatto** |
| Suono (dalla voce) | locale | **fatto** |
| Immagine | a consumo | **non costruito**, marcato «presto» |
| Video | a consumo | **non costruito**, marcato «presto» |

Più, non come servizi ma come rifiniture su un file aperto:

- **Operazioni in blocco** — le stesse operazioni su quaranta file
- **Libreria organizzata** — cartelle con colore e icona, note, preferiti,
  provenienza, raccolte pronte
- **Prima della stampa** — ritaglio intelligente, controllo di stampa, mockup

Fuori dall'app: **pagina di presentazione** su `/`, predisposta per un video AI
guidato dallo scorrimento (la matematica è testata; l'effetto va guardato con
occhi umani, nel riquadro di anteprima `requestAnimationFrame` non parte).

---

## 4. Architettura, in dieci righe

- **Vite 6, due entrate**: `index.html` (presentazione) e `app/index.html`
  (studio). Separate perché la pagina che deve convincere non può caricare
  ONNX Runtime e 28 MB di modelli.
- **React 19, nessun router.** Lo stato dello studio vive in `src/App.jsx`.
- **ONNX Runtime in un Web Worker**, WebGPU con ricaduta su WASM. Sul thread
  principale un giro a 1024px blocca la scheda per minuti: il worker è un
  requisito, non un'ottimizzazione.
- **La matematica sta separata dal disegno.** `export.js` / `render.js`,
  `crop.js`+`print.js`+`mockup.js` / `finish.js`, `sound.js` / `useSound.js`.
  La parte capace di sbagliare in silenzio sta dove i test la vedono, in Node,
  senza browser.
- **Libreria**: file in OPFS, metadati in IndexedDB, zip con `fflate`. Il
  backend Fastify serve solo alla copia su disco.

---

## 5. Le trappole già pagate

Ognuna è costata tempo. Non ripercorrerle.

| trappola | cosa succede |
|---|---|
| **BiRefNet nel browser** | non parte: 11 storage buffer per shader contro i 10 di Metal. Misurato, non supposto. |
| **Upscale x2** | produce la stessa uscita di x4 in quattro volte il tempo. Rimosso. La dimensione dell'ingresso è **del modello**, non una costante globale. |
| **`vite-plugin-top-level-await`** | rompeva la build di produzione (`missing field type` da swc). Tolto: TLA nativo con `target: 'esnext'`. |
| **`?import` di Vite su ONNX** | 500 sui `.mjs` di `public/`. Lo risolve il plugin `serveOrtAssets`. |
| **`PORT` d'ambiente** | collide fra Vite e l'API. Si usa `API_PORT`. |
| **`localhost` nel proxy** | risolve prima a `::1`, l'API ascolta su IPv4. Si usa `127.0.0.1`. |
| **`overflow-x: hidden`** | disattiva `position: sticky` in tutti i discendenti. Si usa `clip`. |
| **`transition` su `grid-template-columns`** | congela la traccia al valore vecchio quando la larghezza viene da una variabile CSS. Nessun errore. |
| **`pathedit` senza tracciato selezionato** | manda in crash svgedit e blocca l'editor per sempre. Va guardato prima. |
| **`sharp.joinChannel`** | restituisce 3 canali in silenzio e la maschera sparisce. Si interlaccia RGBA a mano. |
| **`npm test` e `library/`** | il teardown cancellava i lavori veri. Ora richiede `JAYL_CRAFT_LIBRARY` e si rifiuta di partire senza. |
| **`Math.max(...array)`** | esplode lo stack sopra ~100k elementi. |
| **Rasterizzare un SVG piccolo** | l'antialiasing diventa «bordi sfumati» e genera avvisi inventati. Minimo 1200px, e sui vettori il controllo dei bordi non si fa. |

---

## 6. Cosa manca, in ordine

1. **Immagine e Video a consumo.** L'architettura è disegnata per intero in
   `docs/superpowers/specs/2026-08-25-generazione-design.md`: adattatori come
   schede di configurazione, saldo prenota→conferma→rilascia già costruito e
   testato, riferimenti presi dalla libreria. Modelli scelti: **Nano Banana Pro**
   e **GPT Image 2** per le immagini, **Seedance 2.5** e **Kling 3.0** per il
   video. Manca il codice degli adattatori e il collegamento al saldo.
2. **Account e pagamenti.** Quando ci sarà qualcuno che paga.
3. **Estrazione fotogrammi da video** e **palette dai colori**: gli ultimi due
   servizi gratuiti disegnati e non costruiti.
4. **Modelli a fp16**, per dimezzare i 170 MB del primo scaricamento.
5. **Rileggere il tono dei testi dell'interfaccia.** Li ho scritti io, in
   italiano e inglese. La voce del marchio la conosce il committente: è una
   revisione che spetta a lui, non un compito da delegare.
6. **Guardare con occhi propri** due cose che non si verificano in un riquadro
   di anteprima: il video guidato dallo scorrimento sulla pagina di
   presentazione, e il suono «gigante» partendo da un «tum tum» vero al
   microfono. La catena è verificata con segnali sintetici; se convince lo dice
   solo un orecchio.

---

## 7. Come si lavora qui

- **Si misura, non si suppone.** Ogni numero nel codice e nei commenti viene da
  una misura, con la data. Le costanti magiche stanno dichiarate in cima con il
  motivo.
- **I test sono documentazione.** Nomi in italiano, che dicono la regola
  (`'un fallimento non ferma il blocco'`), e un commento che spiega *perché*
  quella regola esiste. Un test che ripete l'implementazione non serve.
- **I commenti dicono il perché, non il cosa.** Il cosa si legge nel codice.
- **Interfaccia bilingue, italiano e inglese**, con la modalità «Spiegami»:
  ogni comando spiega se stesso dentro l'app. Un test fallisce se una chiave
  esiste in una lingua sola o se un aiuto si limita a ripetere l'etichetta.
- **Marchio JAYL:** nero `#111111`, panna `#F5F0E8`, grigio `#8A8A85`, oro
  `#C4A35A` al massimo per un decimo della superficie. Space Grotesk e Cormorant
  Garamond. Payoff: *Art finds a way.*
- **Il colore non è mai l'unico segnale.** Ogni avviso dice a parole cosa
  succede.
- **Un commit per decisione**, con il perché nel corpo del messaggio.
