"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCoupleContext } from "@/lib/dal";
import { failure, fromDbError, success, type ActionState } from "@/lib/actions";
import { notify } from "@/lib/notify";
import { configuredChannels } from "@/lib/notify/channels";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  userAgent: z.string().max(300).optional(),
});

/** Enregistre l'appareil courant pour les notifications push */
export async function savePushSubscription(input: unknown): Promise<ActionState> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return failure("Cet appareil n'a pas fourni d'abonnement valide.");

  const { supabase } = await getCoupleContext();
  const { endpoint, keys, userAgent } = parsed.data;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent ?? null },
      { onConflict: "endpoint", ignoreDuplicates: true },
    );
  if (error) return fromDbError(error, "L'appareil n'a pas pu être enregistré. Réessaie.");
  return success("Notifications activées sur cet appareil.");
}

export async function removePushSubscription(endpoint: unknown): Promise<ActionState> {
  const parsed = z.url().safeParse(endpoint);
  if (!parsed.success) return failure("Appareil introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
  if (error) return fromDbError(error);
  return success("Notifications désactivées sur cet appareil.");
}

/** S'envoie une notification de test sur tous les canaux disponibles */
export async function sendTestNotification(): Promise<ActionState> {
  const ctx = await getCoupleContext();
  const { supabase, userId, me } = ctx;
  const available = configuredChannels();
  const { count: devices } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  await notify(ctx, {
    recipientId: userId,
    kind: "test",
    title: "Test de notification",
    body: "Si tu lis ceci, tout fonctionne ✨",
    link: "/parametres",
  });

  const channels = [
    "dans l'app",
    available.push && devices ? `push (${devices} appareil${devices > 1 ? "s" : ""})` : null,
    available.email && me.notify_email ? "e-mail" : null,
    available.sms && me.notify_sms && me.phone ? "SMS" : null,
  ].filter(Boolean);

  revalidatePath("/accueil");
  return success(`Test envoyé : ${channels.join(", ")}.`);
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const { supabase, userId } = await getCoupleContext();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) return fromDbError(error);
  revalidatePath("/accueil");
  return success();
}
