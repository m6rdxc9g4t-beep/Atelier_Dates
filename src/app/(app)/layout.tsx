import { Suspense } from "react";
import { AtelierBrand } from "@/components/atelier-brand";
import { BottomNav, SideNav, TopBar } from "@/components/nav/app-nav";
import { CoupleBadge } from "@/components/nav/couple-badge";

/**
 * Coquille de l'application (forme du portail Atelier) : barre latérale neutre de 232 px avec la marque,
 * barre haute de 44 px avec le titre de la vue, contenu centré. Sur téléphone : barre haute avec la marque
 * et barre d'onglets en bas. La navigation est statique (pré-rendue), seul le badge du couple dépend de
 * la session et arrive en streaming.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--side-w)_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--sidebar)_calc(var(--side-w)-1px),var(--line)_0_var(--side-w),transparent_0)]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-sidebar px-2 pt-2 pb-2 lg:flex">
        <div className="flex h-9 items-center px-2">
          <AtelierBrand href="/accueil" />
        </div>
        <Suspense fallback={<div className="h-11" />}>
          <CoupleBadge />
        </Suspense>
        <SideNav />
      </aside>

      <div className="flex min-w-0 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
