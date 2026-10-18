"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { dateProposalSchema, voteSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";

function refresh() {
  revalidatePath("/rendez-vous");
  revalidatePath("/accueil");
}

export async function proposeDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dateProposalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId, couple } = await getCoupleContext();
  const { error } = await supabase
    .from("date_proposals")
    .insert({ ...parsed.data, couple_id: couple.id, created_by: userId });
  if (error) return fromDbError(error);

  refresh();
  return success("Proposition envoyée. Plus qu'à attendre sa réponse !");
}

export async function voteOnDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = voteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return failure("Vote invalide.");

  const { supabase, userId, couple } = await getCoupleContext();
  const { error } = await supabase
    .from("date_votes")
    .upsert(
      { proposal_id: parsed.data.proposal_id, couple_id: couple.id, user_id: userId, vote: parsed.data.vote },
      { onConflict: "proposal_id,user_id" },
    );
  if (error) return fromDbError(error);

  refresh();
  return success();
}

export async function completeDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("proposal_id"));
  if (!id.success) return failure("Rendez-vous introuvable.");

  const { supabase } = await getCoupleContext();
  const { error } = await supabase.rpc("complete_date", { p_proposal: id.data });
  if (error) return fromDbError(error);

  refresh();
  return success();
}

export async function deleteDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("proposal_id"));
  if (!id.success) return failure("Rendez-vous introuvable.");

  const { supabase } = await getCoupleContext();
  // RLS : seule la personne qui a proposé peut supprimer
  const { data, error } = await supabase.from("date_proposals").delete().eq("id", id.data).select("id");
  if (error) return fromDbError(error);
  if (!data.length) return failure("Seule la personne qui a proposé ce rendez-vous peut le supprimer.");

  refresh();
  return success();
}
