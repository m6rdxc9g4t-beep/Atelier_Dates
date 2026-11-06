import { getCoupleContext } from "@/lib/dal";

/** Les deux initiales côte à côte + nom du couple */
export async function CoupleBadge() {
  const { couple, me, partner } = await getCoupleContext();
  const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();
  const names = partner ? `${me.display_name} & ${partner.display_name}` : null;
  const subtitle = !partner ? "En attente de ton amour" : names !== couple.name ? names : null;

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <div className="flex -space-x-1.5" aria-hidden>
        <span className="grid size-6 place-items-center rounded-full bg-selected text-meta font-semibold text-ink ring-2 ring-sidebar">
          {initial(me.display_name)}
        </span>
        <span className="grid size-6 place-items-center rounded-full bg-selected text-meta font-semibold text-ink ring-2 ring-sidebar">
          {partner ? initial(partner.display_name) : "?"}
        </span>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold text-ink">{couple.name}</p>
        {subtitle && <p className="truncate text-small text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
