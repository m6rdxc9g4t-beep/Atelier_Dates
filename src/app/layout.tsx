import type { Metadata, Viewport } from "next";
import "@fontsource/young-serif/400.css";
import "@fontsource-variable/figtree";
import "@fontsource/caveat/500.css";
import "@/styles/atelier-brand/atelier-brand.css";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";

export const metadata: Metadata = {
  title: { default: "Notre Petit Monde", template: "%s · Notre Petit Monde" },
  description: "Nos rendez-vous, nos souvenirs, nos projets — rien qu'à nous deux.",
  robots: { index: false, follow: false },
  applicationName: "Notre Petit Monde",
  appleWebApp: { capable: true, title: "Petit Monde", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#06111f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-atelier-app="dates" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
