import type { BookingSource, BookingStatus } from "@/types";

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
  airbnb: "Airbnb",
  phone: "Phone",
  "walk-in": "Walk-in",
};
