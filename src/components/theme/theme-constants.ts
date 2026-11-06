/** Ancienne clé de préférence de thème propre à l'app (avant la préférence commune de la suite) : reprise une fois, puis effacée */
export const LEGACY_THEME_KEY = "npm-theme";
export const ACCENT_STORAGE_KEY = "npm-accent";

/** Préférence commune de la suite Atelier (window.atelierTheme, src/styles/atelier-brand/atelier-theme.js) */
export const THEME_MODES = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
] as const;

/** « pivoine » (clé historique, gardée pour les préférences déjà enregistrées) = couleur signature de Dates */
export const ACCENTS = [
  { value: "pivoine", label: "Rouge Atelier", swatch: "var(--atelier-sig-dates)" },
  { value: "lavande", label: "Lavande", swatch: "#7d68c0" },
  { value: "menthe", label: "Menthe", swatch: "#258268" },
  { value: "ciel", label: "Ciel", swatch: "#4176ba" },
] as const;

export type ThemeMode = (typeof THEME_MODES)[number]["value"];
export type Accent = (typeof ACCENTS)[number]["value"];

declare global {
  interface Window {
    atelierTheme?: { get(): ThemeMode; set(pref: ThemeMode): void; resolved(): "light" | "dark" };
  }
}
