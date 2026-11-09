"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { countNewOnlineBookings } from "@/lib/api";

/** Re-checks for new website bookings this often while the dashboard is open. */
const POLL_MS = 60_000;

interface NewBookingsValue {
  /** PENDING bookings from the booking site; null until the first answer (or after an error). */
  count: number | null;
  /** Call after confirming/cancelling so the sidebar badge updates right away. */
  refresh: () => void;
}

const NewBookingsContext = createContext<NewBookingsValue>({ count: null, refresh: () => undefined });

/** Shares the "new online bookings" count between the sidebar badge and the bookings page. */
export function NewBookingsProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    countNewOnlineBookings()
      .then((total) => {
        if (!cancelled) setCount(total);
      })
      .catch(() => {
        // Keep the last count: a failed background check shouldn't flash the badge away.
      });
    const timer = setTimeout(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tick, refresh]);

  // Coming back to the tab: check right away instead of waiting for the next poll.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <NewBookingsContext.Provider value={value}>{children}</NewBookingsContext.Provider>;
}

export const useNewBookings = () => useContext(NewBookingsContext);
