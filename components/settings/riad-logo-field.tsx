"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LOGO_TYPES, removeRiadLogo, uploadRiadLogo } from "@/lib/api";
import { initials } from "@/lib/utils";
import type { Riad } from "@/types";

/** Uploads/removes the riad logo right away (separate from the "Save changes" form). */
export function RiadLogoField({
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
      onChanged(await uploadRiadLogo(file), "Logo updated.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not upload the logo.");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove() {
    setBusy("remove");
    try {
      onChanged(await removeRiadLogo(), "Logo removed.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove the logo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Logo</Label>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {riad.logo ? (
            // Served by platform-api on any host, so a plain <img> instead of next/image (no remotePatterns needed).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={riad.logo} alt={`${riad.name} logo`} className="size-full object-contain" />
          ) : (
            <span className="font-display text-xl font-semibold text-muted-foreground">{initials(riad.name)}</span>
          )}
        </span>

        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => inputRef.current?.click()}>
              {busy === "upload" ? <Loader2 className="animate-spin" /> : <ImageUp />}
              {riad.logo ? "Replace logo" : "Upload logo"}
            </Button>
            {riad.logo ? (
              <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={onRemove}>
                {busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB. Saved immediately.</p>
        </div>

        <input ref={inputRef} type="file" accept={LOGO_TYPES.join(",")} className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
