"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formToObject, fromDbError, fromZodError, type ActionState } from "@/lib/actions";
import { createCoupleSchema, joinCoupleSchema, profileSettingsSchema } from "@/lib/validation/schemas";

const nameSchema = profileSettingsSchema.pick({ display_name: true });

async function saveDisplayName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, name: string) {
  return supabase.from("profiles").update({ display_name: name }).eq("id", userId);
}

export async function createCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createCoupleSchema.extend(nameSchema.shape).safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/connexion");

  const named = await saveDisplayName(supabase, auth.claims.sub, parsed.data.display_name);
  if (named.error) return fromDbError(named.error);

  const { error } = await supabase.rpc("create_couple", {
    p_name: parsed.data.name,
    p_started_on: parsed.data.started_on,
  });
  if (error) return fromDbError(error);

  redirect("/accueil");
}

export async function joinCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = joinCoupleSchema.extend(nameSchema.shape).safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/connexion");

  const named = await saveDisplayName(supabase, auth.claims.sub, parsed.data.display_name);
  if (named.error) return fromDbError(named.error);

  const { error } = await supabase.rpc("join_couple", { p_code: parsed.data.code });
  if (error) return fromDbError(error, "Impossible de rejoindre ce couple.");

  redirect("/accueil");
}

