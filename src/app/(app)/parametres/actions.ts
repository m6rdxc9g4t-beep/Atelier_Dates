"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { coupleSettingsSchema, profileSettingsSchema } from "@/lib/validation/schemas";

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
