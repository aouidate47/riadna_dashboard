"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Globe2,
  RefreshCw,
  Repeat2,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getGuests } from "@/lib/api";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { Guest } from "@/types";

const SORT_OPTIONS = [
  { value: "name", label: "Name · A to Z" },
  { value: "stays", label: "Most stays" },
  { value: "recent", label: "Most recent stay" },
  { value: "spend", label: "Highest spend" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const norm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function Page() {
  const { user, isOwner } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [sort, setSort] = useState<SortValue>("name");

  useEffect(() => {
    let cancelled = false;
    getGuests()
      .then((data) => {
        if (cancelled) return;
        setGuests(data);
        setError(null);
        setLoading(false);
        setDataReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the guests.");
        setLoading(false);
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey]);

  const countries = Array.from(new Set(guests.map((guest) => guest.country).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
  const query = norm(search.trim());
  const filtered = guests.filter((guest) => {
    const matchesSearch =
      !query ||
      norm(`${guest.name} ${guest.email} ${guest.phone} ${guest.country}`).includes(query);
    const matchesCountry = country === "all" || guest.country === country;
    return matchesSearch && matchesCountry;
  });
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "stays":
        return b.bookingsCount - a.bookingsCount || a.name.localeCompare(b.name);
      case "recent":
        return (b.lastStay ?? "").localeCompare(a.lastStay ?? "") || a.name.localeCompare(b.name);
      case "spend":
        return b.totalPaid - a.totalPaid || a.name.localeCompare(b.name);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const returning = guests.filter((guest) => guest.bookingsCount > 1).length;
  const totalStays = guests.reduce((sum, guest) => sum + guest.bookingsCount, 0);
  const guestValue = guests.reduce((sum, guest) => sum + guest.totalPaid, 0);
  const sortOptions = isOwner ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== "spend");
  const hasFilters = Boolean(search.trim()) || country !== "all";

  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  function clearFilters() {
    setSearch("");
    setCountry("all");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Guest directory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guests are collected automatically from your bookings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn(loading && "animate-spin")} />
          Refresh
        </Button>
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

      {!dataReady ? (
        <GuestsSkeleton />
      ) : (
        <>
          <div className={cn("grid gap-4 sm:grid-cols-2", isOwner ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
            <StatCard
              label="Guests"
              value={String(guests.length)}
              hint={`${pluralize(totalStays, "stay")} recorded`}
              icon={Users}
            />
            <StatCard
              label="Returning guests"
              value={String(returning)}
              hint={guests.length ? `${Math.round((returning / guests.length) * 100)}% of guests` : "No guests yet"}
              icon={Repeat2}
            />
            <StatCard
              label="Countries"
              value={String(countries.length)}
              hint="Represented in your bookings"
              icon={Globe2}
            />
            {isOwner ? (
              <StatCard
                label="Guest value"
                value={formatMoney(guestValue)}
                hint="Total paid by guests"
                icon={Banknote}
              />
            ) : null}
          </div>

          <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_13rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone or country…"
                  aria-label="Search guests"
                  className="pl-9"
                />
              </div>
              <Select
                aria-label="Filter by country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="all">All countries</option>
                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Sort guests"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            {hasFilters ? (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X />
                  Clear filters
                </Button>
              </div>
            ) : null}
          </section>

          <section className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-opacity", loading && "opacity-60")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Guest</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 font-medium">Stays</th>
                    {isOwner ? <th className="px-4 py-3 font-medium">Paid</th> : null}
                    <th className="px-5 py-3 font-medium">Last stay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((guest) => (
                    <tr key={guest.id} className="transition hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {initials(guest.name)}
                          </span>
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-medium">{guest.name}</p>
                            {guest.bookingsCount > 1 ? (
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                Returning
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {guest.email ? (
                          <a
                            href={`mailto:${guest.email}`}
                            className="block truncate text-sm text-primary hover:underline"
                          >
                            {guest.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No email</span>
                        )}
                        {guest.phone ? (
                          <a
                            href={`tel:${guest.phone.replace(/\s+/g, "")}`}
                            className="block truncate text-xs text-muted-foreground hover:text-foreground"
                          >
                            {guest.phone}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{guest.country || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{guest.bookingsCount}</span>
                        <span className="text-muted-foreground">
                          {guest.bookingsCount === 1 ? " stay" : " stays"}
                        </span>
                      </td>
                      {isOwner ? (
                        <td className="px-4 py-3 font-medium">{formatMoney(guest.totalPaid)}</td>
                      ) : null}
                      <td className="px-5 py-3 text-muted-foreground">
                        {guest.lastStay ? formatDate(guest.lastStay, "d MMM yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sorted.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Users className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No guests found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasFilters
                    ? "Try a different search or country."
                    : "Guests will appear after your first booking."}
                </p>
                {hasFilters ? (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <p>
                  Showing {sorted.length} of {guests.length} guests
                </p>
                <p>{pluralize(totalStays, "stay")} total</p>
              </footer>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GuestsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading guests">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  );
}
