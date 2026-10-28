"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
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
import { getBlockedPeriods, getBookings, getRooms, updateBooking } from "@/lib/api";
import { toISODate, todayISO } from "@/lib/dates";
import { formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Booking, CreateBookingInput, Room } from "@/types";

const DAYS = 14;

const LEGEND = [
  { label: "Pending", className: "bg-amber-400" },
  { label: "Confirmed", className: "bg-sky-300" },
  { label: "Checked in", className: "bg-emerald-600" },
  { label: "Checked out", className: "bg-muted-foreground/30" },
  { label: "Cancelled", className: "bg-red-300" },
  { label: "Blocked", className: "border border-dashed border-muted-foreground/50 bg-muted" },
];

interface DialogState {
  booking: Booking | null;
  defaults?: Partial<Pick<CreateBookingInput, "roomId" | "checkIn" | "checkOut">>;
}

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
                  <div className="flex border-b border-border bg-muted/30">
                    <div className="sticky left-0 z-20 flex w-48 shrink-0 items-center border-r border-border bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Room
                    </div>
                    <div className="grid flex-1" style={gridStyle}>
                      {days.map((date) => {
                        const isToday = date === todayISO();
                        return (
                          <div
                            key={date}
                            className={cn(
                              "border-l border-border/70 px-1.5 py-2 text-center first:border-l-0",
                              isToday && "bg-primary/5",
                            )}
                          >
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {format(parseISO(date), "EEE")}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 inline-flex min-w-12 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                                isToday && "brand-gradient text-primary-foreground",
                              )}
                            >
                              {format(parseISO(date), "d MMM")}
                            </p>
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
                          <div className="sticky left-0 z-20 w-48 shrink-0 border-r border-border bg-card px-4 py-3">
                            <p className="truncate text-sm font-medium">{room.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {pluralize(room.capacity, "guest")} · {formatMoney(room.price)}
                            </p>
                          </div>
                          <div className="relative flex-1">
                            <div className="grid h-20" style={gridStyle}>
                              {days.map((date) => (
                                <CalendarDayCell
                                  key={date}
                                  roomId={room.id}
                                  date={date}
                                  isToday={date === todayISO()}
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
                Drag a booking by its handle to move it.
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

function CalendarDayCell({
  roomId,
  date,
  isToday,
  onCreate,
}: {
  roomId: string;
  date: string;
  isToday: boolean;
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
        isToday && "bg-primary/[0.04]",
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
