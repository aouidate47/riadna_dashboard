"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { removeRiadHeroImage, uploadRiadHeroImage } from "@/lib/api";
import { IMAGE_TYPES, prepareImageFile } from "@/lib/prepare-image";
import type { Riad } from "@/types";

/** The booking site's landing photo. Uploads/removes right away (separate from "Save changes"). */
export function RiadHeroImageField({
  riad,
  onChanged,
  onError,
}: {
  riad: Riad;
  onChanged: (riad: Riad, message: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again
    if (!file) return;

    setBusy("upload");
    try {
      onChanged(await uploadRiadHeroImage(await prepareImageFile(file)), "Cover photo updated.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove() {
    setBusy("remove");
    try {
      onChanged(await removeRiadHeroImage(), "Cover photo removed.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove the photo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Cover photo</Label>
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted sm:aspect-[21/9]">
        {riad.heroImage ? (
          <div
            role="img"
            aria-label={`${riad.name} cover photo`}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(riad.heroImage)})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No cover photo yet
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          The big photo at the top of the booking site. Saved immediately.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => inputRef.current?.click()}>
            {busy === "upload" ? <Loader2 className="animate-spin" /> : <ImageUp />}
            {riad.heroImage ? "Replace" : "Upload photo"}
          </Button>
          {riad.heroImage ? (
            <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={onRemove}>
              {busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={onFile} />
    </div>
  );
}
