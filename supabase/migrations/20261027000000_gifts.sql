-- =============================================================================
-- Liste de cadeaux : les objets que chacun aimerait recevoir
-- (lien du site et photo facultatifs), et la réservation secrète par l'autre.
-- Migration sans suppression (ni DROP ni DELETE).
-- =============================================================================

create table public.gifts (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  -- celui ou celle qui aimerait le recevoir ; null = pour nous deux (la maison…)
  wanted_by   uuid references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  url         text check (url ~* '^https?://[^\s]+$' and char_length(url) <= 2000),
  -- photo rangée dans le dossier du couple du bucket "memories"
  photo_path  text check (split_part(photo_path, '/', 1) = couple_id::text and char_length(photo_path) <= 300),
  price       numeric(12, 2) check (price >= 0),
  note        text check (char_length(note) <= 1000),
  received_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (id, couple_id)
);
create index gifts_couple_idx on public.gifts (couple_id, created_at desc);

-- « Je m'en occupe » : seul celui ou celle qui réserve le voit,
-- pour ne pas gâcher la surprise.
create table public.gift_claims (
  gift_id    uuid primary key,
  couple_id  uuid not null,
  claimed_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  foreign key (gift_id, couple_id) references public.gifts (id, couple_id) on delete cascade
);
create index gift_claims_couple_idx on public.gift_claims (couple_id);

alter table public.gifts       enable row level security;
alter table public.gift_claims enable row level security;

create policy "gifts_select" on public.gifts
  for select to authenticated using (couple_id = (select public.my_couple_id()));
-- On n'ajoute que pour soi ou pour le couple
create policy "gifts_insert" on public.gifts
  for insert to authenticated
  with check (
    couple_id = (select public.my_couple_id())
    and created_by = (select auth.uid())
    and (wanted_by is null or wanted_by = (select auth.uid()))
  );
create policy "gifts_update" on public.gifts
  for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
create policy "gifts_delete" on public.gifts
  for delete to authenticated using (couple_id = (select public.my_couple_id()));

create policy "gift_claims_select_own" on public.gift_claims
  for select to authenticated using (claimed_by = (select auth.uid()));
-- On ne réserve qu'un cadeau de la liste de l'autre
create policy "gift_claims_insert" on public.gift_claims
  for insert to authenticated
  with check (
    claimed_by = (select auth.uid())
    and couple_id = (select public.my_couple_id())
    and exists (
      select 1 from public.gifts g
      where g.id = gift_id
        and g.couple_id = gift_claims.couple_id
        and g.wanted_by is not null
        and g.wanted_by <> (select auth.uid())
    )
  );
create policy "gift_claims_delete_own" on public.gift_claims
  for delete to authenticated using (claimed_by = (select auth.uid()));

-- Le couple, l'auteur et le destinataire d'un cadeau ne changent pas
revoke update on public.gifts from authenticated;
grant update (title, url, photo_path, price, note, received_at) on public.gifts to authenticated;
revoke update on public.gift_claims from authenticated;
revoke all on public.gifts, public.gift_claims from anon;
