-- La fonction de l'event trigger Supabase (RLS automatique), quand elle existe,
-- n'a pas à être appelable depuis l'API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
