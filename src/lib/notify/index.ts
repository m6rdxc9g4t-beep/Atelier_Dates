import "server-only";
import { after } from "next/server";
import type { CoupleContext } from "@/lib/dal";
import type { NotificationKind } from "@/lib/supabase/database.types";
import { configuredChannels, sendEmail, sendPush, sendSms, type Message } from "./channels";

/** Canaux utilisés par type d'événement (le SMS est réservé à l'essentiel) */
const CHANNELS: Record<NotificationKind, { push: boolean; email: boolean; sms: boolean }> = {
  date_proposed: { push: true, email: true, sms: true },
  date_answered: { push: true, email: true, sms: false },
  date_accepted: { push: true, email: true, sms: true },
  surprise: { push: true, email: true, sms: true },
  memory: { push: true, email: true, sms: false },
  test: { push: true, email: true, sms: true },
};

export type NotifyInput = {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string;
};

/**
 * Enregistre la notification (visible dans l'app), puis l'envoie en push,
 * e-mail et SMS une fois la réponse partie. Ne lève jamais d'erreur :
 * une notification ratée ne doit pas faire échouer l'action de l'utilisateur.
 */
export async function notify(ctx: CoupleContext, input: NotifyInput) {
  const { supabase, userId, couple } = ctx;
  const title = input.title.slice(0, 140);
  const body = input.body ? input.body.slice(0, 500) : null;

  // Pas de .select() : l'expéditeur n'a pas le droit de relire la notification de l'autre
  const { error } = await supabase.from("notifications").insert({
    couple_id: couple.id,
    recipient_id: input.recipientId,
    actor_id: userId,
    kind: input.kind,
    title,
    body,
    link: input.link ?? null,
  });
  if (error) console.error("[notify] insert", error.code, error.message);

  after(async () => {
    try {
      await deliver(ctx, { ...input, title, body });
    } catch (e) {
      console.error("[notify] deliver", (e as Error).message);
    }
  });
}

/** Raccourci : notifier l'autre membre du couple (sans effet tant qu'il n'a pas rejoint) */
export async function notifyPartner(ctx: CoupleContext, input: Omit<NotifyInput, "recipientId">) {
  if (!ctx.partner) return;
  await notify(ctx, { ...input, recipientId: ctx.partner.id });
}

async function deliver(ctx: CoupleContext, input: NotifyInput) {
  const { supabase } = ctx;
  const wanted = CHANNELS[input.kind];
  const available = configuredChannels();
  const message: Message = { title: input.title, body: input.body, link: input.link, tag: input.kind };

  const [{ data: targets }, { data: devices }] = await Promise.all([
    supabase.rpc("notification_target", { p_recipient: input.recipientId }),
    wanted.push && available.push
      ? supabase.rpc("push_targets", { p_recipient: input.recipientId })
      : Promise.resolve({ data: [] as { endpoint: string; p256dh: string; auth: string }[] }),
  ]);
  const target = targets?.[0];
  const tasks: Promise<unknown>[] = [];

  if (devices?.length) {
    tasks.push(
      sendPush(devices, message).then(async ({ expired }) => {
        for (const endpoint of expired) await supabase.rpc("forget_push_subscription", { p_endpoint: endpoint });
      }),
    );
  }
  if (target && wanted.email && available.email && target.notify_email && target.email) {
    tasks.push(sendEmail({ email: target.email, name: target.display_name || target.email }, message));
  }
  if (target && wanted.sms && available.sms && target.notify_sms && target.phone) {
    tasks.push(sendSms(target.phone, message));
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") console.error("[notify]", input.kind, (r.reason as Error)?.message);
  }
}
