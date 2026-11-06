"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "./actions";

type Mode = "password" | "signup" | "link";

export function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("password");
  const [passwordState, passwordAction] = useFormAction(signInWithPassword);
  const [signUpState, signUpAction] = useFormAction(signUpWithPassword);
  const [linkState, linkAction] = useFormAction(sendMagicLink);
  const linkError = params.get("erreur") === "lien";
  const next = params.get("suite") ?? "";
  // l'e-mail déjà tapé suit d'un mode à l'autre
  const typedEmail = passwordState.values?.email ?? signUpState.values?.email ?? linkState.values?.email;

  const sentState = mode === "link" ? linkState : mode === "signup" ? signUpState : null;
  if (sentState?.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-edge bg-surface p-5 text-ink">
          <Mail className="size-5 text-faint" aria-hidden strokeWidth={1.75} />
          <p className="mt-3 text-title font-semibold">Regarde ta boîte mail</p>
          <p className="mt-1 text-pretty text-muted">{sentState.message}</p>
        </div>
        {mode === "signup" && <SwitchLink onClick={() => setMode("password")}>Revenir à la connexion</SwitchLink>}
      </div>
    );
  }

  const emailField = (state: typeof passwordState) => (
    <Field label="Ton adresse e-mail" name="email" errors={state.fieldErrors?.email}>
      <Input
        name="email"
        defaultValue={state.values?.email ?? typedEmail}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="toi@exemple.fr"
        required
        invalid={Boolean(state.fieldErrors?.email)}
      />
    </Field>
  );

  if (mode === "link") {
    return (
      <form key="link" action={linkAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {emailField(linkState)}
        <FormMessage state={linkState} />
        <SubmitButton pendingLabel="Envoi du lien…" className="lg:h-[38px] lg:text-strong">Recevoir un lien de connexion</SubmitButton>
        <SwitchLink onClick={() => setMode("password")}>Me connecter avec mon mot de passe</SwitchLink>
      </form>
    );
  }

  if (mode === "signup") {
    return (
      <form key="signup" action={signUpAction} className="flex flex-col gap-4" noValidate>
        <h2 className="text-title font-semibold text-ink">Créer un compte</h2>
        <input type="hidden" name="next" value={next} />
        {emailField(signUpState)}
        <Field label="Choisis un mot de passe" name="password" hint="8 caractères minimum" errors={signUpState.fieldErrors?.password}>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            invalid={Boolean(signUpState.fieldErrors?.password)}
          />
        </Field>
        <Field label="Confirme ton mot de passe" name="confirm" errors={signUpState.fieldErrors?.confirm}>
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            invalid={Boolean(signUpState.fieldErrors?.confirm)}
          />
        </Field>
        <FormMessage state={signUpState} />
        <SubmitButton pendingLabel="Création du compte…" className="lg:h-[38px] lg:text-strong">Créer mon compte</SubmitButton>
        <SwitchLink onClick={() => setMode("password")}>J&apos;ai déjà un compte</SwitchLink>
      </form>
    );
  }

  return (
    <form key="password" action={passwordAction} className="flex flex-col gap-4" noValidate>
      {linkError && (
        <FormMessage state={{ status: "error", message: "Ce lien a expiré ou a déjà servi. Connecte-toi avec ton mot de passe ou demande un nouveau lien." }} />
      )}
      <input type="hidden" name="next" value={next} />
      {emailField(passwordState)}
      <Field label="Ton mot de passe" name="password" errors={passwordState.fieldErrors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(passwordState.fieldErrors?.password)}
        />
      </Field>
      <FormMessage state={passwordState} />
      <SubmitButton pendingLabel="Connexion…" className="lg:h-[38px] lg:text-strong">Se connecter</SubmitButton>
      <SwitchLink onClick={() => setMode("signup")}>Pas encore de compte ? Créer un compte</SwitchLink>
      <SwitchLink onClick={() => setMode("link")}>Mot de passe oublié ? Recevoir un lien par e-mail</SwitchLink>
    </form>
  );
}

function SwitchLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-center rounded-sm text-muted transition-colors hover:text-ink hover:underline"
    >
      {children}
    </button>
  );
}
