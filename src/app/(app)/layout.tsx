import Link from "next/link";
import { Heart } from "lucide-react";
import { Suspense } from "react";
import { BottomNav, MobileSettingsLink, SideNav } from "@/components/nav/app-nav";
import { CoupleBadge } from "@/components/nav/couple-badge";
import { cn } from "@/lib/utils";

/**
 * Coquille de l'application : la navigation est statique (pré-rendue), seul le
 * badge du couple dépend de la session et arrive en streaming.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 px-5 py-8 lg:flex lg:border-r lg:border-edge lg:bg-sidebar">
        <AtelierBrand className="px-4" />
        <Suspense fallback={<div className="h-14" />}>
          <CoupleBadge />
        </Suspense>
        <SideNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:hidden">
          <AtelierBrand />
          <MobileSettingsLink />
        </header>
        <main className="w-full max-w-3xl flex-1 px-5 pt-6 pb-28 sm:px-8 lg:pt-12 lg:pb-16">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

/** Marque commune de la suite Atelier (styles : src/styles/atelier-brand/atelier-brand.css), lien vers l'accueil */
function AtelierBrand({ className }: { className?: string }) {
  return (
    <Link href="/accueil" className={cn("atelier-brand text-ink", className)}>
      <span className="atelier-brand__tile" aria-hidden>
        <Heart />
      </span>
      <span className="atelier-brand__name">
        <span className="atelier-brand__prefix">atelier_</span>Dates
      </span>
    </Link>
  );
}
