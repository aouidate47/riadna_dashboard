"use client";

import { useEffect, useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { AlertCircle, BarChart3, Download, Percent, TrendingUp, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getBookings, getRooms } from "@/lib/api";
import { BOOKING_SOURCE_LABELS } from "@/lib/booking-labels";
import { formatMoney, pluralize } from "@/lib/format";
import type { Booking, BookingSource, Room } from "@/types";

const RANGES = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
] as const;

const SOURCE_COLORS = ["#7c2d12", "#9a3412", "#b45309", "#b8862b", "#2e7d68", "#6b5d52"];

export default function Page() {
  const [months, setMonths] = useState<(typeof RANGES)[number]["value"]>("6");
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), Number(months) - 1));
    Promise.all([
      getRooms(),
      getBookings({ from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") }),
    ])
      .then(([rooms, data]) => {
        if (cancelled) return;
        setRoomList(rooms);
        setBookings(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  const report = useMemo(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), Number(months) - 1));
    const active = bookings.filter((booking) => booking.status !== "CANCELLED");
    const monthBuckets = eachMonthOfInterval({ start, end }).map((date) => {
      const key = format(date, "yyyy-MM");
      const inMonth = active.filter((booking) => booking.checkIn.startsWith(key));
      const nights = inMonth.reduce(
        (sum, booking) => sum + Math.max(1, differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn))),
        0,
      );
      return {
        label: format(date, "MMM"),
        revenue: inMonth.reduce((sum, booking) => sum + booking.total, 0),
        bookings: inMonth.length,
        nights,
      };
    });

    const totalRevenue = monthBuckets.reduce((sum, month) => sum + month.revenue, 0);
    const nightsSold = monthBuckets.reduce((sum, month) => sum + month.nights, 0);
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const availableNights = roomList.filter((room) => room.isActive).length * days;
    const occupancy = availableNights ? Math.round((nightsSold / availableNights) * 100) : 0;
    const adr = nightsSold ? Math.round(totalRevenue / nightsSold) : 0;
    const revpar = availableNights ? Math.round(totalRevenue / availableNights) : 0;

    const sources = (Object.keys(BOOKING_SOURCE_LABELS) as BookingSource[]).map((source) => {
      const list = active.filter((booking) => booking.source === source);
      return {
        source,
        label: BOOKING_SOURCE_LABELS[source],
        count: list.length,
        revenue: list.reduce((sum, booking) => sum + booking.total, 0),
      };
    });

    return { monthBuckets, totalRevenue, nightsSold, occupancy, adr, revpar, sources, active };
  }, [bookings, roomList, months]);

  function exportCsv() {
    const header = ["Code", "Guest", "Email", "Room", "Check-in", "Check-out", "Status", "Source", "Total", "Paid"];
    const rows = report.active.map((booking) => [
      booking.code,
      booking.guestName,
      booking.email,
      roomList.find((room) => room.id === booking.roomId)?.name ?? "",
      booking.checkIn,
      booking.checkOut,
      booking.status,
      BOOKING_SOURCE_LABELS[booking.source],
      booking.total,
      booking.paid,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `riadna-bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Revenue, occupancy and where your bookings come from.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Report period"
            value={months}
            onChange={(event) => {
              setLoading(true);
              setMonths(event.target.value as (typeof RANGES)[number]["value"]);
            }}
            className="w-44"
          >
            {RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || !report.active.length}>
            <Download />
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading report">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue" value={formatMoney(report.totalRevenue)} hint={`${pluralize(report.monthBuckets.length, "month")}`} icon={Wallet} />
            <StatCard label="ADR" value={formatMoney(report.adr)} hint="Average daily rate" icon={TrendingUp} />
            <StatCard label="RevPAR" value={formatMoney(report.revpar)} hint="Revenue per available room" icon={BarChart3} />
            <StatCard label="Occupancy" value={`${report.occupancy}%`} hint={`${pluralize(report.nightsSold, "room-night")} sold`} icon={Percent} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h3 className="font-display text-base font-semibold">Revenue by month</h3>
              <p className="text-xs text-muted-foreground">Bookings by check-in date.</p>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.monthBuckets} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3dbd0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b5d52" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b5d52" }} width={54} />
                    <Tooltip
                      cursor={{ fill: "rgba(124,45,18,0.06)" }}
                      contentStyle={{ borderRadius: 8, borderColor: "#e3dbd0", fontSize: 12 }}
                      formatter={(value) => [formatMoney(Number(value)), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#7c2d12" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h3 className="font-display text-base font-semibold">Booking sources</h3>
              <p className="text-xs text-muted-foreground">Share of bookings in this period.</p>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.sources.filter((source) => source.count > 0)}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {report.sources
                        .filter((source) => source.count > 0)
                        .map((source, index) => (
                          <Cell key={source.source} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, borderColor: "#e3dbd0", fontSize: 12 }}
                      formatter={(value, name) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {report.sources.map((source, index) => (
                  <li key={source.source} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                    />
                    <span className="flex-1 text-muted-foreground">{source.label}</span>
                    <span className="font-medium">{source.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
