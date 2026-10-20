-- =============================================================================
-- Notifications : dans l'app, push (Web Push), e-mail et SMS
-- =============================================================================

-- Notifications affichées dans l'app ("Nouveautés" sur l'accueil)
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  kind         text not null
               check (kind in ('date_proposed', 'date_answered', 'date_accepted', 'surprise', 'memory', 'test')),
  title        text not null check (char_length(title) between 1 and 140),
  body         text check (char_length(body) <= 500),
  link         text check (link ~ '^/[A-Za-z0-9/_-]*$'),
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- Abonnements Web Push (un par appareil où la personne a activé les notifications)
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;

-- Chacun ne lit que ses notifications ; on n'en crée que pour soi ou son/sa partenaire
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy "notifications_insert_couple" on public.notifications
  for insert to authenticated
  with check (
    couple_id = (select public.my_couple_id())
    and actor_id = (select auth.uid())
    and public.is_couple_member(recipient_id, couple_id)
  );
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (recipient_id = (select auth.uid()));

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "push_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke update on public.push_subscriptions from authenticated;
revoke all on public.notifications, public.push_subscriptions from anon;

-- Coordonnées d'un membre du couple, pour l'envoi (vide hors du couple)
create or replace function public.notification_target(p_recipient uuid)
returns table (display_name text, email text, phone text, notify_email boolean, notify_sms boolean)
language sql stable security definer set search_path = ''
as $$
  select p.display_name, u.email::text, p.phone, p.notify_email, p.notify_sms
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_recipient
    and p.couple_id is not null
    and p.couple_id = public.my_couple_id()
$$;

-- Appareils abonnés au push d'un membre du couple
create or replace function public.push_targets(p_recipient uuid)
returns table (endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = ''
as $$
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join public.profiles p on p.id = s.user_id
  where s.user_id = p_recipient
    and p.couple_id is not null
    and p.couple_id = public.my_couple_id()
$$;

-- Oublie un abonnement expiré (le service push a répondu 404/410), dans le couple seulement
create or replace function public.forget_push_subscription(p_endpoint text)
returns void
language sql volatile security definer set search_path = ''
as $$
  delete from public.push_subscriptions s
  using public.profiles p
  where s.endpoint = p_endpoint
    and p.id = s.user_id
    and p.couple_id is not null
    and p.couple_id = public.my_couple_id()
$$;

revoke execute on function public.notification_target(uuid) from public, anon;
revoke execute on function public.push_targets(uuid) from public, anon;
revoke execute on function public.forget_push_subscription(text) from public, anon;
grant execute on function public.notification_target(uuid) to authenticated;
grant execute on function public.push_targets(uuid) to authenticated;
grant execute on function public.forget_push_subscription(text) to authenticated;
