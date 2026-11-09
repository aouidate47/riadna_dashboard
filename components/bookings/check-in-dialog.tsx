"use client";

import { useState } from "react";
import { AlertCircle, IdCard, Loader2 } from "lucide-react";
import { checkInBooking } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Booking, CheckInIdType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ID_TYPES: { value: CheckInIdType; label: string }[] = [
  { value: "passport", label: "Passport" },
  { value: "national-id", label: "National ID" },
  { value: "driver-license", label: "Driver's licence" },
];

export function CheckInDialog({
  open,
  onOpenChange,
  booking,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && booking ? (
          <CheckInForm key={booking.id} booking={booking} onDone={onDone} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CheckInForm({
  booking,
  onDone,
  onClose,
}: {
  booking: Booking;
  onDone: () => void;
  onClose: () => void;
}) {
  const [idType, setIdType] = useState<CheckInIdType>("passport");
  const [idNumber, setIdNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!idNumber.trim()) return setError("Enter the guest's ID number.");
    setSaving(true);
    setError(null);
    try {
      await checkInBooking(booking.id, { idType, idNumber });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check the guest in.");
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Check in {booking.guestName}</DialogTitle>
        <DialogDescription>
          {booking.code} · arriving {formatDate(booking.checkIn)} · {booking.guests} guest{booking.guests === 1 ? "" : "s"}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 rounded-md border border-border p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="checkin-id-type">ID document</Label>
          <Select id="checkin-id-type" value={idType} onChange={(event) => setIdType(event.target.value as CheckInIdType)}>
            {ID_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="checkin-id-number">Document number</Label>
          <Input
            id="checkin-id-number"
            value={idNumber}
            onChange={(event) => setIdNumber(event.target.value)}
            placeholder="e.g. 123456789"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Kept on the booking for the guest register (demo: stored in memory only).
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <IdCard />}
          Check in guest
        </Button>
      </div>
    </>
  );
}
