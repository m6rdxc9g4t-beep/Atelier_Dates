-- =============================================================================
-- Reprise des données de la v1 (schéma `legacy`) dans le nouveau schéma.
-- À exécuter une seule fois, APRÈS les migrations 20261017000000_archive_v1 et
-- 20261018000000_init. Ne crée rien si les tables legacy n'existent pas.
-- =============================================================================

do $$
declare
  v_couple uuid;
  a uuid;
  b uuid;
begin
  if to_regclass('legacy.profiles') is null then
    raise notice 'Pas de données v1 à reprendre.';
    return;
  end if;

  -- 1. Un profil pour chaque compte existant (le trigger ne joue que pour les nouveaux)
  insert into public.profiles (id, display_name, phone, notify_email, notify_sms)
  select
    u.id,
    coalesce(nullif(lp.display_name, ''), split_part(u.email, '@', 1)),
    p.phone,
    coalesce(s.email_appointments, true),
    coalesce(s.sms_appointments, false) and p.phone is not null
  from auth.users u
  left join legacy.profiles lp on lp.id = u.id
  left join legacy.user_settings s on s.user_id = u.id
  -- numéros normalisés au format international (+33…), sinon ignorés
  cross join lateral (
    select case
      when regexp_replace(coalesce(lp.phone, ''), '[\s.-]', '', 'g') ~ '^\+[1-9][0-9]{6,14}$'
        then regexp_replace(lp.phone, '[\s.-]', '', 'g')
      when regexp_replace(coalesce(lp.phone, ''), '[\s.-]', '', 'g') ~ '^0[1-9][0-9]{8}$'
        then '+33' || substr(regexp_replace(lp.phone, '[\s.-]', '', 'g'), 2)
      else null
    end as phone
  ) p
  on conflict (id) do nothing;

  -- 2. Le couple, à partir du lien partner_id de la v1
  for a, b in
    select lp.id, lp.partner_id
    from legacy.profiles lp
    where lp.partner_id is not null and lp.id < lp.partner_id
  loop
    if exists (select 1 from public.profiles where id in (a, b) and couple_id is not null) then
      continue;
    end if;

    insert into public.couples (name) values ('Notre Petit Monde') returning id into v_couple;
    update public.profiles set couple_id = v_couple where id in (a, b);

    -- 3. Les rendez-vous (le trigger ajoute le "oui" de la personne qui propose)
    insert into public.date_proposals (id, couple_id, created_by, title, description, location, proposed_at)
    select
      ap.id,
      v_couple,
      ap.created_by,
      left(ap.title, 120),
      left(
        concat_ws(
          E'\n\n',
          nullif(ap.description, ''),
          case when nullif(ap.response, '') is not null then 'Réponse : ' || ap.response end
        ),
        2000
      ),
      left(concat_ws(' — ', nullif(ap.location, ''), nullif(ap.address, '')), 200),
      case when ap.date is not null
        then (ap.date + coalesce(ap.start_time, time '19:00')) at time zone 'Europe/Paris'
      end
    from legacy.appointments ap
    where ap.created_by in (a, b)
    on conflict (id) do nothing;

    -- réponse de l'autre personne
    insert into public.date_votes (proposal_id, couple_id, user_id, vote)
    select
      ap.id,
      v_couple,
      ap.invitee_id,
      case upper(ap.status::text)
        when 'ACCEPTED' then 'yes'::public.vote_value
        when 'DECLINED' then 'no'::public.vote_value
        when 'REFUSED' then 'no'::public.vote_value
        else 'maybe'::public.vote_value
      end
    from legacy.appointments ap
    where ap.created_by in (a, b)
      and ap.invitee_id in (a, b)
      and upper(ap.status::text) in ('ACCEPTED', 'DECLINED', 'REFUSED', 'MAYBE')
    on conflict (proposal_id, user_id) do nothing;
  end loop;
end;
$$;
