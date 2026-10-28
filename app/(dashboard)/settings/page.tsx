"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentRiad, getStaffUsers, updateRiad } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { Riad, User } from "@/types";

type RiadForm = Pick<Riad, "name" | "address" | "phone" | "checkInTime" | "checkOutTime">;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const toForm = (riad: Riad): RiadForm => ({
  name: riad.name,
  address: riad.address,
  phone: riad.phone,
  checkInTime: riad.checkInTime,
  checkOutTime: riad.checkOutTime,
});

export default function Page() {
  return (
    <AuthGuard roles={["OWNER"]}>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, refreshRiad } = useAuth();
  const [current, setCurrent] = useState<Riad | null>(null);
  const [form, setForm] = useState<RiadForm | null>(null);
  const [baseline, setBaseline] = useState<RiadForm | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentRiad(), getStaffUsers()])
      .then(([riad, users]) => {
        if (cancelled) return;
        const next = toForm(riad);
        setCurrent(riad);
        setForm(next);
        setBaseline(next);
        setStaff(users);
        setError(null);
        setLoading(false);
        setDataReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the settings.");
        setLoading(false);
        setDataReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const dirty =
    !!form &&
    !!baseline &&
    (Object.keys(form) as (keyof RiadForm)[]).some((key) => form[key] !== baseline[key]);
  const sortedStaff = [...staff].sort((a, b) => {
    if (a.role !== b.role) return a.role === "OWNER" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  function update<K extends keyof RiadForm>(key: K, value: RiadForm[K]) {
    setForm((currentForm) => (currentForm ? { ...currentForm, [key]: value } : currentForm));
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setNotice(null);

    const next: RiadForm = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
    };
    if (!next.name) return setError("Enter the riad name.");
    if (!next.address) return setError("Enter the riad address.");
    if (!next.phone) return setError("Enter a phone number.");
    if (!TIME_PATTERN.test(next.checkInTime)) return setError("Enter a valid check-in time.");
    if (!TIME_PATTERN.test(next.checkOutTime)) return setError("Enter a valid check-out time.");

    setSaving(true);
    try {
      const updated = await updateRiad(next);
      const saved = toForm(updated);
      setCurrent(updated);
      setForm(saved);
      setBaseline(saved);
      await refreshRiad();
      setNotice("Riad details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Riad settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your property details, check-in times and team access.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {!form ? (
            <button type="button" onClick={retry} className="font-medium underline">
              Retry
            </button>
          ) : null}
        </div>
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

      {!dataReady || loading ? (
        <SettingsSkeleton />
      ) : !form || !current ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Settings are unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">Try loading the page again.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <header className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">Riad profile</h3>
                <p className="text-xs text-muted-foreground">
                  Shown across the dashboard and on guest communications.
                </p>
              </div>
            </header>

            <form onSubmit={submit} noValidate className="grid gap-5 p-5">
              <div className="grid gap-2">
                <Label htmlFor="settings-name">Riad name</Label>
                <Input
                  id="settings-name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="settings-address">Address</Label>
                <Textarea
                  id="settings-address"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settings-slug">Workspace slug</Label>
                  <Input id="settings-slug" value={current.slug} disabled />
                  <p className="text-xs text-muted-foreground">Contact support to change this.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="settings-check-in">Check-in time</Label>
                  <Input
                    id="settings-check-in"
                    type="time"
                    value={form.checkInTime}
                    onChange={(event) => update("checkInTime", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settings-check-out">Check-out time</Label>
                  <Input
                    id="settings-check-out"
                    type="time"
                    value={form.checkOutTime}
                    onChange={(event) => update("checkOutTime", event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {dirty ? "You have unsaved changes." : "All changes are saved."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => baseline && setForm(baseline)}
                    disabled={!dirty || saving}
                  >
                    Reset
                  </Button>
                  <Button type="submit" size="sm" disabled={!dirty || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-card shadow-sm">
              <header className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold">Team access</h3>
                  <p className="text-xs text-muted-foreground">
                    {staff.length} account{staff.length === 1 ? "" : "s"} for this riad
                  </p>
                </div>
              </header>
              <ul className="divide-y divide-border">
                {sortedStaff.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        {member.id === user?.id ? (
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        member.role === "OWNER"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {member.role === "OWNER" ? "Owner" : "Staff"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-[18px]" />
                </span>
                <h3 className="font-display text-base font-semibold">Permissions</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Only owners can open settings and view revenue figures. Staff can still manage
                bookings, rooms, blocked dates and guest records.
              </p>
              <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Signed in as</dt>
                  <dd className="truncate font-medium">{user?.name ?? "Owner"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">Owner</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Workspace</dt>
                  <dd className="truncate font-medium">{current.slug}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]" aria-busy="true" aria-label="Loading settings">
      <div className="h-[32rem] animate-pulse rounded-lg border border-border bg-card" />
      <div className="space-y-5">
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
