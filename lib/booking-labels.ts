import type { Booking, BookingSource, BookingStatus, BookingSyncStatus } from "@/types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
};

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  direct: "Direct",
  "booking.com": "Booking.com",
  "airbnb.com": "Airbnb.com",
  "riadna.ma": "Riadna.ma",
  phone: "Phone",
  "walk-in": "Walk-in",
};

export const BOOKING_SYNC_LABELS: Record<BookingSyncStatus, string> = {
  synced: "Synced",
  pending: "Sync pending",
  error: "Sync failed",
};

export function isExternalBooking(booking: Booking) {
  return booking.source !== "direct" && booking.source !== "phone" && booking.source !== "walk-in";
}
