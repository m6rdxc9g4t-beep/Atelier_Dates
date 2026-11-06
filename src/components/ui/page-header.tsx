import type { ReactNode } from "react";

/** En-tête de page : titre (20 px, 600), phrase d'intro en gris, action optionnelle */
export function PageHeader({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <h1 className="text-page font-semibold tracking-[-0.012em] text-balance text-ink">{title}</h1>
        {intro && <p className="mt-1 text-pretty text-muted">{intro}</p>}
      </div>
      {action}
    </header>
  );
}
