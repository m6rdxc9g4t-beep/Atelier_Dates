import type { MetadataRoute } from "next";

/** Rend l'app installable : Dock du Mac (Safari) et écran d'accueil de l'iPhone */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Notre Petit Monde",
    short_name: "Petit Monde",
    description: "Nos rendez-vous, nos souvenirs, nos projets — rien qu'à nous deux.",
    lang: "fr",
    start_url: "/accueil",
    scope: "/",
    display: "standalone",
    background_color: "#faf1f3",
    theme_color: "#faf1f3",
    icons: [
      // cœur néon ; la variante F ♥ A est dans public/icons/manifest-iphone.webmanifest (voir src/lib/app-icon.ts)
      { src: "/icons/neon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/neon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/neon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
