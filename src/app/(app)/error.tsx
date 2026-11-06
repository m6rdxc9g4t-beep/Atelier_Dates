"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-5 sm:p-6">
      <CircleAlert className="size-5 text-bad" aria-hidden />
      <h1 className="mt-3 text-title font-semibold text-ink">Cette page n&apos;a pas pu se charger</h1>
      <p className="mt-1 text-muted">
        La connexion à la base de données a échoué. Vérifie ta connexion internet puis réessaie.
      </p>
      {error.digest && <p className="mt-2 text-small text-faint tabular-nums">Référence : {error.digest}</p>}
      <Button className="mt-5" onClick={() => retry()}>
        Réessayer
      </Button>
    </div>
  );
}
