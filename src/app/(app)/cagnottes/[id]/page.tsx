import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, HandCoins, Receipt, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { computeBalance, debtSentence } from "@/lib/balances";
import { getCoupleContext, nameOf } from "@/lib/dal";
import { formatMoney, formatShortDate, todayInTimezone } from "@/lib/format";
import { uuid } from "@/lib/validation/common";
import { deleteExpense, deletePot, settleUp } from "../actions";
import { ExpenseForm } from "./expense-form";

export default function PotPage({ params }: PageProps<"/cagnottes/[id]">) {
  return (
    <>
      <Link href="/cagnottes" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Toutes les cagnottes
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <PotContent params={params} />
      </Suspense>
    </>
  );
}

async function PotContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const { supabase, userId, members } = await getCoupleContext();
  const [{ data: pot }, { data: expenses, error }] = await Promise.all([
    supabase.from("pots").select("*").eq("id", id).maybeSingle(),
    supabase.from("expenses").select("*").eq("pot_id", id).order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (!pot) notFound();
  if (error) throw new Error(error.message);

  const ids = members.map((m) => m.id) as [string, string] | [string];
  const balance = computeBalance(expenses, ids);
  const money = (n: number) => formatMoney(n, pot.currency);
  const who = (id: string) => nameOf(members, id, userId);

  return (
    <>
      <header className="mb-8">
        <p className="text-3xl" aria-hidden>
          {pot.emoji}
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{pot.name}</h1>
        {pot.description && <p className="mt-2 text-ink-soft">{pot.description}</p>}
      </header>

      <Panel className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-soft">Dépensé</p>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {money(balance.total)}
              {pot.budget != null && <span className="ml-1 text-base font-normal text-ink-soft">sur {money(Number(pot.budget))}</span>}
            </p>
          </div>
          <dl className="flex gap-6 text-sm">
            {members.map((m) => (
              <div key={m.id}>
                <dt className="text-ink-soft">{m.id === userId ? "Tu as payé" : `${m.display_name} a payé`}</dt>
                <dd className="font-semibold tabular-nums text-ink">{money(balance.paid[m.id] ?? 0)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3">
          <p className="flex items-center gap-2 text-ink">
            <HandCoins className="size-5 text-accent-strong" aria-hidden />
            <span className="font-medium">{debtSentence(balance.debt, userId, (id) => nameOf(members, id), money)}</span>
          </p>
          {balance.debt && (
            <ActionForm action={settleUp} confirmMessage={`Confirmer le remboursement de ${money(balance.debt.amount)} ?`}>
              <input type="hidden" name="pot_id" value={pot.id} />
              <SubmitButton size="sm" pendingLabel="Enregistrement…">
                Marquer comme remboursé
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </Panel>

      <Disclosure label="Ajouter une dépense" defaultOpen={expenses.length === 0}>
        <ExpenseForm
          potId={pot.id}
          userId={userId}
          today={todayInTimezone()}
          members={members.map((m) => ({ id: m.id, label: m.id === userId ? `Moi (${m.display_name})` : m.display_name }))}
        />
      </Disclosure>

      <SectionTitle count={expenses.length}>Dépenses</SectionTitle>
      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucune dépense">
          Ajoutez la première : un billet de train, un dîner, une location…
        </EmptyState>
      ) : (
        <ul className="neon-panel divide-y divide-line rounded-[1.75rem] border border-line bg-surface">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className={e.is_settlement ? "text-ink-soft italic" : "text-ink"}>{e.title}</p>
                <p className="text-xs text-ink-soft">
                  {formatShortDate(e.spent_on)} — payé par {who(e.paid_by)}
                  {!e.is_settlement && Number(e.payer_share) !== 50 && `, partage ${Number(e.payer_share)} / ${100 - Number(e.payer_share)}`}
                </p>
              </div>
              <p className="font-semibold tabular-nums text-ink">{money(Number(e.amount))}</p>
              <ActionForm action={deleteExpense} confirmMessage="Supprimer cette dépense ?">
                <input type="hidden" name="expense_id" value={e.id} />
                <input type="hidden" name="pot_id" value={pot.id} />
                <SubmitButton variant="ghost" size="sm" aria-label={`Supprimer ${e.title}`}>
                  <Trash2 className="size-4" aria-hidden />
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <ActionForm
        action={deletePot}
        className="mt-10"
        confirmMessage="Supprimer cette cagnotte et toutes ses dépenses ? C'est définitif."
      >
        <input type="hidden" name="pot_id" value={pot.id} />
        <SubmitButton variant="danger" size="sm">
          <Trash2 className="size-4" aria-hidden />
          Supprimer la cagnotte
        </SubmitButton>
      </ActionForm>
    </>
  );
}
