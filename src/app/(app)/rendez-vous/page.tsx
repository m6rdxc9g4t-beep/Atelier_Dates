import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarHeart } from "lucide-react";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { getCoupleContext } from "@/lib/dal";
import type { DateProposalRow, DateVoteRow } from "@/lib/supabase/database.types";
import { DateCard } from "./date-card";
import { DateForm } from "./date-form";

export const metadata: Metadata = { title: "Rendez-vous" };

export default function DatesPage() {
  return (
    <>
      <PageHeader
        title="Rendez-vous"
        intro="Proposez une idée, l'autre répond. Deux « on fait ça ! » et c'est validé."
      />
      <Disclosure label="Proposer un rendez-vous">
        <DateForm />
      </Disclosure>
      <Suspense fallback={<ListSkeleton />}>
        <DatesContent />
      </Suspense>
    </>
  );
}

async function DatesContent() {
  const { supabase, userId, members } = await getCoupleContext();
  const [{ data: proposals, error }, { data: votes }] = await Promise.all([
    supabase.from("date_proposals").select("*").order("proposed_at", { ascending: true, nullsFirst: false }),
    supabase.from("date_votes").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const votesBy = new Map<string, DateVoteRow[]>();
  for (const v of votes ?? []) votesBy.set(v.proposal_id, [...(votesBy.get(v.proposal_id) ?? []), v]);
  const myVote = (p: DateProposalRow) => votesBy.get(p.id)?.find((v) => v.user_id === userId);

  const toAnswer = proposals.filter((p) => p.status === "proposed" && !myVote(p));
  const waiting = proposals.filter((p) => p.status === "proposed" && myVote(p));
  const accepted = proposals.filter((p) => p.status === "accepted");
  const done = proposals.filter((p) => p.status === "done").reverse().slice(0, 10);
  const declined = proposals.filter((p) => p.status === "declined").slice(-5);

  if (!proposals.length) {
    return (
      <EmptyState icon={CalendarHeart} title="Aucun rendez-vous pour l'instant">
        Lancez la première idée : un resto, une balade, une soirée jeux… L&apos;autre n&apos;aura plus qu&apos;à dire oui.
      </EmptyState>
    );
  }

  const groups: { title: string; items: DateProposalRow[] }[] = [
    { title: "À toi de répondre", items: toAnswer },
    { title: "Validés", items: accepted },
    { title: "En attente de réponse", items: waiting },
    { title: "Déjà vécus", items: done },
    { title: "Pas cette fois", items: declined },
  ];

  return (
    <div className="space-y-10">
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.title}>
            <SectionTitle count={g.items.length}>{g.title}</SectionTitle>
            <div className="space-y-3">
              {g.items.map((p) => (
                <DateCard key={p.id} proposal={p} votes={votesBy.get(p.id) ?? []} members={members} userId={userId} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
