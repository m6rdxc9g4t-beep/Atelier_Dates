import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../migrations/20261018000000_init.sql", import.meta.url), "utf8");
const db = new PGlite();

// --- Stub minimal de l'environnement Supabase ---------------------------------
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant execute on function storage.foldername(text) to authenticated;
`);

await db.exec(migration);
console.log("✓ migration appliquée");

const U = {
  A: "00000000-0000-0000-0000-00000000000a",
  B: "00000000-0000-0000-0000-00000000000b",
  C: "00000000-0000-0000-0000-00000000000c",
  D: "00000000-0000-0000-0000-00000000000d",
};
for (const [n, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id, `${n.toLowerCase()}@test.fr`, JSON.stringify({ display_name: n }),
  ]);
}

let failures = 0;
async function as(user, sql, params = []) {
  await db.exec(`set role ${user ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role;`);
  }
}
async function expectOk(label, fn, check) {
  try {
    const r = await fn();
    if (check && !check(r)) { failures++; console.log("✗", label, JSON.stringify(r)); }
    else console.log("✓", label);
    return r;
  } catch (e) { failures++; console.log("✗", label, "→", e.message); }
}
async function expectFail(label, fn) {
  try { const r = await fn(); failures++; console.log("✗ (aurait dû échouer)", label, JSON.stringify(r)); }
  catch (e) { console.log("✓", label, "→", e.message); }
}

const [{ id: c1 }] = await as(U.A, `select public.create_couple('A & B', '2023-02-14') as id`);
const [{ invite_code }] = await as(U.A, `select invite_code from couples`);
await expectOk("B rejoint avec le code", () => as(U.B, `select public.join_couple($1)`, [invite_code.toLowerCase()]));
await expectFail("D ne peut pas rejoindre un couple complet", () => as(U.D, `select public.join_couple($1)`, [invite_code]));
const [{ id: c2 }] = await as(U.C, `select public.create_couple('C solo') as id`);
await expectFail("A ne peut pas créer un 2e couple", () => as(U.A, `select public.create_couple('x')`));

await expectOk("A voit 1 couple", () => as(U.A, `select * from couples`), (r) => r.length === 1 && r[0].id === c1);
await expectOk("C ne voit que le sien", () => as(U.C, `select * from couples`), (r) => r.length === 1 && r[0].id === c2);
await expectOk("A voit 2 profils (lui + B)", () => as(U.A, `select * from profiles`), (r) => r.length === 2);
await expectOk("C voit 1 profil", () => as(U.C, `select * from profiles`), (r) => r.length === 1);
await expectFail("A ne peut pas changer son couple_id", () => as(U.A, `update profiles set couple_id = $1 where id = $2`, [c2, U.A]));
await expectFail("A ne peut pas changer l'invite_code", () => as(U.A, `update couples set invite_code = 'HACK' `));
await expectOk("A renomme son couple", () => as(U.A, `update couples set name = 'Nous' returning id`), (r) => r.length === 1);
await expectOk("C ne peut pas renommer le couple de A (0 ligne)", () => as(U.C, `update couples set name = 'x' where id = $1 returning id`, [c1]), (r) => r.length === 0);
await expectOk("anon ne voit rien", async () => { try { return await as(null, `select * from couples`); } catch { return []; } }, (r) => r.length === 0);

// Rendez-vous
const [{ id: d1 }] = await as(U.A, `insert into date_proposals (couple_id, created_by, title) values ($1, $2, 'Pique-nique') returning id`, [c1, U.A]);
await expectOk("vote auto de A + statut proposed", () => as(U.A, `select status, (select count(*) from date_votes where proposal_id = $1)::int n from date_proposals where id = $1`, [d1]), (r) => r[0].status === "proposed" && r[0].n === 1);
await expectOk("B vote oui → accepted", async () => {
  await as(U.B, `insert into date_votes (proposal_id, couple_id, user_id, vote) values ($1, $2, $3, 'yes')`, [d1, c1, U.B]);
  return as(U.A, `select status from date_proposals where id = $1`, [d1]);
}, (r) => r[0].status === "accepted");
await expectFail("A ne peut pas forcer le statut", () => as(U.A, `update date_proposals set status = 'done' where id = $1`, [d1]));
await expectFail("B ne peut pas voter à la place de A", () => as(U.B, `update date_votes set vote = 'no' where proposal_id = $1 and user_id = $2 returning *`, [d1, U.A]).then((r) => { if (!r.length) throw new Error("0 ligne"); return r; }));
await expectOk("B marque le rdv comme vécu", () => as(U.B, `select public.complete_date($1)`, [d1]));
await expectOk("C ne voit pas les rdv de A", () => as(U.C, `select * from date_proposals`), (r) => r.length === 0);
await expectFail("C ne peut pas voter sur un rdv de A", () => as(U.C, `insert into date_votes (proposal_id, couple_id, user_id, vote) values ($1, $2, $3, 'no')`, [d1, c1, U.C]));
await expectFail("C ne peut pas insérer un rdv dans le couple de A", () => as(U.C, `insert into date_proposals (couple_id, created_by, title) values ($1, $2, 'x')`, [c1, U.C]));

// Cagnottes
const [{ id: p1 }] = await as(U.A, `insert into pots (couple_id, created_by, name) values ($1, $2, 'Lisbonne') returning id`, [c1, U.A]);
await expectOk("A ajoute une dépense payée par B", () => as(U.A, `insert into expenses (pot_id, couple_id, created_by, paid_by, title, amount) values ($1, $2, $3, $4, 'Hôtel', 120) returning id`, [p1, c1, U.A, U.B]));
await expectFail("payée par C (hors couple) refusée", () => as(U.A, `insert into expenses (pot_id, couple_id, created_by, paid_by, title, amount) values ($1, $2, $3, $4, 'x', 1)`, [p1, c1, U.A, U.C]));
const [{ id: p2 }] = await as(U.C, `insert into pots (couple_id, created_by, name) values ($1, $2, 'C pot') returning id`, [c2, U.C]);
await expectFail("dépense dans la cagnotte d'un autre couple refusée (FK composite)", () => as(U.A, `insert into expenses (pot_id, couple_id, created_by, paid_by, title, amount) values ($1, $2, $3, $3, 'x', 1)`, [p2, c1, U.A]));

// Souvenirs
const [{ id: m1 }] = await as(U.A, `insert into memories (couple_id, created_by, title) values ($1, $2, 'Premier café') returning id`, [c1, U.A]);
await expectOk("photo dans le dossier du couple", () => as(U.A, `insert into memory_photos (memory_id, couple_id, storage_path) values ($1, $2, $3) returning id`, [m1, c1, `${c1}/a.jpg`]));
await expectFail("photo pointant vers le dossier d'un autre couple", () => as(U.A, `insert into memory_photos (memory_id, couple_id, storage_path) values ($1, $2, $3)`, [m1, c1, `${c2}/a.jpg`]));
await expectOk("storage : upload dans son dossier", () => as(U.A, `insert into storage.objects (bucket_id, name) values ('memories', $1) returning id`, [`${c1}/a.jpg`]));
await expectFail("storage : upload dans le dossier d'un autre couple", () => as(U.A, `insert into storage.objects (bucket_id, name) values ('memories', $1)`, [`${c2}/x.jpg`]));
await expectOk("storage : C ne voit pas les photos de A", () => as(U.C, `select * from storage.objects`), (r) => r.length === 0);
const [{ id: al }] = await as(U.A, `insert into albums (couple_id, name) values ($1, 'Été') returning id`, [c1]);
await expectOk("album supprimé → souvenir conservé, album_id null", async () => {
  await as(U.A, `update memories set album_id = $1 where id = $2`, [al, m1]);
  await as(U.A, `delete from albums where id = $1`, [al]);
  return as(U.A, `select album_id from memories where id = $1`, [m1]);
}, (r) => r.length === 1 && r[0].album_id === null);

// Envies
const [{ id: w1 }] = await as(U.A, `insert into wishes (couple_id, created_by, title, kind) values ($1, $2, 'Week-end à Étretat', 'weekend') returning id`, [c1, U.A]);
await expectOk("A note son envie", () => as(U.A, `insert into wish_desires (wish_id, couple_id, user_id, level) values ($1, $2, $3, 5) returning level`, [w1, c1, U.A]));
await expectFail("B ne peut pas noter à la place de A", () => as(U.B, `insert into wish_desires (wish_id, couple_id, user_id, level) values ($1, $2, $3, 1)`, [w1, c1, U.A]));

// Surprises
const [{ id: s1 }] = await as(U.A, `insert into surprises (couple_id, created_by, recipient_id, teaser, reveal_at) values ($1, $2, $3, 'Prépare un sac pour samedi', now() + interval '3 days') returning id`, [c1, U.A, U.B]);
await as(U.A, `insert into surprise_secrets (surprise_id, couple_id, title, message) values ($1, $2, 'Spa à Deauville', 'On part à 9h')`, [s1, c1]);
await as(U.A, `insert into surprise_hints (surprise_id, couple_id, content, reveal_at) values ($1, $2, 'Il y aura de l''eau', now() - interval '1 hour'), ($1, $2, 'Pense au maillot', now() + interval '2 days')`, [s1, c1]);
await expectOk("B voit le teaser", () => as(U.B, `select teaser from surprises`), (r) => r.length === 1);
await expectOk("B ne voit pas le secret avant la date", () => as(U.B, `select * from surprise_secrets`), (r) => r.length === 0);
await expectOk("B ne voit que l'indice déjà révélé", () => as(U.B, `select content from surprise_hints`), (r) => r.length === 1 && r[0].content.includes("eau"));
await expectOk("A voit tout", () => as(U.A, `select (select count(*) from surprise_secrets)::int s, (select count(*) from surprise_hints)::int h`), (r) => r[0].s === 1 && r[0].h === 2);
await expectFail("B ne peut pas avancer la date de révélation", () => as(U.B, `update surprises set reveal_at = now() - interval '1 day' returning id`).then((r) => { if (!r.length) throw new Error("0 ligne"); return r; }));
await expectFail("B ne peut pas modifier le secret", () => as(U.B, `update surprise_secrets set title = 'x' returning surprise_id`).then((r) => { if (!r.length) throw new Error("0 ligne"); return r; }));
await expectOk("après la date, B voit le secret", async () => {
  await as(U.A, `update surprises set reveal_at = now() - interval '1 minute' where id = $1`, [s1]);
  return as(U.B, `select title from surprise_secrets`);
}, (r) => r.length === 1);
await expectFail("C ne peut pas créer de surprise pour A", () => as(U.C, `insert into surprises (couple_id, created_by, recipient_id, teaser, reveal_at) values ($1, $2, $3, 'x', now())`, [c2, U.C, U.A]));
await expectFail("C ne voit/peut rien dans le couple de A", () => as(U.C, `insert into surprise_hints (surprise_id, couple_id, content, reveal_at) values ($1, $2, 'x', now())`, [s1, c1]));

await expectFail("fonction interne non appelable", () => as(U.A, `select public.refresh_date_status($1)`, [d1]));

console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests RLS passent.");
process.exit(failures ? 1 : 0);
