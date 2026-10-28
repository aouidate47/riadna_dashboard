"use client";

import { useEffect, useState } from "react";
import { addDays, parseISO } from "date-fns";
import {
  AlertCircle,
  Ban,
  Banknote,
  BedDouble,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { BlockedDatesDialog } from "@/components/rooms/blocked-dates-dialog";
import { RoomDialog } from "@/components/rooms/room-dialog";
import { Button } from "@/components/ui/button";
import { getBlockedPeriods, getBookings, getRooms } from "@/lib/api";
import { datesOverlap, toISODate, todayISO } from "@/lib/dates";
import { formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockedPeriod, Room } from "@/types";

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
  const availableTonight = rooms.filter((room) => !unavailable.has(room.id)).length;
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const averageRate = rooms.length
    ? Math.round(rooms.reduce((sum, room) => sum + room.price, 0) / rooms.length)
    : 0;
  const blockRoom = rooms.find((room) => room.id === blockRoomId) ?? null;

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
              value={String(rooms.length)}
              hint={`${pluralize(totalCapacity, "guest")} total capacity`}
              icon={BedDouble}
            />
            <StatCard
              label="Available tonight"
              value={String(availableTonight)}
              hint={`${rooms.length - availableTonight} occupied or blocked`}
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
          ) : (
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
                loading && "opacity-60 transition-opacity",
              )}
            >
              {rooms.map((room) => {
                const photo = room.photos[0];
                const isOccupied = occupiedRoomIds.has(room.id);
                const isBlocked = blockedTonight.has(room.id);
                const roomBlocks = blocks.filter((block) => block.roomId === room.id);
                const status = isBlocked ? "Blocked" : isOccupied ? "Occupied" : "Available";
                const statusClass = isBlocked
                  ? "bg-amber-500 text-white"
                  : isOccupied
                    ? "bg-slate-900/80 text-white"
                    : "bg-emerald-600 text-white";

                return (
                  <article
                    key={room.id}
                    className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
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
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {roomBlocks.length ? pluralize(roomBlocks.length, "block") : "No blocks"}
                        </span>
                      </div>

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
