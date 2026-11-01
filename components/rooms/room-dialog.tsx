"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ImagePlus, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import {
  createRoom,
  deleteRoom,
  updateRoom,
  uploadRoomPhoto,
  ROOM_MAX_PHOTOS,
  ROOM_PHOTO_MAX_BYTES,
  ROOM_PHOTO_TYPES,
  type RoomInput,
} from "@/lib/api";
import type { Room } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SUGGESTED_AMENITIES = [
  "Wi-Fi",
  "Air conditioning",
  "Heating",
  "Private bathroom",
  "Shared bathroom",
  "Bathtub",
  "Breakfast included",
  "Terrace",
  "TV",
  "Safe",
  "Hair dryer",
  "Minibar",
];

/** Phone photos above the limit are resized to this longest edge. */
const RESIZE_MAX_EDGE = 2400;

/** A saved photo (src = its URL) or one picked but not uploaded yet (file set, src = local preview). */
type PhotoItem = { key: string; src: string; file?: File };

let photoKeySeq = 0;
const nextPhotoKey = () => `photo-${++photoKeySeq}`;

/** Makes a picked file uploadable: PNG/JPEG/WebP and at most 5 MB (bigger photos are resized to JPEG). */
async function prepareFile(file: File): Promise<File> {
  if (!ROOM_PHOTO_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" must be a PNG, JPEG or WebP image.`);
  }
  if (file.size <= ROOM_PHOTO_MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, RESIZE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Could not resize "${file.name}".`);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > ROOM_PHOTO_MAX_BYTES) throw new Error(`"${file.name}" is too large, even after resizing.`);
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export function RoomDialog({
  open,
  onOpenChange,
  room,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSaved: (room: Room) => void;
  onDeleted: (room: Room) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open ? (
          <RoomForm
            key={room?.id ?? "new"}
            room={room}
            onSaved={onSaved}
            onDeleted={onDeleted}
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
  onDeleted,
  onCancel,
}: {
  room?: Room | null;
  onSaved: (room: Room) => void;
  onDeleted: (room: Room) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [capacity, setCapacity] = useState(room?.capacity ?? 2);
  const [beds, setBeds] = useState(room?.beds ?? "");
  const [size, setSize] = useState(room?.size ?? 18);
  const [price, setPrice] = useState(room?.price ?? 900);
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [customAmenity, setCustomAmenity] = useState("");
  const [isActive, setIsActive] = useState(room?.isActive ?? true);
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    (room?.photos ?? []).map((url) => ({ key: nextPhotoKey(), src: url })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** Set once a new room exists, so a retry after a failed photo upload doesn't create it twice. */
  const savedRoomRef = useRef<Room | null>(room ?? null);

  // Free the local previews of photos that were never uploaded.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      for (const photo of photosRef.current) if (photo.file) URL.revokeObjectURL(photo.src);
    },
    [],
  );

  const busy = saving !== null || preparing;

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const slots = ROOM_MAX_PHOTOS - photos.length;
    if (slots <= 0) return setError(`A room can have up to ${ROOM_MAX_PHOTOS} photos.`);

    setError(null);
    setPreparing(true);
    try {
      const files = await Promise.all(incoming.slice(0, slots).map(prepareFile));
      setPhotos((current) =>
        [...current, ...files.map((file) => ({ key: nextPhotoKey(), src: URL.createObjectURL(file), file }))].slice(
          0,
          ROOM_MAX_PHOTOS,
        ),
      );
      if (incoming.length > slots) setError(`Only ${slots} more photo${slots === 1 ? "" : "s"} could be added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read one of the selected images.");
    } finally {
      setPreparing(false);
    }
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.key === key);
      if (photo?.file) URL.revokeObjectURL(photo.src);
      return current.filter((item) => item.key !== key);
    });
  }

  function makeMainPhoto(key: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.key === key);
      return photo ? [photo, ...current.filter((item) => item.key !== key)] : current;
    });
  }

  function toggleAmenity(amenity: string) {
    setAmenities((current) =>
      current.some((item) => item.toLowerCase() === amenity.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== amenity.toLowerCase())
        : [...current, amenity],
    );
  }

  function addCustomAmenity() {
    const amenity = customAmenity.trim();
    if (!amenity) return;
    if (!amenities.some((item) => item.toLowerCase() === amenity.toLowerCase())) {
      setAmenities((current) => [...current, amenity]);
    }
    setCustomAmenity("");
  }

  function onCustomAmenityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault(); // don't submit the room form
      addCustomAmenity();
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter a room name.");
    if (!beds.trim()) return setError("Describe the beds, e.g. “1 queen bed”.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return setError("Capacity must be a whole number between 1 and 50.");
    }
    if (!Number.isInteger(size) || size < 1) return setError("Size must be a whole number of m², at least 1.");
    if (!Number.isInteger(price) || price < 0) return setError("The nightly rate must be a whole number of MAD.");

    const payload: RoomInput = {
      name: name.trim(),
      description: description.trim(),
      capacity,
      beds: beds.trim(),
      size,
      price,
      amenities,
      isActive,
    };

    let current = photos;
    try {
      // 1. Save the room. For an existing room this also applies removed/reordered saved photos.
      setSaving("Saving room…");
      let saved = savedRoomRef.current
        ? await updateRoom(savedRoomRef.current.id, {
            ...payload,
            photos: current.filter((photo) => !photo.file).map((photo) => photo.src),
          })
        : await createRoom(payload);
      savedRoomRef.current = saved;

      // 2. Upload new photos one by one (each is added at the end of the room's photos).
      const pending = current.filter((photo) => photo.file);
      for (const [index, photo] of pending.entries()) {
        setSaving(`Uploading photo ${index + 1} of ${pending.length}…`);
        saved = await uploadRoomPhoto(saved.id, photo.file!);
        savedRoomRef.current = saved;
        const url = saved.photos[saved.photos.length - 1];
        URL.revokeObjectURL(photo.src);
        current = current.map((item) => (item.key === photo.key ? { key: item.key, src: url } : item));
      }

      // 3. Put the photos in the order shown in the form (new ones may have been made main).
      const order = current.map((photo) => photo.src);
      if (order.join("\n") !== saved.photos.join("\n")) {
        setSaving("Saving photo order…");
        saved = await updateRoom(saved.id, { photos: order });
      }

      onSaved(saved);
    } catch (err) {
      // Keep what was already uploaded, so "Save" again only retries what's left.
      setPhotos(current);
      setError(err instanceof Error ? err.message : "Could not save the room.");
      setSaving(null);
    }
  }

  async function handleDelete() {
    if (!room) return;
    if (!confirmDelete) return setConfirmDelete(true);

    setError(null);
    setSaving("Deleting room…");
    try {
      await deleteRoom(room.id);
      onDeleted(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the room.");
      setSaving(null);
      setConfirmDelete(false);
    }
  }

  const customAmenities = amenities.filter(
    (amenity) => !SUGGESTED_AMENITIES.some((item) => item.toLowerCase() === amenity.toLowerCase()),
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{room ? "Edit room" : "New room"}</DialogTitle>
        <DialogDescription>
          {room
            ? `Update the details, photos and rate for ${room.name}.`
            : "Add a room so it appears on the booking site, in bookings and on the calendar."}
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
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="room-description">Description</Label>
        <Textarea
          id="room-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What guests will love about this room…"
          maxLength={5000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">Shown on the booking site.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="room-beds">Beds</Label>
          <Input
            id="room-beds"
            value={beds}
            onChange={(event) => setBeds(event.target.value)}
            placeholder="e.g. 1 queen bed"
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="room-capacity">Capacity</Label>
          <Input
            id="room-capacity"
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">Max guests, adults + children.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="room-size">Size (m²)</Label>
          <Input
            id="room-size"
            type="number"
            min={1}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />
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
          <p className="text-xs text-muted-foreground">Whole dirhams, per night.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Photos</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {photos.length} / {ROOM_MAX_PHOTOS}
          </span>
        </div>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={photo.key}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted"
            >
              <div
                role="img"
                aria-label={`Room photo ${index + 1}`}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(photo.src)})` }}
              />
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Main
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMainPhoto(photo.key)}
                  disabled={busy}
                  aria-label={`Make photo ${index + 1} the main photo`}
                  title="Make main photo"
                  className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              {photo.file ? (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  New
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removePhoto(photo.key)}
                disabled={busy}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < ROOM_MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/40 px-2 text-center text-xs text-muted-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            >
              {preparing ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              <span>{preparing ? "Preparing…" : "Add photo"}</span>
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ROOM_PHOTO_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPEG or WebP. Drag photos onto the grid or click “Add photo”. The main photo is shown first on
          the booking site; use ★ to change it. Photos are uploaded when you save.
        </p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</legend>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_AMENITIES.map((amenity) => {
            const selected = amenities.some((item) => item.toLowerCase() === amenity.toLowerCase());
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                )}
              >
                {amenity}
              </button>
            );
          })}
          {customAmenities.map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary"
            >
              {amenity}
              <button
                type="button"
                onClick={() => toggleAmenity(amenity)}
                aria-label={`Remove ${amenity}`}
                className="rounded-full p-0.5 hover:bg-primary/15"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customAmenity}
            onChange={(event) => setCustomAmenity(event.target.value)}
            onKeyDown={onCustomAmenityKeyDown}
            placeholder="Add another amenity, e.g. Fireplace"
            maxLength={80}
            aria-label="Other amenity"
          />
          <Button type="button" variant="outline" onClick={addCustomAmenity} disabled={!customAmenity.trim()}>
            <Plus />
            Add
          </Button>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block font-medium">Visible on the booking site</span>
          <span className="block text-xs text-muted-foreground">
            When off, the room is hidden from guests and can&apos;t be booked.
          </span>
        </span>
      </label>

      <DialogFooter className="sm:justify-between">
        {room ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={busy}
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            <Trash2 />
            {confirmDelete ? "Click again to delete" : "Delete room"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ?? (room ? "Save changes" : "Create room")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
