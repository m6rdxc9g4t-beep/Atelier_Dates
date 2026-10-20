"use client";

import { startTransition, useState } from "react";
import { ImagePlus, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { MEMORIES_BUCKET } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { createMemory } from "./actions";

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 12;

export function MemoryForm({ coupleId, albums, today }: { coupleId: string; albums: { id: string; name: string }[]; today: string }) {
  const [state, dispatch] = useFormAction(createMemory);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const e = state.fieldErrors;

  /** Envoie les photos directement dans Storage, puis transmet leurs chemins à la Server Action */
  async function submit(formData: FormData) {
    setUploadError(null);
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    formData.delete("photos");

    if (files.length > MAX_PHOTOS) return setUploadError(`${MAX_PHOTOS} photos maximum par souvenir.`);
    const tooBig = files.find((f) => f.size > MAX_SIZE);
    if (tooBig) return setUploadError(`« ${tooBig.name} » dépasse 10 Mo.`);

    if (files.length) {
      const supabase = createClient();
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${coupleId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(MEMORIES_BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (error) return setUploadError(`« ${file.name} » n'a pas pu être envoyée. Formats acceptés : JPEG, PNG, WebP, GIF, HEIC.`);
        formData.append("photo_paths", path);
      }
    }
    // Après un await on n'est plus dans la transition du formulaire : on la rouvre.
    startTransition(() => dispatch(formData));
    setPhotoCount(0);
    setCoords(null);
  }

  function locate() {
    if (!("geolocation" in navigator)) return setUploadError("Ton navigateur ne permet pas la géolocalisation.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setLocating(false);
      },
      () => {
        setUploadError("Position indisponible. Tu peux écrire le lieu à la main.");
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  }

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Titre" name="title" errors={e?.title} className="sm:col-span-2">
        <Input name="title" defaultValue={state.values?.title} placeholder="Notre premier café à deux" required invalid={!!e?.title} />
      </Field>
      <Field label="Date" name="happened_on" errors={e?.happened_on}>
        <Input name="happened_on" type="date" defaultValue={state.values?.happened_on ?? today} required />
      </Field>
      <Field label="Lieu" name="location_name" errors={e?.location_name}>
        <div className="flex gap-2">
          <Input name="location_name" defaultValue={state.values?.location_name} placeholder="Montmartre, Paris" />
          <Button variant="soft" onClick={locate} disabled={locating} aria-label="Utiliser ma position" title="Utiliser ma position">
            <LocateFixed className="size-4" aria-hidden />
          </Button>
        </div>
      </Field>
      {coords && (
        <p className="text-xs text-ink-soft sm:col-span-2">
          Position enregistrée ({coords.lat}, {coords.lng}).
        </p>
      )}
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />

      <Field label="Album" name="album_id" errors={e?.album_id}>
        <Select name="album_id" defaultValue={state.values?.album_id ?? ""}>
          <option value="">Sans album</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="…ou un nouvel album" name="new_album" hint="Facultatif" errors={e?.new_album}>
        <Input name="new_album" defaultValue={state.values?.new_album} placeholder="Été 2026" />
      </Field>

      <Field label="Un petit mot doux" name="note" errors={e?.note} className="sm:col-span-2">
        <Textarea name="note" defaultValue={state.values?.note} className="font-hand text-2xl leading-snug" placeholder="Tu avais renversé ton cappuccino…" />
      </Field>

      <div className="sm:col-span-2">
        <label
          htmlFor="photos"
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-4 text-ink-soft transition-colors hover:border-accent hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus"
        >
          <ImagePlus className="size-5 text-accent-strong" aria-hidden />
          {photoCount ? `${photoCount} photo${photoCount > 1 ? "s" : ""} sélectionnée${photoCount > 1 ? "s" : ""}` : "Ajouter des photos (10 Mo max chacune)"}
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
            multiple
            className="sr-only"
            onChange={(ev) => setPhotoCount(ev.currentTarget.files?.length ?? 0)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2">
        {uploadError && <FormMessage state={{ status: "error", message: uploadError }} />}
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Enregistrement…" className="self-start">
          Ajouter ce souvenir
        </SubmitButton>
      </div>
    </form>
  );
}
