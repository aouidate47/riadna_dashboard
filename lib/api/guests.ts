import type { Guest } from "@/types";
import { db } from "@/lib/mock/db";
import { clone, delay, requireUser } from "./_internal";

/** Guests are derived from bookings (grouped by email). LATER: GET /guests. */
export async function getGuests(): Promise<Guest[]> {
  const { riadId } = requireUser();
  await delay();
  const map = new Map<string, Guest>();
  for (const b of db.bookings.filter((x) => x.riadId === riadId)) {
    const key = b.email.toLowerCase();
    const g = map.get(key) ?? { id: key, name: b.guestName, email: b.email, phone: b.phone, country: b.country, bookingsCount: 0, totalPaid: 0, lastStay: null };
    if (b.status !== "CANCELLED") {
      g.bookingsCount += 1;
      g.totalPaid += b.paid;
      if (!g.lastStay || b.checkOut > g.lastStay) g.lastStay = b.checkOut;
    }
    map.set(key, g);
  }
  return clone([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
}
