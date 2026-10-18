export const THEME_STORAGE_KEY = "npm-theme";
export const ACCENT_STORAGE_KEY = "npm-accent";

export const THEME_MODES = [
  { value: "system", label: "Comme l'appareil" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
] as const;

export const ACCENTS = [
  { value: "pivoine", label: "Pivoine", swatch: "#d1567f" },
  { value: "lavande", label: "Lavande", swatch: "#7d68c0" },
  { value: "menthe", label: "Menthe", swatch: "#3b9479" },
  { value: "ciel", label: "Ciel", swatch: "#4a7fc4" },
] as const;

export type ThemeMode = (typeof THEME_MODES)[number]["value"];
export type Accent = (typeof ACCENTS)[number]["value"];
