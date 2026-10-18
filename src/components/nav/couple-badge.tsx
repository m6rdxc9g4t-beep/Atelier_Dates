import { getCoupleContext } from "@/lib/dal";

/** Les deux initiales enlacées + nom du couple */
export async function CoupleBadge() {
  const { couple, me, partner } = await getCoupleContext();
  const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();
  const names = partner ? `${me.display_name} & ${partner.display_name}` : null;
  const subtitle = !partner ? "En attente de ton amour" : names !== couple.name ? names : null;

  return (
    <div className="flex items-center gap-3 px-4">
      <div className="flex -space-x-2" aria-hidden>
        <span className="grid size-9 place-items-center rounded-full border-2 border-paper bg-accent font-display text-accent-ink">
          {initial(me.display_name)}
        </span>
        <span className="grid size-9 place-items-center rounded-full border-2 border-paper bg-accent-soft font-display text-ink">
          {partner ? initial(partner.display_name) : "?"}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{couple.name}</p>
        {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
      </div>
    </div>
  );
}
