"use server";

import { revalidatePath } from "next/cache";
import { getCoupleContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { dateProposalSchema, voteSchema } from "@/lib/validation/schemas";
import { uuid } from "@/lib/validation/common";
import { notify, notifyPartner } from "@/lib/notify";
import { formatDateTime } from "@/lib/format";

function refresh() {
  revalidatePath("/rendez-vous");
  revalidatePath("/accueil");
}

export async function proposeDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dateProposalSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const ctx = await getCoupleContext();
  const { supabase, userId, couple, me } = ctx;
  const { error } = await supabase
    .from("date_proposals")
    .insert({ ...parsed.data, couple_id: couple.id, created_by: userId });
  if (error) return fromDbError(error);

  await notifyPartner(ctx, {
    kind: "date_proposed",
    title: `${me.display_name} te propose un rendez-vous`,
    body: [parsed.data.title, parsed.data.proposed_at && formatDateTime(parsed.data.proposed_at), parsed.data.location]
      .filter(Boolean)
      .join(" — "),
    link: "/rendez-vous",
  });

  refresh();
  return success("Proposition envoyée. Plus qu'à attendre sa réponse !");
}

export async function voteOnDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = voteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return failure("Vote invalide.");

  const ctx = await getCoupleContext();
  const { supabase, userId, couple, me } = ctx;
  const { proposal_id, vote } = parsed.data;
  const [{ data: before }, { data: previous }] = await Promise.all([
    supabase.from("date_proposals").select("title, created_by").eq("id", proposal_id).maybeSingle(),
    supabase.from("date_votes").select("vote").eq("proposal_id", proposal_id).eq("user_id", userId).maybeSingle(),
  ]);

  const { error } = await supabase
    .from("date_votes")
    .upsert({ proposal_id, couple_id: couple.id, user_id: userId, vote }, { onConflict: "proposal_id,user_id" });
  if (error) return fromDbError(error);

  // On prévient la personne qui a proposé, seulement si la réponse change
  if (before && before.created_by !== userId && previous?.vote !== vote) {
    const { data: updated } = await supabase.from("date_proposals").select("status").eq("id", proposal_id).maybeSingle();
    const quoted = `« ${before.title} »`;
    await notify(ctx, {
      recipientId: before.created_by,
      ...(updated?.status === "accepted"
        ? { kind: "date_accepted" as const, title: `${me.display_name} a dit oui ❤️`, body: `${quoted} est validé !` }
        : vote === "no"
          ? { kind: "date_answered" as const, title: `${me.display_name} préfère passer son tour`, body: quoted }
          : vote === "maybe"
            ? { kind: "date_answered" as const, title: `${me.display_name} hésite encore`, body: quoted }
            : { kind: "date_answered" as const, title: `${me.display_name} a dit oui`, body: quoted }),
      link: "/rendez-vous",
    });
  }

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
