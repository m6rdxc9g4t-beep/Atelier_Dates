import Image from "next/image";
import { Check, ExternalLink, HandHeart, RotateCcw, ShoppingBag, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatMoney } from "@/lib/format";
import type { GiftRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { deleteGift, toggleClaim, toggleReceived } from "./actions";
import { GiftEditor } from "./gift-editor";

/** À qui est le cadeau, vu par la personne connectée */
export type Who = "mine" | "theirs" | "ours";

export function GiftGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>{children}</ul>;
}

function siteName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "le site";
  }
}

export function GiftCard({
  gift,
  who,
  photo,
  claimed,
  coupleId,
}: {
  gift: GiftRow;
  who: Who;
  photo?: string;
  claimed: boolean;
  coupleId: string;
}) {
  const isReceived = !!gift.received_at;

  return (
    <li className={cn("neon-panel overflow-hidden rounded-[1.75rem] border border-edge bg-surface", claimed && "neon-panel-strong")}>
      {photo && (
        <a href={photo} target="_blank" rel="noreferrer" className="block bg-sunken">
          <Image src={photo} alt={gift.title} width={600} height={450} unoptimized className="aspect-[4/3] w-full object-cover" />
        </a>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {!photo && (
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                <ShoppingBag className="size-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-snug text-ink">{gift.title}</h3>
              {gift.price != null && <p className="text-sm text-ink-soft">{formatMoney(Number(gift.price))}</p>}
            </div>
          </div>
          <ActionForm action={deleteGift} confirmMessage="Retirer cet objet de la liste ?">
            <input type="hidden" name="gift_id" value={gift.id} />
            <SubmitButton variant="ghost" size="sm" aria-label={`Supprimer ${gift.title}`}>
              <Trash2 className="size-4" aria-hidden />
            </SubmitButton>
          </ActionForm>
        </div>

        {gift.note && <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">{gift.note}</p>}

        {gift.url && (
          <a
            href={gift.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-accent-strong underline-offset-2 hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">Voir sur {siteName(gift.url)}</span>
          </a>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {who === "theirs" && !isReceived && (
            <ActionForm action={toggleClaim}>
              <input type="hidden" name="gift_id" value={gift.id} />
              <input type="hidden" name="claim" value={claimed ? "0" : "1"} />
              <SubmitButton size="sm" variant={claimed ? "primary" : "soft"} aria-pressed={claimed}>
                <HandHeart className="size-4" aria-hidden />
                {claimed ? "Tu t'en occupes" : "Je m'en occupe"}
              </SubmitButton>
            </ActionForm>
          )}
          {/* Sur la liste de l'autre, c'est lui ou elle qui dit « reçu » : sinon la surprise serait éventée */}
          {(who !== "theirs" || isReceived) && (
            <ActionForm action={toggleReceived}>
              <input type="hidden" name="gift_id" value={gift.id} />
              <input type="hidden" name="received" value={isReceived ? "0" : "1"} />
              <SubmitButton size="sm" variant={isReceived ? "ghost" : "soft"}>
                {isReceived ? <RotateCcw className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
                {isReceived ? "Remettre dans la liste" : who === "mine" ? "Je l'ai reçu" : "On l'a"}
              </SubmitButton>
            </ActionForm>
          )}
          {/* On modifie ses propres envies et celles du couple ; la liste de l'autre lui appartient */}
          {who !== "theirs" && <GiftEditor gift={gift} coupleId={coupleId} currentPhoto={photo} />}
        </div>
        {claimed && !isReceived && <p className="mt-2 text-xs text-ink-soft">Chut, l&apos;autre ne voit pas que tu t&apos;en occupes.</p>}
      </div>
    </li>
  );
}
