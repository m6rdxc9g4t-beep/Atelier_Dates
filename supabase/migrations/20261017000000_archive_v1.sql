-- =============================================================================
-- Archivage de la première version de l'application
-- Les tables, fonctions et types de la v1 sont déplacés (sans être supprimés)
-- dans le schéma `legacy`, inaccessible depuis l'API, pour laisser la place au
-- nouveau schéma (20261018000000_init.sql). Les comptes auth.users sont conservés.
-- Sans effet sur une base neuve.
-- =============================================================================

create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;

-- L'ancien trigger d'inscription écrivait dans l'ancienne table profiles
drop trigger if exists on_auth_user_created on auth.users;

-- Politiques Storage de l'ancien bucket "photos" (le bucket et ses fichiers restent)
drop policy if exists "photos_objects_select_couple" on storage.objects;
drop policy if exists "photos_objects_insert_self" on storage.objects;
drop policy if exists "photos_objects_delete_self" on storage.objects;

do $$
declare
  r record;
begin
  -- tables (leurs politiques, index, séquences et triggers suivent)
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I set schema legacy', r.tablename);
  end loop;

  -- fonctions, sauf celle de l'event trigger Supabase qui active RLS automatiquement
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proname <> 'rls_auto_enable'
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
