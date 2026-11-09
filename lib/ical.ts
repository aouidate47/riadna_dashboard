import { format, parseISO } from "date-fns";
import type { BlockedPeriod, Booking, Riad, Room } from "@/types";

const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 line folding (75 octets). */
function fold(line: string) {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

const icsDate = (iso: string) => format(parseISO(iso), "yyyyMMdd");
const stamp = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");

/**
 * Builds a single-room, date-only iCal feed of bookings and manual blocks.
 * Importing it elsewhere (Airbnb, Booking.com) will show these nights as busy.
 */
export function buildIcs({
  riad,
  room,
  bookings,
  blocks,
  now = new Date(),
}: {
  riad?: Pick<Riad, "name">;
  room?: Pick<Room, "id" | "name">;
  bookings: Booking[];
  blocks: BlockedPeriod[];
  now?: Date;
}): string {
  const name = [riad?.name, room?.name].filter(Boolean).join(" · ") || "Riadna availability";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Riadna//Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(name)}`),
  ];

  for (const booking of bookings) {
    if (booking.status === "CANCELLED") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${booking.id}@riadna.ma`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${icsDate(booking.checkIn)}`,
      `DTEND;VALUE=DATE:${icsDate(booking.checkOut)}`,
      fold(`SUMMARY:${escapeText(`Booked · ${booking.guestName}`)}`),
      fold(`DESCRIPTION:${escapeText(`${booking.code} · ${booking.status.toLowerCase()}`)}`),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  for (const block of blocks) {
    if (room && block.roomId !== room.id) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:block-${block.id}@riadna.ma`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${icsDate(block.from)}`,
      `DTEND;VALUE=DATE:${icsDate(block.to)}`,
      fold(`SUMMARY:${escapeText(`Blocked${block.reason ? ` · ${block.reason}` : ""}`)}`),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
