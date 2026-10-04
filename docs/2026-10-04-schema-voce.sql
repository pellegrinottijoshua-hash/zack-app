-- ---------------------------------------------------------------------------
-- Fase 6b — le voci e i consensi. Da incollare TUTTO INSIEME nell'editor SQL
-- di Supabase, PRIMA di pubblicare il Worker che clona.
--
-- Due tabelle, tutte e due con la RLS accesa e nessuna policy: né `anon` né
-- `authenticated` le leggono. Solo il Worker, con la chiave di servizio.
-- Idempotente: rilanciarlo non rompe niente.
-- ---------------------------------------------------------------------------

-- La dichiarazione data prima di ogni clonazione (spec voce §2.4). Si scrive e
-- non si cancella: è la prova, se arriva un reclamo. Resta anche quando la voce
-- viene cancellata presso ElevenLabs (nessuna chiave esterna verso `voci`).
create table if not exists consensi (
  id          uuid primary key,
  utente      uuid not null references auth.users on delete cascade,
  ora         timestamptz not null default now(),
  scelta      text not null check (scelta in ('mia', 'permesso')),
  chi_parla   text,                         -- il nome, se «ho il permesso»
  impronta    text not null,                -- SHA-256 del campione, in esadecimale
  testo       text not null                 -- la frase com'era quel giorno, con la versione
);
alter table consensi enable row level security;
create index if not exists consensi_utente on consensi (utente, ora);

-- Le voci di ogni conto presso ElevenLabs. Serve a una cosa: una voce si usa e
-- si cancella solo da chi l'ha creata.
create table if not exists voci (
  eleven_id   text primary key,
  utente      uuid not null references auth.users on delete cascade,
  nome        text not null,
  origine     text not null check (origine in ('disegnata', 'clonata')),
  consenso    uuid references consensi(id),
  creata_il   timestamptz not null default now()
);
alter table voci enable row level security;
create index if not exists voci_utente on voci (utente);

-- Controllo, da leggere dopo: due righe, tutte e due con rowsecurity = true.
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' and tablename in ('consensi', 'voci');
