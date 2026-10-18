import type { Metadata } from "next";
import { Suspense } from "react";
import { Gift, Lock, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Countdown } from "@/components/ui/countdown";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCoupleContext } from "@/lib/dal";
import { formatDateTime, requestTime } from "@/lib/format";
import type { SurpriseHintRow, SurpriseRow, SurpriseSecretRow } from "@/lib/supabase/database.types";
import { deleteHint, deleteSurprise } from "./actions";
import { HintForm, SurpriseForm } from "./surprise-forms";

export const metadata: Metadata = { title: "Surprises" };

export default function SurprisesPage() {
  return (
    <>
      <PageHeader
        title="Surprises"
        intro="Préparez une surprise en secret, distillez des indices, et laissez la date faire la révélation."
      />
      <Suspense fallback={<ListSkeleton />}>
        <SurprisesContent />
      </Suspense>
    </>
  );
}

async function SurprisesContent() {
  const { supabase, userId, partner } = await getCoupleContext();
  // RLS ne renvoie au destinataire que les secrets et indices déjà révélés
  const [{ data: surprises, error }, { data: secrets }, { data: hints }] = await Promise.all([
    supabase.from("surprises").select("*").order("reveal_at"),
    supabase.from("surprise_secrets").select("*"),
    supabase.from("surprise_hints").select("*").order("reveal_at"),
  ]);
  if (error) throw new Error(error.message);

  const now = requestTime();
  const secretOf = new Map((secrets ?? []).map((s) => [s.surprise_id, s]));
  const hintsOf = (id: string) => (hints ?? []).filter((h) => h.surprise_id === id);
  const forMe = surprises.filter((s) => s.recipient_id === userId);
  const fromMe = surprises.filter((s) => s.created_by === userId);

  return (
    <div className="space-y-10">
      {partner ? (
        <Disclosure label={`Préparer une surprise pour ${partner.display_name}`}>
          <SurpriseForm partnerName={partner.display_name} />
        </Disclosure>
      ) : (
        <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-soft">
          Les surprises s&apos;activent dès que ton amour a rejoint votre espace.
        </p>
      )}

      <section>
        <SectionTitle count={forMe.length}>Pour toi</SectionTitle>
        {forMe.length === 0 ? (
          <EmptyState icon={Gift} title="Rien en vue… pour l'instant">
            Quand une surprise se prépare pour toi, son teaser apparaîtra ici.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {forMe.map((s) => (
              <ReceivedSurprise key={s.id} surprise={s} secret={secretOf.get(s.id)} hints={hintsOf(s.id)} now={now} />
            ))}
          </ul>
        )}
      </section>

      {fromMe.length > 0 && (
        <section>
          <SectionTitle count={fromMe.length}>Tes surprises</SectionTitle>
          <ul className="space-y-3">
            {fromMe.map((s) => (
              <PreparedSurprise key={s.id} surprise={s} secret={secretOf.get(s.id)} hints={hintsOf(s.id)} now={now} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReceivedSurprise({
  surprise,
  secret,
  hints,
  now,
}: {
  surprise: SurpriseRow;
  secret?: SurpriseSecretRow;
  hints: SurpriseHintRow[];
  now: number;
}) {
  const revealed = new Date(surprise.reveal_at).getTime() <= now && secret;
  return (
    <li className="rounded-[1.75rem] border border-line bg-surface p-5">
      {revealed ? (
        <>
          <p className="text-sm text-ink-soft">{surprise.teaser}</p>
          <h3 className="mt-2 font-display text-2xl text-ink">{secret.title}</h3>
          {secret.message && <p className="mt-2 font-hand text-2xl leading-snug whitespace-pre-line text-accent">{secret.message}</p>}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-accent">
            <Lock className="size-4" aria-hidden />
            Révélation <Countdown to={surprise.reveal_at} />
          </div>
          <p className="mt-2 font-display text-xl text-ink">{surprise.teaser}</p>
        </>
      )}
      {hints.length > 0 && (
        <ol className="mt-4 space-y-2 border-t border-line pt-4">
          {hints.map((h, i) => (
            <li key={h.id} className="text-sm text-ink">
              <span className="text-ink-soft">Indice {i + 1} :</span> {h.content}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function PreparedSurprise({
  surprise,
  secret,
  hints,
  now,
}: {
  surprise: SurpriseRow;
  secret?: SurpriseSecretRow;
  hints: SurpriseHintRow[];
  now: number;
}) {
  const revealed = new Date(surprise.reveal_at).getTime() <= now;
  return (
    <li className="rounded-[1.75rem] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            {revealed ? "Révélée le " : "Révélation le "}
            {formatDateTime(surprise.reveal_at)}
          </p>
          <h3 className="mt-1 font-display text-lg text-ink">{secret?.title ?? "Surprise"}</h3>
          <p className="mt-1 text-sm text-ink-soft">Teaser visible : « {surprise.teaser} »</p>
        </div>
        <ActionForm action={deleteSurprise} confirmMessage="Annuler cette surprise ?">
          <input type="hidden" name="surprise_id" value={surprise.id} />
          <SubmitButton variant="ghost" size="sm" aria-label="Annuler la surprise">
            <Trash2 className="size-4" aria-hidden />
          </SubmitButton>
        </ActionForm>
      </div>

      {hints.length > 0 && (
        <ol className="mt-4 space-y-1.5">
          {hints.map((h) => {
            const visible = new Date(h.reveal_at).getTime() <= now;
            return (
              <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {h.content}
                  <span className="ml-2 text-xs text-ink-soft">
                    {visible ? "déjà visible" : `visible le ${formatDateTime(h.reveal_at)}`}
                  </span>
                </span>
                <ActionForm action={deleteHint}>
                  <input type="hidden" name="hint_id" value={h.id} />
                  <SubmitButton variant="ghost" size="sm" aria-label="Supprimer l'indice">
                    <Trash2 className="size-3.5" aria-hidden />
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ol>
      )}

      {!revealed && (
        <div className="mt-4 border-t border-line pt-4">
          <HintForm surpriseId={surprise.id} />
        </div>
      )}
    </li>
  );
}
