"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { MEMORIES_BUCKET } from "@/lib/env";
import type { GiftRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { createGift, updateGift } from "./actions";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

type Props = {
  coupleId: string;
  /** Ajout : proposer « Moi / Nous deux » (seulement quand l'autre a rejoint le couple) */
  hasPartner?: boolean;
  /** Modification : le cadeau à modifier et l'adresse (signée) de sa photo actuelle */
  gift?: GiftRow;
  currentPhoto?: string;
  /** Appelé après un enregistrement réussi (ferme le formulaire de modification) */
  onDone?: () => void;
  onCancel?: () => void;
};

/** Formulaire d'un cadeau : ajout, ou modification quand `gift` est fourni */
export function GiftForm({ coupleId, hasPartner = false, gift, currentPhoto, onDone, onCancel }: Props) {
  const editing = !!gift;
  const [state, dispatch] = useFormAction(editing ? updateGift : createGift);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Plusieurs formulaires peuvent être ouverts à la fois : des identifiants uniques pour les libellés
  const uid = useId();
  const id = (name: string) => `${name}-${uid}`;
  const e = state.fieldErrors;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  /** Valeur affichée : la saisie gardée après une erreur, sinon la valeur actuelle du cadeau */
  const value = (name: string, fallback?: string | number | null) => state.values?.[name] ?? (fallback == null ? undefined : String(fallback));

  function pick(file: File | undefined) {
    setUploadError(null);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    if (preview) {
      // annule la nouvelle photo : on revient à la photo actuelle (s'il y en a une)
      if (fileRef.current) fileRef.current.value = "";
      pick(undefined);
    } else {
      setRemoveCurrent(true);
    }
  }

  /** Envoie la photo (s'il y en a une nouvelle) directement dans Storage, puis transmet son chemin */
  async function submit(formData: FormData) {
    setUploadError(null);
    const file = formData.get("photo");
    formData.delete("photo");

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SIZE) return setUploadError(`« ${file.name} » dépasse 10 Mo.`);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${coupleId}/gifts/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from(MEMORIES_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) return setUploadError("La photo n'a pas pu être envoyée. Formats acceptés : JPEG, PNG, WebP, GIF, HEIC.");
      formData.set("photo_path", path);
    }
    // Après un await on n'est plus dans la transition du formulaire : on la rouvre.
    startTransition(() => dispatch(formData));
    if (!editing) setPreview(null);
  }

  const forWhom = state.values?.for_whom ?? "me";
  const shownPhoto = preview ?? (currentPhoto && !removeCurrent ? currentPhoto : null);

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {gift && <input type="hidden" name="gift_id" value={gift.id} />}
      {editing && <input type="hidden" name="remove_photo" value={removeCurrent ? "1" : ""} />}

      <Field label="L'objet" name="title" id={id("title")} errors={e?.title} className="sm:col-span-2">
        <Input name="title" id={id("title")} defaultValue={value("title", gift?.title)} placeholder="Un plaid tout doux" required invalid={!!e?.title} />
      </Field>

      {!editing && hasPartner && (
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">C&apos;est pour</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "me", label: "Moi" },
              { value: "us", label: "Nous deux" },
            ].map((o) => (
              <label
                key={o.value}
                className="cursor-pointer rounded-full border border-edge-soft px-4 py-1.5 text-sm text-ink-soft transition-colors hover:bg-accent-faint has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:checked]:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
              >
                <input type="radio" name="for_whom" value={o.value} defaultChecked={forWhom === o.value} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Lien du site" name="url" id={id("url")} hint="Facultatif" errors={e?.url} className="sm:col-span-2">
        <Input name="url" id={id("url")} type="url" inputMode="url" defaultValue={value("url", gift?.url)} placeholder="https://…" invalid={!!e?.url} />
      </Field>
      <Field label="Prix (€)" name="price" id={id("price")} hint="Facultatif" errors={e?.price}>
        <Input
          name="price"
          id={id("price")}
          defaultValue={value("price", gift?.price != null ? Number(gift.price).toFixed(2).replace(".", ",") : null)}
          inputMode="decimal"
          placeholder="39,90"
          invalid={!!e?.price}
        />
      </Field>
      <Field label="Précisions" name="note" id={id("note")} hint="Taille, couleur… (facultatif)" errors={e?.note}>
        <Input name="note" id={id("note")} defaultValue={value("note", gift?.note)} placeholder="En rouge, taille M" />
      </Field>

      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-ink">Photo de l&apos;objet</span>
        <div className="flex items-center gap-3">
          <label
            htmlFor={id("photo")}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-edge-soft px-4 py-4 text-ink-soft transition-colors hover:border-accent hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
              shownPhoto && "py-2",
            )}
          >
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou URL signée
              <img src={shownPhoto} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <ImagePlus className="size-5 shrink-0 text-accent-strong" aria-hidden />
            )}
            {shownPhoto ? "Changer la photo" : "Ajouter une photo (facultatif)"}
            <input
              ref={fileRef}
              id={id("photo")}
              name="photo"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(ev) => pick(ev.currentTarget.files?.[0])}
            />
          </label>
          {shownPhoto && (
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Retirer la photo"
              title="Retirer la photo"
              className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-accent-faint hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        {editing && removeCurrent && !preview && (
          <p className="mt-1.5 text-xs text-ink-soft">
            La photo sera retirée à l&apos;enregistrement.{" "}
            <button type="button" onClick={() => setRemoveCurrent(false)} className="font-medium text-accent-strong underline-offset-2 hover:underline">
              La garder
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2">
        {uploadError && <FormMessage state={{ status: "error", message: uploadError }} />}
        <FormMessage state={editing && state.status === "success" ? { status: "idle" } : state} />
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingLabel={editing ? "Enregistrement…" : "Ajout…"}>{editing ? "Enregistrer" : "Ajouter à la liste"}</SubmitButton>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
