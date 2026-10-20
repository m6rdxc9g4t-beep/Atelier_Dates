"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { coupleSettingsSchema, passwordChangeSchema, profileSettingsSchema } from "@/lib/validation/schemas";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.notify_sms && !parsed.data.phone) {
    return { status: "error", fieldErrors: { phone: ["Indique un numéro pour recevoir des SMS."] } };
  }

  const { supabase, userId } = await getCoupleContext();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return fromDbError(error);

  revalidatePath("/", "layout");
  return success("Profil enregistré.");
}

export async function updateCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = coupleSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, couple } = await getCoupleContext();
  const { error } = await supabase.from("couples").update(parsed.data).eq("id", couple.id);
  if (error) return fromDbError(error);

  revalidatePath("/", "layout");
  return success("Votre petit monde est à jour.");
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordChangeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[auth] updateUser", error.code ?? error.status, error.message);
    if (error.code === "same_password") return failure("C'est déjà ton mot de passe actuel.");
    if (error.code === "weak_password") return failure("Mot de passe trop faible : mélange lettres, chiffres et symboles.");
    if (error.code === "reauthentication_needed") return failure("Pour des raisons de sécurité, reconnecte-toi puis réessaie.");
    return failure("Le mot de passe n'a pas pu être changé. Réessaie dans un instant.");
  }
  return success("Mot de passe changé.");
}
