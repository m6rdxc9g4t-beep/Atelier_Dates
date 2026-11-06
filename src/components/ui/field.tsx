import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Champ de la suite : 40 px sur téléphone, 36 px sur ordinateur, bord accent et voile de 3 px au focus */
const control =
  "w-full rounded-md border border-edge-soft bg-field px-3 text-input text-ink placeholder:text-faint " +
  "transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_oklab,var(--edge-soft)_60%,var(--muted))] " +
  "focus:border-accent focus:outline-none focus-visible:outline-none focus:focus-ring " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-bad";

type FieldProps = {
  label: string;
  name: string;
  /** Identifiant du champ, si le même formulaire apparaît plusieurs fois dans la page (par défaut : name) */
  id?: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
};

/** Libellé + contrôle + aide + erreurs, reliés par aria-describedby */
export function Field({ label, name, id = name, hint, errors, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-ui font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${id}-hint`} className="text-small text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-small font-medium text-bad" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, invalid?: boolean) {
  return invalid ? `${name}-error` : `${name}-hint`;
}

type WithInvalid = { invalid?: boolean };

export function Input({ className, invalid, name, ...props }: InputHTMLAttributes<HTMLInputElement> & WithInvalid) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "h-10 lg:h-9", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  name,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & WithInvalid) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "min-h-24 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, name, ...props }: SelectHTMLAttributes<HTMLSelectElement> & WithInvalid) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "h-10 appearance-none bg-[url(/icons/chevron.svg)] bg-[length:16px] bg-[position:right_10px_center] bg-no-repeat pr-9 lg:h-9", className)}
      {...props}
    />
  );
}
