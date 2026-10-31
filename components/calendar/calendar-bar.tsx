"use client";

import { useDraggable } from "@dnd-kit/core";
import { Ban, GripVertical } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking, BookingStatus } from "@/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "border-gold/50 bg-gold/25 text-foreground hover:bg-gold/35",
  CONFIRMED: "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/25",
  CHECKED_IN: "border-success/60 bg-success text-white hover:bg-success/90",
  CHECKED_OUT: "border-border bg-muted text-muted-foreground hover:bg-muted/80",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive line-through hover:bg-destructive/20",
};

export function CalendarBookingBar({
  booking,
  startIndex,
  endIndex,
  highlighted,
  onEdit,
}: {
  booking: Booking;
  startIndex: number;
  endIndex: number;
  highlighted?: boolean;
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
        "group pointer-events-auto mx-0.5 flex h-6 min-w-0 items-center overflow-hidden rounded-md border text-[10px] shadow-sm transition",
        STATUS_STYLES[booking.status],
        highlighted && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        isDragging && "opacity-40",
      )}
      title={`${booking.code ? `${booking.code} · ` : ""}${booking.guestName} · ${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)} · ${
        BOOKING_STATUS_LABELS[booking.status]
      }${booking.total > booking.paid ? ` · ${formatMoney(booking.total - booking.paid)} due` : ""}`}
    >
      {draggable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-full shrink-0 cursor-grab touch-none items-center px-0.5 opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-70"
          aria-label={`Move booking for ${booking.guestName}`}
        >
          <GripVertical className="size-3" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 truncate px-1 text-left text-[10px] font-semibold uppercase tracking-wide"
        aria-label={`Edit booking for ${booking.guestName}`}
      >
        {booking.guestName}
      </button>
      <PaymentStatusDot booking={booking} />
    </div>
  );
}

function PaymentStatusDot({ booking }: { booking: Booking }) {
  const due = booking.total - booking.paid;
  if (due <= 0) return null;
  return (
    <span
      title={`${formatMoney(due)} still due`}
      className={cn(
        "mr-1 size-1.5 shrink-0 rounded-full ring-1 ring-white/70",
        booking.paid > 0 ? "bg-gold" : "bg-destructive",
      )}
    />
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
      className="pointer-events-auto mx-0.5 flex h-6 min-w-0 items-center gap-1 overflow-hidden rounded-md border border-destructive bg-destructive px-1.5 text-[10px] font-medium text-white shadow-sm"
      title={`Blocked · ${formatDate(block.from)} → ${formatDate(block.to)}${block.reason ? ` · ${block.reason}` : ""}`}
    >
      <Ban className="size-3 shrink-0" />
      <span className="truncate">{block.reason || "Blocked"}</span>
    </div>
  );
}

export function CalendarDragPreview({ booking }: { booking: Booking }) {
  return (
    <div
      className={cn(
        "flex h-8 w-56 items-center gap-2 rounded-md border px-2 text-[10px] shadow-xl",
        STATUS_STYLES[booking.status],
      )}
    >
      <span className="truncate font-semibold uppercase tracking-wide">
        {booking.guestName}
      </span>
      <span className="ml-auto shrink-0 text-[10px] opacity-80">
        {BOOKING_STATUS_LABELS[booking.status]}
      </span>
    </div>
  );
}
