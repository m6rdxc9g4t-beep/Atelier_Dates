"use client";

import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { createPot } from "./actions";

export function PotForm() {
  const [state, action] = useFormAction(createPot);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[5rem_1fr]" noValidate>
      <Field label="Emoji" name="emoji" errors={e?.emoji}>
        <Input name="emoji" defaultValue={state.values?.emoji ?? "✈️"} maxLength={8} className="text-center text-lg" />
      </Field>
      <Field label="Nom" name="name" errors={e?.name}>
        <Input name="name" defaultValue={state.values?.name} placeholder="Week-end à Lisbonne" required invalid={!!e?.name} />
      </Field>
      <Field label="Budget (€)" name="budget" hint="Facultatif, pour suivre où vous en êtes" errors={e?.budget} className="sm:col-span-2">
        <Input name="budget" defaultValue={state.values?.budget} inputMode="decimal" placeholder="800" invalid={!!e?.budget} />
      </Field>
      <Field label="Description" name="description" errors={e?.description} className="sm:col-span-2">
        <Input name="description" defaultValue={state.values?.description} placeholder="Vol, hôtel, pastéis de nata" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Création…" className="self-start">
          Créer la cagnotte
        </SubmitButton>
      </div>
    </form>
  );
}
