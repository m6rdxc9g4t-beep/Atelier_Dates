import { describe, expect, it } from "vitest";
import { dateProposalSchema, expenseSchema, joinCoupleSchema, memorySchema, profileSettingsSchema } from "@/lib/validation/schemas";

const id = "4f8b2c1e-3a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("schémas Zod", () => {
  it("rendez-vous : champs facultatifs vides → null, budget avec virgule", () => {
    const r = dateProposalSchema.parse({ title: "  Ciné  ", description: "", location: "", proposed_at: "", budget: "12,5" });
    expect(r).toEqual({ title: "Ciné", description: null, location: null, proposed_at: null, budget: 12.5 });
  });

  it("rendez-vous : titre obligatoire", () => {
    const r = dateProposalSchema.safeParse({ title: "   " });
    expect(r.success).toBe(false);
  });

  it("dépense : convertit le mode de partage en payer_share", () => {
    const base = { pot_id: id, title: "Hôtel", amount: "120", paid_by: id, spent_on: "2026-10-18" };
    expect(expenseSchema.parse({ ...base, split: "equal" }).payer_share).toBe(50);
    expect(expenseSchema.parse({ ...base, split: "for_partner" }).payer_share).toBe(0);
    expect(expenseSchema.parse({ ...base, split: "custom", payer_share: "70" }).payer_share).toBe(70);
    expect(expenseSchema.safeParse({ ...base, amount: "0", split: "equal" }).success).toBe(false);
  });

  it("code d'invitation : insensible à la casse", () => {
    expect(joinCoupleSchema.parse({ code: " ab12cd34 " }).code).toBe("AB12CD34");
    expect(joinCoupleSchema.safeParse({ code: "trop-court" }).success).toBe(false);
  });

  it("profil : téléphone international et cases à cocher", () => {
    const r = profileSettingsSchema.parse({ display_name: "Léa", phone: "+33 6 12 34 56 78", notify_email: "on" });
    expect(r).toEqual({ display_name: "Léa", phone: "+33612345678", notify_email: true, notify_sms: false });
    expect(profileSettingsSchema.safeParse({ display_name: "Léa", phone: "0612345678" }).success).toBe(false);
  });

  it("souvenir : un seul chemin de photo devient un tableau", () => {
    const r = memorySchema.parse({ title: "Plage", happened_on: "2026-08-01", photo_paths: `${id}/x.jpg`, album_id: "" });
    expect(r.photo_paths).toEqual([`${id}/x.jpg`]);
    expect(r.album_id).toBeNull();
  });
});
