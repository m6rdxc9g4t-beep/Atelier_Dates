"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import { addExpense } from "../actions";

type Split = "equal" | "for_partner" | "custom";

export function ExpenseForm({
  potId,
  members,
  userId,
  today,
}: {
  potId: string;
  members: { id: string; label: string }[];
  userId: string;
  today: string;
}) {
  const [state, action] = useFormAction(addExpense);
  const [split, setSplit] = useState<Split>("equal");
  const e = state.fieldErrors;

  const options: { value: Split; label: string }[] = [
    { value: "equal", label: "Moitié-moitié" },
    { value: "for_partner", label: "Tout pour l'autre" },
    { value: "custom", label: "Autre partage" },
  ];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="pot_id" value={potId} />
      <Field label="Libellé" name="title" errors={e?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={state.values?.title} placeholder="Dîner au Time Out Market" required invalid={!!e?.title} />
      </Field>
      <Field label="Montant (€)" name="amount" errors={e?.amount}>
        <Input name="amount" defaultValue={state.values?.amount} inputMode="decimal" placeholder="54,80" required invalid={!!e?.amount} />
      </Field>
      <Field label="Date" name="spent_on" errors={e?.spent_on}>
        <Input name="spent_on" type="date" defaultValue={state.values?.spent_on ?? today} required />
      </Field>
      <Field label="Payé par" name="paid_by" errors={e?.paid_by} className="sm:col-span-2">
        <Select name="paid_by" defaultValue={state.values?.paid_by ?? userId}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Partage</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                split === o.value ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-soft hover:bg-sunken",
              )}
            >
              <input
                type="radio"
                name="split"
                value={o.value}
                checked={split === o.value}
                onChange={() => setSplit(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
        {split === "custom" && (
          <div className="mt-3 max-w-xs">
            <Field label="Part de la personne qui paie (%)" name="payer_share" hint="Ex. 70 : elle garde 70 %, l'autre lui doit 30 %.">
              <Input name="payer_share" type="number" min={0} max={100} step={1} defaultValue={state.values?.payer_share ?? 50} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Ajout…" className="self-start">
          Ajouter la dépense
        </SubmitButton>
      </div>
    </form>
  );
}
