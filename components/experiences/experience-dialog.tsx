"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import {
  createExperience,
  deleteExperience,
  removeExperienceImage,
  updateExperience,
  uploadExperienceImage,
  type ExperienceInput,
} from "@/lib/api";
import { IMAGE_TYPES, prepareImageFile } from "@/lib/prepare-image";
import type { Experience, ExperiencePricing } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const PRICING_LABELS: Record<ExperiencePricing, string> = {
  per_person: "per person",
  per_booking: "per booking",
};

export function ExperienceDialog({
  open,
  onOpenChange,
  experience,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience?: Experience | null;
  onSaved: (experience: Experience) => void;
  onDeleted: (experience: Experience) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <ExperienceForm
            key={experience?.id ?? "new"}
            experience={experience}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ExperienceForm({
  experience,
  onSaved,
  onDeleted,
  onCancel,
}: {
  experience?: Experience | null;
  onSaved: (experience: Experience) => void;
  onDeleted: (experience: Experience) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(experience?.name ?? "");
  const [description, setDescription] = useState(experience?.description ?? "");
  const [price, setPrice] = useState(experience?.price ?? 300);
  const [pricing, setPricing] = useState<ExperiencePricing>(experience?.pricing ?? "per_person");
  const [isActive, setIsActive] = useState(experience?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"save" | "delete" | null>(null);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Shown image: the saved URL, a local preview of a picked file, or null.
  const [imageSrc, setImageSrc] = useState<string | null>(experience?.image ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** Set once a new experience exists, so a retry after a failed upload doesn't create it twice. */
  const savedRef = useRef<Experience | null>(experience ?? null);

  // Free the local preview when it's replaced or the form closes.
  useEffect(() => {
    if (!imageFile || !imageSrc) return;
    const preview = imageSrc;
    return () => URL.revokeObjectURL(preview);
  }, [imageFile, imageSrc]);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const prepared = await prepareImageFile(file);
      setImageFile(prepared);
      setImageSrc(URL.createObjectURL(prepared));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the image.");
    } finally {
      setPreparing(false);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImageSrc(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter a name for the experience.");
    if (!Number.isInteger(price) || price < 0) return setError("The price must be a whole number of MAD.");

    const input: ExperienceInput = {
      name: name.trim(),
      description: description.trim(),
      price,
      pricing,
      isActive,
    };

    setSaving("save");
    try {
      // 1. Save the details.
      setSavingLabel("Saving…");
      let saved = savedRef.current
        ? await updateExperience(savedRef.current.id, input)
        : await createExperience(input);
      savedRef.current = saved;

      // 2. Then the image: upload the new one, or remove the old one.
      if (imageFile) {
        setSavingLabel("Uploading image…");
        saved = await uploadExperienceImage(saved.id, imageFile);
        savedRef.current = saved;
        setImageFile(null);
        setImageSrc(saved.image);
      } else if (saved.image && !imageSrc) {
        saved = await removeExperienceImage(saved.id);
      }

      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the experience.");
      setSaving(null);
      setSavingLabel(null);
    }
  }

  async function handleDelete() {
    if (!experience) return;
    if (!confirmDelete) return setConfirmDelete(true);

    setError(null);
    setSaving("delete");
    try {
      await deleteExperience(experience.id);
      onDeleted(experience);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the experience.");
      setSaving(null);
      setConfirmDelete(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{experience ? "Edit experience" : "New experience"}</DialogTitle>
        <DialogDescription>
          Extras guests can add to their stay on the booking site, like a hammam or a cooking class.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="experience-name">Name</Label>
        <Input
          id="experience-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Hammam & massage"
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label>Image</Label>
        <div
          className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void pickImage(event.dataTransfer.files[0]);
          }}
        >
          {imageSrc ? (
            <>
              <div
                role="img"
                aria-label="Experience image"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(imageSrc)})` }}
              />
              <button
                type="button"
                onClick={clearImage}
                disabled={saving !== null}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
              {imageFile ? (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
                  New · uploads when you save
                </span>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving !== null || preparing}
              className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground transition hover:bg-muted disabled:cursor-wait"
            >
              {preparing ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              <span>{preparing ? "Preparing…" : "Add an image"}</span>
              <span className="text-xs">or drag one here</span>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">PNG, JPEG or WebP. Big photos are resized automatically.</p>
          {imageSrc ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving !== null || preparing}
            >
              <ImagePlus />
              Replace
            </Button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            void pickImage(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="experience-description">Description</Label>
        <Textarea
          id="experience-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What's included, how long it takes…"
          maxLength={2000}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="experience-price">Price (MAD)</Label>
          <Input
            id="experience-price"
            type="number"
            min={0}
            step={10}
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="experience-pricing">Charged</Label>
          <Select
            id="experience-pricing"
            value={pricing}
            onChange={(event) => setPricing(event.target.value as ExperiencePricing)}
          >
            <option value="per_person">Per person (every guest, children included)</option>
            <option value="per_booking">Per booking (once per stay)</option>
          </Select>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block font-medium">Visible on the booking site</span>
          <span className="block text-xs text-muted-foreground">When off, guests can&apos;t add it to a booking.</span>
        </span>
      </label>

      <DialogFooter className="sm:justify-between">
        {experience ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={saving !== null}
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            {saving === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {confirmDelete ? "Click again to delete" : "Delete"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving !== null}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving !== null}>
            {saving === "save" ? <Loader2 className="animate-spin" /> : null}
            {saving === "save" && savingLabel ? savingLabel : experience ? "Save changes" : "Create experience"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
