"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { addDays, differenceInCalendarDays, format, getDay, parseISO } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  CalendarBlockBar,
  CalendarBookingBar,
  CalendarDragPreview,
} from "@/components/calendar/calendar-bar";
import { BookingDialog } from "@/components/bookings/booking-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBlockedPeriods, getBookings, getRooms, updateBooking } from "@/lib/api";
import { BOOKING_SOURCE_LABELS, BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { nightsBetween, toISODate, todayISO } from "@/lib/dates";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking, CreateBookingInput, Room } from "@/types";

const DAYS = 14;

const LEGEND = [
  { label: "Pending", className: "bg-gold/40" },
  { label: "Confirmed", className: "bg-primary/30" },
  { label: "Checked in", className: "bg-success" },
  { label: "Checked out", className: "bg-muted-foreground/30" },
  { label: "Cancelled", className: "bg-destructive/30" },
  { label: "Blocked", className: "bg-destructive" },
];

interface DialogState {
  booking: Booking | null;
  defaults?: Partial<Pick<CreateBookingInput, "roomId" | "checkIn" | "checkOut">>;
}

interface DayStats {
  occupied: number;
  occupancy: number;
  arrivals: number;
  departures: number;
}

interface MonthSegment {
  key: string;
  label: string;
  start: number;
  end: number;
}

const isWeekendDate = (date: string) => {
  const day = getDay(parseISO(date));
  return day === 0 || day === 6;
};

export default function Page() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(() => parseISO(todayISO()));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dragBooking, setDragBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const rangeDayWidth = useRef(0);
  const [rangePreviewDays, setRangePreviewDays] = useState(0);
  const [isRangeDragging, setIsRangeDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const days = Array.from({ length: DAYS }, (_, index) =>
    toISODate(addDays(startDate, index)),
  );
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))`,
  };
  const rangeLabel = `${format(startDate, "d MMM")} – ${format(addDays(startDate, DAYS - 1), "d MMM yyyy")}`;

  const dayStats = days.reduce<Record<string, DayStats>>((stats, date) => {
    const occupied = bookings.filter(
      (booking) =>
        (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") &&
        booking.checkIn <= date &&
        booking.checkOut > date,
    ).length;
    stats[date] = {
      occupied,
      occupancy: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
      arrivals: bookings.filter(
        (booking) => booking.checkIn === date && booking.status !== "CANCELLED",
      ).length,
      departures: bookings.filter(
        (booking) => booking.checkOut === date && booking.status !== "CANCELLED",
      ).length,
    };
    return stats;
  }, {});

  const monthSegments = days.reduce<MonthSegment[]>((segments, date, index) => {
    const key = format(parseISO(date), "yyyy-MM");
    const current = segments[segments.length - 1];
    if (current && current.key === key) {
      current.end = index + 1;
    } else {
      segments.push({
        key,
        label: format(parseISO(date), "MMM yyyy"),
        start: index,
        end: index + 1,
      });
    }
    return segments;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const from = toISODate(startDate);
    const to = toISODate(addDays(startDate, DAYS));

    Promise.all([getRooms(), getBookings({ from, to }), getBlockedPeriods()])
      .then(([roomData, bookingData, blockData]) => {
        if (cancelled) return;
        setRooms(roomData);
        setBookings(bookingData);
        setBlocks(blockData);
        setError(null);
        setLoading(false);
        setDataReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the calendar.");
        setLoading(false);
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, startDate, refreshKey]);

  function shiftRange(offset: number) {
    setLoading(true);
    setError(null);
    setStartDate((current) => addDays(current, offset));
  }

  function goToToday() {
    setLoading(true);
    setError(null);
    setStartDate(parseISO(todayISO()));
  }

  function handleRangeDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    if (!width) return;
    rangeDayWidth.current = width / DAYS;
    rangeDragStartX.current = event.clientX;
    setIsRangeDragging(true);
    setRangePreviewDays(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRangeDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (rangeDragStartX.current === null) return;
    setRangePreviewDays(
      Math.round(-(event.clientX - rangeDragStartX.current) / rangeDayWidth.current),
    );
  }

  function handleRangeDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (rangeDragStartX.current === null) return;
    const deltaX = event.clientX - rangeDragStartX.current;
    rangeDragStartX.current = null;
    setIsRangeDragging(false);
    setRangePreviewDays(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const dayWidth = rangeDayWidth.current;
    if (!dayWidth) return;
    const daysShifted = Math.round(-deltaX / dayWidth);
    if (daysShifted === 0) return;
    setLoading(true);
    setError(null);
    setStartDate((current) => addDays(current, daysShifted));
  }

  function handleRangeDragCancel(event: ReactPointerEvent<HTMLDivElement>) {
    rangeDragStartX.current = null;
    setIsRangeDragging(false);
    setRangePreviewDays(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  function openNewBooking(roomId?: string, date?: string) {
    const checkIn = date ?? toISODate(startDate);
    const targetRoomId = roomId ?? rooms[0]?.id;
    if (!targetRoomId) return;
    setNotice(null);
    setDialog({
      booking: null,
      defaults: {
        roomId: targetRoomId,
        checkIn,
        checkOut: toISODate(addDays(parseISO(checkIn), 1)),
      },
    });
  }

  function openEditBooking(booking: Booking) {
    setNotice(null);
    setDialog({ booking });
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = search.trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setHighlightedId(null);

    try {
      const all = await getBookings();
      const found = all.find(
        (booking) =>
          booking.code?.toUpperCase() === code ||
          booking.id.toUpperCase() === `EXT_${code}` ||
          booking.id.toUpperCase().endsWith(`_${code}`),
      );
      if (!found) {
        setSearchError(`No reservation found for ${code}.`);
        return;
      }

      setSearchResult(found);
      setHighlightedId(found.id);
      setStartDate(parseISO(found.checkIn));
      setLoading(true);
      setError(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Could not search reservations.");
    } finally {
      setSearching(false);
    }
  }

  function handleSaved(saved: Booking) {
    const from = toISODate(startDate);
    const to = toISODate(addDays(startDate, DAYS));
    setDialog(null);
    setError(null);
    setNotice(`Booking for ${saved.guestName} saved.`);
    setLoading(true);
    if (saved.checkIn >= to || saved.checkOut <= from) {
      setStartDate(parseISO(saved.checkIn));
    } else {
      setRefreshKey((key) => key + 1);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (!id.startsWith("booking:")) return;
    setDragBooking(bookings.find((booking) => booking.id === id.slice("booking:".length)) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDragBooking(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!activeId.startsWith("booking:") || !overId?.startsWith("cell:")) return;

    const booking = bookings.find((item) => item.id === activeId.slice("booking:".length));
    const [, targetRoomId, targetDate] = overId.split(":");
    if (!booking || !targetRoomId || !targetDate) return;
    if (booking.roomId === targetRoomId && booking.checkIn === targetDate) return;

    const offset = differenceInCalendarDays(parseISO(targetDate), parseISO(booking.checkIn));
    const nextCheckOut = toISODate(addDays(parseISO(booking.checkOut), offset));

    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await updateBooking(booking.id, {
        roomId: targetRoomId,
        checkIn: targetDate,
        checkOut: nextCheckOut,
      });
      const room = rooms.find((item) => item.id === targetRoomId);
      setNotice(
        `${booking.guestName} moved to ${room?.name ?? "another room"} on ${format(
          parseISO(targetDate),
          "d MMM",
        )}.`,
      );
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the booking.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Room calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(DAYS, "night")} · {rangeLabel}
            {loading ? <Loader2 className="ml-2 inline size-3.5 animate-spin" /> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (searchError) setSearchError(null);
              }}
              placeholder="Booking code"
              aria-label="Search by booking code"
              title="Search by booking code (press Enter)"
              enterKeyHint="search"
              autoCapitalize="characters"
              className="h-8 w-40 pl-8 pr-8"
            />
            {searching ? (
              <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </form>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-r-none"
              onClick={() => shiftRange(-DAYS)}
              disabled={loading}
              aria-label="Previous two weeks"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-none border-x-0"
              onClick={goToToday}
              disabled={loading}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-l-none"
              onClick={() => shiftRange(DAYS)}
              disabled={loading}
              aria-label="Next two weeks"
            >
              <ChevronRight />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => openNewBooking()} disabled={rooms.length === 0}>
            <Plus />
            New booking
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={refresh} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {searchError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{searchError}</span>
          <button
            type="button"
            onClick={() => setSearchError(null)}
            aria-label="Dismiss search error"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {searchResult ? (
        <BookingLookupCard
          booking={searchResult}
          room={rooms.find((room) => room.id === searchResult.roomId)}
          onOpen={() => openEditBooking(searchResult)}
          onClear={() => {
            setSearchResult(null);
            setHighlightedId(null);
            setSearch("");
          }}
        />
      ) : null}

      {!dataReady ? (
        <CalendarSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragBooking(null)}
        >
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {rooms.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm text-muted-foreground">
                No rooms are available yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  <div className="flex border-b border-border bg-muted/20">
                    <div className="sticky left-0 z-20 flex w-44 shrink-0 items-center border-r border-border bg-muted/20 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {isRangeDragging ? (
                        <span className="tabular-nums">
                          {rangePreviewDays === 0
                            ? "Drag…"
                            : rangePreviewDays > 0
                              ? `+${rangePreviewDays} days`
                              : `${rangePreviewDays} days`}
                        </span>
                      ) : null}
                    </div>
                    <div
                      role="group"
                      aria-label="Move the two-week range"
                      title="Drag left or right to move the two-week range"
                      className="grid flex-1 cursor-grab touch-none select-none active:cursor-grabbing"
                      style={gridStyle}
                      onPointerDown={handleRangeDragStart}
                      onPointerMove={handleRangeDragMove}
                      onPointerUp={handleRangeDragEnd}
                      onPointerCancel={handleRangeDragCancel}
                    >
                      {monthSegments.map((segment) => (
                        <div
                          key={segment.key}
                          style={{ gridColumn: `${segment.start + 1} / ${segment.end + 1}` }}
                          className="truncate border-l border-border/70 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide first:border-l-0"
                        >
                          {segment.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex border-b border-border bg-muted/30">
                    <div className="sticky left-0 z-20 flex w-44 shrink-0 items-center border-r border-border bg-muted/30 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Room
                    </div>
                    <div className="grid flex-1" style={gridStyle}>
                      {days.map((date) => {
                        const isToday = date === todayISO();
                        const weekend = isWeekendDate(date);
                        const stats = dayStats[date];
                        return (
                          <div
                            key={date}
                            title={`${stats.occupied} of ${rooms.length} rooms occupied · ${stats.arrivals} arrivals · ${stats.departures} departures`}
                            className={cn(
                              "border-l border-border/70 px-1 py-2 text-center first:border-l-0",
                              weekend && !isToday && "bg-muted/40",
                              isToday && "bg-primary/5",
                            )}
                          >
                            <p
                              className={cn(
                                "text-[10px] uppercase tracking-wide",
                                isToday ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {format(parseISO(date), "EEE")}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 inline-flex min-w-8 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                                isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                              )}
                            >
                              {format(parseISO(date), "d")}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[10px] font-medium tabular-nums",
                                isToday ? "text-primary" : "text-muted-foreground",
                              )}
                            >
                              {stats.occupancy}%
                            </p>
                            <span
                              title={`${stats.arrivals} arrivals`}
                              className={cn(
                                "mt-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                stats.arrivals > 0
                                  ? "bg-gold/15 text-foreground"
                                  : isToday
                                    ? "bg-gold/15 text-foreground"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {stats.arrivals}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cn("transition-opacity", loading && "opacity-60")}>
                    {rooms.map((room) => {
                      const roomBookings = bookings.filter(
                        (booking) => booking.roomId === room.id,
                      );
                      const roomBlocks = blocks.filter((block) => block.roomId === room.id);

                      return (
                        <div key={room.id} className="flex border-b border-border last:border-b-0">
                          <div className="sticky left-0 z-20 w-44 shrink-0 border-r border-border bg-card px-3 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium" title={room.name}>
                                {room.name}
                              </p>
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                {room.capacity}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {formatMoney(room.price)} / night
                            </p>
                          </div>
                          <div className="relative flex-1">
                            <div className="grid h-11" style={gridStyle}>
                              {days.map((date) => (
                                <CalendarDayCell
                                  key={date}
                                  roomId={room.id}
                                  date={date}
                                  isToday={date === todayISO()}
                                  isWeekend={isWeekendDate(date)}
                                  onCreate={openNewBooking}
                                />
                              ))}
                            </div>
                            <div
                              className="pointer-events-none absolute inset-0 grid items-center"
                              style={gridStyle}
                            >
                              {roomBookings.map((booking) => {
                                const startIndex = Math.max(
                                  0,
                                  differenceInCalendarDays(parseISO(booking.checkIn), startDate),
                                );
                                const endIndex = Math.min(
                                  DAYS,
                                  differenceInCalendarDays(parseISO(booking.checkOut), startDate),
                                );
                                if (endIndex <= 0 || startIndex >= DAYS) return null;
                                return (
                                  <CalendarBookingBar
                                    key={booking.id}
                                    booking={booking}
                                    startIndex={startIndex}
                                    endIndex={endIndex}
                                    highlighted={highlightedId === booking.id}
                                    onEdit={() => openEditBooking(booking)}
                                  />
                                );
                              })}
                              {roomBlocks.map((block) => {
                                const startIndex = Math.max(
                                  0,
                                  differenceInCalendarDays(parseISO(block.from), startDate),
                                );
                                const endIndex = Math.min(
                                  DAYS,
                                  differenceInCalendarDays(parseISO(block.to), startDate),
                                );
                                if (endIndex <= 0 || startIndex >= DAYS) return null;
                                return (
                                  <CalendarBlockBar
                                    key={block.id}
                                    block={block}
                                    startIndex={startIndex}
                                    endIndex={endIndex}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3">
              {LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2.5 rounded-full", item.className)} />
                  {item.label}
                </span>
              ))}
              <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
                Drag a booking by its handle to move it. Dots mark balances due.
              </span>
            </footer>
          </section>

          <DragOverlay dropAnimation={null}>
            {dragBooking ? <CalendarDragPreview booking={dragBooking} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <BookingDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        booking={dialog?.booking}
        rooms={rooms}
        defaults={dialog?.defaults}
        onSaved={handleSaved}
      />
    </div>
  );
}

function BookingLookupCard({
  booking,
  room,
  onOpen,
  onClear,
}: {
  booking: Booking;
  room?: Room;
  onOpen: () => void;
  onClear: () => void;
}) {
  const due = booking.total - booking.paid;

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Reservation {booking.code ?? booking.id.replace(/^ext_/i, "")}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold">{booking.guestName}</h3>
          <p className="text-sm text-muted-foreground">
            {room?.name ?? "Unknown room"} · {formatDate(booking.checkIn)} →{" "}
            {formatDate(booking.checkOut)} ·{" "}
            {pluralize(nightsBetween(booking.checkIn, booking.checkOut), "night")}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{BOOKING_STATUS_LABELS[booking.status]}</p>
          <p className="text-muted-foreground">{pluralize(booking.guests, "guest")}</p>
          <p className="text-muted-foreground">{formatMoney(booking.total)} total</p>
          {due > 0 ? (
            <p className="font-medium text-gold">{formatMoney(due)} due</p>
          ) : (
            <p className="text-success">Paid in full</p>
          )}
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{booking.email || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{booking.phone || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Source</dt>
          <dd>{BOOKING_SOURCE_LABELS[booking.source]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Paid</dt>
          <dd>{formatMoney(booking.paid)}</dd>
        </div>
      </dl>

      {booking.notes ? (
        <p className="mt-3 rounded-md bg-background/70 px-3 py-2 text-sm text-muted-foreground">
          {booking.notes}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onOpen}>
          Open reservation
        </Button>
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear
        </Button>
      </div>
    </section>
  );
}

function CalendarDayCell({
  roomId,
  date,
  isToday,
  isWeekend,
  onCreate,
}: {
  roomId: string;
  date: string;
  isToday: boolean;
  isWeekend: boolean;
  onCreate: (roomId: string, date: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `cell:${roomId}:${date}` });

  return (
    <button
      ref={setNodeRef}
      type="button"
      tabIndex={-1}
      onClick={() => onCreate(roomId, date)}
      aria-label={`Create a booking on ${format(parseISO(date), "d MMMM yyyy")}`}
      className={cn(
        "h-full border-l border-border/70 transition first:border-l-0 hover:bg-muted/40",
        isWeekend && !isToday && "bg-muted/30",
        isToday && "bg-primary/5",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary",
      )}
    />
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading calendar">
      <div className="h-12 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-[28rem] animate-pulse rounded-lg border border-border bg-card" />
    </div>
  );
}
