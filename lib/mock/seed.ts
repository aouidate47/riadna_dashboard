import { addDays, addMonths, differenceInCalendarDays, endOfMonth, startOfMonth, subDays } from "date-fns";
import type { BlockedPeriod, Booking, BookingSource, BookingStatus, Riad, Room } from "@/types";
import { datesOverlap, nightsBetween, toISODate } from "@/lib/dates";
import { GUEST_POOL, MOCK_USERS, NOTES, RIAD_CONFIGS } from "./data";
import { mulberry32 } from "./rng";

type Draft = Omit<Booking, "id">;
const MAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com"];
const SOURCES: [BookingSource, number][] = [["direct", 0.3], ["booking.com", 0.3], ["airbnb.com", 0.2], ["riadna.ma", 0.1], ["phone", 0.12], ["walk-in", 0.08]];

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const round10 = (n: number) => Math.round(n / 10) * 10;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");

/** Builds a fresh dataset relative to "now": bookings span the current month and the next one. */
export function buildSeed(now = new Date()) {
  const todayStr = toISODate(now);
  const winStart = startOfMonth(now);
  const winEnd = endOfMonth(addMonths(now, 1));
  const winDays = differenceInCalendarDays(winEnd, winStart) + 1;
  const day = (offset: number) => toISODate(addDays(now, offset));

  const riads: Riad[] = [];
  const rooms: Room[] = [];
  const bookings: Booking[] = [];
  const blocks: BlockedPeriod[] = [];

  for (const cfg of RIAD_CONFIGS) {
    const rnd = mulberry32(cfg.seed);
    const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
    const riadId = cfg.riad.id;

    riads.push({ ...cfg.riad });
    const riadRooms: Room[] = cfg.rooms.map((r, i) => {
      const id = `${riadId}_room_${i + 1}`;
      return {
        id, riadId, name: r.name, capacity: r.capacity, price: r.price,
        photos: [1, 2].map((k) => `https://picsum.photos/seed/${id}-${k}/800/600`),
        description: "",
        beds: r.capacity >= 3 ? "1 double bed, 1 single bed" : "1 double bed",
        size: 14 + r.capacity * 4,
        amenities: [
          "Wi-Fi",
          "Air conditioning",
          "Heating",
          r.price >= 900 ? "Private bathroom" : "Shared bathroom",
          ...(r.price >= 900 ? ["Breakfast included"] : []),
          ...(r.capacity >= 3 ? ["Terrace"] : []),
          ...(r.price >= 1000 ? ["TV"] : []),
        ],
        isActive: true,
        sortOrder: i,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    });
    rooms.push(...riadRooms);

    const drafts: Draft[] = [];
    const isFree = (roomId: string, ci: string, co: string) =>
      !drafts.some((b) => b.roomId === roomId && datesOverlap(ci, co, b.checkIn, b.checkOut)) &&
      !blocks.some((b) => b.roomId === roomId && datesOverlap(ci, co, b.from, b.to));

    const derive = (ci: string, co: string): BookingStatus => {
      if (rnd() < 0.07) return "CANCELLED";
      if (co <= todayStr) return "CHECKED_OUT";
      if (ci <= todayStr) return "CHECKED_IN";
      return rnd() < 0.25 ? "PENDING" : "CONFIRMED";
    };
    const pickSource = (): BookingSource => {
      let r = rnd();
      for (const [s, w] of SOURCES) { if ((r -= w) < 0) return s; }
      return "direct";
    };

    const make = (room: Room, ci: string, co: string, forced?: BookingStatus) => {
      const status = forced ?? derive(ci, co);
      const g = pick(GUEST_POOL);
      const guests = Math.min(room.capacity, int(1, room.capacity));
      const total = nightsBetween(ci, co) * room.price;
      let paid = 0;
      if (status === "CHECKED_OUT") paid = total;
      else if (status === "CHECKED_IN") paid = rnd() < 0.5 ? total : round10(total * 0.5);
      else if (status === "CONFIRMED") paid = rnd() < 0.5 ? round10(total * 0.3) : 0;
      const created = subDays(new Date(ci), int(3, 40));
      drafts.push({
        code: `RDN-${Array.from({ length: 6 }, () => pick(CODE_ALPHABET)).join("")}`,
        riadId, roomId: room.id, guestName: g.name, email: `${slugify(g.name)}@${pick(MAIL_DOMAINS)}`,
        phone: `${g.dial} ${int(100, 999)} ${int(100, 999)} ${int(100, 999)}`, country: g.country, guests,
        adults: guests, children: 0, arrivalTime: null, specialRequests: "",
        checkIn: ci, checkOut: co, status, source: pickSource(), total, paid,
        roomTotal: null, experiencesTotal: 0, touristTax: 0, experiences: [],
        notes: rnd() < 0.25 ? pick(NOTES) : undefined,
        createdAt: (created > now ? now : created).toISOString(),
      });
    };

    // Anchors so the dashboard always has something for "today"
    make(riadRooms[0], day(-2), day(0), "CHECKED_IN"); // departing today
    make(riadRooms[1], day(0), day(2), "CONFIRMED"); // arriving today
    make(riadRooms[2], day(-1), day(3), "CHECKED_IN"); // in house

    // Random fill, never overlapping
    for (let attempt = 0; drafts.length < cfg.bookingCount && attempt < 3000; attempt++) {
      const room = pick(riadRooms);
      const ci = toISODate(addDays(winStart, int(0, winDays - 1)));
      const co = toISODate(addDays(new Date(ci), int(1, 5)));
      if (isFree(room.id, ci, co)) make(room, ci, co);
    }

    // One maintenance block next month on the last room
    const last = riadRooms[riadRooms.length - 1];
    for (let attempt = 0; attempt < 200; attempt++) {
      const from = toISODate(addDays(startOfMonth(addMonths(now, 1)), int(0, 24)));
      const to = toISODate(addDays(new Date(from), int(2, 3)));
      if (isFree(last.id, from, to)) {
        blocks.push({ id: `${riadId}_block_1`, riadId, roomId: last.id, from, to, reason: "Maintenance" });
        break;
      }
    }

    drafts
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.roomId.localeCompare(b.roomId))
      .forEach((d, i) => bookings.push({ id: `${riadId}_bk_${String(i + 1).padStart(3, "0")}`, ...d }));
  }

  return { riads, rooms, bookings, blocks, users: MOCK_USERS.map((u) => ({ ...u })) };
}
