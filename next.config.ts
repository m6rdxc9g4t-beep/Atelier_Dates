import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // Préférence de thème commune de la suite : posée en ligne dans <head> (src/components/theme/theme-script.tsx)
      "atelier-theme.js": { type: "text" },
    },
  },
  async headers() {
    return [
      {
        // Le service worker doit toujours être relu, jamais servi depuis un cache
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "/accueil", permanent: false }];
  },
};

export default nextConfig;
