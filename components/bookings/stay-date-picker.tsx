"use client";

import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { nightsBetween, toISODate, todayISO } from "@/lib/dates";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking } from "@/types";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * roomId → the nights ("YYYY-MM-DD") that are taken by a non-cancelled booking
 * or a blocked period. A stay [checkIn, checkOut) takes the nights checkIn … checkOut-1.
 */
export function buildTakenNights(bookings: Booking[], blocks: BlockedPeriod[], ignoreBookingId?: string) {
  const taken = new Map<string, Set<string>>();
  const mark = (roomId: string, from: string, to: string) => {
    const nights = taken.get(roomId) ?? new Set<string>();
    for (let day = parseISO(from); toISODate(day) < to; day = addDays(day, 1)) nights.add(toISODate(day));
    taken.set(roomId, nights);
  };

  for (const booking of bookings) {
    if (booking.status !== "CANCELLED" && booking.id !== ignoreBookingId) {
      mark(booking.roomId, booking.checkIn, booking.checkOut);
    }
  }
  for (const block of blocks) mark(block.roomId, block.from, block.to);

  return taken;
}

/** True when none of the nights in [checkIn, checkOut) is taken. */
export function isStayFree(takenNights: Set<string> | undefined, checkIn: string, checkOut: string) {
  if (!takenNights || !checkIn || !checkOut || checkIn >= checkOut) return true;
  for (let day = parseISO(checkIn); toISODate(day) < checkOut; day = addDays(day, 1)) {
    if (takenNights.has(toISODate(day))) return false;
  }
  return true;
}

/**
 * Inline calendar: click a check-in day, then a check-out day.
 * Taken nights can't start a stay, and a stay can't run across one.
 * Check-out may land on a taken night (the next guest arrives that day).
 */
export function StayDatePicker({
  checkIn,
  checkOut,
  takenNights,
  loading,
  onChange,
  onVisibleMonthChange,
}: {
  checkIn: string;
  checkOut: string;
  takenNights: Set<string>;
  loading?: boolean;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Lets the parent load availability for the month being looked at. */
  onVisibleMonthChange?: (monthStart: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(checkIn || todayISO())));
  const choosingCheckOut = Boolean(checkIn) && !checkOut;
  const today = todayISO();

  // The last day check-out can be: the first taken night after check-in.
  let latestCheckOut: string | null = null;
  if (choosingCheckOut) {
    for (let day = addDays(parseISO(checkIn), 1), i = 0; i < 400; day = addDays(day, 1), i++) {
      if (takenNights.has(toISODate(day))) {
        latestCheckOut = toISODate(day);
        break;
      }
    }
  }

  function showMonth(next: Date) {
    setMonth(next);
    onVisibleMonthChange?.(next);
  }

  function pick(day: string) {
    if (choosingCheckOut && day > checkIn) {
      onChange(checkIn, day);
    } else {
      onChange(day, ""); // start a new stay
    }
  }

  function isDisabled(day: string) {
    if (choosingCheckOut && day > checkIn) return latestCheckOut !== null && day > latestCheckOut;
    return takenNights.has(day); // can't start a stay on a taken night
  }

  const days: Date[] = [];
  for (
    let day = startOfWeek(month, { weekStartsOn: 1 });
    day <= endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    day = addDays(day, 1)
  ) {
    days.push(day);
  }

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => showMonth(addMonths(month, -1))}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="flex items-center gap-2 text-sm font-medium">
          {format(month, "MMMM yyyy")}
          {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading availability" /> : null}
        </p>
        <button
          type="button"
          onClick={() => showMonth(addMonths(month, 1))}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {weekday}
          </span>
        ))}
        {days.map((date) => {
          const day = toISODate(date);
          const inMonth = isSameMonth(date, month);
          const taken = takenNights.has(day);
          const disabled = isDisabled(day);
          const isEdge = day === checkIn || day === checkOut;
          const inRange = Boolean(checkIn && checkOut) && day > checkIn && day < checkOut;
          const checkOutOnly = taken && !disabled; // allowed only as the check-out day

          return (
            <button
              key={day}
              type="button"
              onClick={() => pick(day)}
              disabled={disabled}
              aria-pressed={isEdge}
              aria-label={`${format(date, "EEEE d MMMM yyyy")}${taken ? ", booked" : ""}`}
              title={taken ? (checkOutOnly ? "Booked from this night — check-out only" : "Booked or blocked") : undefined}
              className={cn(
                "relative h-9 rounded-md text-sm tabular-nums transition",
                !inMonth && "text-muted-foreground/50",
                day === today && !isEdge && "font-semibold underline underline-offset-4",
                inRange && "rounded-none bg-primary/15",
                isEdge && "bg-primary font-semibold text-primary-foreground",
                !isEdge && !inRange && !disabled && "hover:bg-muted",
                disabled && "cursor-not-allowed bg-destructive/10 text-destructive/50 line-through",
                checkOutOnly && !isEdge && "bg-destructive/5 text-destructive/70",
              )}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium">
          {checkIn ? format(parseISO(checkIn), "EEE d MMM") : "Check-in?"} →{" "}
          {checkOut ? format(parseISO(checkOut), "EEE d MMM") : <span className="text-primary">pick check-out</span>}
          {nights > 0 ? <span className="font-normal text-muted-foreground"> · {pluralize(nights, "night")}</span> : null}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block size-3 rounded-sm bg-destructive/15" aria-hidden="true" />
          Booked or blocked
        </p>
      </div>
    </div>
  );
}
