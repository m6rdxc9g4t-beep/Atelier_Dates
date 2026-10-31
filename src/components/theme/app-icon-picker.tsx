"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ICONS, APP_ICON_COOKIE, isAppIcon, resolveAppIcon, type AppIcon } from "@/lib/app-icon";
import { APPLY_APP_ICON } from "./app-icons";

function readCookie(): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|; )${APP_ICON_COOKIE}=([^;]*)`))?.[1];
}

/** Enregistre le choix sur cet appareil (un an) et met à jour tout de suite les liens lus par Safari */
function saveAppIcon(icon: AppIcon) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${APP_ICON_COOKIE}=${icon}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  new Function(APPLY_APP_ICON)();
}

/** Choix de l'icône d'écran d'accueil / du Dock, mémorisé sur cet appareil (un an) */
export function AppIconPicker() {
  const [icon, setIcon] = useState<AppIcon | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIphone, setIsIphone] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lecture unique de l'appareil et du cookie */
    setIcon(resolveAppIcon(readCookie(), navigator.userAgent));
    setIsIphone(/iPhone|iPod/.test(navigator.userAgent));
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function choose(next: AppIcon) {
    if (!isAppIcon(next)) return;
    setIcon(next);
    saveAppIcon(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Icône de l'app">
        {(Object.keys(APP_ICONS) as AppIcon[]).map((key) => {
          const selected = icon === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(key)}
              className={cn(
                "flex flex-1 basis-56 items-center gap-3 rounded-[1.25rem] border p-2.5 pr-4 text-left text-sm transition-colors",
                selected ? "border-accent bg-accent-soft text-ink" : "border-edge-soft text-ink-soft hover:bg-accent-faint hover:text-ink",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- petite image statique, déjà à la bonne taille */}
              <img src={APP_ICONS[key].preview} alt="" width={56} height={56} className="size-14 rounded-[22%]" />
              <span className="flex-1 font-medium">{APP_ICONS[key].label}</span>
              {selected && <Check className="size-4 text-accent-strong" aria-hidden />}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-ink-soft">
        Le choix vaut pour cet appareil seulement : chacun peut avoir son icône. Une icône déjà posée ne change pas toute
        seule : supprime-la de l&apos;écran d&apos;accueil (ou du Dock), puis ajoute à nouveau l&apos;app depuis Safari
        {isIphone ? <> (<strong>Partager → Sur l&apos;écran d&apos;accueil</strong>)</> : <> (<strong>Fichier → Ajouter au Dock</strong>)</>}.
      </p>
      {installed && (
        <p className="rounded-2xl bg-accent-faint px-4 py-3 text-sm text-ink">
          Tu es dans l&apos;app installée, qui ne partage pas ses réglages avec Safari. Fais plutôt ce choix en ouvrant{" "}
          <strong>atelier-dates.vercel.app/parametres</strong> dans Safari, juste avant de rajouter l&apos;app.
        </p>
      )}
    </div>
  );
}
