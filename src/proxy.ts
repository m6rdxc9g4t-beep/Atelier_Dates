import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Icônes d'écran d'accueil : F ♥ A sur iPhone, logo de l'app partout ailleurs (Mac, iPad…) */
const APPLE_ICON_PATH = "/apple-touch-icon.png";
const IPHONE_ICON = "/icons/apple-icon-iphone.png";
const MAIN_ICON = "/icons/apple-icon-main.png";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === APPLE_ICON_PATH) {
    const ua = request.headers.get("user-agent") ?? "";
    // iPadOS se présente comme un Mac : seul l'iPhone (et l'iPod) reçoit F ♥ A
    const target = /iPhone|iPod/.test(ua) ? IPHONE_ICON : MAIN_ICON;
    const response = NextResponse.rewrite(new URL(target, request.url));
    response.headers.set("Vary", "User-Agent");
    response.headers.set("Cache-Control", "no-cache");
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/apple-touch-icon.png",
    // Tout le reste sauf les fichiers statiques et les images
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|apple-touch-icon|manifest.webmanifest|icons/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
