import { Suspense } from "react";
import { AtelierBrand } from "@/components/atelier-brand";
import { BottomNav, MobileSettingsLink, SideNav } from "@/components/nav/app-nav";
import { CoupleBadge } from "@/components/nav/couple-badge";

/**
 * Coquille de l'application : la navigation est statique (pré-rendue), seul le
 * badge du couple dépend de la session et arrive en streaming.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 px-5 py-8 lg:flex lg:border-r lg:border-edge lg:bg-sidebar">
        <AtelierBrand href="/accueil" className="px-4" />
        <Suspense fallback={<div className="h-14" />}>
          <CoupleBadge />
        </Suspense>
        <SideNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:hidden">
          <AtelierBrand href="/accueil" />
          <MobileSettingsLink />
        </header>
        <main className="w-full max-w-3xl flex-1 px-5 pt-6 pb-28 sm:px-8 lg:pt-12 lg:pb-16">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
