"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { AlertCircle, Loader2, Mail, MessageSquare, Send, Smartphone } from "lucide-react";
import { getBookings, getMessageLog, getRooms, sendGuestMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney } from "@/lib/format";
import type { Booking, MessageChannel, MessageLog, MessageTemplateId, Room } from "@/types";

const TEMPLATES: { value: MessageTemplateId; label: string }[] = [
  { value: "confirmation", label: "Booking confirmation" },
  { value: "pre-arrival", label: "Pre-arrival note" },
  { value: "checkout", label: "Checkout reminder" },
  { value: "custom", label: "Custom message" },
];

const CHANNELS: { value: MessageChannel; label: string; icon: typeof Mail }[] = [
  { value: "email", label: "Email", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: Smartphone },
];

function templateBody(template: MessageTemplateId, booking: Booking, room?: Room) {
  if (template === "custom") return "";
  const roomName = room?.name ?? "your room";
  if (template === "confirmation") {
    return `Hello ${booking.guestName},\n\nYour booking (${booking.code}) for ${roomName} from ${formatDate(
      booking.checkIn,
    )} to ${formatDate(booking.checkOut)} is confirmed. Total: ${formatMoney(booking.total)}.\n\nSee you soon!`;
  }
  if (template === "pre-arrival") {
    return `Hello ${booking.guestName},\n\nWe look forward to welcoming you on ${formatDate(
      booking.checkIn,
    )}. Could you let us know your estimated arrival time? See you soon!`;
  }
  return `Hello ${booking.guestName},\n\nThis is a reminder that checkout is on ${formatDate(
    booking.checkOut,
  )} before 11:00. Thank you for staying with us!`;
}

export default function Page() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [log, setLog] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [target, setTarget] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");

  function loadLog() {
    getMessageLog()
      .then(setLog)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load messages."));
  }

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    Promise.all([
      getRooms(),
      getBookings({
        from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      }),
      getMessageLog(),
    ])
      .then(([roomList, bookingList, messages]) => {
        if (cancelled) return;
        setRooms(roomList);
        setBookings(bookingList);
        setLog(messages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load messages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = [...bookings].sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    if (!needle) return list;
    return list.filter(
      (booking) =>
        booking.guestName.toLowerCase().includes(needle) || booking.email.toLowerCase().includes(needle),
    );
  }, [bookings, search]);

  const channelIcon = (channel: MessageChannel) =>
    channel === "email" ? <Mail className="size-4" /> : <Smartphone className="size-4" />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Guest messages</h2>
        <p className="mt-1 text-sm text-muted-foreground">Send confirmations and reminders (demo: logged, not delivered).</p>
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      {notice ? (
        <div role="status" className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          <Send className="size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" className="text-xs underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-display text-base font-semibold">Guests</h3>
            <p className="text-xs text-muted-foreground">Recent and upcoming bookings.</p>
          </div>
          <div className="border-b border-border p-3">
            <Input placeholder="Search by guest or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No guests match that search.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {filteredBookings.map((booking) => (
                <li key={booking.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {booking.guestName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{booking.guestName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} · {booking.code}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTarget(booking)}>
                    <MessageSquare />
                    Message
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-display text-base font-semibold">Message log</h3>
            <p className="text-xs text-muted-foreground">
              {log.length ? `${log.length} message${log.length === 1 ? "" : "s"} sent` : "Nothing sent yet."}
            </p>
          </div>
          {log.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Pick a guest and send your first message.
            </p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
              {log.map((message) => (
                <li key={message.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {channelIcon(message.channel)}
                    </span>
                    <p className="flex-1 truncate text-sm font-medium">{message.guestName}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(message.createdAt, "d MMM, HH:mm")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {message.body}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {TEMPLATES.find((template) => template.value === message.template)?.label} ·{" "}
                    {message.channel === "email" ? message.email : message.phone}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          {target ? (
            <ComposeForm
              key={target.id}
              booking={target}
              room={rooms.find((room) => room.id === target.roomId)}
              onClose={() => setTarget(null)}
              onSent={(message) => {
                setLog((current) => [message, ...current]);
                setTarget(null);
                setNotice(`Message sent to ${message.guestName}.`);
                loadLog();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComposeForm({
  booking,
  room,
  onClose,
  onSent,
}: {
  booking: Booking;
  room?: Room;
  onClose: () => void;
  onSent: (message: MessageLog) => void;
}) {
  const [template, setTemplate] = useState<MessageTemplateId>("confirmation");
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [body, setBody] = useState(() => templateBody("confirmation", booking, room));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeTemplate(next: MessageTemplateId) {
    setTemplate(next);
    setBody(templateBody(next, booking, room));
  }

  async function submit() {
    if (!body.trim()) return setError("Write a message first.");
    setSending(true);
    setError(null);
    try {
      const message = await sendGuestMessage({
        guestName: booking.guestName,
        email: booking.email,
        phone: booking.phone,
        channel,
        template,
        body,
      });
      onSent(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
      setSending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Message {booking.guestName}</DialogTitle>
        <DialogDescription>
          {booking.code} · {booking.email}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="message-template">Template</Label>
          <Select
            id="message-template"
            value={template}
            onChange={(event) => changeTemplate(event.target.value as MessageTemplateId)}
          >
            {TEMPLATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="message-channel">Channel</Label>
          <Select
            id="message-channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value as MessageChannel)}
          >
            {CHANNELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="message-body">Message</Label>
        <Textarea
          id="message-body"
          rows={9}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your message…"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          Send message
        </Button>
      </div>
    </>
  );
}
