import type { BookingStatus } from "@/types";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-blue-100 text-blue-900",
  CHECKED_IN: "bg-emerald-100 text-emerald-900",
  CHECKED_OUT: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-100 text-red-900",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
