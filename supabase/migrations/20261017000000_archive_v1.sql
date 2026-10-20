-- =============================================================================
-- Archivage de la première version de l'application
-- Les tables, fonctions et types de la v1 sont déplacés (sans être supprimés)
-- dans le schéma `legacy`, inaccessible depuis l'API, pour laisser la place au
-- nouveau schéma (20261018000000_init.sql). Les comptes auth.users sont conservés.
-- Sans effet sur une base neuve.
-- =============================================================================

create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;

-- Aucune suppression ici (les DROP demandent une confirmation manuelle) :
--  * le trigger auth.users "on_auth_user_created" est conservé ; sa fonction
--    public.handle_new_user() reste en place et est remplacée par la migration init ;
--  * les politiques Storage de l'ancien bucket "photos" restent, elles ne
--    concernent que ce bucket.

do $$
declare
  r record;
begin
  -- tables (leurs politiques, index, séquences et triggers suivent)
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I set schema legacy', r.tablename);
  end loop;

  -- fonctions, sauf celle de l'event trigger Supabase (RLS automatique)
  -- et celle du trigger d'inscription, réutilisée par le nouveau schéma
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname not in ('rls_auto_enable', 'handle_new_user')
  loop
    execute format('alter function %s set schema legacy', r.signature);
  end loop;

  -- types énumérés
  for r in
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  loop
    execute format('alter type public.%I set schema legacy', r.typname);
  end loop;
end;
$$;
