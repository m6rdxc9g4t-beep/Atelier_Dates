import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marque commune de la suite Atelier (styles : src/styles/atelier-brand/atelier-brand.css) :
 * icône carrée en dégradé de la signature, cœur Lucide blanc, puis « Atelier Dates ».
 * Avec `href`, la marque devient un lien (navigation de l'app) ; sans, elle reste un simple intitulé (connexion).
 */
export function AtelierBrand({ className, href }: { className?: string; href?: string }) {
  const content = (
    <>
      <span className="atelier-brand__tile" aria-hidden>
        <Heart />
      </span>
      <span className="atelier-brand__name">
        <span className="atelier-brand__prefix">Atelier </span>Dates
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={cn("atelier-brand rounded-md", className)} aria-label="Atelier Dates, accueil">
      {content}
    </Link>
  ) : (
    <span className={cn("atelier-brand", className)}>{content}</span>
  );
}
