import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
/** md : bouton courant · sm : bouton compact (cartes, listes) · icon : bouton carré à icône seule ·
 *  field : bouton carré à icône seule, à la hauteur d'un champ voisin · row : bouton à la hauteur des champs d'une même ligne */
export type ButtonSize = "sm" | "md" | "icon" | "field" | "row";

/**
 * Boutons de la suite Atelier : coins de 7 px, plats. 40 px de haut sur téléphone (cible tactile),
 * 30 px sur ordinateur. Un seul bouton principal (plein, dans la signature) par écran.
 */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap leading-none",
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" && "h-10 px-4 text-ui lg:h-[30px] lg:px-3",
    size === "sm" && "h-9 px-3 text-ui lg:h-7 lg:px-2.5 lg:text-small",
    size === "icon" && "size-9 text-ui lg:size-7",
    size === "field" && "size-10 text-ui lg:size-9",
    size === "row" && "h-10 px-4 text-ui lg:h-9 lg:px-3",
    variant === "primary" && "atelier-btn-primary",
    variant === "soft" && "border-edge-soft bg-surface text-ink hover:bg-sunken active:bg-selected",
    variant === "ghost" && "border-transparent text-muted hover:bg-sunken hover:text-ink active:bg-selected",
    variant === "danger" && "border-transparent text-bad hover:bg-bad-soft",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
