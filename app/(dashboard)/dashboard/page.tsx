"use client";

import { useEffect, useState } from "react";
import { Banknote, BedDouble, LogIn, LogOut, RefreshCw, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";
import { getDashboardOverview } from "@/lib/api";
import type { DashboardOverview } from "@/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { BookingList } from "@/components/dashboard/booking-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
});

export default function Page() {
  const { user, riad, isOwner } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDashboardOverview()
      .then((overview) => {
        if (cancelled) return;
        setData(overview);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the dashboard.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  };

  if (!data) {
    return error ? <DashboardError message={error} onRetry={refresh} /> : <DashboardSkeleton />;
  }

  const { stats } = data;
  const tonight = data.occupancyDays[0];
  const arrivingGuests = data.arrivals.reduce((sum, booking) => sum + booking.guests, 0);
  const pendingArrivals = data.arrivals.filter((booking) => booking.status === "PENDING").length;

  const arrivalsHint = data.arrivals.length
    ? `${arrivingGuests} guest${arrivingGuests === 1 ? "" : "s"} · ${data.arrivals.length} booking${
        data.arrivals.length === 1 ? "" : "s"
      }${pendingArrivals ? ` · ${pendingArrivals} pending` : ""}`
    : "Nothing scheduled";

  const departuresHint = data.departures.length
    ? `${data.departures.length} room${data.departures.length === 1 ? "" : "s"} to turn over`
    : "Nothing scheduled";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Today at {riad?.name ?? "your riad"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrivals, departures and occupancy at a glance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn(loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className={cn("grid gap-4 sm:grid-cols-2", isOwner ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        <StatCard label="Arrivals today" value={String(stats.arrivalsToday)} hint={arrivalsHint} icon={LogIn} />
        <StatCard
          label="Departures today"
          value={String(stats.departuresToday)}
          hint={departuresHint}
          icon={LogOut}
        />
        <StatCard
          label="Occupancy"
          value={`${stats.occupancyPct}%`}
          hint={tonight ? `${tonight.occupiedRooms} of ${tonight.totalRooms} rooms tonight` : undefined}
          icon={BedDouble}
        />
        {isOwner ? (
          <StatCard
            label="Revenue this month"
            value={money.format(stats.revenueThisMonth ?? 0)}
            hint="Booked revenue"
            icon={Banknote}
          />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-card shadow-sm xl:col-span-2">
          <header className="flex items-start justify-between gap-3 px-5 pt-5">
            <div>
              <h3 className="font-display text-base font-semibold">Occupancy</h3>
              <p className="text-xs text-muted-foreground">Next 14 nights</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {stats.occupancyPct}% tonight
            </span>
          </header>
          <div className="px-3 pb-4 pt-2">
            <OccupancyChart data={data.occupancyDays} />
          </div>
        </section>

        <BookingList
          className="h-full"
          title="In house"
          caption="Guests staying tonight"
          icon={Users}
          bookings={data.inHouse}
          empty="No guests are checked in tonight."
          meta={(booking) => `${booking.roomName} · until ${format(parseISO(booking.checkOut), "EEE d MMM")}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BookingList
          title="Arrivals"
          caption={riad ? `Expected from ${riad.checkInTime}` : "Guests due today"}
          icon={LogIn}
          bookings={data.arrivals}
          empty="No arrivals scheduled for today."
        />
        <BookingList
          title="Departures"
          caption={riad ? `Checkout by ${riad.checkOutTime}` : "Guests leaving today"}
          icon={LogOut}
          bookings={data.departures}
          empty="No departures scheduled for today."
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-5 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg border border-border bg-card xl:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="font-display text-base font-semibold text-destructive">Could not load the dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
