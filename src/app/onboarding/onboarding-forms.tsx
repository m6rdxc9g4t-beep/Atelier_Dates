"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import { createCouple, joinCouple } from "./actions";

export function OnboardingForms({ defaultName }: { defaultName: string }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [createState, createAction] = useFormAction(createCouple);
  const [joinState, joinAction] = useFormAction(joinCouple);

  return (
    <div>
      <div role="tablist" aria-label="Choix" className="mb-6 grid grid-cols-2 rounded-full bg-sunken p-1">
        {(
          [
            ["create", "Je crée notre espace"],
            ["join", "J'ai un code"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full py-2 text-sm font-medium transition-colors",
              mode === value ? "bg-surface text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <form action={createAction} className="flex flex-col gap-4" noValidate>
          <Field label="Ton prénom" name="display_name" errors={createState.fieldErrors?.display_name}>
            <Input name="display_name" defaultValue={createState.values?.display_name ?? defaultName} autoComplete="given-name" required />
          </Field>
          <Field
            label="Le nom de votre petit monde"
            name="name"
            hint="Vous pourrez le changer plus tard."
            errors={createState.fieldErrors?.name}
          >
            <Input name="name" defaultValue={createState.values?.name ?? "Notre Petit Monde"} required />
          </Field>
          <Field
            label="Ensemble depuis le"
            name="started_on"
            hint="Pour le compteur de jours de l'accueil."
            errors={createState.fieldErrors?.started_on}
          >
            <Input name="started_on" defaultValue={createState.values?.started_on} type="date" />
          </Field>
          <FormMessage state={createState} />
          <SubmitButton pendingLabel="Création…">Créer notre espace</SubmitButton>
        </form>
      ) : (
        <form action={joinAction} className="flex flex-col gap-4" noValidate>
          <Field label="Ton prénom" name="display_name" errors={joinState.fieldErrors?.display_name}>
            <Input name="display_name" defaultValue={joinState.values?.display_name ?? defaultName} autoComplete="given-name" required />
          </Field>
          <Field
            label="Code d'invitation"
            name="code"
            hint="Ton amour le trouve dans Paramètres."
            errors={joinState.fieldErrors?.code}
          >
            <Input name="code" defaultValue={joinState.values?.code} className="font-medium tracking-[0.3em] uppercase" maxLength={8} autoComplete="off" required />
          </Field>
          <FormMessage state={joinState} />
          <SubmitButton pendingLabel="Connexion…">Rejoindre notre espace</SubmitButton>
        </form>
      )}
    </div>
  );
}
