import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { BookingSource, BookingStatus, DashboardBooking } from "@/types";
import { cn, initials } from "@/lib/utils";

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-gold/15 text-foreground ring-1 ring-gold/30",
  CONFIRMED: "bg-primary/10 text-primary",
  CHECKED_IN: "bg-success/15 text-success",
  CHECKED_OUT: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const SOURCE_LABELS: Record<BookingSource, string> = {
  direct: "Direct",
  "booking.com": "Booking.com",
  "airbnb.com": "Airbnb.com",
  "riadna.ma": "Riadna.ma",
  phone: "Phone",
  "walk-in": "Walk-in",
};

export function BookingList({
  title,
  caption,
  icon: Icon,
  bookings,
  empty,
  meta,
  className,
}: {
  title: string;
  caption: string;
  icon: LucideIcon;
  bookings: DashboardBooking[];
  empty: string;
  meta?: (booking: DashboardBooking) => string;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-border bg-card shadow-sm", className)}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="truncate text-xs text-muted-foreground">{caption}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {bookings.length}
        </span>
      </header>

      {bookings.length === 0 ? (
        <p className="flex-1 px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {initials(b.guestName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.guestName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {meta
                    ? meta(b)
                    : `${b.roomName} · ${b.guests} guest${b.guests === 1 ? "" : "s"} · ${SOURCE_LABELS[b.source]}`}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_STYLES[b.status],
                )}
              >
                {STATUS_LABELS[b.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-border px-5 py-3">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all bookings
          <ArrowRight className="size-3.5" />
        </Link>
      </footer>
    </section>
  );
}
