"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { createWish } from "./actions";
import { DESIRE_LABELS, WISH_KINDS } from "./wish-meta";

export function WishForm() {
  const [state, action] = useFormAction(createWish);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Type" name="kind" errors={e?.kind}>
        <Select name="kind" defaultValue={state.values?.kind ?? "activity"}>
          {WISH_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ton envie" name="level">
        <Select name="level" defaultValue={state.values?.level ?? "4"}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"♥".repeat(n)} — {DESIRE_LABELS[n]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Titre" name="title" errors={e?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={state.values?.title} placeholder="Un week-end en cabane dans les arbres" required invalid={!!e?.title} />
      </Field>
      <Field
        label="Le scénario"
        name="description"
        hint="Déroulé rêvé, idées d'étapes, liens… tout ce qui donne envie."
        errors={e?.description}
        className="sm:col-span-2"
      >
        <Textarea name="description" defaultValue={state.values?.description} rows={4} placeholder={"Vendredi soir : départ après le travail\nSamedi : balade en forêt, dîner au feu de bois\nDimanche : grasse matinée"} />
      </Field>
      <Field label="Budget estimé (€)" name="estimated_budget" hint="Facultatif" errors={e?.estimated_budget}>
        <Input name="estimated_budget" defaultValue={state.values?.estimated_budget} inputMode="decimal" placeholder="250" invalid={!!e?.estimated_budget} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Ajout…" className="self-start">
          Ajouter à nos envies
        </SubmitButton>
      </div>
    </form>
  );
}
