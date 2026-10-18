import { ACCENT_STORAGE_KEY, THEME_STORAGE_KEY } from "./theme-constants";

/**
 * Applique le thème (clair/sombre) et l'accent mémorisés avant le premier
 * affichage, pour éviter un flash. Voir le guide Next.js "preventing flash".
 */
const script = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";
var a=localStorage.getItem("${ACCENT_STORAGE_KEY}");
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;r.classList.toggle("dark",d);
if(a&&a!=="pivoine"){r.dataset.accent=a}else{delete r.dataset.accent}
}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
