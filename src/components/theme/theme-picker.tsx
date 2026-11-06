"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENTS, ACCENT_STORAGE_KEY, THEME_MODES, type Accent, type ThemeMode } from "./theme-constants";

const MODE_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  if (accent === "pivoine") delete root.dataset.accent;
  else root.dataset.accent = accent;
}

function readAccent(): Accent {
  try {
    return (localStorage.getItem(ACCENT_STORAGE_KEY) as Accent) ?? "pivoine";
  } catch {
    return "pivoine";
  }
}

/**
 * Apparence (Système / Clair / Sombre) : préférence commune à la suite Atelier (window.atelierTheme),
 * et couleur d'accent propre à Dates, mémorisée sur cet appareil.
 */
export function ThemePicker() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<Accent>("pivoine");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lecture unique des préférences de l'appareil */
    setMode(window.atelierTheme?.get() ?? "system");
    setAccent(readAccent());
    /* eslint-enable react-hooks/set-state-in-effect */
    // Le thème a pu changer ailleurs (autre onglet, autre app de la suite)
    const follow = (event: Event) => setMode((event as CustomEvent<ThemeMode>).detail);
    window.addEventListener("atelier-theme", follow);
    return () => window.removeEventListener("atelier-theme", follow);
  }, []);

  function chooseMode(next: ThemeMode) {
    setMode(next);
    window.atelierTheme?.set(next);
  }

  function chooseAccent(next: Accent) {
    setAccent(next);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
    applyAccent(next);
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-ui font-medium text-ink-2">Apparence</legend>
        <div className="seg">
          {THEME_MODES.map((m) => {
            const Icon = MODE_ICONS[m.value];
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={mode === m.value}
                onClick={() => chooseMode(m.value)}
                className="seg-item min-h-9 px-3.5 lg:min-h-7 lg:px-2.5"
              >
                <Icon className="size-3.5" aria-hidden strokeWidth={1.75} />
                {m.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-ui font-medium text-ink-2">Couleur</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => {
            const selected = accent === a.value;
            return (
              <button
                key={a.value}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseAccent(a.value)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md border pr-3 pl-2.5 font-medium transition-colors lg:h-8",
                  selected ? "border-edge-soft bg-selected text-ink" : "border-edge bg-surface text-ink-2 hover:bg-sunken hover:text-ink",
                )}
              >
                <span className="grid size-4 place-items-center rounded-full text-white" style={{ background: a.swatch }} aria-hidden>
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
