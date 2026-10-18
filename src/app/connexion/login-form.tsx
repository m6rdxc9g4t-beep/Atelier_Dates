"use client";

import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { sendMagicLink } from "./actions";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action] = useFormAction(sendMagicLink);
  const linkError = params.get("erreur") === "lien";

  if (state.status === "success") {
    return (
      <div className="rounded-[1.75rem] bg-accent-soft p-6 text-ink">
        <Mail className="size-6 text-accent" aria-hidden />
        <p className="mt-3 font-display text-xl">Regarde ta boîte mail</p>
        <p className="mt-1 text-sm text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {linkError && (
        <FormMessage state={{ status: "error", message: "Ce lien a expiré ou a déjà servi. Demande-en un nouveau." }} />
      )}
      <input type="hidden" name="next" value={params.get("suite") ?? ""} />
      <Field label="Ton adresse e-mail" name="email" errors={state.fieldErrors?.email}>
        <Input
          name="email"
          defaultValue={state.values?.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.fr"
          required
          invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Envoi du lien…">Recevoir mon lien de connexion</SubmitButton>
      <p className="text-center text-xs text-ink-soft">Pas de mot de passe : un lien suffit, à chaque connexion.</p>
    </form>
  );
}
