import type { Booking, BookingSource, BookingStatus } from "./booking";

export type ApiErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface BookingFilters {
  status?: BookingStatus | BookingStatus[];
  source?: BookingSource | BookingSource[];
  roomId?: string;
  /** Returns bookings whose stay overlaps [from, to). ISO dates. */
  from?: string;
  to?: string;
  /** Case-insensitive match on guest name or booking code. */
  search?: string;
  sortBy?: "checkIn" | "createdAt";
  sortDir?: "asc" | "desc";
}

/** The server sets id, code, riadId and the timestamps. */
type ServerFields = "id" | "code" | "riadId" | "createdAt" | "updatedAt";
export type CreateBookingInput = Omit<Booking, ServerFields | "paid"> & { paid?: number };
export type UpdateBookingInput = Partial<Omit<Booking, ServerFields>>;

/** revenueThisMonth is null for STAFF (the backend must do the same). */
export interface DashboardStats {
  arrivalsToday: number;
  departuresToday: number;
  occupancyPct: number;
  revenueThisMonth: number | null;
}

export interface DashboardBooking extends Booking {
  roomName: string;
}

export interface OccupancyDay {
  date: string;
  /** Short label, e.g. "Wed 28". */
  label: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPct: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  arrivals: DashboardBooking[];
  departures: DashboardBooking[];
  inHouse: DashboardBooking[];
  /** Today + the next 13 nights. */
  occupancyDays: OccupancyDay[];
}

/** EXTRA: derived from bookings (grouped by email), not a stored entity. */
export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  bookingsCount: number;
  totalPaid: number;
  lastStay: string | null;
}
