"use client";

import { DateTimeField } from "@/components/ui/datetime-field";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { addHint, createSurprise } from "./actions";

export function SurpriseForm({ partnerName }: { partnerName: string }) {
  const [state, action] = useFormAction(createSurprise);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field
        label={`Ce que ${partnerName} voit dès maintenant`}
        name="teaser"
        hint="Un teaser, sans rien dévoiler."
        errors={e?.teaser}
        className="sm:col-span-2"
      >
        <Input name="teaser" defaultValue={state.values?.teaser} placeholder="Bloque ton samedi et prends un maillot…" required invalid={!!e?.teaser} />
      </Field>
      <Field label="Date de la révélation" name="reveal_at" errors={e?.reveal_at}>
        <DateTimeField name="reveal_at" defaultValue={state.values?.reveal_at_local} required invalid={!!e?.reveal_at} />
      </Field>
      <Field label="La surprise" name="title" hint="Reste secret jusqu'à la révélation" errors={e?.title}>
        <Input name="title" defaultValue={state.values?.title} placeholder="Une journée au spa" required invalid={!!e?.title} />
      </Field>
      <Field label="Ton message de révélation" name="message" errors={e?.message} className="sm:col-span-2">
        <Textarea name="message" defaultValue={state.values?.message} className="font-hand text-2xl leading-snug" placeholder="Rendez-vous à 10 h devant la gare…" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Programmation…" className="self-start">
          Programmer la surprise
        </SubmitButton>
      </div>
    </form>
  );
}

export function HintForm({ surpriseId }: { surpriseId: string }) {
  const [state, action] = useFormAction(addHint);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end" noValidate>
      <input type="hidden" name="surprise_id" value={surpriseId} />
      <Field label="Nouvel indice" name="content" errors={e?.content}>
        <Input name="content" defaultValue={state.values?.content} placeholder="Il y aura de l'eau chaude" required />
      </Field>
      <Field label="Visible à partir du" name="reveal_at" errors={e?.reveal_at}>
        <DateTimeField name="reveal_at" defaultValue={state.values?.reveal_at_local} required />
      </Field>
      <SubmitButton variant="soft" pendingLabel="Ajout…">
        Ajouter
      </SubmitButton>
      <FormMessage state={state} className="sm:col-span-3" />
    </form>
  );
}
