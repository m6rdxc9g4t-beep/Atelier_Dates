/**
 * Calcul des équilibres façon Tricount pour un couple.
 * payer_share = part (en %) de la dépense qui revient à la personne qui a payé.
 */
export type BalanceExpense = {
  amount: number;
  paid_by: string;
  payer_share: number;
  is_settlement: boolean;
};

export type Balance = {
  /** Total des vraies dépenses (hors remboursements) */
  total: number;
  /** Ce que chacun a payé (hors remboursements) */
  paid: Record<string, number>;
  /** Ce que chacun a réellement consommé */
  consumed: Record<string, number>;
  /** Qui doit combien à qui (null si on est quittes) */
  debt: { from: string; to: string; amount: number } | null;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function computeBalance(expenses: BalanceExpense[], memberIds: [string, string] | [string]): Balance {
  const paid: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const consumed: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  // net > 0 : la personne a avancé plus qu'elle n'a consommé
  const net: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  let total = 0;

  const [a, b] = memberIds;

  for (const e of expenses) {
    const other = e.paid_by === a ? b : a;
    const payerPart = (Number(e.amount) * Number(e.payer_share)) / 100;
    const otherPart = Number(e.amount) - payerPart;

    net[e.paid_by] = (net[e.paid_by] ?? 0) + otherPart;
    if (other) net[other] = (net[other] ?? 0) - otherPart;

    if (!e.is_settlement) {
      total += Number(e.amount);
      paid[e.paid_by] = (paid[e.paid_by] ?? 0) + Number(e.amount);
      consumed[e.paid_by] = (consumed[e.paid_by] ?? 0) + payerPart;
      if (other) consumed[other] = (consumed[other] ?? 0) + otherPart;
    }
  }

  let debt: Balance["debt"] = null;
  if (b) {
    const owedToA = round(net[a]);
    if (owedToA >= 0.01) debt = { from: b, to: a, amount: owedToA };
    else if (owedToA <= -0.01) debt = { from: a, to: b, amount: -owedToA };
  }

  return {
    total: round(total),
    paid: Object.fromEntries(Object.entries(paid).map(([k, v]) => [k, round(v)])),
    consumed: Object.fromEntries(Object.entries(consumed).map(([k, v]) => [k, round(v)])),
    debt,
  };
}

/** "Tu dois 12,00 € à Léa" / "Léa te doit 12,00 €" / "Vous êtes quittes" */
export function debtSentence(
  debt: Balance["debt"],
  userId: string,
  nameOf: (id: string) => string,
  money: (n: number) => string,
) {
  if (!debt) return "Vous êtes quittes";
  if (debt.from === userId) return `Tu dois ${money(debt.amount)} à ${nameOf(debt.to)}`;
  if (debt.to === userId) return `${nameOf(debt.from)} te doit ${money(debt.amount)}`;
  return `${nameOf(debt.from)} doit ${money(debt.amount)} à ${nameOf(debt.to)}`;
}
