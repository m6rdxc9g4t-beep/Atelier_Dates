import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** Message global d'un formulaire (succès ou erreur), annoncé aux lecteurs d'écran.
 *  Seule l'erreur est en couleur ; le succès reste neutre, avec sa coche. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-ui",
        isError ? "border-bad-line bg-bad-soft text-bad" : "border-edge bg-surface text-ink",
        className,
      )}
    >
      <Icon className={cn("mt-px size-4 shrink-0", !isError && "text-good")} aria-hidden />
      <span>{state.message}</span>
    </p>
  );
}
