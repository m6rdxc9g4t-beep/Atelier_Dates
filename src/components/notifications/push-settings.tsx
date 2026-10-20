"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { ActionState } from "@/lib/actions";
import { removePushSubscription, savePushSubscription } from "@/app/(app)/notifications/actions";

type Status = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registerWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** Activer / désactiver les notifications push sur l'appareil courant */
export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<ActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: Status;
      if (!VAPID_PUBLIC_KEY) next = "unsupported";
      else if (!supported) next = isIos() && !isStandalone() ? "install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const registration = await registerWorker();
        const subscription = await registration.pushManager.getSubscription();
        next = subscription ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    })().catch(() => !cancelled && setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        // Doit être déclenché par un geste (clic) : exigé par Safari sur iPhone et Mac
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await registerWorker();
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY),
          }));
        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent.slice(0, 300),
        });
        setMessage(result);
        if (result.status === "success") setStatus("on");
      } catch {
        setMessage({ status: "error", message: "L'activation a échoué. Réessaie, ou vérifie les réglages de notifications de l'appareil." });
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const result = await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
          setMessage(result);
        }
        setStatus("off");
      } catch {
        setMessage({ status: "error", message: "La désactivation a échoué. Réessaie." });
      }
    });
  }

  if (status === "loading") return <p className="text-sm text-ink-soft">Vérification de cet appareil…</p>;

  if (status === "install") {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink">
        <Share className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
        <span>
          Sur iPhone, les notifications marchent depuis l&apos;app installée : dans Safari, touche{" "}
          <strong>Partager → Sur l&apos;écran d&apos;accueil</strong>, puis ouvre Notre Petit Monde depuis son icône et reviens ici.
        </span>
      </p>
    );
  }

  if (status === "unsupported") {
    return <p className="text-sm text-ink-soft">Cet appareil ou ce navigateur ne gère pas les notifications push. Les e-mails et SMS restent actifs.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-ink-soft">
        Les notifications sont bloquées pour cette app. Autorise-les dans les réglages de l&apos;appareil (sur iPhone :{" "}
        <strong>Réglages → Notifications → Petit Monde</strong> ; sur Mac : <strong>Réglages Système → Notifications</strong>), puis recharge la page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {status === "on" ? (
          <>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-yes">
              <BellRing className="size-4" aria-hidden />
              Activées sur cet appareil
            </span>
            <Button variant="ghost" size="sm" onClick={disable} disabled={pending}>
              <BellOff className="size-4" aria-hidden />
              Désactiver
            </Button>
          </>
        ) : (
          <Button onClick={enable} disabled={pending}>
            <BellRing className="size-4" aria-hidden />
            {pending ? "Activation…" : "Activer les notifications sur cet appareil"}
          </Button>
        )}
      </div>
      <FormMessage state={message} />
    </div>
  );
}
