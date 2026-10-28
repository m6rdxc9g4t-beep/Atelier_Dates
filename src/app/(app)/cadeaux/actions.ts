"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { MEMORIES_BUCKET } from "@/lib/env";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { giftSchema, giftUpdateSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";

const PAGE = "/cadeaux";

/**
 * La photo a été envoyée par le navigateur : on n'accepte qu'un chemin
 * rangé dans le dossier du couple (RLS Storage + contrainte SQL en renfort).
 */
function isSafePhotoPath(path: string, coupleId: string) {
  return new RegExp(`^${coupleId}/gifts/[\\w-]+\\.(jpe?g|png|webp|gif|heic|heif)$`, "i").test(path);
}

export async function createGift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = giftSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { for_whom, photo_path, ...gift } = parsed.data;
  if (photo_path && !isSafePhotoPath(photo_path, couple.id)) return failure("La photo n'a pas un emplacement valide.");

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

/** Modifie un cadeau : nom, lien, prix, précisions, et photo gardée, remplacée ou retirée */
export async function updateGift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = giftUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, couple } = await getCoupleContext();
  const { gift_id, photo_path: newPhoto, remove_photo, ...fields } = parsed.data;
  const discardUpload = async () => {
    if (newPhoto) await supabase.storage.from(MEMORIES_BUCKET).remove([newPhoto]);
  };
  if (newPhoto && !isSafePhotoPath(newPhoto, couple.id)) return failure("La photo n'a pas un emplacement valide.");

  const { data: current } = await supabase.from("gifts").select("photo_path").eq("id", gift_id).maybeSingle();
  if (!current) {
    await discardUpload();
    return failure("Ce cadeau n'existe plus.");
  }

  const photo_path = newPhoto ?? (remove_photo ? null : current.photo_path);
  const { error } = await supabase.from("gifts").update({ ...fields, photo_path }).eq("id", gift_id);
  if (error) {
    await discardUpload();
    return fromDbError(error);
  }

  // L'ancienne photo n'est plus utilisée : on la retire du stockage (sans bloquer si ça échoue)
  if (current.photo_path && current.photo_path !== photo_path) {
    await supabase.storage.from(MEMORIES_BUCKET).remove([current.photo_path]);
  }

  revalidatePath(PAGE);
  return success("Modifications enregistrées.");
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
