import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WalletCards } from "lucide-react";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { computeBalance, debtSentence } from "@/lib/balances";
import { getCoupleContext, nameOf } from "@/lib/dal";
import { formatMoney } from "@/lib/format";
import { PotForm } from "./pot-form";

export const metadata: Metadata = { title: "Cagnottes" };

export default function PotsPage() {
  return (
    <>
      <PageHeader
        title="Cagnottes"
        intro="Notez qui paie quoi pendant un voyage ou une sortie : l'appli calcule qui doit combien à qui."
      />
      <Disclosure label="Nouvelle cagnotte">
        <PotForm />
      </Disclosure>
      <Suspense fallback={<ListSkeleton />}>
        <PotsContent />
      </Suspense>
    </>
  );
}

async function PotsContent() {
  const { supabase, userId, members } = await getCoupleContext();
  const [{ data: pots, error }, { data: expenses }] = await Promise.all([
    supabase.from("pots").select("*").order("created_at", { ascending: false }),
    supabase.from("expenses").select("pot_id, amount, paid_by, payer_share, is_settlement"),
  ]);
  if (error) throw new Error(error.message);

  if (!pots.length) {
    return (
      <EmptyState icon={WalletCards} title="Pas encore de cagnotte">
        Créez-en une par voyage ou par projet : « Vacances en Bretagne », « Courses de la semaine »…
      </EmptyState>
    );
  }

  const ids = members.map((m) => m.id) as [string, string] | [string];

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {pots.map((pot) => {
        const balance = computeBalance((expenses ?? []).filter((e) => e.pot_id === pot.id), ids);
        const progress = pot.budget ? Math.min(100, (balance.total / Number(pot.budget)) * 100) : null;
        return (
          <li key={pot.id}>
            <Link
              href={`/cagnottes/${pot.id}`}
              className="block h-full rounded-xl border border-edge bg-surface p-4 transition-colors hover:border-edge-soft hover:bg-sunken/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sunken text-lg leading-none" aria-hidden>
                  {pot.emoji}
                </span>
                <h2 className="text-strong font-semibold text-ink">{pot.name}</h2>
              </div>
              <p className="mt-3 text-page font-semibold tracking-[-0.012em] tabular-nums text-ink">
                {formatMoney(balance.total, pot.currency)}
                {pot.budget != null && (
                  <span className="ml-1 text-ui font-normal tracking-normal text-muted">
                    / {formatMoney(Number(pot.budget), pot.currency)}
                  </span>
                )}
              </p>
              {progress !== null && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
              )}
              <p className="mt-3 text-muted">
                {debtSentence(balance.debt, userId, (id) => nameOf(members, id), (n) => formatMoney(n, pot.currency))}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
