import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="font-hand text-3xl text-accent">bienvenue chez vous</p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-ink">Notre Petit Monde</h1>
        <p className="mt-3 mb-8 text-ink-soft">
          Vos rendez-vous, vos comptes, vos souvenirs et vos projets, dans un espace rien qu&apos;à vous deux.
        </p>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
