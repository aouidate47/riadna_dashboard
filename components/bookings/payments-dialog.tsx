"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CreditCard, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { addPayment, deletePayment, listPayments } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { printInvoice } from "@/lib/invoice";
import type { Booking, Payment, PaymentMethod, Riad, Room } from "@/types";
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

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Bank transfer" },
  { value: "online", label: "Online" },
];

export function PaymentsDialog({
  open,
  onOpenChange,
  booking,
  room,
  riad,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  room?: Room;
  riad?: Riad | null;
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && booking ? (
          <PaymentsForm
            key={booking.id}
            booking={booking}
            room={room}
            riad={riad}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PaymentsForm({
  booking,
  room,
  riad,
  onChanged,
  onClose,
}: {
  booking: Booking;
  room?: Room;
  riad?: Riad | null;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPayments(booking.id)
      .then((list) => {
        if (!cancelled) setPayments(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load payments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking.id]);

  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = Math.max(0, booking.total - paid);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a valid amount.");
    setSaving(true);
    setError(null);
    try {
      const payment = await addPayment(booking.id, { amount: value, method, note: note.trim() || undefined });
      setPayments((current) => [...current, payment]);
      setAmount("");
      setNote("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(payment: Payment) {
    setSaving(true);
    setError(null);
    try {
      await deletePayment(booking.id, payment.id);
      setPayments((current) => current.filter((item) => item.id !== payment.id));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Payments · {booking.guestName}</DialogTitle>
        <DialogDescription>
          {booking.code} · {formatMoney(booking.total)} total · {balance > 0 ? `${formatMoney(balance)} left to pay` : "fully paid"}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total" value={formatMoney(booking.total)} />
        <Summary label="Paid" value={formatMoney(paid)} tone="success" />
        <Summary label="Balance" value={formatMoney(balance)} tone={balance > 0 ? "warn" : "success"} />
      </div>

      <div className="rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Payment history</div>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatMoney(payment.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {METHODS.find((m) => m.value === payment.method)?.label ?? payment.method}
                    {payment.note ? ` · ${payment.note}` : ""} · {formatDate(payment.createdAt.slice(0, 10), "d MMM yyyy")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => void remove(payment)}
                  disabled={saving}
                  aria-label="Remove payment"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-border p-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={String(balance || booking.total)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="payment-method">Method</Label>
            <Select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              {METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="payment-note">Note (optional)</Label>
          <Input id="payment-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Deposit, cash on arrival…" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => printInvoice({ booking, room, riad })}>
            <Printer />
            Invoice
          </Button>
          <Button type="button" size="sm" onClick={() => void submit()} disabled={saving || !amount}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Record payment
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "success" | "warn" }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "success"
            ? "mt-0.5 font-semibold text-success"
            : tone === "warn"
              ? "mt-0.5 font-semibold text-destructive"
              : "mt-0.5 font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
