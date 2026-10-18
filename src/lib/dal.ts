import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CoupleRow, ProfileRow } from "@/lib/supabase/database.types";

export type Member = Pick<ProfileRow, "id" | "display_name">;

export type CoupleContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  me: ProfileRow;
  partner: ProfileRow | null;
  couple: CoupleRow;
  members: Member[];
};

/** Identifiant de l'utilisateur connecté (JWT vérifié), ou null. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

/**
 * Couche d'accès aux données : renvoie l'utilisateur, son couple et son/sa
 * partenaire. Redirige vers /connexion ou /onboarding si besoin.
 * Mémoïsé pour la durée d'un rendu.
 */
export const getCoupleContext = cache(async (): Promise<CoupleContext> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/connexion");

  const { data: profiles, error } = await supabase.from("profiles").select("*");
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);

  const me = profiles.find((p) => p.id === userId);
  if (!me) redirect("/connexion");
  if (!me.couple_id) redirect("/onboarding");

  const { data: couple } = await supabase.from("couples").select("*").eq("id", me.couple_id).maybeSingle();
  if (!couple) redirect("/onboarding");

  const partner = profiles.find((p) => p.id !== userId && p.couple_id === me.couple_id) ?? null;
  const members = [me, partner]
    .filter((p): p is ProfileRow => p !== null)
    .map(({ id, display_name }) => ({ id, display_name }));

  return { supabase, userId, me, partner, couple, members };
});

/** Prénom affichable d'un membre ("toi" pour l'utilisateur courant si meId est fourni) */
export function nameOf(members: Member[], id: string, meId?: string) {
  if (meId && id === meId) return "toi";
  return members.find((m) => m.id === id)?.display_name || "ton amour";
}

/** Première lettre en majuscule */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
