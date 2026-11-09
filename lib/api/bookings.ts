import type { Booking, BookingFilters, BookingStatus, CreateBookingInput, Paginated, UpdateBookingInput } from "@/types";
import { requireUser } from "./_internal";
import { http } from "./http";

const bookingsPath = () => `/applications/${requireUser().riadId}/riadna/bookings`;

const toList = <T,>(value: T | T[] | undefined) =>
  value === undefined ? undefined : (Array.isArray(value) ? value : [value]).join(",");

/** Builds "?a=1&b=2", skipping empty values. */
function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/**
 * Every booking overlapping [from, to), not paginated (the calendar and the
 * rooms page use this). GET …/bookings/range
 */
export async function getBookings(filters: { from: string; to: string; roomId?: string }): Promise<Booking[]> {
  return http<Booking[]>(`${bookingsPath()}/range${queryString(filters)}`);
}

/** Paginated list for the /bookings table. GET …/bookings */
/** Bookings made by guests on the booking site arrive with this source. */
export const WEBSITE_SOURCE = "riadna.ma" satisfies Booking["source"];

/** How many website bookings are still PENDING (waiting for the riad to confirm or cancel). */
export async function countNewOnlineBookings(): Promise<number> {
  const { total } = await listBookings({ status: "PENDING", source: WEBSITE_SOURCE }, { page: 1, pageSize: 1 });
  return total;
}

export async function listBookings(
  filters: BookingFilters = {},
  opts: { page?: number; pageSize?: number } = {},
): Promise<Paginated<Booking>> {
  return http<Paginated<Booking>>(
    bookingsPath() +
      queryString({
        page: opts.page,
        pageSize: opts.pageSize,
        search: filters.search?.trim(),
        status: toList(filters.status),
        source: toList(filters.source),
        roomId: filters.roomId,
        from: filters.from,
        to: filters.to,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      }),
  );
}

export async function getBooking(id: string): Promise<Booking> {
  return http<Booking>(`${bookingsPath()}/${id}`);
}

/** POST …/bookings — 409 if the room is already booked or blocked on those dates. */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  return http<Booking>(bookingsPath(), { method: "POST", body: JSON.stringify(input) });
}

/** Used by the edit form and by calendar drag & drop (roomId / checkIn / checkOut). PATCH …/bookings/:id */
export async function updateBooking(id: string, patch: UpdateBookingInput): Promise<Booking> {
  return http<Booking>(`${bookingsPath()}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** Confirm / check-in / check-out / cancel buttons. The server enforces the allowed transitions. */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  return updateBooking(id, { status });
}
