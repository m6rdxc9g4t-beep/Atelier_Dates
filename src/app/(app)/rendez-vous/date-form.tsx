"use client";

import { DateTimeField } from "@/components/ui/datetime-field";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { proposeDate } from "./actions";

export function DateForm() {
  const [state, action] = useFormAction(proposeDate);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="On fait quoi ?" name="title" errors={e?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={state.values?.title} placeholder="Pique-nique au bord du canal" required invalid={!!e?.title} />
      </Field>
      <Field label="Quand ?" name="proposed_at" hint="Facultatif" errors={e?.proposed_at}>
        <DateTimeField name="proposed_at" defaultValue={state.values?.proposed_at_local} invalid={!!e?.proposed_at} />
      </Field>
      <Field label="Où ?" name="location" hint="Facultatif" errors={e?.location}>
        <Input name="location" defaultValue={state.values?.location} placeholder="Parc de la Villette" />
      </Field>
      <Field label="Budget estimé (€)" name="budget" hint="Facultatif" errors={e?.budget}>
        <Input name="budget" defaultValue={state.values?.budget} inputMode="decimal" placeholder="40" invalid={!!e?.budget} />
      </Field>
      <Field label="Un mot pour donner envie" name="description" errors={e?.description} className="sm:col-span-2">
        <Textarea name="description" defaultValue={state.values?.description} placeholder="J'apporte les fraises, tu t'occupes de la playlist ?" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Envoi…" className="self-start">
          Proposer ce rendez-vous
        </SubmitButton>
      </div>
    </form>
  );
}
