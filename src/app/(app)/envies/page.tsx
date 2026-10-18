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
import { cn } from "@/lib/utils";
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
      <nav aria-label="Filtrer par type" className="mb-6 flex flex-wrap gap-2">
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
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active ? "border-accent bg-accent-soft font-medium text-ink" : "border-line text-ink-soft hover:bg-sunken",
      )}
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
    <li className="rounded-[1.75rem] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span>{kind}</span>
            {wish.estimated_budget != null && <span>environ {formatMoney(Number(wish.estimated_budget))}</span>}
            {sharedCrush && <span className="rounded-full bg-accent px-2.5 py-0.5 font-medium text-accent-ink">Coup de cœur commun</span>}
          </p>
          <h3 className="mt-1 font-display text-lg leading-snug text-ink">{wish.title}</h3>
        </div>
        <ActionForm action={deleteWish} confirmMessage="Supprimer cette envie ?">
          <input type="hidden" name="wish_id" value={wish.id} />
          <SubmitButton variant="ghost" size="sm" aria-label={`Supprimer ${wish.title}`}>
            <Trash2 className="size-4" aria-hidden />
          </SubmitButton>
        </ActionForm>
      </div>

      {wish.description && <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">{wish.description}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <ActionForm action={setDesire} className="flex items-center gap-2">
          <input type="hidden" name="wish_id" value={wish.id} />
          <span className="text-sm text-ink-soft">Ton envie</span>
          <span className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="submit"
                name="level"
                value={n}
                aria-label={`${n} sur 5 — ${DESIRE_LABELS[n]}`}
                aria-pressed={mine === n}
                className="rounded-full p-1 text-accent transition-transform hover:scale-110"
              >
                <Heart className="size-5" fill={n <= mine ? "currentColor" : "none"} aria-hidden />
              </button>
            ))}
          </span>
        </ActionForm>
        {partner && (
          <p className="text-sm text-ink-soft">
            {partner.display_name} : {theirs ? `${"♥".repeat(theirs)} ${DESIRE_LABELS[theirs].toLowerCase()}` : "pas encore donné son avis"}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <ActionForm action={setWishStatus} className="flex rounded-full bg-sunken p-1">
          <input type="hidden" name="wish_id" value={wish.id} />
          {WISH_STATUSES.map((s) => (
            <button
              key={s.value}
              type="submit"
              name="status"
              value={s.value}
              aria-pressed={wish.status === s.value}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                wish.status === s.value ? "bg-surface text-ink" : "text-ink-soft hover:text-ink",
              )}
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
