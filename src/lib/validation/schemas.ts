import { z } from "zod";
import {
  optionalAmount,
  optionalCoordinate,
  optionalDate,
  optionalDateTime,
  optionalText,
  requiredAmount,
  requiredDate,
  requiredDateTime,
  requiredText,
  uuid,
} from "./common";

// --- Onboarding / paramètres -------------------------------------------------
export const createCoupleSchema = z.object({
  name: requiredText(80, "Le nom de votre petit monde"),
  started_on: optionalDate,
});

export const joinCoupleSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, "Le code fait 8 caractères (lettres et chiffres)."),
});

export const coupleSettingsSchema = createCoupleSchema;

export const profileSettingsSchema = z.object({
  display_name: requiredText(60, "Ton prénom"),
  phone: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.replace(/[\s.-]/g, "") : null),
    z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, "Format international attendu, ex. +33612345678.")
      .nullable(),
  ),
  notify_email: z.preprocess((v) => v === "on", z.boolean()),
  notify_sms: z.preprocess((v) => v === "on", z.boolean()),
});

/** Chemin interne uniquement (pas de redirection ouverte vers un autre site) */
const internalPath = z
  .string()
  .refine((v) => v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\"))
  .optional()
  .catch(undefined);

export const loginSchema = z.object({
  // espaces retirés avant validation (le clavier iPhone en ajoute souvent un)
  email: z.string({ error: "Indique ton adresse e-mail." }).trim().toLowerCase().pipe(z.email({ error: "Adresse e-mail invalide." })),
  next: internalPath,
});

export const passwordLoginSchema = loginSchema.extend({
  password: z.string({ error: "Indique ton mot de passe." }).min(1, "Indique ton mot de passe.").max(200),
});

export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum.").max(200, "200 caractères maximum."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "Les deux mots de passe ne correspondent pas." });

// --- Rendez-vous -------------------------------------------------------------
export const dateProposalSchema = z.object({
  title: requiredText(120, "L'idée"),
  description: optionalText(2000),
  location: optionalText(200),
  proposed_at: optionalDateTime,
  budget: optionalAmount,
});

export const voteSchema = z.object({
  proposal_id: uuid,
  vote: z.enum(["yes", "maybe", "no"]),
});

// --- Cagnottes ---------------------------------------------------------------
export const potSchema = z.object({
  name: requiredText(80, "Le nom de la cagnotte"),
  description: optionalText(500),
  emoji: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : "💞"), z.string().max(8)),
  budget: optionalAmount,
});

export const expenseSchema = z
  .object({
    pot_id: uuid,
    title: requiredText(120, "Le libellé"),
    amount: requiredAmount,
    paid_by: uuid,
    split: z.enum(["equal", "for_partner", "custom"]),
    payer_share: z.preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number().min(0).max(100).optional(),
    ),
    spent_on: requiredDate,
  })
  .transform(({ split, payer_share, ...rest }) => ({
    ...rest,
    payer_share: split === "equal" ? 50 : split === "for_partner" ? 0 : (payer_share ?? 50),
  }));

export const settleSchema = z.object({ pot_id: uuid });

// --- Souvenirs ---------------------------------------------------------------
export const memorySchema = z.object({
  title: requiredText(120, "Le titre"),
  note: optionalText(2000),
  happened_on: requiredDate,
  location_name: optionalText(200),
  latitude: optionalCoordinate(-90, 90),
  longitude: optionalCoordinate(-180, 180),
  album_id: z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable()),
  new_album: optionalText(80),
  photo_paths: z.preprocess(
    (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.string().max(300)).max(12, "12 photos maximum par souvenir."),
  ),
});

// --- Envies ------------------------------------------------------------------
export const wishSchema = z.object({
  kind: z.enum(["activity", "weekend", "trip", "project"]),
  title: requiredText(120, "Le titre"),
  description: optionalText(4000),
  estimated_budget: optionalAmount,
});

export const desireSchema = z.object({
  wish_id: uuid,
  level: z.coerce.number().int().min(1).max(5),
});

export const wishStatusSchema = z.object({
  wish_id: uuid,
  status: z.enum(["idea", "planned", "done"]),
});

// --- Surprises ---------------------------------------------------------------
export const surpriseSchema = z.object({
  teaser: requiredText(140, "Le teaser"),
  reveal_at: requiredDateTime,
  title: requiredText(120, "La surprise"),
  message: optionalText(4000),
});

export const hintSchema = z.object({
  surprise_id: uuid,
  content: requiredText(500, "L'indice"),
  reveal_at: requiredDateTime,
});
