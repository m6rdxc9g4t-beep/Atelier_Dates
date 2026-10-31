import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marque commune de la suite Atelier (styles : src/styles/atelier-brand/atelier-brand.css) :
 * tuile néon + « atelier_Dates ». Avec `href`, la marque devient un lien (navigation de l'app) ;
 * sans, elle reste un simple intitulé (page de connexion).
 */
export function AtelierBrand({ className, href }: { className?: string; href?: string }) {
  const content = (
    <>
      <span className="atelier-brand__tile" aria-hidden>
        <Heart />
      </span>
      <span className="atelier-brand__name">
        <span className="atelier-brand__prefix">atelier_</span>Dates
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={cn("atelier-brand text-ink", className)}>
      {content}
    </Link>
  ) : (
    <span className={cn("atelier-brand text-ink", className)}>{content}</span>
  );
}
