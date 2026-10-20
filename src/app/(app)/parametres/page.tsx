import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { ThemePicker } from "@/components/theme/theme-picker";
import { getCoupleContext } from "@/lib/dal";
import { signOut } from "@/app/connexion/actions";
import { CoupleForm, InviteCode, PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Paramètres" />
      <div className="space-y-6">
        <Suspense fallback={<ListSkeleton rows={2} />}>
          <SettingsContent />
        </Suspense>
        <Panel>
          <SectionTitle>Mot de passe</SectionTitle>
          <PasswordForm />
        </Panel>
        <Panel>
          <SectionTitle>Thème</SectionTitle>
          <ThemePicker />
        </Panel>
        <form action={signOut}>
          <SubmitButton variant="ghost" pendingLabel="Déconnexion…">
            <LogOut className="size-4" aria-hidden />
            Se déconnecter
          </SubmitButton>
        </form>
      </div>
    </>
  );
}

async function SettingsContent() {
  const { me, couple, partner } = await getCoupleContext();
  return (
    <>
      <Panel>
        <SectionTitle>Ton profil</SectionTitle>
        <ProfileForm profile={me} />
      </Panel>
      <Panel>
        <SectionTitle>Votre couple</SectionTitle>
        <CoupleForm couple={couple} />
        <div className="mt-6 border-t border-line pt-5">
          {partner ? (
            <p className="text-sm text-ink-soft">
              {me.display_name} &amp; {partner.display_name} — votre espace est complet.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-soft">
                Envoie ce code à ton amour : à sa première connexion, il ou elle choisit « J&apos;ai un code ».
              </p>
              <InviteCode code={couple.invite_code} />
            </>
          )}
        </div>
      </Panel>
    </>
  );
}
