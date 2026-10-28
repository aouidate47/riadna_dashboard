import type { Booking, BookingFilters, BookingStatus, CreateBookingInput, Paginated, UpdateBookingInput } from "@/types";
import { canTransition } from "@/lib/booking-status";
import { db } from "@/lib/mock/db";
import { clone, delay, findConflict, requireUser } from "./_internal";
import { ApiError } from "./errors";
import { datesOverlap } from "@/lib/dates";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const toArray = <T,>(v: T | T[] | undefined) => (v === undefined ? null : Array.isArray(v) ? v : [v]);

function applyFilters(riadId: string, f: BookingFilters): Booking[] {
  const statuses = toArray(f.status);
  const sources = toArray(f.source);
  const q = f.search ? norm(f.search.trim()) : "";
  const list = db.bookings.filter(
    (b) =>
      b.riadId === riadId &&
      (!statuses || statuses.includes(b.status)) &&
      (!sources || sources.includes(b.source)) &&
      (!f.roomId || b.roomId === f.roomId) &&
      (!q || norm(b.guestName).includes(q)) &&
      (!f.from || !f.to || datesOverlap(b.checkIn, b.checkOut, f.from, f.to)) &&
      (!f.from || f.to || b.checkOut > f.from) &&
      (!f.to || f.from || b.checkIn < f.to),
  );
  const key = f.sortBy ?? "checkIn";
  const dir = f.sortDir === "desc" ? -1 : 1;
  return list.sort((a, b) => a[key].localeCompare(b[key]) * dir);
}

function assertValidStay(roomId: string, checkIn: string, checkOut: string, guests: number, riadId: string) {
  const room = db.rooms.find((r) => r.id === roomId && r.riadId === riadId);
  if (!room) throw new ApiError("NOT_FOUND", "Room not found");
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) throw new ApiError("VALIDATION", "Dates must be YYYY-MM-DD");
  if (checkIn >= checkOut) throw new ApiError("VALIDATION", "Check-out must be after check-in");
  if (guests < 1 || guests > room.capacity) throw new ApiError("VALIDATION", `${room.name} sleeps ${room.capacity} guests max`);
}

function assertNoConflict(riadId: string, roomId: string, checkIn: string, checkOut: string, ignoreId?: string) {
  const c = findConflict(riadId, roomId, checkIn, checkOut, ignoreId);
  if (c) {
    const room = db.rooms.find((r) => r.id === roomId);
    const who = c.type === "booking" ? `booked by ${c.guestName}` : "blocked";
    throw new ApiError("CONFLICT", `${room?.name ?? "Room"} is already ${who} on these dates`, { conflictWith: c.id });
  }
}

/** All bookings matching the filters (the calendar uses this with from/to). */
export async function getBookings(filters: BookingFilters = {}): Promise<Booking[]> {
  const { riadId } = requireUser();
  await delay();
  return clone(applyFilters(riadId, filters));
}

/** Paginated version for the /bookings table. LATER: GET /bookings?page=&pageSize=&... */
export async function listBookings(filters: BookingFilters = {}, opts: { page?: number; pageSize?: number } = {}): Promise<Paginated<Booking>> {
  const { riadId } = requireUser();
  await delay();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const all = applyFilters(riadId, filters);
  return { items: clone(all.slice((page - 1) * pageSize, page * pageSize)), total: all.length, page, pageSize, pageCount: Math.max(1, Math.ceil(all.length / pageSize)) };
}

export async function getBooking(id: string): Promise<Booking> {
  const { riadId } = requireUser();
  await delay();
  const b = db.bookings.find((x) => x.id === id && x.riadId === riadId); // other riads' ids are simply "not found"
  if (!b) throw new ApiError("NOT_FOUND", "Booking not found");
  return clone(b);
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { riadId } = requireUser();
  await delay();
  assertValidStay(input.roomId, input.checkIn, input.checkOut, input.guests, riadId);
  if (input.status !== "CANCELLED") assertNoConflict(riadId, input.roomId, input.checkIn, input.checkOut);
  const n = db.bookings.filter((b) => b.riadId === riadId).length + 1;
  const booking: Booking = { ...input, paid: input.paid ?? 0, id: `${riadId}_bk_${String(n).padStart(3, "0")}_${Date.now().toString(36)}`, riadId, createdAt: new Date().toISOString() };
  db.bookings.push(booking);
  return clone(booking);
}

/** Used by the edit form and by calendar drag & drop (roomId / checkIn / checkOut). */
export async function updateBooking(id: string, patch: UpdateBookingInput): Promise<Booking> {
  const { riadId } = requireUser();
  await delay();
  const b = db.bookings.find((x) => x.id === id && x.riadId === riadId);
  if (!b) throw new ApiError("NOT_FOUND", "Booking not found");
  const next = { ...b, ...patch };
  assertValidStay(next.roomId, next.checkIn, next.checkOut, next.guests, riadId);
  if (patch.status && patch.status !== b.status && !canTransition(b.status, patch.status)) {
    throw new ApiError("VALIDATION", `Cannot go from ${b.status} to ${patch.status}`);
  }
  if (next.status !== "CANCELLED") assertNoConflict(riadId, next.roomId, next.checkIn, next.checkOut, id);
  Object.assign(b, next);
  return clone(b);
}

/** Confirm / check-in / check-out / cancel buttons. Enforces ALLOWED_TRANSITIONS. */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  return updateBooking(id, { status });
}
