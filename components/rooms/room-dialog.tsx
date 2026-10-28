"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createRoom, updateRoom } from "@/lib/api";
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
  const [photoText, setPhotoText] = useState(room?.photos.join("\n") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter a room name.");
    if (!Number.isInteger(capacity) || capacity < 1) {
      return setError("Capacity must be a whole number of at least 1.");
    }
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid nightly rate.");

    const photos = photoText
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);
    const invalidPhoto = photos.find(
      (url) => !url.startsWith("/") && !/^https?:\/\//i.test(url),
    );
    if (invalidPhoto) return setError(`"${invalidPhoto}" is not a valid photo URL.`);

    setSaving(true);
    try {
      const payload = { name: name.trim(), capacity, price, photos };
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
        <Label htmlFor="room-photos">Photo URLs</Label>
        <Textarea
          id="room-photos"
          value={photoText}
          onChange={(event) => setPhotoText(event.target.value)}
          placeholder={"https://picsum.photos/seed/my-room/800/600\n/path/to/local-photo.jpg"}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          One URL per line. The first photo is used on the room card.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {room ? "Save changes" : "Create room"}
        </Button>
      </DialogFooter>
    </form>
  );
}
