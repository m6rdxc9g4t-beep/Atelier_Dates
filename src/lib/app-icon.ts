/**
 * Icône de l'app (écran d'accueil de l'iPhone, Dock du Mac), choisie sur chaque appareil.
 *
 * Le choix est gardé dans un cookie, lu à la fois par le proxy (/apple-touch-icon.png,
 * /manifest.webmanifest) et par le script de la page (src/components/theme/app-icons.tsx).
 * Sans choix : F ♥ A sur iPhone (comme avant), icône Atelier (cœur blanc sur carré rouge) partout ailleurs.
 * La clé « neon » (cookie) date de l'ancienne icône néon : gardée pour les choix déjà enregistrés.
 */
export const APP_ICON_COOKIE = "app_icon";

export const APP_ICONS = {
  fa: {
    label: "F ♥ A",
    preview: "/icons/apple-icon-iphone.png",
    // adresses jamais vues par l'iPhone avant le choix : aucun cache ne ressort l'ancien logo
    appleIcon: "/icons/apple-icon-iphone.png?v=3",
    manifest: "/icons/manifest-iphone.webmanifest?v=3",
  },
  neon: {
    label: "Icône Atelier",
    preview: "/icons/apple-icon-neon.png",
    appleIcon: "/icons/apple-icon-neon.png?v=2",
    manifest: "/manifest.webmanifest?v=5",
  },
} as const;

export type AppIcon = keyof typeof APP_ICONS;

export const isAppIcon = (value: unknown): value is AppIcon => value === "fa" || value === "neon";

export const isIphoneUserAgent = (ua: string) => /iPhone|iPod/.test(ua);

/** Icône retenue : le choix enregistré, sinon F ♥ A sur iPhone et icône Atelier ailleurs (iPad, Mac…) */
export function resolveAppIcon(cookieValue: string | undefined, userAgent: string): AppIcon {
  if (isAppIcon(cookieValue)) return cookieValue;
  return isIphoneUserAgent(userAgent) ? "fa" : "neon";
}
