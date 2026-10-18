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
    background_color: "#fdf6f8",
    theme_color: "#fdf6f8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
