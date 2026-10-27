"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { MEMORIES_BUCKET } from "@/lib/env";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { giftSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";

const PAGE = "/cadeaux";

export async function createGift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = giftSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { for_whom, photo_path, ...gift } = parsed.data;

  // La photo a été envoyée par le navigateur : on n'accepte qu'un chemin
  // rangé dans le dossier du couple (RLS Storage + contrainte SQL en renfort).
  const safePath = new RegExp(`^${couple.id}/gifts/[\\w-]+\\.(jpe?g|png|webp|gif|heic|heif)$`, "i");
  if (photo_path && !safePath.test(photo_path)) return failure("La photo n'a pas un emplacement valide.");

  const { error } = await supabase.from("gifts").insert({
    ...gift,
    photo_path,
    couple_id: couple.id,
    created_by: userId,
    wanted_by: for_whom === "me" ? userId : null,
  });
  if (error) {
    if (photo_path) await supabase.storage.from(MEMORIES_BUCKET).remove([photo_path]);
    return fromDbError(error);
  }

  revalidatePath(PAGE);
  return success("Ajouté à la liste de cadeaux.");
}

/** Offert / reçu, ou retour dans la liste */
export async function toggleReceived(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("gift_id"));
  if (!id.success) return failure("Cadeau introuvable.");

  const received = formData.get("received") === "1";
  const { supabase } = await getCoupleContext();
  const { error } = await supabase
    .from("gifts")
    .update({ received_at: received ? new Date().toISOString() : null })
    .eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath(PAGE);
  return success();
}

/** « Je m'en occupe » sur un cadeau de l'autre — invisible pour lui ou elle */
export async function toggleClaim(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("gift_id"));
  if (!id.success) return failure("Cadeau introuvable.");

  const { supabase, userId, couple } = await getCoupleContext();
  if (formData.get("claim") === "1") {
    const { error } = await supabase.from("gift_claims").insert({ gift_id: id.data, couple_id: couple.id });
    if (error) return fromDbError(error);
  } else {
    const { error } = await supabase.from("gift_claims").delete().eq("gift_id", id.data).eq("claimed_by", userId);
    if (error) return fromDbError(error);
  }

  revalidatePath(PAGE);
  return success();
}

export async function deleteGift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("gift_id"));
  if (!id.success) return failure("Cadeau introuvable.");

  const { supabase } = await getCoupleContext();
  const { data: gift } = await supabase.from("gifts").select("photo_path").eq("id", id.data).maybeSingle();
  if (gift?.photo_path) {
    const { error: storageError } = await supabase.storage.from(MEMORIES_BUCKET).remove([gift.photo_path]);
    if (storageError) return failure("La photo n'a pas pu être supprimée. Réessaie.");
  }

  const { error } = await supabase.from("gifts").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath(PAGE);
  return success();
}
