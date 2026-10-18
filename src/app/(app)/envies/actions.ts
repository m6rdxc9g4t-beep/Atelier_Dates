"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCoupleContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { desireSchema, wishSchema, wishStatusSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";

export async function createWish(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = wishSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { data, error } = await supabase
    .from("wishes")
    .insert({ ...parsed.data, couple_id: couple.id, created_by: userId })
    .select("id")
    .single();
  if (error) return fromDbError(error);

  const level = Number(formData.get("level"));
  if (level >= 1 && level <= 5) {
    await supabase.from("wish_desires").insert({ wish_id: data.id, couple_id: couple.id, user_id: userId, level });
  }

  revalidatePath("/envies");
  return success("Ajouté à vos envies.");
}

export async function setDesire(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = desireSchema.safeParse(formToObject(formData));
  if (!parsed.success) return failure("Niveau d'envie invalide.");

  const { supabase, userId, couple } = await getCoupleContext();
  const { error } = await supabase.from("wish_desires").upsert(
    {
      wish_id: parsed.data.wish_id,
      couple_id: couple.id,
      user_id: userId,
      level: parsed.data.level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wish_id,user_id" },
  );
  if (error) return fromDbError(error);

  revalidatePath("/envies");
  return success();
}

export async function setWishStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = wishStatusSchema.safeParse(formToObject(formData));
  if (!parsed.success) return failure("Statut invalide.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("wishes").update({ status: parsed.data.status }).eq("id", parsed.data.wish_id);
  if (error) return fromDbError(error);

  revalidatePath("/envies");
  return success();
}

export async function deleteWish(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("wish_id"));
  if (!id.success) return failure("Envie introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("wishes").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath("/envies");
  return success();
}

/** Transforme une envie en proposition de rendez-vous */
export async function proposeFromWish(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("wish_id"));
  if (!id.success) return failure("Envie introuvable.");

  const { supabase, userId, couple } = await getCoupleContext();
  const { data: wish } = await supabase.from("wishes").select("*").eq("id", id.data).maybeSingle();
  if (!wish) return failure("Envie introuvable.");

  const { error } = await supabase.from("date_proposals").insert({
    couple_id: couple.id,
    created_by: userId,
    title: wish.title,
    description: wish.description,
    budget: wish.estimated_budget,
  });
  if (error) return fromDbError(error);

  await supabase.from("wishes").update({ status: "planned" }).eq("id", wish.id);
  revalidatePath("/envies");
  revalidatePath("/rendez-vous");
  redirect("/rendez-vous");
}
