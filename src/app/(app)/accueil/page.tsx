import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bell, CalendarClock, Gift, MapPin, Vote } from "lucide-react";
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
    <div className="space-y-6" role="status" aria-label="Chargement">
      <Skeleton className="h-28 w-3/4" />
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
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
    <div className="space-y-10">
      <section>
        <p className="text-ink-soft">
          Bonjour {me.display_name}
          {partner ? ` — ${partner.display_name} pense sûrement à toi.` : "."}
        </p>
        {days !== null && days >= 0 ? (
          <>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              {days === 0 ? "C'est votre premier jour." : `Ça fait ${plural(days, "jour")}.`}
            </h1>
            <p className="mt-3 text-ink-soft">Ensemble depuis le {formatLongDate(couple.started_on!)}.</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">{couple.name}</h1>
            <p className="mt-3 text-ink-soft">
              <Link href="/parametres" className="text-accent underline underline-offset-4">
                Ajoutez la date de votre rencontre
              </Link>{" "}
              pour voir le compteur de vos jours ensemble.
            </p>
          </>
        )}
        <blockquote className="mt-8 max-w-lg font-hand text-3xl leading-snug text-accent">{quoteOfTheDay(today)}</blockquote>
      </section>

      {!partner && (
        <section className="rounded-[1.75rem] bg-accent-soft p-6">
          <h2 className="font-display text-xl text-ink">Il manque quelqu&apos;un…</h2>
          <p className="mt-1 mb-4 text-sm text-ink-soft">
            Envoie ce code à ton amour. À sa première connexion, il ou elle choisit « J&apos;ai un code ».
          </p>
          <InviteCode code={couple.invite_code} />
        </section>
      )}

      {news.data && news.data.length > 0 && <News items={news.data} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile icon={CalendarClock} title="Prochain rendez-vous" href="/rendez-vous">
          {nextDate.data ? (
            <>
              <p className="font-display text-xl text-ink">{nextDate.data.title}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {formatDateTime(nextDate.data.proposed_at!)}
                {nextDate.data.location && ` — ${nextDate.data.location}`}
              </p>
            </>
          ) : (
            <p className="text-ink-soft">Rien de prévu. Et si tu proposais quelque chose ?</p>
          )}
        </Tile>

        <Tile icon={Vote} title="À toi de répondre" href="/rendez-vous">
          {toAnswer ? (
            <p className="font-display text-xl text-ink">{plural(toAnswer, "proposition")} en attente</p>
          ) : (
            <p className="text-ink-soft">Tu as répondu à tout.</p>
          )}
        </Tile>

        {nextSurprise.data && (
          <Tile icon={Gift} title="Une surprise t'attend" href="/surprises">
            <p className="font-display text-xl text-ink">{nextSurprise.data.teaser}</p>
            <p className="mt-1 text-sm text-accent">
              Révélation <Countdown to={nextSurprise.data.reveal_at} />
            </p>
          </Tile>
        )}

        <Tile icon={MapPin} title="Dernier souvenir" href="/souvenirs">
          {lastMemory.data ? (
            <>
              <p className="font-display text-xl text-ink">{lastMemory.data.title}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {formatLongDate(lastMemory.data.happened_on)}
                {lastMemory.data.location_name && ` — ${lastMemory.data.location_name}`}
              </p>
              {lastMemory.data.note && <p className="mt-2 line-clamp-2 font-hand text-xl text-accent">{lastMemory.data.note}</p>}
            </>
          ) : (
            <p className="text-ink-soft">Votre album attend sa première photo.</p>
          )}
        </Tile>
      </div>

      <Link href="/rendez-vous" className={buttonClasses("primary")}>
        Proposer un rendez-vous
      </Link>
    </div>
  );
}

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
    <Link href={href} className="group block rounded-[1.75rem] border border-line bg-surface p-5 transition-colors hover:border-accent">
      <h2 className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
        <Icon className="size-4 text-accent" aria-hidden />
        {title}
      </h2>
      {children}
    </Link>
  );
}

function News({ items }: { items: NotificationRow[] }) {
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <section aria-labelledby="news-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="news-title" className="flex items-center gap-2 font-display text-xl text-ink">
          <Bell className="size-5 text-accent" aria-hidden />
          Nouveautés
          {unread > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 font-sans text-xs font-semibold text-accent-ink">{unread}</span>
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
      <ul className="divide-y divide-line rounded-[1.75rem] border border-line bg-surface">
        {items.map((n) => (
          <li key={n.id}>
            <Link href={n.link ?? "/accueil"} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-sunken/60">
              <span
                className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")}
                aria-label={n.read_at ? undefined : "Non lu"}
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-ink", !n.read_at && "font-semibold")}>{n.title}</span>
                {n.body && <span className="block truncate text-sm text-ink-soft">{n.body}</span>}
              </span>
              <time dateTime={n.created_at} className="shrink-0 text-xs text-ink-soft">
                {formatDateTime(n.created_at)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
