"use client";

import { useRef } from "react";
import { Input } from "./field";

/**
 * Champ date + heure : l'utilisateur saisit dans son heure locale, le
 * formulaire envoie un horodatage ISO avec fuseau (le serveur Vercel est en UTC).
 */
export function DateTimeField({
  name,
  required,
  invalid,
  defaultValue,
  min,
}: {
  name: string;
  required?: boolean;
  invalid?: boolean;
  defaultValue?: string;
  min?: string;
}) {
  const hidden = useRef<HTMLInputElement>(null);
  return (
    <>
      <Input
        type="datetime-local"
        name={`${name}_local`}
        id={name}
        required={required}
        invalid={invalid}
        defaultValue={defaultValue}
        min={min}
        onChange={(e) => {
          if (!hidden.current) return;
          const value = e.currentTarget.value;
          hidden.current.value = value ? new Date(value).toISOString() : "";
        }}
      />
      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue ? new Date(defaultValue).toISOString() : ""} />
    </>
  );
}
