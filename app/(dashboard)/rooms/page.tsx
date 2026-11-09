"use client";

import { useEffect, useState } from "react";
import { addDays, parseISO } from "date-fns";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Ban,
  Banknote,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { BlockedDatesDialog } from "@/components/rooms/blocked-dates-dialog";
import { IcalDialog } from "@/components/rooms/ical-dialog";
import { RoomDialog } from "@/components/rooms/room-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getBlockedPeriods, getBookings, getRooms, reorderRooms } from "@/lib/api";
import { datesOverlap, toISODate, todayISO } from "@/lib/dates";
import { formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Room } from "@/types";

type StatusFilter = "all" | "visible" | "hidden" | "available" | "occupied" | "blocked";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All rooms" },
  { value: "visible", label: "Visible on site" },
  { value: "hidden", label: "Hidden" },
  { value: "available", label: "Available tonight" },
  { value: "occupied", label: "Occupied tonight" },
  { value: "blocked", label: "Blocked tonight" },
];

const GUEST_FILTERS = [1, 2, 3, 4, 6];

export default function Page() {
  const { riad } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [occupiedRoomIds, setOccupiedRoomIds] = useState<Set<string>>(() => new Set());
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [roomDialog, setRoomDialog] = useState<{ room: Room | null } | null>(null);
  const [blockRoomId, setBlockRoomId] = useState<string | null>(null);
  const [icalOpen, setIcalOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minGuests, setMinGuests] = useState(0);

  const today = todayISO();
  const tomorrow = toISODate(addDays(parseISO(today), 1));

  useEffect(() => {
    let cancelled = false;
    const from = todayISO();
    const to = toISODate(addDays(parseISO(from), 1));

    Promise.all([getRooms(), getBlockedPeriods(), getBookings({ from, to })])
      .then(([roomData, blockData, bookingData]) => {
        if (cancelled) return;
        setRooms(roomData);
        setBlocks(blockData);
        setOccupiedRoomIds(
          new Set(
            bookingData
              .filter(
                (booking) =>
                  booking.status === "CONFIRMED" || booking.status === "CHECKED_IN",
              )
              .map((booking) => booking.roomId),
          ),
        );
        setError(null);
        setLoading(false);
        setDataReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the rooms.");
        setLoading(false);
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const blockedTonight = new Set(
    blocks
      .filter((block) => datesOverlap(block.from, block.to, today, tomorrow))
      .map((block) => block.roomId),
  );
  const unavailable = new Set([...occupiedRoomIds, ...blockedTonight]);
  const activeRooms = rooms.filter((room) => room.isActive);
  const hiddenCount = rooms.length - activeRooms.length;
  const availableTonight = activeRooms.filter((room) => !unavailable.has(room.id)).length;
  const totalCapacity = activeRooms.reduce((sum, room) => sum + room.capacity, 0);
  const averageRate = activeRooms.length
    ? Math.round(activeRooms.reduce((sum, room) => sum + room.price, 0) / activeRooms.length)
    : 0;
  const blockRoom = rooms.find((room) => room.id === blockRoomId) ?? null;

  const query = search.trim().toLowerCase();
  const isFiltered = Boolean(query) || statusFilter !== "all" || minGuests > 0;
  const filteredRooms = rooms.filter((room) => {
    if (
      query &&
      ![room.name, room.beds, room.description, ...room.amenities].some((text) =>
        text.toLowerCase().includes(query),
      )
    ) {
      return false;
    }
    if (minGuests && room.capacity < minGuests) return false;

    const isBlocked = blockedTonight.has(room.id);
    const isOccupied = occupiedRoomIds.has(room.id);
    switch (statusFilter) {
      case "visible":
        return room.isActive;
      case "hidden":
        return !room.isActive;
      case "available":
        return room.isActive && !isBlocked && !isOccupied;
      case "occupied":
        return room.isActive && isOccupied;
      case "blocked":
        return room.isActive && isBlocked;
      default:
        return true;
    }
  });

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setMinGuests(0);
  }

  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  function handleSaved(room: Room) {
    const isNew = !roomDialog?.room;
    setRoomDialog(null);
    setNotice(isNew ? `${room.name} added.` : `${room.name} updated.`);
    setError(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }

  function handleDeleted(room: Room) {
    setRoomDialog(null);
    setNotice(`${room.name} deleted.`);
    setError(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }

  /** Moves a room one place earlier (-1) or later (+1) in the order used by the site and calendar. */
  async function moveRoom(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rooms.length) return;

    const previous = rooms;
    const next = [...rooms];
    [next[index], next[target]] = [next[target], next[index]];
    setRooms(next); // show the new order right away
    setReordering(true);
    try {
      setRooms(await reorderRooms(next.map((room) => room.id)));
    } catch (err) {
      setRooms(previous);
      setError(err instanceof Error ? err.message : "Could not change the room order.");
    } finally {
      setReordering(false);
    }
  }

  function handleBlocksChanged() {
    setNotice("Blocked dates updated.");
    setError(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Rooms &amp; availability</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Room details, rates and blocked dates for {riad?.name ?? "your riad"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIcalOpen(true)} disabled={!riad}>
            <CalendarDays />
            Calendar sync
          </Button>
          <Button size="sm" onClick={() => setRoomDialog({ room: null })} disabled={!dataReady}>
            <Plus />
            New room
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
        <RoomsSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Rooms"
              value={String(activeRooms.length)}
              hint={`${pluralize(totalCapacity, "guest")} total capacity${hiddenCount ? ` · ${hiddenCount} hidden` : ""}`}
              icon={BedDouble}
            />
            <StatCard
              label="Available tonight"
              value={String(availableTonight)}
              hint={`${activeRooms.length - availableTonight} occupied or blocked`}
              icon={CheckCircle2}
            />
            <StatCard
              label="Blocked periods"
              value={String(blocks.length)}
              hint={blocks.length ? "Across all rooms" : "Nothing blocked"}
              icon={Ban}
            />
            <StatCard
              label="Average rate"
              value={formatMoney(averageRate)}
              hint="Per night"
              icon={Banknote}
            />
          </div>

          {rooms.length > 0 ? (
            <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_12rem_10rem_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, beds, amenities…"
                    aria-label="Search rooms"
                    className="pl-9"
                  />
                </div>
                <Select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  {STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Filter by number of guests"
                  value={minGuests}
                  onChange={(event) => setMinGuests(Number(event.target.value))}
                >
                  <option value={0}>Any size</option>
                  {GUEST_FILTERS.map((guests) => (
                    <option key={guests} value={guests}>
                      {guests}+ guests
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" onClick={clearFilters} disabled={!isFiltered} className="h-10">
                  <X />
                  Clear
                </Button>
              </div>
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                {isFiltered
                  ? `Showing ${filteredRooms.length} of ${pluralize(rooms.length, "room")}. Clear the filters to change the room order.`
                  : `${pluralize(rooms.length, "room")}. Use ↑ ↓ to set the order on the booking site and calendar.`}
              </p>
            </section>
          ) : null}

          {rooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
              <BedDouble className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No rooms yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first room to start taking bookings.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setRoomDialog({ room: null })}>
                <Plus />
                New room
              </Button>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
              <Search className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No rooms match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or clear the filters.</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={clearFilters}>
                <X />
                Clear filters
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
                loading && "opacity-60 transition-opacity",
              )}
            >
              {filteredRooms.map((room) => {
                // Position in the full list: reordering always works on every room.
                const index = rooms.indexOf(room);
                const photo = room.photos[0];
                const isOccupied = occupiedRoomIds.has(room.id);
                const isBlocked = blockedTonight.has(room.id);
                const roomBlocks = blocks.filter((block) => block.roomId === room.id);
                const status = !room.isActive
                  ? "Hidden"
                  : isBlocked
                    ? "Blocked"
                    : isOccupied
                      ? "Occupied"
                      : "Available";
                const statusClass = !room.isActive
                  ? "bg-black/70 text-white"
                  : isBlocked
                    ? "bg-gold text-white"
                    : isOccupied
                      ? "bg-primary text-primary-foreground"
                      : "bg-success text-white";

                return (
                  <article
                    key={room.id}
                    className={cn(
                      "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
                      !room.isActive && "opacity-75",
                    )}
                  >
                    <div className="relative h-40 overflow-hidden bg-muted">
                      {photo ? (
                        <div
                          role="img"
                          aria-label={`${room.name} photo`}
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${JSON.stringify(photo)})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <BedDouble className="size-10" />
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-linear-to-t from-black/60 via-black/5 to-transparent"
                      />
                      <span
                        className={cn(
                          "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium",
                          statusClass,
                        )}
                      >
                        {!room.isActive ? <EyeOff className="mr-1 inline size-3" /> : null}
                        {status}
                      </span>
                      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
                        <p className="text-sm font-medium">
                          {formatMoney(room.price)}
                          <span className="font-normal text-white/80"> / night</span>
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-white/85">
                          <Users className="size-3.5" />
                          {room.capacity}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-semibold">{room.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Sleeps {pluralize(room.capacity, "guest")} ·{" "}
                            {room.photos.length ? pluralize(room.photos.length, "photo") : "No photos"}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {room.beds ? (
                              <span className="inline-flex items-center gap-1">
                                <BedDouble className="size-3.5" />
                                {room.beds}
                              </span>
                            ) : null}
                            {room.size ? (
                              <span className="inline-flex items-center gap-1">
                                <Ruler className="size-3.5" />
                                {room.size} m²
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {roomBlocks.length ? pluralize(roomBlocks.length, "block") : "No blocks"}
                        </span>
                      </div>

                      <RoomAmenities room={room} />

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setBlockRoomId(room.id)}
                        >
                          <Ban />
                          Blocked dates
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            onClick={() => void moveRoom(index, -1)}
                            disabled={index === 0 || reordering || loading || isFiltered}
                            aria-label={`Move ${room.name} earlier`}
                            title="Move earlier"
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            onClick={() => void moveRoom(index, 1)}
                            disabled={index === rooms.length - 1 || reordering || loading || isFiltered}
                            aria-label={`Move ${room.name} later`}
                            title="Move later"
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoomDialog({ room })}
                          >
                            <Pencil />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <RoomDialog
        open={roomDialog !== null}
        onOpenChange={(open) => {
          if (!open) setRoomDialog(null);
        }}
        room={roomDialog?.room}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <BlockedDatesDialog
        open={blockRoom !== null}
        onOpenChange={(open) => {
          if (!open) setBlockRoomId(null);
        }}
        room={blockRoom}
        blocks={blockRoom ? blocks.filter((block) => block.roomId === blockRoom.id) : []}
        onChanged={handleBlocksChanged}
      />

      {riad ? (
        <IcalDialog open={icalOpen} onOpenChange={setIcalOpen} riadId={riad.id} riadName={riad.name} />
      ) : null}
    </div>
  );
}

const MAX_AMENITY_CHIPS = 6;

function RoomAmenities({ room }: { room: Room }) {
  if (room.amenities.length === 0) {
    return <p className="mt-3 text-[11px] text-muted-foreground">No amenities listed</p>;
  }

  const shown = room.amenities.slice(0, MAX_AMENITY_CHIPS);
  const hidden = room.amenities.length - shown.length;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {shown.map((amenity) => (
        <span
          key={amenity}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {amenity}
        </span>
      ))}
      {hidden > 0 ? (
        <span
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          title={room.amenities.slice(MAX_AMENITY_CHIPS).join(", ")}
        >
          +{hidden} more
        </span>
      ) : null}
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading rooms">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
