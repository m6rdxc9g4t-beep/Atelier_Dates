import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Formulaire repliable (details/summary natif, sans JS) pour garder les pages
 * centrées sur le contenu plutôt que sur la saisie.
 */
export function Disclosure({ label, children, defaultOpen }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group mb-8 rounded-lg border border-edge bg-surface" open={defaultOpen}>
      <summary className="flex h-12 cursor-pointer list-none items-center gap-2.5 rounded-lg px-4 font-medium text-ink transition-colors hover:bg-sunken group-open:rounded-b-none group-open:border-b group-open:border-line lg:h-10 [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 text-accent-strong transition-transform duration-200 group-open:rotate-45" aria-hidden strokeWidth={2} />
        {label}
      </summary>
      <div className="p-4 sm:p-5">{children}</div>
    </details>
  );
}
