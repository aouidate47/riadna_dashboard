"use client";

import { useState } from "react";
import { addDays, parseISO } from "date-fns";
import { Ban, Loader2, Plus, Trash2 } from "lucide-react";
import { createBlockedPeriod, deleteBlockedPeriod } from "@/lib/api";
import { toISODate, todayISO } from "@/lib/dates";
import { formatDate, pluralize } from "@/lib/format";
import type { BlockedPeriod, Room } from "@/types";
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

export function BlockedDatesDialog({
  open,
  onOpenChange,
  room,
  blocks,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  blocks: BlockedPeriod[];
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && room ? (
          <BlockedDatesForm
            key={room.id}
            room={room}
            blocks={blocks}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BlockedDatesForm({
  room,
  blocks,
  onChanged,
  onClose,
}: {
  room: Room;
  blocks: BlockedPeriod[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(toISODate(addDays(parseISO(today), 1)));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!from || !to) return setError("Choose both dates.");
    if (from >= to) return setError("The end date must be after the start date.");

    setSaving(true);
    try {
      await createBlockedPeriod({
        roomId: room.id,
        from,
        to,
        reason: reason.trim() || undefined,
      });
      setReason("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block these dates.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(block: BlockedPeriod) {
    setDeletingId(block.id);
    setError(null);
    try {
      await deleteBlockedPeriod(block.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the block.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Blocked dates</DialogTitle>
        <DialogDescription>
          Close {room.name} for maintenance or private use. Blocked dates cannot be booked.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Current blocks</h3>
          <span className="text-xs text-muted-foreground">
            {pluralize(blocks.length, "block")}
          </span>
        </div>
        {blocks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            No blocked dates for this room.
          </p>
        ) : (
          <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Ban className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {formatDate(block.from, "d MMM")} → {formatDate(block.to, "d MMM yyyy")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {block.reason || "No reason given"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeBlock(block)}
                  disabled={deletingId === block.id}
                  aria-label={`Remove block from ${formatDate(block.from)} to ${formatDate(block.to)}`}
                >
                  {deletingId === block.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={addBlock} noValidate className="grid gap-4 rounded-md border border-border bg-muted/20 p-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="block-from">From</Label>
            <Input
              id="block-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="block-to">To</Label>
            <Input
              id="block-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="block-reason">Reason</Label>
          <Input
            id="block-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Maintenance, private stay…"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The end date is the first night the room is available again.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Add block
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
