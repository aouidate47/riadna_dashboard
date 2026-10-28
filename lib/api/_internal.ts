import { datesOverlap } from "@/lib/dates";
import { session } from "@/lib/auth/session";
import { db } from "@/lib/mock/db";
import { ApiError } from "./errors";

/** Fake network latency (browser only, so Node tests stay instant). */
export const delay = (ms = 120) =>
  typeof window === "undefined" ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms + Math.random() * 120));

/** Mock DB returns copies, like a real API would. */
export const clone = <T,>(v: T): T => structuredClone(v);

/** Mock-only: in the real API the backend reads riadId from the JWT. Components never see this. */
export function requireUser() {
  const s = session.get();
  if (!s) throw new ApiError("UNAUTHORIZED", "You must be logged in");
  return s.user;
}

export function requireOwner() {
  const u = requireUser();
  if (u.role !== "OWNER") throw new ApiError("FORBIDDEN", "Owner access required");
  return u;
}

/** Finds a booking or a blocked period that collides with the requested stay. */
export function findConflict(riadId: string, roomId: string, checkIn: string, checkOut: string, ignoreBookingId?: string) {
  const booking = db.bookings.find(
    (b) => b.riadId === riadId && b.roomId === roomId && b.id !== ignoreBookingId && b.status !== "CANCELLED" &&
      datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
  );
  if (booking) return { type: "booking" as const, id: booking.id, guestName: booking.guestName };
  const block = db.blocks.find((b) => b.riadId === riadId && b.roomId === roomId && datesOverlap(checkIn, checkOut, b.from, b.to));
  if (block) return { type: "block" as const, id: block.id, guestName: undefined };
  return null;
}
