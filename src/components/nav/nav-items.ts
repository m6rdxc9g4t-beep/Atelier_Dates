import { CalendarHeart, Gift, House, Images, Settings, Sparkles, WalletCards, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/accueil", label: "Accueil", short: "Accueil", icon: House },
  { href: "/rendez-vous", label: "Rendez-vous", short: "Rdv", icon: CalendarHeart },
  { href: "/cagnottes", label: "Cagnottes", short: "Cagnottes", icon: WalletCards },
  { href: "/souvenirs", label: "Souvenirs", short: "Souvenirs", icon: Images },
  { href: "/envies", label: "Envies & scénarios", short: "Envies", icon: Sparkles },
  { href: "/surprises", label: "Surprises", short: "Surprises", icon: Gift },
];

export const SETTINGS_ITEM: NavItem = { href: "/parametres", label: "Paramètres", short: "Réglages", icon: Settings };
