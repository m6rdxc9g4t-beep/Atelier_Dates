"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { hintSchema, surpriseSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";
import { notifyPartner } from "@/lib/notify";
import { formatDateTime } from "@/lib/format";

export async function createSurprise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = surpriseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (new Date(parsed.data.reveal_at) <= new Date()) {
    return { status: "error", fieldErrors: { reveal_at: ["Choisis une date dans le futur."] } };
  }

  const ctx = await getCoupleContext();
  const { supabase, userId, couple, partner, me } = ctx;
  if (!partner) return failure("Ton amour doit d'abord rejoindre votre espace.");

  const { teaser, reveal_at, title, message } = parsed.data;
  const { data: surprise, error } = await supabase
    .from("surprises")
    .insert({ couple_id: couple.id, created_by: userId, recipient_id: partner.id, teaser, reveal_at })
    .select("id")
    .single();
  if (error) return fromDbError(error);

  const { error: secretError } = await supabase
    .from("surprise_secrets")
    .insert({ surprise_id: surprise.id, couple_id: couple.id, title, message });
  if (secretError) {
    // pas de surprise sans contenu : on annule
    await supabase.from("surprises").delete().eq("id", surprise.id);
    return fromDbError(secretError);
  }

  await notifyPartner(ctx, {
    kind: "surprise",
    title: `${me.display_name} te prépare une surprise 🎁`,
    body: `${teaser} — révélation le ${formatDateTime(reveal_at)}`,
    link: "/surprises",
  });

  revalidatePath("/surprises");
  revalidatePath("/accueil");
  return success("Surprise programmée. Motus !");
}

export async function addHint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = hintSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, couple } = await getCoupleContext();
  const { error } = await supabase.from("surprise_hints").insert({ ...parsed.data, couple_id: couple.id });
  if (error) return fromDbError(error);

  revalidatePath("/surprises");
  return success("Indice programmé.");
}

export async function deleteHint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("hint_id"));
  if (!id.success) return failure("Indice introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("surprise_hints").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath("/surprises");
  return success();
}

export async function deleteSurprise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("surprise_id"));
  if (!id.success) return failure("Surprise introuvable.");

  const { supabase } = await getCoupleContext();
  const { data, error } = await supabase.from("surprises").delete().eq("id", id.data).select("id");
  if (error) return fromDbError(error);
  if (!data.length) return failure("Seule la personne qui a préparé la surprise peut la supprimer.");

  revalidatePath("/surprises");
  revalidatePath("/accueil");
  return success();
}
