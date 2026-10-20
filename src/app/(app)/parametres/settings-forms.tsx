"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import type { CoupleRow, ProfileRow } from "@/lib/supabase/database.types";
import { updateCouple, updatePassword, updateProfile } from "./actions";

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, action] = useFormAction(updateProfile);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Ton prénom" name="display_name" errors={e?.display_name}>
        <Input name="display_name" defaultValue={state.values?.display_name ?? profile.display_name} required autoComplete="given-name" />
      </Field>
      <Field label="Téléphone" name="phone" hint="Pour les SMS, au format +33612345678" errors={e?.phone}>
        <Input name="phone" type="tel" defaultValue={state.values?.phone ?? profile.phone ?? ""} autoComplete="tel" invalid={!!e?.phone} />
      </Field>
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-medium text-ink">Me prévenir quand ton amour propose, répond ou prépare une surprise</legend>
        <Toggle name="notify_email" label="Par e-mail" defaultChecked={profile.notify_email} />
        <Toggle name="notify_sms" label="Par SMS (rendez-vous et surprises seulement)" defaultChecked={profile.notify_sms} />
      </fieldset>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Enregistrement…" className="self-start">
          Enregistrer mon profil
        </SubmitButton>
      </div>
    </form>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 rounded-full bg-edge-soft transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:transition-transform peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  );
}

export function CoupleForm({ couple }: { couple: CoupleRow }) {
  const [state, action] = useFormAction(updateCouple);
  const e = state.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nom de votre petit monde" name="name" errors={e?.name}>
        <Input name="name" defaultValue={state.values?.name ?? couple.name} required />
      </Field>
      <Field label="Ensemble depuis le" name="started_on" errors={e?.started_on}>
        <Input name="started_on" type="date" defaultValue={state.values?.started_on ?? couple.started_on ?? ""} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Enregistrement…" className="self-start">
          Enregistrer
        </SubmitButton>
      </div>
    </form>
  );
}

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-2xl bg-sunken px-4 py-2 font-display text-2xl tracking-[0.25em] text-ink">{code}</code>
      <Button
        variant="soft"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* presse-papiers indisponible : le code reste lisible */
          }
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Copié" : "Copier"}
      </Button>
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useFormAction(updatePassword);
  const e = state.fieldErrors;
  return (
    <form action={action} key={state.status === "success" ? state.message : "form"} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nouveau mot de passe" name="password" hint="8 caractères minimum" errors={e?.password}>
        <Input name="password" type="password" autoComplete="new-password" required invalid={!!e?.password} />
      </Field>
      <Field label="Confirme-le" name="confirm" errors={e?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required invalid={!!e?.confirm} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton variant="soft" pendingLabel="Enregistrement…" className="self-start">
          Changer mon mot de passe
        </SubmitButton>
      </div>
    </form>
  );
}
