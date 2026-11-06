"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AtelierBrand } from "@/components/atelier-brand";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Le chemin courant n'est connu qu'à l'exécution : chaque navigation est rendue
 * une première fois sans onglet actif (coquille statique), puis complétée.
 */
function withPathname(View: (props: { pathname: string }) => React.ReactNode) {
  function Live() {
    return <View pathname={usePathname()} />;
  }
  return function Nav() {
    return (
      <Suspense fallback={<View pathname="" />}>
        <Live />
      </Suspense>
    );
  };
}

/** Navigation latérale (écrans larges) : entrée courante sur fond neutre, jamais d'accent */
export const SideNav = withPathname(function SideNavView({ pathname }) {
  return (
    <nav aria-label="Navigation principale" className="mt-2 flex flex-1 flex-col gap-px">
      {NAV_ITEMS.map((item) => (
        <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
      <div className="mt-auto pt-2">
        <SideLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} />
      </div>
    </nav>
  );
});

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[30px] items-center gap-2.5 rounded-md px-2 font-medium transition-colors duration-150",
        active ? "atelier-nav-active" : "text-ink-2 hover:bg-sunken hover:text-ink",
      )}
    >
      <Icon className={cn("size-4", active ? "text-ink" : "text-faint")} aria-hidden strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

/** Titre de la vue courante (barre haute) */
function currentItem(pathname: string) {
  return [...NAV_ITEMS, SETTINGS_ITEM].find((item) => isActive(pathname, item.href));
}

/**
 * Barre haute de 44 px, collante et translucide.
 * Ordinateur : titre de la vue. Téléphone : la marque, et l'accès aux paramètres.
 */
export const TopBar = withPathname(function TopBarView({ pathname }) {
  const item = currentItem(pathname);
  const settingsActive = isActive(pathname, SETTINGS_ITEM.href);
  const SettingsIcon = SETTINGS_ITEM.icon;
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150">
      <div className="flex h-[var(--top-h)] items-center gap-3 px-4 lg:px-5">
        {/* .atelier-brand pose son propre display : on masque un conteneur */}
        <span className="flex lg:hidden">
          <AtelierBrand href="/accueil" />
        </span>
        <p className="hidden items-center gap-2 font-semibold text-ink lg:flex">
          {item && <item.icon className="size-4 text-faint" aria-hidden strokeWidth={1.75} />}
          {item?.label}
        </p>
        <Link
          href={SETTINGS_ITEM.href}
          aria-label={SETTINGS_ITEM.label}
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "-mr-1.5 ml-auto grid size-9 place-items-center rounded-md transition-colors lg:hidden",
            settingsActive ? "bg-selected text-ink" : "text-muted hover:bg-sunken hover:text-ink",
          )}
        >
          <SettingsIcon className="size-5" aria-hidden strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
});

/** Barre d'onglets du bas (téléphone) : neutre, l'onglet courant passe en encre sur une pastille */
export const BottomNav = withPathname(function BottomNavView({ pathname }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-sidebar/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-7">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-1.5 pb-2 text-[10.5px] leading-none font-medium",
                  active ? "text-ink" : "text-faint",
                )}
              >
                <span className={cn("grid h-7 w-11 place-items-center rounded-md transition-colors", active && "bg-selected")}>
                  <Icon className="size-5" aria-hidden strokeWidth={active ? 2 : 1.75} />
                </span>
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
