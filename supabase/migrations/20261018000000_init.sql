-- =============================================================================
-- Notre Petit Monde — schéma initial
-- Toutes les données métier portent un couple_id ; chaque table est protégée par
-- RLS et n'est lisible / modifiable que par les deux membres du couple concerné.
-- Les tables enfants utilisent des clés étrangères composites (id, couple_id) :
-- impossible de rattacher une ligne à un parent appartenant à un autre couple.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.date_status as enum ('proposed', 'accepted', 'declined', 'done');
create type public.vote_value  as enum ('yes', 'maybe', 'no');
create type public.wish_kind   as enum ('activity', 'weekend', 'trip', 'project');
create type public.wish_status as enum ('idea', 'planned', 'done');

-- ---------------------------------------------------------------------------
-- Couples & profils
-- ---------------------------------------------------------------------------
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Notre Petit Monde' check (char_length(name) between 1 and 80),
  started_on  date,
  invite_code text not null unique
              default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  couple_id    uuid references public.couples (id) on delete set null,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_url   text,
  phone        text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  notify_email boolean not null default true,
  notify_sms   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index profiles_couple_id_idx on public.profiles (couple_id);

-- ---------------------------------------------------------------------------
-- Fonctions d'appartenance (SECURITY DEFINER : évitent la récursion RLS)
-- ---------------------------------------------------------------------------
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_couple_member(p_user uuid, p_couple uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = p_user and couple_id = p_couple
  )
$$;

-- Profil créé automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Créé seulement s'il n'existe pas déjà (base reprise de la v1)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

-- Créer un couple (l'appelant en devient le premier membre)
create or replace function public.create_couple(p_name text, p_started_on date default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_couple uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and couple_id is not null) then
    raise exception 'Tu fais déjà partie d''un couple' using errcode = 'P0001';
  end if;

  insert into public.couples (name, started_on)
  values (coalesce(nullif(trim(p_name), ''), 'Notre Petit Monde'), p_started_on)
  returning id into v_couple;

  update public.profiles set couple_id = v_couple where id = auth.uid();
  return v_couple;
end;
$$;

-- Rejoindre un couple avec son code d'invitation (2 membres maximum)
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_couple  uuid;
  v_members int;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and couple_id is not null) then
    raise exception 'Tu fais déjà partie d''un couple' using errcode = 'P0001';
  end if;

  select id into v_couple
  from public.couples
  where invite_code = upper(trim(p_code))
  for update;

  if v_couple is null then
    raise exception 'Code d''invitation inconnu' using errcode = 'P0002';
  end if;

  select count(*) into v_members from public.profiles where couple_id = v_couple;
  if v_members >= 2 then
    raise exception 'Ce couple est déjà complet' using errcode = 'P0001';
  end if;

  update public.profiles set couple_id = v_couple where id = auth.uid();
  return v_couple;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rendez-vous
-- ---------------------------------------------------------------------------
create table public.date_proposals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  location    text check (char_length(location) <= 200),
  proposed_at timestamptz,
  budget      numeric(10, 2) check (budget >= 0),
  status      public.date_status not null default 'proposed',
  created_at  timestamptz not null default now(),
  unique (id, couple_id)
);
create index date_proposals_couple_idx on public.date_proposals (couple_id, proposed_at);

create table public.date_votes (
  proposal_id uuid not null,
  couple_id   uuid not null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  vote        public.vote_value not null,
  created_at  timestamptz not null default now(),
  primary key (proposal_id, user_id),
  foreign key (proposal_id, couple_id)
    references public.date_proposals (id, couple_id) on delete cascade
);
create index date_votes_couple_idx on public.date_votes (couple_id);

-- Statut calculé à partir des votes : un "non" => refusé, deux "oui" => validé
create or replace function public.refresh_date_status(p_proposal uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_couple  uuid;
  v_status  public.date_status;
  v_members int;
  v_yes     int;
  v_no      int;
begin
  select couple_id, status into v_couple, v_status
  from public.date_proposals where id = p_proposal;

  if v_couple is null or v_status = 'done' then
    return;
  end if;

  select count(*) into v_members from public.profiles where couple_id = v_couple;
  select count(*) filter (where vote = 'yes'), count(*) filter (where vote = 'no')
    into v_yes, v_no
  from public.date_votes where proposal_id = p_proposal;

  update public.date_proposals
  set status = case
    when v_no > 0 then 'declined'::public.date_status
    when v_yes >= greatest(v_members, 2) then 'accepted'::public.date_status
    else 'proposed'::public.date_status
  end
  where id = p_proposal;
end;
$$;

create or replace function public.on_date_vote_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.refresh_date_status(coalesce(new.proposal_id, old.proposal_id));
  return null;
end;
$$;

create trigger date_votes_refresh_status
  after insert or update or delete on public.date_votes
  for each row execute function public.on_date_vote_change();

-- La personne qui propose vote "oui" d'office
create or replace function public.on_date_proposal_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.date_votes (proposal_id, couple_id, user_id, vote)
  values (new.id, new.couple_id, new.created_by, 'yes');
  return null;
end;
$$;

create trigger date_proposals_auto_vote
  after insert on public.date_proposals
  for each row execute function public.on_date_proposal_created();

-- Marquer un rendez-vous validé comme vécu
create or replace function public.complete_date(p_proposal uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.date_proposals
  set status = 'done'
  where id = p_proposal
    and couple_id = public.my_couple_id()
    and status = 'accepted';

  if not found then
    raise exception 'Ce rendez-vous ne peut pas être marqué comme vécu' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cagnottes (style Tricount)
-- ---------------------------------------------------------------------------
create table public.pots (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  emoji       text not null default '💞' check (char_length(emoji) <= 8),
  budget      numeric(12, 2) check (budget >= 0),
  currency    text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (id, couple_id)
);
create index pots_couple_idx on public.pots (couple_id);

-- payer_share = part de la dépense qui revient à la personne qui a payé (en %).
-- 50 = partage égal, 0 = payé entièrement pour l'autre (ex. remboursement).
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  pot_id        uuid not null,
  couple_id     uuid not null,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  paid_by       uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  amount        numeric(12, 2) not null check (amount > 0),
  payer_share   numeric(5, 2) not null default 50 check (payer_share between 0 and 100),
  spent_on      date not null default current_date,
  is_settlement boolean not null default false,
  created_at    timestamptz not null default now(),
  foreign key (pot_id, couple_id) references public.pots (id, couple_id) on delete cascade
);
create index expenses_pot_idx on public.expenses (pot_id, spent_on desc);
create index expenses_couple_idx on public.expenses (couple_id);

-- ---------------------------------------------------------------------------
-- Album souvenirs
-- ---------------------------------------------------------------------------
create table public.albums (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (id, couple_id)
);

create table public.memories (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  created_by    uuid not null references public.profiles (id) on delete cascade,
  album_id      uuid,
  title         text not null check (char_length(title) between 1 and 120),
  note          text check (char_length(note) <= 2000),
  happened_on   date not null default current_date,
  location_name text check (char_length(location_name) <= 200),
  latitude      double precision check (latitude between -90 and 90),
  longitude     double precision check (longitude between -180 and 180),
  created_at    timestamptz not null default now(),
  unique (id, couple_id),
  foreign key (album_id, couple_id)
    references public.albums (id, couple_id) on delete set null (album_id)
);
create index memories_couple_idx on public.memories (couple_id, happened_on desc);

create table public.memory_photos (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null,
  couple_id    uuid not null,
  storage_path text not null unique,
  position     smallint not null default 0,
  created_at   timestamptz not null default now(),
  -- le fichier doit être rangé dans le dossier du couple
  check (split_part(storage_path, '/', 1) = couple_id::text),
  foreign key (memory_id, couple_id)
    references public.memories (id, couple_id) on delete cascade
);
create index memory_photos_memory_idx on public.memory_photos (memory_id, position);

-- ---------------------------------------------------------------------------
-- Wishlist & scénarios
-- ---------------------------------------------------------------------------
create table public.wishes (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  created_by       uuid not null references public.profiles (id) on delete cascade,
  kind             public.wish_kind not null default 'activity',
  title            text not null check (char_length(title) between 1 and 120),
  description      text check (char_length(description) <= 4000),
  estimated_budget numeric(12, 2) check (estimated_budget >= 0),
  status           public.wish_status not null default 'idea',
  created_at       timestamptz not null default now(),
  unique (id, couple_id)
);
create index wishes_couple_idx on public.wishes (couple_id);

-- Niveau d'envie de chacun (1 à 5) : le classement combine les deux
create table public.wish_desires (
  wish_id    uuid not null,
  couple_id  uuid not null,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  level      smallint not null check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (wish_id, user_id),
  foreign key (wish_id, couple_id) references public.wishes (id, couple_id) on delete cascade
);
create index wish_desires_couple_idx on public.wish_desires (couple_id);

-- ---------------------------------------------------------------------------
-- Surprises
-- La ligne `surprises` (teaser + date de révélation) est visible des deux.
-- Le contenu secret et les indices ne sont lisibles par le destinataire qu'une
-- fois leur date de révélation passée — c'est la base qui l'impose, pas l'UI.
-- ---------------------------------------------------------------------------
create table public.surprises (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  teaser       text not null check (char_length(teaser) between 1 and 140),
  reveal_at    timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (id, couple_id),
  check (recipient_id <> created_by)
);
create index surprises_couple_idx on public.surprises (couple_id, reveal_at);

create table public.surprise_secrets (
  surprise_id uuid primary key,
  couple_id   uuid not null,
  title       text not null check (char_length(title) between 1 and 120),
  message     text check (char_length(message) <= 4000),
  foreign key (surprise_id, couple_id)
    references public.surprises (id, couple_id) on delete cascade
);

create table public.surprise_hints (
  id          uuid primary key default gen_random_uuid(),
  surprise_id uuid not null,
  couple_id   uuid not null,
  content     text not null check (char_length(content) between 1 and 500),
  reveal_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  foreign key (surprise_id, couple_id)
    references public.surprises (id, couple_id) on delete cascade
);
create index surprise_hints_surprise_idx on public.surprise_hints (surprise_id, reveal_at);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.couples          enable row level security;
alter table public.profiles         enable row level security;
alter table public.date_proposals   enable row level security;
alter table public.date_votes       enable row level security;
alter table public.pots             enable row level security;
alter table public.expenses         enable row level security;
alter table public.albums           enable row level security;
alter table public.memories         enable row level security;
alter table public.memory_photos    enable row level security;
alter table public.wishes           enable row level security;
alter table public.wish_desires     enable row level security;
alter table public.surprises        enable row level security;
alter table public.surprise_secrets enable row level security;
alter table public.surprise_hints   enable row level security;

-- Couples : lecture / modification par ses membres ; création via create_couple()
create policy "couples_select_member" on public.couples
  for select to authenticated using (id = (select public.my_couple_id()));
create policy "couples_update_member" on public.couples
  for update to authenticated
  using (id = (select public.my_couple_id()))
  with check (id = (select public.my_couple_id()));

-- Profils : soi-même + son/sa partenaire ; chacun ne modifie que le sien
create policy "profiles_select_self_or_partner" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or couple_id = (select public.my_couple_id()));
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rendez-vous
create policy "dates_select" on public.date_proposals
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "dates_insert" on public.date_proposals
  for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
create policy "dates_update_author" on public.date_proposals
  for update to authenticated
  using (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()))
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
create policy "dates_delete_author" on public.date_proposals
  for delete to authenticated
  using (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));

create policy "votes_select" on public.date_votes
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "votes_insert_own" on public.date_votes
  for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and user_id = (select auth.uid()));
create policy "votes_update_own" on public.date_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (couple_id = (select public.my_couple_id()) and user_id = (select auth.uid()));
create policy "votes_delete_own" on public.date_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Cagnottes
create policy "pots_all_member" on public.pots
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

create policy "expenses_select" on public.expenses
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (
    couple_id = (select public.my_couple_id())
    and created_by = (select auth.uid())
    and public.is_couple_member(paid_by, couple_id)
  );
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (
    couple_id = (select public.my_couple_id())
    and public.is_couple_member(paid_by, couple_id)
  );
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (couple_id = (select public.my_couple_id()));

-- Souvenirs
create policy "albums_all_member" on public.albums
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

create policy "memories_select" on public.memories
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "memories_insert" on public.memories
  for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
create policy "memories_update" on public.memories
  for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
create policy "memories_delete" on public.memories
  for delete to authenticated using (couple_id = (select public.my_couple_id()));

create policy "memory_photos_all_member" on public.memory_photos
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

-- Wishlist
create policy "wishes_select" on public.wishes
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "wishes_insert" on public.wishes
  for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
create policy "wishes_update" on public.wishes
  for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
create policy "wishes_delete" on public.wishes
  for delete to authenticated using (couple_id = (select public.my_couple_id()));

create policy "desires_select" on public.wish_desires
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "desires_insert_own" on public.wish_desires
  for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and user_id = (select auth.uid()));
create policy "desires_update_own" on public.wish_desires
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (couple_id = (select public.my_couple_id()) and user_id = (select auth.uid()));
create policy "desires_delete_own" on public.wish_desires
  for delete to authenticated using (user_id = (select auth.uid()));

-- Surprises
create policy "surprises_select" on public.surprises
  for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy "surprises_insert" on public.surprises
  for insert to authenticated
  with check (
    couple_id = (select public.my_couple_id())
    and created_by = (select auth.uid())
    and public.is_couple_member(recipient_id, couple_id)
  );
create policy "surprises_update_author" on public.surprises
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (
    couple_id = (select public.my_couple_id())
    and created_by = (select auth.uid())
    and public.is_couple_member(recipient_id, couple_id)
  );
create policy "surprises_delete_author" on public.surprises
  for delete to authenticated using (created_by = (select auth.uid()));

-- Secret : l'auteur toujours, le destinataire seulement après reveal_at
create policy "secrets_select" on public.surprise_secrets
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and exists (
      select 1 from public.surprises s
      where s.id = surprise_secrets.surprise_id
        and (s.created_by = (select auth.uid()) or s.reveal_at <= now())
    )
  );
create policy "secrets_write_author" on public.surprise_secrets
  for all to authenticated
  using (
    exists (
      select 1 from public.surprises s
      where s.id = surprise_secrets.surprise_id and s.created_by = (select auth.uid())
    )
  )
  with check (
    couple_id = (select public.my_couple_id())
    and exists (
      select 1 from public.surprises s
      where s.id = surprise_secrets.surprise_id and s.created_by = (select auth.uid())
    )
  );

-- Indices : l'auteur toujours, le destinataire indice par indice
create policy "hints_select" on public.surprise_hints
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and (
      surprise_hints.reveal_at <= now()
      or exists (
        select 1 from public.surprises s
        where s.id = surprise_hints.surprise_id and s.created_by = (select auth.uid())
      )
    )
  );
create policy "hints_write_author" on public.surprise_hints
  for all to authenticated
  using (
    exists (
      select 1 from public.surprises s
      where s.id = surprise_hints.surprise_id and s.created_by = (select auth.uid())
    )
  )
  with check (
    couple_id = (select public.my_couple_id())
    and exists (
      select 1 from public.surprises s
      where s.id = surprise_hints.surprise_id and s.created_by = (select auth.uid())
    )
  );

-- =============================================================================
-- Privilèges : rien pour anon, colonnes sensibles verrouillées
-- =============================================================================
revoke all on all tables in schema public from anon;

-- couples : création via create_couple(), seuls name / started_on modifiables
revoke insert, update, delete on public.couples from authenticated;
grant update (name, started_on) on public.couples to authenticated;

-- profiles : couple_id ne change que via create_couple() / join_couple()
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, avatar_url, phone, notify_email, notify_sms) on public.profiles to authenticated;

-- date_proposals : le statut ne bouge que via les votes ou complete_date()
revoke update on public.date_proposals from authenticated;
grant update (title, description, location, proposed_at, budget) on public.date_proposals to authenticated;

-- Fonctions
revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_couple_id()                      to authenticated;
grant execute on function public.is_couple_member(uuid, uuid)        to authenticated;
grant execute on function public.create_couple(text, date)           to authenticated;
grant execute on function public.join_couple(text)                   to authenticated;
grant execute on function public.complete_date(uuid)                 to authenticated;
revoke execute on function public.refresh_date_status(uuid)          from authenticated;
revoke execute on function public.handle_new_user()                  from authenticated;
revoke execute on function public.on_date_vote_change()              from authenticated;
revoke execute on function public.on_date_proposal_created()         from authenticated;

-- =============================================================================
-- Storage : bucket privé, un dossier par couple ({couple_id}/fichier.jpg)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories', 'memories', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "memories_bucket_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
create policy "memories_bucket_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
create policy "memories_bucket_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
create policy "memories_bucket_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
