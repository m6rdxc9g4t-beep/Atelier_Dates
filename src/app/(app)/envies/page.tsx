import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus, Heart, Sparkles, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCoupleContext } from "@/lib/dal";
import { formatMoney } from "@/lib/format";
import type { WishDesireRow, WishRow } from "@/lib/supabase/database.types";
import { deleteWish, proposeFromWish, setDesire, setWishStatus } from "./actions";
import { DESIRE_LABELS, WISH_KINDS, WISH_STATUSES } from "./wish-meta";
import { WishForm } from "./wish-form";

export const metadata: Metadata = { title: "Envies & scénarios" };

export default function WishesPage({ searchParams }: PageProps<"/envies">) {
  return (
    <>
      <PageHeader
        title="Envies & scénarios"
        intro="Chacun note son envie de 1 à 5 cœurs : les idées qui vous font rêver tous les deux remontent en haut."
      />
      <Disclosure label="Ajouter une envie">
        <WishForm />
      </Disclosure>
      <Suspense fallback={<ListSkeleton />}>
        <WishesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function WishesContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = WISH_KINDS.find((k) => k.value === sp.type)?.value;
  const { supabase, userId, partner } = await getCoupleContext();

  let query = supabase.from("wishes").select("*").order("created_at", { ascending: false });
  if (type) query = query.eq("kind", type);
  const [{ data: wishes, error }, { data: desires }] = await Promise.all([query, supabase.from("wish_desires").select("*")]);
  if (error) throw new Error(error.message);

  const desiresBy = new Map<string, WishDesireRow[]>();
  for (const d of desires ?? []) desiresBy.set(d.wish_id, [...(desiresBy.get(d.wish_id) ?? []), d]);

  const score = (w: WishRow) => {
    const levels = (desiresBy.get(w.id) ?? []).map((d) => d.level);
    if (!levels.length) return 0;
    // la moyenne, avec un petit bonus quand vous avez tous les deux donné votre avis
    return levels.reduce((a, b) => a + b, 0) / levels.length + (levels.length > 1 ? 0.5 : 0);
  };
  const open = wishes.filter((w) => w.status !== "done").sort((a, b) => score(b) - score(a));
  const done = wishes.filter((w) => w.status === "done");

  return (
    <>
      <nav aria-label="Filtrer par type" className="seg mb-6 max-w-full overflow-x-auto">
        <TypeLink href="/envies" active={!type} label="Tout" />
        {WISH_KINDS.map((k) => (
          <TypeLink key={k.value} href={`/envies?type=${k.value}`} active={type === k.value} label={k.plural} />
        ))}
      </nav>

      {wishes.length === 0 ? (
        <EmptyState icon={Sparkles} title="Rien ici pour l'instant">
          Notez vos idées dès qu&apos;elles vous viennent : un atelier poterie, un road-trip en Écosse, repeindre le salon…
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {open.length > 0 && (
            <section>
              <SectionTitle count={open.length}>Vos envies</SectionTitle>
              <ul className="space-y-3">
                {open.map((w) => (
                  <WishCard key={w.id} wish={w} desires={desiresBy.get(w.id) ?? []} userId={userId} partner={partner} />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <SectionTitle count={done.length}>Déjà réalisées</SectionTitle>
              <ul className="space-y-3 opacity-80">
                {done.map((w) => (
                  <WishCard key={w.id} wish={w} desires={desiresBy.get(w.id) ?? []} userId={userId} partner={partner} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function TypeLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="seg-item min-h-8 shrink-0 px-3 lg:min-h-7"
    >
      {label}
    </Link>
  );
}

function WishCard({
  wish,
  desires,
  userId,
  partner,
}: {
  wish: WishRow;
  desires: WishDesireRow[];
  userId: string;
  partner: { id: string; display_name: string } | null;
}) {
  const mine = desires.find((d) => d.user_id === userId)?.level ?? 0;
  const theirs = partner ? (desires.find((d) => d.user_id === partner.id)?.level ?? 0) : 0;
  const sharedCrush = mine >= 4 && theirs >= 4;
  const kind = WISH_KINDS.find((k) => k.value === wish.kind)?.label ?? "";

  return (
    <li className="rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-small text-muted tabular-nums">
            <span>{kind}</span>
            {wish.estimated_budget != null && <span>environ {formatMoney(Number(wish.estimated_budget))}</span>}
            {sharedCrush && <span className="rounded-sm bg-accent-soft px-1.5 py-1 leading-none font-medium text-accent-strong">Coup de cœur commun</span>}
          </p>
          <h3 className="mt-1 text-strong font-semibold leading-snug text-ink">{wish.title}</h3>
        </div>
        <ActionForm action={deleteWish} confirmMessage="Supprimer cette envie ?">
          <input type="hidden" name="wish_id" value={wish.id} />
          <SubmitButton variant="ghost" size="icon" className="-my-1 -mr-1.5" aria-label={`Supprimer ${wish.title}`}>
            <Trash2 className="size-4" aria-hidden />
          </SubmitButton>
        </ActionForm>
      </div>

      {wish.description && <p className="mt-2 whitespace-pre-line text-pretty text-ink-2">{wish.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <ActionForm action={setDesire} className="flex items-center gap-2">
          <input type="hidden" name="wish_id" value={wish.id} />
          <span className="text-muted">Ton envie</span>
          <span className="-my-1 flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="submit"
                name="level"
                value={n}
                aria-label={`${n} sur 5 — ${DESIRE_LABELS[n]}`}
                aria-pressed={mine === n}
                className="grid size-9 place-items-center rounded-md text-accent-strong transition-colors hover:bg-sunken lg:size-6"
              >
                <Heart className="size-5 lg:size-4" fill={n <= mine ? "currentColor" : "none"} aria-hidden strokeWidth={1.75} />
              </button>
            ))}
          </span>
        </ActionForm>
        {partner && (
          <p className="flex flex-wrap items-center gap-1.5 text-muted">
            {partner.display_name} :{" "}
            {theirs ? (
              <>
                <span className="inline-flex text-accent-strong" role="img" aria-label={`${theirs} sur 5`}>
                  {Array.from({ length: theirs }, (_, i) => (
                    <Heart key={i} className="size-3.5" fill="currentColor" aria-hidden strokeWidth={1.75} />
                  ))}
                </span>
                {DESIRE_LABELS[theirs].toLowerCase()}
              </>
            ) : (
              "pas encore donné son avis"
            )}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <ActionForm action={setWishStatus} className="seg">
          <input type="hidden" name="wish_id" value={wish.id} />
          {WISH_STATUSES.map((s) => (
            <button
              key={s.value}
              type="submit"
              name="status"
              value={s.value}
              aria-pressed={wish.status === s.value}
              className="seg-item min-h-8 lg:min-h-6"
            >
              {s.label}
            </button>
          ))}
        </ActionForm>
        {wish.status === "idea" && (wish.kind === "activity" || wish.kind === "weekend") && (
          <ActionForm action={proposeFromWish}>
            <input type="hidden" name="wish_id" value={wish.id} />
            <SubmitButton size="sm" variant="soft">
              <CalendarPlus className="size-4" aria-hidden />
              En faire un rendez-vous
            </SubmitButton>
          </ActionForm>
        )}
      </div>
    </li>
  );
}
