import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-edge-soft px-6 py-10 text-center">
      <Icon className="size-5 text-faint" aria-hidden strokeWidth={1.75} />
      <p className="mt-3 text-title font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-pretty text-muted">{children}</div>}
    </div>
  );
}
