"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCoupleContext } from "@/lib/dal";
import { computeBalance } from "@/lib/balances";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { expenseSchema, potSchema, settleSchema } from "@/lib/validation/schemas";
import { todayInTimezone } from "@/lib/format";
import { uuid } from "@/lib/validation/common";

export async function createPot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = potSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { data, error } = await supabase
    .from("pots")
    .insert({ ...parsed.data, couple_id: couple.id, created_by: userId })
    .select("id")
    .single();
  if (error) return fromDbError(error);

  revalidatePath("/cagnottes");
  redirect(`/cagnottes/${data.id}`);
}

export async function deletePot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("pot_id"));
  if (!id.success) return failure("Cagnotte introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("pots").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath("/cagnottes");
  redirect("/cagnottes");
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = expenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple, members } = await getCoupleContext();
  if (!members.some((m) => m.id === parsed.data.paid_by)) {
    return { status: "error", fieldErrors: { paid_by: ["Choisis l'un de vous deux."] } };
  }

  const { error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, couple_id: couple.id, created_by: userId });
  if (error) return fromDbError(error);

  revalidatePath(`/cagnottes/${parsed.data.pot_id}`);
  revalidatePath("/cagnottes");
  return success("Dépense ajoutée.");
}

export async function deleteExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("expense_id"));
  const potId = uuid.safeParse(formData.get("pot_id"));
  if (!id.success || !potId.success) return failure("Dépense introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.from("expenses").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  revalidatePath(`/cagnottes/${potId.data}`);
  revalidatePath("/cagnottes");
  return success();
}

/** Enregistre le remboursement qui remet les compteurs à zéro */
export async function settleUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = settleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return failure("Cagnotte introuvable.");

  const { supabase, userId, couple, members } = await getCoupleContext();
  if (members.length < 2) return failure("Il faut être deux pour se rembourser !");

  const { data: expenses, error: readError } = await supabase
    .from("expenses")
    .select("amount, paid_by, payer_share, is_settlement")
    .eq("pot_id", parsed.data.pot_id);
  if (readError) return fromDbError(readError);

  const { debt } = computeBalance(expenses, [members[0].id, members[1].id]);
  if (!debt) return success("Vous êtes déjà quittes.");

  const { error } = await supabase.from("expenses").insert({
    pot_id: parsed.data.pot_id,
    couple_id: couple.id,
    created_by: userId,
    paid_by: debt.from,
    title: "Remboursement",
    amount: debt.amount,
    payer_share: 0,
    is_settlement: true,
    spent_on: todayInTimezone(),
  });
  if (error) return fromDbError(error);

  revalidatePath(`/cagnottes/${parsed.data.pot_id}`);
  revalidatePath("/cagnottes");
  return success("Remboursement enregistré, vous êtes quittes.");
}
