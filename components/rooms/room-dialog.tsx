"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createRoom, updateRoom } from "@/lib/api";
import type { BathroomType, Room } from "@/types";
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

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size <= COMPRESS_THRESHOLD) return readAsDataUrl(file);

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return readAsDataUrl(file);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.82);
    } finally {
      bitmap.close();
    }
  } catch {
    return readAsDataUrl(file);
  }
}

export function RoomDialog({
  open,
  onOpenChange,
  room,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSaved: (room: Room) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <RoomForm
            key={room?.id ?? "new"}
            room={room}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoomForm({
  room,
  onSaved,
  onCancel,
}: {
  room?: Room | null;
  onSaved: (room: Room) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(room?.name ?? "");
  const [capacity, setCapacity] = useState(room?.capacity ?? 2);
  const [price, setPrice] = useState(room?.price ?? 900);
  const [photos, setPhotos] = useState<string[]>(() => (room?.photos ?? []).slice(0, MAX_PHOTOS));
  const [wifi, setWifi] = useState(room?.wifi ?? true);
  const [bathroom, setBathroom] = useState<BathroomType>(room?.bathroom ?? "private");
  const [airConditioning, setAirConditioning] = useState(room?.airConditioning ?? true);
  const [heating, setHeating] = useState(room?.heating ?? true);
  const [breakfast, setBreakfast] = useState(room?.breakfast ?? false);
  const [terrace, setTerrace] = useState(room?.terrace ?? false);
  const [tv, setTv] = useState(room?.tv ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) return setError(`You can upload up to ${MAX_PHOTOS} photos.`);

    const selected = incoming.slice(0, slots);
    const notImage = selected.find((file) => !file.type.startsWith("image/"));
    if (notImage) return setError(`"${notImage.name}" is not an image.`);

    const tooLarge = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (tooLarge) return setError(`"${tooLarge.name}" is larger than 12 MB.`);

    setError(null);
    setUploading(true);
    try {
      const urls = await Promise.all(selected.map(fileToDataUrl));
      setPhotos((current) => [...current, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      setError("Could not read one of the selected images.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter a room name.");
    if (!Number.isInteger(capacity) || capacity < 1) {
      return setError("Capacity must be a whole number of at least 1.");
    }
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid nightly rate.");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        capacity,
        price,
        photos,
        wifi,
        bathroom,
        airConditioning,
        heating,
        breakfast,
        terrace,
        tv,
      };
      const saved = room ? await updateRoom(room.id, payload) : await createRoom(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the room.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{room ? "Edit room" : "New room"}</DialogTitle>
        <DialogDescription>
          {room
            ? `Update the details and rates for ${room.name}.`
            : "Add a room so it appears in bookings and on the calendar."}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="room-name">Room name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Chambre Jasmin"
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="room-capacity">Capacity</Label>
          <Input
            id="room-capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">Maximum number of guests.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="room-price">Nightly rate (MAD)</Label>
          <Input
            id="room-price"
            type="number"
            min={0}
            step={50}
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">Used to prefill booking totals.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Photos</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {photos.length} / {MAX_PHOTOS}
          </span>
        </div>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {photos.map((photo, index) => (
            <div
              key={`${index}-${photo.slice(-24)}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted"
            >
              <div
                role="img"
                aria-label={`Room photo ${index + 1}`}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(photo)})` }}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/40 px-2 text-center text-xs text-muted-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            >
              {uploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span>{uploading ? "Reading…" : "Add photo"}</span>
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          Upload up to {MAX_PHOTOS} images, or drag them onto the grid. The first photo is used on the
          room card. Large images are resized automatically.
        </p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Room amenities
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="room-bathroom">Toilet / bathroom</Label>
            <Select
              id="room-bathroom"
              value={bathroom}
              onChange={(event) => setBathroom(event.target.value as BathroomType)}
            >
              <option value="private">In the room (private)</option>
              <option value="shared">Separate / shared</option>
            </Select>
          </div>
          <p className="self-end pb-2 text-xs text-muted-foreground">
            Choose “Separate / shared” when the toilet is outside the room.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <AmenityToggle label="Wi-Fi in the room" checked={wifi} onChange={setWifi} />
          <AmenityToggle
            label="Air conditioning"
            checked={airConditioning}
            onChange={setAirConditioning}
          />
          <AmenityToggle label="Heating" checked={heating} onChange={setHeating} />
          <AmenityToggle
            label="Breakfast included"
            checked={breakfast}
            onChange={setBreakfast}
          />
          <AmenityToggle label="Terrace / patio" checked={terrace} onChange={setTerrace} />
          <AmenityToggle label="TV" checked={tv} onChange={setTv} />
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving || uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {room ? "Save changes" : "Create room"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AmenityToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm transition hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
