import type { BookingStatus } from "@/types";

/** Single source of truth for allowed status changes (used by the API now, by UI buttons later). */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus) => ALLOWED_TRANSITIONS[from].includes(to);
