"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { APP_ICONS, APP_ICON_COOKIE } from "@/lib/app-icon";

/**
 * Icône d'écran d'accueil choisie sur cet appareil (Paramètres → Icône de l'app) ;
 * sans choix : F ♥ A sur iPhone, icône Atelier ailleurs (Mac, iPad…).
 *
 * Safari lit l'icône dans la page au moment de « Sur l'écran d'accueil » / « Ajouter au Dock » :
 * d'abord <link rel="apple-touch-icon">, puis les icônes du manifeste. On réécrit donc ces deux
 * liens directement dans la page, avec une adresse propre à chaque icône (pour qu'aucun cache
 * ne ressorte l'autre logo).
 */
const links = Object.fromEntries(
  Object.entries(APP_ICONS).map(([key, icon]) => [key, { icon: icon.appleIcon, manifest: icon.manifest }]),
);

export const APPLY_APP_ICON = `(function(){try{
var L=${JSON.stringify(links)};
var m=document.cookie.match(/(?:^|; )${APP_ICON_COOKIE}=(fa|neon)(?:;|$)/);
var c=m?m[1]:(/iPhone|iPod/.test(navigator.userAgent)?"fa":"neon");
var h=document.head;
function fix(rel,href){var ls=document.querySelectorAll('link[rel="'+rel+'"]');
if(!ls.length){var l=document.createElement("link");l.rel=rel;h.appendChild(l);ls=[l]}
for(var i=0;i<ls.length;i++){if(ls[i].getAttribute("href")!==href)ls[i].setAttribute("href",href)}}
fix("manifest",L[c].manifest);
fix("apple-touch-icon",L[c].icon);
}catch(e){}})();`;

/** Avant le premier affichage (chargement complet de la page) */
export function AppIconsScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: APPLY_APP_ICON }}
    />
  );
}

/** Après chaque navigation : Next réécrit les balises de métadonnées, on les corrige à nouveau */
export function AppIcons() {
  const pathname = usePathname();
  useEffect(() => {
    const run = new Function(APPLY_APP_ICON);
    run();
    // Next ajoute ou réécrit des balises <link> après coup (métadonnées en différé, navigation) :
    // on corrige dès qu'elles apparaissent. run() ne modifie rien si tout est déjà bon, donc pas de boucle.
    const observer = new MutationObserver(() => run());
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
