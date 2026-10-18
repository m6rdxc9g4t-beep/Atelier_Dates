import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingForms } from "./onboarding-forms";

export const metadata: Metadata = { title: "Bienvenue" };

export default function OnboardingPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-md">
        <p className="font-hand text-3xl text-accent">premier pas</p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-ink">Créons votre petit monde</h1>
        <p className="mt-3 mb-8 text-ink-soft">
          L&apos;un de vous crée l&apos;espace, l&apos;autre le rejoint avec le code d&apos;invitation.
        </p>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <OnboardingContent />
        </Suspense>
      </div>
    </main>
  );
}

async function OnboardingContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("couple_id, display_name").eq("id", auth.claims.sub).maybeSingle();
  if (me?.couple_id) redirect("/accueil");

  return <OnboardingForms defaultName={me?.display_name ?? ""} />;
}
