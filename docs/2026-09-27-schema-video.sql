-- ---------------------------------------------------------------------------
-- Fase 3 — il video. Da incollare TUTTO INSIEME nell'editor SQL di Supabase,
-- PRIMA di pubblicare il Worker della fase 3.
--
-- Tre colonne su `lavori`: un video non torna nella stessa richiesta, quindi
-- il lavoro deve ricordarsi da CHI è stato chiesto (il canale), COME
-- ritrovarlo (l'id del task del fornitore) e COSA si era chiesto (durata,
-- risoluzione, formato: servono a stimare il costo quando il fornitore non
-- dice i token). Idempotente: rilanciarlo non rompe niente.
--
-- Nessuna policy nuova: `lavori` ha la RLS accesa e nessuna policy, quindi
-- né `anon` né `authenticated` (cioè nemmeno gli ospiti) la leggono. Solo il
-- Worker, con la chiave di servizio.
-- ---------------------------------------------------------------------------

alter table lavori add column if not exists fornitore     text;
alter table lavori add column if not exists fornitore_rif text;
alter table lavori add column if not exists richiesta     jsonb;

comment on column lavori.fornitore     is 'Il canale che ha generato (byteplus | higgsfield). Nullo per i lavori che finiscono nella stessa richiesta.';
comment on column lavori.fornitore_rif is 'L''id del task presso il fornitore: serve a /lavoro e al giro orario per chiedere come va.';
comment on column lavori.richiesta     is 'Cosa si era chiesto (durata, risoluzione, formato).';

-- Controllo, da leggere dopo: devono comparire le tre colonne.
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'lavori'
   and column_name in ('fornitore', 'fornitore_rif', 'richiesta');
