import type { BookingStatus } from "@/types";
import { BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-gold/15 text-foreground ring-1 ring-gold/30",
  CONFIRMED: "bg-success/15 text-success",
  CHECKED_IN: "bg-success/15 text-success",
  CHECKED_OUT: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
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
