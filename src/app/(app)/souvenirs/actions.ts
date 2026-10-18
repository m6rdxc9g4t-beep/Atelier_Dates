"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { MEMORIES_BUCKET } from "@/lib/env";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { memorySchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";

export async function createMemory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = memorySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { new_album, photo_paths, ...memory } = parsed.data;

  // Les photos ont été envoyées par le navigateur : on n'accepte que des
  // chemins rangés dans le dossier du couple (RLS Storage + contrainte SQL en renfort).
  const safePath = new RegExp(`^${couple.id}/[\\w-]+\\.(jpe?g|png|webp|gif|heic|heif)$`, "i");
  if (photo_paths.some((p) => !safePath.test(p))) return failure("Une des photos n'a pas un emplacement valide.");

  let albumId = memory.album_id;
  if (new_album) {
    const { data: album, error } = await supabase
      .from("albums")
      .insert({ couple_id: couple.id, name: new_album })
      .select("id")
      .single();
    if (error) return fromDbError(error);
    albumId = album.id;
  }

  const { data: created, error } = await supabase
    .from("memories")
    .insert({ ...memory, album_id: albumId, couple_id: couple.id, created_by: userId })
    .select("id")
    .single();
  if (error) return fromDbError(error);

  if (photo_paths.length) {
    const { error: photoError } = await supabase.from("memory_photos").insert(
      photo_paths.map((storage_path, position) => ({ memory_id: created.id, couple_id: couple.id, storage_path, position })),
    );
    if (photoError) return fromDbError(photoError, "Le souvenir est enregistré, mais pas ses photos.");
  }

  revalidatePath("/souvenirs");
  revalidatePath("/accueil");
  return success("Souvenir ajouté à votre album.");
}

export async function deleteMemory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("memory_id"));
  if (!id.success) return failure("Souvenir introuvable.");

  const { supabase } = await getCoupleContext();
  const { data: photos } = await supabase.from("memory_photos").select("storage_path").eq("memory_id", id.data);

  if (photos?.length) {
    const { error: storageError } = await supabase.storage.from(MEMORIES_BUCKET).remove(photos.map((p) => p.storage_path));
    if (storageError) return failure("Les photos n'ont pas pu être supprimées. Réessaie.");
  }

  const { error } = await supabase.from("memories").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath("/souvenirs");
  revalidatePath("/accueil");
  return success();
}
