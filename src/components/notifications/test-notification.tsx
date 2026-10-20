"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/actions";
import { sendTestNotification } from "@/app/(app)/notifications/actions";

export function TestNotification() {
  const [state, action] = useActionState(sendTestNotification, idleState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <SubmitButton variant="soft" size="sm" pendingLabel="Envoi…" className="self-start">
        <Send className="size-4" aria-hidden />
        M&apos;envoyer une notification test
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
