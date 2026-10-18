"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function remaining(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (ms === 0) return "maintenant";
  if (days > 0) return `dans ${days} j ${hours} h`;
  if (hours > 0) return `dans ${hours} h ${minutes} min`;
  return `dans ${Math.max(1, minutes)} min`;
}

/** Compte à rebours ; rafraîchit la page à l'échéance pour révéler le contenu */
export function Countdown({ to }: { to: string }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= target) {
        window.clearInterval(id);
        router.refresh();
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [target, router]);

  return (
    <time dateTime={to} suppressHydrationWarning>
      {remaining(target, now)}
    </time>
  );
}
