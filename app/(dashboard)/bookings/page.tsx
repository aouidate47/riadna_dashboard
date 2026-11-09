"use client";

import { Fragment, useEffect, useState } from "react";
import {
  AlertCircle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useNewBookings } from "@/components/providers/new-bookings-provider";
import { BookingDialog } from "@/components/bookings/booking-dialog";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRooms, listBookings, updateBookingStatus, WEBSITE_SOURCE } from "@/lib/api";
import { ALLOWED_TRANSITIONS } from "@/lib/booking-status";
import { BOOKING_SOURCE_LABELS, BOOKING_STATUS_LABELS } from "@/lib/booking-labels";
import { formatDate, formatMoney, formatParty, pluralize } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type {
  Booking,
  BookingSource,
  BookingStatus,
  CreateBookingInput,
  Paginated,
  Room,
} from "@/types";

const PAGE_SIZE = 8;
const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];
const SOURCES: BookingSource[] = ["direct", "booking.com", "airbnb.com", "riadna.ma", "phone", "walk-in"];
const SORT_OPTIONS = [
  { value: "checkIn-desc", label: "Check-in · newest first" },
  { value: "checkIn-asc", label: "Check-in · soonest first" },
  { value: "createdAt-desc", label: "Recently created" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const STATUS_ACTION_LABELS: Record<BookingStatus, string> = {
  PENDING: "Mark as pending",
  CONFIRMED: "Confirm booking",
  CHECKED_IN: "Check in",
  CHECKED_OUT: "Check out",
  CANCELLED: "Cancel booking",
};

interface DialogState {
  booking: Booking | null;
  defaults?: Partial<Pick<CreateBookingInput, "roomId" | "checkIn" | "checkOut">>;
}

export default function Page() {
  const { user } = useAuth();
  const { count: newOnlineCount, refresh: refreshNewOnline } = useNewBookings();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [result, setResult] = useState<Paginated<Booking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [source, setSource] = useState<BookingSource | "all">("all");
  const [roomId, setRoomId] = useState("all");
  const [sort, setSort] = useState<SortValue>("checkIn-desc");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Row whose Cancel button was clicked once (a second click cancels). */
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRooms()
      .then((data) => {
        if (!cancelled) {
          setRooms(data);
          setRoomsError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRoomsError(err instanceof Error ? err.message : "Could not load rooms.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const [sortBy, sortDir] = sort === "createdAt-desc"
      ? (["createdAt", "desc"] as const)
      : (sort.split("-") as ["checkIn", "asc" | "desc"]);

    listBookings(
      {
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
        source: source === "all" ? undefined : source,
        roomId: roomId === "all" ? undefined : roomId,
        sortBy,
        sortDir,
      },
      { page, pageSize: PAGE_SIZE },
    )
      .then((data) => {
        if (cancelled) return;
        if (data.page > data.pageCount) {
          setPage(data.pageCount);
          return;
        }
        setResult(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load bookings.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, search, status, source, roomId, sort, page, refreshKey]);

  const isFiltered = Boolean(search.trim()) || status !== "all" || source !== "all" || roomId !== "all";
  const showingNewOnline = status === "PENDING" && source === WEBSITE_SOURCE;
  const roomsById = new Map(rooms.map((room) => [room.id, room]));

  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
    refreshNewOnline();
  }

  function resetFilters() {
    setLoading(true);
    setSearch("");
    setStatus("all");
    setSource("all");
    setRoomId("all");
    setSort("checkIn-desc");
    setPage(1);
  }

  /** "Review them": pending website bookings, newest first. */
  function showNewOnline() {
    setLoading(true);
    setSearch("");
    setStatus("PENDING");
    setSource(WEBSITE_SOURCE);
    setRoomId("all");
    setSort("createdAt-desc");
    setPage(1);
  }

  function openNewBooking(defaults?: DialogState["defaults"]) {
    setNotice(null);
    setDialog({ booking: null, defaults });
  }

  function openEditBooking(booking: Booking) {
    setNotice(null);
    setDialog({ booking });
  }

  function handleSaved(booking: Booking) {
    const wasNew = !dialog?.booking;
    setDialog(null);
    setError(null);
    setNotice(wasNew ? `Booking for ${booking.guestName} created.` : `Booking for ${booking.guestName} updated.`);
    setLoading(true);
    if (wasNew) setPage(1);
    setRefreshKey((key) => key + 1);
    refreshNewOnline();
  }

  async function changeStatus(booking: Booking, nextStatus: BookingStatus) {
    setConfirmCancelId(null);
    setBusyId(booking.id);
    setError(null);
    setNotice(null);
    try {
      await updateBookingStatus(booking.id, nextStatus);
      setNotice(`${booking.guestName} is now ${BOOKING_STATUS_LABELS[nextStatus].toLowerCase()}.`);
      setLoading(true);
      setRefreshKey((key) => key + 1);
      refreshNewOnline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the booking status.");
    } finally {
      setBusyId(null);
    }
  }

  function goToPage(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">All bookings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result
              ? `${pluralize(result.total, "booking")}${isFiltered ? " matching your filters" : " across all channels"}`
              : "Search, filter and manage every stay."}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {newOnlineCount && !showingNewOnline ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <BellRing className="size-4 shrink-0 text-primary" />
          <p className="flex-1">
            <span className="font-medium">
              {pluralize(newOnlineCount, "new online booking")}
            </span>{" "}
            {newOnlineCount === 1 ? "is" : "are"} waiting for you to confirm or cancel.
          </p>
          <Button size="sm" onClick={showNewOnline}>
            Review {newOnlineCount === 1 ? "it" : "them"}
          </Button>
        </div>
      ) : null}

      {showingNewOnline ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="size-4" />
          Bookings made on your website that still need an answer, newest first. The guest sees the new status on
          their confirmation page.
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_10rem_10rem_11rem_13rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setLoading(true);
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search guest name…"
              aria-label="Search bookings by guest name"
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value as BookingStatus | "all");
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {BOOKING_STATUS_LABELS[option]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by source"
            value={source}
            onChange={(event) => {
              setLoading(true);
              setSource(event.target.value as BookingSource | "all");
              setPage(1);
            }}
          >
            <option value="all">All sources</option>
            {SOURCES.map((option) => (
              <option key={option} value={option}>
                {BOOKING_SOURCE_LABELS[option]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by room"
            value={roomId}
            onChange={(event) => {
              setLoading(true);
              setRoomId(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort bookings"
            value={sort}
            onChange={(event) => {
              setLoading(true);
              setSort(event.target.value as SortValue);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {isFiltered ? (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X />
              Clear filters
            </Button>
          </div>
        ) : null}
      </section>

      {roomsError ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {roomsError}
        </p>
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

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={refresh} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {!result ? (
        <BookingsSkeleton />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className={cn("overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Stay</th>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((booking) => {
                  const room = roomsById.get(booking.roomId);
                  const transitions = ALLOWED_TRANSITIONS[booking.status];
                  const busy = busyId === booking.id;
                  const online = booking.source === WEBSITE_SOURCE;
                  const hasDetails =
                    Boolean(booking.arrivalTime || booking.specialRequests) || booking.experiences.length > 0;
                  return (
                    <Fragment key={booking.id}>
                    <tr
                      className={cn(
                        "transition hover:bg-muted/30",
                        // The details row below belongs to this booking: no divider between them
                        hasDetails && "border-b-0 [&>td]:pb-1.5",
                        online && booking.status === "PENDING" && "bg-primary/[0.03]",
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {initials(booking.guestName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{booking.guestName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {booking.email || booking.phone || booking.country}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap">
                          {formatDate(booking.checkIn, "d MMM")} → {formatDate(booking.checkOut, "d MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatParty(booking)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap font-medium">{room?.name ?? "Room"}</p>
                        <p className="text-xs text-muted-foreground">{booking.country}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {online ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Globe className="size-3" />
                            Online
                          </span>
                        ) : (
                          BOOKING_SOURCE_LABELS[booking.source]
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap font-medium">{formatMoney(booking.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(booking.paid)} paid
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                          {booking.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => void changeStatus(booking, "CONFIRMED")}
                                disabled={busy}
                              >
                                <Check />
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                onClick={() =>
                                  confirmCancelId === booking.id
                                    ? void changeStatus(booking, "CANCELLED")
                                    : setConfirmCancelId(booking.id)
                                }
                                onBlur={() => setConfirmCancelId((id) => (id === booking.id ? null : id))}
                                disabled={busy}
                              >
                                {confirmCancelId === booking.id ? "Cancel booking?" : "Cancel"}
                              </Button>
                            </>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${booking.guestName}`}
                                disabled={busy}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                                {booking.guestName}
                              </DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => openEditBooking(booking)}>
                                Edit booking
                              </DropdownMenuItem>
                              {transitions.length > 0 ? <DropdownMenuSeparator /> : null}
                              {transitions.map((nextStatus) => (
                                <DropdownMenuItem
                                  key={nextStatus}
                                  onSelect={() => changeStatus(booking, nextStatus)}
                                  className={nextStatus === "CANCELLED" ? "text-destructive" : undefined}
                                >
                                  {STATUS_ACTION_LABELS[nextStatus]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                    {hasDetails ? (
                      <tr>
                        <td colSpan={7} className="px-5 pb-3 pt-0">
                          <BookingExtras booking={booking} />
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.items.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium">No bookings found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isFiltered ? "Try clearing some filters." : "Create your first booking to get started."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => (isFiltered ? resetFilters() : openNewBooking())}
                disabled={!isFiltered && rooms.length === 0}
              >
                {isFiltered ? "Clear filters" : "New booking"}
              </Button>
            </div>
          ) : (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(result.page - 1) * result.pageSize + 1}–
                {Math.min(result.page * result.pageSize, result.total)} of {result.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(result.page - 1)}
                  disabled={result.page <= 1 || loading}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {result.page} of {result.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(result.page + 1)}
                  disabled={result.page >= result.pageCount || loading}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </footer>
          )}
        </section>
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

/** What the guest added on the website: arrival time, experiences and their requests. */
function BookingExtras({ booking }: { booking: Booking }) {
  return (
    <div className="ml-12 flex flex-wrap items-start gap-x-5 gap-y-1.5 text-xs">
      {booking.arrivalTime ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" />
          Arrives {booking.arrivalTime}–{nextHour(booking.arrivalTime)}
        </span>
      ) : null}
      {booking.experiences.length > 0 ? (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Sparkles className="size-3.5 text-gold" />
          {booking.experiences.map((line) => (
            <span key={line.id} className="rounded-full bg-muted px-2 py-0.5 font-medium">
              {line.name}
              {line.pricing === "per_person" ? ` ×${line.quantity}` : ""}
              <span className="font-normal text-muted-foreground"> · {formatMoney(line.total)}</span>
            </span>
          ))}
        </span>
      ) : null}
      {booking.specialRequests ? (
        <span className="inline-flex min-w-0 max-w-full items-start gap-1.5">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span className="italic">&ldquo;{booking.specialRequests}&rdquo;</span>
        </span>
      ) : null}
    </div>
  );
}

const nextHour = (time: string) => `${String((Number(time.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`;

function BookingsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading bookings">
      <div className="h-12 animate-pulse rounded-lg border border-border bg-card" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}
