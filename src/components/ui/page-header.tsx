import type { ReactNode } from "react";

/** En-tête de page : titre en Young Serif (halo cyan en sombre), phrase d'intro, action optionnelle */
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
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <h1 className="neon-title font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
      </div>
      {action}
    </header>
  );
}
