import type { Booking, DashboardBooking, DashboardOverview, DashboardStats, OccupancyDay, Room, User } from "@/types";
import { db } from "@/lib/mock/db";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { toISODate, todayISO } from "@/lib/dates";
import { clone, delay, requireUser } from "./_internal";

const OCCUPANCY_DAYS = 14;

const isOccupying = (booking: Booking, date: string) =>
  (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && booking.checkIn <= date && booking.checkOut > date;

/**
 * Definitions the backend must copy:
 * - arrivals: checkIn = today, not cancelled
 * - departures: checkOut = today, not cancelled
 * - occupancy: rooms with a CONFIRMED or CHECKED_IN stay tonight / total rooms
 * - revenue: sum of `total` of non-cancelled bookings whose checkIn is this month (OWNER only, null for STAFF)
 */
function computeStats(user: User, bookings: Booking[], rooms: Room[], today: string): DashboardStats {
  const monthStart = toISODate(startOfMonth(new Date()));
  const monthEnd = toISODate(endOfMonth(new Date()));
  const occupied = new Set(bookings.filter((b) => isOccupying(b, today)).map((b) => b.roomId));
  return {
    arrivalsToday: bookings.filter((b) => b.checkIn === today).length,
    departuresToday: bookings.filter((b) => b.checkOut === today).length,
    occupancyPct: rooms.length ? Math.round((occupied.size / rooms.length) * 100) : 0,
    revenueThisMonth:
      user.role === "OWNER"
        ? bookings.filter((b) => b.checkIn >= monthStart && b.checkIn <= monthEnd).reduce((sum, b) => sum + b.total, 0)
        : null,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = requireUser();
  await delay();
  const today = todayISO();
  const mine = db.bookings.filter((b) => b.riadId === user.riadId && b.status !== "CANCELLED");
  const rooms = db.rooms.filter((r) => r.riadId === user.riadId);
  return computeStats(user, mine, rooms, today);
}

/** Everything the dashboard needs in one round trip. */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const user = requireUser();
  await delay();
  const today = todayISO();
  const mine = db.bookings.filter((b) => b.riadId === user.riadId && b.status !== "CANCELLED");
  const rooms = db.rooms.filter((r) => r.riadId === user.riadId);
  const roomNames = new Map(rooms.map((r) => [r.id, r.name]));

  const enrich = (b: Booking): DashboardBooking => ({ ...clone(b), roomName: roomNames.get(b.roomId) ?? "Room" });
  const byGuest = (a: Booking, b: Booking) => a.guestName.localeCompare(b.guestName);

  const occupancyDays: OccupancyDay[] = Array.from({ length: OCCUPANCY_DAYS }, (_, i) => {
    const date = toISODate(addDays(new Date(), i));
    const occupiedRooms = new Set(mine.filter((b) => isOccupying(b, date)).map((b) => b.roomId)).size;
    return {
      date,
      label: format(parseISO(date), "EEE d"),
      occupiedRooms,
      totalRooms: rooms.length,
      occupancyPct: rooms.length ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
    };
  });

  return {
    stats: computeStats(user, mine, rooms, today),
    arrivals: mine.filter((b) => b.checkIn === today).sort(byGuest).map(enrich),
    departures: mine.filter((b) => b.checkOut === today).sort(byGuest).map(enrich),
    inHouse: mine
      .filter((b) => b.status === "CHECKED_IN" && b.checkIn <= today && b.checkOut > today)
      .sort(byGuest)
      .map(enrich),
    occupancyDays,
  };
}
