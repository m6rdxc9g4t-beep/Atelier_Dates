import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { APP_ICON_COOKIE, resolveAppIcon } from "@/lib/app-icon";

/** Icônes d'écran d'accueil : celle choisie sur l'appareil (Paramètres), sinon F ♥ A sur iPhone et cœur néon ailleurs */
const APPLE_ICON_PATH = "/apple-touch-icon.png";
const ICON_FILES = { fa: "/icons/apple-icon-iphone.png", neon: "/icons/apple-icon-neon.png" } as const;
/** Manifeste dont les icônes sont F ♥ A (iOS récent peut s'en servir pour l'écran d'accueil) */
const FA_MANIFEST = "/icons/manifest-iphone.webmanifest";

const chosenIcon = (request: NextRequest) =>
  // iPadOS se présente comme un Mac : sans choix, seul l'iPhone (et l'iPod) reçoit F ♥ A
  resolveAppIcon(request.cookies.get(APP_ICON_COOKIE)?.value, request.headers.get("user-agent") ?? "");

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === APPLE_ICON_PATH) {
    const response = NextResponse.rewrite(new URL(ICON_FILES[chosenIcon(request)], request.url));
    response.headers.set("Vary", "User-Agent, Cookie");
    response.headers.set("Cache-Control", "no-cache");
    return response;
  }
  if (request.nextUrl.pathname === "/manifest.webmanifest") {
    const response =
      chosenIcon(request) === "fa" ? NextResponse.rewrite(new URL(FA_MANIFEST, request.url)) : NextResponse.next();
    response.headers.set("Vary", "User-Agent, Cookie");
    response.headers.set("Cache-Control", "no-cache");
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    // Tout le reste sauf la sonde de santé, les fichiers statiques et les images
    "/((?!api/health|_next/static|_next/image|favicon.ico|icon|apple-icon|apple-touch-icon|manifest.webmanifest|icons/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
