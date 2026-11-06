import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, ChevronRight, Gift, MapPin, Quote, Vote } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { markAllNotificationsRead } from "../notifications/actions";
import { buttonClasses } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteCode } from "../parametres/settings-forms";
import { getCoupleContext } from "@/lib/dal";
import { daysSince, requestTime, formatDateTime, formatLongDate, plural, todayInTimezone } from "@/lib/format";
import type { NotificationRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { quoteOfTheDay } from "@/lib/quotes";

export const metadata: Metadata = { title: "Accueil" };

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Chargement">
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

async function HomeContent() {
  const { supabase, userId, me, partner, couple } = await getCoupleContext();
  const nowIso = new Date(requestTime()).toISOString();
  const today = todayInTimezone();

  const [nextDate, proposals, myVotes, nextSurprise, lastMemory, news] = await Promise.all([
    supabase
      .from("date_proposals")
      .select("id, title, proposed_at, location")
      .eq("status", "accepted")
      .gte("proposed_at", nowIso)
      .order("proposed_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("date_proposals").select("id").eq("status", "proposed"),
    supabase.from("date_votes").select("proposal_id").eq("user_id", userId),
    supabase
      .from("surprises")
      .select("teaser, reveal_at")
      .eq("recipient_id", userId)
      .gt("reveal_at", nowIso)
      .order("reveal_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("memories").select("title, note, happened_on, location_name").order("happened_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const voted = new Set((myVotes.data ?? []).map((v) => v.proposal_id));
  const toAnswer = (proposals.data ?? []).filter((p) => !voted.has(p.id)).length;
  const days = couple.started_on ? daysSince(couple.started_on) : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-muted">
          Bonjour {me.display_name}
          {partner ? ` — ${partner.display_name} pense sûrement à toi.` : "."}
        </p>
        {days !== null && days >= 0 ? (
          <>
            <h1 className="mt-2 text-display leading-tight font-semibold tracking-[-0.02em] text-balance text-ink tabular-nums">
              {days === 0 ? "C'est votre premier jour." : `Ça fait ${plural(days, "jour")}.`}
            </h1>
            <p className="mt-1 text-muted">Ensemble depuis le {formatLongDate(couple.started_on!)}.</p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-display leading-tight font-semibold tracking-[-0.02em] text-balance text-ink">{couple.name}</h1>
            <p className="mt-1 text-muted">
              <Link href="/parametres" className="font-medium text-accent-strong underline">
                Ajoutez la date de votre rencontre
              </Link>{" "}
              pour voir le compteur de vos jours ensemble.
            </p>
          </>
        )}
        <blockquote className="mt-5 flex max-w-lg gap-2.5 text-strong leading-snug text-pretty text-ink-2">
          <Quote className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden strokeWidth={1.75} />
          <p>{quoteOfTheDay(today)}</p>
        </blockquote>
      </section>

      {!partner && (
        <section className="rounded-lg border border-edge bg-surface p-4 sm:p-5">
          <h2 className="text-title font-semibold text-ink">Il manque quelqu&apos;un…</h2>
          <p className="mt-1 mb-4 text-muted">
            Envoie ce code à ton amour. À sa première connexion, il ou elle choisit « J&apos;ai un code ».
          </p>
          <InviteCode code={couple.invite_code} />
        </section>
      )}

      {news.data && news.data.length > 0 && <News items={news.data} />}

      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="sr-only">
          En un coup d&apos;œil
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-edge bg-surface">
          <Tile icon={CalendarClock} title="Prochain rendez-vous" href="/rendez-vous">
            {nextDate.data ? (
              <>
                <p className="font-medium text-ink">{nextDate.data.title}</p>
                <p className="mt-0.5 text-muted tabular-nums">
                  {formatDateTime(nextDate.data.proposed_at!)}
                  {nextDate.data.location && ` — ${nextDate.data.location}`}
                </p>
              </>
            ) : (
              <p className="text-muted">Rien de prévu. Et si tu proposais quelque chose ?</p>
            )}
          </Tile>

          <Tile icon={Vote} title="À toi de répondre" href="/rendez-vous">
            {toAnswer ? (
              <p className="font-medium text-ink tabular-nums">{plural(toAnswer, "proposition")} en attente</p>
            ) : (
              <p className="text-muted">Tu as répondu à tout.</p>
            )}
          </Tile>

          {nextSurprise.data && (
            <Tile icon={Gift} title="Une surprise t'attend" href="/surprises">
              <p className="font-medium text-ink">{nextSurprise.data.teaser}</p>
              <p className="mt-0.5 text-muted tabular-nums">
                Révélation <Countdown to={nextSurprise.data.reveal_at} />
              </p>
            </Tile>
          )}

          <Tile icon={MapPin} title="Dernier souvenir" href="/souvenirs">
            {lastMemory.data ? (
              <>
                <p className="font-medium text-ink">{lastMemory.data.title}</p>
                <p className="mt-0.5 text-muted">
                  {formatLongDate(lastMemory.data.happened_on)}
                  {lastMemory.data.location_name && ` — ${lastMemory.data.location_name}`}
                </p>
                {lastMemory.data.note && <p className="mt-1.5 line-clamp-2 text-pretty text-ink-2">« {lastMemory.data.note} »</p>}
              </>
            ) : (
              <p className="text-muted">Votre album attend sa première photo.</p>
            )}
          </Tile>
        </ul>
      </section>

      <Link href="/rendez-vous" className={buttonClasses("primary")}>
        Proposer un rendez-vous
      </Link>
    </div>
  );
}

/** Ligne de l'aperçu : icône, intitulé discret, contenu, flèche */
function Tile({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof Gift;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-sunken focus-visible:-outline-offset-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-small font-medium text-muted">{title}</h3>
          {children}
        </div>
        <ChevronRight
          className="mt-0.5 size-4 shrink-0 text-faint transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-ink"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function News({ items }: { items: NotificationRow[] }) {
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <section aria-labelledby="news-title">
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 id="news-title" className="flex items-center gap-2 text-strong font-semibold text-ink">
          Nouveautés
          {unread > 0 && (
            <span className="rounded-sm bg-accent px-1.5 py-0.5 text-meta leading-none font-semibold text-accent-ink tabular-nums">{unread}</span>
          )}
        </h2>
        {unread > 0 && (
          <ActionForm action={markAllNotificationsRead}>
            <SubmitButton variant="ghost" size="sm" pendingLabel="…">
              Tout marquer comme lu
            </SubmitButton>
          </ActionForm>
        )}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-edge bg-surface">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={n.link ?? "/accueil"} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken focus-visible:-outline-offset-2">
              <span
                className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")}
                aria-label={n.read_at ? undefined : "Non lu"}
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-ink", !n.read_at && "font-semibold")}>{n.title}</span>
                {n.body && <span className="block truncate text-muted">{n.body}</span>}
                <span className="mt-0.5 block text-small text-faint tabular-nums sm:hidden">{formatDateTime(n.created_at)}</span>
              </span>
              <time dateTime={n.created_at} className="mt-px hidden shrink-0 text-small text-faint tabular-nums sm:block">
                {formatDateTime(n.created_at)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
