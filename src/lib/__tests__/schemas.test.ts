import { describe, expect, it } from "vitest";
import {
  dateProposalSchema,
  expenseSchema,
  giftSchema,
  giftUpdateSchema,
  joinCoupleSchema,
  memorySchema,
  passwordChangeSchema,
  passwordLoginSchema,
  profileSettingsSchema,
} from "@/lib/validation/schemas";

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

  it("connexion : refuse les redirections vers un autre site", () => {
    const base = { email: "Lea@Exemple.fr ", password: "x" };
    expect(passwordLoginSchema.parse({ ...base, next: "/cagnottes" })).toEqual({ email: "lea@exemple.fr", password: "x", next: "/cagnottes" });
    expect(passwordLoginSchema.parse({ ...base, next: "//pirate.com" }).next).toBeUndefined();
    expect(passwordLoginSchema.parse({ ...base, next: "https://pirate.com" }).next).toBeUndefined();
    expect(passwordLoginSchema.safeParse({ email: "lea@exemple.fr", password: "" }).success).toBe(false);
  });

  it("changement de mot de passe : longueur et confirmation", () => {
    expect(passwordChangeSchema.safeParse({ password: "court", confirm: "court" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "assez-long", confirm: "autre-chose" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "assez-long", confirm: "assez-long" }).success).toBe(true);
  });

  it("cadeau : seul le nom est obligatoire, le lien est complété en https", () => {
    const minimal = giftSchema.parse({ title: "Un plaid tout doux", url: "", price: "", note: "", photo_path: "" });
    expect(minimal).toMatchObject({ title: "Un plaid tout doux", url: null, price: null, note: null, photo_path: null, for_whom: "me" });
    expect(giftSchema.parse({ title: "x", url: "www.boutique.fr/plaid?c=rouge", price: "39,90" })).toMatchObject({
      url: "https://www.boutique.fr/plaid?c=rouge",
      price: 39.9,
    });
    expect(giftSchema.safeParse({ title: "x", url: "javascript:alert(1)" }).success).toBe(false);
    expect(giftSchema.safeParse({ title: "x", url: "pas un lien" }).success).toBe(false);
    expect(giftSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("modification de cadeau : identifiant obligatoire, photo à retirer, champs vidés → null", () => {
    expect(giftUpdateSchema.parse({ gift_id: id, title: "Plaid", url: "", price: "", note: "", remove_photo: "1" })).toMatchObject({
      gift_id: id,
      url: null,
      price: null,
      note: null,
      remove_photo: true,
    });
    expect(giftUpdateSchema.parse({ gift_id: id, title: "Plaid", remove_photo: "" }).remove_photo).toBe(false);
    expect(giftUpdateSchema.safeParse({ title: "Plaid" }).success).toBe(false);
    // le destinataire ne se change pas
    expect("for_whom" in giftUpdateSchema.parse({ gift_id: id, title: "Plaid", for_whom: "us" })).toBe(false);
  });
});
