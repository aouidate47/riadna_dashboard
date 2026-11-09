"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { AlertCircle, History, Loader2 } from "lucide-react";
import { getActivity } from "@/lib/api";
import type { ActivityEntry } from "@/types";

function actionStyle(action: string) {
  const value = action.toLowerCase();
  if (value.includes("payment")) return "bg-success/10 text-success";
  if (value.includes("maintenance")) return "bg-destructive/10 text-destructive";
  if (value.includes("promo")) return "bg-gold/15 text-foreground";
  if (value.includes("housekeeping")) return "bg-gold/15 text-foreground";
  if (value.includes("message")) return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

function actionLabel(action: string) {
  return action.split(" ").slice(0, 2).join(" ");
}

export default function Page() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivity()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the activity log.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Activity log</h2>
        <p className="mt-1 text-sm text-muted-foreground">A running record of changes made by your team.</p>
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${actionStyle(entry.action)}`}
                >
                  {actionLabel(entry.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{entry.action}</span>{" "}
                    <span className="text-muted-foreground">· {entry.detail}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.actor} · {formatDistanceToNow(parseISO(entry.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
