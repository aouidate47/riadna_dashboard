"use client";

import { useState } from "react";
import { addDays, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { createBooking, updateBooking } from "@/lib/api";
import { ALLOWED_TRANSITIONS } from "@/lib/booking-status";
import { BOOKING_SOURCE_LABELS, BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { nightsBetween, toISODate, todayISO } from "@/lib/dates";
import { formatMoney, pluralize } from "@/lib/format";
import type { Booking, BookingSource, BookingStatus, CreateBookingInput, Room } from "@/types";
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

const SOURCES: BookingSource[] = ["direct", "booking.com", "airbnb.com", "riadna.ma", "phone", "walk-in"];
const NEW_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  rooms: Room[];
  defaults?: Partial<Pick<CreateBookingInput, "roomId" | "checkIn" | "checkOut">>;
  onSaved: (booking: Booking) => void;
}

export function BookingDialog({
  open,
  onOpenChange,
  booking,
  rooms,
  defaults,
  onSaved,
}: BookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <BookingForm
            key={`${booking?.id ?? "new"}-${defaults?.roomId ?? ""}-${defaults?.checkIn ?? ""}`}
            booking={booking}
            rooms={rooms}
            defaults={defaults}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({
  booking,
  rooms,
  defaults,
  onSaved,
  onCancel,
}: {
  booking?: Booking | null;
  rooms: Room[];
  defaults?: Partial<Pick<CreateBookingInput, "roomId" | "checkIn" | "checkOut">>;
  onSaved: (booking: Booking) => void;
  onCancel: () => void;
}) {
  const initialRoomId = booking?.roomId ?? defaults?.roomId ?? rooms[0]?.id ?? "";
  const initialRoom = rooms.find((room) => room.id === initialRoomId);
  const initialCheckIn = booking?.checkIn ?? defaults?.checkIn ?? todayISO();
  const initialCheckOut =
    booking?.checkOut ??
    defaults?.checkOut ??
    toISODate(addDays(parseISO(initialCheckIn), 1));
  const initialNights =
    initialCheckIn < initialCheckOut ? nightsBetween(initialCheckIn, initialCheckOut) : 0;

  const [roomId, setRoomId] = useState(initialRoomId);
  const [guestName, setGuestName] = useState(booking?.guestName ?? "");
  const [email, setEmail] = useState(booking?.email ?? "");
  const [phone, setPhone] = useState(booking?.phone ?? "");
  const [country, setCountry] = useState(booking?.country ?? "");
  const [guests, setGuests] = useState(booking?.guests ?? 1);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "PENDING");
  const [source, setSource] = useState<BookingSource>(booking?.source ?? "direct");
  const [total, setTotal] = useState(booking?.total ?? initialNights * (initialRoom?.price ?? 0));
  const [paid, setPaid] = useState(booking?.paid ?? 0);
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const nights = checkIn < checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const statusOptions = booking
    ? [booking.status, ...ALLOWED_TRANSITIONS[booking.status]]
    : NEW_STATUSES;

  function recalculateTotal(nextRoomId: string, nextCheckIn: string, nextCheckOut: string) {
    const room = rooms.find((item) => item.id === nextRoomId);
    const nextNights =
      nextCheckIn && nextCheckOut && nextCheckIn < nextCheckOut
        ? nightsBetween(nextCheckIn, nextCheckOut)
        : 0;
    setTotal(room ? nextNights * room.price : 0);
  }

  function changeRoom(nextRoomId: string) {
    setRoomId(nextRoomId);
    recalculateTotal(nextRoomId, checkIn, checkOut);
  }

  function changeCheckIn(nextCheckIn: string) {
    setCheckIn(nextCheckIn);
    recalculateTotal(roomId, nextCheckIn, checkOut);
  }

  function changeCheckOut(nextCheckOut: string) {
    setCheckOut(nextCheckOut);
    recalculateTotal(roomId, checkIn, nextCheckOut);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!guestName.trim()) return setError("Enter the guest's name.");
    if (!selectedRoom) return setError("Choose a room.");
    if (!checkIn || !checkOut) return setError("Choose both check-in and check-out dates.");
    if (checkIn >= checkOut) return setError("Check-out must be after check-in.");
    if (guests < 1 || guests > selectedRoom.capacity) {
      return setError(`${selectedRoom.name} sleeps ${pluralize(selectedRoom.capacity, "guest")} max.`);
    }
    if (!Number.isFinite(total) || !Number.isFinite(paid)) {
      return setError("Enter valid amounts.");
    }
    if (total < 0 || paid < 0) return setError("Amounts cannot be negative.");
    if (paid > total) return setError("Paid cannot be more than the total.");

    setSaving(true);
    try {
      const input: CreateBookingInput = {
        roomId,
        guestName: guestName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        guests,
        checkIn,
        checkOut,
        status,
        source,
        total,
        paid,
        notes: notes.trim() || undefined,
      };
      const saved = booking
        ? await updateBooking(booking.id, input)
        : await createBooking(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the booking.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{booking ? "Edit booking" : "New booking"}</DialogTitle>
        <DialogDescription>
          {booking
            ? `Update the stay for ${booking.guestName}${booking.code ? ` · ${booking.code}` : ""}.`
            : "Add a guest stay. Overlapping bookings are rejected automatically."}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guest
        </legend>
        <div className="grid gap-2">
          <Label htmlFor="booking-guest">Guest name</Label>
          <Input
            id="booking-guest"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="e.g. Amina El Fassi"
            autoFocus
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="booking-email">Email</Label>
            <Input
              id="booking-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="guest@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-phone">Phone</Label>
            <Input
              id="booking-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+212 6 00 00 00 00"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-country">Country</Label>
          <Input
            id="booking-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Morocco"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stay
        </legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
          <div className="grid gap-2">
            <Label htmlFor="booking-room">Room</Label>
            <Select
              id="booking-room"
              value={roomId}
              onChange={(event) => changeRoom(event.target.value)}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {formatMoney(room.price)}/night
                </option>
              ))}
            </Select>
            {selectedRoom ? (
              <p className="text-xs text-muted-foreground">
                Sleeps {pluralize(selectedRoom.capacity, "guest")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-guests">Guests</Label>
            <Input
              id="booking-guests"
              type="number"
              min={1}
              max={selectedRoom?.capacity}
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="booking-check-in">Check-in</Label>
            <Input
              id="booking-check-in"
              type="date"
              value={checkIn}
              onChange={(event) => changeCheckIn(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-check-out">Check-out</Label>
            <Input
              id="booking-check-out"
              type="date"
              min={checkIn ? toISODate(addDays(parseISO(checkIn), 1)) : undefined}
              value={checkOut}
              onChange={(event) => changeCheckOut(event.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {nights > 0 ? pluralize(nights, "night") : "Select valid dates"}
          {selectedRoom && nights > 0
            ? ` · ${formatMoney(nights * selectedRoom.price)} at the current room rate`
            : ""}
        </p>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Booking
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="booking-status">Status</Label>
            <Select
              id="booking-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as BookingStatus)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {BOOKING_STATUS_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-source">Source</Label>
            <Select
              id="booking-source"
              value={source}
              onChange={(event) => setSource(event.target.value as BookingSource)}
            >
              {SOURCES.map((option) => (
                <option key={option} value={option}>
                  {BOOKING_SOURCE_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="booking-total">Total (MAD)</Label>
            <Input
              id="booking-total"
              type="number"
              min={0}
              step={10}
              value={total}
              onChange={(event) => setTotal(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-paid">Paid (MAD)</Label>
            <Input
              id="booking-paid"
              type="number"
              min={0}
              max={total}
              step={10}
              value={paid}
              onChange={(event) => setPaid(Number(event.target.value))}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-notes">Notes</Label>
          <Textarea
            id="booking-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Preferences, arrival time, special requests…"
          />
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || rooms.length === 0}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {booking ? "Save changes" : "Create booking"}
        </Button>
      </DialogFooter>
    </form>
  );
}
