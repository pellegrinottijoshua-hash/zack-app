-- ---------------------------------------------------------------------------
-- B2 — i crediti. Da incollare TUTTO INSIEME nell'editor SQL di Supabase.
--
-- ⚠️ L'editor si ferma alla prima frase che sbaglia e non esegue le successive.
-- E' cosi' che il 2026-09-09 l'`enable row level security` di `conti` e'
-- rimasto indietro, lasciando la tabella aperta a chiunque avesse la chiave
-- pubblica — che sta nel bundle, quindi tutti.
-- ---------------------------------------------------------------------------

-- Nessun file .sql della Fase B1 vive nel repository, quindi non c'e' modo di
-- sapere da qui se la colonna `crediti` esiste gia' su `conti`: il Worker la
-- legge come `conto.crediti ?? 0`, cioe' tollera che manchi. Se manca e si
-- parte dritti dal `comment on column` sotto, l'editor si ferma alla prima
-- frase e non crea NIENTE di quel che segue. Questa riga rende il file
-- autosufficiente: e' idempotente, non costa niente se la colonna c'e' gia'.
alter table conti add column if not exists crediti integer not null default 0;

-- Il saldo cambia UNITA', non tipo: da centesimi a millesimi di euro.
-- Si puo' fare senza toccare i dati solo perche' vale zero per tutti. Dopo il
-- primo euro incassato, vorrebbe dire moltiplicare per mille dei soldi veri.
comment on column conti.crediti is 'Saldo in MILLESIMI di euro, intero. Mai centesimi, mai virgola mobile.';

-- Cosa e' stato chiesto, e quanto e' costato DAVVERO.
create table if not exists lavori (
  id            uuid primary key,
  utente        uuid not null references auth.users on delete cascade,
  servizio      text not null,
  prezzo        integer not null,          -- millesimi addebitati al cliente
  costo_reale   integer,                   -- millesimi pagati al fornitore
  stato         text not null check (stato in ('in-corso','fatto','fallito','rimborsato')),
  creato_il     timestamptz not null default now(),
  chiuso_il     timestamptz
);
alter table lavori enable row level security;
create index if not exists lavori_appesi on lavori (stato, creato_il);

-- Lo storico. Si scrive e non si cancella: e' la prova di cosa e' successo.
create table if not exists movimenti (
  id            bigserial primary key,
  utente        uuid not null references auth.users on delete cascade,
  millesimi     integer not null,          -- positivo accredita, negativo addebita
  genere        text not null check (genere in ('ricarica','spesa','rimborso')),
  lavoro        uuid references lavori(id),
  -- ⚠️ La riga che impedisce di regalare soldi. Stripe riprova i webhook, e
  -- senza questo vincolo un rinvio accrediterebbe due volte.
  stripe_evento text unique,
  creato_il     timestamptz not null default now()
);
alter table movimenti enable row level security;

-- ---------------------------------------------------------------------------
-- Le due funzioni che muovono il saldo. Nessun altro lo tocca.
--
-- `security definer` le fa girare coi permessi del proprietario, quindi
-- scavalcano la RLS come fa la chiave di servizio. Le chiama solo il Worker —
-- ma questo per ora e' solo un commento. PostgREST espone OGNI funzione di
-- `public` come `/rest/v1/rpc/<nome>`, e Postgres concede EXECUTE a PUBLIC
-- per default appena la funzione nasce. La chiave pubblicabile sta nel bundle
-- del browser, quindi ce l'hanno tutti, e `security definer` scavalca anche
-- la RLS: senza revocare EXECUTE, una `POST /rest/v1/rpc/accredita` con
-- `p_millesimi: 999999` da un browser qualsiasi sarebbe denaro dal nulla.
-- Ecco perche' subito dopo ogni `create or replace function` sotto c'e' una
-- revoca: e' la riga che rende vero il commento, non solo un'intenzione.
--
-- `search_path` fisso: senza, `security definer` e' la via classica di
-- scalata dei privilegi in Postgres (un oggetto con lo stesso nome messo
-- prima nel path del chiamante verrebbe eseguito coi permessi del
-- proprietario). Il linter di Supabase lo segnala da solo.
-- ---------------------------------------------------------------------------

-- ⚠️ E' QUESTA FUNZIONE che rende impossibile lo scoperto, non un controllo
-- in JavaScript prima di chiamare. La guardia sta DENTRO l'update: e' una
-- frase sola, e Postgres non la spezza a meta'. Due schede che generano
-- insieme non possono spendere lo stesso denaro.
--
-- Inserisce anche il movimento di spesa, nella stessa transazione
-- dell'addebito: separarli lascerebbe lo stesso buco che il commento di
-- `accredita` piu' sotto condanna nell'altro senso — un saldo che scende
-- senza che niente dica perche', se un guasto cade fra le due scritture.
-- `lavoro` resta NULL: non puo' referenziare una riga di `lavori` che non
-- esiste ancora, c'e' la chiave esterna a impedirlo. L'insert sta dentro il
-- ramo in cui l'addebito e' riuscito: se il saldo non bastava, niente deve
-- essere successo, movimento compreso.
create or replace function addebita(p_utente uuid, p_prezzo integer)
returns integer language plpgsql security definer
set search_path = public, pg_temp as $$
declare rimasto integer;
begin
  if p_prezzo is null or p_prezzo <= 0 then
    raise exception 'prezzo-non-valido';
  end if;
  update conti set crediti = crediti - p_prezzo
   where utente = p_utente and crediti >= p_prezzo
   returning crediti into rimasto;
  if rimasto is not null then
    insert into movimenti (utente, millesimi, genere, lavoro)
    values (p_utente, -p_prezzo, 'spesa', null);
  end if;
  return rimasto;   -- NULL quando il saldo non bastava: niente e' successo
end $$;

-- create or replace su una funzione NUOVA reimposta i permessi di default
-- (EXECUTE a PUBLIC), quindi la revoca deve stare DOPO la creazione, mai
-- prima: prima della creazione non c'e' ancora niente da revocare.
revoke execute on function addebita(uuid, integer) from public, anon, authenticated;
grant  execute on function addebita(uuid, integer) to service_role;

-- Accredita e registra il movimento nella STESSA transazione.
-- Separarli vorrebbe dire un saldo che sale senza che niente dica perche', o
-- un movimento che racconta un accredito mai avvenuto.
create or replace function accredita(
  p_utente uuid, p_millesimi integer, p_genere text,
  p_stripe text default null, p_lavoro uuid default null
) returns integer language plpgsql security definer
set search_path = public, pg_temp as $$
declare rimasto integer;
begin
  if p_millesimi is null or p_millesimi <= 0 then
    raise exception 'importo-non-valido';
  end if;
  -- Se l'evento Stripe e' gia' passato, il vincolo `unique` fa fallire QUESTA
  -- riga e la transazione intera: il saldo non si muove. E' la difesa contro
  -- il rinvio, e sta prima dell'update apposta.
  insert into movimenti (utente, millesimi, genere, stripe_evento, lavoro)
  values (p_utente, p_millesimi, p_genere, p_stripe, p_lavoro);

  update conti set crediti = crediti + p_millesimi
   where utente = p_utente
   returning crediti into rimasto;
  return rimasto;
end $$;

revoke execute on function accredita(uuid, integer, text, text, uuid) from public, anon, authenticated;
grant  execute on function accredita(uuid, integer, text, text, uuid) to service_role;
