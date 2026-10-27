import type { Metadata } from "next";
import { Suspense } from "react";
import { Gift } from "lucide-react";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { getCoupleContext } from "@/lib/dal";
import { MEMORIES_BUCKET } from "@/lib/env";
import type { GiftRow } from "@/lib/supabase/database.types";
import { GiftCard, GiftGrid, type Who } from "./gift-card";
import { GiftForm } from "./gift-form";

export const metadata: Metadata = { title: "Cadeaux" };

export default function GiftsPage() {
  return (
    <>
      <PageHeader
        title="Cadeaux"
        intro="Les objets qui vous feraient plaisir. Sur la liste de l'autre, « Je m'en occupe » reste ton secret."
      />
      <Suspense fallback={<ListSkeleton />}>
        <GiftsContent />
      </Suspense>
    </>
  );
}

async function GiftsContent() {
  const { supabase, userId, couple, partner } = await getCoupleContext();

  const [{ data: gifts, error }, { data: claims }] = await Promise.all([
    supabase.from("gifts").select("*").order("created_at", { ascending: false }),
    // RLS : on ne reçoit que ses propres réservations
    supabase.from("gift_claims").select("gift_id"),
  ]);
  if (error) throw new Error(error.message);

  const claimed = new Set((claims ?? []).map((c) => c.gift_id));

  // Photos : bucket privé, URLs signées valables 1 heure
  const paths = gifts.flatMap((g) => (g.photo_path ? [g.photo_path] : []));
  const { data: signed } = paths.length ? await supabase.storage.from(MEMORIES_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const photoByPath = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));

  const who = (g: GiftRow): Who => (g.wanted_by === null ? "ours" : g.wanted_by === userId ? "mine" : "theirs");
  const open = gifts.filter((g) => !g.received_at);
  const sections: { key: Who; title: string; items: GiftRow[]; empty: string }[] = [
    { key: "mine", title: "Ta liste", items: open.filter((g) => who(g) === "mine"), empty: "Ajoute ce qui te ferait plaisir : un livre, une jolie tasse, des écouteurs…" },
    ...(partner
      ? [
          {
            key: "theirs" as const,
            title: `La liste de ${partner.display_name}`,
            items: open.filter((g) => who(g) === "theirs"),
            empty: `${partner.display_name} n'a encore rien ajouté.`,
          },
          { key: "ours" as const, title: "Pour nous deux", items: open.filter((g) => who(g) === "ours"), empty: "" },
        ]
      : []),
  ];
  const received = gifts.filter((g) => g.received_at);

  return (
    <>
      <Disclosure label="Ajouter une idée cadeau">
        <GiftForm coupleId={couple.id} hasPartner={!!partner} />
      </Disclosure>

      {gifts.length === 0 ? (
        <EmptyState icon={Gift} title="Votre liste est encore vide">
          Notez les objets qui vous font envie, avec le lien du site ou une photo si vous voulez.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {sections.map(
            (s) =>
              (s.items.length > 0 || s.empty) && (
                <section key={s.key}>
                  <SectionTitle count={s.items.length || undefined}>{s.title}</SectionTitle>
                  {s.items.length ? (
                    <GiftGrid>
                      {s.items.map((g) => (
                        <GiftCard key={g.id} gift={g} who={s.key} photo={g.photo_path ? photoByPath.get(g.photo_path) : undefined} claimed={claimed.has(g.id)} />
                      ))}
                    </GiftGrid>
                  ) : (
                    <p className="text-sm text-ink-soft">{s.empty}</p>
                  )}
                </section>
              ),
          )}
          {received.length > 0 && (
            <section>
              <SectionTitle count={received.length}>Déjà offerts</SectionTitle>
              <GiftGrid className="opacity-80">
                {received.map((g) => (
                  <GiftCard key={g.id} gift={g} who={who(g)} photo={g.photo_path ? photoByPath.get(g.photo_path) : undefined} claimed={false} />
                ))}
              </GiftGrid>
            </section>
          )}
        </div>
      )}
    </>
  );
}
