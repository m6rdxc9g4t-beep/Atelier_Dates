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
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/validation/common";
import { deleteExpense, deletePot, settleUp } from "../actions";
import { ExpenseForm } from "./expense-form";

export default function PotPage({ params }: PageProps<"/cagnottes/[id]">) {
  return (
    <>
      <Link href="/cagnottes" className="-ml-1 mb-4 inline-flex h-8 items-center gap-1.5 rounded-md px-1 text-muted transition-colors hover:text-ink">
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
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sunken text-xl leading-none" aria-hidden>
            {pot.emoji}
          </span>
          <h1 className="text-page font-semibold tracking-[-0.012em] text-balance text-ink">{pot.name}</h1>
        </div>
        {pot.description && <p className="mt-2 text-muted">{pot.description}</p>}
      </header>

      <section aria-label="Bilan de la cagnotte" className="mb-8 space-y-3">
        {/* Cartes de chiffres : coins de 12 px (.atelier-kpi), plates, chiffres tabulaires */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className={cn("atelier-kpi", members.length > 1 && "col-span-2 sm:col-span-1")}>
            <dt className="atelier-kpi__label">Dépensé</dt>
            <dd className="atelier-kpi__value">{money(balance.total)}</dd>
            {pot.budget != null && <dd className="atelier-kpi__note">sur {money(Number(pot.budget))}</dd>}
          </div>
          {members.map((m) => (
            <div key={m.id} className="atelier-kpi">
              <dt className="atelier-kpi__label">{m.id === userId ? "Tu as payé" : `${m.display_name} a payé`}</dt>
              <dd className="atelier-kpi__value">{money(balance.paid[m.id] ?? 0)}</dd>
            </div>
          ))}
        </dl>

        <Panel className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-ink">
            <HandCoins className="size-4 shrink-0 text-faint" aria-hidden strokeWidth={1.75} />
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
        </Panel>
      </section>

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
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-edge bg-surface">
          {expenses.map((e) => (
            <li key={e.id} className="flex min-h-14 items-center gap-3 py-2 pr-2 pl-4 lg:min-h-12">
              <div className="min-w-0 flex-1">
                <p className={e.is_settlement ? "text-muted italic" : "text-ink"}>{e.title}</p>
                <p className="text-small text-muted tabular-nums">
                  {formatShortDate(e.spent_on)} — payé par {who(e.paid_by)}
                  {!e.is_settlement && Number(e.payer_share) !== 50 && `, partage ${Number(e.payer_share)} / ${100 - Number(e.payer_share)}`}
                </p>
              </div>
              <p className="font-semibold tabular-nums text-ink">{money(Number(e.amount))}</p>
              <ActionForm action={deleteExpense} confirmMessage="Supprimer cette dépense ?">
                <input type="hidden" name="expense_id" value={e.id} />
                <input type="hidden" name="pot_id" value={pot.id} />
                <SubmitButton variant="ghost" size="icon" className="-my-1 -mr-1.5" aria-label={`Supprimer ${e.title}`}>
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
