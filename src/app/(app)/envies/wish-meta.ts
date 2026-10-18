import type { WishKind, WishStatus } from "@/lib/supabase/database.types";

export const WISH_KINDS: { value: WishKind; label: string; plural: string }[] = [
  { value: "activity", label: "Activité", plural: "Activités" },
  { value: "weekend", label: "Week-end", plural: "Week-ends" },
  { value: "trip", label: "Voyage", plural: "Voyages" },
  { value: "project", label: "Projet", plural: "Projets" },
];

export const WISH_STATUSES: { value: WishStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "planned", label: "Prévu" },
  { value: "done", label: "Fait" },
];

export const DESIRE_LABELS = ["", "Pourquoi pas", "Ça me tente", "J'aimerais bien", "J'en rêve", "Absolument !"];
