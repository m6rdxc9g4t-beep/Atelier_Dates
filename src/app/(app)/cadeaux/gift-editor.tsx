"use client";

import { useCallback, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GiftRow } from "@/lib/supabase/database.types";
import { GiftForm } from "./gift-form";

/** Bouton « Modifier » d'une carte cadeau, qui déplie le formulaire sous les boutons */
export function GiftEditor({ gift, coupleId, currentPhoto }: { gift: GiftRow; coupleId: string; currentPhoto?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label={`Modifier ${gift.title}`}>
        <Pencil className="size-3.5" aria-hidden />
        Modifier
      </Button>
    );
  }
  return (
    <div className="mt-2 basis-full rounded-lg border border-edge bg-paper p-4">
      <GiftForm coupleId={coupleId} gift={gift} currentPhoto={currentPhoto} onDone={close} onCancel={close} />
    </div>
  );
}
