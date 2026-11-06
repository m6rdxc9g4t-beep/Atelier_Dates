import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AtelierBrand } from "@/components/atelier-brand";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-12">
      <div className="w-full max-w-sm">
        <AtelierBrand />
        <h1 className="mt-8 text-page font-semibold tracking-[-0.012em] text-ink">Notre Petit Monde</h1>
        <p className="mt-1.5 mb-7 text-pretty text-muted">
          Vos rendez-vous, vos comptes, vos souvenirs et vos projets, dans un espace rien qu&apos;à vous deux.
        </p>
        <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
