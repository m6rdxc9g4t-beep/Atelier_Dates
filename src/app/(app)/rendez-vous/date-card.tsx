import { CalendarClock, Check, MapPin, Trash2, Wallet } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { capitalize, nameOf, type Member } from "@/lib/dal";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { DateProposalRow, DateVoteRow, VoteValue } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { completeDate, deleteDate, voteOnDate } from "./actions";

const VOTE_LABEL: Record<VoteValue, string> = { yes: "On fait ça !", maybe: "Peut-être", no: "Pas cette fois" };
const VOTE_CHIP: Record<VoteValue, string> = {
  yes: "bg-yes-soft text-yes",
  maybe: "bg-maybe-soft text-maybe",
  no: "bg-no-soft text-no",
};

export function DateCard({
  proposal,
  votes,
  members,
  userId,
}: {
  proposal: DateProposalRow;
  votes: DateVoteRow[];
  members: Member[];
  userId: string;
}) {
  const myVote = votes.find((v) => v.user_id === userId)?.vote;
  const canVote = proposal.status === "proposed" || proposal.status === "declined";
  const isAuthor = proposal.created_by === userId;

  return (
    <article className="rounded-[1.75rem] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-snug text-ink">{proposal.title}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">Proposé par {isAuthor ? "toi" : nameOf(members, proposal.created_by)}</p>
        </div>
        {isAuthor && proposal.status !== "done" && (
          <ActionForm action={deleteDate} confirmMessage="Supprimer cette proposition ?">
            <input type="hidden" name="proposal_id" value={proposal.id} />
            <SubmitButton variant="ghost" size="sm" aria-label="Supprimer la proposition">
              <Trash2 className="size-4" aria-hidden />
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
        {proposal.proposed_at && (
          <li className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            {formatDateTime(proposal.proposed_at)}
          </li>
        )}
        {proposal.location && (
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {proposal.location}
          </li>
        )}
        {proposal.budget != null && (
          <li className="flex items-center gap-1.5">
            <Wallet className="size-4" aria-hidden />
            {formatMoney(Number(proposal.budget))}
          </li>
        )}
      </ul>

      {proposal.description && <p className="mt-3 whitespace-pre-line text-[0.95rem] text-ink">{proposal.description}</p>}

      {votes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Réponses">
          {votes.map((v) => (
            <li key={v.user_id} className={cn("rounded-full px-3 py-1 text-xs font-medium", VOTE_CHIP[v.vote])}>
              {capitalize(nameOf(members, v.user_id, userId))} : {VOTE_LABEL[v.vote].toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {canVote && (
        <ActionForm action={voteOnDate} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="proposal_id" value={proposal.id} />
          {(["yes", "maybe", "no"] as const).map((vote) => (
            <SubmitButton
              key={vote}
              name="vote"
              value={vote}
              size="sm"
              variant={myVote === vote ? "primary" : vote === "no" ? "ghost" : "soft"}
            >
              {VOTE_LABEL[vote]}
            </SubmitButton>
          ))}
        </ActionForm>
      )}

      {proposal.status === "accepted" && (
        <ActionForm action={completeDate} className="mt-4">
          <input type="hidden" name="proposal_id" value={proposal.id} />
          <SubmitButton size="sm" variant="soft">
            <Check className="size-4" aria-hidden />
            C&apos;est fait, on l&apos;a vécu
          </SubmitButton>
        </ActionForm>
      )}
    </article>
  );
}
