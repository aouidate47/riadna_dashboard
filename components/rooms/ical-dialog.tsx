"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const STEPS = [
  "Copy the feed URL below.",
  "In Airbnb or Booking.com, open the calendar sync settings.",
  "Paste the URL as an “import” feed and save.",
  "Bookings and blocked dates will now show as unavailable elsewhere.",
];

export function IcalDialog({
  open,
  onOpenChange,
  riadId,
  riadName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riadId: string;
  riadName: string;
}) {
  const [copied, setCopied] = useState(false);
  const feedUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/api/ical/${riadId}`),
    [riadId],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calendar sync</DialogTitle>
          <DialogDescription>
            Share availability for {riadName} with other platforms through an iCal feed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <span>The feed refreshes automatically whenever a booking or block changes (demo data on this server).</span>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="ical-url" className="text-sm font-medium">
            Feed URL
          </label>
          <div className="flex gap-2">
            <Input id="ical-url" readOnly value={feedUrl} className="font-mono text-xs" onFocus={(event) => event.target.select()} />
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">How to use it</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${feedUrl}?download=1`} download>
              <Download />
              Download .ics
            </a>
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
