"use client";

import { useDraggable } from "@dnd-kit/core";
import { Ban, GripVertical } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking, BookingStatus } from "@/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200/80",
  CONFIRMED: "border-sky-300 bg-sky-100 text-sky-950 hover:bg-sky-200/80",
  CHECKED_IN: "border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700",
  CHECKED_OUT: "border-border bg-muted text-muted-foreground hover:bg-muted/80",
  CANCELLED: "border-red-200 bg-red-50 text-red-900/60 line-through hover:bg-red-100",
};

export function CalendarBookingBar({
  booking,
  startIndex,
  endIndex,
  onEdit,
}: {
  booking: Booking;
  startIndex: number;
  endIndex: number;
  onEdit: () => void;
}) {
  const draggable = booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `booking:${booking.id}`,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn: `${startIndex + 1} / ${endIndex + 1}` }}
      className={cn(
        "pointer-events-auto mx-1 flex h-9 min-w-0 items-center overflow-hidden rounded-md border text-xs shadow-sm transition",
        STATUS_STYLES[booking.status],
        isDragging && "opacity-40",
      )}
      title={`${booking.guestName} · ${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)} · ${
        BOOKING_STATUS_LABELS[booking.status]
      }`}
    >
      {draggable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-full shrink-0 cursor-grab touch-none items-center px-1 opacity-60 hover:opacity-100 active:cursor-grabbing"
          aria-label={`Move booking for ${booking.guestName}`}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 truncate px-1.5 text-left font-medium"
        aria-label={`Edit booking for ${booking.guestName}`}
      >
        {booking.guestName}
      </button>
    </div>
  );
}

export function CalendarBlockBar({
  block,
  startIndex,
  endIndex,
}: {
  block: BlockedPeriod;
  startIndex: number;
  endIndex: number;
}) {
  return (
    <div
      style={{ gridColumn: `${startIndex + 1} / ${endIndex + 1}` }}
      className="blocked-stripes pointer-events-auto mx-1 flex h-9 min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-dashed border-muted-foreground/40 px-2 text-xs text-muted-foreground"
      title={`Blocked · ${formatDate(block.from)} → ${formatDate(block.to)}${block.reason ? ` · ${block.reason}` : ""}`}
    >
      <Ban className="size-3.5 shrink-0" />
      <span className="truncate">{block.reason || "Blocked"}</span>
    </div>
  );
}

export function CalendarDragPreview({ booking }: { booking: Booking }) {
  return (
    <div className="flex h-10 w-56 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm shadow-xl">
      <span className="size-2 shrink-0 rounded-full bg-primary" />
      <span className="truncate font-medium">{booking.guestName}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {BOOKING_STATUS_LABELS[booking.status]}
      </span>
    </div>
  );
}
