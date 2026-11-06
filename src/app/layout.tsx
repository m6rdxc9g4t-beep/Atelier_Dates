import type { Metadata, Viewport } from "next";
import "@/styles/atelier-brand/atelier-brand.css";
import "./globals.css";
import { Suspense } from "react";
import { ThemeScript } from "@/components/theme/theme-script";
import { AppIcons, AppIconsScript } from "@/components/theme/app-icons";

export const metadata: Metadata = {
  title: { default: "Notre Petit Monde", template: "%s · Notre Petit Monde" },
  description: "Nos rendez-vous, nos souvenirs, nos projets — rien qu'à nous deux.",
  robots: { index: false, follow: false },
  applicationName: "Notre Petit Monde",
  appleWebApp: { capable: true, title: "Petit Monde", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Icône d'écran d'accueil : une seule adresse, servie par le proxy selon le choix fait sur l'appareil
  // (src/lib/app-icon.ts) ; le script AppIconsScript la remplace dans la page par l'adresse propre à l'icône.
  icons: { apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf2f3" },
    { media: "(prefers-color-scheme: dark)", color: "#110b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-atelier-app="dates" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
        <AppIconsScript />
      </head>
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <AppIcons />
        </Suspense>
      </body>
    </html>
  );
}
