"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { MEMORIES_BUCKET } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { createGift } from "./actions";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

export function GiftForm({ coupleId, hasPartner }: { coupleId: string; hasPartner: boolean }) {
  const [state, dispatch] = useFormAction(createGift);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const e = state.fieldErrors;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(file: File | undefined) {
    setUploadError(null);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    if (fileRef.current) fileRef.current.value = "";
    pick(undefined);
  }

  /** Envoie la photo (si il y en a une) directement dans Storage, puis transmet son chemin */
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
    setPreview(null);
  }

  const forWhom = state.values?.for_whom ?? "me";

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="L'objet" name="title" errors={e?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={state.values?.title} placeholder="Un plaid tout doux" required invalid={!!e?.title} />
      </Field>

      {hasPartner && (
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

      <Field label="Lien du site" name="url" hint="Facultatif" errors={e?.url} className="sm:col-span-2">
        <Input name="url" type="url" inputMode="url" defaultValue={state.values?.url} placeholder="https://…" invalid={!!e?.url} />
      </Field>
      <Field label="Prix (€)" name="price" hint="Facultatif" errors={e?.price}>
        <Input name="price" defaultValue={state.values?.price} inputMode="decimal" placeholder="39,90" invalid={!!e?.price} />
      </Field>
      <Field label="Précisions" name="note" hint="Taille, couleur… (facultatif)" errors={e?.note}>
        <Input name="note" defaultValue={state.values?.note} placeholder="En rouge, taille M" />
      </Field>

      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-ink">Photo de l&apos;objet</span>
        <div className="flex items-center gap-3">
          <label
            htmlFor="photo"
            className={cn(
              "flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-edge-soft px-4 py-4 text-ink-soft transition-colors hover:border-accent hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
              preview && "py-2",
            )}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:)
              <img src={preview} alt="" className="size-14 rounded-xl object-cover" />
            ) : (
              <ImagePlus className="size-5 text-accent-strong" aria-hidden />
            )}
            {preview ? "Changer la photo" : "Ajouter une photo (facultatif)"}
            <input
              ref={fileRef}
              id="photo"
              name="photo"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(ev) => pick(ev.currentTarget.files?.[0])}
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Retirer la photo"
              className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-accent-faint hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2">
        {uploadError && <FormMessage state={{ status: "error", message: uploadError }} />}
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Ajout…" className="self-start">
          Ajouter à la liste
        </SubmitButton>
      </div>
    </form>
  );
}
