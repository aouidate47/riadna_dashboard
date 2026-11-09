"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Percent, Plus, Tag, Trash2 } from "lucide-react";
import { createPromoCode, deletePromoCode, listPromoCodes, updatePromoCode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { PromoCode } from "@/types";

export default function Page() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");

  useEffect(() => {
    let cancelled = false;
    listPromoCodes()
      .then((list) => {
        if (!cancelled) setPromos(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load promo codes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    const value = Number(percent);
    if (!code.trim()) return setError("Enter a promo code.");
    if (!Number.isFinite(value) || value <= 0 || value > 100) return setError("Discount must be between 1 and 100%.");
    setSaving(true);
    setError(null);
    try {
      const promo = await createPromoCode({ code: code.trim().toUpperCase(), percent: value });
      setPromos((current) => [promo, ...current]);
      setCode("");
      setPercent("10");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the promo code.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(promo: PromoCode) {
    setPromos((current) =>
      current.map((item) => (item.id === promo.id ? { ...item, isActive: !item.isActive } : item)),
    );
    try {
      await updatePromoCode(promo.id, { isActive: !promo.isActive });
    } catch (err) {
      setPromos((current) => current.map((item) => (item.id === promo.id ? promo : item)));
      setError(err instanceof Error ? err.message : "Could not update the promo code.");
    }
  }

  async function remove(promo: PromoCode) {
    setPromos((current) => current.filter((item) => item.id !== promo.id));
    try {
      await deletePromoCode(promo.id);
    } catch (err) {
      setPromos((current) => [promo, ...current]);
      setError(err instanceof Error ? err.message : "Could not delete the promo code.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Rates &amp; promo codes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create discount codes for direct bookings. Room prices are managed from the rooms page.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <section className="h-fit rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Tag className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold">New promo code</h3>
              <p className="text-xs text-muted-foreground">Applies a percentage discount.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="promo-code">Code</Label>
              <Input
                id="promo-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="SUMMER25"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void create();
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="promo-percent">Discount (%)</Label>
              <Input
                id="promo-percent"
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
              />
            </div>
            <Button onClick={() => void create()} disabled={saving || !code.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Create code
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-display text-base font-semibold">Active codes</h3>
            <p className="text-xs text-muted-foreground">
              {promos.filter((promo) => promo.isActive).length} active of {promos.length}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : promos.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No promo codes yet. Create one on the left.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {promos.map((promo) => (
                <li key={promo.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Percent className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold tracking-wide">{promo.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {promo.percent}% off · created {formatDate(promo.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggle(promo)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      promo.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {promo.isActive ? "Active" : "Inactive"}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => void remove(promo)}
                    aria-label={`Delete ${promo.code}`}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
