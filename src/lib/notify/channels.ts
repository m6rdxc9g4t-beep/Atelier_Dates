import "server-only";
import webpush from "web-push";
import { emailHtml, emailText, siteUrl, smsRecipient, smsText } from "./format";

export type Message = { title: string; body?: string | null; link?: string | null; tag?: string };

const BREVO_API = "https://api.brevo.com/v3";

/** Canaux configurés côté serveur (variables d'environnement Vercel) */
export function configuredChannels() {
  return {
    push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    email: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    sms: Boolean(process.env.BREVO_API_KEY),
  };
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? siteUrl(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidReady = true;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

/**
 * Envoie une notification push à chaque appareil abonné.
 * Renvoie la liste des abonnements expirés (à oublier).
 */
export async function sendPush(targets: PushTarget[], message: Message) {
  ensureVapid();
  const payload = JSON.stringify({
    title: message.title,
    body: message.body ?? "",
    url: message.link ?? "/accueil",
    tag: message.tag,
  });
  const expired: string[] = [];
  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, {
        TTL: 60 * 60 * 24,
        urgency: "high",
      }),
    ),
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled") return;
    const status = (r.reason as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) expired.push(targets[i].endpoint);
    else console.error("[notify] push", status ?? "", (r.reason as Error)?.message);
  });
  return { sent: results.length - expired.length, expired };
}

async function brevo(path: string, body: unknown) {
  const res = await fetch(`${BREVO_API}${path}`, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo ${path} ${res.status} ${text.slice(0, 300)}`);
  }
}

export async function sendEmail(to: { email: string; name: string }, message: Message) {
  await brevo("/smtp/email", {
    sender: {
      name: process.env.BREVO_SENDER_NAME ?? "Notre Petit Monde",
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [to],
    subject: message.title,
    htmlContent: emailHtml(message),
    textContent: emailText(message),
    tags: ["notre-petit-monde", message.tag ?? "notification"],
  });
}

export async function sendSms(phone: string, message: Message) {
  await brevo("/transactionalSMS/send", {
    sender: (process.env.BREVO_SMS_SENDER ?? "PetitMonde").slice(0, 11),
    recipient: smsRecipient(phone),
    content: smsText(message.title, message.body),
    type: "transactional",
    tag: message.tag ?? "notification",
  });
}

