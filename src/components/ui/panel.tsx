import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Conteneur principal : surface plate, trait de 1 px, coins de 10 px */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-lg border border-edge bg-surface p-4 sm:p-5", className)} {...props} />;
}

/** Titre de section (en-tête de groupe) : titre en 600 et compteur discret */
export function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-strong font-semibold text-ink">
      {children}
      {typeof count === "number" && <span className="text-meta font-medium text-faint tabular-nums">{count}</span>}
    </h2>
  );
}
