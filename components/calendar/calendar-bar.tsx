"use client";

import { useDraggable } from "@dnd-kit/core";
import { Ban, GripVertical } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking, BookingStatus } from "@/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "border-amber-400 bg-amber-300 text-amber-950 hover:bg-amber-400",
  CONFIRMED: "border-sky-400 bg-sky-300 text-sky-950 hover:bg-sky-400",
  CHECKED_IN: "border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700",
  CHECKED_OUT: "border-slate-400 bg-slate-300 text-slate-700 hover:bg-slate-400",
  CANCELLED: "border-red-300 bg-red-100 text-red-700 line-through hover:bg-red-200",
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
        "group pointer-events-auto mx-0.5 flex h-6 min-w-0 items-center overflow-hidden rounded-md border text-[10px] shadow-sm transition",
        STATUS_STYLES[booking.status],
        isDragging && "opacity-40",
      )}
      title={`${booking.guestName} · ${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)} · ${
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
        booking.paid > 0 ? "bg-amber-400" : "bg-red-500",
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
      className="pointer-events-auto mx-0.5 flex h-6 min-w-0 items-center gap-1 overflow-hidden rounded-md border border-red-600 bg-red-500 px-1.5 text-[10px] font-medium text-white shadow-sm"
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
