import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Icône d'écran d'accueil propre à l'iPhone (le Mac garde le logo principal) */
const IPHONE_ICON = "/icons/apple-icon-iphone.png";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/apple-icon.png") {
    const ua = request.headers.get("user-agent") ?? "";
    // iPadOS se présente comme un Mac : seul l'iPhone (et l'iPod) reçoit l'autre icône
    const response = /iPhone|iPod/.test(ua)
      ? NextResponse.rewrite(new URL(IPHONE_ICON, request.url))
      : NextResponse.next();
    response.headers.set("Vary", "User-Agent");
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/apple-icon.png",
    // Tout le reste sauf les fichiers statiques et les images
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
