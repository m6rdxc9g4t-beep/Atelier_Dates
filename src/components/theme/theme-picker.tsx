"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, ACCENT_STORAGE_KEY, THEME_MODES, THEME_STORAGE_KEY, type Accent, type ThemeMode } from "./theme-constants";

function apply(mode: ThemeMode, accent: Accent) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  if (accent === "pivoine") delete root.dataset.accent;
  else root.dataset.accent = accent;
}

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Choix du mode clair/sombre et de la couleur d'accent (mémorisés sur cet appareil) */
export function ThemePicker() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<Accent>("pivoine");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique des préférences locales
    setMode(read(THEME_STORAGE_KEY, "system"));
    setAccent(read(ACCENT_STORAGE_KEY, "pivoine"));
  }, []);

  function choose(nextMode: ThemeMode, nextAccent: Accent) {
    setMode(nextMode);
    setAccent(nextAccent);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      localStorage.setItem(ACCENT_STORAGE_KEY, nextAccent);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
    apply(nextMode, nextAccent);
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Apparence</legend>
        <div className="inline-flex rounded-full bg-sunken p-1">
          {THEME_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mode === m.value}
              onClick={() => choose(m.value, accent)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                mode === m.value ? "bg-surface font-medium text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Couleur</legend>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-pressed={accent === a.value}
              onClick={() => choose(mode, a.value)}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-colors",
                accent === a.value ? "border-ink text-ink" : "border-line text-ink-soft hover:text-ink",
              )}
            >
              <span className="size-6 rounded-full" style={{ background: a.swatch }} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
