# Brain come ponte: i tuoi `.md` dentro lo studio, e come li leggo io

> Scritto il 2026-08-27, dopo aver costruito la cosa. Risponde alla richiesta:
> *«vorrei poter mettere file md nel cervello […] in modo che Claude riesca a
> vedere la panoramica di tutti i suoi progetti»*.

---

## 1. Il fatto che decide tutto

**Io non so leggere OPFS.** Quello che sta dentro il browser — la libreria, le
tele, i file — per me non esiste. Perché Brain sia un ponte, i documenti devono
toccare il disco vero da qualche parte.

La risposta scelta non inventa niente: **è il pacco**. Lo scarichi, lo
scompatti in una cartella, e io leggo. Nessuna sincronizzazione, nessun server,
nessuna cartella-magica-solo-su-Chrome. La promessa del prodotto resta intera.

---

## 2. Il giro completo, in cinque gesti

```
   i tuoi .md sparsi              lo studio                   io
   ─────────────────              ─────────                   ──
   ~/Desktop/the rug/  ──┐
   ~/Desktop/zack/     ──┼─▶ 1. «Porta dei file» ─▶ 2. sulla tela, nel gruppo
   ~/jayl-store/       ──┘        (Brain)                del suo progetto
                                                              │
                                                        3. tasto ZACK
                                                              │
                                                     nome.brain.zip
                                                              │
                                            4. unzip in una cartella
                                                              │
                                              5. «leggi IDEE.md» ──────▶ io
```

1. **Porta dei file** nel cassetto di Brain accetta i `.md` come accetta png,
   wav e mp4. Entrano in libreria come asset con tipo `md`.
2. **Sulla tela**, dentro un cerchio col nome del progetto. *Il cerchio non è
   decorazione: è l'unica cosa che dice di che progetto è un documento.*
3. **Il tasto Zack** fa `nome.brain.zip`.
4. **Doppio clic** sullo zip.
5. Mi dici *«leggi `IDEE.md` in questa cartella»*.

---

## 3. Cosa trovo dentro, e perché basta

```
nome.brain.zip
  idea.json    la tela: posizioni, note, colori, legami
  IDEE.md      ← comincio da qui
  mappa.png    com'era disposta
  file/        i .md veri, e tutto il resto
```

`IDEE.md` porta ora una sezione che prima non c'era:

```markdown
## Documenti

- **The Rug — episodio 1** — progetto: The Rug · file/the-rug-bible-uqiue7m4.md
- **Zack — bibbia della serie** — progetto: Zack · file/zack-series-bible-k2p9.md
- **Drop 1: la maglietta nera** — progetto: jayl.store · file/drop-1-a71x.md
```

Tre cose, e ognuna serve a me:

| cosa | perché |
|---|---|
| **il titolo scritto dentro** | `the-rug-bible.md` dice meno di «The Rug — episodio 1». In un elenco di venti progetti conta cosa c'è dentro, non come l'hai salvato. |
| **il progetto** | è il gruppo in cui l'hai messo tu. È la sola informazione che nessuna macchina può dedurre: dice che quei tre documenti parlano della stessa cosa. |
| **il percorso** | so **quale file aprire** invece di scompattare a caso. Su quaranta documenti è la differenza fra leggerne tre e leggerli tutti. |

**La panoramica la leggo in un file solo, prima di aprirne uno.** Poi apro
quelli che servono alla domanda che mi hai fatto.

---

## 4. Cosa si fa con un documento dentro lo studio

- **Si apre** — doppio clic sulla scheda, o «Apri». Copre la tela per intero, ed
  è l'unica cosa del prodotto che ha il diritto di farlo: qui il documento *è*
  il lavoro. Leggere una bibbia dentro un riquadro di 200 px è leggere da una
  feritoia.
- **Si modifica**, e si salva **su richiesta**. Il salvataggio riscrive lo stesso
  file: non nasce un asset nuovo a ogni correzione. Un `.md` che si biforca
  dodici volte non è versionamento, è la libreria che si riempie di doppioni.
- **Si riconosce**: otto icone, le stesse delle cartelle. Su una tela con venti
  documenti l'icona è l'unica cosa che si legge senza avvicinarsi — i nomi sono
  troppo piccoli, e finiscono tutti in `.md`.
- **Si riscarica**, da solo, come l'hai messo dentro (più le tue modifiche).

## 5. E l'immagine della tela

Il tasto **«Immagine della tela»** scarica `nome-tela.png`: note col loro
colore e la loro categoria, gruppi coi loro titoli, frecce, miniature dei file
e schede dei documenti. Tutta la tela in un'immagine sola.

Era già disegnata — finiva nel pacco come `mappa.png` — ma era sepolta dentro
uno zip, cioè invisibile a chi voleva solo far vedere a qualcuno com'è messa
un'idea. Non è un salvataggio e non prova a esserlo: è una fotografia, non si
rimette dentro. Quello resta il compito del pacco.

---

## 6. Cosa NON fa, e perché

- **Non sincronizza.** Non c'è una cartella viva che si aggiorna da sola: fai il
  pacco quando vuoi che io veda lo stato di adesso. Il costo è un gesto; il
  guadagno è che non paghiamo banda e non ci prendiamo responsabilità legale sui
  tuoi contenuti. Resta valida la nota di
  [dove-siamo §4](2026-08-26-dove-siamo.md): la cartella vera su disco
  (Chrome/Edge) è la risposta giusta *se e quando* si decide di pagarne il
  prezzo di compatibilità.
- **Non converte.** `.md` e basta: non txt, non rtf, non docx. Il markdown è
  l'unico formato che tu leggi in chiaro, io capisco senza conversioni e un
  editor apre fra dieci anni. Allungare quella lista significa comprarsi le
  conversioni, che è un altro prodotto.
- **Non manda niente da nessuna parte.** Il pacco lo scarichi tu, sul tuo
  computer. Se poi me lo dai, è una tua decisione, un file alla volta.
- **Non rende un documento un riferimento per generare.** A un modello di
  immagini si manda un'immagine, non una bibbia di serie.

---

## 7. Il consiglio, visto che me l'hai chiesto

Non portare tutto. **Un gruppo per progetto, e dentro solo i documenti che
qualcuno leggerebbe davvero** — la bibbia, le regole, il piano. Gli appunti di
lavoro rendono la panoramica lunga e le tolgono il senso: se `IDEE.md` elenca
quaranta documenti, non è più una panoramica, è di nuovo la tua cartella.

Il valore di questo ponte non è la quantità di testo che mi arriva. È il
**cerchio col nome del progetto**, che è l'unica cosa che dice come stanno
insieme le cose — e quella la puoi disegnare solo tu.
